import { prisma } from "../lib/prisma.js";
import {
  calculateHours,
  complementaryWorkSlot,
  detectLeaveSession,
  mapLeaveEnum,
  describeAttendanceStatus,
} from "../lib/attendanceHours.js";
import { persistAttendanceStatus } from "../lib/attendancePersist.js";

function ymdFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 1. Apply for Leave (Employee)
 * POST /api/leave/apply
 * Half-day: send startTime + endTime (e.g. 10:00 AM – 2:00 PM). Complementary hours become half-day work.
 */
export async function applyLeave(req, res) {
  try {
    const userId = req.user.id;
    const {
      leaveType = "Casual Leave (CL)",
      startDate,
      endDate,
      reason,
      startTime = null,
      endTime = null,
      duration = null,
    } = req.body;

    if (!startDate || !reason || !reason.trim()) {
      return res.status(400).json({ error: "Start date and reason are mandatory." });
    }

    const resolvedEndDate = endDate || startDate;
    const start = new Date(startDate);
    const end = new Date(resolvedEndDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
    }

    if (end < start) {
      return res.status(400).json({ error: "End date cannot be earlier than start date." });
    }

    const sameDay = startDate === resolvedEndDate;
    const leaveHours = startTime && endTime ? calculateHours(startTime, endTime) : 0;
    const isHalfDay =
      duration === "HALF_DAY" ||
      (sameDay && startTime && endTime && leaveHours > 0 && leaveHours < 8);

    if (duration === "HALF_DAY" && (!startTime || !endTime)) {
      return res.status(400).json({ error: "Half-day leave requires start time and end time (e.g. 10:00 AM to 2:00 PM)." });
    }

    if (isHalfDay && leaveHours <= 0) {
      return res.status(400).json({ error: "Leave end time must be after start time." });
    }

    const session = isHalfDay ? detectLeaveSession(startTime, endTime) : "FULL_DAY";
    const totalDays = isHalfDay
      ? 0.5
      : Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId,
        leaveType,
        startDate,
        endDate: isHalfDay ? startDate : resolvedEndDate,
        startTime: isHalfDay ? startTime : null,
        endTime: isHalfDay ? endTime : null,
        session,
        totalDays,
        reason: reason.trim(),
        status: "PENDING",
      },
      include: {
        user: {
          select: { id: true, employeeId: true, name: true, email: true, department: true, role: true },
        },
      },
    });

    const mappedLeave = mapLeaveEnum(leaveType);
    const workSlot = isHalfDay ? complementaryWorkSlot(startTime, endTime) : null;

    let curr = new Date(start);
    const loopEnd = isHalfDay ? new Date(startDate) : end;
    while (curr <= loopEnd) {
      const dateStr = ymdFromDate(curr);
      const existingRecord = await prisma.attendance.findUnique({
        where: { userId_date: { userId, date: dateStr } },
      });

      const alreadyPunched = Number(existingRecord?.totalHours) > 0 && existingRecord?.punchInTime;
      const punchIn = alreadyPunched ? existingRecord.punchInTime : workSlot?.punchInTime || null;
      const punchOut = alreadyPunched ? existingRecord.punchOutTime : workSlot?.punchOutTime || null;
      const hours = punchIn && punchOut ? calculateHours(punchIn, punchOut) : 0;
      const detail = describeAttendanceStatus(
        {
          punchInTime: punchIn,
          punchOutTime: punchOut,
          totalHours: hours,
          leaveType: mappedLeave,
          status: isHalfDay ? "HALF_DAY" : "LEAVE",
        },
        { ...leaveRequest, session, startTime: isHalfDay ? startTime : null, endTime: isHalfDay ? endTime : null, totalDays }
      );
      const remarks = `${detail.statusLabel} (PENDING)`;

      await prisma.attendance.upsert({
        where: { userId_date: { userId, date: dateStr } },
        update: {
          leaveType: mappedLeave,
          status: isHalfDay ? "HALF_DAY" : "LEAVE",
          remarks,
          ...(alreadyPunched
            ? {}
            : isHalfDay
            ? { punchInTime: punchIn, punchOutTime: punchOut, totalHours: hours, workMode: "WFO" }
            : {}),
        },
        create: {
          userId,
          date: dateStr,
          punchInTime: isHalfDay ? punchIn : null,
          punchOutTime: isHalfDay ? punchOut : null,
          totalHours: isHalfDay ? hours : 0,
          workMode: "WFO",
          leaveType: mappedLeave,
          status: isHalfDay ? "HALF_DAY" : "LEAVE",
          remarks,
        },
      });
      await persistAttendanceStatus(userId, dateStr, detail);
      curr.setDate(curr.getDate() + 1);
    }

    const applicantName = leaveRequest.user.name;
    const timeNote = isHalfDay ? ` ${startTime} to ${endTime}` : "";
    await prisma.notification.create({
      data: {
        targetRoles: ["HR", "ADMIN", "SUPER_ADMIN", "MANAGER"],
        title: "New Leave Application Submitted",
        message: `${applicantName} (${leaveRequest.user.department || "Employee"}) requested ${totalDays} day(s) ${leaveType} from ${startDate}${timeNote}. Reason: "${reason.trim()}"`,
        type: "LEAVE_REQUEST",
        relatedId: leaveRequest.id,
      },
    });

    return res.status(201).json({
      message: "Leave application submitted successfully. Pending HR/Manager approval.",
      leaveRequest,
    });
  } catch (error) {
    console.error("Apply Leave Error:", error);
    return res.status(500).json({ error: error.message || "Failed to submit leave application." });
  }
}

/**
 * 2. Get Employee's Leave Balance & Accrual Stats
 * GET /api/leave/my-balance
 */
export async function getMyLeaveBalance(req, res) {
  try {
    const userId = req.user.id;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth() + 1; // 1-indexed (1 to 12)

    // Total leaves quota per year = 18 days
    // Monthly accrual rate = 1.5 days per month
    // Up to current month, total accrued leaves = monthIndex * 1.5
    const totalAnnualLeaves = 18;
    const monthlyAccrual = 1.5;
    const accruedLeavesToDate = currentMonthIndex * monthlyAccrual;

    // Fetch all APPROVED leave requests for user in current year
    const yearStartStr = `${currentYear}-01-01`;
    const yearEndStr = `${currentYear}-12-31`;

    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        userId,
        status: "APPROVED",
        startDate: { gte: yearStartStr },
        endDate: { lte: yearEndStr },
      },
    });

    const approvedLeavesCount = approvedLeaves.reduce((acc, curr) => acc + curr.totalDays, 0);
    const availableLeaves = Math.max(0, parseFloat((accruedLeavesToDate - approvedLeavesCount).toFixed(1)));

    return res.status(200).json({
      totalAnnualLeaves,
      monthlyAccrual,
      currentMonthIndex,
      accruedLeavesToDate,
      approvedLeavesCount,
      availableLeaves,
      year: currentYear,
    });
  } catch (error) {
    console.error("Get Leave Balance Error:", error);
    return res.status(500).json({ error: "Failed to fetch leave balance." });
  }
}

function currentYearRange() {
  const year = new Date().getFullYear();
  return { yearStart: `${year}-01-01`, yearEnd: `${year}-12-31`, year };
}

async function approvedLeaveUsedByUsers(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  const usedMap = new Map();
  if (!ids.length) return usedMap;

  const { yearStart, yearEnd } = currentYearRange();
  const approved = await prisma.leaveRequest.findMany({
    where: {
      userId: { in: ids },
      status: "APPROVED",
      startDate: { gte: yearStart, lte: yearEnd },
    },
    select: { userId: true, totalDays: true },
  });

  for (const row of approved) {
    usedMap.set(row.userId, (usedMap.get(row.userId) || 0) + Number(row.totalDays || 0));
  }
  return usedMap;
}

/**
 * 3. Get Leave Requests List
 * GET /api/leave/requests
 * HR / Manager / Admin / Super Admin receive every employee (including themselves).
 */
export async function getLeaveRequests(req, res) {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const isPrivileged = ["HR", "ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role);

    const whereClause = {};
    if (!isPrivileged || req.query.scope === "mine") {
      whereClause.userId = userId;
    }
    if (isPrivileged && req.query.status) {
      whereClause.status = req.query.status.toUpperCase();
    }

    const requests = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            email: true,
            department: true,
            designation: true,
            passportPhoto: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const usedMap = await approvedLeaveUsedByUsers(requests.map((row) => row.userId));
    const decorated = requests.map((row) => ({
      ...row,
      usedSoFar: usedMap.get(row.userId) || 0,
    }));

    return res.status(200).json({ requests: decorated });
  } catch (error) {
    console.error("Get Leave Requests Error:", error);
    return res.status(500).json({ error: "Failed to fetch leave requests." });
  }
}

/**
 * 4. Approve or Reject Leave Request (HR / Manager / Admin)
 * PATCH /api/leave/:id/approve
 */
export async function approveLeave(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body; // "APPROVED" or "REJECTED"
    const approverName = req.user.name || "HR Manager";

    if (!status || !["APPROVED", "REJECTED"].includes(status.toUpperCase())) {
      return res.status(400).json({ error: "Status must be 'APPROVED' or 'REJECTED'." });
    }

    const targetStatus = status.toUpperCase();

    const leaveReq = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!leaveReq) {
      return res.status(404).json({ error: "Leave request not found." });
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: targetStatus,
        approvedBy: approverName,
      },
    });

    // Update Attendance records for the leave date range
    const start = new Date(leaveReq.startDate);
    const end = new Date(leaveReq.endDate);
    let curr = new Date(start);

    while (curr <= end) {
      const dateStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}-${String(curr.getDate()).padStart(2, "0")}`;
      if (targetStatus === "APPROVED") {
        const existingRecord = await prisma.attendance.findUnique({
          where: { userId_date: { userId: leaveReq.userId, date: dateStr } },
        });

        const punchedHours = Number(existingRecord?.totalHours) || 0;
        const isHalfDay = (punchedHours > 0 && punchedHours < 8) || leaveReq.totalDays === 0.5 || leaveReq.session === "MORNING" || leaveReq.session === "AFTERNOON";
        const finalStatus = isHalfDay ? "HALF_DAY" : "LEAVE";
        const mappedLeave = leaveReq.leaveType.includes("Sick") ? "SICK" : leaveReq.leaveType.includes("Emergency") ? "EMERGENCY" : "CASUAL";
        const detail = describeAttendanceStatus(
          {
            punchInTime: existingRecord?.punchInTime || null,
            punchOutTime: existingRecord?.punchOutTime || null,
            totalHours: punchedHours,
            leaveType: mappedLeave,
            status: finalStatus,
          },
          leaveReq
        );
        const approvedRemarks = `${detail.statusLabel} (APPROVED by ${approverName})`;

        await prisma.attendance.upsert({
          where: { userId_date: { userId: leaveReq.userId, date: dateStr } },
          update: {
            status: finalStatus,
            leaveType: mappedLeave,
            remarks: approvedRemarks,
          },
          create: {
            userId: leaveReq.userId,
            date: dateStr,
            punchInTime: existingRecord?.punchInTime || null,
            punchOutTime: existingRecord?.punchOutTime || null,
            totalHours: punchedHours,
            workMode: "WFO",
            leaveType: mappedLeave,
            status: finalStatus,
            remarks: approvedRemarks,
          },
        });
        await persistAttendanceStatus(leaveReq.userId, dateStr, detail);
      } else {
        const existingRecord = await prisma.attendance.findUnique({
          where: { userId_date: { userId: leaveReq.userId, date: dateStr } },
        });
        const punchedHours = Number(existingRecord?.totalHours) || 0;
        const mappedLeave = leaveReq.leaveType.includes("Sick") ? "SICK" : leaveReq.leaveType.includes("Emergency") ? "EMERGENCY" : "CASUAL";

        if (existingRecord && punchedHours > 0) {
          await prisma.attendance.update({
            where: { userId_date: { userId: leaveReq.userId, date: dateStr } },
            data: {
              status: punchedHours < 8 ? "HALF_DAY" : "PRESENT",
              leaveType: mappedLeave,
              remarks: `Half Day Work + Half Day ${mappedLeave} Leave (REJECTED by ${approverName})`,
            },
          });
        } else {
          await prisma.attendance.updateMany({
            where: { userId: leaveReq.userId, date: dateStr },
            data: { remarks: `Leave Request REJECTED by ${approverName}` },
          });
        }
      }
      curr.setDate(curr.getDate() + 1);
    }

    // Create Notification for the Employee
    await prisma.notification.create({
      data: {
        userId: leaveReq.userId,
        targetRoles: [],
        title: `Leave Application ${targetStatus}`,
        message: `Your leave request for ${leaveReq.startDate} to ${leaveReq.endDate} (${leaveReq.leaveType}) has been ${targetStatus.toLowerCase()} by ${approverName}.`,
        type: "LEAVE_STATUS",
        relatedId: leaveReq.id,
      },
    });

    return res.status(200).json({
      message: `Leave request ${targetStatus.toLowerCase()} successfully.`,
      leaveRequest: updatedLeave,
    });
  } catch (error) {
    console.error("Approve Leave Error:", error);
    return res.status(500).json({ error: "Failed to process leave approval." });
  }
}
