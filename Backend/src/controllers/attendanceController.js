import prisma from "../lib/prisma.js";
import {
  calculateHours,
  classifyWork,
  todayYmdIST,
  describeAttendanceStatus,
  mapLeaveEnum,
  summarizeAttendance,
} from "../lib/attendanceHours.js";


import { persistAttendanceStatus } from "../lib/attendancePersist.js";

function dateCovers(startDate, endDate, dateStr) {
  return startDate <= dateStr && endDate >= dateStr;
}

function enrichAttendance(record, leaveRequest = null) {
  const detail = describeAttendanceStatus(record, leaveRequest);
  return {
    ...record,
    workKind: detail.workKind,
    workLabel: detail.statusLabel,
    statusLabel: detail.statusLabel,
    firstHalf: detail.firstHalf,
    secondHalf: detail.secondHalf,
    leaveSession: detail.leaveSession,
    status: detail.status === "NOT_PUNCHED" ? record?.status || "ABSENT" : detail.status,
    leave: detail.leave,
    presentCredit: detail.presentCredit,
    leaveCredit: detail.leaveCredit,
    creditedHours: detail.creditedHours,
  };
}

/**
 * 1. Punch In / Out for TODAY only. Status is derived from in/out hours.
 *    Existing leave on the same date is preserved (half-day WFO + half-day leave).
 */
export async function punchAttendance(req, res) {
  try {
    const userId = req.user.id;
    const {
      date,
      punchInTime,
      punchOutTime,
      remarks = null,
    } = req.body;

    if (!date) {
      return res.status(400).json({ error: "Date is required (YYYY-MM-DD)" });
    }

    const today = todayYmdIST();
    if (date !== today) {
      return res.status(403).json({
        error: "Previous dates cannot be punched or edited. Punching is allowed only for today.",
      });
    }

    if (!punchInTime || !punchOutTime) {
      return res.status(400).json({ error: "Punch in and punch out times are required." });
    }

    const totalHours = calculateHours(punchInTime, punchOutTime);
    if (totalHours <= 0) {
      return res.status(400).json({ error: "Punch out time must be after punch in time." });
    }

    const work = classifyWork(totalHours);

    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date } },
    });

    const coveringLeave = await prisma.leaveRequest.findFirst({
      where: {
        userId,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      orderBy: { createdAt: "desc" },
    });

    const preservedLeaveType =
      coveringLeave
        ? (coveringLeave.leaveType.toLowerCase().includes("sick")
            ? "SICK"
            : coveringLeave.leaveType.toLowerCase().includes("emergency")
            ? "EMERGENCY"
            : "CASUAL")
        : existing?.leaveType && existing.leaveType !== "NONE"
        ? existing.leaveType
        : "NONE";

    const userReason = remarks?.trim() || existing?.remarks || null;
    const detail = describeAttendanceStatus(
      {
        punchInTime,
        punchOutTime,
        totalHours,
        leaveType: preservedLeaveType,
        status: work.status,
        remarks: userReason,
      },
      coveringLeave
    );

    let formattedRemarks = detail.statusLabel;
    if (userReason && !/present|leave|half/i.test(userReason)) {
      formattedRemarks = `${detail.statusLabel} - ${userReason}`;
    }

    const attendanceRecord = await prisma.attendance.upsert({
      where: { userId_date: { userId, date } },
      update: {
        punchInTime,
        punchOutTime,
        totalHours,
        workMode: "WFO",
        leaveType: preservedLeaveType,
        status: work.status,
        remarks: formattedRemarks,
      },
      create: {
        userId,
        date,
        punchInTime,
        punchOutTime,
        totalHours,
        workMode: "WFO",
        leaveType: preservedLeaveType,
        status: work.status,
        remarks: formattedRemarks,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            avatar: true,
          },
        },
      },
    });

    await persistAttendanceStatus(userId, date, detail);

    return res.status(200).json({
      message: "Attendance recorded successfully!",
      attendance: enrichAttendance(attendanceRecord, coveringLeave),
    });
  } catch (error) {
    console.error("Punch Attendance Error:", error);
    return res.status(500).json({ error: error.message || "Failed to record attendance." });
  }
}

/**
 * 2. Get Current User's Monthly / Date-Range Attendance Records (with leave overlay)
 */
export async function getMyMonthlyAttendance(req, res) {
  try {
    const userId = req.user.id;
    const { month, startDate, endDate } = req.query;

    let whereClause = { userId };
    let rangeStart = null;
    let rangeEnd = null;

    if (startDate || endDate) {
      rangeStart = startDate || endDate;
      rangeEnd = endDate || startDate;
      if (rangeStart > rangeEnd) {
        const swap = rangeStart;
        rangeStart = rangeEnd;
        rangeEnd = swap;
      }
      whereClause.date = { gte: rangeStart, lte: rangeEnd };
    } else if (month) {
      whereClause.date = { startsWith: month };
      rangeStart = `${month}-01`;
      rangeEnd = `${month}-31`;
    }

    const [records, leaveRequests] = await Promise.all([
      prisma.attendance.findMany({
        where: whereClause,
        orderBy: { date: "asc" },
      }),
      prisma.leaveRequest.findMany({
        where: {
          userId,
          ...(rangeStart && rangeEnd
            ? { startDate: { lte: rangeEnd }, endDate: { gte: rangeStart } }
            : {}),
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const enriched = records.map((record) => {
      const leave = leaveRequests.find((lr) => dateCovers(lr.startDate, lr.endDate, record.date));
      return enrichAttendance(record, leave || null);
    });

    const summary = summarizeAttendance(enriched);

    return res.status(200).json({ records: enriched, summary });
  } catch (error) {
    console.error("Get Monthly Attendance Error:", error);
    return res.status(500).json({ error: "Failed to fetch attendance history." });
  }
}

/**
 * 3. Get All Employees Attendance (Admin / HR / Manager) with Date-Range Support
 */
export async function getAllAttendanceForAdmin(req, res) {
  try {
    const { date, month, startDate, endDate, department, search, employeeId } = req.query;
    const today = todayYmdIST();

    let userWhere = {};
    if (department && department !== "ALL") {
      userWhere.department = department;
    }
    if (search) {
      userWhere.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (employeeId) {
      userWhere.employeeId = { contains: String(employeeId).trim(), mode: "insensitive" };
    }

    // Get list of employees matching filter
    const employees = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        designation: true,
        employeeId: true,
        phone: true,
        avatar: true,
        passportPhoto: true,
      },
      orderBy: { name: "asc" },
    });

    let attWhere = {};
    let rangeStart = null;
    let rangeEnd = null;
    if (startDate || endDate) {
      rangeStart = startDate || endDate;
      rangeEnd = endDate || startDate;
      if (rangeStart > rangeEnd) {
        const swap = rangeStart;
        rangeStart = rangeEnd;
        rangeEnd = swap;
      }
      attWhere.date = { gte: rangeStart, lte: rangeEnd };
    } else if (date) {
      rangeStart = date;
      rangeEnd = date;
      attWhere.date = date;
    } else if (month) {
      attWhere.date = { startsWith: month };
    } else {
      attWhere.date = today;
      rangeStart = today;
      rangeEnd = today;
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: attWhere,
      orderBy: { date: "asc" },
    });

    const employeeIds = employees.map((emp) => emp.id);
    const leaveRequests = employeeIds.length
      ? await prisma.leaveRequest.findMany({
          where: {
            userId: { in: employeeIds },
            ...(rangeStart && rangeEnd
              ? { startDate: { lte: rangeEnd }, endDate: { gte: rangeStart } }
              : {}),
          },
        })
      : [];

    const findLeave = (userId, dateStr) =>
      leaveRequests.find((lr) => lr.userId === userId && dateCovers(lr.startDate, lr.endDate, dateStr)) || null;

    // Group attendance records by userId
    const attendanceMap = new Map();
    for (const record of attendanceRecords) {
      if (!attendanceMap.has(record.userId)) {
        attendanceMap.set(record.userId, []);
      }
      attendanceMap.get(record.userId).push(record);
    }

    const result = employees.map((emp) => {
      const attList = attendanceMap.get(emp.id) || [];
      const enrichedList = attList.map((r) => enrichAttendance(r, findLeave(emp.id, r.date)));

      if (enrichedList.length === 0 && rangeStart && rangeStart === rangeEnd) {
        const leave = findLeave(emp.id, rangeStart);
        if (leave) {
          const virtual = enrichAttendance(
            {
              userId: emp.id,
              date: rangeStart,
              punchInTime: null,
              punchOutTime: null,
              totalHours: 0,
              leaveType: mapLeaveEnum(leave.leaveType),
              status: leave.session === "FULL_DAY" ? "LEAVE" : "HALF_DAY",
              remarks: null,
            },
            leave
          );
          return {
            employee: emp,
            attendance: virtual,
            allRecords: [virtual],
            status: virtual.status,
            workKind: virtual.workKind,
            workLabel: virtual.statusLabel,
            statusLabel: virtual.statusLabel,
            firstHalf: virtual.firstHalf,
            secondHalf: virtual.secondHalf,
          };
        }
      }

      const dayAtt =
        rangeStart && rangeStart === rangeEnd
          ? enrichedList.find((r) => r.date === rangeStart) || null
          : enrichedList.length > 0
          ? enrichedList[enrichedList.length - 1]
          : null;

      return {
        employee: emp,
        attendance: dayAtt,
        allRecords: enrichedList,
        status: dayAtt ? dayAtt.status : "NOT_PUNCHED",
        workKind: dayAtt?.workKind || "NOT_PUNCHED",
        workLabel: dayAtt?.statusLabel || dayAtt?.workLabel || "Not Punched",
        statusLabel: dayAtt?.statusLabel || "Not Punched",
        firstHalf: dayAtt?.firstHalf || "—",
        secondHalf: dayAtt?.secondHalf || "—",
      };
    });

    const resolvedDate = date || rangeStart || today;

    return res.status(200).json({
      startDate: rangeStart || date || today,
      endDate: rangeEnd || date || today,
      date: resolvedDate,
      totalEmployees: result.length,
      employees: result,
      totalAttendanceRecords: attendanceRecords.length,
    });
  } catch (error) {
    console.error("Get All Attendance Admin Error:", error);
    return res.status(500).json({ error: "Failed to fetch employee attendance list." });
  }
}

const ATTENDANCE_STATUSES = new Set([
  "PRESENT",
  "HALF_DAY",
  "ABSENT",
  "LEAVE",
  "HOLIDAY",
  "WEEKEND",
  "WFH",
  "ON_FIELD",
]);

/**
 * Import attendance rows from Excel (HR / Admin / Super Admin / Manager)
 */
export async function importAttendance(req, res) {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (rows.length === 0) {
      return res.status(400).json({ error: "No attendance rows to import." });
    }

    const imported = [];
    const skipped = [];

    for (const row of rows) {
      const employeeId = String(row?.employeeId || "").trim();
      const date = String(row?.date || "").trim();
      if (!employeeId || !date) {
        skipped.push({ employeeId, date, reason: "Employee ID and Date are required" });
        continue;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        skipped.push({ employeeId, date, reason: "Date must be YYYY-MM-DD" });
        continue;
      }

      const user = await prisma.user.findFirst({
        where: { employeeId: { equals: employeeId, mode: "insensitive" } },
        select: { id: true, employeeId: true, name: true },
      });
      if (!user) {
        skipped.push({ employeeId, date, reason: "Employee ID not found" });
        continue;
      }

      const punchInTime = String(row.punchInTime || "").trim() || null;
      const punchOutTime = String(row.punchOutTime || "").trim() || null;
      const totalHours = calculateHours(punchInTime, punchOutTime);
      let status = String(row.status || "PRESENT").trim().toUpperCase().replace(/\s+/g, "_");
      if (!ATTENDANCE_STATUSES.has(status)) {
        status = totalHours >= 8 ? "PRESENT" : totalHours >= 4 ? "HALF_DAY" : punchInTime ? "HALF_DAY" : "ABSENT";
      }
      const coveringLeave = await prisma.leaveRequest.findFirst({
        where: {
          userId: user.id,
          startDate: { lte: date },
          endDate: { gte: date },
        },
        orderBy: { createdAt: "desc" },
      });
      const detail = describeAttendanceStatus(
        {
          punchInTime,
          punchOutTime,
          totalHours,
          leaveType: coveringLeave ? mapLeaveEnum(coveringLeave.leaveType) : "NONE",
          status,
        },
        coveringLeave
      );
      const savedRemarks = String(row.remarks || "").trim() || detail.statusLabel;

      await prisma.attendance.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date,
          },
        },
        update: {
          punchInTime: punchInTime || undefined,
          punchOutTime: punchOutTime || undefined,
          totalHours: totalHours > 0 ? totalHours : undefined,
          status: detail.status === "NOT_PUNCHED" ? status : detail.status,
          leaveType: coveringLeave ? mapLeaveEnum(coveringLeave.leaveType) : undefined,
          remarks: savedRemarks,
        },
        create: {
          userId: user.id,
          date,
          punchInTime: punchInTime || "10:00 AM",
          punchOutTime: punchOutTime || "07:00 PM",
          totalHours: totalHours > 0 ? totalHours : 9.0,
          workMode: "WFO",
          status: detail.status === "NOT_PUNCHED" ? status : detail.status,
          leaveType: coveringLeave ? mapLeaveEnum(coveringLeave.leaveType) : "NONE",
          remarks: savedRemarks,
        },
      });

      await persistAttendanceStatus(user.id, date, detail);

      imported.push({ employeeId: user.employeeId, name: user.name, date });
    }

    return res.status(200).json({
      message: `Imported ${imported.length} attendance row(s).${skipped.length ? ` ${skipped.length} skipped.` : ""}`,
      imported: imported.length,
      skipped,
    });
  } catch (error) {
    console.error("Import Attendance Error:", error);
    return res.status(500).json({ error: "Failed to import attendance." });
  }
}

/**
 * 4. Admin Update / Override Employee Attendance
 */
export async function adminUpdateAttendance(req, res) {
  try {
    const { userId, date, punchInTime, punchOutTime, workMode, leaveType, status, remarks } = req.body;

    if (!userId || !date) {
      return res.status(400).json({ error: "userId and date are required" });
    }

    const coveringLeave = await prisma.leaveRequest.findFirst({
      where: {
        userId,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalHours = calculateHours(punchInTime, punchOutTime);
    const mappedLeave =
      leaveType && leaveType !== "NONE" ? leaveType : coveringLeave ? mapLeaveEnum(coveringLeave.leaveType) : "NONE";
    const detail = describeAttendanceStatus(
      {
        punchInTime,
        punchOutTime,
        totalHours,
        leaveType: mappedLeave,
        status: status || undefined,
        remarks,
      },
      coveringLeave
    );

    const record = await prisma.attendance.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      update: {
        punchInTime: punchInTime || undefined,
        punchOutTime: punchOutTime || undefined,
        totalHours: totalHours > 0 ? totalHours : undefined,
        workMode: workMode || undefined,
        leaveType: mappedLeave !== "NONE" ? mappedLeave : leaveType || undefined,
        status: status || detail.status || undefined,
        remarks: remarks || detail.statusLabel,
      },
      create: {
        userId,
        date,
        punchInTime: punchInTime || "10:00 AM",
        punchOutTime: punchOutTime || "07:00 PM",
        totalHours: totalHours > 0 ? totalHours : 9.0,
        workMode: workMode || "WFO",
        leaveType: mappedLeave !== "NONE" ? mappedLeave : leaveType || "NONE",
        status: status || detail.status || "PRESENT",
        remarks: remarks || detail.statusLabel,
      },
    });

    await persistAttendanceStatus(userId, date, detail);

    return res.status(200).json({
      message: "Attendance updated by admin successfully",
      record: enrichAttendance(record, coveringLeave),
    });
  } catch (error) {
    console.error("Admin Update Attendance Error:", error);
    return res.status(500).json({ error: "Failed to update employee attendance." });
  }
}

/**
 * 5. Get Official Company Holidays List
 */
export async function getCompanyHolidays(req, res) {
  try {
    const holidays = [
      { date: "2026-01-26", title: "Republic Day", type: "National Holiday", day: "Monday" },
      { date: "2026-08-15", title: "Independence Day", type: "National Holiday", day: "Saturday" },
      { date: "2026-09-14", title: "Half Day Ganesh Chaturthi", type: "Company Event", day: "Monday" },
      { date: "2026-09-25", title: "Ganesh Visarjan", type: "Festival Holiday", day: "Friday" },
      { date: "2026-10-02", title: "Gandhi Jayanti", type: "National Holiday", day: "Friday" },
      { date: "2026-10-20", title: "Dussehra", type: "Festival Holiday", day: "Tuesday" },
      { date: "2026-11-08", title: "Diwali Festival", type: "Festival Holiday", day: "Sunday" },
      { date: "2026-11-09", title: "Diwali Padwa", type: "Festival Holiday", day: "Monday" },
      { date: "2026-12-25", title: "Christmas Day", type: "National Holiday", day: "Friday" },
      { date: "2026-12-31", title: "Year-End Holiday", type: "Holiday", day: "Thursday" },
    ];
    return res.status(200).json({ holidays });
  } catch (error) {
    console.error("Get Holidays Error:", error);
    return res.status(500).json({ error: "Failed to fetch holidays." });
  }
}
