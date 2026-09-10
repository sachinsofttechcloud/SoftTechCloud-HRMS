import { Router } from "express";
import {
  punchAttendance,
  getMyMonthlyAttendance,
  getAllAttendanceForAdmin,
  adminUpdateAttendance,
  importAttendance,
} from "../controllers/attendanceController.js";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware.js";

const router = Router();

// Require authentication for all attendance endpoints
router.use(authenticateToken);

// Employee attendance routes
router.post("/punch", punchAttendance);
router.get("/my-monthly", getMyMonthlyAttendance);

// Admin / HR / Manager attendance management routes
router.get("/all", authorizeRoles("HR", "ADMIN", "SUPER_ADMIN", "MANAGER"), getAllAttendanceForAdmin);
router.put("/admin-update", authorizeRoles("HR", "ADMIN", "SUPER_ADMIN"), adminUpdateAttendance);
router.post("/import", authorizeRoles("HR", "ADMIN", "SUPER_ADMIN", "MANAGER"), importAttendance);

export default router;
