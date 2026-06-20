import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Notification } from "@/services/notificationService";

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;

    // Actions
    setNotifications: (notifications: Notification[]) => void;
    addNotification: (notification: Notification) => void;
    setUnreadCount: (count: number) => void;
    incrementUnreadCount: () => void;
    decrementUnreadCount: () => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    setLoading: (loading: boolean) => void;
    clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set) => ({
            notifications: [],
            unreadCount: 0,
            isLoading: false,

            setNotifications: (notifications) => set({ notifications }),

            addNotification: (notification) =>
                set((state) => ({
                    notifications: [notification, ...state.notifications],
                })),

            setUnreadCount: (count) => set({ unreadCount: count }),

            incrementUnreadCount: () =>
                set((state) => ({ unreadCount: state.unreadCount + 1 })),

            decrementUnreadCount: () =>
                set((state) => ({
                    unreadCount: Math.max(0, state.unreadCount - 1),
                })),

            markAsRead: (id) =>
                set((state) => ({
                    notifications: state.notifications.map((n) =>
                        n._id === id ? { ...n, isRead: true } : n
                    ),
                    unreadCount: Math.max(0, state.unreadCount - 1),
                })),

            markAllAsRead: () =>
                set((state) => ({
                    notifications: state.notifications.map((n) => ({
                        ...n,
                        isRead: true,
                    })),
                    unreadCount: 0,
                })),

            setLoading: (loading) => set({ isLoading: loading }),

            clearNotifications: () =>
                set({ notifications: [], unreadCount: 0 }),
        }),
        {
            name: "notification-storage",
            partialize: (state) => ({
                unreadCount: state.unreadCount,
            }),
        }
    )
);
