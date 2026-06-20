import React, { useState } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  Card,
  Row,
  Col,
  Tag,
  Tooltip,
  InputNumber,
  Alert,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BankOutlined,
  SearchOutlined,
  ReloadOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import {
  CashAccount,
  CreateCashAccountRequest,
  UpdateCashAccountRequest,
} from "@/types";
import { useApiQuery, usePaginatedQuery, useApiMutation } from "@/hooks/useApi";
import { accountService } from "@/services/accountService";
import { formatNumber, inputNumberFormatter, inputNumberParser } from "@/utils";

const { Option } = Select;

const AccountsPage: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CashAccount | null>(
    null
  );
  const [form] = Form.useForm();

  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Fetch accounts with pagination
  const {
    data: accountsData,
    isLoading,
    refetch,
  } = usePaginatedQuery(
    ["accounts"],
    (params) => accountService.getAccounts(params),
    {
      page: 1,
      limit: 10,
      search: searchText,
      type: typeFilter,
    }
  );

  const accounts = accountsData?.data || [];
  const pagination = accountsData?.pagination || {
    current: 1,
    pageSize: 10,
    total: 0,
  };

  // Mutations
  const createAccountMutation = useApiMutation(
    (data: CreateCashAccountRequest) => accountService.createAccount(data),
    {
      successMessage: "Hisob muvaffaqiyatli yaratildi",
      invalidateQueries: ["accounts"],
      onSuccess: () => {
        setModalVisible(false);
        form.resetFields();
      },
    }
  );

  const updateAccountMutation = useApiMutation(
    ({ id, data }: { id: string; data: UpdateCashAccountRequest }) =>
      accountService.updateAccount(id, data),
    {
      successMessage: "Hisob muvaffaqiyatli yangilandi",
      invalidateQueries: ["accounts"],
      onSuccess: () => {
        setModalVisible(false);
        setEditingAccount(null);
        form.resetFields();
      },
    }
  );

  const deleteAccountMutation = useApiMutation(
    (id: string) => accountService.deleteAccount(id),
    {
      successMessage: "Hisob muvaffaqiyatli o'chirildi",
      invalidateQueries: ["accounts"],
    }
  );



  // Handle form submit
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingAccount) {
        updateAccountMutation.mutate({
          id: editingAccount._id,
          data: values,
        });
      } else {
        createAccountMutation.mutate(values);
      }
    });
  };

  // Handle delete
  const handleDelete = (accountId: string) => {
    deleteAccountMutation.mutate(accountId);
  };

  // Table columns
  const columns = [
    {
      title: "Hisob nomi",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: CashAccount) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-gray-500 text-sm">ID: {record._id}</div>
        </div>
      ),
    },
    {
      title: "Turi",
      dataIndex: "type",
      key: "type",
      render: (type: string) => {
        const colors = {
          CASH: "green",
          BANK: "blue",
          CARD: "purple",
          OTHER: "orange",
        };
        return <Tag color={colors[type as keyof typeof colors]}>{type}</Tag>;
      },
    },
    {
      title: "Valyuta",
      dataIndex: "currency",
      key: "currency",
      render: (currency: string) => (
        <Tag color={currency === 'USD' ? 'green' : 'blue'}>
          {currency || 'USD'}
        </Tag>
      ),
    },
    {
      title: "Joriy balans",
      dataIndex: "currentBalance",
      key: "currentBalance",
      render: (balance: number, record: CashAccount) => (
        <span
          className={`font-medium ${balance >= 0 ? "text-green-600" : "text-red-600"
            }`}
        >
          {record.currency === 'UZS'
            ? `${formatNumber(balance)} so'm`
            : `$${formatNumber(balance, 2)}`}
        </span>
      ),
    },
    {
      title: "Yaratilgan",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Amallar",
      key: "actions",
      render: (_: any, record: CashAccount) => (
        <Space>
          <Tooltip title="Hisobni tahrirlash">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => showEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this account?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Hisobni o'chirish">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Account type options
  const accountTypeOptions = [
    { label: "Naqd pul", value: "CASH" },
    { label: "Bank hisobi", value: "BANK" },
    { label: "Karta", value: "CARD" },
    { label: "Boshqa", value: "OTHER" },
  ];

  return (
    <div className="space-y-6">

      {/* Filters */}
      <Card bordered={false} className="shadow-sm" style={{ borderRadius: 12 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Hisob nomi bo'yicha qidirish"
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
              className="rounded-lg"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Turi bo'yicha filtrlash"
              value={typeFilter}
              onChange={(value) => setTypeFilter(value)}
              allowClear
              style={{ width: "100%" }}
              size="large"
            >
              {accountTypeOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearchText("");
                setTypeFilter("");
                refetch();
              }}
              size="large"
              block
            >
              Tozalash
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card bordered={false} className="shadow-sm " style={{ borderRadius: 12 }}>
        <Table
          columns={columns}
          dataSource={accounts}
          rowKey="_id"
          loading={isLoading}
          scroll={{ x: 800 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / ${total} ta hisoblar`,
            onChange: () => refetch(),
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingAccount ? "Hisobni tahrirlash" : "Yangi hisob qo'shish"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          setEditingAccount(null);
          form.resetFields();
        }}
        width={600}
        okText={editingAccount ? "Yangilash" : "Yaratish"}
        cancelText="Bekor qilish"
        confirmLoading={
          createAccountMutation.isLoading || updateAccountMutation.isLoading
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ currentBalance: 0, currency: 'USD' }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Hisob nomi"
                rules={[
                  { required: true, message: "Iltimos, hisob nomini kiriting" },
                ]}
              >
                <Input placeholder="Hisob nomini kiriting" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Hisob turi"
                rules={[
                  { required: true, message: "Iltimos, hisob turini tanlang" },
                ]}
              >
                <Select placeholder="Hisob turini tanlang">
                  {accountTypeOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="currency"
                label="Valyuta"
                rules={[
                  { required: true, message: "Iltimos, valyutani tanlang" },
                ]}
              >
                <Select placeholder="Valyutani tanlang">
                  <Option value="USD">USD (Dollar)</Option>
                  <Option value="UZS">UZS (So'm)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="currentBalance"
                label="Boshlang'ich balans"
                rules={[
                  { required: true, message: "Iltimos, boshlang'ich balansni kiriting" },
                ]}
              >
                <InputNumber
                  placeholder="Boshlang'ich balansni kiriting"
                  style={{ width: "100%" }}
                  formatter={inputNumberFormatter}
                  parser={inputNumberParser}
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

    </div>
  );
};

export default AccountsPage;
