import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import {
  getUpcomingExams,
  getActiveExams,
  getPastExams,
  getCompletedExams,
  createExam,
  previewBulkExams,
  createBulkExams,
  markExamAttendance,
  updateExam,
  deleteExam,
  updateExamPayment,
  cancelExam,
  rescheduleExam,
} from "../controllers/examControllers.js"

const router = express.Router();

router.get("/upcoming-exams", authenticateToken, getUpcomingExams);
router.get("/active-exams", authenticateToken, getActiveExams);
router.get("/past-exams", authenticateToken, getPastExams);
router.get("/completed-exams", authenticateToken, getCompletedExams);

router.post("/edit-exams", authenticateToken, createExam);
router.post("/bulk/preview", authenticateToken, previewBulkExams);
router.post("/bulk", authenticateToken, createBulkExams);
router.patch("/:id/payment", authenticateToken, updateExamPayment);
router.patch("/:id/cancel", authenticateToken, cancelExam);
router.patch("/:id/reschedule", authenticateToken, rescheduleExam);
router.put("/:id", authenticateToken, updateExam);
router.patch("/:id/attendance", authenticateToken, markExamAttendance);
router.delete("/:id", authenticateToken, deleteExam);

export default router;