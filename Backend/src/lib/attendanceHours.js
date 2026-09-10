/**
 * Shared attendance hour helpers for punch classification.
 * Standard office day: 10:00 AM – 07:00 PM (9 hours) = Full Day Present
 * ~4 hours = Half Day Work
 */

export function parsePunchTime(timeStr) {
  if (!timeStr) return null;
  const match = String(timeStr).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours + minutes / 60;
}

export function calculateHours(punchIn, punchOut) {
  if (!punchIn || !punchOut) return 0;
  try {
    const inH = parsePunchTime(punchIn);
    const outH = parsePunchTime(punchOut);
    if (inH === null || outH === null) return 0;
    let diff = outH - inH;
    if (diff < 0) diff += 24;
    return parseFloat(diff.toFixed(2));
  } catch {
    return 0;
  }
}

/**
 * @returns {{ status: "PRESENT" | "HALF_DAY" | "ABSENT", workKind: string, workLabel: string, hours: number }}
 */
export function classifyWork(hours) {
  const h = Number(hours) || 0;
  if (h >= 8) {
    return {
      status: "PRESENT",
      workKind: "FULL_DAY",
      workLabel: `Full Day Present (${h}h)`,
      hours: h,
    };
  }
  if (h >= 4) {
    return {
      status: "HALF_DAY",
      workKind: "HALF_DAY_WORK",
      workLabel: `Half Day Work (${Math.round(h)} hr)`,
      hours: h,
    };
  }
  if (h > 0) {
    return {
      status: "HALF_DAY",
      workKind: "HALF_DAY_WORK",
      workLabel: `${h} hr Work`,
      hours: h,
    };
  }
  return {
    status: "ABSENT",
    workKind: "NOT_PUNCHED",
    workLabel: "Not Punched",
    hours: 0,
  };
}

export function todayYmdIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export function mapLeaveEnum(leaveType = "") {
  const text = String(leaveType).toLowerCase();
  if (text.includes("sick")) return "SICK";
  if (text.includes("emergency")) return "EMERGENCY";
  if (text.includes("casual")) return "CASUAL";
  return "CASUAL";
}

export function leaveTypeLabel(leaveType) {
  if (!leaveType || leaveType === "NONE") return "";
  if (leaveType === "SICK") return "Sick Leave";
  if (leaveType === "CASUAL") return "Casual Leave";
  if (leaveType === "EMERGENCY") return "Emergency Leave";
  return String(leaveType).replace(/leave/i, "").trim() + " Leave";
}

/** Standard office window: 10:00 AM – 07:00 PM */
export function complementaryWorkSlot(leaveStartTime, leaveEndTime) {
  const start = parsePunchTime(leaveStartTime);
  if (start === null) {
    return { punchInTime: "02:00 PM", punchOutTime: "07:00 PM", session: "MORNING" };
  }
  // Morning leave (e.g. 10:00 AM – 2:00 PM) → work 2:00 PM – 7:00 PM
  if (start < 14) {
    return { punchInTime: "02:00 PM", punchOutTime: "07:00 PM", session: "MORNING" };
  }
  // Afternoon leave (e.g. 2:00 PM – 7:00 PM) → work 10:00 AM – 2:00 PM
  return { punchInTime: "10:00 AM", punchOutTime: "02:00 PM", session: "AFTERNOON" };
}

export function detectLeaveSession(startTime, endTime) {
  if (!startTime || !endTime) return "FULL_DAY";
  const hours = calculateHours(startTime, endTime);
  if (hours >= 8) return "FULL_DAY";
  const start = parsePunchTime(startTime);
  if (start !== null && start < 14) return "MORNING";
  return "AFTERNOON";
}

export function inferLeaveSession(record, leaveRequest = null) {
  if (leaveRequest?.session === "MORNING" || leaveRequest?.session === "AFTERNOON") {
    return leaveRequest.session;
  }
  if (leaveRequest?.startTime) {
    return detectLeaveSession(leaveRequest.startTime, leaveRequest.endTime);
  }
  const inH = parsePunchTime(record?.punchInTime);
  const outH = parsePunchTime(record?.punchOutTime);
  if (inH !== null && inH >= 14) return "MORNING";
  if (outH !== null && outH <= 14.05) return "AFTERNOON";
  return "FULL_DAY";
}

/**
 * Calendar-matching status: Full Day Present, or first/second half work vs leave.
 */
export function describeAttendanceStatus(record, leaveRequest = null) {
  const hours = Number(record?.totalHours) || 0;
  const work = classifyWork(hours);
  const hasPunch = Boolean(record?.punchInTime && hours > 0);
  const leaveTypeRaw = record?.leaveType && record.leaveType !== "NONE" ? record.leaveType : null;
  const leaveType = leaveTypeRaw || (leaveRequest ? mapLeaveEnum(leaveRequest.leaveType) : null);
  const typeLabel = leaveTypeLabel(leaveRequest?.leaveType || leaveType);
  const leaveHours =
    leaveRequest?.startTime && leaveRequest?.endTime
      ? calculateHours(leaveRequest.startTime, leaveRequest.endTime)
      : 0;
  const isHalfLeave = Boolean(
    leaveRequest?.session === "MORNING" ||
    leaveRequest?.session === "AFTERNOON" ||
    leaveRequest?.totalDays === 0.5 ||
    (leaveHours > 0 && leaveHours < 8) ||
    (leaveType && hasPunch && work.status === "HALF_DAY")
  );
  const session = inferLeaveSession(record, leaveRequest);
  const leaveStart =
    leaveRequest?.startTime ||
    (session === "MORNING" ? "10:00 AM" : session === "AFTERNOON" ? "02:00 PM" : "");
  const leaveEnd =
    leaveRequest?.endTime ||
    (session === "MORNING" ? "02:00 PM" : session === "AFTERNOON" ? "07:00 PM" : "");
  const punchIn = record?.punchInTime || "";
  const punchOut = record?.punchOutTime || "";
  const leaveStatus =
    leaveRequest?.status ||
    (record?.remarks?.includes("APPROVED") || record?.remarks?.includes("Approved")
      ? "APPROVED"
      : record?.remarks?.includes("REJECTED") || record?.remarks?.includes("Rejected")
      ? "REJECTED"
      : leaveType
      ? "PENDING"
      : null);

  let workKind = work.workKind;
  let status = record?.status || work.status;
  let firstHalf = "—";
  let secondHalf = "—";
  let statusLabel = "Not Punched";

  if (hasPunch && hours >= 8 && !isHalfLeave) {
    workKind = "FULL_DAY";
    status = "PRESENT";
    firstHalf = `Work (${punchIn}–${punchOut})`;
    secondHalf = `Work (${punchIn}–${punchOut})`;
    statusLabel = "Full Day Present";
  } else if (isHalfLeave) {
    workKind = "HALF_DAY_MIXED";
    status = "HALF_DAY";
    if (session === "AFTERNOON") {
      firstHalf = punchIn && punchOut ? `Work (${punchIn}–${punchOut})` : "Work (10:00 AM–02:00 PM)";
      secondHalf = leaveStart && leaveEnd ? `Leave (${leaveStart}–${leaveEnd})` : "Leave (02:00 PM–07:00 PM)";
      statusLabel = "First half work, second half leave";
    } else {
      firstHalf = leaveStart && leaveEnd ? `Leave (${leaveStart}–${leaveEnd})` : "Leave (10:00 AM–02:00 PM)";
      secondHalf = punchIn && punchOut ? `Work (${punchIn}–${punchOut})` : "Work (02:00 PM–07:00 PM)";
      statusLabel = "First half leave, second half work";
    }
    if (typeLabel) statusLabel += ` (${typeLabel})`;
  } else if (!hasPunch && leaveType) {
    workKind = "FULL_LEAVE";
    status = "LEAVE";
    firstHalf = "Leave";
    secondHalf = "Leave";
    statusLabel = typeLabel ? `Full Day ${typeLabel}` : "Full Day Leave";
  } else if (hasPunch && work.status === "HALF_DAY") {
    workKind = "HALF_DAY_WORK";
    status = "HALF_DAY";
    const inH = parsePunchTime(punchIn);
    if (inH !== null && inH >= 14) {
      firstHalf = "—";
      secondHalf = `Work (${punchIn}–${punchOut})`;
      statusLabel = "Second half work";
    } else {
      firstHalf = `Work (${punchIn}–${punchOut})`;
      secondHalf = "—";
      statusLabel = "First half work";
    }
  } else if (!hasPunch) {
    workKind = "NOT_PUNCHED";
    status = "NOT_PUNCHED";
    statusLabel = "Not Punched";
  }

  const credits = attendanceCreditsFromKind(workKind);

  return {
    workKind,
    workLabel: statusLabel,
    statusLabel,
    status,
    firstHalf,
    secondHalf,
    leaveSession: session,
    presentCredit: credits.presentCredit,
    leaveCredit: credits.leaveCredit,
    creditedHours: credits.creditedHours,
    leave: leaveType
      ? {
          type: leaveType,
          typeLabel: typeLabel,
          status: leaveStatus,
          totalDays: leaveRequest?.totalDays ?? (workKind === "HALF_DAY_MIXED" || workKind === "HALF_DAY_WORK" ? 0.5 : 1),
          startTime: leaveRequest?.startTime || leaveStart || null,
          endTime: leaveRequest?.endTime || leaveEnd || null,
          session: session === "FULL_DAY" ? leaveRequest?.session || "FULL_DAY" : session,
        }
      : null,
  };
}

/** Full day = 8h / 1 present. Each half-work day = 4h / 0.5 present (+ 0.5 leave). */
export const FULL_DAY_CREDITED_HOURS = 8;
export const HALF_DAY_CREDITED_HOURS = 4;

export function attendanceCreditsFromKind(workKind) {
  if (workKind === "FULL_DAY") {
    return { presentCredit: 1, leaveCredit: 0, creditedHours: FULL_DAY_CREDITED_HOURS };
  }
  if (workKind === "HALF_DAY_MIXED") {
    return { presentCredit: 0.5, leaveCredit: 0.5, creditedHours: HALF_DAY_CREDITED_HOURS };
  }
  if (workKind === "HALF_DAY_WORK") {
    return { presentCredit: 0.5, leaveCredit: 0.5, creditedHours: HALF_DAY_CREDITED_HOURS };
  }
  if (workKind === "FULL_LEAVE") {
    return { presentCredit: 0, leaveCredit: 1, creditedHours: 0 };
  }
  return { presentCredit: 0, leaveCredit: 0, creditedHours: 0 };
}

function roundHalf(n) {
  return Math.round((Number(n) || 0) * 2) / 2;
}

export function summarizeAttendance(enrichedRecords = []) {
  let present = 0;
  let leave = 0;
  let creditedHours = 0;
  let clockedHours = 0;
  let halfDay = 0;
  let halfDayMixed = 0;
  let wfo = 0;

  for (const row of enrichedRecords) {
    const credits = {
      presentCredit: row.presentCredit ?? attendanceCreditsFromKind(row.workKind).presentCredit,
      leaveCredit: row.leaveCredit ?? attendanceCreditsFromKind(row.workKind).leaveCredit,
      creditedHours: row.creditedHours ?? attendanceCreditsFromKind(row.workKind).creditedHours,
    };
    present += credits.presentCredit;
    leave += credits.leaveCredit;
    creditedHours += credits.creditedHours;
    clockedHours += Number(row.totalHours) || 0;
    if (row.workKind === "HALF_DAY_WORK" || row.workKind === "HALF_DAY_MIXED") halfDay += 1;
    if (row.workKind === "HALF_DAY_MIXED") halfDayMixed += 1;
    wfo += credits.presentCredit;
  }

  return {
    totalDays: enrichedRecords.length,
    present: roundHalf(present),
    leave: roundHalf(leave),
    wfo: roundHalf(wfo),
    halfDay,
    halfDayMixed,
    totalHours: creditedHours,
    clockedHours: parseFloat(clockedHours.toFixed(2)),
  };
}
