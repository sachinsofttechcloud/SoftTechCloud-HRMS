import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { sendOnboardingWelcomeEmail } from "../lib/mailer.js";
import { joiningDateFromYmd, notifyEmployeeMilestones, saveUserBirthDate } from "../lib/employeeMilestones.js";
import { grantDefaultModuleAccess } from "../lib/moduleAccess.js";
import { saveBase64Media } from "../lib/fileStorage.js";
import {
  autoConfirmCompletedProbations,
  buildDocumentDownloadText,
  ensureEmployeeDocuments,
  ensureProbationCompletionLetter,
  fieldFromCategory,
  getCustomDocumentById,
  HR_DOC_COLUMNS,
  isPdfDataUrl,
  listCustomDocuments,
  saveCustomDocument,
  serializeHrDocument,
} from "../lib/hrDocs.js";

const generateTempPassword = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const special = "!@#$%&*";

  let pass = "";
  pass += upper[Math.floor(Math.random() * upper.length)];
  pass += numbers[Math.floor(Math.random() * numbers.length)];
  pass += special[Math.floor(Math.random() * special.length)];
  
  const all = chars + upper + numbers + special;
  for (let i = 0; i < 7; i++) {
    pass += all[Math.floor(Math.random() * all.length)];
  }
  return pass;
};

function parseStcNumber(employeeId) {
  const match = String(employeeId || "")
    .trim()
    .toUpperCase()
    .match(/^STC-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

export async function resolveNextEmployeeId() {
  const rows = await prisma.user.findMany({
    where: { employeeId: { not: null } },
    select: { employeeId: true },
  });

  let max = 0;
  for (const row of rows) {
    const n = parseStcNumber(row.employeeId);
    if (n != null && n > max) max = n;
  }

  return `STC-${max + 1}`;
}

async function allocateEmployeeId(preferred) {
  const requested = preferred ? String(preferred).trim().toUpperCase() : "";
  if (requested) {
    const taken = await prisma.user.findUnique({ where: { employeeId: requested } });
    if (!taken) return requested;
  }

  let nextId = await resolveNextEmployeeId();
  for (let i = 0; i < 50; i++) {
    const taken = await prisma.user.findUnique({ where: { employeeId: nextId } });
    if (!taken) return nextId;
    const n = parseStcNumber(nextId) || 0;
    nextId = `STC-${n + 1}`;
  }
  throw new Error("Could not allocate a unique Employee ID.");
}

/**
 * GET /api/hr/next-employee-id
 */
export const getNextEmployeeId = async (req, res) => {
  try {
    const employeeId = await resolveNextEmployeeId();
    return res.status(200).json({ employeeId });
  } catch (error) {
    console.error("Next Employee ID Error:", error);
    return res.status(500).json({ error: "Failed to generate Employee ID." });
  }
};

/**
 * POST /api/hr/onboard
 * HR / Admin endpoint to onboard a new employee
 */
export const onboardEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      department,
      designation,
      phone,
      bloodGroup,
      aadharCard,
      panCard,
      passportPhoto,
      reportingManager,
      address,
      avatar,
      employeeId,
      birthDate,
      joiningDate,
      degree,
      instituteName,
      passingYear,
      certificate,
      accountNumber,
      accountType,
      ifscCode,
      branchName,
      isActive = true,
    } = req.body;

    // 1. Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: "Name and work email are required." });
    }
    if (!degree || !instituteName || !passingYear) {
      return res.status(400).json({ error: "Education details are required." });
    }
    if (!accountNumber || !accountType || !ifscCode || !branchName) {
      return res.status(400).json({ error: "Bank details are required." });
    }
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(birthDate).slice(0, 10))) {
      return res.status(400).json({ error: "Birth date is required (YYYY-MM-DD)." });
    }
    const parsedJoiningDate = joiningDateFromYmd(joiningDate);
    if (!parsedJoiningDate) {
      return res.status(400).json({ error: "Joining date is required (YYYY-MM-DD)." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify company domain
    if (!normalizedEmail.endsWith("@softtechcloud.com")) {
      return res.status(400).json({
        error: "Only corporate @softtechcloud.com email addresses are permitted for onboarding.",
      });
    }

    // 2. Check if email already registered
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return res.status(409).json({
        error: `An employee with email '${normalizedEmail}' already exists in the system.`,
      });
    }

    let normalizedEmployeeId;
    try {
      normalizedEmployeeId = await allocateEmployeeId(employeeId);
    } catch (allocError) {
      return res.status(409).json({ error: allocError.message || "Employee ID is already assigned." });
    }

    // 3. Resolve Password & Process High-Quality Media Files
    const initialPassword = password && password.trim().length >= 8 ? password.trim() : generateTempPassword();
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    // Convert base64 uploaded files to high quality disk files and store short URL paths
    const rawPhoto = (passportPhoto || avatar || "").trim();
    const savedPhotoUrl = rawPhoto ? saveBase64Media(rawPhoto, "photos", `passport_${normalizedEmployeeId}`) : null;

    const rawCert = (certificate || "").trim();
    const savedCertUrl = rawCert ? saveBase64Media(rawCert, "certificates", `cert_${normalizedEmployeeId}`) : null;

    // 4. Create Employee Record in DB
    const newEmployee = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "EMPLOYEE",
        employeeId: normalizedEmployeeId,
        department: department?.trim() || null,
        designation: designation?.trim() || null,
        phone: phone?.trim() || null,
        bloodGroup: bloodGroup?.trim() || null,
        aadharCard: aadharCard?.trim() || null,
        panCard: panCard?.trim() || null,
        passportPhoto: savedPhotoUrl,
        reportingManager: reportingManager?.trim() || null,
        address: address?.trim() || null,
        avatar: savedPhotoUrl,
        joiningDate: parsedJoiningDate,
        isActive: Boolean(isActive),
        education: {
          create: {
            degree: degree.trim(),
            instituteName: instituteName.trim(),
            passingYear: String(passingYear).trim(),
            certificate: savedCertUrl,
          },
        },
        bankDetail: {
          create: {
            accountNumber: accountNumber.trim(),
            accountType: accountType.trim(),
            ifscCode: ifscCode.trim().toUpperCase(),
            branchName: branchName.trim(),
          },
        },
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        department: true,
        designation: true,
        phone: true,
        bloodGroup: true,
        aadharCard: true,
        panCard: true,
        passportPhoto: true,
        reportingManager: true,
        address: true,
        isActive: true,
        createdAt: true,
        education: true,
        bankDetail: {
          select: {
            accountType: true,
            ifscCode: true,
            branchName: true,
            accountNumber: true,
          },
        },
      },
    });

    await prisma.$executeRaw`
      UPDATE educations SET employee_id = ${normalizedEmployeeId} WHERE user_id = ${newEmployee.id}
    `;
    await prisma.$executeRaw`
      UPDATE bank_details SET employee_id = ${normalizedEmployeeId} WHERE user_id = ${newEmployee.id}
    `;
    await saveUserBirthDate(newEmployee.id, birthDate);
    await grantDefaultModuleAccess(newEmployee.id, req.user?.id || null);
    newEmployee.birthDate = String(birthDate).slice(0, 10);
    newEmployee.joiningDate = String(joiningDate).slice(0, 10);
    notifyEmployeeMilestones().catch((err) => console.warn("Milestone notify:", err.message));

    console.log(`[HR ONBOARDING] Onboarded new employee: ${newEmployee.email} | Initial Temp Password: ${initialPassword}`);

    await ensureEmployeeDocuments(newEmployee, req.user?.name || "HR");

    // Send welcome email with login credentials via Nodemailer
    await sendOnboardingWelcomeEmail({
      to: newEmployee.email,
      name: newEmployee.name,
      temporaryPassword: initialPassword,
      role: newEmployee.role,
      department: newEmployee.department,
    });

    return res.status(201).json({
      message: "Employee onboarded successfully. Login credentials ready.",
      employee: newEmployee,
      credentials: {
        email: newEmployee.email,
        temporaryPassword: initialPassword,
      },
      webmailUrl: "https://sh024.webhostingservices.com:2096/cpsess8337035536/3rdparty/roundcube/?_task=mail&_mbox=INBOX",
    });
  } catch (error) {
    console.error("Onboarding Error:", error);
    return res.status(500).json({ error: "Failed to onboard employee." });
  }
};

/**
 * GET /api/hr/employees
 * List all onboarded employees
 */
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        department: true,
        designation: true,
        phone: true,
        bloodGroup: true,
        aadharCard: true,
        panCard: true,
        passportPhoto: true,
        reportingManager: true,
        address: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ employees });
  } catch (error) {
    console.error("Fetch Employees Error:", error);
    return res.status(500).json({ error: "Failed to fetch employees." });
  }
};

/**
 * PATCH /api/hr/employee/:id/status
 * Toggle employee active/deactive status
 */
export const toggleEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive must be true or false." });
    }

    if (id === req.user.id && !isActive) {
      return res.status(400).json({ error: "You cannot deactivate your own account." });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, name: true, email: true, isActive: true },
    });

    return res.status(200).json({
      message: `Employee status updated to ${updated.isActive ? "Active" : "Inactive"}.`,
      employee: updated,
    });
  } catch (error) {
    console.error("Update Status Error:", error);
    return res.status(500).json({ error: "Failed to update employee status." });
  }
};

/**
 * GET /api/hr/probation-alerts
 * Check employees for 3-month probation period completion
 */
export const getProbationAlerts = async (req, res) => {
  try {
    await autoConfirmCompletedProbations();

    const privileged = ["HR", "ADMIN", "SUPER_ADMIN", "MANAGER"].includes(req.user.role);
    const employees = await prisma.user.findMany({
      where: privileged ? { isActive: true } : { id: req.user.id },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        department: true,
        designation: true,
        role: true,
        joiningDate: true,
        probationStatus: true,
        probationApprovedAt: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    const now = new Date();
    const result = [];

    for (const emp of employees) {
      const joinDate = new Date(emp.joiningDate || emp.createdAt);
      const diffMs = now - joinDate;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const isThreeMonthsCompleted = diffDays >= 90;
      const statusLabel =
        emp.probationStatus === "CONFIRMED"
          ? "Regular Employee"
          : isThreeMonthsCompleted
          ? "Probation Completed (3 Months)"
          : "Probation Period Ongoing";

      result.push({
        ...emp,
        joiningDateFormatted: joinDate.toISOString().split("T")[0],
        daysCompleted: diffDays,
        isThreeMonthsCompleted,
        probationStatus: emp.probationStatus || "PROBATION",
        statusLabel,
      });
    }

    return res.status(200).json({ probationEmployees: result });
  } catch (error) {
    console.error("Get Probation Alerts Error:", error);
    return res.status(500).json({ error: "Failed to check probation statuses." });
  }
};

/**
 * POST /api/hr/approve-probation
 * HR / Admin approves probation completion -> converts to Regular Payroll Employee
 */
export const approveProbation = async (req, res) => {
  try {
    const { userId } = req.body;
    const approverName = req.user.name || "HR Manager";

    if (!userId) {
      return res.status(400).json({ error: "userId is required." });
    }

    const employee = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }

    const updatedEmployee = await prisma.user.update({
      where: { id: userId },
      data: {
        probationStatus: "CONFIRMED",
        probationApprovedAt: new Date(),
      },
    });

    // 1. Send notification to Employee
    await prisma.notification.create({
      data: {
        userId,
        targetRoles: [],
        title: "Probation Period Successfully Completed!",
        message: `Congratulations ${employee.name}! Your 3-month probation period has been approved by ${approverName}. You are now a full regular payroll employee.`,
        type: "PROBATION_APPROVED",
        relatedId: userId,
      },
    });

    await ensureEmployeeDocuments(employee, approverName);
    await ensureProbationCompletionLetter(employee, approverName);

    return res.status(200).json({
      message: `Probation completed and approved for ${employee.name}. Employee converted to regular payroll status.`,
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("Approve Probation Error:", error);
    return res.status(500).json({ error: "Failed to approve probation period." });
  }
};

/**
 * GET /api/hr/documents
 * One row per employee: name, user id, Aadhaar, PAN, joining letter, Form 16, probation, completed.
 */
export const getHrDocuments = async (req, res) => {
  try {
    await autoConfirmCompletedProbations();

    const userId = req.user.id;
    const role = req.user.role;
    const isHrOrAdmin = ["HR", "ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role);

    if (isHrOrAdmin) {
      const employees = await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          designation: true,
          probationStatus: true,
        },
      });
      for (const emp of employees) {
        await ensureEmployeeDocuments(emp);
        if (emp.probationStatus === "CONFIRMED") {
          await ensureProbationCompletionLetter(emp);
        }
      }
    } else {
      const me = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          designation: true,
          probationStatus: true,
        },
      });
      if (me) {
        await ensureEmployeeDocuments(me);
        if (me.probationStatus === "CONFIRMED") {
          await ensureProbationCompletionLetter(me);
        }
      }
    }

    const rows = await prisma.hrDocument.findMany({
      where: isHrOrAdmin ? {} : { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            designation: true,
            role: true,
          },
        },
      },
      orderBy: { employeeName: "asc" },
    });

    const customRows = await listCustomDocuments(rows.map((row) => row.userId));
    const customByUser = new Map();
    for (const doc of customRows) {
      const key = doc.user_id || doc.userId;
      if (!customByUser.has(key)) customByUser.set(key, []);
      customByUser.get(key).push(doc);
    }

    const records = rows.map((row) =>
      serializeHrDocument(
        row,
        customByUser.get(row.userId) || []
      )
    );
    const documents = records.flatMap((record) => record.documents.filter((d) => d.available));

    return res.status(200).json({
      records,
      documents,
      scope: isHrOrAdmin ? "all" : "self",
    });
  } catch (error) {
    console.error("Get HR Documents Error:", error);
    return res.status(500).json({ error: "Failed to fetch HR documents." });
  }
};

export const getHrDocumentById = async (req, res) => {
  try {
    const { id, field } = req.params;
    const allowed = HR_DOC_COLUMNS.some((col) => col.field === field);
    if (!allowed) {
      return res.status(400).json({ error: "Invalid document field." });
    }

    const row = await prisma.hrDocument.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            designation: true,
            role: true,
          },
        },
      },
    });
    if (!row) return res.status(404).json({ error: "Employee document record not found." });
    if (!row[field]) return res.status(404).json({ error: "This document is not uploaded yet." });

    const privileged = ["HR", "ADMIN", "SUPER_ADMIN", "MANAGER"].includes(req.user.role);
    if (!privileged && row.userId !== req.user.id) {
      return res.status(403).json({ error: "You can only download your own documents." });
    }

    const col = HR_DOC_COLUMNS.find((c) => c.field === field);
    const name = (row.employeeName || "Employee").replace(/\s+/g, "_");
    const stored = row[field];
    const isPdf = isPdfDataUrl(stored);

    return res.status(200).json({
      record: serializeHrDocument(row),
      fileData: isPdf ? stored : null,
      downloadText: isPdf ? null : buildDocumentDownloadText(row, field, row.user),
      fileName: isPdf
        ? `${(col.label || "Document").replace(/\s+/g, "_")}_${name}.pdf`
        : `${col.label.replace(/\s+/g, "_")}_${name}.txt`,
    });
  } catch (error) {
    console.error("Get HR Document Error:", error);
    return res.status(500).json({ error: "Failed to fetch document." });
  }
};

/**
 * POST /api/hr/upload-document
 * Upload a PDF for an employee identified by name.
 */
export const uploadHrDocument = async (req, res) => {
  try {
    const {
      employeeName,
      userId,
      title,
      category,
      fileData,
      fileName,
    } = req.body;
    const uploaderName = req.user.name || "HR Admin";
    const documentTitle = String(title || category || "").trim();

    if (!documentTitle) {
      return res.status(400).json({ error: "Document title is required." });
    }
    if (!fileData) {
      return res.status(400).json({ error: "Please upload a PDF file." });
    }
    if (!isPdfDataUrl(fileData) && !/\.pdf$/i.test(fileName || "")) {
      return res.status(400).json({ error: "Only PDF files are allowed." });
    }

    const lookup = String(employeeName || "").trim();
    if (!lookup && !userId) {
      return res.status(400).json({ error: "Enter the employee name." });
    }

    let employee = null;
    if (userId) {
      employee = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, employeeId: true },
      });
    }
    if (!employee && lookup) {
      const matches = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { equals: lookup, mode: "insensitive" } },
            { employeeId: { equals: lookup, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, employeeId: true },
      });
      if (matches.length > 1) {
        return res.status(409).json({ error: "Multiple employees match that name. Enter the full name or employee ID." });
      }
      employee = matches[0] || null;
    }
    if (!employee) {
      return res.status(404).json({ error: "Employee not found. Enter the exact employee name." });
    }

    const pdfPayload = String(fileData).startsWith("data:")
      ? fileData
      : `data:application/pdf;base64,${fileData}`;
    const storedName = fileName && /\.pdf$/i.test(fileName) ? fileName : `${documentTitle.replace(/\s+/g, "_")}.pdf`;
    const field = fieldFromCategory(documentTitle);

    if (field) {
      await ensureEmployeeDocuments(employee, uploaderName);
      const updated = await prisma.hrDocument.update({
        where: { userId: employee.id },
        data: {
          employeeName: employee.name,
          [field]: pdfPayload,
          uploadedBy: uploaderName,
        },
        include: {
          user: { select: { id: true, name: true, email: true, department: true, designation: true } },
        },
      });
      return res.status(201).json({
        message: `${documentTitle} uploaded for ${employee.name}.`,
        record: serializeHrDocument(updated),
      });
    }

    await ensureEmployeeDocuments(employee, uploaderName);
    await saveCustomDocument({
      userId: employee.id,
      title: documentTitle,
      fileName: storedName,
      fileData: pdfPayload,
      uploadedBy: uploaderName,
    });

    const row = await prisma.hrDocument.findUnique({
      where: { userId: employee.id },
      include: {
        user: { select: { id: true, name: true, email: true, department: true, designation: true } },
      },
    });
    const extras = await listCustomDocuments([employee.id]);

    return res.status(201).json({
      message: `${documentTitle} uploaded for ${employee.name}.`,
      record: serializeHrDocument(row, extras),
    });
  } catch (error) {
    console.error("Upload HR Document Error:", error);
    return res.status(500).json({ error: "Failed to upload document." });
  }
};

export const getCustomHrDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getCustomDocumentById(id);
    if (!row) return res.status(404).json({ error: "Document not found." });

    const privileged = ["HR", "ADMIN", "SUPER_ADMIN", "MANAGER"].includes(req.user.role);
    if (!privileged && row.user_id !== req.user.id) {
      return res.status(403).json({ error: "You can only download your own documents." });
    }

    return res.status(200).json({
      fileData: row.file_data,
      fileName: row.file_name || `${String(row.title || "Document").replace(/\s+/g, "_")}.pdf`,
    });
  } catch (error) {
    console.error("Get Custom HR Document Error:", error);
    return res.status(500).json({ error: "Failed to fetch document." });
  }
};


