import { prisma } from "./prisma.js";
import { isLiveSmsConfigured, normalizeMobile, sendSms } from "./sms.js";

const HOUR_MS = 60 * 60 * 1000;
const REMINDER_WINDOWS = [
  { type: "2h", window: 2 * HOUR_MS, field: "twoHourReminderSentAt", label: "2 hours" },
  { type: "1d", window: 24 * HOUR_MS, field: "reminderSentAt", label: "1 day" },
  { type: "3d", window: 3 * 24 * HOUR_MS, field: "threeDayReminderSentAt", label: "3 days" },
  { type: "7d", window: 7 * 24 * HOUR_MS, field: "sevenDayReminderSentAt", label: "7 days" },
];
let reminderJob = null;

function toDateKey(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(value);
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(parsed);
}

function formatDisplayDate(value) {
  const key = toDateKey(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return "";
  const [year, month, day] = key.split("-");
  return `${day}-${month}-${year}`;
}

function examStartAt(exam) {
  const dateKey = toDateKey(exam.examDate);
  const match = String(exam.examTime || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  let hour = 9;
  let minute = 0;
  if (match) {
    hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
    minute = Number(match[2]);
  }
  return new Date(`${dateKey}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`);
}

export function buildExamReminderMessage(exam, reminderType = "1d") {
  const name = String(exam.candidateName || "Candidate").trim();
  const examName = String(exam.examName || "your exam").trim();
  const date = formatDisplayDate(exam.examDate) || "the scheduled date";
  const time = String(exam.examTime || "").replace(/\bAM\b/gi, "Am").replace(/\bPM\b/gi, "Pm");
  const mode = String(exam.mode || "ONLINE").trim().toUpperCase();
  const reminderLabel = REMINDER_WINDOWS.find((item) => item.type === reminderType)?.label || "1 day";
  return [
    `Exam reminder: starts in ${reminderLabel}`,
    `Candidate Name: ${name}`,
    `Exam Name: ${examName}`,
    `Date: ${date}`,
    `Time: ${time || "As scheduled"}`,
    `Mode: ${mode}`,
    "- SoftTechCloud",
  ].join("\n");
}

function dueReminderType(exam) {
  if (!exam || exam.lifecycleStatus === "CANCELLED") return null;
  const start = examStartAt(exam).getTime();
  if (Number.isNaN(start)) return null;
  const timeUntilExam = start - Date.now();
  if (timeUntilExam <= 0) return null;
  const reminder = REMINDER_WINDOWS.find((item) => timeUntilExam <= item.window);
  return reminder && !exam[reminder.field] ? reminder.type : null;
}

async function markReminderSent(examId, reminderType) {
  if (reminderType === "2h") {
    await prisma.$executeRaw`
      UPDATE exams SET two_hour_reminder_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${examId} AND two_hour_reminder_sent_at IS NULL
    `;
    return;
  }
  if (reminderType === "3d") {
    await prisma.$executeRaw`
      UPDATE exams SET three_day_reminder_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${examId} AND three_day_reminder_sent_at IS NULL
    `;
    return;
  }
  if (reminderType === "7d") {
    await prisma.$executeRaw`
      UPDATE exams SET seven_day_reminder_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${examId} AND seven_day_reminder_sent_at IS NULL
    `;
    return;
  }
  await prisma.$executeRaw`
      UPDATE exams SET reminder_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${examId} AND reminder_sent_at IS NULL
    `;
}

export async function sendExamReminder(exam, reminderType = "1d") {
  if (!exam?.id || !normalizeMobile(exam.mobileNo)) {
    return { sent: false, skipped: true, reason: "missing candidate mobile" };
  }
  const field = REMINDER_WINDOWS.find((item) => item.type === reminderType)?.field || "reminderSentAt";
  const alreadySent = exam[field];
  if (alreadySent) {
    return { sent: false, skipped: true, reason: "already sent" };
  }

  if (!isLiveSmsConfigured()) {
    return { sent: false, skipped: true, reason: "SMS provider not configured", devMode: true };
  }

  const result = await sendSms(exam.mobileNo, buildExamReminderMessage(exam, reminderType));
  await markReminderSent(exam.id, reminderType);
  return { sent: true, ...result };
}

export async function sendExamReminderIfDue(exam) {
  const reminderType = dueReminderType(exam);
  if (!reminderType) {
    return { sent: false, skipped: true, reason: "no reminder is due" };
  }
  return sendExamReminder(exam, reminderType);
}

export async function sendDueExamReminders() {
  if (reminderJob) return reminderJob;
  reminderJob = runDueExamReminders().finally(() => {
    reminderJob = null;
  });
  return reminderJob;
}

async function runDueExamReminders() {
  const exams = await prisma.$queryRaw`
    SELECT id, candidate_name AS "candidateName", technology, exam_name AS "examName",
      mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
      lifecycle_status AS "lifecycleStatus", reminder_sent_at AS "reminderSentAt",
      seven_day_reminder_sent_at AS "sevenDayReminderSentAt",
      three_day_reminder_sent_at AS "threeDayReminderSentAt",
      two_hour_reminder_sent_at AS "twoHourReminderSentAt"
    FROM exams
    WHERE lifecycle_status = 'SCHEDULED'
      AND (
        seven_day_reminder_sent_at IS NULL OR three_day_reminder_sent_at IS NULL
        OR reminder_sent_at IS NULL OR two_hour_reminder_sent_at IS NULL
      )
      AND exam_date >= CURRENT_DATE
      AND exam_date <= CURRENT_DATE + INTERVAL '8 days'
    ORDER BY exam_date ASC, exam_time ASC
  `;

  const due = exams
    .map((exam) => ({ exam, reminderType: dueReminderType(exam) }))
    .filter(({ reminderType }) => reminderType);
  let sent = 0;
  let failed = 0;
  let waitingForProvider = 0;

  for (const { exam, reminderType } of due) {
    try {
      const result = await sendExamReminder(exam, reminderType);
      if (result.sent) sent += 1;
      else if (result.devMode) waitingForProvider += 1;
    } catch (error) {
      failed += 1;
      console.warn(`[EXAM SMS] Failed for ${exam.candidateName} (${exam.mobileNo}):`, error.message);
    }
  }

  if (sent || failed) {
    console.log(`[EXAM SMS] Reminders sent=${sent} failed=${failed}`);
  }
  return { sent, failed, waitingForProvider, scanned: exams.length, due: due.length };
}
