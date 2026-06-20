import React, { useState } from "react";
import {
    Card,
    Form,
    Input,
    Button,
    Row,
    Col,
    Avatar,
    Space,
    Divider,
    Upload,
    Typography,
    App,
} from "antd";
import {
    UserOutlined,
    EditOutlined,
    SaveOutlined,
    CloseOutlined,
    LockOutlined,
    PhoneOutlined,
    IdcardOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";
import { UpdateUserRequest } from "@/types";

const { Title, Text } = Typography;

const ProfilePage: React.FC = () => {
    const { user, updateUser } = useAuthStore();
    const { message: antMessage } = App.useApp();
    const [isEditing, setIsEditing] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

    const [profileForm] = Form.useForm();
    const [passwordForm] = Form.useForm();

    // Handle profile update
    const handleProfileUpdate = async (values: UpdateUserRequest) => {
        if (!user) return;

        try {
            setLoading(true);
            const response = await authService.updateProfile(values);

            if (response.success && response.data) {
                updateUser(response.data);
                antMessage.success("Profil muvaffaqiyatli yangilandi");
                setIsEditing(false);
            }
        } catch (error: any) {
            antMessage.error(error.response?.data?.message || "Profilni yangilashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    // Handle password change
    const handlePasswordChange = async (values: {
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
    }) => {
        try {
            setLoading(true);
            const response = await authService.changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
                confirmPassword: values.confirmPassword,
            });

            if (response.success) {
                antMessage.success("Parol muvaffaqiyatli o'zgartirildi");
                passwordForm.resetFields();
                setIsChangingPassword(false);
            }
        } catch (error: any) {
            antMessage.error(error.response?.data?.message || "Parolni o'zgartirishda xatolik");
        } finally {
            setLoading(false);
        }
    };

    // Handle avatar upload
    const uploadProps: UploadProps = {
        name: "avatar",
        showUploadList: false,
        beforeUpload: (file) => {
            const isImage = file.type.startsWith("image/");
            if (!isImage) {
                antMessage.error("Faqat rasm fayllarini yuklash mumkin!");
                return false;
            }
            const isLt2M = file.size / 1024 / 1024 < 2;
            if (!isLt2M) {
                antMessage.error("Rasm hajmi 2MB dan kichik bo'lishi kerak!");
                return false;
            }

            // Preview image
            const reader = new FileReader();
            reader.onload = (e) => {
                setAvatarUrl(e.target?.result as string);
            };
            reader.readAsDataURL(file);

            return false; // Prevent auto upload
        },
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setIsEditing(false);
        profileForm.resetFields();
    };

    // Start editing
    const handleStartEdit = () => {
        setIsEditing(true);
        profileForm.setFieldsValue({
            fullName: user?.fullName,
            phone: user?.phone,
            position: user?.position,
        });
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Text>Foydalanuvchi ma'lumotlari yuklanmoqda...</Text>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div>
                <Title level={2}>Profil</Title>
                <Text type="secondary">
                    O'z profil ma'lumotlaringizni ko'ring va tahrirlang
                </Text>
            </div>

            {/* Profile Information Card */}
            <Card>
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                        <Upload {...uploadProps} disabled={!isEditing}>
                            <Avatar
                                size={80}
                                icon={<UserOutlined />}
                                src={avatarUrl}
                                className="cursor-pointer hover:opacity-80"
                            />
                        </Upload>
                        <div>
                            <Title level={4} className="mb-0">
                                {user.fullName}
                            </Title>
                            <Text type="secondary">{user.position}</Text>
                            <br />
                            <Text type="secondary" className="text-xs">
                                Roli: <strong>{user.role}</strong>
                            </Text>
                        </div>
                    </div>

                    {!isEditing ? (
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={handleStartEdit}
                        >
                            Tahrirlash
                        </Button>
                    ) : (
                        <Space>
                            <Button
                                icon={<CloseOutlined />}
                                onClick={handleCancelEdit}
                            >
                                Bekor qilish
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={() => profileForm.submit()}
                                loading={loading}
                            >
                                Saqlash
                            </Button>
                        </Space>
                    )}
                </div>

                <Divider />

                {!isEditing ? (
                    // View Mode
                    <Row gutter={[16, 16]}>
                        <Col span={12}>
                            <div className="space-y-1">
                                <Text type="secondary" className="text-xs">
                                    To'liq ism
                                </Text>
                                <div className="flex items-center space-x-2">
                                    <UserOutlined className="text-gray-400" />
                                    <Text strong>{user.fullName}</Text>
                                </div>
                            </div>
                        </Col>
                        <Col span={12}>
                            <div className="space-y-1">
                                <Text type="secondary" className="text-xs">
                                    Telefon raqam
                                </Text>
                                <div className="flex items-center space-x-2">
                                    <PhoneOutlined className="text-gray-400" />
                                    <Text strong>{user.phone}</Text>
                                </div>
                            </div>
                        </Col>
                        <Col span={12}>
                            <div className="space-y-1">
                                <Text type="secondary" className="text-xs">
                                    Lavozim
                                </Text>
                                <div className="flex items-center space-x-2">
                                    <IdcardOutlined className="text-gray-400" />
                                    <Text strong>{user.position}</Text>
                                </div>
                            </div>
                        </Col>
                        <Col span={12}>
                            <div className="space-y-1">
                                <Text type="secondary" className="text-xs">
                                    Holat
                                </Text>
                                <div className="flex items-center space-x-2">
                                    <Text strong className={user.isActive ? "text-green-600" : "text-red-600"}>
                                        {user.isActive ? "Faol" : "Faol emas"}
                                    </Text>
                                </div>
                            </div>
                        </Col>
                    </Row>
                ) : (
                    // Edit Mode
                    <Form
                        form={profileForm}
                        layout="vertical"
                        onFinish={handleProfileUpdate}
                    >
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="fullName"
                                    label="To'liq ism"
                                    rules={[
                                        { required: true, message: "Iltimos, to'liq ismni kiriting!" },
                                    ]}
                                >
                                    <Input
                                        prefix={<UserOutlined />}
                                        placeholder="To'liq ismni kiriting"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="phone"
                                    label="Telefon raqam"
                                    rules={[
                                        { required: true, message: "Iltimos, telefon raqamini kiriting!" },
                                        {
                                            pattern: /^\+?[1-9]\d{1,14}$/,
                                            message: "To'g'ri telefon raqam kiriting!",
                                        },
                                    ]}
                                >
                                    <Input
                                        prefix={<PhoneOutlined />}
                                        placeholder="+998901234567"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="position"
                                    label="Lavozim"
                                    rules={[
                                        { required: true, message: "Iltimos, lavozimni kiriting!" },
                                    ]}
                                >
                                    <Input
                                        prefix={<IdcardOutlined />}
                                        placeholder="Lavozimni kiriting"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                )}
            </Card>

            {/* Change Password Card */}
            <Card
                title={
                    <div className="flex items-center space-x-2">
                        <LockOutlined />
                        <span>Parolni o'zgartirish</span>
                    </div>
                }
            >
                {!isChangingPassword ? (
                    <div className="text-center py-4">
                        <Text type="secondary" className="block mb-4">
                            Xavfsizlik uchun parolingizni muntazam ravishda o'zgartiring
                        </Text>
                        <Button
                            type="primary"
                            icon={<LockOutlined />}
                            onClick={() => setIsChangingPassword(true)}
                        >
                            Parolni o'zgartirish
                        </Button>
                    </div>
                ) : (
                    <Form
                        form={passwordForm}
                        layout="vertical"
                        onFinish={handlePasswordChange}
                    >
                        <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item
                                    name="currentPassword"
                                    label="Joriy parol"
                                    rules={[
                                        { required: true, message: "Iltimos, joriy parolni kiriting!" },
                                    ]}
                                >
                                    <Input.Password
                                        prefix={<LockOutlined />}
                                        placeholder="Joriy parolni kiriting"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="newPassword"
                                    label="Yangi parol"
                                    rules={[
                                        { required: true, message: "Iltimos, yangi parolni kiriting!" },
                                        { min: 6, message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak!" },
                                    ]}
                                >
                                    <Input.Password
                                        prefix={<LockOutlined />}
                                        placeholder="Yangi parolni kiriting"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="confirmPassword"
                                    label="Parolni tasdiqlang"
                                    dependencies={["newPassword"]}
                                    rules={[
                                        { required: true, message: "Iltimos, parolni tasdiqlang!" },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                if (!value || getFieldValue("newPassword") === value) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(new Error("Parollar mos kelmadi!"));
                                            },
                                        }),
                                    ]}
                                >
                                    <Input.Password
                                        prefix={<LockOutlined />}
                                        placeholder="Parolni qayta kiriting"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <div className="flex justify-end space-x-2">
                            <Button
                                onClick={() => {
                                    setIsChangingPassword(false);
                                    passwordForm.resetFields();
                                }}
                            >
                                Bekor qilish
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                icon={<SaveOutlined />}
                            >
                                Parolni o'zgartirish
                            </Button>
                        </div>
                    </Form>
                )}
            </Card>
        </div>
    );
};

export default ProfilePage;
