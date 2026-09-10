import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware.js";
import {
  getSalarySlips,
  getSalarySlipById,
  upsertSalarySlip,
  uploadSalarySlip,
} from "../controllers/payrollController.js";

const router = Router();
router.use(authenticateToken);

router.get("/slips", getSalarySlips);
router.post("/slips/upload", authorizeRoles("HR", "ADMIN", "SUPER_ADMIN"), uploadSalarySlip);
router.get("/slips/:id", getSalarySlipById);
router.post("/slips", authorizeRoles("HR", "ADMIN", "SUPER_ADMIN"), upsertSalarySlip);

export default router;
