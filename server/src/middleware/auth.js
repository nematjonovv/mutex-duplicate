import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { logger } from "../config/logger.js";

// Verify JWT token
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    // Check if user has been deleted
    if (user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: "User account has been deleted",
      });
    }

    // Update last active timestamp
    await user.updateLastActive();

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error("Token verification error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Token verification failed",
    });
  }
};

// Check if user has specific role
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions for this role",
      });
    }

    next();
  };
};

// Check if user has specific permission
export const requirePermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userPermissions = req.user.permissions || [];
    const requiredPermissions = Array.isArray(permissions)
      ? permissions
      : [permissions];

    // Director has all permissions
    if (req.user.role === "DIRECTOR") {
      return next();
    }

    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

// Check if user has access to specific route
export const requireRouteAccess = (route) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userPermissions = req.user.permissions || [];

    // Director has access to all routes
    if (req.user.role === "DIRECTOR") {
      return next();
    }

    // Check if user has access to the specific route
    const hasAccess = userPermissions.some((permission) => {
      // Exact match
      if (permission === route) return true;

      // Wildcard match (e.g., "/users/*" matches "/users/123")
      if (permission.endsWith("/*")) {
        const baseRoute = permission.slice(0, -1);
        return route.startsWith(baseRoute);
      }

      return false;
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this route",
      });
    }

    next();
  };
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (user && user.isActive && !user.deletedAt) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Don't fail on token errors for optional auth
    next();
  }
};

// Generate JWT tokens
export const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      userId: user._id,
      role: user.role,
      permissions: user.permissions,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "12h" }
  );

  const refreshToken = jwt.sign(
    {
      userId: user._id,
      type: "refresh",
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );

  return { accessToken, refreshToken };
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    return decoded;
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
};

// Audit logging middleware
export const auditLog = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      // Log the action after response is sent
      if (req.user) {
        logger.info("Audit Log", {
          action,
          userId: req.user._id,
          userRole: req.user.role,
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          statusCode: res.statusCode,
          timestamp: new Date(),
        });
      }

      originalSend.call(this, data);
    };

    next();
  };
};
