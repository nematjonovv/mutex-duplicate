import React, { useState } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Row,
  Col,
  InputNumber,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { usePaginatedQuery, useApiMutation } from "@/hooks/useApi";
import { clientService } from "@/services/clientService";
import { Client, CreateClientRequest, UpdateClientRequest } from "@/types";
import {
  formatCurrency,
  formatDate,
  getDebtStatus,
  formatPhone,
  cleanPhone,
} from "@/utils";
import LoadingSpinner from "@/components/LoadingSpinner";

const { Search } = Input;

const ClientsPage: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [form] = Form.useForm();

  // Query for clients
  const {
    data: clientsData,
    isLoading,
    refetch,
  } = usePaginatedQuery(
    ["clients", searchText, pagination],
    (params) => clientService.getAll(params),
    {
      page: pagination.page,
      limit: pagination.limit,
      search: searchText,
    }
  );

  // Create client mutation
  const createClientMutation = useApiMutation(
    (data: CreateClientRequest) => clientService.create(data),
    {
      successMessage: "Mijoz muvaffaqiyatli qo'shildi",
      invalidateQueries: ["clients"],
      onSuccess: () => {
        setIsModalVisible(false);
        form.resetFields();
      },
    }
  );

  // Update client mutation
  const updateClientMutation = useApiMutation(
    ({ id, data }: { id: string; data: UpdateClientRequest }) =>
      clientService.update(id, data),
    {
      successMessage: "Mijoz muvaffaqiyatli yangilandi",
      invalidateQueries: ["clients"],
      onSuccess: () => {
        setIsModalVisible(false);
        setEditingClient(null);
        form.resetFields();
      },
    }
  );

  // Delete client mutation
  const deleteClientMutation = useApiMutation(
    (id: string) => clientService.remove(id),
    {
      successMessage: "Mijoz muvaffaqiyatli o'chirildi",
      invalidateQueries: ["clients"],
    }
  );

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination({ ...pagination, page: 1 });
  };

  // Handle form submit
  const handleSubmit = async (values: any) => {
    try {
      // Clean phone number and remove empty optional fields
      const cleanedValues: any = {
        name: values.name,
        phone: values.phone ? cleanPhone(values.phone) : values.phone,
        address: values.address,
      };

      // Only add optional fields if they have values
      if (values.tin && values.tin.trim() !== "") {
        cleanedValues.tin = values.tin.trim();
      }
      if (values.notes && values.notes.trim() !== "") {
        cleanedValues.notes = values.notes.trim();
      }

      if (values.initialDebt !== undefined) {
        cleanedValues.initialDebt = values.initialDebt;
      }

      if (editingClient) {
        await updateClientMutation.mutateAsync({
          id: editingClient._id,
          data: cleanedValues,
        });
      } else {
        await createClientMutation.mutateAsync(cleanedValues);
      }
    } catch (error: any) {
      console.error("Client submit error:", error);
    }
  };

  // Handle edit
  const handleEdit = (client: Client) => {
    setEditingClient(client);
    form.setFieldsValue({
      name: client.name,
      phone: client.phone,
      tin: client.tin,
      address: client.address,
      notes: client.notes,
      initialDebt: client.initialDebt || 0,
    });
    setIsModalVisible(true);
  };

  // Handle view
  const handleView = (client: Client) => {
    setViewingClient(client);
    setIsViewModalVisible(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteClientMutation.mutateAsync(id);
    } catch (error: any) {
      // Error is already handled by useApiMutation and shown in a toast
      console.log("Delete prevented by backend validation");
    }
  };

  // Table columns
  const columns = [
    {
      title: "Mijoz nomi",
      dataIndex: "name",
      key: "name",
      width: 180,
      fixed: "left" as const,
      render: (text: string) => (
        <div className="flex items-center">
          <UserOutlined className="mr-2 text-blue-500" />
          <span className="font-medium">{text}</span>
        </div>
      ),
    },
    {
      title: "Telefon",
      dataIndex: "phone",
      key: "phone",
      width: 130,
      render: (text: string) => formatPhone(text),
    },
    {
      title: "Manzil",
      dataIndex: "address",
      key: "address",
      width: 180,
      ellipsis: true,
    },
    {
      title: "Joriy qarz",
      dataIndex: "balance",  // currentDebt o'rniga
      key: "currentDebt",
      width: 140,
      align: "right" as const,
      render: (value: number) => {
        const isDebt = (value || 0) < 0;
        const isAdvance = (value || 0) > 0;
        return (
          <div className="flex flex-col items-end">
            <span className={`font-medium ${isDebt ? 'text-red-600' : isAdvance ? 'text-green-600' : 'text-gray-400'}`}>
              {formatCurrency(Math.abs(value || 0))}
            </span>
            <Tag color={isDebt ? "red" : isAdvance ? "green" : "default"} className="mr-0 mt-1 scale-90 origin-right">
              {isDebt ? "Qarzi bor" : isAdvance ? "Avans bor" : "To'langan"}
            </Tag>
          </div>
        );
      },
    },

    {
      title: "Sana",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 110,
      render: (date: string) => formatDate(date),
    },
    {
      title: "Amallar",
      key: "actions",
      width: 110,
      fixed: "right" as const,
      render: (record: Client) => (
        <Space size="small">
          <Tooltip title="Ko'rish">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Tahrirlash">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="O'chirish">
            <Popconfirm
              title="Mijozni o'chirishni xohlaysizmi?"
              description="Bu amalni qaytarib bo'lmaydi."
              onConfirm={() => handleDelete(record._id)}
              okText="Ha"
              cancelText="Yo'q"
            >
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                danger
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (isLoading && !clientsData) {
    return <LoadingSpinner />;
  }


  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Mijozlar</h1>
          <p className="text-gray-600 text-sm">Barcha mijozlar ro'yxati</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingClient(null);
            form.resetFields();
            setIsModalVisible(true);
          }}
        >
          Yangi mijoz
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-sm" styles={{ body: { padding: '12px 24px' } }}>
        <div className="flex justify-between items-center">
          <Search
            placeholder="Mijoz nomi yoki telefon..."
            allowClear
            enterButton={<SearchOutlined />}
            size="middle"
            onSearch={handleSearch}
            className="max-w-md"
          />
          <div className="text-sm text-gray-500">
            Jami: {clientsData?.pagination?.total || 0} mijoz
          </div>
        </div>
      </Card>

      {/* Clients Table */}
      <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={clientsData?.data || []}
          rowKey="_id"
          size="small"
          scroll={{ x: 800 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: clientsData?.pagination?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} dan ${total} ta`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          onChange={(newPagination) => {
            setPagination({
              page: newPagination.current || 1,
              limit: newPagination.pageSize || 10,
            });
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingClient ? "Mijozni tahrirlash" : "Yangi mijoz qo'shish"}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingClient(null);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            name: "",
            phone: "",
            tin: "",
            address: "",
            notes: "",
            initialDebt: 0,
          }}
        >
          <Form.Item
            name="name"
            label="Mijoz nomi"
            rules={[
              { required: true, message: "Iltimos, mijoz nomini kiriting!" },
              {
                min: 2,
                message: "Nomi kamida 2 ta belgidan iborat bo'lishi kerak!",
              },
            ]}
          >
            <Input placeholder="Mijoz nomi yoki kompaniya nomi" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Telefon raqam"
                rules={[
                  {
                    pattern: /^\+?[1-9]\d{1,14}$/,
                    message: "Iltimos, to'g'ri telefon raqam kiriting!",
                  },
                ]}
              >
                <Input placeholder="+998 XX XXX XX XX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tin"
                label="STIR"
                rules={[
                  {
                    pattern: /^\d{9}$/,
                    message: "STIR 9 ta raqamdan iborat bo'lishi kerak!",
                  },
                ]}
              >
                <Input placeholder="123456789" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="initialDebt"
            label="Boshlang'ich qarz (USD)"
            rules={[{ type: 'number', min: 0, message: "Qarz musbat bo'lishi kerak!" }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
              placeholder="0.00"
              precision={2}
              disabled={editingClient && (editingClient.initialDebt || 0) > 0}
            />
          </Form.Item>

          <Form.Item
            name="address"
            label="Manzil"
            rules={[{ required: true, message: "Iltimos, manzilni kiriting!" }]}
          >
            <Input.TextArea placeholder="To'liq manzil" rows={2} />
          </Form.Item>

          <Form.Item name="notes" label="Izohlar">
            <Input.TextArea placeholder="Qo'shimcha ma'lumotlar..." rows={2} />
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex justify-end space-x-2">
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingClient(null);
                  form.resetFields();
                }}
              >
                Bekor qilish
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={
                  createClientMutation.isLoading ||
                  updateClientMutation.isLoading
                }
              >
                {editingClient ? "Yangilash" : "Qo'shish"}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Client Modal */}
      <Modal
        title="Mijoz ma'lumotlari"
        open={isViewModalVisible}
        onCancel={() => {
          setIsViewModalVisible(false);
          setViewingClient(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsViewModalVisible(false);
              setViewingClient(null);
            }}
          >
            Yopish
          </Button>,
        ]}
        width={600}
      >
        {viewingClient && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Mijoz nomi</p>
                <p className="font-medium">{viewingClient.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Telefon</p>
                <p className="font-medium">{formatPhone(viewingClient.phone)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">TIN</p>
                <p className="font-medium">{viewingClient.tin || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  {(viewingClient.balance || 0) < 0 ? "Joriy qarz" : "Joriy avans"}
                </p>
                <p className={`font-medium ${(viewingClient.balance || 0) < 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(Math.abs(viewingClient.balance || 0))}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Manzil</p>
                <p className="font-medium">{viewingClient.address}</p>
              </div>
              {viewingClient.notes && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Izohlar</p>
                  <p className="font-medium">{viewingClient.notes}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Yaratilgan sana</p>
                <p className="font-medium">{formatDate(viewingClient.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Qarz holati</p>
                <Badge
                  status={getDebtStatus(viewingClient.currentDebt).color as any}
                  text={getDebtStatus(viewingClient.currentDebt).text}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClientsPage;