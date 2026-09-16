import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { resolveNextEmployeeId } from "./hrController.js";
import {
  attachUserModuleAccess,
  countGrantedModulesByUserIds,
  createAccessRole,
  ensureAppModulesSeeded,
  getGrantedModuleKeys,
  isFullAccessRole,
  listAccessRoles,
  listActiveModules,
  setUserModuleAccess,
} from "../lib/moduleAccess.js";

/**
 * GET /api/access/modules
 * Catalog of modules (Admin/Super Admin). Others receive only their effective list.
 */
export async function listModules(req, res) {
  try {
    const modules = await listActiveModules();
    if (isFullAccessRole(req.user.role)) {
      return res.status(200).json({ modules, scope: "all" });
    }

    const allowed = await getGrantedModuleKeys(req.user.id);
    return res.status(200).json({
      modules: modules.filter((m) => allowed.includes(m.key)),
      scope: "self",
    });
  } catch (error) {
    console.error("List Modules Error:", error);
    return res.status(500).json({ error: "Failed to fetch modules." });
  }
}

/**
 * GET /api/access/my-modules
 */
export async function getMyModules(req, res) {
  try {
    const user = {
      id: req.user.id,
      role: req.user.role,
    };
    await attachUserModuleAccess(user);
    return res.status(200).json({
      allowedModules: user.allowedModules,
      modules: user.modules,
      hasFullModuleAccess: user.hasFullModuleAccess,
    });
  } catch (error) {
    console.error("Get My Modules Error:", error);
    return res.status(500).json({ error: "Failed to fetch module access." });
  }
}

/**
 * GET /api/access/users
 * Onboarded employees for Manage Users (Admin / Super Admin).
 */
export async function listAccessUsers(req, res) {
  try {
    await ensureAppModulesSeeded();

    const { search = "", status = "ALL", role = "ALL" } = req.query;
    const summaryWhere = {};

    if (role && role !== "ALL") summaryWhere.role = String(role).toUpperCase();

    if (search.trim()) {
      summaryWhere.OR = [
        { name: { startsWith: search.trim(), mode: "insensitive" } },
        { email: { startsWith: search.trim(), mode: "insensitive" } },
        { employeeId: { startsWith: search.trim(), mode: "insensitive" } },
        { department: { startsWith: search.trim(), mode: "insensitive" } },
      ];
    }

    const where = { ...summaryWhere };
    if (status === "ACTIVE") where.isActive = true;
    if (status === "INACTIVE") where.isActive = false;

    const [users, totalCount, activeCount, inactiveCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          employeeId: true,
          name: true,
          email: true,
          role: true,
          department: true,
          designation: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.user.count({ where: summaryWhere }),
      prisma.user.count({ where: { ...summaryWhere, isActive: true } }),
      prisma.user.count({ where: { ...summaryWhere, isActive: false } }),
    ]);

    const counts = await countGrantedModulesByUserIds(users.map((u) => u.id));
    const modules = await listActiveModules();
    await listAccessRoles();
    const assignedRoles = await prisma.$queryRaw`
      SELECT u.id AS "userId", r.name
      FROM users u
      INNER JOIN access_roles r ON r.id = u.access_role_id
    `;
    const assignedRoleNames = new Map(
      assignedRoles.map((row) => [row.userId, row.name])
    );

    const decorated = users.map((user) => {
      const fullAccess = isFullAccessRole(user.role);
      return {
        ...user,
        accessRoleName: assignedRoleNames.get(user.id) || user.role,
        username: user.email?.split("@")[0] || "",
        permissionCount: fullAccess ? modules.length : counts.get(user.id) || 0,
        hasFullModuleAccess: fullAccess,
      };
    });

    return res.status(200).json({
      users: decorated,
      modules,
      summary: {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
      },
    });
  } catch (error) {
    console.error("List Access Users Error:", error);
    return res.status(500).json({ error: "Failed to fetch users." });
  }
}

/**
 * GET /api/access/users/:userId
 */
export async function getUserModuleAccess(req, res) {
  try {
    const { userId } = req.params;
    const employee = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        department: true,
        designation: true,
        isActive: true,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }

    const modules = await listActiveModules();
    const grantedKeys = isFullAccessRole(employee.role)
      ? modules.map((m) => m.key)
      : await getGrantedModuleKeys(userId);

    return res.status(200).json({
      user: {
        ...employee,
        username: employee.email?.split("@")[0] || "",
        hasFullModuleAccess: isFullAccessRole(employee.role),
      },
      modules: modules.map((module) => ({
        ...module,
        granted: grantedKeys.includes(module.key),
      })),
      grantedModuleKeys: grantedKeys,
    });
  } catch (error) {
    console.error("Get User Module Access Error:", error);
    return res.status(500).json({ error: "Failed to fetch user module access." });
  }
}

/**
 * PUT /api/access/users/:userId
 * Assign modules to an onboarded employee.
 */
export async function updateUserModuleAccess(req, res) {
  try {
    const { userId } = req.params;
    const moduleKeys = Array.isArray(req.body?.moduleKeys) ? req.body.moduleKeys : [];

    const employee = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        employeeId: true,
        email: true,
        department: true,
        designation: true,
        isActive: true,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }

    if (isFullAccessRole(employee.role)) {
      return res.status(400).json({
        error: "Admin and Super Admin already have access to every module.",
      });
    }

    const grantedModuleKeys = await setUserModuleAccess({
      userId,
      moduleKeys,
      grantedById: req.user.id,
    });

    return res.status(200).json({
      message: `Module access updated for ${employee.name}.`,
      user: employee,
      grantedModuleKeys,
    });
  } catch (error) {
    console.error("Update User Module Access Error:", error);
    return res.status(500).json({ error: "Failed to update module access." });
  }
}

/**
 * GET /api/access/roles
 * Role overview for Roles & Permissions page.
 */
export async function listRolePermissionOverview(req, res) {
  try {
    const modules = await listActiveModules();
    const roles = await listAccessRoles();

    return res.status(200).json({ roles, modules });
  } catch (error) {
    console.error("List Role Permission Overview Error:", error);
    return res.status(500).json({ error: "Failed to fetch roles overview." });
  }
}

export async function addAccessRole(req, res) {
  try {
    const role = await createAccessRole({
      name: req.body?.name,
      description: req.body?.description,
      moduleKeys: req.body?.moduleKeys,
    });
    return res.status(201).json({ message: "Role added successfully.", role });
  } catch (error) {
    console.error("Add Access Role Error:", error);
    const isValidation = /role name|already exists/i.test(error.message);
    return res.status(isValidation ? 400 : 500).json({
      error: isValidation ? error.message : "Failed to add role.",
    });
  }
}

export async function createManagedUser(req, res) {
  try {
    const {
      name,
      email,
      phone,
      birthDate,
      address,
      employeeId,
      department,
      designation,
      reportingManager,
      joiningDate,
      roleId,
    } = req.body || {};

    if (!name?.trim() || !email?.trim() || !department?.trim() || !designation?.trim()) {
      return res.status(400).json({
        error: "Name, work email, department, and designation are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith("@softtechcloud.com")) {
      return res.status(400).json({
        error: "Only corporate @softtechcloud.com email addresses are permitted.",
      });
    }

    const roles = await listAccessRoles();
    const selectedRole = roles.find((role) => role.id === roleId);
    if (!selectedRole) {
      return res.status(400).json({ error: "Select a valid role." });
    }
    if (
      ["ADMIN", "SUPER_ADMIN"].includes(selectedRole.systemRole) &&
      req.user.role !== "SUPER_ADMIN"
    ) {
      return res.status(403).json({
        error: "Only Super Admin can create Admin or Super Admin users.",
      });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: "A user with this email already exists." });
    }

    const resolvedEmployeeId = String(employeeId || (await resolveNextEmployeeId()))
      .trim()
      .toUpperCase();
    const employeeIdExists = await prisma.user.findUnique({
      where: { employeeId: resolvedEmployeeId },
    });
    if (employeeIdExists) {
      return res.status(409).json({ error: "Employee ID is already assigned." });
    }

    const parsedJoiningDate = joiningDate
      ? new Date(`${joiningDate}T00:00:00`)
      : new Date();
    if (Number.isNaN(parsedJoiningDate.getTime())) {
      return res.status(400).json({ error: "Enter a valid joining date." });
    }

    const temporaryPassword = `Stc@${crypto.randomBytes(5).toString("hex")}`;
    const password = await bcrypt.hash(temporaryPassword, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password,
        role: selectedRole.systemRole,
        employeeId: resolvedEmployeeId,
        phone: phone?.trim() || null,
        birthDate: birthDate || null,
        address: address?.trim() || null,
        department: department.trim(),
        designation: designation.trim(),
        reportingManager: reportingManager?.trim() || null,
        joiningDate: parsedJoiningDate,
        isActive: true,
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        department: true,
        designation: true,
        isActive: true,
      },
    });

    await prisma.$executeRaw`
      UPDATE users SET access_role_id = ${selectedRole.id} WHERE id = ${user.id}
    `;
    if (!isFullAccessRole(user.role)) {
      await setUserModuleAccess({
        userId: user.id,
        moduleKeys: selectedRole.moduleKeys,
        grantedById: req.user.id,
      });
    }

    return res.status(201).json({
      message: "User added successfully.",
      user: { ...user, accessRoleName: selectedRole.name },
      credentials: { email: user.email, temporaryPassword },
    });
  } catch (error) {
    console.error("Create Managed User Error:", error);
    return res.status(500).json({ error: "Failed to add user." });
  }
}
