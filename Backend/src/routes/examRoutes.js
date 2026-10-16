import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import {
  getUpcomingExams,
  getActiveExams,
  getTodayExams,
  getCaseRaiseExams,
  getPastExams,
  getPendingPaymentExams,
  getCompletedExams,
  getExamById,
  createExam,
  previewBulkExams,
  createBulkExams,
  markExamAttendance,
  updateExam,
  deleteExam,
  updateExamPayment,
  cancelExam,
  rescheduleExam,
  completeExam,
  caseRaiseExam,
  lookupCandidateByMobile,
  getExamCatalog,
  createExamCatalogItem,
  updateExamCatalogItem,
  deleteExamCatalogItem,
} from "../controllers/examControllers.js";

const router = express.Router();

router.get("/upcoming-exams", authenticateToken, getUpcomingExams);
router.get("/active-exams", authenticateToken, getActiveExams);
router.get("/today-exams", authenticateToken, getTodayExams);
router.get("/case-raise-exams", authenticateToken, getCaseRaiseExams);
router.get("/pending-payment", authenticateToken, getPendingPaymentExams);
router.get("/past-exams", authenticateToken, getPastExams);
router.get("/completed-exams", authenticateToken, getCompletedExams);
router.get("/catalog", authenticateToken, getExamCatalog);
router.post("/catalog", authenticateToken, createExamCatalogItem);
router.put("/catalog/:id", authenticateToken, updateExamCatalogItem);
router.delete("/catalog/:id", authenticateToken, deleteExamCatalogItem);
router.get("/candidate-lookup", authenticateToken, lookupCandidateByMobile);
router.get("/:id", authenticateToken, getExamById);

router.post("/edit-exams", authenticateToken, createExam);
router.post("/bulk/preview", authenticateToken, previewBulkExams);
router.post("/bulk", authenticateToken, createBulkExams);
router.patch("/:id/payment", authenticateToken, updateExamPayment);
router.patch("/:id/complete", authenticateToken, completeExam);
router.patch("/:id/case-raise", authenticateToken, caseRaiseExam);
router.patch("/:id/cancel", authenticateToken, cancelExam);
router.patch("/:id/reschedule", authenticateToken, rescheduleExam);
router.put("/:id", authenticateToken, updateExam);
router.patch("/:id/attendance", authenticateToken, markExamAttendance);
router.delete("/:id", authenticateToken, deleteExam);

export default router;