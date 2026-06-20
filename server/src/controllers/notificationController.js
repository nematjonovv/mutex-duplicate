import Notification from "../models/Notification.js";
import { logger } from "../config/logger.js";
import { z } from "zod";
const paginationSchema = z.object({
    page: z.preprocess((val) => val === undefined ? "1" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1)).default(1)),
    limit: z.preprocess((val) => val === undefined ? "20" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1).max(2000)).default(20)),
    unreadOnly: z.union([z.string(), z.boolean()])
        .transform((val) => val === "true" || val === true)
        .optional(),
});

// Get notifications for the current user
export const getNotifications = async (req, res) => {
    try {
        const validatedQuery = paginationSchema.parse(req.query);
        const { page, limit, unreadOnly } = validatedQuery;

        // Build query - get notifications for user's role
        const query = {
            targetRoles: { $in: [req.user.role] },
        };

        // Filter for unread only if requested
        if (unreadOnly) {
            query.readBy = { $ne: req.user._id };
        }

        // Calculate skip
        const skip = (page - 1) * limit;

        // Execute query
        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("createdBy", "fullName")
                .lean(),
            Notification.countDocuments(query),
        ]);

        // Add isRead flag for each notification
        const notificationsWithReadStatus = notifications.map((notification) => ({
            ...notification,
            isRead: notification.readBy.some(
                (id) => id.toString() === req.user._id.toString()
            ),
        }));

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: {
        data: notificationsWithReadStatus,
        pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            },
        });
    } catch (error) {
        if (error.name === "ZodError") {
            return res.status(400).json({
                success: false,
                message: "Validatsiya xatosi",
                errors: error.errors,
            });
        }

        logger.error("Get notifications error:", error);
        res.status(500).json({
            success: false,
            message: "Bildirishnomalarni yuklashda xatolik yuz berdi",
        });
    }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            targetRoles: { $in: [req.user.role] },
            readBy: { $ne: req.user._id },
        });

        res.status(200).json({
            success: true,
            data: { count },
        });
    } catch (error) {
        logger.error("Get unread count error:", error);
        res.status(500).json({
            success: false,
            message: "O'qilmaganlar sonini yuklashda xatolik yuz berdi",
        });
    }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Bildirishnoma topilmadi",
            });
        }

        // Check if user has access to this notification
        if (!notification.targetRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Ruxsat yo'q",
            });
        }

        // Add user to readBy if not already there
        if (!notification.readBy.includes(req.user._id)) {
            notification.readBy.push(req.user._id);
            await notification.save();
        }

        res.status(200).json({
            success: true,
            message: "Bildirishnoma o'qilgan deb belgilandi",
        });
    } catch (error) {
        logger.error("Mark as read error:", error);
        res.status(500).json({
            success: false,
            message: "O'qilgan deb belgilashda xatolik yuz berdi",
        });
    }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            {
                targetRoles: { $in: [req.user.role] },
                readBy: { $ne: req.user._id },
            },
            {
                $addToSet: { readBy: req.user._id },
            }
        );

        res.status(200).json({
            success: true,
            message: "Barcha bildirishnomalar o'qilgan deb belgilandi",
        });
    } catch (error) {
        logger.error("Mark all as read error:", error);
        res.status(500).json({
            success: false,
            message: "Barchasini o'qilgan deb belgilashda xatolik yuz berdi",
        });
    }
};
