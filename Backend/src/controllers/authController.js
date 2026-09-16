import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { attachUserDates, notifyEmployeeMilestones } from "../lib/employeeMilestones.js";
import { attachUserModuleAccess } from "../lib/moduleAccess.js";

const PROFILE_SELECT = {
  id: true,
  employeeId: true,
  name: true,
  email: true,
  role: true,
  department: true,
  designation: true,
  phone: true,
  avatar: true,
  bloodGroup: true,
  aadharCard: true,
  panCard: true,
  passportPhoto: true,
  reportingManager: true,
  address: true,
  isActive: true,
  createdAt: true,
  joiningDate: true,
  education: {
    select: {
      userId: true,
      degree: true,
      instituteName: true,
      passingYear: true,
      certificate: true,
    },
  },
  bankDetail: {
    select: {
      userId: true,
      accountNumber: true,
      accountType: true,
      ifscCode: true,
      branchName: true,
    },
  },
};
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "softtechcloud_hrms_access_super_secret_token_2026";
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "2h";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "softtechcloud_hrms_refresh_super_secret_token_2026";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

/**
 * Helper to generate JWT tokens
 */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_ACCESS_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

/**
 * POST /api/auth/login
 * Authenticates onboarded employee
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Fetch user from DB
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        education: true,
        bankDetail: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // 2. Check if employee is active / onboarded
    if (!user.isActive) {
      return res.status(403).json({
        error: "Your account is deactivated. Please contact HR administration.",
      });
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // 4. Generate Tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // 5. Store RefreshToken in DB (7 days expiry)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    await attachUserDates(user);
    await attachUserModuleAccess(user);

    // 6. Return response
    return res.status(200).json({
      message: "Login successful.",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
        phone: user.phone,
        bloodGroup: user.bloodGroup,
        aadharCard: user.aadharCard,
        panCard: user.panCard,
        avatar: user.avatar,
        passportPhoto: user.passportPhoto,
        reportingManager: user.reportingManager,
        address: user.address,
        birthDate: user.birthDate || null,
        joiningDate: user.joiningDate || null,
        yearsCompleted: user.yearsCompleted ?? 0,
        workAnniversaryLabel: user.workAnniversaryLabel || "Less than 1 year",
        education: user.education,
        bankDetail: user.bankDetail,
        allowedModules: user.allowedModules || [],
        hasFullModuleAccess: Boolean(user.hasFullModuleAccess),
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * POST /api/auth/forgot-password
 * Generates password reset token and prepares reset instructions
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Work email is required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Security practice: do not expose whether email exists
    if (!user || !user.isActive) {
      return res.status(200).json({
        message: "If an active account exists with this email, a password reset link has been sent to your work inbox.",
      });
    }

    // Generate random secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    // Invalidate prior unused tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Save token in DB
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    console.log(`[AUTH] Password reset link for ${user.email}: ${resetUrl}`);

    // Send reset instructions email to user's webmail inbox using Nodemailer
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name || "Employee",
      resetUrl,
      token,
    });

    return res.status(200).json({
      message: "Password reset link sent to your work email.",
      webmailUrl: "https://sh024.webhostingservices.com:2096/cpsess8337035536/3rdparty/roundcube/?_task=mail&_mbox=INBOX",
      // Include token in dev mode for easy testing if needed
      ...(process.env.NODE_ENV !== "production" ? { debugResetUrl: resetUrl, token } : {}),
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * POST /api/auth/reset-password
 * Verifies token and updates employee password
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required." });
    }

    if (newPassword.length < 10) {
      return res.status(400).json({ error: "Password must be at least 10 characters long." });
    }

    // Find valid token
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.used || new Date() > resetRecord.expiresAt) {
      return res.status(400).json({
        error: "Password reset link is invalid or has expired. Please request a new one.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and mark token as used in transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
      // Invalidate all existing refresh tokens for security
      prisma.refreshToken.deleteMany({
        where: { userId: resetRecord.userId },
      }),
    ]);

    return res.status(200).json({
      message: "Password updated successfully. You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * POST /api/auth/refresh-token
 * Issues a new access token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Refresh token is required." });
    }

    // Verify token exists in database
    const savedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!savedToken || new Date() > savedToken.expiresAt) {
      if (savedToken) {
        await prisma.refreshToken.delete({ where: { id: savedToken.id } });
      }
      return res.status(401).json({ error: "Refresh token is invalid or expired." });
    }

    // Verify JWT signature
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    const user = savedToken.user;

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is inactive." });
    }

    // Issue new access token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_ACCESS_SECRET,
      { expiresIn: JWT_ACCESS_EXPIRES_IN }
    );

    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Refresh Token Error:", error);
    return res.status(401).json({ error: "Invalid refresh token." });
  }
};

/**
 * GET /api/auth/me
 * Returns authenticated employee profile
 */
export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: PROFILE_SELECT,
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    await attachUserDates(user);
    await attachUserModuleAccess(user);
    notifyEmployeeMilestones().catch((err) => console.warn("Milestone notify:", err.message));

    return res.status(200).json({ user });
  } catch (error) {
    console.error("GetMe Error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * PATCH /api/auth/profile
 * Allows logged-in employee to update mobile number and address
 */
export const updateProfile = async (req, res) => {
  try {
    const { phone, address } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(phone !== undefined ? { phone: phone ? phone.trim() : null } : {}),
        ...(address !== undefined ? { address: address ? address.trim() : null } : {}),
      },
      select: PROFILE_SELECT,
    });

    await attachUserDates(updatedUser);
    await attachUserModuleAccess(updatedUser);

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({ error: "Failed to update profile." });
  }
};
