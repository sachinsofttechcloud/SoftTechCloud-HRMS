import crypto from "crypto";
import { prisma } from "../lib/prisma.js";

export const LEAD_STAGES = [
  "NEW",
  "CONTACT_ATTEMPTED",
  "CONNECTED",
  "REQUIREMENT_IDENTIFIED",
  "DETAILS_SHARED",
  "FOLLOW_UP",
  "PAYMENT_PENDING",
  "PARTIALLY_PAID",
  "SCHEDULING_PENDING",
  "CONVERTED",
  "FUTURE_REQUIREMENT",
  "LOST_NOT_INTERESTED",
];

const PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const CLOSED_STAGES = new Set(["CONVERTED", "LOST_NOT_INTERESTED"]);

function text(value) {
  return String(value ?? "").trim();
}

function normalizePhone(value) {
  const input = text(value);
  const prefix = input.startsWith("+") ? "+" : "";
  return prefix + input.replace(/\D/g, "");
}

function dateOnly(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function code(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

function validate(input, { partial = false } = {}) {
  const required = [
    "fullName", "mobileNumber", "whatsappNumber", "technology", "examName",
    "examCode", "mode", "preferredDate", "preferredTime", "quotedFee",
    "source", "assignedEmployeeId", "nextAction", "nextActionAt",
  ];
  const errors = {};
  if (!partial) {
    for (const field of required) {
      if (input[field] === undefined || input[field] === null || text(input[field]) === "") {
        errors[field] = "Required";
      }
    }
  }

  const mobileNumber = normalizePhone(input.mobileNumber);
  const whatsappNumber = normalizePhone(input.whatsappNumber);
  if (input.mobileNumber !== undefined && !/^\+?\d{7,15}$/.test(mobileNumber)) {
    errors.mobileNumber = "Enter a valid mobile number";
  }
  if (input.whatsappNumber !== undefined && !/^\+?\d{7,15}$/.test(whatsappNumber)) {
    errors.whatsappNumber = "Enter a valid WhatsApp number";
  }
  if (input.preferredDate !== undefined && !dateOnly(input.preferredDate)) errors.preferredDate = "Enter a valid date";
  if (input.nextActionAt !== undefined && !dateTime(input.nextActionAt)) errors.nextActionAt = "Enter a valid next action time";
  if (input.quotedFee !== undefined && (!Number.isFinite(Number(input.quotedFee)) || Number(input.quotedFee) < 0)) {
    errors.quotedFee = "Enter a valid fee";
  }
  if (input.stage && !LEAD_STAGES.includes(input.stage)) errors.stage = "Invalid pipeline stage";
  if (input.priority && !PRIORITIES.has(input.priority)) errors.priority = "Invalid priority";
  if (input.stage === "LOST_NOT_INTERESTED" && !text(input.lostReason)) {
    errors.lostReason = "A lost reason is mandatory";
  }
  if (input.stage && !CLOSED_STAGES.has(input.stage) && (!text(input.nextAction) || !dateTime(input.nextActionAt))) {
    errors.nextAction = "An open lead must have a next action and due time";
  }
  return { errors, mobileNumber, whatsappNumber };
}

const leadInclude = {
  assignedEmployee: { select: { id: true, name: true, employeeId: true } },
  candidate: { select: { id: true, candidateCode: true } },
  activities: {
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { id: true, name: true } } },
  },
};

export async function listLeads(req, res) {
  try {
    const search = text(req.query.search);
    const stage = text(req.query.stage);
    const assignedTo = text(req.query.assignedTo);
    const filter = text(req.query.filter);
    const where = {};
    if (stage && LEAD_STAGES.includes(stage)) where.stage = stage;
    if (assignedTo) where.assignedEmployeeId = assignedTo;

    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);

    const startTomorrow = new Date(startToday);
    startTomorrow.setDate(startTomorrow.getDate() + 1);
    const endTomorrow = new Date(endToday);
    endTomorrow.setDate(endTomorrow.getDate() + 1);

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (filter === "OVERDUE" || filter === "overdue") {
      where.nextActionAt = { lt: new Date() };
      where.status = "ACTIVE";
    } else if (filter === "MINE" || filter === "mine") {
      where.assignedEmployeeId = req.user.id;
    } else if (filter === "DUPLICATE") {
      const duplicates = await prisma.lead.groupBy({
        by: ["mobileNumber"],
        _count: { mobileNumber: true },
        having: { mobileNumber: { _count: { gt: 1 } } },
      });
      where.mobileNumber = { in: duplicates.map((row) => row.mobileNumber) };
    } else if (filter === "today") {
      where.createdAt = { gte: startToday, lte: endToday };
    } else if (filter === "tomorrow") {
      where.OR = [
        { preferredDate: { gte: startTomorrow, lte: endTomorrow } },
        { createdAt: { gte: startTomorrow, lte: endTomorrow } },
      ];
    } else if (filter === "this_week" || filter === "week") {
      where.createdAt = { gte: startOfWeek };
    } else if (filter === "this_month" || filter === "month") {
      where.createdAt = { gte: startOfMonth };
    } else if (filter === "today_due") {
      where.nextActionAt = { gte: startToday, lte: endToday };
      where.status = "ACTIVE";
    } else if (filter === "voucher_included") {
      where.voucherNeed = true;
    } else if (filter === "assist_included") {
      where.voucherNeed = false;
    }

    if (search) {
      where.OR = [
        { leadCode: { contains: search, mode: "insensitive" } },
        { fullName: { contains: search, mode: "insensitive" } },
        { mobileNumber: { contains: search } },
        { examName: { contains: search, mode: "insensitive" } },
        { examCode: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
      ];
    }
    const leads = await prisma.lead.findMany({ where, include: leadInclude, orderBy: [{ nextActionAt: "asc" }, { createdAt: "desc" }] });
    res.json(leads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
}

export async function getLeadSummary(req, res) {
  try {
    const [total, overdue, converted, grouped] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { nextActionAt: { lt: new Date() }, status: "ACTIVE" } }),
      prisma.lead.count({ where: { stage: "CONVERTED" } }),
      prisma.lead.groupBy({ by: ["stage"], _count: { stage: true } }),
    ]);
    res.json({
      total,
      overdue,
      converted,
      active: total - converted,
      stages: Object.fromEntries(grouped.map((row) => [row.stage, row._count.stage])),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch lead summary" });
  }
}

export async function findLeadDuplicates(req, res) {
  try {
    const mobile = normalizePhone(req.query.mobile);
    const email = text(req.query.email).toLowerCase();
    const company = text(req.query.company);
    if (!mobile && !email && !company) return res.json([]);
    const matches = await prisma.lead.findMany({
      where: {
        OR: [
          ...(mobile ? [{ mobileNumber: mobile }] : []),
          ...(email ? [{ email: { equals: email, mode: "insensitive" } }] : []),
          ...(company ? [{ companyName: { equals: company, mode: "insensitive" } }] : []),
        ],
      },
      select: { id: true, leadCode: true, fullName: true, mobileNumber: true, email: true, companyName: true, stage: true },
      take: 10,
    });
    res.json(matches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to check duplicate leads" });
  }
}

export async function createLead(req, res) {
  try {
    const { errors, mobileNumber, whatsappNumber } = validate(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: "Complete all required lead fields", errors });

    const duplicate = await prisma.lead.findFirst({
      where: {
        mobileNumber,
        stage: { notIn: ["LOST_NOT_INTERESTED", "CONVERTED"] },
      },
      select: { id: true, leadCode: true, fullName: true, stage: true },
    });
    if (duplicate) {
      return res.status(409).json({ error: `Possible duplicate: ${duplicate.leadCode} belongs to ${duplicate.fullName}`, duplicate });
    }
    const existingCandidate = await prisma.candidate.findUnique({
      where: { mobileNumber },
      select: { id: true },
    });

    const lead = await prisma.lead.create({
      data: {
        leadCode: code("LD"),
        candidateId: existingCandidate?.id || null,
        fullName: text(req.body.fullName),
        mobileNumber,
        whatsappNumber,
        email: text(req.body.email).toLowerCase() || null,
        technology: text(req.body.technology),
        examName: text(req.body.examName),
        examCode: text(req.body.examCode),
        mode: text(req.body.mode).toUpperCase(),
        preferredDate: dateOnly(req.body.preferredDate),
        preferredTime: text(req.body.preferredTime),
        voucherNeed: Boolean(req.body.voucherNeed),
        quotedFee: Number(req.body.quotedFee),
        companyReimbursement: Boolean(req.body.companyReimbursement),
        companyName: text(req.body.companyName) || null,
        source: text(req.body.source),
        campaign: text(req.body.campaign) || null,
        assignedEmployeeId: text(req.body.assignedEmployeeId),
        status: "ACTIVE",
        stage: "NEW",
        priority: text(req.body.priority || "MEDIUM").toUpperCase(),
        nextAction: text(req.body.nextAction),
        nextActionAt: dateTime(req.body.nextActionAt),
        remarks: text(req.body.remarks) || null,
        createdById: req.user.id,
        activities: {
          create: {
            userId: req.user.id,
            type: "CREATED",
            title: "Lead created and assigned",
            details: text(req.body.remarks) || "Acknowledgement and owner task created.",
          },
        },
      },
      include: leadInclude,
    });

    await prisma.notification.create({
      data: {
        userId: lead.assignedEmployeeId,
        targetRoles: [],
        type: "LEAD_ASSIGNED",
        relatedId: lead.id,
        title: `New lead ${lead.leadCode}`,
        message: `${lead.fullName}: ${lead.nextAction} is due ${lead.nextActionAt.toLocaleString()}.`,
      },
    });
    res.status(201).json(lead);
  } catch (error) {
    console.error(error);
    if (error.code === "P2003") return res.status(400).json({ error: "Assigned employee is invalid" });
    res.status(500).json({ error: "Failed to create lead" });
  }
}

export async function updateLead(req, res) {
  try {
    const existing = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Lead not found" });
    const merged = { ...existing, ...req.body };
    const { errors, mobileNumber, whatsappNumber } = validate(merged);
    if (Object.keys(errors).length) return res.status(400).json({ error: Object.values(errors)[0], errors });

    const stageChanged = req.body.stage && req.body.stage !== existing.stage;
    const lead = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        fullName: text(merged.fullName),
        mobileNumber,
        whatsappNumber,
        email: text(merged.email).toLowerCase() || null,
        technology: text(merged.technology),
        examName: text(merged.examName),
        examCode: text(merged.examCode),
        mode: text(merged.mode).toUpperCase(),
        preferredDate: merged.preferredDate instanceof Date ? merged.preferredDate : dateOnly(merged.preferredDate),
        preferredTime: text(merged.preferredTime),
        voucherNeed: Boolean(merged.voucherNeed),
        quotedFee: Number(merged.quotedFee),
        companyReimbursement: Boolean(merged.companyReimbursement),
        companyName: text(merged.companyName) || null,
        source: text(merged.source),
        campaign: text(merged.campaign) || null,
        assignedEmployeeId: text(merged.assignedEmployeeId),
        stage: text(merged.stage),
        status: CLOSED_STAGES.has(merged.stage) ? "CLOSED" : "ACTIVE",
        priority: text(merged.priority).toUpperCase(),
        lastContactAt: merged.lastContactAt ? dateTime(merged.lastContactAt) : null,
        nextAction: text(merged.nextAction),
        nextActionAt: dateTime(merged.nextActionAt),
        remarks: text(merged.remarks) || null,
        lostReason: text(merged.lostReason) || null,
        activities: {
          create: {
            userId: req.user.id,
            type: stageChanged ? "STAGE_CHANGED" : "UPDATED",
            title: stageChanged ? `Stage changed to ${merged.stage.replaceAll("_", " ")}` : "Lead details updated",
            details: text(req.body.activityNote || merged.remarks) || null,
          },
        },
      },
      include: leadInclude,
    });
    res.json(lead);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update lead" });
  }
}

export async function convertLead(req, res) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (lead.stage === "LOST_NOT_INTERESTED") return res.status(409).json({ error: "A lost lead must be reopened before conversion" });

    const result = await prisma.$transaction(async (tx) => {
      let candidate = await tx.candidate.findUnique({ where: { mobileNumber: lead.mobileNumber } });
      if (!candidate) {
        candidate = await tx.candidate.create({
          data: {
            candidateCode: code("CND"),
            fullLegalName: lead.fullName,
            mobileNumber: lead.mobileNumber,
            whatsappNumber: lead.whatsappNumber,
            email: lead.email,
            companyName: lead.companyName,
          },
        });
      }
      const exam = await tx.exam.create({
        data: {
          candidateId: candidate.id,
          candidateName: candidate.fullLegalName,
          technology: lead.technology,
          examName: lead.examName,
          mobileNo: candidate.mobileNumber,
          mode: lead.mode,
          centerName: lead.mode === "ONLINE" ? null : text(req.body.centerName) || null,
          examDate: lead.preferredDate,
          examTime: lead.preferredTime,
          voucher: lead.voucherNeed,
          assistSupport: !lead.voucherNeed,
          paymentStatus: "COMPLETED",
          lifecycleStatus: "SCHEDULED",
        },
      });
      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          candidateId: candidate.id,
          stage: "CONVERTED",
          status: "CLOSED",
          convertedAt: new Date(),
          nextAction: "Exam booking created",
          activities: {
            create: {
              userId: req.user.id,
              type: "CONVERTED",
              title: `Converted to ${candidate.candidateCode}`,
              details: `Exam booking #${exam.id} created without re-entering candidate data.`,
            },
          },
        },
        include: leadInclude,
      });
      return { lead: updatedLead, candidate, exam };
    });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to convert lead" });
  }
}

export async function listCandidates(req, res) {
  try {
    const candidates = await prisma.candidate.findMany({
      include: {
        exams: { orderBy: { examDate: "desc" } },
        leads: { select: { id: true, leadCode: true, stage: true, examName: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json(candidates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
}
