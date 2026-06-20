import React, { useEffect, useState } from "react";
import { Card, Form, Input, Button, message, Space, Typography, Popconfirm, Spin, Tag } from "antd";
import { SaveOutlined, LockOutlined, UnlockOutlined, EditOutlined } from "@ant-design/icons";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { settingsService } from "@/services/settingsService"; // We will create this service
import { useAuthStore } from "@/store/authStore"; // To check user role
import { Link } from "react-router-dom";

const { Title, Paragraph } = Typography;

const SecuritySettingsPage: React.FC = () => {
  const [salesForm] = Form.useForm();
  const [financeForm] = Form.useForm();
  const [managementForm] = Form.useForm();
  const { user } = useAuthStore();
  const [isSalesEditing, setIsSalesEditing] = useState(false);
  const [isFinanceEditing, setIsFinanceEditing] = useState(false);
  const [isManagementEditing, setIsManagementEditing] = useState(false);

  // Fetch current password status
  const { data: passwordStatus, isLoading: statusLoading, refetch: refetchStatus } = useApiQuery(
    ["password-status"],
    settingsService.getPasswordStatus,
    { enabled: user?.role === "DIRECTOR" || user?.role === "MANAGER" }
  );

  // Mutations for setting passwords
  const setSalesPasswordMutation = useApiMutation(
    settingsService.setSalesPassword,
    {
      successMessage: "Sotuv paroli muvaffaqiyatli o'rnatildi/yangilandi",
      invalidateQueries: ["password-status"], // Invalidate to force ProtectedRoute to re-fetch
      onSuccess: () => {
        setIsSalesEditing(false);
        salesForm.resetFields();
        refetchStatus();
      },
      onError: (error) => message.error(error?.response?.data?.message || "Xatolik yuz berdi"),
    }
  );

  const setFinancePasswordMutation = useApiMutation(
    settingsService.setFinancePassword,
    {
      successMessage: "Moliya paroli muvaffaqiyatli o'rnatildi/yangilandi",
      invalidateQueries: ["password-status"], // Invalidate to force ProtectedRoute to re-fetch
      onSuccess: () => {
        setIsFinanceEditing(false);
        financeForm.resetFields();
        refetchStatus();
      },
      onError: (error) => message.error(error?.response?.data?.message || "Xatolik yuz berdi"),
    }
  );

  const setManagementPasswordMutation = useApiMutation(
    settingsService.setManagementPassword,
    {
      successMessage: "Boshqaruv paroli muvaffaqiyatli o'rnatildi/yangilandi",
      invalidateQueries: ["password-status"], // Invalidate to force ProtectedRoute to re-fetch
      onSuccess: () => {
        setIsManagementEditing(false);
        managementForm.resetFields();
        refetchStatus();
      },
      onError: (error) => message.error(error?.response?.data?.message || "Xatolik yuz berdi"),
    }
  );

  // Only managers can access this page
  if (user?.role !== "DIRECTOR" && user?.role !== "MANAGER") {
    return (
      <Card title="Kirish rad etildi" className="max-w-md mx-auto mt-10">
        <Paragraph>Sizda ushbu sahifaga kirish uchun yetarli huquq yo'q.</Paragraph>
        <Link to="/">Bosh sahifaga qaytish</Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Title level={3}>Xavfsizlik sozlamalari</Title>
      <Paragraph>
        Ushbu bo'limda siz Sotuv, Moliya va Boshqaruv bo'limlariga kirish uchun alohida parollar o'rnatishingiz mumkin.
        Bu parollar bo'limlarga kirishda qo'shimcha xavfsizlik qatlami bo'lib xizmat qiladi.
      </Paragraph>

      {statusLoading ? (
        <Card>
          <Spin tip="Ma'lumotlar yuklanmoqda..." />
        </Card>
      ) : (
        <Space direction="vertical" size="large" className="w-full">
          {/* Sales Password */}
          <Card title="Sotuv bo'limi paroli" extra={passwordStatus?.salesPasswordSet ? <Tag color="green">O'rnatilgan</Tag> : <Tag color="red">O'rnatilmagan</Tag>}>
            <Form form={salesForm} layout="vertical" onFinish={(values) => setSalesPasswordMutation.mutate(values)}>
              {isSalesEditing || !passwordStatus?.salesPasswordSet ? (
                <>
                  <Form.Item
                    name="password"
                    label="Yangi parol"
                    rules={[{ required: true, message: "Parol kiriting" }, { min: 6, message: "Parol kamida 6 belgidan iborat bo'lishi kerak" }]}
                  >
                    <Input.Password placeholder="Parol" />
                  </Form.Item>
                  <Form.Item
                    name="confirmPassword"
                    label="Parolni takrorlang"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: "Parolni takrorlang" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error("Parollar mos kelmaydi!"));
                        },
                      }),
                    ]}
                  >
                    <Input.Password placeholder="Parolni takrorlang" />
                  </Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={setSalesPasswordMutation.isLoading}>
                      {passwordStatus?.salesPasswordSet ? "Parolni yangilash" : "Parolni o'rnatish"}
                    </Button>
                    {passwordStatus?.salesPasswordSet && <Button onClick={() => setIsSalesEditing(false)}>Bekor qilish</Button>}
                  </Space>
                </>
              ) : (
                <Button icon={<EditOutlined />} onClick={() => setIsSalesEditing(true)}>Parolni o'zgartirish</Button>
              )}
            </Form>
          </Card>

          {/* Finance Password */}
          <Card title="Moliya bo'limi paroli" extra={passwordStatus?.financePasswordSet ? <Tag color="green">O'rnatilgan</Tag> : <Tag color="red">O'rnatilmagan</Tag>}>
            <Form form={financeForm} layout="vertical" onFinish={(values) => setFinancePasswordMutation.mutate(values)}>
              {isFinanceEditing || !passwordStatus?.financePasswordSet ? (
                <>
                  <Form.Item
                    name="password"
                    label="Yangi parol"
                    rules={[{ required: true, message: "Parol kiriting" }, { min: 6, message: "Parol kamida 6 belgidan iborat bo'lishi kerak" }]}
                  >
                    <Input.Password placeholder="Parol" />
                  </Form.Item>
                  <Form.Item
                    name="confirmPassword"
                    label="Parolni takrorlang"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: "Parolni takrorlang" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error("Parollar mos kelmaydi!"));
                        },
                      }),
                    ]}
                  >
                    <Input.Password placeholder="Parolni takrorlang" />
                  </Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={setFinancePasswordMutation.isLoading}>
                      {passwordStatus?.financePasswordSet ? "Parolni yangilash" : "Parolni o'rnatish"}
                    </Button>
                    {passwordStatus?.financePasswordSet && <Button onClick={() => setIsFinanceEditing(false)}>Bekor qilish</Button>}
                  </Space>
                </>
              ) : (
                <Button icon={<EditOutlined />} onClick={() => setIsFinanceEditing(true)}>Parolni o'zgartirish</Button>
              )}
            </Form>
          </Card>

          {/* Management Password */}
          <Card title="Boshqaruv bo'limi paroli" extra={passwordStatus?.managementPasswordSet ? <Tag color="green">O'rnatilgan</Tag> : <Tag color="red">O'rnatilmagan</Tag>}>
            <Form form={managementForm} layout="vertical" onFinish={(values) => setManagementPasswordMutation.mutate(values)}>
              {isManagementEditing || !passwordStatus?.managementPasswordSet ? (
                <>
                  <Form.Item
                    name="password"
                    label="Yangi parol"
                    rules={[{ required: true, message: "Parol kiriting" }, { min: 6, message: "Parol kamida 6 belgidan iborat bo'lishi kerak" }]}
                  >
                    <Input.Password placeholder="Parol" />
                  </Form.Item>
                  <Form.Item
                    name="confirmPassword"
                    label="Parolni takrorlang"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: "Parolni takrorlang" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error("Parollar mos kelmaydi!"));
                        },
                      }),
                    ]}
                  >
                    <Input.Password placeholder="Parolni takrorlang" />
                  </Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={setManagementPasswordMutation.isLoading}>
                      {passwordStatus?.managementPasswordSet ? "Parolni yangilash" : "Parolni o'rnatish"}
                    </Button>
                    {passwordStatus?.managementPasswordSet && <Button onClick={() => setIsManagementEditing(false)}>Bekor qilish</Button>}
                  </Space>
                </>
              ) : (
                <Button icon={<EditOutlined />} onClick={() => setIsManagementEditing(true)}>Parolni o'zgartirish</Button>
              )}
            </Form>
          </Card>
        </Space>
      )}
    </div>
  );
};

export default SecuritySettingsPage;
