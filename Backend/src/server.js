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
import leadRoutes from "./routes/leadRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import { runLeadAutomation } from "./lib/leadAutomation.js";

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

import path from "path";
import leaveRoutes from "./routes/leaveRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import accessRoutes from "./routes/accessRoutes.js";

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
  grantDefaultsToExistingUsers().catch((err) =>
    console.warn("Default module access:", err.message)
  );
  notifyEmployeeMilestones().catch((err) => console.warn("Milestone notify:", err.message));
  sendDueExamReminders().catch((err) => console.warn("Exam SMS reminder:", err.message));
  runLeadAutomation().catch((err) => console.warn("Lead automation:", err.message));
  setInterval(() => {
    notifyEmployeeMilestones().catch((err) => console.warn("Milestone notify:", err.message));
  }, 60 * 60 * 1000);
  setInterval(() => {
    sendDueExamReminders().catch((err) => console.warn("Exam SMS reminder:", err.message));
  }, 5 * 60 * 1000);
  setInterval(() => {
    runLeadAutomation().catch((err) => console.warn("Lead automation:", err.message));
  }, 5 * 60 * 1000);
});

export default app;