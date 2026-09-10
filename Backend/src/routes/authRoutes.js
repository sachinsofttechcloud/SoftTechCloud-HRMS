import express from "express";
import {
  login,
  forgotPassword,
  resetPassword,
  refreshToken,
  getMe,
  updateProfile,
} from "../controllers/authController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * Public Authentication Endpoints
 */
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshToken);

/**
 * Protected Endpoints
 */
router.get("/me", authenticateToken, getMe);
router.patch("/profile", authenticateToken, updateProfile);

export default router;
