import { prisma } from "../lib/prisma.js";
import { sendDueExamReminders, sendExamReminderIfDue } from "../lib/examReminders.js";
import { saveBase64Media } from "../lib/fileStorage.js";
import { buildRescheduleWhatsAppMessage, sendWhatsAppNotification } from "../lib/whatsapp.js";

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
  const assistSupport = toBoolean(input.assistSupport);
  const aadharCard = input.aadharCard || input.identityDocument || null;

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
      aadharCard,
    },
  };
}

let constraintCheckPromise = null;
async function ensureVoucherSupportConstraintDropped() {
  if (!constraintCheckPromise) {
    constraintCheckPromise = prisma.$executeRawUnsafe(`
      ALTER TABLE "exams" DROP CONSTRAINT IF EXISTS "exams_voucher_assist_support_check";
      ALTER TABLE "exams" DROP CONSTRAINT IF EXISTS "exams_voucher_cost_check";
    `).catch((err) => console.warn("Failed to drop constraint:", err.message));
  }
  return constraintCheckPromise;
}

async function insertExam(data) {
  await ensureVoucherSupportConstraintDropped();
  const parsedExamDate = new Date(`${data.examDate}T00:00:00.000Z`);
  const savedAadharCard = data.aadharCard ? saveBase64Media(data.aadharCard, "aadhar", "aadhar") : null;
  const exams = await prisma.$queryRaw`
    INSERT INTO exams (
      candidate_name, technology, exam_name, mobile_no, mode, center_name,
      exam_date, exam_time, voucher, assist_support, aadhar_card, payment_status,
      lifecycle_status, updated_at
    )
    VALUES (
      ${data.candidateName}, ${data.technology}, ${data.examName}, ${data.mobileNo},
      'ONLINE', NULL, ${parsedExamDate}, ${data.examTime}, ${data.voucher},
      ${data.assistSupport}, ${savedAadharCard}, 'PENDING', 'SCHEDULED', CURRENT_TIMESTAMP
    )
    RETURNING
      id, candidate_name AS "candidateName", technology, exam_name AS "examName",
      mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
      voucher, assist_support AS "assistSupport", aadhar_card AS "aadharCard", payment_status AS "paymentStatus",
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
  if (exam.paymentStatus === "COMPLETED" || exam.lifecycleStatus === "COMPLETED") return "COMPLETED";
  return exam.attended === true ? "COMPLETED" : "MISSED";
}

export async function getUpcomingExams(req, res) {
  try {
    const exams = await prisma.$queryRaw`
      SELECT id, candidate_name AS "candidateName", technology, exam_name AS "examName",
        mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
        voucher, assist_support AS "assistSupport", aadhar_card AS "aadharCard", payment_status AS "paymentStatus",
        lifecycle_status AS "lifecycleStatus", cancelled_at AS "cancelledAt",
        case_raised_at AS "caseRaiseDate", case_raised_at AS "caseRaisedAt",
        case_reason AS "caseReason",
        attended, reminder_sent_at AS "reminderSentAt",
        one_hour_reminder_sent_at AS "oneHourReminderSentAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM exams
      WHERE exam_date > CURRENT_DATE
        AND case_raised_at IS NULL
        AND lifecycle_status = 'SCHEDULED'
      ORDER BY exam_date ASC, exam_time ASC
    `;
    res.json(exams.map((exam) => ({ ...exam, status: exam.paymentStatus === "COMPLETED" ? "CONFIRMED" : "PENDING" })));
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
        voucher, assist_support AS "assistSupport", aadhar_card AS "aadharCard", payment_status AS "paymentStatus",
        lifecycle_status AS "lifecycleStatus", cancelled_at AS "cancelledAt",
        case_raised_at AS "caseRaiseDate", case_raised_at AS "caseRaisedAt",
        case_reason AS "caseReason",
        attended, reminder_sent_at AS "reminderSentAt",
        one_hour_reminder_sent_at AS "oneHourReminderSentAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM exams
      WHERE exam_date = CURRENT_DATE
        AND case_raised_at IS NULL
        AND lifecycle_status = 'SCHEDULED'
      ORDER BY exam_time ASC
    `;
    res.json(exams.map((exam) => ({ ...exam, status: "ONGOING" })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch active/today exams" });
  }
}

export const getTodayExams = getActiveExams;

export async function getCaseRaiseExams(req, res) {
  try {
    const exams = await prisma.$queryRaw`
      SELECT id, candidate_name AS "candidateName", technology, exam_name AS "examName",
        mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
        voucher, assist_support AS "assistSupport", aadhar_card AS "aadharCard", payment_status AS "paymentStatus",
        lifecycle_status AS "lifecycleStatus", cancelled_at AS "cancelledAt",
        case_raised_at AS "caseRaiseDate", case_raised_at AS "caseRaisedAt",
        case_reason AS "caseReason",
        attended, reminder_sent_at AS "reminderSentAt",
        one_hour_reminder_sent_at AS "oneHourReminderSentAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM exams
      WHERE case_raised_at IS NOT NULL
        AND lifecycle_status = 'SCHEDULED'
      ORDER BY case_raised_at DESC
    `;
    res.json(exams.map((exam) => ({ ...exam, status: "CASE_RAISED" })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch case raise exams" });
  }
}

export async function getPendingPaymentExams(req, res) {
  try {
    const exams = await prisma.$queryRaw`
      SELECT id, candidate_name AS "candidateName", technology, exam_name AS "examName",
        mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
        voucher, assist_support AS "assistSupport", aadhar_card AS "aadharCard", payment_status AS "paymentStatus",
        lifecycle_status AS "lifecycleStatus", cancelled_at AS "cancelledAt",
        case_raised_at AS "caseRaiseDate", case_raised_at AS "caseRaisedAt",
        case_reason AS "caseReason",
        attended, reminder_sent_at AS "reminderSentAt",
        one_hour_reminder_sent_at AS "oneHourReminderSentAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM exams
      WHERE payment_status = 'PENDING'
        AND lifecycle_status = 'COMPLETED'
      ORDER BY updated_at DESC, exam_date DESC
    `;
    res.json(exams.map((exam) => ({ ...exam, status: "PENDING_PAYMENT" })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch pending payment exams" });
  }
}

export async function getPastExams(req, res) {
  try {
    const exams = await prisma.$queryRaw`
      SELECT id, candidate_name AS "candidateName", technology, exam_name AS "examName",
        mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
        voucher, assist_support AS "assistSupport", aadhar_card AS "aadharCard", payment_status AS "paymentStatus",
        lifecycle_status AS "lifecycleStatus", cancelled_at AS "cancelledAt",
        case_raised_at AS "caseRaiseDate", case_raised_at AS "caseRaisedAt",
        case_reason AS "caseReason",
        attended, reminder_sent_at AS "reminderSentAt",
        one_hour_reminder_sent_at AS "oneHourReminderSentAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM exams
      WHERE (((lifecycle_status = 'COMPLETED' AND payment_status = 'COMPLETED')
              OR (exam_date < CURRENT_DATE AND case_raised_at IS NULL AND lifecycle_status = 'SCHEDULED'))
             AND exam_date <= CURRENT_DATE)
        OR lifecycle_status = 'CANCELLED'
      ORDER BY updated_at DESC, exam_date DESC
    `;
    res.json(exams.map((exam) => ({ ...exam, status: statusForPast(exam) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch past exams" });
  }
}

export async function getCompletedExams(req, res) {
  try {
    const exams = await prisma.$queryRaw`
      SELECT id, candidate_name AS "candidateName", technology, exam_name AS "examName",
        mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
        voucher, assist_support AS "assistSupport", aadhar_card AS "aadharCard", payment_status AS "paymentStatus",
        lifecycle_status AS "lifecycleStatus", cancelled_at AS "cancelledAt",
        attended, reminder_sent_at AS "reminderSentAt",
        one_hour_reminder_sent_at AS "oneHourReminderSentAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM exams
      WHERE payment_status = 'COMPLETED' OR attended = true OR lifecycle_status = 'COMPLETED'
      ORDER BY updated_at DESC, exam_date DESC
    `;
    res.json(exams.map((exam) => ({ ...exam, status: "COMPLETED" })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch completed candidate records" });
  }
}

export async function getExamById(req, res) {
  try {
    const examId = parseExamId(req.params.id);
    if (!examId) return res.status(400).json({ error: "Invalid candidate ID" });

    const exams = await prisma.$queryRaw`
      SELECT id, candidate_name AS "candidateName", technology, exam_name AS "examName",
        mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
        voucher, assist_support AS "assistSupport", aadhar_card AS "aadharCard", payment_status AS "paymentStatus",
        lifecycle_status AS "lifecycleStatus", cancelled_at AS "cancelledAt",
        attended, reminder_sent_at AS "reminderSentAt",
        one_hour_reminder_sent_at AS "oneHourReminderSentAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM exams
      WHERE id = ${examId}
    `;

    if (!exams || exams.length === 0) {
      return res.status(404).json({ error: "Candidate record not found" });
    }

    const exam = exams[0];
    res.json({
      ...exam,
      status: exam.payment_status === "COMPLETED" || exam.attended || exam.lifecycle_status === "COMPLETED" ? "COMPLETED" : exam.lifecycle_status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch candidate details" });
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

export async function syncExamCandidateToLead(exam, currentUserId = null) {
  try {
    if (!exam || !exam.mobileNo || exam.mobileNo === "Not specified") return;

    // 1. Ensure Candidate record exists
    let candidate = await prisma.candidate.findUnique({
      where: { mobileNumber: exam.mobileNo },
    });
    if (!candidate) {
      candidate = await prisma.candidate.create({
        data: {
          candidateCode: `CND-${Math.floor(100000 + Math.random() * 900000)}`,
          fullLegalName: exam.candidateName || "Exam Candidate",
          mobileNumber: exam.mobileNo,
        },
      });
    }

    // Link candidateId to exam if missing
    try {
      await prisma.exam.update({
        where: { id: exam.id },
        data: { candidateId: candidate.id },
      });
    } catch {}

    // 2. Resolve an assigned user ID
    let assignedUserId = currentUserId;
    if (!assignedUserId) {
      const activeUser = await prisma.user.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      assignedUserId = activeUser?.id;
    }
    if (!assignedUserId) {
      console.warn("No active user found to assign completed exam lead.");
      return;
    }

    // 3. Find if a lead already exists for this mobile number or candidate
    const existingLead = await prisma.lead.findFirst({
      where: {
        OR: [
          { mobileNumber: exam.mobileNo },
          { candidateId: candidate.id },
        ],
      },
    });

    const examDateVal = exam.examDate ? new Date(exam.examDate) : new Date();

    if (existingLead) {
      await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          stage: "CONVERTED",
          candidateId: candidate.id,
          convertedAt: existingLead.convertedAt || new Date(),
          examName: exam.examName || existingLead.examName,
          technology: exam.technology || existingLead.technology,
          updatedAt: new Date(),
          activities: {
            create: {
              userId: assignedUserId,
              type: "CONVERTED",
              title: "Exam Completed",
              details: `Exam ${exam.examName || ""} completed in Exam Module.`,
            },
          },
        },
      });
    } else {
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const leadCode = `LD-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

      await prisma.lead.create({
        data: {
          leadCode,
          candidateId: candidate.id,
          fullName: exam.candidateName || "Exam Candidate",
          mobileNumber: exam.mobileNo,
          whatsappNumber: exam.mobileNo,
          technology: exam.technology || "General",
          examName: exam.examName || "Certification Exam",
          examCode: exam.examName ? exam.examName.slice(0, 30) : "EXAM",
          mode: exam.mode || "ONLINE",
          preferredDate: examDateVal,
          preferredTime: exam.examTime || "09:00",
          voucherNeed: Boolean(exam.voucher),
          quotedFee: 0,
          companyReimbursement: false,
          source: "EXAM_MODULE",
          assignedEmployeeId: assignedUserId,
          createdById: assignedUserId,
          status: "ACTIVE",
          stage: "CONVERTED",
          priority: "MEDIUM",
          convertedAt: new Date(),
          nextAction: "Exam Completed",
          nextActionAt: new Date(),
          remarks: "Exam completed in Exam Module and shifted to Lead Management.",
          activities: {
            create: {
              userId: assignedUserId,
              type: "CONVERTED",
              title: "Exam Completed & Converted",
              details: `Candidate completed ${exam.examName || "exam"}. Recorded in Lead Management.`,
            },
          },
        },
      });
    }
  } catch (syncErr) {
    console.warn("Failed to sync exam candidate to lead:", syncErr.message);
  }
}

export async function syncCompletedExamsToLeads() {
  try {
    const completedExams = await prisma.$queryRaw`
      SELECT id, candidate_name AS "candidateName", technology, exam_name AS "examName",
        mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
        voucher, assist_support AS "assistSupport", payment_status AS "paymentStatus",
        lifecycle_status AS "lifecycleStatus"
      FROM exams
      WHERE lifecycle_status = 'COMPLETED'
         OR payment_status = 'COMPLETED'
         OR attended = true
    `;

    if (!completedExams.length) return;

    const activeUser = await prisma.user.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    const defaultUserId = activeUser?.id;

    for (const exam of completedExams) {
      await syncExamCandidateToLead(exam, defaultUserId);
    }
    console.log(`[LEAD SYNC] Synced ${completedExams.length} completed exam candidates into Lead Management.`);
  } catch (err) {
    console.warn("[LEAD SYNC] Error syncing completed exams to leads:", err.message);
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
      WHERE id = ${examId}
      RETURNING id, candidate_name AS "candidateName", exam_name AS "examName",
        technology, mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
        voucher, assist_support AS "assistSupport", payment_status AS "paymentStatus",
        lifecycle_status AS "lifecycleStatus"
    `;
    if (!exams.length) return res.status(404).json({ error: "Exam record not found" });

    const updatedExam = exams[0];
    if (paymentStatus === "COMPLETED") {
      await syncExamCandidateToLead(updatedExam, req.user?.id);
    }

    res.json(updatedExam);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update payment status" });
  }
}

export async function completeExam(req, res) {
  try {
    const examId = parseExamId(req.params.id);
    if (!examId) return res.status(400).json({ error: "Invalid exam ID" });

    const rawPayment = String(req.body?.paymentStatus || req.body?.payment || "").trim().toUpperCase();
    const isCompleted = rawPayment === "YES" || rawPayment === "COMPLETED";
    const paymentStatus = isCompleted ? "COMPLETED" : "PENDING";

    // Determine current exam date to handle future rescheduled dates
    const existing = await prisma.$queryRaw`
      SELECT id, candidate_name AS "candidateName", technology, exam_name AS "examName",
             mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
             voucher, assist_support AS "assistSupport"
      FROM exams
      WHERE id = ${examId}
    `;

    if (!existing.length) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const curExam = existing[0];
    const examDateStr = toDateKey(curExam.examDate);
    const todayStr = new Date().toISOString().slice(0, 10);
    const isFuture = examDateStr > todayStr;

    // If payment completed and date is future, exam stays SCHEDULED for that future date (in Upcoming)
    // Otherwise lifecycle_status is COMPLETED
    const newLifecycle = (isCompleted && isFuture) ? "SCHEDULED" : "COMPLETED";
    const attended = !isFuture;

    const exams = await prisma.$queryRaw`
      UPDATE exams
      SET lifecycle_status = ${newLifecycle},
          payment_status = ${paymentStatus},
          attended = ${attended},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${examId}
        AND lifecycle_status != 'CANCELLED'
      RETURNING id, candidate_name AS "candidateName", technology, exam_name AS "examName",
        mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
        voucher, assist_support AS "assistSupport", payment_status AS "paymentStatus",
        lifecycle_status AS "lifecycleStatus"
    `;

    if (!exams.length) {
      return res.status(404).json({ error: "Exam not found or already cancelled" });
    }

    const exam = exams[0];

    // Sync candidate details to Candidate & Lead Management
    await syncExamCandidateToLead(exam, req.user?.id);

    res.json({
      message: `Exam marked as completed successfully (Payment: ${paymentStatus})`,
      paymentStatus,
      exam,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to complete exam" });
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
      WHERE id = ${examId}
        AND lifecycle_status = 'SCHEDULED' AND payment_status = 'PENDING'
      RETURNING id, lifecycle_status AS "lifecycleStatus", cancelled_at AS "cancelledAt"
    `;
    if (!exams.length) return res.status(409).json({ error: "Only a scheduled exam can be cancelled" });
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
        case_raised_at = NULL,
        case_reason = NULL,
        lifecycle_status = 'SCHEDULED',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${examId}
        AND lifecycle_status != 'CANCELLED'
        AND CAST(${parsedExamDate} AS DATE) >= CURRENT_DATE
      RETURNING id, candidate_name AS "candidateName", exam_name AS "examName",
        technology,
        mobile_no AS "mobileNo", mode, center_name AS "centerName",
        exam_date AS "examDate", exam_time AS "examTime",
        case_raised_at AS "caseRaiseDate", case_raised_at AS "caseRaisedAt",
        reminder_sent_at AS "reminderSentAt",
        one_hour_reminder_sent_at AS "oneHourReminderSentAt"
    `;
    if (!exams.length) {
      return res.status(409).json({ error: "Only a scheduled exam can be rescheduled to today or later" });
    }

    const exam = exams[0];
    const waMessage = buildRescheduleWhatsAppMessage(exam);

    let waResult = { sent: false };
    try {
      waResult = await sendWhatsAppNotification(exam.mobileNo, waMessage);
    } catch (err) {
      console.warn("WhatsApp notification failed:", err.message);
    }

    // Create system notification for HR / Admin
    try {
      await prisma.notification.create({
        data: {
          targetRoles: ["ADMIN", "SUPER_ADMIN", "HR", "MANAGER"],
          title: `Exam Rescheduled: ${exam.candidateName}`,
          message: `${exam.candidateName}'s exam (${exam.examName}) was rescheduled to ${examDate} ${examTime}. WhatsApp notification sent.`,
          type: "EXAM_RESCHEDULED",
          relatedId: String(exam.id),
        },
      });
    } catch (err) {
      console.warn("System notification create error:", err.message);
    }

    res.json({
      ...exam,
      whatsappSent: waResult.sent,
      whatsappMessage: waMessage,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reschedule exam" });
  }
}

export async function caseRaiseExam(req, res) {
  try {
    const examId = parseExamId(req.params.id);
    const reason = String(req.body?.reason || req.body?.issue || "").trim();

    if (!examId) return res.status(400).json({ error: "Invalid exam ID" });
    if (!reason) return res.status(400).json({ error: "Please enter the reason or issue for raising the case" });

    const exams = await prisma.$queryRaw`
      UPDATE exams
      SET case_raised_at = CURRENT_TIMESTAMP,
          case_reason = ${reason},
          lifecycle_status = 'SCHEDULED',
          payment_status = 'PENDING',
          reminder_sent_at = NULL,
          one_hour_reminder_sent_at = NULL,
          seven_day_reminder_sent_at = NULL,
          three_day_reminder_sent_at = NULL,
          two_hour_reminder_sent_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${examId}
        AND lifecycle_status != 'CANCELLED'
      RETURNING id, candidate_name AS "candidateName", technology, exam_name AS "examName",
        mobile_no AS "mobileNo", mode, exam_date AS "examDate", exam_time AS "examTime",
        voucher, assist_support AS "assistSupport",
        case_raised_at AS "caseRaiseDate", case_raised_at AS "caseRaisedAt",
        case_reason AS "caseReason",
        lifecycle_status AS "lifecycleStatus"
    `;

    if (!exams.length) {
      return res.status(409).json({ error: "Exam not found or already cancelled" });
    }

    const exam = exams[0];

    // Create SupportCase record if possible
    try {
      await prisma.supportCase.create({
        data: {
          caseCode: `CAS-${Math.floor(100000 + Math.random() * 900000)}`,
          candidateName: exam.candidateName,
          type: "EXAM_CASE_RAISE",
          status: "OPEN",
          examId: exam.id,
          owner: req.user?.name || "System",
        },
      });
    } catch (e) {
      console.warn("SupportCase create warning:", e.message);
    }

    // System notification
    try {
      await prisma.notification.create({
        data: {
          targetRoles: ["ADMIN", "SUPER_ADMIN", "HR", "MANAGER"],
          title: `Case Raised for Exam: ${exam.candidateName}`,
          message: `Case raised for ${exam.candidateName}'s exam (${exam.examName}). Reason: ${reason}`,
          type: "EXAM_CASE_RAISED",
          relatedId: String(exam.id),
        },
      });
    } catch (e) {
      console.warn("Notification error:", e.message);
    }

    res.json({ message: "Case raised successfully", exam });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to raise case for exam" });
  }
}

export async function lookupCandidateByMobile(req, res) {
  try {
    const rawMobile = String(req.query?.mobile || "").trim();
    const digitsOnly = rawMobile.replace(/\D/g, "");

    if (!digitsOnly || digitsOnly.length < 5) {
      return res.status(400).json({ error: "Please provide a valid mobile number (at least 5 digits)" });
    }

    // Check candidate table first
    const candidate = await prisma.candidate.findFirst({
      where: {
        OR: [
          { mobileNumber: digitsOnly },
          { mobileNumber: { contains: digitsOnly } },
          { whatsappNumber: digitsOnly },
        ],
      },
      include: {
        exams: { orderBy: { createdAt: "desc" }, take: 1 },
        leads: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    // Check exam table
    const lastExam = await prisma.exam.findFirst({
      where: {
        OR: [
          { mobileNo: digitsOnly },
          { mobileNo: { contains: digitsOnly } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Check lead table
    const lastLead = await prisma.lead.findFirst({
      where: {
        OR: [
          { mobileNumber: digitsOnly },
          { mobileNumber: { contains: digitsOnly } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    if (!candidate && !lastExam && !lastLead) {
      return res.json({ found: false });
    }

    const candidateName = candidate?.fullLegalName || lastExam?.candidateName || lastLead?.fullName || "";
    const technology = lastExam?.technology || lastLead?.technology || "";
    const examName = lastExam?.examName || lastLead?.examName || "";
    const voucher = lastExam ? Boolean(lastExam.voucher) : lastLead ? Boolean(lastLead.voucherNeed) : false;
    const assistSupport = lastExam ? Boolean(lastExam.assistSupport) : false;

    res.json({
      found: true,
      candidate: {
        candidateName,
        technology,
        examName,
        voucher,
        assistSupport,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to lookup candidate" });
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

export async function getExamCatalog(req, res) {
  try {
    const search = String(req.query?.search || "").trim();
    const technology = String(req.query?.technology || "").trim();

    let query = `SELECT id, exam_code AS "examCode", exam_name AS "examName",
      technology, provider, duration, exam_fee AS "examFee",
      description, status, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM exam_catalog WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (exam_name ILIKE $${params.length} OR exam_code ILIKE $${params.length} OR technology ILIKE $${params.length})`;
    }

    if (technology && technology !== "all") {
      params.push(`%${technology}%`);
      query += ` AND technology ILIKE $${params.length}`;
    }

    query += ` ORDER BY exam_name ASC`;

    const items = await prisma.$queryRawUnsafe(query, ...params);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch exam catalog" });
  }
}

export async function createExamCatalogItem(req, res) {
  try {
    const examCode = String(req.body?.examCode || "").trim().toUpperCase();
    const examName = String(req.body?.examName || "").trim();
    const technology = String(req.body?.technology || "").trim();
    const provider = String(req.body?.provider || "").trim() || null;
    const duration = String(req.body?.duration || "").trim() || null;
    const examFee = req.body?.examFee !== undefined && req.body?.examFee !== "" ? Number(req.body.examFee) : null;
    const description = String(req.body?.description || "").trim() || null;

    if (!examCode) return res.status(400).json({ error: "Exam code is required" });
    if (!examName) return res.status(400).json({ error: "Exam name is required" });
    if (!technology) return res.status(400).json({ error: "Technology is required" });

    const created = await prisma.$queryRawUnsafe(`
      INSERT INTO exam_catalog (exam_code, exam_name, technology, provider, duration, exam_fee, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, exam_code AS "examCode", exam_name AS "examName",
        technology, provider, duration, exam_fee AS "examFee",
        description, status, created_at AS "createdAt", updated_at AS "updatedAt"
    `, examCode, examName, technology, provider, duration, examFee, description);

    res.status(201).json(created[0]);
  } catch (err) {
    console.error(err);
    if (err.message && err.message.includes("unique")) {
      return res.status(409).json({ error: "An exam with this exam code already exists." });
    }
    res.status(500).json({ error: "Failed to create catalog entry" });
  }
}

export async function updateExamCatalogItem(req, res) {
  try {
    const id = parseExamId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid catalog ID" });

    const examCode = String(req.body?.examCode || "").trim().toUpperCase();
    const examName = String(req.body?.examName || "").trim();
    const technology = String(req.body?.technology || "").trim();
    const provider = String(req.body?.provider || "").trim() || null;
    const duration = String(req.body?.duration || "").trim() || null;
    const examFee = req.body?.examFee !== undefined && req.body?.examFee !== "" ? Number(req.body.examFee) : null;
    const description = String(req.body?.description || "").trim() || null;
    const status = String(req.body?.status || "ACTIVE").trim().toUpperCase();

    if (!examCode || !examName || !technology) {
      return res.status(400).json({ error: "Exam code, name and technology are required" });
    }

    const updated = await prisma.$queryRawUnsafe(`
      UPDATE exam_catalog
      SET exam_code = $1, exam_name = $2, technology = $3, provider = $4,
          duration = $5, exam_fee = $6, description = $7, status = $8,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING id, exam_code AS "examCode", exam_name AS "examName",
        technology, provider, duration, exam_fee AS "examFee",
        description, status, created_at AS "createdAt", updated_at AS "updatedAt"
    `, examCode, examName, technology, provider, duration, examFee, description, status, id);

    if (!updated.length) return res.status(404).json({ error: "Catalog item not found" });
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update catalog entry" });
  }
}

export async function deleteExamCatalogItem(req, res) {
  try {
    const id = parseExamId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid catalog ID" });

    await prisma.$queryRawUnsafe(`DELETE FROM exam_catalog WHERE id = $1`, id);
    res.json({ message: "Catalog item deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete catalog item" });
  }
}