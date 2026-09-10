import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

/**
 * Middleware to verify JWT Access Token from Authorization header
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ error: "Access denied. Authentication token is missing." });
  }

  try {
    const secret = process.env.JWT_ACCESS_SECRET || "softtechcloud_hrms_access_super_secret_token_2026";
    const decoded = jwt.verify(token, secret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        designation: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User associated with token no longer exists." });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "User account is deactivated." });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token has expired. Please refresh your session.", code: "TOKEN_EXPIRED" });
    }
    return res.status(403).json({ error: "Invalid token." });
  }
};

/**
 * Middleware to restrict access based on Role
 * @param  {...string} allowedRoles (e.g. 'ADMIN', 'HR', 'SUPER_ADMIN')
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "User is not authenticated." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of the following roles: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
};
