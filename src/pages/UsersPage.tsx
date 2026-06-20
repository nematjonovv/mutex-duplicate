import React, { useState } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { usePaginatedQuery, useApiMutation } from "@/hooks/useApi";
import { userService } from "@/services/userService";
import { User, CreateUserRequest, UpdateUserRequest } from "@/types";
import { cleanPhone } from "@/utils";

const { Option } = Select;

const UsersPage: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  // Query for users
  const {
    data: usersData,
    isLoading,
    refetch,
  } = usePaginatedQuery(["users"], (params) => userService.getUsers(params), {
    page: 1,
    limit: 10,
    search: searchText,
    role: roleFilter,
    isActive: statusFilter,
  });

  const users = usersData?.data || [];
  const pagination = usersData?.pagination || { total: 0, page: 1, limit: 10 };

  // Yaratish user mutation
  const createUserMutation = useApiMutation(
    (data: CreateUserRequest) => userService.createUser(data),
    {
      successMessage: "Foydalanuvchi muvaffaqiyatli yaratildi",
      invalidateQueries: ["users"],
      onSuccess: () => {
        setModalVisible(false);
        form.resetFields();
      },
    }
  );

  // Yangilash user mutation
  const updateUserMutation = useApiMutation(
    ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      userService.updateUser(id, data),
    {
      successMessage: "Foydalanuvchi muvaffaqiyatli yangilandi",
      invalidateQueries: ["users"],
      onSuccess: () => {
        setModalVisible(false);
        setEditingUser(null);
        form.resetFields();
      },
    }
  );

  // Delete user mutation
  const deleteUserMutation = useApiMutation(
    (id: string) => userService.deleteUser(id),
    {
      successMessage: "Foydalanuvchi muvaffaqiyatli o'chirildi",
      invalidateQueries: ["users"],
    }
  );

  // Toggle user status mutation
  const toggleStatusMutation = useApiMutation(
    ({ id, isActive }: { id: string; isActive: boolean }) =>
      userService.toggleUserStatus(id, isActive),
    {
      successMessage: "Foydalanuvchi holati yangilandi",
      invalidateQueries: ["users"],
    }
  );


  // Open create modal
  const showYaratishModal = () => {
    setEditingUser(null);
    setModalVisible(true);
    form.resetFields();
  };

  // Open edit modal
  const showEditModal = (user: User) => {
    setEditingUser(user);
    setModalVisible(true);
    form.setFieldsValue({
      fullName: user.fullName,
      phone: user.phone,
      position: user.position,
      role: user.role,
      isActive: user.isActive,
    });
  };

  // Handle form submit
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      // Clean phone number by removing spaces, dashes, and parentheses
      const cleanedValues = {
        ...values,
        phone: values.phone ? cleanPhone(values.phone) : values.phone,
      };

      if (editingUser) {
        updateUserMutation.mutate({
          id: editingUser._id,
          data: cleanedValues,
        });
      } else {
        createUserMutation.mutate(cleanedValues);
      }
    });
  };

  // Table columns
  const columns = [
    {
      title: "F.I.Sh.",
      dataIndex: "fullName",
      key: "fullName",
      render: (text: string, record: User) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-gray-500 text-sm">{record.position}</div>
        </div>
      ),
    },
    {
      title: "Telefon",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "Lavozim",
      dataIndex: "role",
      key: "role",
      render: (role: string) => {
        const colors = {
          DIRECTOR: "red",
          MANAGER: "blue",
          SELLER: "green",
          ACCOUNTANT: "orange",
          WORKER: "purple",
          WRAPPER: "cyan",
        };
        return <Tag color={colors[role as keyof typeof colors]}>{role}</Tag>;
      },
    },
    {
      title: "Holati",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean, record: User) => (
        <Switch
          checked={isActive}
          onChange={(checked) =>
            toggleStatusMutation.mutate({ id: record._id, isActive: checked })
          }
          checkedChildren="Faol"
          unCheckedChildren="Faol emas"
        />
      ),
    },
    {
      title: "Oxirgi faollik",
      dataIndex: "lastActiveAt",
      key: "lastActiveAt",
      render: (date: string) =>
        date ? new Date(date).toLocaleDateString() : "Hech qachon",
    },
    {
      title: "Amallar",
      key: "actions",
      render: (_: any, record: User) => (
        <Space>
          <Tooltip title="Tahrirlash">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => showEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Ushbu foydalanuvchini o'chirishni xohlaysizmi?"
            onConfirm={() => deleteUserMutation.mutate(record._id)}
            okText="Ha"
            cancelText="Yo'q"
          >
            <Tooltip title="O'chirish">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Role options
  const roleOptions = [
    { label: "Boshqaruvchi", value: "MANAGER" },
    { label: "Sotuvchi", value: "SELLER" },
    { label: "Bugalter", value: "ACCOUNTANT" },
    { label: "Qoplovchi", value: "WRAPPER" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Foydalanuvchilar boshqaruvi</h1>
          <p className="text-gray-600">
            Tizim foydalanuvchilarini va ularning ruxsatlarini boshqarish
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={showYaratishModal}
        >
          Foydalanuvchi qo'shish
        </Button>
      </div>

      {/* Stats */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Jami foydalanuvchilar"
              value={pagination.total}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Faol foydalanuvchilar"
              value={users.filter((u: User) => u.isActive).length}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Menejerlar"
              value={users.filter((u: User) => u.role === "MANAGER").length}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Ishchilar"
              value={users.filter((u: User) => u.role === "WORKER").length}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Input
              placeholder="Ism yoki telefon raqami bo'yicha qidirish"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Lavozim bo'yicha filtrlash"
              value={roleFilter}
              onChange={(value) => setRoleFilter(value)}
              allowClear
              style={{ width: "100%" }}
            >
              {roleOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Holat"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              allowClear
              style={{ width: "100%" }}
            >
              <Option value="true">Faol</Option>
              <Option value="false">Faol emas</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearchText("");
                setRoleFilter("");
                setStatusFilter("");
              }}
            >
              Tozalash
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="_id"
          loading={isLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / ${total} foydalanuvchilar`,
            onChange: () => refetch(),
          }}
        />
      </Card>

      {/* Yaratish/Edit Modal */}
      <Modal
        title={editingUser ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi qo'shish"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          setEditingUser(null);
          form.resetFields();
        }}
        width={600}
        okText={editingUser ? "Yangilash" : "Yaratish"}
        cancelText="Bekor qilish"
      >
        <Form form={form} layout="vertical" initialValues={{ isActive: true }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fullName"
                label="To'liq ism"
                rules={[{ required: true, message: "Iltimos, to'liq ismni kiriting!" }]}
              >
                <Input placeholder="To'liq ismni kiriting" />
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
                    message:
                      "Iltimos, to'g'ri telefon raqam kiriting! (masalan, +998901234567)",
                  },
                ]}
              >
                <Input placeholder="+998901234567" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="position"
                label="Lavozim"
                rules={[{ required: true, message: "Iltimos, lavozimni kiriting!" }]}
              >
                <Input placeholder="Lavozimni kiriting" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="role"
                label="Roli"
                rules={[{ required: true, message: "Iltimos, lavozimni tanlang!" }]}
              >
                <Select placeholder="Lavozimni tanlang">
                  {roleOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {!editingUser && (
            <Form.Item
              name="password"
              label="Parol"
              rules={[
                { required: true, message: "Iltimos, parolni kiriting!" },
                { min: 6, message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak!" },
              ]}
            >
              <Input.Password placeholder="Parolni kiriting" />
            </Form.Item>
          )}

          {editingUser && (
            <>
              <Form.Item name="isActive" label="Holati" valuePropName="checked">
                <Switch checkedChildren="Faol" unCheckedChildren="Faol emas" />
              </Form.Item>

              <Form.Item
                name="password"
                label="Yangi parol"
                extra="Bo'sh qoldirilsa parol o'zgarmaydi"
                rules={[
                  { min: 6, message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak!" },
                ]}
              >
                <Input.Password placeholder="Yangi parol kiriting (ixtiyoriy)" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
