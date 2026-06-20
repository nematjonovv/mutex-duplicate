import Notification from "../models/Notification.js";
import { emitToRole } from "../config/socket.js";
import { logger } from "../config/logger.js";

/**
 * Create a notification and emit it to target roles via Socket.io
 */
export const createNotification = async ({
    title,
    message,
    type,
    targetRoles = ["DIRECTOR", "MANAGER"],
    createdBy,
    entityId,
    entityName,
}) => {
    try {
        // Create notification in database
        const notification = new Notification({
            title,
            message,
            type,
            targetRoles,
            createdBy,
            entityId,
            entityName,
        });

        await notification.save();

        // Emit to target roles via Socket.io
        const notificationData = {
            _id: notification._id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            entityId: notification.entityId,
            entityName: notification.entityName,
            createdAt: notification.createdAt,
        };

        targetRoles.forEach((role) => {
            emitToRole(role, "notification:received", notificationData);
        });

        logger.info(`Notification created: ${type} for ${entityName}`);
        return notification;
    } catch (error) {
        logger.error("Create notification error:", error);
        throw error;
    }
};

/**
 * Helper functions for specific notification types
 */
export const notifyWorkerUpdate = async (worker, updatedBy) => {
    return createNotification({
        title: "Ishchi ma'lumotlari yangilandi",
        message: `${worker.fullName} ishchining ma'lumotlari yangilandi`,
        type: "WORKER_UPDATED",
        createdBy: updatedBy,
        entityId: worker._id.toString(),
        entityName: worker.fullName,
    });
};

export const notifyWorkerDelete = async (worker, deletedBy) => {
    return createNotification({
        title: "Ishchi o'chirildi",
        message: `${worker.fullName} ishchi o'chirildi`,
        type: "WORKER_DELETED",
        createdBy: deletedBy,
        entityId: worker._id.toString(),
        entityName: worker.fullName,
    });
};

export const notifyDyehouseUpdate = async (dyehouse, updatedBy) => {
    return createNotification({
        title: "Bo'yoqxona ma'lumotlari yangilandi",
        message: `${dyehouse.name} bo'yoqxonasining ma'lumotlari yangilandi`,
        type: "DYEHOUSE_UPDATED",
        createdBy: updatedBy,
        entityId: dyehouse._id.toString(),
        entityName: dyehouse.name,
    });
};

export const notifyDyehouseDelete = async (dyehouse, deletedBy) => {
    return createNotification({
        title: "Bo'yoqxona o'chirildi",
        message: `${dyehouse.name} bo'yoqxonasi o'chirildi`,
        type: "DYEHOUSE_DELETED",
        createdBy: deletedBy,
        entityId: dyehouse._id.toString(),
        entityName: dyehouse.name,
    });
};

export const notifyUserUpdate = async (user, updatedBy) => {
    return createNotification({
        title: "Foydalanuvchi ma'lumotlari yangilandi",
        message: `${user.fullName} foydalanuvchining ma'lumotlari yangilandi`,
        type: "USER_UPDATED",
        createdBy: updatedBy,
        entityId: user._id.toString(),
        entityName: user.fullName,
    });
};

export const notifyUserDelete = async (user, deletedBy) => {
    return createNotification({
        title: "Foydalanuvchi o'chirildi",
        message: `${user.fullName} foydalanuvchi o'chirildi`,
        type: "USER_DELETED",
        createdBy: deletedBy,
        entityId: user._id.toString(),
        entityName: user.fullName,
    });
};

export const notifyTransferDelete = async (transfer, materialName, deletedBy) => {
    return createNotification({
        title: "Kichik bazaga o'tkazish o'chirildi",
        message: `${materialName} xom ashyosining kichik bazaga o'tkazishi (${transfer.weightKg} kg) o'chirildi`,
        type: "TRANSFER_DELETED",
        createdBy: deletedBy,
        entityId: transfer._id.toString(),
        entityName: materialName,
    });
};

export const notifyTransferReturned = async (transfer, materialName, returnedBy) => {
    return createNotification({
        title: "Kichik bazadan katta bazaga qaytarildi",
        message: `${materialName} xom ashyosi (${transfer.weightKg} kg) kichik bazadan katta bazaga qaytarildi`,
        type: "TRANSFER_RETURNED",
        createdBy: returnedBy,
        entityId: transfer._id.toString(),
        entityName: materialName,
    });
};

export const notifyMaterialDelete = async (material, deletedBy) => {
    return createNotification({
        title: "Xom ashyo o'chirildi",
        message: `${material.name} xom ashyosi (${material.totalWeightKg} kg) xom ashyo bazasidan o'chirildi`,
        type: "MATERIAL_DELETED",
        createdBy: deletedBy,
        entityId: material._id.toString(),
        entityName: material.name,
    });
};

export const notifyUserLogin = async (user, ipAddress, userAgent) => {
    const location = ipAddress || "Noma'lum";
    const device = userAgent ? userAgent.substring(0, 50) : "Noma'lum";
    const loginTime = new Date().toLocaleString("uz-UZ");

    return createNotification({
        title: "Foydalanuvchi tizimga kirdi",
        message: `${user.fullName} (${user.role}) tizimga kirdi. IP: ${location}, Qurilma: ${device}, Vaqt: ${loginTime}`,
        type: "USER_LOGIN",
        targetRoles: ["MANAGER"],
        createdBy: user._id,
        entityId: user._id.toString(),
        entityName: user.fullName,
    });
};

export const notifySoftHankDelete = async (softHank, deletedBy) => {
    return createNotification({
        title: "Yumshoq motka o'chirildi",
        message: `${softHank.rawMaterialName} (${softHank.weight} kg, ${softHank.dyehouseName}) o'chirildi. Partiya: ${softHank.batchNumber || "Mavjud emas"}`,
        type: "SOFT_HANK_DELETED",
        targetRoles: ["DIRECTOR", "MANAGER"],
        createdBy: deletedBy,
        entityId: softHank._id.toString(),
        entityName: softHank.rawMaterialName,
    });
};