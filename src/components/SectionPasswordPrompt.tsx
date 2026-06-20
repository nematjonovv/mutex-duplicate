import React, { useState } from "react";
import { Modal, Form, Input, Button, Typography, message } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useApiMutation } from "@/hooks/useApi";
import { settingsService } from "@/services/settingsService";
import { useSecurityStore } from "@/store/securityStore";
import { useNavigate, useLocation } from "react-router-dom";

const { Paragraph } = Typography;

interface SectionPasswordPromptProps {
  section: "sales" | "finance" | "management";
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SECTION_TITLES = {
  sales: "Sotuv bo'limi",
  finance: "Moliya bo'limi",
  management: "Boshqaruv bo'limi",
};

const SectionPasswordPrompt: React.FC<SectionPasswordPromptProps> = ({
  section,
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const unlockSection = useSecurityStore((state) => state.unlockSection);
  const navigate = useNavigate();
  const location = useLocation();

  const verifyPasswordMutation = useApiMutation(
    settingsService.verifySectionPassword,
    {
      onSuccess: () => {
        unlockSection(section);
        message.success(`${SECTION_TITLES[section]} qulfdan chiqarildi!`);
        onSuccess();
        form.resetFields();
      },
      onError: (error) => {
        message.error(error?.response?.data?.message || "Noto'g'ri parol");
        form.setFields([
          {
            name: "password",
            errors: ["Noto'g'ri parol"],
          },
        ]);
      },
    }
  );

  const handleSubmit = (values: { password: string }) => {
    verifyPasswordMutation.mutate({ section, password: values.password });
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <LockOutlined />
          <span>{SECTION_TITLES[section]} uchun parol kiriting</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      closable={false} // Force password entry or logout
      maskClosable={false}
      destroyOnHidden // Replaced destroyOnClose
    >
      <Paragraph className="text-gray-600">
        Ushbu bo'limga kirish uchun maxsus parolni kiriting.
      </Paragraph>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="password"
          label="Parol"
          rules={[{ required: true, message: "Parol majburiy!" }]}
        >
          <Input.Password placeholder="Parolni kiriting" />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={verifyPasswordMutation.isLoading}
            className="w-full"
          >
            Tasdiqlash
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SectionPasswordPrompt;
