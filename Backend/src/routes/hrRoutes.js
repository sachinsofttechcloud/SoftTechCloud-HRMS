import express from "express";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware.js";
import {
  onboardEmployee,
  getAllEmployees,
  toggleEmployeeStatus,
  getProbationAlerts,
  approveProbation,
  getHrDocuments,
  getHrDocumentById,
  getCustomHrDocument,
  uploadHrDocument,
  getNextEmployeeId,
} from "../controllers/hrController.js";

const router = express.Router();

router.post("/onboard", onboardEmployee);
router.get("/next-employee-id", getNextEmployeeId);
router.get("/employees", getAllEmployees);
router.patch("/employee/:id/status", toggleEmployeeStatus);

// Authenticated probation & HR document endpoints
router.get("/probation-alerts", authenticateToken, getProbationAlerts);
router.post(
  "/approve-probation",
  authenticateToken,
  authorizeRoles("HR", "ADMIN", "SUPER_ADMIN", "MANAGER"),
  approveProbation
);
router.get("/documents", authenticateToken, getHrDocuments);
router.get("/documents/custom/:id", authenticateToken, getCustomHrDocument);
router.get("/documents/:id/:field", authenticateToken, getHrDocumentById);
router.post(
  "/upload-document",
  authenticateToken,
  authorizeRoles("HR", "ADMIN", "SUPER_ADMIN", "MANAGER"),
  uploadHrDocument
);

export default router;
