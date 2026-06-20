import React from "react";
import { Form, Input, Button, Card, Typography } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useAuthStore } from "@/store/authStore";
import { LoginRequest } from "@/types";
import { cleanPhone } from "@/utils";

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuthStore();
  console.log(login);
  
  const onFinish = async (values: LoginRequest) => {
    // Clean phone number before submission
    const cleanedValues = {
      ...values,
      phone: cleanPhone(values.phone),
    };

    const success = await login(cleanedValues);
    if (success) {
      // Navigation will be handled by the auth store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <div className="text-center mb-8">
            <Title level={2} className="text-gray-800 mb-2">
              MUTex
            </Title>
            <Text className="text-gray-600">
              Tizimga kirish uchun ma'lumotlaringizni kiriting
            </Text>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="phone"
              label="Telefon raqam"
              rules={[
                {
                  required: true,
                  message: "Iltimos, telefon raqamingizni kiriting!",
                },
                {
                  pattern: /^\+?[1-9]\d{1,14}$/,
                  message: "Iltimos, to'g'ri telefon raqam kiriting!",
                },
              ]}
            >
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="+998 XX XXX XX XX"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Parol"
              rules={[
                { required: true, message: "Iltimos, parolingizni kiriting!" },
                {
                  min: 6,
                  message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak!",
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Parolingizni kiriting"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item className="mb-6">
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-700 border-0 font-medium"
              >
                {isLoading ? "Kirilmoqda..." : "Tizimga kirish"}
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center">
            <Text className="text-gray-500 text-sm">
              © 2024 MUTex. Barcha huquqlar himoyalangan.
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
