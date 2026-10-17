import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import hrRoutes from "./routes/hrRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import holidays from "./routes/holidays.js";
import compensationRoutes from "./routes/compensationRoutes.js";
import payrollRoutes from "./routes/payrollRoutes.js";
import { notifyEmployeeMilestones } from "./lib/employeeMilestones.js";
import { grantDefaultsToExistingUsers } from "./lib/moduleAccess.js";
import { sendDueExamReminders } from "./lib/examReminders.js";
import examRoutes from "./routes/examRoutes.js";
import { syncCompletedExamsToLeads } from "./controllers/examControllers.js";
import leadRoutes from "./routes/leadRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import { runLeadAutomation } from "./lib/leadAutomation.js";
import path from "path";
import leaveRoutes from "./routes/leaveRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import accessRoutes from "./routes/accessRoutes.js";
import prisma from "./lib/prisma.js";
import { DB_DOWN_MESSAGE, isDatabaseConnectionError } from "./lib/dbErrors.js";

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow dev origins
      }
    },
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));


// check the database connect or not
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$connect();
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

//global error handler of database connect or not
app.use((err, req, res, next) => {
  if (isDatabaseConnectionError(err)) {
    return res.status(503).json({ error: DB_DOWN_MESSAGE });
  }

  console.error("Unhandled Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// Static files directory for uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads")));

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/holiday", holidays);
app.use("/api/compensation", compensationRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 SoftTechCloud HRMS API Server`);
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`🔐 Auth API:    http://localhost:${PORT}/api/auth`);
  console.log(`👥 HR API:      http://localhost:${PORT}/api/hr`);
  console.log(`=========================================`);
  prisma.$executeRawUnsafe(`
    ALTER TABLE "exams" DROP CONSTRAINT IF EXISTS "exams_voucher_assist_support_check";
    ALTER TABLE "exams" DROP CONSTRAINT IF EXISTS "exams_voucher_cost_check";
    ALTER TABLE "exams" DROP CONSTRAINT IF EXISTS "exams_lifecycle_status_check";
    ALTER TABLE "exams" ADD CONSTRAINT "exams_lifecycle_status_check" CHECK (lifecycle_status = ANY (ARRAY['SCHEDULED'::text, 'CANCELLED'::text, 'COMPLETED'::text]));
    ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "amount" NUMERIC(10, 2) DEFAULT 0;

    CREATE TABLE IF NOT EXISTS "exam_catalog" (
      "id" SERIAL PRIMARY KEY,
      "exam_code" VARCHAR(255) UNIQUE,
      "exam_name" VARCHAR(255) NOT NULL,
      "technology" VARCHAR(255) NOT NULL,
      "level_tier" VARCHAR(255) DEFAULT 'Associate',
      "actual_cost" NUMERIC(10, 2) DEFAULT 0,
      "voucher_status" VARCHAR(255) DEFAULT 'Available',
      "provider" VARCHAR(255),
      "duration" VARCHAR(255),
      "exam_fee" NUMERIC(10, 2) DEFAULT 0,
      "description" TEXT,
      "status" VARCHAR(255) DEFAULT 'ACTIVE',
      "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE "exam_catalog" ADD COLUMN IF NOT EXISTS "level_tier" VARCHAR(255) DEFAULT 'Associate';
    ALTER TABLE "exam_catalog" ADD COLUMN IF NOT EXISTS "actual_cost" NUMERIC(10, 2) DEFAULT 0;
    ALTER TABLE "exam_catalog" ADD COLUMN IF NOT EXISTS "voucher_status" VARCHAR(255) DEFAULT 'Available';

    INSERT INTO "exam_catalog" ("exam_code", "exam_name", "technology", "level_tier", "actual_cost", "voucher_status", "provider", "duration", "exam_fee", "description")
    SELECT * FROM (VALUES
      ('AWS-SAA-C03', 'AWS Certified Solutions Architect - Associate', 'AWS Cloud', 'Associate', 12500.00, 'Available', 'Amazon Web Services', '130 mins', 12500.00, 'Validates knowledge of designing distributed architectures on AWS.'),
      ('AWS-DVA-C02', 'AWS Certified Developer - Associate', 'AWS Cloud', 'Associate', 12500.00, 'Available', 'Amazon Web Services', '130 mins', 12500.00, 'Demonstrates proficiency in developing and deploying cloud-based applications using AWS.'),
      ('AWS-SAP-C02', 'AWS Certified Solutions Architect - Professional', 'AWS Cloud', 'Professional', 25000.00, 'Included', 'Amazon Web Services', '180 mins', 25000.00, 'Validates advanced technical skills in designing complex AWS solutions.'),
      ('AZ-900', 'Microsoft Azure Fundamentals', 'Microsoft Azure', 'Fundamental', 8000.00, 'Available', 'Microsoft', '60 mins', 8000.00, 'Foundational level knowledge of cloud services and Microsoft Azure.'),
      ('AZ-104', 'Microsoft Azure Administrator', 'Microsoft Azure', 'Associate', 14000.00, 'Available', 'Microsoft', '120 mins', 14000.00, 'Managing Azure identities, governance, storage, compute, and virtual networks.'),
      ('AZ-305', 'Designing Microsoft Azure Infrastructure Solutions', 'Microsoft Azure', 'Expert', 14000.00, 'Not Available', 'Microsoft', '120 mins', 14000.00, 'Expert-level certification for Azure solutions architecture.'),
      ('GCP-ACE', 'Google Associate Cloud Engineer', 'Google Cloud (GCP)', 'Associate', 10500.00, 'Available', 'Google Cloud', '120 mins', 10500.00, 'Deploys applications, monitors operations, and manages enterprise solutions.'),
      ('GCP-PCA', 'Google Professional Cloud Architect', 'Google Cloud (GCP)', 'Professional', 16500.00, 'Included', 'Google Cloud', '120 mins', 16500.00, 'Assesses organizations to leverage Google Cloud technologies.'),
      ('CCNA-200-301', 'Cisco Certified Network Associate (CCNA)', 'Cisco Networking', 'Associate', 24000.00, 'Available', 'Cisco Systems', '120 mins', 24000.00, 'Covers networking fundamentals, IP services, security fundamentals, and automation.'),
      ('CKA', 'Certified Kubernetes Administrator', 'DevOps & Containers', 'Professional', 32000.00, 'Not Available', 'Linux Foundation', '120 mins', 32000.00, 'Demonstrates competency in Kubernetes administration, configuration, and troubleshooting.')
    ) AS v("exam_code", "exam_name", "technology", "level_tier", "actual_cost", "voucher_status", "provider", "duration", "exam_fee", "description")
    WHERE NOT EXISTS (SELECT 1 FROM "exam_catalog" LIMIT 1);
  `).then(() => {
    console.log("✅ Verified exams and exam_catalog table constraints and columns.");
  }).catch((err) => console.warn("Drop/update constraint error:", err.message));
  notifyEmployeeMilestones().catch((err) => console.warn("Milestone notify:", err.message));
  sendDueExamReminders().catch((err) => console.warn("Exam SMS reminder:", err.message));
  runLeadAutomation().catch((err) => console.warn("Lead automation:", err.message));
  syncCompletedExamsToLeads().catch((err) => console.warn("Sync completed exams to leads:", err.message));
  setInterval(() => {
    notifyEmployeeMilestones().catch((err) => console.warn("Milestone notify:", err.message));
  }, 60 * 60 * 1000);
  setInterval(() => {
    sendDueExamReminders().catch((err) => console.warn("Exam SMS reminder:", err.message));
  }, 5 * 60 * 1000);
  setInterval(() => {
    runLeadAutomation().catch((err) => console.warn("Lead automation:", err.message));
  }, 5 * 60 * 1000);
  setInterval(() => {
    syncCompletedExamsToLeads().catch((err) => console.warn("Sync completed exams to leads:", err.message));
  }, 5 * 60 * 1000);
});

export default app;