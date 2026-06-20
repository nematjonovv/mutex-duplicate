import { apiService } from "./api";
import { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";
import { createResourceService } from "./resourceService";

export interface Notification {
    _id: string;
    title: string;
    message: string;
    type: string;
    targetRoles: string[];
    readBy: string[];
    createdBy: {
        _id: string;
        fullName: string;
    };
    entityId: string;
    entityName: string;
    isRead: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface NotificationParams extends PaginationParams {
    unreadOnly?: boolean;
}

// Create a base service for Notification
const baseNotificationService = createResourceService<Notification>("notifications");

export const notificationService = {
    // Inherit basic CRUD operations from baseNotificationService
    // Note: The base createResourceService does not currently have a .getAll method that accepts
    // parameters as part of its signature but rather through the options object.
    // So for getNotifications, we need to explicitly define it and call baseNotificationService.getAll
    ...baseNotificationService,

    getNotifications: async (params?: NotificationParams
    ): Promise<ApiResponse<PaginatedResponse<Notification>>> => {
      return baseNotificationService.getAll(params);
    },

    // Get unread count
    getUnreadCount: () => {
        return apiService.get<ApiResponse<{ count: number }>>(
            "/notifications/unread-count"
        );
    },

    // Mark notification as read
    markAsRead: (id: string) => {
        return apiService.patch<ApiResponse<void>>(`/notifications/${id}/read`);
    },

    // Mark all as read
    markAllAsRead: () => {
        return apiService.post<ApiResponse<void>>("/notifications/mark-all-read");
    },
};