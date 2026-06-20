import express from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserPermissions,
  updateUserPermissions,
  getActiveUsersCount,
  getUsersByRole,
  updateLastWrappedBatch,
} from "../controllers/userController.js";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get all users (Director, Manager only)
router.get(
  "/",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("GET_USERS"),
  getUsers
);

// Create user (Director, Manager only)
router.post(
  "/",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("CREATE_USER"),
  createUser
);

// Update last wrapped batch for current user (WRAPPER users)
router.put(
  "/me/last-wrapped-batch",
  updateLastWrappedBatch
);

// Get user by ID
router.get(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("GET_USER"),
  getUserById
);

// Update user
router.put(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("UPDATE_USER"),
  updateUser
);

// Delete user (soft delete)
router.delete(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("DELETE_USER"),
  deleteUser
);

// Get user permissions
router.get(
  "/:id/permissions",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("GET_USER_PERMISSIONS"),
  getUserPermissions
);

// Update user permissions
router.put(
  "/:id/permissions",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("UPDATE_USER_PERMISSIONS"),
  updateUserPermissions
);

// Get active users count
router.get(
  "/stats/active-count",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("GET_ACTIVE_USERS_COUNT"),
  getActiveUsersCount
);

// Get users by role
router.get(
  "/role/:role",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("GET_USERS_BY_ROLE"),
  getUsersByRole
);

export default router;
