import { prisma } from "../lib/prisma.js";
import { computeCompensationBreakdown } from "../lib/compensationCalc.js";

const VIEW_ALL_ROLES = ["HR", "ADMIN", "SUPER_ADMIN", "MANAGER"];
const WRITE_ROLES = ["HR", "ADMIN", "SUPER_ADMIN"];

const USER_SELECT = {
  id: true,
  employeeId: true,
  name: true,
  email: true,
  role: true,
  department: true,
  designation: true,
  avatar: true,
  passportPhoto: true,
  isActive: true,
  joiningDate: true,
};

function canViewAll(role) {
  return VIEW_ALL_ROLES.includes(role);
}

function canWrite(role) {
  return WRITE_ROLES.includes(role);
}

async function ensureCompensationEmployeeIds() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE compensations
      ADD COLUMN IF NOT EXISTS employee_id TEXT
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE compensations AS c
    SET employee_id = u.employee_id
    FROM users AS u
    WHERE c."userId" = u.id
      AND c.employee_id IS DISTINCT FROM u.employee_id
  `);
}

function serializeCompensation(record) {
  if (!record) return null;

  let live = null;
  try {
    live = computeCompensationBreakdown({
      totalCtc: record.totalCtc,
      variablePay: record.variablePay || 0,
    });
  } catch {
    live = null;
  }

  const merged = live ? { ...record, ...live } : record;
  return {
    ...merged,
    monthlySalary: merged.monthlySalary ?? merged.monthlyGross ?? round2((merged.totalCtc || 0) / 12),
    monthlyPf: merged.pfDeductionMonthly ?? round2((merged.pfDeduction || 0) / 12),
    monthlyTax: merged.monthlyGovernmentTax ?? round2((merged.governmentTax || 0) / 12),
  };
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function buildPayload(body, createdBy) {
  const totalCtc = Number(body.totalCtc);
  const variablePay = Number(body.variablePay || 0);
  const breakdown = computeCompensationBreakdown({ totalCtc, variablePay });

  return {
    totalCtc: breakdown.totalCtc,
    basicSalary: breakdown.basicSalary,
    hra: breakdown.hra,
    specialAllowance: breakdown.specialAllowance,
    variablePay: breakdown.variablePay,
    pfDeduction: breakdown.pfDeduction,
    employerPf: breakdown.employerPf,
    governmentTax: breakdown.governmentTax,
    professionalTaxMonthly: breakdown.professionalTaxMonthly,
    inHandCtc: breakdown.inHandCtc,
    monthlyInHand: breakdown.monthlyInHand,
    monthlyGross: breakdown.monthlyGross,
    taxBracket: breakdown.taxBracket,
    taxNote: breakdown.taxNote,
    effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
    notes: body.notes?.trim() || null,
    createdBy: createdBy || null,
  };
}

/**
 * GET /api/compensation
 * Employee: own record
 * HR / Admin / Manager: all employees
 */
export async function getCompensation(req, res) {
  try {
    await ensureCompensationEmployeeIds();
    const { search, department } = req.query;

    if (!canViewAll(req.user.role)) {
      const record = await prisma.compensation.findUnique({
        where: { userId: req.user.id },
        include: { user: { select: USER_SELECT } },
      });

      return res.status(200).json({
        scope: "self",
        compensation: serializeCompensation(record),
      });
    }

    const userWhere = { isActive: true };
    if (department && department !== "ALL") {
      userWhere.department = department;
    }
    if (search) {
      userWhere.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const employees = await prisma.user.findMany({
      where: userWhere,
      select: {
        ...USER_SELECT,
        compensation: true,
      },
      orderBy: { name: "asc" },
    });

    const withCompensation = [];
    const withoutCompensation = [];

    for (const emp of employees) {
      const { compensation, ...user } = emp;
      if (compensation) {
        withCompensation.push({
          employee: user,
          compensation: serializeCompensation(compensation),
        });
      } else {
        withoutCompensation.push(user);
      }
    }

    const totals = withCompensation.reduce(
      (acc, row) => {
        acc.totalCtc += row.compensation.totalCtc || 0;
        acc.totalInHand += row.compensation.inHandCtc || 0;
        acc.totalPf += row.compensation.pfDeduction || 0;
        acc.totalTax += row.compensation.governmentTax || 0;
        if (row.compensation.taxBracket === "ABOVE_12_LPA") acc.above12Lpa += 1;
        else acc.below12Lpa += 1;
        return acc;
      },
      { totalCtc: 0, totalInHand: 0, totalPf: 0, totalTax: 0, above12Lpa: 0, below12Lpa: 0 }
    );

    return res.status(200).json({
      scope: "all",
      canWrite: canWrite(req.user.role),
      employees: withCompensation,
      employeesWithoutCompensation: withoutCompensation,
      summary: {
        ...totals,
        assignedCount: withCompensation.length,
        pendingCount: withoutCompensation.length,
        totalEmployees: employees.length,
      },
    });
  } catch (error) {
    console.error("Get Compensation Error:", error);
    return res.status(500).json({ error: "Failed to fetch compensation data." });
  }
}

/**
 * GET /api/compensation/:userId
 */
export async function getCompensationByUser(req, res) {
  try {
    const { userId } = req.params;

    if (!canViewAll(req.user.role) && userId !== req.user.id) {
      return res.status(403).json({ error: "You can only view your own compensation." });
    }

    const record = await prisma.compensation.findUnique({
      where: { userId },
      include: { user: { select: USER_SELECT } },
    });

    if (!record) {
      return res.status(404).json({ error: "Compensation record not found for this employee." });
    }

    return res.status(200).json({ compensation: serializeCompensation(record) });
  } catch (error) {
    console.error("Get Compensation By User Error:", error);
    return res.status(500).json({ error: "Failed to fetch employee compensation." });
  }
}

/**
 * POST /api/compensation/preview
 */
export async function previewCompensation(req, res) {
  try {
    if (!canWrite(req.user.role)) {
      return res.status(403).json({ error: "Only HR or Admin can preview compensation structures." });
    }

    const breakdown = computeCompensationBreakdown({
      totalCtc: req.body.totalCtc,
      variablePay: req.body.variablePay || 0,
    });

    return res.status(200).json({ breakdown });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to preview compensation." });
  }
}

/**
 * POST /api/compensation  (create or upsert)
 */
export async function upsertCompensation(req, res) {
  try {
    if (!canWrite(req.user.role)) {
      return res.status(403).json({ error: "Only HR or Admin can set employee compensation." });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required." });
    }

    const employee = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }

    let data;
    try {
      data = buildPayload(req.body, req.user.name);
    } catch (calcErr) {
      return res.status(400).json({ error: calcErr.message });
    }

    const record = await prisma.compensation.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
      include: { user: { select: USER_SELECT } },
    });

    await ensureCompensationEmployeeIds();

    return res.status(200).json({
      message: "Compensation saved successfully.",
      compensation: serializeCompensation(record),
    });
  } catch (error) {
    console.error("Upsert Compensation Error:", error);
    return res.status(500).json({ error: "Failed to save compensation." });
  }
}
