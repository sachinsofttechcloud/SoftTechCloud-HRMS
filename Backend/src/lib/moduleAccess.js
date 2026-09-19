import { prisma } from "./prisma.js";
import crypto from "crypto";

export const FULL_ACCESS_ROLES = ["ADMIN", "SUPER_ADMIN"];
export const DEFAULT_MODULE_KEYS = ["dashboard", "attendance"];

/** Catalog of navigable modules. */
export const APP_MODULE_CATALOG = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Home dashboard and workspace overview",
    route: "/home",
    groupName: "Dashboard",
    sortOrder: 10,
  },
  {
    key: "attendance",
    label: "Attendance & HRMS",
    description:
      "Attendance, leave, calendar, compensation, HR documents, and payroll submodules",
    route: "/attendance",
    groupName: "HRMS",
    sortOrder: 20,
  },
  {
    key: "onboarding",
    label: "HR Onboarding",
    description: "Onboard new employees",
    route: "/admin/onboarding",
    groupName: "Admin",
    sortOrder: 30,
  },
  {
    key: "manage_users",
    label: "Manage Users",
    description: "User list and module access control",
    route: "/manage-users",
    groupName: "Admin",
    sortOrder: 40,
  },
  {
    key: "exam",
    label: "Exam",
    description: "Create, schedule, and manage candidate exams",
    route: "/exam",
    groupName: "Operations",
    sortOrder: 50,
  },
  {
    key: "leads",
    label: "Lead Management",
    description: "Own leads from enquiry through candidate conversion",
    route: "/leads",
    groupName: "Sales",
    sortOrder: 60,
  },
];

export function isFullAccessRole(role) {
  return FULL_ACCESS_ROLES.includes(role);
}

export async function ensureModuleAccessTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_modules (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      description TEXT,
      route TEXT,
      group_name TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS user_module_access (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      can_access BOOLEAN NOT NULL DEFAULT TRUE,
      granted_by_id TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS user_module_access_user_id_module_id_key
      ON user_module_access (user_id, module_id)
  `);
}

export async function ensureAppModulesSeeded() {
  await ensureModuleAccessTables();

  for (const module of APP_MODULE_CATALOG) {
    const existing = await prisma.$queryRaw`
      SELECT id FROM app_modules WHERE key = ${module.key} LIMIT 1
    `;
    if (Array.isArray(existing) && existing.length) {
      await prisma.$executeRaw`
        UPDATE app_modules
        SET
          label = ${module.label},
          description = ${module.description},
          route = ${module.route},
          group_name = ${module.groupName},
          sort_order = ${module.sortOrder},
          is_active = TRUE,
          updated_at = NOW()
        WHERE key = ${module.key}
      `;
      continue;
    }

    await prisma.$executeRaw`
      INSERT INTO app_modules
        (id, key, label, description, route, group_name, sort_order, is_active)
      VALUES
        (${crypto.randomUUID()}, ${module.key}, ${module.label}, ${module.description},
         ${module.route}, ${module.groupName}, ${module.sortOrder}, TRUE)
    `;
  }

  // Internal Attendance tabs are submodules, not independently assignable modules.
  await prisma.$executeRawUnsafe(`
    UPDATE app_modules
    SET is_active = FALSE, updated_at = NOW()
    WHERE key NOT IN ('dashboard', 'attendance', 'onboarding', 'manage_users', 'exam', 'leads')
  `);
}

export async function listActiveModules() {
  await ensureAppModulesSeeded();
  const rows = await prisma.$queryRaw`
    SELECT id, key, label, description, route, group_name AS "groupName",
           sort_order AS "sortOrder", is_active AS "isActive"
    FROM app_modules
    WHERE is_active = TRUE
    ORDER BY sort_order ASC, label ASC
  `;
  return Array.isArray(rows) ? rows : [];
}

export async function ensureAccessRolesSeeded() {
  await ensureAppModulesSeeded();
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS access_roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      system_role TEXT NOT NULL DEFAULT 'EMPLOYEE',
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS access_role_modules (
      role_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      PRIMARY KEY (role_id, module_id)
    )
  `);
  await prisma.$executeRawUnsafe(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS access_role_id TEXT"
  );

  const templates = [
    ["Super Admin", "Full system access to every module.", "SUPER_ADMIN", APP_MODULE_CATALOG.map((m) => m.key)],
    ["Admin", "Administrative access to every module.", "ADMIN", APP_MODULE_CATALOG.map((m) => m.key)],
    ["HR", "Employee operations, attendance, and onboarding.", "HR", ["dashboard", "attendance", "onboarding"]],
    ["Manager", "Dashboard and Attendance & HRMS access.", "MANAGER", DEFAULT_MODULE_KEYS],
    ["Employee", "Standard employee workspace access.", "EMPLOYEE", DEFAULT_MODULE_KEYS],
  ];

  for (const [name, description, systemRole, moduleKeys] of templates) {
    const rows = await prisma.$queryRaw`
      SELECT id FROM access_roles WHERE LOWER(name) = LOWER(${name}) LIMIT 1
    `;
    let roleId = rows[0]?.id;
    if (!roleId) {
      roleId = crypto.randomUUID();
      await prisma.$executeRaw`
        INSERT INTO access_roles (id, name, description, system_role, is_system)
        VALUES (${roleId}, ${name}, ${description}, ${systemRole}, TRUE)
      `;
    }

    const assigned = await prisma.$queryRaw`
      SELECT role_id FROM access_role_modules WHERE role_id = ${roleId} LIMIT 1
    `;
    if (!assigned.length) {
      for (const moduleKey of moduleKeys) {
        await prisma.$executeRaw`
          INSERT INTO access_role_modules (role_id, module_id)
          SELECT ${roleId}, id FROM app_modules WHERE key = ${moduleKey}
          ON CONFLICT DO NOTHING
        `;
      }
    }
  }
}

export async function listAccessRoles() {
  await ensureAccessRolesSeeded();
  const roles = await prisma.$queryRaw`
    SELECT
      r.id,
      r.name,
      r.description,
      r.system_role AS "systemRole",
      r.is_system AS "isSystem",
      (
        SELECT COUNT(*)::int
        FROM users u
        WHERE u.access_role_id = r.id
          OR (u.access_role_id IS NULL AND u.role::text = r.system_role)
      ) AS "userCount",
      COALESCE(
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT('key', module_rows.key, 'label', module_rows.label)
            ORDER BY module_rows.sort_order
          )
          FROM (
            SELECT m.key, m.label, m.sort_order
            FROM access_role_modules rm
            INNER JOIN app_modules m ON m.id = rm.module_id
            WHERE rm.role_id = r.id AND m.is_active = TRUE
          ) module_rows
        ),
        '[]'
      ) AS modules
    FROM access_roles r
    ORDER BY r.is_system DESC, r.name ASC
  `;

  return roles.map((role) => ({
    ...role,
    role: role.name,
    moduleKeys: (role.modules || []).map((module) => module.key),
    permissionCount: (role.modules || []).length,
    hasFullModuleAccess: isFullAccessRole(role.systemRole),
  }));
}

export async function createAccessRole({ name, description, moduleKeys }) {
  await ensureAccessRolesSeeded();
  const normalizedName = String(name || "").trim();
  if (normalizedName.length < 2) {
    throw new Error("Role name must be at least 2 characters.");
  }

  const duplicate = await prisma.$queryRaw`
    SELECT id FROM access_roles WHERE LOWER(name) = LOWER(${normalizedName}) LIMIT 1
  `;
  if (duplicate.length) {
    throw new Error("A role with this name already exists.");
  }

  const roleId = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO access_roles (id, name, description, system_role, is_system)
    VALUES (${roleId}, ${normalizedName}, ${String(description || "").trim() || null},
      'EMPLOYEE', FALSE)
  `;

  const wanted = new Set((moduleKeys || []).filter(Boolean));
  const modules = await listActiveModules();
  for (const module of modules) {
    if (wanted.has(module.key)) {
      await prisma.$executeRaw`
        INSERT INTO access_role_modules (role_id, module_id)
        VALUES (${roleId}, ${module.id})
        ON CONFLICT DO NOTHING
      `;
    }
  }

  return (await listAccessRoles()).find((role) => role.id === roleId);
}

export async function getGrantedModuleKeys(userId) {
  if (!userId) return [];
  await ensureAppModulesSeeded();
  const rows = await prisma.$queryRaw`
    SELECT m.key
    FROM user_module_access uma
    INNER JOIN app_modules m ON m.id = uma.module_id
    WHERE uma.user_id = ${userId}
      AND uma.can_access = TRUE
      AND m.is_active = TRUE
    ORDER BY m.sort_order ASC
  `;
  return (Array.isArray(rows) ? rows : []).map((row) => row.key);
}

/**
 * Effective modules for a user.
 * ADMIN / SUPER_ADMIN always receive every active module.
 */
export async function getEffectiveModuleKeys(user) {
  const modules = await listActiveModules();
  const allKeys = modules.map((m) => m.key);

  if (isFullAccessRole(user?.role)) {
    return allKeys;
  }

  return getGrantedModuleKeys(user?.id);
}

export async function attachUserModuleAccess(user) {
  if (!user) return user;
  try {
    const modules = await listActiveModules();
    const allowedModules = await getEffectiveModuleKeys(user);
    user.allowedModules = allowedModules;
    user.modules = modules.filter((m) => allowedModules.includes(m.key));
    user.hasFullModuleAccess = isFullAccessRole(user.role);
  } catch (error) {
    console.warn("attachUserModuleAccess:", error.message);
    user.allowedModules = isFullAccessRole(user?.role)
      ? APP_MODULE_CATALOG.map((m) => m.key)
      : [];
    user.modules = [];
    user.hasFullModuleAccess = isFullAccessRole(user?.role);
  }
  return user;
}

export async function setUserModuleAccess({ userId, moduleKeys, grantedById }) {
  await ensureAppModulesSeeded();
  const modules = await listActiveModules();
  const wanted = new Set((moduleKeys || []).filter(Boolean));

  for (const module of modules) {
    const existing = await prisma.$queryRaw`
      SELECT id FROM user_module_access
      WHERE user_id = ${userId} AND module_id = ${module.id}
      LIMIT 1
    `;

    const shouldGrant = wanted.has(module.key);

    if (Array.isArray(existing) && existing.length) {
      await prisma.$executeRaw`
        UPDATE user_module_access
        SET can_access = ${shouldGrant},
            granted_by_id = ${grantedById || null},
            updated_at = NOW()
        WHERE id = ${existing[0].id}
      `;
    } else if (shouldGrant) {
      await prisma.$executeRaw`
        INSERT INTO user_module_access
          (id, user_id, module_id, can_access, granted_by_id)
        VALUES
          (${crypto.randomUUID()}, ${userId}, ${module.id}, TRUE, ${grantedById || null})
      `;
    }
  }

  return getGrantedModuleKeys(userId);
}

/** Assign Dashboard + Attendance once to users who have never received any access rows. */
export async function grantDefaultModuleAccess(userId, grantedById = null) {
  if (!userId) return [];
  await ensureAppModulesSeeded();

  const existing = await prisma.$queryRaw`
    SELECT id FROM user_module_access
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  if (Array.isArray(existing) && existing.length) {
    return getGrantedModuleKeys(userId);
  }

  return setUserModuleAccess({
    userId,
    moduleKeys: DEFAULT_MODULE_KEYS,
    grantedById,
  });
}

/** One-time backfill for employees created before module permissions existed. */
export async function grantDefaultsToExistingUsers() {
  await ensureAppModulesSeeded();
  const users = await prisma.user.findMany({
    where: {
      role: { notIn: FULL_ACCESS_ROLES },
    },
    select: { id: true },
  });

  for (const user of users) {
    await grantDefaultModuleAccess(user.id);
  }
}

export async function countGrantedModulesByUserIds(userIds = []) {
  const ids = [...new Set(userIds.filter(Boolean))];
  const map = new Map(ids.map((id) => [id, 0]));
  if (!ids.length) return map;

  await ensureAppModulesSeeded();
  const rows = await prisma.$queryRawUnsafe(
    `SELECT uma.user_id AS "userId", COUNT(*)::int AS count
     FROM user_module_access uma
     INNER JOIN app_modules m ON m.id = uma.module_id
     WHERE uma.can_access = TRUE
       AND m.is_active = TRUE
       AND uma.user_id IN (${ids.map((_, i) => `$${i + 1}`).join(", ")})
     GROUP BY uma.user_id`,
    ...ids
  );

  for (const row of rows || []) {
    map.set(row.userId, Number(row.count) || 0);
  }
  return map;
}
