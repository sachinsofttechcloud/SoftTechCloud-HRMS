import { prisma } from "../lib/prisma.js";
import { sendDueExamReminders, sendExamReminderIfDue } from "../lib/examReminders.js";

const MAX_BULK_ROWS = 100000;
const PAYMENT_STATUSES = new Set(["PENDING", "COMPLETED"]);

function parseExamId(id) {
  const parsedId = Number(id);
  return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
}

function toDateKey(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  return ["true", "yes", "1", "y"].includes(String(value || "").trim().toLowerCase());
}

function duplicateKey(candidateName, mobileNo, examName, examDate) {
  return [candidateName, mobileNo, examName, toDateKey(examDate)]
    .map((value) => String(value || "").trim().toLowerCase())
    .join("|");
}

function validateCandidate(input = {}) {
  const errors = {};
  const candidateName = String(input.candidateName || input.fullName || "").trim();
  const technology = String(input.technology || "").trim();
  const examName = String(input.examName || "").trim();
  const mobileNo = String(input.mobileNo || "").trim();
  const examDate = toDateKey(input.examDate);
  const examTime = String(input.examTime || "").trim();
  const voucher = toBoolean(input.voucher);
  const assistSupport = !voucher;

  if (!candidateName) errors.candidateName = "Please enter full name";
  if (!technology) errors.technology = "Please enter technology";
  if (!examName) errors.examName = "Please enter exam name";
  if (!mobileNo) errors.mobileNo = "Please enter mobile number";
  else if (!/^\+?[\d\s()-]{7,20}$/.test(mobileNo)) errors.mobileNo = "Please enter a valid mobile number";
  if (!examDate) errors.examDate = "Please enter exam date";
  if (!examTime) errors.examTime = "Please enter exam time";

  return {
    errors,
    data: {
      candidateName,
      technology,
      examName,
      mobileNo,
      mode: "ONLINE",
      centerName: null,
      examDate,
      examTime,
      voucher,
      assistSupport,
    },
  };
}

async function insertExam(data) {
  const parsedExamDate = new Date(`${data.examDate}T00:00:00.000Z`);
  const exams = await prisma.$queryRaw`
    INSERT INTO exams (
      candidate_name, technology, exam_name, mobile_no, mode, center_name,
      exam_date, exam_time, voucher, assist_support, payment_status,
      lifecycle_status, updated_at
    )
    VALUES (
      ${data.candidateName}, ${data.technology}, ${data.examName}, ${data.mobileNo},
      'ONLINE', NULL, ${parsedExamDate}, ${data.examTime}, ${data.voucher},
      ${data.assistSupport}, 'PENDING', 'SCHEDULED', CURRENT_TIMESTAMP
    )
    RETURNING
      id, candidate_name AS "candidateName", technology, exam_name AS "examName",
      mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
      voucher, assist_support AS "assistSupport", payment_status AS "paymentStatus",
      lifecycle_status AS "lifecycleStatus", cancelled_at AS "cancelledAt",
      attended, reminder_sent_at AS "reminderSentAt",
      one_hour_reminder_sent_at AS "oneHourReminderSentAt",
      created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  return exams[0];
}

async function loadExistingExamKeys() {
  const exams = await prisma.$queryRaw`
    SELECT candidate_name AS "candidateName", mobile_no AS "mobileNo",
      exam_name AS "examName", exam_date AS "examDate"
    FROM exams
  `;
  return new Set(exams.map((exam) =>
    duplicateKey(exam.candidateName, exam.mobileNo, exam.examName, exam.examDate)
  ));
}

function classifyBulkRows(rows, existingKeys) {
  const seenInFile = new Set();
  const ready = [];
  const duplicates = [];
  const invalid = [];

  rows.forEach((row, index) => {
    const rowNumber = Number(row?.rowNumber) || index + 2;
    const { errors, data } = validateCandidate(row);
    const errorList = Object.values(errors);
    if (errorList.length) {
      invalid.push({ row: rowNumber, candidateName: data.candidateName, issue: errorList.join(", ") });
      return;
    }

    const key = duplicateKey(data.candidateName, data.mobileNo, data.examName, data.examDate);
    if (existingKeys.has(key) || seenInFile.has(key)) {
      duplicates.push({
        row: rowNumber,
        candidateName: data.candidateName,
        issue: existingKeys.has(key) ? "Candidate already exists" : "Duplicate row in file",
      });
      return;
    }
    seenInFile.add(key);
    ready.push({ row: rowNumber, ...data });
  });

  return { ready, duplicates, invalid };
}

function statusForPast(exam) {
  if (exam.lifecycleStatus === "CANCELLED") return "CANCELLED";
  if (exam.paymentStatus === "COMPLETED") return "COMPLETED";
  return exam.attended === true ? "COMPLETED" : "MISSED";
}

export async function getUpcomingExams(req, res) {
  try {
    const exams = await prisma.$queryRaw`
      SELECT id, candidate_name AS "candidateName", technology, exam_name AS "examName",
        mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
        voucher, assist_support AS "assistSupport", payment_status AS "paymentStatus",
        lifecycle_status AS "lifecycleStatus", cancelled_at AS "cancelledAt",
        attended, reminder_sent_at AS "reminderSentAt",
        one_hour_reminder_sent_at AS "oneHourReminderSentAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM exams
      WHERE exam_date > CURRENT_DATE
        AND lifecycle_status = 'SCHEDULED' AND payment_status = 'PENDING'
      ORDER BY exam_date ASC, exam_time ASC
    `;
    res.json(exams.map((exam) => ({ ...exam, status: "PENDING" })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch upcoming exams" });
  }
}

export async function getActiveExams(req, res) {
  try {
    const exams = await prisma.$queryRaw`
      SELECT id, candidate_name AS "candidateName", technology, exam_name AS "examName",
        mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
        voucher, assist_support AS "assistSupport", payment_status AS "paymentStatus",
        lifecycle_status AS "lifecycleStatus", cancelled_at AS "cancelledAt",
        attended, reminder_sent_at AS "reminderSentAt",
        one_hour_reminder_sent_at AS "oneHourReminderSentAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM exams
      WHERE exam_date = CURRENT_DATE
        AND lifecycle_status = 'SCHEDULED' AND payment_status = 'PENDING'
      ORDER BY exam_time ASC
    `;
    res.json(exams.map((exam) => ({ ...exam, status: "ONGOING" })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch active exams" });
  }
}

export async function getPastExams(req, res) {
  try {
    const exams = await prisma.$queryRaw`
      SELECT id, candidate_name AS "candidateName", technology, exam_name AS "examName",
        mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
        voucher, assist_support AS "assistSupport", payment_status AS "paymentStatus",
        lifecycle_status AS "lifecycleStatus", cancelled_at AS "cancelledAt",
        attended, reminder_sent_at AS "reminderSentAt",
        one_hour_reminder_sent_at AS "oneHourReminderSentAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM exams
      WHERE exam_date < CURRENT_DATE
        OR payment_status = 'COMPLETED' OR lifecycle_status = 'CANCELLED'
      ORDER BY updated_at DESC, exam_date DESC
    `;
    res.json(exams.map((exam) => ({ ...exam, status: statusForPast(exam) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch past exams" });
  }
}

export async function createExam(req, res) {
  try {
    const { errors, data } = validateCandidate(req.body);
    const errorList = Object.values(errors);
    if (errorList.length) return res.status(400).json({ error: errorList[0], errors });
    const exam = await insertExam(data);
    sendExamReminderIfDue(exam).catch((err) =>
      console.warn("[EXAM SMS] Create reminder:", err.message)
    );
    res.status(201).json(exam);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create exam" });
  }
}

export async function previewBulkExams(req, res) {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const fileName = String(req.body?.fileName || "upload.csv");
    if (!rows.length) return res.status(400).json({ error: "No candidate rows found in the file." });
    if (rows.length > MAX_BULK_ROWS) {
      return res.status(400).json({ error: `Import at most ${MAX_BULK_ROWS.toLocaleString()} rows at a time.` });
    }
    const classified = classifyBulkRows(rows, await loadExistingExamKeys());
    res.json({ fileName, total: rows.length, ...classified });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to preview candidate import" });
  }
}

export async function createBulkExams(req, res) {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) return res.status(400).json({ error: "No rows are ready to import." });
    if (rows.length > MAX_BULK_ROWS) {
      return res.status(400).json({ error: `Import at most ${MAX_BULK_ROWS.toLocaleString()} rows at a time.` });
    }
    const { ready, duplicates, invalid } = classifyBulkRows(rows, await loadExistingExamKeys());
    if (!ready.length) {
      return res.status(400).json({ error: "No rows are ready to import.", duplicates, invalid });
    }
    const created = [];
    for (const row of ready) created.push(await insertExam(row));
    sendDueExamReminders().catch((err) =>
      console.warn("[EXAM SMS] Bulk reminder:", err.message)
    );
    res.status(201).json({
      message: "Candidate details submitted successfully",
      created: created.length,
      exams: created,
      duplicates,
      invalid,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to import candidates" });
  }
}

export async function updateExamPayment(req, res) {
  try {
    const examId = parseExamId(req.params.id);
    const paymentStatus = String(req.body?.paymentStatus || "").toUpperCase();
    if (!examId) return res.status(400).json({ error: "Invalid exam ID" });
    if (!PAYMENT_STATUSES.has(paymentStatus)) {
      return res.status(400).json({ error: "Payment status must be PENDING or COMPLETED" });
    }
    const exams = await prisma.$queryRaw`
      UPDATE exams SET payment_status = ${paymentStatus}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${examId} AND exam_date = CURRENT_DATE
        AND lifecycle_status = 'SCHEDULED' AND payment_status = 'PENDING'
      RETURNING id, payment_status AS "paymentStatus"
    `;
    if (!exams.length) return res.status(409).json({ error: "Only an active exam can update payment" });
    res.json(exams[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update payment status" });
  }
}

export async function cancelExam(req, res) {
  try {
    const examId = parseExamId(req.params.id);
    if (!examId) return res.status(400).json({ error: "Invalid exam ID" });
    const exams = await prisma.$queryRaw`
      UPDATE exams
      SET lifecycle_status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${examId} AND exam_date = CURRENT_DATE
        AND lifecycle_status = 'SCHEDULED' AND payment_status = 'PENDING'
      RETURNING id, lifecycle_status AS "lifecycleStatus", cancelled_at AS "cancelledAt"
    `;
    if (!exams.length) return res.status(409).json({ error: "Only an active exam can be cancelled" });
    res.json(exams[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to cancel exam" });
  }
}

export async function rescheduleExam(req, res) {
  try {
    const examId = parseExamId(req.params.id);
    const examDate = toDateKey(req.body?.examDate);
    const examTime = String(req.body?.examTime || "").trim();
    if (!examId) return res.status(400).json({ error: "Invalid exam ID" });
    if (!examDate || !examTime) return res.status(400).json({ error: "Date and time are required" });
    const parsedExamDate = new Date(`${examDate}T00:00:00.000Z`);
    const exams = await prisma.$queryRaw`
      UPDATE exams SET exam_date = ${parsedExamDate}, exam_time = ${examTime},
        reminder_sent_at = NULL, one_hour_reminder_sent_at = NULL,
        seven_day_reminder_sent_at = NULL, three_day_reminder_sent_at = NULL,
        two_hour_reminder_sent_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${examId} AND exam_date = CURRENT_DATE
        AND lifecycle_status = 'SCHEDULED' AND payment_status = 'PENDING'
        AND CAST(${parsedExamDate} AS DATE) >= CURRENT_DATE
      RETURNING id, exam_date AS "examDate", exam_time AS "examTime",
        reminder_sent_at AS "reminderSentAt",
        one_hour_reminder_sent_at AS "oneHourReminderSentAt"
    `;
    if (!exams.length) {
      return res.status(409).json({ error: "Only an active exam can be rescheduled to today or later" });
    }
    res.json(exams[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reschedule exam" });
  }
}

export async function markExamAttendance(req, res) {
  try {
    const examId = parseExamId(req.params.id);
    const { attended } = req.body;
    if (!examId) return res.status(400).json({ error: "Invalid exam ID" });
    if (typeof attended !== "boolean") return res.status(400).json({ error: "attended must be boolean" });
    const exams = await prisma.$queryRaw`
      UPDATE exams SET attended = ${attended}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${examId} AND exam_date < CURRENT_DATE
      RETURNING id, attended
    `;
    if (!exams.length) return res.status(404).json({ error: "Past exam not found" });
    res.json(exams[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update exam attendance" });
  }
}

export const updateExam = rescheduleExam;

// Kept for compatibility; cancellation is intentionally soft.
export const deleteExam = cancelExam;