import { prisma } from "../lib/prisma.js";
import { notifyEmployeeMilestones } from "../lib/employeeMilestones.js";
import { getEffectiveModuleKeys, isFullAccessRole } from "../lib/moduleAccess.js";

/**
 * 1. Fetch user notifications
 * GET /api/notifications
 */
export async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
      await notifyEmployeeMilestones();
    } catch (err) {
      console.warn("Milestone notify:", err.message);
    }

    // Check module permissions for leads
    const allowedModules = await getEffectiveModuleKeys(req.user);
    const hasLeadAccess = isFullAccessRole(userRole) || allowedModules.includes("leads");

    // Notifications relevant to specific userId OR matching targetRoles
    let notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId },
          { targetRoles: { has: userRole } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // If user does not have lead module access, filter out lead-related notifications
    if (!hasLeadAccess) {
      notifications = notifications.filter(
        (n) => !n.type?.startsWith("LEAD_") && n.userId === userId ? true : !n.type?.startsWith("LEAD_")
      );
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    return res.status(500).json({ error: "Failed to fetch notifications." });
  }
}

/**
 * 2. Mark single notification as read
 * PATCH /api/notifications/:id/read
 */
export async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return res.status(200).json({ message: "Notification marked as read." });
  } catch (error) {
    console.error("Mark Notification Read Error:", error);
    return res.status(500).json({ error: "Failed to update notification." });
  }
}

/**
 * 3. Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
export async function markAllAsRead(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    await prisma.notification.updateMany({
      where: {
        OR: [
          { userId },
          { targetRoles: { has: userRole } },
        ],
        isRead: false,
      },
      data: { isRead: true },
    });

    return res.status(200).json({ message: "All notifications marked as read." });
  } catch (error) {
    console.error("Mark All Read Error:", error);
    return res.status(500).json({ error: "Failed to update notifications." });
  }
}
