import prisma from "./prisma.js";

export async function persistAttendanceStatus(userId, date, detail) {
  if (!userId || !date || !detail) return;
  try {
    await prisma.$executeRaw`
      UPDATE attendances
      SET status_label = ${detail.statusLabel || null},
          first_half = ${detail.firstHalf || null},
          second_half = ${detail.secondHalf || null},
          session = ${detail.leaveSession || null},
          present_credit = ${detail.presentCredit ?? 0},
          leave_credit = ${detail.leaveCredit ?? 0},
          credited_hours = ${detail.creditedHours ?? 0}
      WHERE user_id = ${userId} AND date = ${date}
    `;
  } catch (error) {
    console.warn("persistAttendanceStatus:", error.message);
  }
}
