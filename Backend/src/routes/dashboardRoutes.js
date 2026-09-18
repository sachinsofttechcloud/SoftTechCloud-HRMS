import express from "express";
import {
  createDashboardRecord,
  deleteDashboardRecord,
  getDashboard,
  updateDashboardRecord,
} from "../controllers/dashboardControllers.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);
router.get("/", getDashboard);
router.post("/:resource", createDashboardRecord);
router.patch("/:resource/:id", updateDashboardRecord);
router.delete("/:resource/:id", deleteDashboardRecord);

export default router;
