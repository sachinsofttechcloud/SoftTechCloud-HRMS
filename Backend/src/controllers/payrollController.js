import { prisma } from "../lib/prisma.js";
import { autoConfirmCompletedProbations } from "../lib/hrDocs.js";

const VIEW_ALL = ["HR", "ADMIN", "SUPER_ADMIN", "MANAGER"];
const WRITE_ROLES = ["HR", "ADMIN", "SUPER_ADMIN"];

function canViewAll(role) {
  return VIEW_ALL.includes(role);
}

async function ensureSalarySlipPdfColumns() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE salary_slips
      ADD COLUMN IF NOT EXISTS file_data TEXT,
      ADD COLUMN IF NOT EXISTS file_name TEXT
  `);
}

function isPdfPayload(fileData, fileName) {
  const data = String(fileData || "");
  return (
    /^data:application\/pdf;base64,/i.test(data) ||
    (data.startsWith("JVBERi0") && /\.pdf$/i.test(String(fileName || "")))
  );
}

function normalizeMonth(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || ""))) return null;
  const [yearStr, monthStr] = month.split("-");
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return {
    month,
    year: Number(yearStr),
    monthLabel: date.toLocaleString("en-IN", { month: "long", year: "numeric" }),
  };
}

function lastNMonths(n = 6) {
  const months = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = d.toLocaleString("en-IN", { month: "long", year: "numeric" });
    months.push({ month, monthLabel, year: d.getFullYear() });
  }
  return months;
}

function slipPayload(user, compensation, monthMeta, generatedBy) {
  const gross = compensation?.monthlyGross || compensation?.monthlyInHand || 0;
  const pf = compensation ? Number(compensation.pfDeduction || 0) / 12 : 0;
  const tax = compensation ? Number(compensation.governmentTax || 0) / 12 : 0;
  const net = compensation?.monthlyInHand || Math.max(0, gross - pf - tax);
  return {
    userId: user.id,
    month: monthMeta.month,
    monthLabel: monthMeta.monthLabel,
    year: monthMeta.year,
    grossPay: Math.round(gross * 100) / 100,
    pfDeduction: Math.round(pf * 100) / 100,
    governmentTax: Math.round(tax * 100) / 100,
    netPay: Math.round(net * 100) / 100,
    status: "DISBURSED",
    fileUrl: `/payslips/${user.id}/${monthMeta.month}.txt`,
    generatedBy,
  };
}

async function ensureSlipsForUser(user, compensation, generatedBy = "Payroll System") {
  if (!compensation) return [];
  const created = [];
  for (const monthMeta of lastNMonths(6)) {
    const existing = await prisma.salarySlip.findUnique({
      where: { userId_month: { userId: user.id, month: monthMeta.month } },
    });
    if (existing) continue;
    const slip = await prisma.salarySlip.create({
      data: slipPayload(user, compensation, monthMeta, generatedBy),
    });
    created.push(slip);
  }
  return created;
}

export function buildPayslipText(slip, employee) {
  return [
    "SoftTechCloud HRMS — Salary Slip",
    "================================",
    `Employee     : ${employee?.name || ""}`,
    `Email        : ${employee?.email || ""}`,
    `Department   : ${employee?.department || "General"}`,
    `Designation  : ${employee?.designation || employee?.role || ""}`,
    `Month        : ${slip.monthLabel} (${slip.month})`,
    "--------------------------------",
    `Gross Pay    : INR ${Number(slip.grossPay).toFixed(2)}`,
    `PF Deduction : INR ${Number(slip.pfDeduction).toFixed(2)}`,
    `Govt. Tax    : INR ${Number(slip.governmentTax).toFixed(2)}`,
    `Net Pay      : INR ${Number(slip.netPay).toFixed(2)}`,
    `Status       : ${slip.status}`,
    "================================",
    "This is a system-generated salary slip.",
  ].join("\n");
}

/**
 * GET /api/payroll/slips
 */
export async function getSalarySlips(req, res) {
  try {
    await autoConfirmCompletedProbations();

    const { userId, month } = req.query;
    const privileged = canViewAll(req.user.role);

    if (userId && !privileged && userId !== req.user.id) {
      return res.status(403).json({ error: "You can only view your own salary slips." });
    }

    const targetUserId = privileged ? userId || null : req.user.id;

    if (targetUserId) {
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { compensation: true },
      });
      if (user) await ensureSlipsForUser(user, user.compensation);
    } else {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        include: { compensation: true },
      });
      for (const user of users) {
        await ensureSlipsForUser(user, user.compensation);
      }
    }

    const where = {};
    if (targetUserId) where.userId = targetUserId;
    if (month) where.month = month;

    const slips = await prisma.salarySlip.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            email: true,
            department: true,
            designation: true,
            role: true,
          },
        },
      },
      orderBy: [{ month: "desc" }, { createdAt: "desc" }],
    });

    return res.status(200).json({ slips, scope: privileged ? "all" : "self" });
  } catch (error) {
    console.error("Get Salary Slips Error:", error);
    return res.status(500).json({ error: "Failed to fetch salary slips." });
  }
}

/**
 * GET /api/payroll/slips/:id
 */
export async function getSalarySlipById(req, res) {
  try {
    const slip = await prisma.salarySlip.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            email: true,
            department: true,
            designation: true,
            role: true,
          },
        },
      },
    });

    if (!slip) return res.status(404).json({ error: "Salary slip not found." });

    if (!canViewAll(req.user.role) && slip.userId !== req.user.id) {
      return res.status(403).json({ error: "You can only download your own salary slip." });
    }

    await ensureSalarySlipPdfColumns();
    const fileRows = await prisma.$queryRaw`
      SELECT file_data, file_name
      FROM salary_slips
      WHERE id = ${slip.id}
    `;
    const storedFile = Array.isArray(fileRows) ? fileRows[0] : null;

    return res.status(200).json({
      slip,
      fileData: storedFile?.file_data || null,
      downloadText: storedFile?.file_data ? null : buildPayslipText(slip, slip.user),
      fileName:
        storedFile?.file_name ||
        `Salary_Slip_${(slip.user?.name || "Employee").replace(/\s+/g, "_")}_${slip.month}.txt`,
    });
  } catch (error) {
    console.error("Get Salary Slip Error:", error);
    return res.status(500).json({ error: "Failed to fetch salary slip." });
  }
}

/**
 * POST /api/payroll/slips  HR/Admin generate or refresh a month
 */
export async function upsertSalarySlip(req, res) {
  try {
    if (!WRITE_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: "Only HR or Admin can generate salary slips." });
    }

    const { userId, month } = req.body;
    if (!userId || !month) {
      return res.status(400).json({ error: "userId and month (YYYY-MM) are required." });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { compensation: true },
    });
    if (!user) return res.status(404).json({ error: "Employee not found." });
    if (!user.compensation) {
      return res.status(400).json({ error: "Assign CTC in Compensation before generating a salary slip." });
    }

    const [yearStr, monthStr] = month.split("-");
    const d = new Date(Number(yearStr), Number(monthStr) - 1, 1);
    const monthMeta = {
      month,
      year: d.getFullYear(),
      monthLabel: d.toLocaleString("en-IN", { month: "long", year: "numeric" }),
    };

    const data = slipPayload(user, user.compensation, monthMeta, req.user.name);
    const slip = await prisma.salarySlip.upsert({
      where: { userId_month: { userId, month } },
      update: data,
      create: data,
      include: {
        user: { select: { id: true, employeeId: true, name: true, email: true, department: true, designation: true } },
      },
    });

    return res.status(200).json({ message: "Salary slip saved.", slip });
  } catch (error) {
    console.error("Upsert Salary Slip Error:", error);
    return res.status(500).json({ error: "Failed to save salary slip." });
  }
}

/**
 * POST /api/payroll/slips/upload
 * HR/Admin upload an employee PDF salary slip. Gross and net are sourced from Compensation.
 */
export async function uploadSalarySlip(req, res) {
  try {
    if (!WRITE_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: "Only HR or Admin can upload salary slips." });
    }

    const { employeeName, employeeId, month, fileData, fileName } = req.body;
    const monthMeta = normalizeMonth(month);
    if (!employeeName?.trim()) {
      return res.status(400).json({ error: "Employee name is required." });
    }
    if (!employeeId?.trim()) {
      return res.status(400).json({ error: "Employee ID is required." });
    }
    if (!monthMeta) {
      return res.status(400).json({ error: "A valid salary month (YYYY-MM) is required." });
    }
    if (!isPdfPayload(fileData, fileName)) {
      return res.status(400).json({ error: "A valid PDF salary slip is required." });
    }

    const employee = await prisma.user.findFirst({
      where: {
        isActive: true,
        employeeId: { equals: employeeId.trim(), mode: "insensitive" },
        name: { equals: employeeName.trim(), mode: "insensitive" },
      },
      include: { compensation: true },
    });
    if (!employee) {
      return res.status(404).json({ error: "Employee name and Employee ID do not match." });
    }
    if (!employee.compensation) {
      return res.status(400).json({
        error: "Compensation is not assigned for this employee. Add compensation first.",
      });
    }

    const pdfUrl = `/payslips/${employee.id}/${month}.pdf`;
    const data = {
      ...slipPayload(employee, employee.compensation, monthMeta, req.user.name),
      fileUrl: pdfUrl,
    };
    const slip = await prisma.salarySlip.upsert({
      where: { userId_month: { userId: employee.id, month } },
      update: data,
      create: data,
      include: {
        user: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            email: true,
            department: true,
            designation: true,
          },
        },
      },
    });

    await ensureSalarySlipPdfColumns();
    const safeFileName = /\.pdf$/i.test(String(fileName || ""))
      ? fileName
      : `Salary_Slip_${employee.name.replace(/\s+/g, "_")}_${month}.pdf`;
    await prisma.$executeRaw`
      UPDATE salary_slips
      SET file_data = ${fileData}, file_name = ${safeFileName}
      WHERE id = ${slip.id}
    `;

    return res.status(201).json({
      message: `Salary slip uploaded for ${employee.name} (${monthMeta.monthLabel}).`,
      slip: { ...slip, fileUrl: pdfUrl },
    });
  } catch (error) {
    console.error("Upload Salary Slip Error:", error);
    return res.status(500).json({ error: "Failed to upload salary slip." });
  }
}
