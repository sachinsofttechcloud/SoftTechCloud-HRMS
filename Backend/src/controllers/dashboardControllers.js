import crypto from "crypto";
import { prisma } from "../lib/prisma.js";

const LEAD_INCLUDE = {
  assignedEmployee: { select: { id: true, name: true, employeeId: true } },
  candidate: { select: { id: true, candidateCode: true } },
  activities: {
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { id: true, name: true } } },
  },
  paymentAction: true,
};

function text(value) {
  return String(value ?? "").trim();
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function date(value, dateOnly = false) {
  if (!value) return null;
  const raw = dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? `${value}T00:00:00.000Z`
    : value;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateKey(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function displayDate(value, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function titleCase(value) {
  return text(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function dayDifference(value) {
  const target = new Date(dateKey(value));
  return Math.round((target.getTime() - startOfToday().getTime()) / 86400000);
}

function createdPeriod(value) {
  const difference = dayDifference(value);
  if (difference === 0) return "today";
  if (difference === 1) return "tomorrow";
  if (difference >= -7) return "week";
  return "month";
}

function followUpBucket(lead) {
  if (
    ["PAYMENT_PENDING", "PARTIALLY_PAID"].includes(lead.stage) &&
    lead.paymentAction?.commitmentDate
  ) return "commitment";
  const difference = dayDifference(lead.nextActionAt);
  if (difference < 0) return "overdue";
  if (difference === 0) return "dueToday";
  return "nextAction";
}

function responseStatus(stage) {
  if (stage === "NEW") return "Not Contacted";
  if (stage === "CONTACT_ATTEMPTED") return "Pending";
  if (stage === "CONNECTED") return "Completed";
  return titleCase(stage);
}

function leadEditData(lead) {
  return {
    fullName: lead.fullName,
    mobileNumber: lead.mobileNumber,
    whatsappNumber: lead.whatsappNumber,
    email: lead.email || "",
    technology: lead.technology,
    examName: lead.examName,
    examCode: lead.examCode,
    mode: lead.mode,
    preferredDate: dateKey(lead.preferredDate),
    preferredTime: lead.preferredTime,
    voucherNeed: lead.voucherNeed,
    quotedFee: Number(lead.quotedFee),
    companyReimbursement: lead.companyReimbursement,
    companyName: lead.companyName || "",
    source: lead.source,
    campaign: lead.campaign || "",
    assignedEmployeeId: lead.assignedEmployeeId,
    priority: lead.priority,
    stage: lead.stage,
    nextAction: lead.nextAction,
    nextActionAt: lead.nextActionAt?.toISOString().slice(0, 16) || "",
    lastContactAt: lead.lastContactAt?.toISOString().slice(0, 16) || "",
    remarks: lead.remarks || "",
    lostReason: lead.lostReason || "",
  };
}

function newLeadDto(lead) {
  return {
    id: lead.id,
    candidateName: lead.fullName,
    source: lead.source,
    owner: lead.assignedEmployee?.name || "Unassigned",
    responseStatus: responseStatus(lead.stage),
    period: createdPeriod(lead.createdAt),
    createdAt: displayDate(lead.createdAt),
    editData: leadEditData(lead),
  };
}

function followUpDto(lead) {
  return {
    id: lead.id,
    candidateName: lead.fullName,
    dueTime: displayDate(lead.nextActionAt, true),
    lastDiscussion:
      lead.activities?.[0]?.details || lead.remarks || "No discussion recorded",
    nextAction: lead.nextAction,
    priority: titleCase(lead.priority),
    owner: lead.assignedEmployee?.name || "Unassigned",
    bucket: followUpBucket(lead),
    editData: leadEditData(lead),
  };
}

function examWindow(exam) {
  return dayDifference(exam.examDate) === 0 ? "today" : "next7";
}

function readiness(value) {
  const normalized = text(value).toUpperCase();
  if (["COMPLETED", "READY", "ASSIGNED", "VERIFIED"].includes(normalized)) return "Ready";
  if (["MISSING", "EXPIRED"].includes(normalized)) return "Missing";
  return "Pending";
}

function examDto(exam) {
  return {
    id: exam.id,
    candidateName: exam.candidateName,
    examName: exam.examName,
    slot: `${displayDate(exam.examDate)} · ${exam.examTime}`,
    payment: readiness(exam.paymentStatus),
    voucher: exam.voucher ? readiness(exam.voucherStatus) : "N/A",
    document: readiness(exam.documentStatus),
    confirmation: readiness(exam.confirmationStatus),
    window: examWindow(exam),
    editData: {
      candidateName: exam.candidateName,
      technology: exam.technology,
      examName: exam.examName,
      mobileNo: exam.mobileNo,
      mode: exam.mode,
      centerName: exam.centerName || "",
      examDate: dateKey(exam.examDate),
      examTime: exam.examTime,
      voucher: exam.voucher,
      paymentStatus: exam.paymentStatus,
      documentStatus: exam.documentStatus,
      confirmationStatus: exam.confirmationStatus,
      voucherStatus: exam.voucherStatus,
      voucherExpiryAt: dateKey(exam.voucherExpiryAt),
    },
  };
}

function voucherDto(exam) {
  const status = titleCase(exam.voucherStatus || "PENDING");
  const bucket =
    status === "Assigned" ? "expiry" :
      status === "Purchased" ? "assignment" : "purchase";
  return {
    id: exam.id,
    candidateName: exam.candidateName,
    examName: exam.examName,
    status,
    dueDate: displayDate(exam.voucherExpiryAt || exam.examDate),
    bucket,
    editData: {
      candidateName: exam.candidateName,
      examName: exam.examName,
      voucherStatus: exam.voucherStatus,
      voucherExpiryAt: dateKey(exam.voucherExpiryAt),
    },
  };
}

function paymentDto(lead) {
  const payment = lead.paymentAction;
  const quotedFee = Number(lead.quotedFee);
  const amountDue = payment ? Number(payment.amountDue) : quotedFee;
  const amountPaid = payment ? Number(payment.amountPaid) : 0;
  const verification = payment?.verificationStatus || "PENDING";
  const reimbursement = payment?.reimbursementStatus ||
    (lead.companyReimbursement ? "PENDING" : "NOT_REQUIRED");
  const bucket =
    verification === "PENDING" && amountPaid > 0 ? "verification" :
      reimbursement === "PENDING" ? "reimbursement" :
        amountPaid > 0 && amountDue > 0 ? "partial" : "outstanding";
  const ageingDays = Math.max(0, -dayDifference(lead.updatedAt));
  return {
    id: lead.id,
    candidateName: lead.fullName,
    amountDue,
    ageing: `${ageingDays} day${ageingDays === 1 ? "" : "s"}`,
    commitmentDate: payment?.commitmentDate
      ? displayDate(payment.commitmentDate)
      : "—",
    channel: payment?.channel || "Direct",
    bucket,
    editData: {
      amountDue,
      amountPaid,
      commitmentDate: dateKey(payment?.commitmentDate),
      channel: payment?.channel || "Direct",
      verificationStatus: verification,
      reimbursementStatus: reimbursement,
    },
  };
}

function maintenanceDto(item) {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    due: dateKey(item.due),
    status: titleCase(item.status),
    editData: {
      title: item.title,
      type: item.type,
      due: dateKey(item.due),
      status: item.status,
    },
  };
}

function reminderDto(item) {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    date: displayDate(item.date, true),
    editData: {
      title: item.title,
      type: item.type,
      date: item.date.toISOString().slice(0, 16),
    },
  };
}

function caseDto(item) {
  return {
    id: item.id,
    caseCode: item.caseCode,
    candidateName: item.candidateName,
    type: item.type,
    status: titleCase(item.status),
    opened: displayDate(item.opened),
    owner: item.owner,
    editData: {
      candidateName: item.candidateName,
      type: item.type,
      status: item.status,
      opened: dateKey(item.opened),
      owner: item.owner,
      leadId: item.leadId || "",
      examId: item.examId || "",
    },
  };
}

export async function getDashboard(req, res) {
  try {
    const today = startOfToday();
    const endToday = new Date(today.getTime() + 86400000 - 1);
    const startTomorrow = new Date(today.getTime() + 86400000);
    const endTomorrow = new Date(today.getTime() + 2 * 86400000 - 1);
    const nextEightDays = new Date(today.getTime() + 8 * 86400000);

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));

    const [
      newLeads,
      followUps,
      exams,
      voucherExams,
      paymentLeads,
      maintenance,
      reminders,
      cases,
      revenue,
      employees,
      recentDeals,
      // Aggregates for summary cards
      allLeadsCount,
      todayLeadsCount,
      tomorrowLeadsCount,
      thisWeekLeadsCount,
      thisMonthLeadsCount,
      todayDueCount,
      overdueCount,
      todayExamsCount,
      next7DaysExamsCount,
      voucherNeedCount,
      assistSupportCount,
      allLeadsForGraph,
      allExamsForGraph,
    ] = await Promise.all([
      prisma.lead.findMany({
        where: {
          status: "ACTIVE",
          stage: { in: ["NEW", "CONTACT_ATTEMPTED", "CONNECTED"] },
          createdAt: { gte: monthStart },
        },
        include: LEAD_INCLUDE,
        orderBy: { createdAt: "desc" },
      }),
      prisma.lead.findMany({
        where: {
          status: "ACTIVE",
          stage: { notIn: ["CONVERTED", "LOST_NOT_INTERESTED"] },
        },
        include: LEAD_INCLUDE,
        orderBy: { nextActionAt: "asc" },
      }),
      prisma.exam.findMany({
        where: {
          lifecycleStatus: "SCHEDULED",
          examDate: { gte: today, lt: nextEightDays },
        },
        orderBy: [{ examDate: "asc" }, { examTime: "asc" }],
      }),
      prisma.exam.findMany({
        where: {
          lifecycleStatus: "SCHEDULED",
          voucher: true,
          examDate: { gte: today },
        },
        orderBy: [{ examDate: "asc" }, { examTime: "asc" }],
      }),
      prisma.lead.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { stage: { in: ["PAYMENT_PENDING", "PARTIALLY_PAID"] } },
            { paymentAction: { isNot: null } },
          ],
        },
        include: LEAD_INCLUDE,
        orderBy: { updatedAt: "asc" },
      }),
      prisma.dashboardMaintenance.findMany({ orderBy: { due: "asc" } }),
      prisma.dashboardReminder.findMany({ orderBy: { date: "asc" } }),
      prisma.supportCase.findMany({ orderBy: [{ opened: "desc" }, { createdAt: "desc" }] }),
      prisma.monthlyRevenue.findFirst({
        where: { month: { gte: monthStart, lt: nextMonth } },
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, employeeId: true },
        orderBy: { name: "asc" },
      }),
      prisma.lead.findMany({
        where: {
          stage: { in: ["CONVERTED", "PAYMENT_PENDING", "PARTIALLY_PAID", "SCHEDULING_PENDING", "REQUIREMENT_IDENTIFIED", "DETAILS_SHARED"] },
        },
        include: LEAD_INCLUDE,
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      // Stats counts
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: today, lte: endToday } } }),
      prisma.lead.count({
        where: {
          OR: [
            { preferredDate: { gte: startTomorrow, lte: endTomorrow } },
            { createdAt: { gte: startTomorrow, lte: endTomorrow } },
          ],
        },
      }),
      prisma.lead.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.lead.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.lead.count({
        where: { status: "ACTIVE", nextActionAt: { gte: today, lte: endToday } },
      }),
      prisma.lead.count({
        where: { status: "ACTIVE", nextActionAt: { lt: today } },
      }),
      prisma.exam.count({
        where: { lifecycleStatus: "SCHEDULED", examDate: { gte: today, lte: endToday } },
      }),
      prisma.exam.count({
        where: { lifecycleStatus: "SCHEDULED", examDate: { gte: today, lt: nextEightDays } },
      }),
      prisma.lead.count({ where: { voucherNeed: true } }),
      prisma.lead.count({ where: { voucherNeed: false } }),
      prisma.lead.findMany({
        select: { createdAt: true, stage: true, quotedFee: true },
      }),
      prisma.exam.findMany({
        select: { createdAt: true, examDate: true },
      }),
    ]);

    // Build monthly graph dataset for last 12 months
    const monthlyGraph = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mStart = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
      const mEnd = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999));
      const monthLabel = d.toLocaleString("en-US", { month: "short" });

      const monthLeads = allLeadsForGraph.filter(
        (l) => l.createdAt >= mStart && l.createdAt <= mEnd
      );
      const monthExams = allExamsForGraph.filter(
        (e) => (e.examDate || e.createdAt) >= mStart && (e.examDate || e.createdAt) <= mEnd
      );
      const monthConversions = monthLeads.filter((l) => l.stage === "CONVERTED");
      const monthRevenue = monthConversions.reduce((acc, cur) => acc + Number(cur.quotedFee || 0), 0);

      monthlyGraph.push({
        month: monthLabel,
        year: d.getFullYear(),
        leads: monthLeads.length,
        exams: monthExams.length,
        conversions: monthConversions.length,
        revenue: monthRevenue,
      });
    }

    res.json({
      summaryStats: {
        lead: {
          total: allLeadsCount,
          today: todayLeadsCount,
          tomorrow: tomorrowLeadsCount,
          thisWeek: thisWeekLeadsCount,
          thisMonth: thisMonthLeadsCount,
        },
        followUp: {
          totalDue: todayDueCount + overdueCount,
          todayDue: todayDueCount,
          overdue: overdueCount,
        },
        upcomingExam: {
          total: next7DaysExamsCount,
          today: todayExamsCount,
          next7Days: next7DaysExamsCount,
        },
        voucherAction: {
          total: voucherNeedCount + assistSupportCount,
          voucherIncluded: voucherNeedCount,
          assistIncluded: assistSupportCount,
        },
      },
      monthlyGraph,
      newLeads: newLeads.map(newLeadDto),
      recentDeals: recentDeals.map(newLeadDto),
      followUps: followUps.map(followUpDto),
      upcomingExams: exams.map(examDto),
      voucherActions: voucherExams.map(voucherDto),
      paymentActions: paymentLeads.map(paymentDto),
      maintenance: maintenance.map(maintenanceDto),
      reminders: reminders.map(reminderDto),
      cases: cases.map(caseDto),
      revenue: {
        supportCostActual: Number(revenue?.supportCostActual || 0),
        voucherCost: Number(revenue?.voucherCost || 0),
        supportSetupCost: Number(revenue?.supportSetupCost || 0),
      },
      employees,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
}

function examData(body) {
  const data = {};
  for (const field of [
    "candidateName", "technology", "examName", "mobileNo", "mode", "centerName",
    "examTime", "paymentStatus", "documentStatus", "confirmationStatus", "voucherStatus",
  ]) {
    if (body[field] !== undefined) data[field] = text(body[field]);
  }
  if (body.examDate !== undefined) data.examDate = date(body.examDate, true);
  if (body.voucherExpiryAt !== undefined) {
    data.voucherExpiryAt = date(body.voucherExpiryAt, true);
  }
  if (body.voucher !== undefined) {
    data.voucher = Boolean(body.voucher);
    data.assistSupport = !data.voucher;
  }
  return data;
}

async function updateResource(resource, id, body) {
  switch (resource) {
    case "exams":
    case "vouchers":
      return prisma.exam.update({ where: { id: Number(id) }, data: examData(body) });
    case "payments":
      return prisma.leadPaymentAction.upsert({
        where: { leadId: id },
        update: {
          amountDue: number(body.amountDue),
          amountPaid: number(body.amountPaid),
          commitmentDate: date(body.commitmentDate, true),
          channel: text(body.channel) || "Direct",
          verificationStatus: text(body.verificationStatus).toUpperCase() || "PENDING",
          reimbursementStatus: text(body.reimbursementStatus).toUpperCase() || "NOT_REQUIRED",
        },
        create: {
          leadId: id,
          amountDue: number(body.amountDue),
          amountPaid: number(body.amountPaid),
          commitmentDate: date(body.commitmentDate, true),
          channel: text(body.channel) || "Direct",
          verificationStatus: text(body.verificationStatus).toUpperCase() || "PENDING",
          reimbursementStatus: text(body.reimbursementStatus).toUpperCase() || "NOT_REQUIRED",
        },
      });
    case "maintenance":
      return prisma.dashboardMaintenance.update({
        where: { id },
        data: {
          title: text(body.title),
          type: text(body.type),
          due: date(body.due, true),
          status: text(body.status).toUpperCase(),
        },
      });
    case "reminders":
      return prisma.dashboardReminder.update({
        where: { id },
        data: {
          title: text(body.title),
          type: text(body.type),
          date: date(body.date),
        },
      });
    case "cases":
      return prisma.supportCase.update({
        where: { id },
        data: {
          candidateName: text(body.candidateName),
          type: text(body.type),
          status: text(body.status).toUpperCase(),
          opened: date(body.opened, true),
          owner: text(body.owner),
        },
      });
    case "revenue": {
      const now = startOfToday();
      const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return prisma.monthlyRevenue.upsert({
        where: { month },
        update: {
          supportCostActual: number(body.supportCostActual),
          voucherCost: number(body.voucherCost),
          supportSetupCost: number(body.supportSetupCost),
        },
        create: {
          month,
          supportCostActual: number(body.supportCostActual),
          voucherCost: number(body.voucherCost),
          supportSetupCost: number(body.supportSetupCost),
        },
      });
    }
    default:
      throw Object.assign(new Error("Unsupported dashboard resource"), { status: 400 });
  }
}

export async function updateDashboardRecord(req, res) {
  try {
    const result = await updateResource(req.params.resource, req.params.id, req.body);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(error.status || (error.code === "P2025" ? 404 : 500)).json({
      error: error.status ? error.message : "Failed to update dashboard record",
    });
  }
}

async function createResource(resource, body) {
  switch (resource) {
    case "maintenance":
      return prisma.dashboardMaintenance.create({
        data: {
          title: text(body.title),
          type: text(body.type),
          due: date(body.due, true),
          status: text(body.status || "PENDING").toUpperCase(),
        },
      });
    case "reminders":
      return prisma.dashboardReminder.create({
        data: {
          title: text(body.title),
          type: text(body.type),
          date: date(body.date),
        },
      });
    case "cases":
      return prisma.supportCase.create({
        data: {
          caseCode: `CASE-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
          candidateName: text(body.candidateName),
          type: text(body.type),
          status: text(body.status || "OPEN").toUpperCase(),
          opened: date(body.opened, true) || new Date(),
          owner: text(body.owner),
          leadId: text(body.leadId) || null,
          examId: body.examId ? Number(body.examId) : null,
        },
      });
    case "payments":
      return updateResource(resource, text(body.leadId), body);
    case "revenue":
      return updateResource(resource, "current", body);
    default:
      throw Object.assign(new Error("Unsupported dashboard resource"), { status: 400 });
  }
}

export async function createDashboardRecord(req, res) {
  try {
    const result = await createResource(req.params.resource, req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : "Failed to create dashboard record",
    });
  }
}

export async function deleteDashboardRecord(req, res) {
  try {
    const { resource, id } = req.params;
    switch (resource) {
      case "leads":
        await prisma.lead.delete({ where: { id } });
        break;
      case "exams":
      case "vouchers":
        await prisma.exam.delete({ where: { id: Number(id) } });
        break;
      case "payments":
        await prisma.$transaction([
          prisma.leadPaymentAction.deleteMany({ where: { leadId: id } }),
          prisma.lead.update({
            where: { id },
            data: { stage: "FOLLOW_UP", status: "ACTIVE" },
          }),
        ]);
        break;
      case "maintenance":
        await prisma.dashboardMaintenance.delete({ where: { id } });
        break;
      case "reminders":
        await prisma.dashboardReminder.delete({ where: { id } });
        break;
      case "cases":
        await prisma.supportCase.delete({ where: { id } });
        break;
      default:
        return res.status(400).json({ error: "Unsupported dashboard resource" });
    }
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(error.code === "P2025" ? 404 : 500).json({
      error: "Failed to delete dashboard record",
    });
  }
}
