import { prisma } from "./prisma.js";

export const HR_DOC_COLUMNS = [
  { field: "joiningLetter", label: "Joining Letter" },
  { field: "probationLetter", label: "Probation Letter" },
  { field: "aadhaarCard", label: "Aadhaar Card" },
  { field: "panCard", label: "PAN Card" },
  { field: "form16", label: "Form 16" },
  { field: "completed", label: "Completed Probation Letter" },
];

const STANDARD_FIELDS = ["joiningLetter", "probationLetter", "aadhaarCard", "panCard", "form16"];

function filePath(userId, slug) {
  return `/documents/${userId}/${slug}.pdf`;
}

export function defaultDocumentPaths(userId) {
  return {
    joiningLetter: filePath(userId, "joining-letter"),
    probationLetter: filePath(userId, "probation-letter"),
    aadhaarCard: filePath(userId, "aadhaar-card"),
    panCard: filePath(userId, "pan-card"),
    form16: filePath(userId, "form-16"),
  };
}

export function fieldFromCategory(category, docType) {
  const n = `${category || ""} ${docType || ""}`.toUpperCase().replace(/[\s-]+/g, "_");
  if (n.includes("JOINING") || n.includes("OFFER")) return "joiningLetter";
  if (n.includes("AADHAAR") || n.includes("AADHAR") || n.includes("ADHAREE")) return "aadhaarCard";
  if (n.includes("PAN") || n.includes("PAND")) return "panCard";
  if (n.includes("FORM_16") || n.includes("FORM16")) return "form16";
  if (n.includes("COMPLETION") || n.includes("COMPLETED")) return "completed";
  if (n.includes("PROBATION")) return "probationLetter";
  return null;
}

export function isPdfDataUrl(value) {
  const data = String(value || "");
  return data.startsWith("data:application/pdf") || data.startsWith("JVBERi0");
}

export async function ensureCustomDocumentsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS hr_custom_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_data TEXT NOT NULL,
      uploaded_by TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

export async function listCustomDocuments(userIds = []) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return [];
  try {
    await ensureCustomDocumentsTable();
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, user_id, title, file_name, uploaded_by, created_at
       FROM hr_custom_documents
       WHERE user_id IN (${ids.map((_, i) => `$${i + 1}`).join(", ")})
       ORDER BY created_at DESC`,
      ...ids
    );
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.warn("listCustomDocuments:", error.message);
    return [];
  }
}

export async function saveCustomDocument({ userId, title, fileName, fileData, uploadedBy }) {
  await ensureCustomDocumentsTable();
  const id = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO hr_custom_documents (id, user_id, title, file_name, file_data, uploaded_by)
    VALUES (${id}, ${userId}, ${title}, ${fileName}, ${fileData}, ${uploadedBy})
  `;
  return id;
}

export async function getCustomDocumentById(id) {
  await ensureCustomDocumentsTable();
  const rows = await prisma.$queryRaw`
    SELECT id, user_id, title, file_name, file_data, uploaded_by, created_at
    FROM hr_custom_documents
    WHERE id = ${id}
  `;
  return Array.isArray(rows) ? rows[0] || null : null;
}

export function serializeHrDocument(row, extraDocuments = []) {
  if (!row) return null;
  const employeeName = row.employeeName || row.user?.name || "Employee";
  const documents = HR_DOC_COLUMNS.map((col) => ({
    id: `${row.id}:${col.field}`,
    recordId: row.id,
    field: col.field,
    label: col.label,
    title: `${col.label} - ${employeeName}`,
    category: col.label,
    fileUrl: row[col.field] || null,
    available: Boolean(row[col.field]),
    userId: row.userId,
    user: row.user,
  }));

  return {
    id: row.id,
    userId: row.userId,
    employeeName,
    aadhaarCard: row.aadhaarCard,
    panCard: row.panCard,
    joiningLetter: row.joiningLetter,
    form16: row.form16,
    probationLetter: row.probationLetter,
    completed: row.completed,
    uploadedBy: row.uploadedBy,
    user: row.user,
    documents,
    extraDocuments: extraDocuments.map((doc) => ({
      id: doc.id,
      userId: doc.user_id || doc.userId,
      title: doc.title,
      fileName: doc.file_name || doc.fileName,
      uploadedBy: doc.uploaded_by || doc.uploadedBy,
      createdAt: doc.created_at || doc.createdAt,
    })),
  };
}

export async function ensureEmployeeDocuments(employee, uploadedBy = "HR System") {
  if (!employee?.id) return null;

  const defaults = defaultDocumentPaths(employee.id);
  const existing = await prisma.hrDocument.findUnique({
    where: { userId: employee.id },
  });

  if (!existing) {
    return prisma.hrDocument.create({
      data: {
        userId: employee.id,
        employeeName: employee.name,
        ...defaults,
        uploadedBy,
      },
    });
  }

  const data = { employeeName: employee.name };
  for (const field of STANDARD_FIELDS) {
    if (!existing[field]) data[field] = defaults[field];
  }

  return prisma.hrDocument.update({
    where: { userId: employee.id },
    data,
  });
}

export async function ensureProbationCompletionLetter(employee, uploadedBy = "System Auto") {
  if (!employee?.id) return null;
  await ensureEmployeeDocuments(employee, uploadedBy);

  const existing = await prisma.hrDocument.findUnique({
    where: { userId: employee.id },
  });
  if (existing?.completed) return existing;

  return prisma.hrDocument.update({
    where: { userId: employee.id },
    data: {
      employeeName: employee.name,
      completed: filePath(employee.id, "completed-probation"),
      uploadedBy,
    },
  });
}

export async function autoConfirmCompletedProbations() {
  const employees = await prisma.user.findMany({
    where: { probationStatus: "PROBATION", isActive: true },
  });

  const now = new Date();
  const converted = [];

  for (const emp of employees) {
    const joinDate = new Date(emp.joiningDate || emp.createdAt);
    const diffDays = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));
    if (diffDays < 90) continue;

    await prisma.user.update({
      where: { id: emp.id },
      data: {
        probationStatus: "CONFIRMED",
        probationApprovedAt: now,
      },
    });

    const alreadyNotified = await prisma.notification.findFirst({
      where: { relatedId: emp.id, type: "PROBATION_COMPLETED" },
    });
    if (!alreadyNotified) {
      await prisma.notification.create({
        data: {
          targetRoles: ["HR", "ADMIN", "SUPER_ADMIN", "MANAGER"],
          title: "Probation Period Completed",
          message: `${emp.name} (${emp.department || "General"}) completed 3 months probation (${diffDays} days). Status was auto-converted to Regular Employee because HR conversion was pending.`,
          type: "PROBATION_COMPLETED",
          relatedId: emp.id,
        },
      });
    }

    await prisma.notification.create({
      data: {
        userId: emp.id,
        targetRoles: [],
        title: "You are now a Regular Employee",
        message: `Your 3-month probation period is complete. You are now a regular payroll employee. A completed probation period letter has been added to HR Documents.`,
        type: "PROBATION_APPROVED",
        relatedId: emp.id,
      },
    });

    await ensureProbationCompletionLetter(emp, "System Auto");
    converted.push({ id: emp.id, name: emp.name, daysCompleted: diffDays });
  }

  return converted;
}

export function buildDocumentDownloadText(row, field, employee) {
  const col = HR_DOC_COLUMNS.find((c) => c.field === field);
  const label = col?.label || field;
  const name = row?.employeeName || employee?.name || "Employee";
  const lines = [
    "SoftTechCloud HRMS",
    "----------------------------------------",
    `${label} - ${name}`,
    `Employee: ${name}`,
    employee?.email ? `Email: ${employee.email}` : null,
    employee?.department ? `Department: ${employee.department}` : null,
    employee?.designation ? `Designation: ${employee.designation}` : null,
    "----------------------------------------",
    field === "completed"
      ? `This letter confirms that ${name} has successfully completed the 3-month probation period and is now a Regular Employee.`
      : `Official ${label} record for ${name}.`,
    "",
    "Generated from SoftTechCloud HR Document Vault.",
  ].filter(Boolean);
  return lines.join("\n");
}
