import React, { useEffect } from "react";
import {
    Card,
    List,
    Badge,
    Button,
    Empty,
    Typography,
    Space,
    Tag,
    Spin,
} from "antd";
import {
    BellOutlined,
    CheckCircleOutlined,
    UserOutlined,
    ShopOutlined,
} from "@ant-design/icons";
import { useQuery } from "react-query";
import { notificationService } from "@/services/notificationService";
import { useNotificationStore } from "@/store/notificationStore";
import { useAuthStore } from "@/store/authStore";
import { formatDateTime } from "@/utils";
import { message } from "@/utils/StaticAntd";
import { useSocket } from "@/hooks/useSocket";

const { Title, Text } = Typography;

const NotificationsPage: React.FC = () => {
    const { setNotifications, setUnreadCount, markAsRead, markAllAsRead, addNotification, incrementUnreadCount } =
        useNotificationStore();
    const { accessToken } = useAuthStore();

    // Fetch notifications
    const { data, isLoading, refetch } = useQuery(
        ["notifications"],
        () => notificationService.getNotifications({ limit: 50 }),
        {
            refetchInterval: 10000, // Refetch every 10 seconds
            onSuccess: (response) => {
                if (response.success && response.data) {
                    setNotifications(response.data.data);
                }
            },
        }
    );

    // Fetch unread count
    const { data: unreadData } = useQuery(
        ["notifications-unread"],
        () => notificationService.getUnreadCount(),
        {
            refetchInterval: 30000, // Refetch every 30 seconds
            onSuccess: (response) => {
                if (response.success && response.data) {
                    setUnreadCount(response.data.count);
                }
            },
        }
    );

    // Setup Socket.io for real-time notifications
    const socket = useSocket();

    useEffect(() => {
        if (!socket || !socket.connected) {
            return;
        }

        const handleNotification = (notification: any) => {
            addNotification(notification);
            incrementUnreadCount();
            refetch(); // Refresh the list
        };

        socket.on("notification:received", handleNotification);

        return () => {
            socket.off("notification:received", handleNotification);
        };
    }, [socket, addNotification, incrementUnreadCount, refetch]);

    const handleMarkAsRead = async (id: string) => {
        try {
            const response = await notificationService.markAsRead(id);
            if (response.success) {
                markAsRead(id);
                refetch();
            }
        } catch (error) {
            console.error("Mark as read error:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const response = await notificationService.markAllAsRead();
            if (response.success) {
                markAllAsRead();
                message.success("Barcha xabarlar o'qilgan deb belgilandi");
                refetch();
            }
        } catch (error) {
            console.error("Mark all as read error:", error);
            message.error("Xatolik yuz berdi");
        }
    };

    const getNotificationIcon = (type: string) => {
        if (type.includes("WORKER")) return <UserOutlined />;
        if (type.includes("DYEHOUSE")) return <ShopOutlined />;
        if (type.includes("USER") || type.includes("LOGIN")) return <UserOutlined />;
        return <BellOutlined />;
    };

    const getNotificationColor = (type: string) => {
        if (type.includes("DELETED")) return "red";
        if (type.includes("UPDATED")) return "blue";
        return "default";
    };

    const notifications = data?.data?.data || [];
    const unreadCount = unreadData?.data?.count || 0;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex justify-between items-center">
                <div>
                    <Title level={2} className="!mb-0">
                        Xabarnomalar
                    </Title>
                    <Text type="secondary">
                        {unreadCount > 0
                            ? `${unreadCount} ta o'qilmagan xabar`
                            : "Barcha xabarlar o'qilgan"}
                    </Text>
                </div>
                {unreadCount > 0 && (
                    <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={handleMarkAllAsRead}
                    >
                        Barchasini o'qilgan deb belgilash
                    </Button>
                )}
            </div>

            {/* Notifications List */}
            <Card className="shadow-sm">
                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <Spin size="large" />
                    </div>
                ) : notifications.length === 0 ? (
                    <Empty
                        description="Xabarnomalar yo'q"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                ) : (
                    <List
                        itemLayout="horizontal"
                        dataSource={notifications}
                        renderItem={(item: any) => (
                            <List.Item
                                key={item._id}
                                className={`${!item.isRead ? "bg-blue-50" : ""
                                    } hover:bg-gray-50 transition-colors`}
                                actions={[
                                    !item.isRead && (
                                        <Button
                                            type="link"
                                            size="small"
                                            onClick={() => handleMarkAsRead(item._id)}
                                        >
                                            O'qilgan
                                        </Button>
                                    ),
                                ]}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <Badge dot={!item.isRead} offset={[-5, 5]}>
                                            <div
                                                className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type.includes("DELETED")
                                                    ? "bg-red-100 text-red-600"
                                                    : "bg-blue-100 text-blue-600"
                                                    }`}
                                            >
                                                {getNotificationIcon(item.type)}
                                            </div>
                                        </Badge>
                                    }
                                    title={
                                        <Space>
                                            <Text strong={!item.isRead}>{item.title}</Text>
                                            <Tag color={getNotificationColor(item.type)}>
                                                {item.type.includes("UPDATED")
                                                    ? "Yangilandi"
                                                    : "O'chirildi"}
                                            </Tag>
                                        </Space>
                                    }
                                    description={
                                        <Space direction="vertical" size={0}>
                                            <Text>{item.message}</Text>
                                            <Text type="secondary" className="text-xs">
                                                {formatDateTime(item.createdAt)} •{" "}
                                                {item.createdBy?.fullName}
                                            </Text>
                                        </Space>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                )}
            </Card>
        </div>
    );
};

export default NotificationsPage;
