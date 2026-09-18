import { prisma } from "./prisma.js";

const THIRTY_MINUTES = 30 * 60 * 1000;
const PAYMENT_CADENCE = 24 * 60 * 60 * 1000;

export async function runLeadAutomation() {
  const now = new Date();
  const soon = new Date(now.getTime() + THIRTY_MINUTES);

  const dueSoon = await prisma.lead.findMany({
    where: {
      status: "ACTIVE",
      nextActionAt: { gt: now, lte: soon },
    },
    select: { id: true, leadCode: true, fullName: true, assignedEmployeeId: true, nextAction: true, nextActionAt: true },
  });
  for (const lead of dueSoon) {
    const existing = await prisma.notification.findFirst({
      where: { relatedId: lead.id, type: "LEAD_FOLLOW_UP_DUE", createdAt: { gte: new Date(now.getTime() - THIRTY_MINUTES) } },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          userId: lead.assignedEmployeeId,
          targetRoles: [],
          type: "LEAD_FOLLOW_UP_DUE",
          relatedId: lead.id,
          title: `Follow-up due: ${lead.leadCode}`,
          message: `${lead.nextAction} for ${lead.fullName} is due at ${lead.nextActionAt.toLocaleString()}.`,
        },
      });
    }
  }

  const overdue = await prisma.lead.findMany({
    where: { status: "ACTIVE", nextActionAt: { lt: now }, overdueEscalatedAt: null },
    include: { assignedEmployee: { select: { name: true } } },
  });
  for (const lead of overdue) {
    await prisma.$transaction([
      prisma.notification.create({
        data: {
          userId: null,
          targetRoles: ["MANAGER", "ADMIN", "SUPER_ADMIN"],
          type: "LEAD_OVERDUE",
          relatedId: lead.id,
          title: `Overdue lead: ${lead.leadCode}`,
          message: `${lead.fullName} is assigned to ${lead.assignedEmployee.name}; required action: ${lead.nextAction}.`,
        },
      }),
      prisma.lead.update({ where: { id: lead.id }, data: { overdueEscalatedAt: now } }),
    ]);
  }

  const paymentLeads = await prisma.lead.findMany({
    where: {
      status: "ACTIVE",
      stage: { in: ["PAYMENT_PENDING", "PARTIALLY_PAID"] },
      OR: [
        { paymentReminderSentAt: null },
        { paymentReminderSentAt: { lt: new Date(now.getTime() - PAYMENT_CADENCE) } },
      ],
    },
  });
  for (const lead of paymentLeads) {
    await prisma.$transaction([
      prisma.notification.create({
        data: {
          userId: lead.assignedEmployeeId,
          targetRoles: [],
          type: "LEAD_PAYMENT_REMINDER",
          relatedId: lead.id,
          title: `Payment reminder: ${lead.leadCode}`,
          message: `Follow the approved payment reminder cadence for ${lead.fullName}.`,
        },
      }),
      prisma.lead.update({ where: { id: lead.id }, data: { paymentReminderSentAt: now } }),
    ]);
  }
}
