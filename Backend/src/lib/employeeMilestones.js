import prisma from "./prisma.js";

export function todayYmdIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export function formatDisplayDate(value) {
  const ymd = toYmd(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "—";
  const [year, month, day] = ymd.split("-");
  return `${day}/${month}/${year}`;
}

export function joiningDateFromYmd(ymd) {
  const raw = toYmd(ymd);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return new Date(`${raw}T06:00:00.000Z`);
}

export function toYmd(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(value);
  }
  return String(value).slice(0, 10);
}

export async function attachUserDates(user) {
  if (!user?.id) return user;
  try {
    const rows = await prisma.$queryRaw`
      SELECT birth_date FROM users WHERE id = ${user.id}
    `;
    const row = Array.isArray(rows) ? rows[0] : null;
    if (row) {
      user.birthDate = row.birth_date ? toYmd(row.birth_date) : user.birthDate || null;
    }
    if (user.joiningDate) {
      user.joiningDate = toYmd(user.joiningDate);
    }
    const joinYmd = user.joiningDate || "";
    const years = joinYmd ? completedYears(joinYmd, todayYmdIST()) : 0;
    user.yearsCompleted = years;
    user.workAnniversaryLabel =
      years < 1 ? "Less than 1 year" : years === 1 ? "1 year completed" : `${years} years completed`;
  } catch (error) {
    console.warn("attachUserDates:", error.message);
  }
  return user;
}

export async function saveUserBirthDate(userId, birthDate) {
  if (!userId || !birthDate) return;
  const ymd = toYmd(birthDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return;
  await prisma.$executeRaw`
    UPDATE users SET birth_date = ${ymd} WHERE id = ${userId}
  `;
}

function completedYears(joinYmd, todayYmd) {
  const [ty, tm, td] = todayYmd.split("-").map(Number);
  const [jy, jm, jd] = joinYmd.split("-").map(Number);
  let years = ty - jy;
  if (tm < jm || (tm === jm && td < jd)) years -= 1;
  return years;
}

let milestoneJob = null;

/**
 * Birthday + work-anniversary notifications for HR / Admin / Super Admin.
 * One notification per employee per year.
 */
export async function notifyEmployeeMilestones() {
  if (milestoneJob) return milestoneJob;
  milestoneJob = runEmployeeMilestones().finally(() => {
    milestoneJob = null;
  });
  return milestoneJob;
}

async function runEmployeeMilestones() {
  const today = todayYmdIST();
  const todayMmDd = today.slice(5);
  const year = today.slice(0, 4);

  const employees = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      department: true,
      joiningDate: true,
      createdAt: true,
    },
  });

  const birthMap = new Map();
  try {
    const birthRows = await prisma.$queryRaw`SELECT id, birth_date FROM users WHERE birth_date IS NOT NULL`;
    for (const row of birthRows || []) {
      birthMap.set(String(row.id), toYmd(row.birth_date));
    }
  } catch (error) {
    console.warn("Birthday query:", error.message);
  }

  for (const emp of employees) {
    const birthYmd = birthMap.get(String(emp.id));
    if (!birthYmd || birthYmd.slice(5) !== todayMmDd) continue;

    const relatedId = `${emp.id}:birthday:${year}`;
    const exists = await prisma.notification.findFirst({
      where: { type: "EMPLOYEE_BIRTHDAY", relatedId },
    });
    if (exists) continue;

    await prisma.notification.create({
      data: {
        userId: emp.id,
        targetRoles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN", "SUPER_ADMIN"],
        title: "Employee Birthday Today",
        message: `${emp.name}'s birthday is today (${formatDisplayDate(birthYmd)}).`,
        type: "EMPLOYEE_BIRTHDAY",
        relatedId,
      },
    });
  }

  for (const emp of employees) {
    const joinYmd = toYmd(emp.joiningDate || emp.createdAt);
    if (!joinYmd || joinYmd.slice(5) !== todayMmDd) continue;
    const years = completedYears(joinYmd, today);
    if (years < 1) continue;

    const relatedId = `${emp.id}:anniversary:${year}`;
    const exists = await prisma.notification.findFirst({
      where: { type: "WORK_ANNIVERSARY", relatedId },
    });
    if (exists) continue;

    const yearLabel = years === 1 ? "1 year completed" : `${years} years completed`;
    await prisma.notification.create({
      data: {
        userId: emp.id,
        targetRoles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN", "SUPER_ADMIN"],
        title: "Work Anniversary",
        message: `${emp.name} — joining date ${formatDisplayDate(joinYmd)}. ${yearLabel}.`,
        type: "WORK_ANNIVERSARY",
        relatedId,
      },
    });
  }
}
