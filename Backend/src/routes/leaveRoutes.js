import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import {
  applyLeave,
  getMyLeaveBalance,
  getLeaveRequests,
  approveLeave,
} from "../controllers/leaveController.js";

const router = express.Router();

router.use(authenticateToken);

router.post("/apply", applyLeave);
router.get("/my-balance", getMyLeaveBalance);
router.get("/requests", getLeaveRequests);
router.patch("/:id/approve", approveLeave);

export default router;
