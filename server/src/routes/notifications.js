import express from "express";
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
} from "../controllers/notificationController.js";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Only DIRECTOR and MANAGER can access notifications
router.use(requireRole(["DIRECTOR", "MANAGER"]));

// Get all notifications for current user
router.get("/", auditLog("GET_NOTIFICATIONS"), getNotifications);

// Get unread count
router.get("/unread-count", auditLog("GET_UNREAD_COUNT"), getUnreadCount);

// Mark notification as read
router.patch("/:id/read", auditLog("MARK_NOTIFICATION_READ"), markAsRead);

// Mark all notifications as read
router.post("/mark-all-read", auditLog("MARK_ALL_READ"), markAllAsRead);

export default router;
