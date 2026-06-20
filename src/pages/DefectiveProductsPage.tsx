import React, { useState } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Popconfirm,
  Tooltip,
  Row,
  Col,
  Typography,
  DatePicker,
  Form,
} from "antd";
import {
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { usePaginatedQuery, useApiMutation } from "@/hooks/useApi";
import { defectiveProductService } from "@/services/defectiveProductService";
import { DefectiveProduct } from "@/types";
import { formatDate } from "@/utils";
import { useAuthStore } from "@/store/authStore";
import dayjs from "dayjs";

const { Search } = Input;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const DefectiveProductsPage: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<DefectiveProduct | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [form] = Form.useForm();

  const { user } = useAuthStore();

  // Query for defective products
  const {
    data: productsData,
    isLoading,
    refetch,
  } = usePaginatedQuery(
    ["defective-products"],
    (params) => defectiveProductService.getDefectiveProducts(params),
    {
      page: 1,
      limit: 10,
      search: searchText,
      startDate: dateRange?.[0]?.toISOString(),
      endDate: dateRange?.[1]?.toISOString(),
    }
  );

  // Delete mutation
  const deleteProductMutation = useApiMutation(
    (id: string) => defectiveProductService.deleteDefectiveProduct(id),
    {
      successMessage: "Mahsulot o'chirildi",
      invalidateQueries: ["defective-products"],
    }
  );

  // Update reason mutation
  const updateProductMutation = useApiMutation(
    ({ id, data }: { id: string; data: { reason?: string } }) =>
      defectiveProductService.updateDefectiveProduct(id, data),
    {
      successMessage: "Sabab saqlandi",
      invalidateQueries: ["defective-products"],
      onSuccess: () => {
        setIsEditModalVisible(false);
        setSelectedProduct(null);
        form.resetFields();
      },
    }
  );

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  // Handle edit reason
  const handleEditReason = (record: DefectiveProduct) => {
    setSelectedProduct(record);
    form.setFieldsValue({ reason: record.reason || '' });
    setIsEditModalVisible(true);
  };

  // Handle save reason
  const handleSaveReason = async (values: { reason: string }) => {
    if (!selectedProduct) return;
    await updateProductMutation.mutateAsync({
      id: selectedProduct._id,
      data: { reason: values.reason },
    });
  };

  // Handle delete
  const handleDelete = (id: string) => {
    if (user?.role !== "DIRECTOR" && user?.role !== "MANAGER") {
      return;
    }
    deleteProductMutation.mutate(id);
  };

  // Table columns
  const columns = [
    {
      title: "Qaytarish №",
      dataIndex: "returnNo",
      key: "returnNo",
      render: (text: string) => <Tag color="purple">{text}</Tag>,
    },
    {
      title: "Partiya",
      dataIndex: "batchCode",
      key: "batchCode",
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Mahsulot",
      dataIndex: "productName",
      key: "productName",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Rang",
      key: "color",
      render: (_: any, record: DefectiveProduct) => (
        <Space>
          <div
            style={{
              width: 20,
              height: 20,
              backgroundColor: record.colorCode,
              border: '1px solid #d9d9d9',
              borderRadius: 4,
            }}
          />
          <span>{record.colorName}</span>
        </Space>
      ),
    },
    {
      title: "Og'irlik",
      dataIndex: "weightKg",
      key: "weightKg",
      render: (weight: number) => `${weight} kg`,
    },
    {
      title: "Qoplar",
      dataIndex: "bagsCount",
      key: "bagsCount",
      render: (count: number) => `${count} qop`,
    },
    {
      title: "Sabab",
      dataIndex: "reason",
      key: "reason",
      render: (reason: string) => (
        reason ? (
          <Tooltip title={reason}>
            <Text ellipsis style={{ maxWidth: 150 }}>{reason}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary" italic>Kiritilmagan</Text>
        )
      ),
    },
    {
      title: "Sana",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => formatDate(date),
    },
    {
      title: "Amallar",
      key: "actions",
      render: (record: DefectiveProduct) => (
        <Space size="small">
          <Tooltip title="Sababni tahrirlash">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEditReason(record)}
            />
          </Tooltip>
          {(user?.role === "DIRECTOR" || user?.role === "MANAGER") && (
            <Tooltip title="O'chirish">
              <Popconfirm
                title="O'chirasizmi?"
                description="Bu amalni ortga qaytarib bo'lmaydi"
                onConfirm={() => handleDelete(record._id)}
              >
                <Button icon={<DeleteOutlined />} size="small" danger />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // Calculate stats
  const totalProducts = productsData?.data?.length || 0;
  const totalWeight = productsData?.data?.reduce((sum, p) => sum + p.weightKg, 0) || 0;
  const totalBags = productsData?.data?.reduce((sum, p) => sum + p.bagsCount, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Title level={2} style={{ margin: 0, fontSize: '1.5rem' }}>
            <WarningOutlined className="mr-2 text-red-500" />
            Yaroqsiz mahsulotlar
          </Title>
          <Text type="secondary">Qaytarilgan yaroqsiz mahsulotlar ro'yxati</Text>
        </div>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="shadow-sm" style={{ borderTop: '3px solid #cf1322' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 mb-1">Jami mahsulotlar</div>
                <div className="text-2xl font-bold text-red-600">{totalProducts}</div>
              </div>
              <div className="bg-red-50 p-3 rounded-full">
                <ExclamationCircleOutlined className="text-red-500 text-xl" />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="shadow-sm" style={{ borderTop: '3px solid #fa8c16' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 mb-1">Jami og'irlik</div>
                <div className="text-2xl font-bold text-orange-600">{totalWeight} kg</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-full">
                <WarningOutlined className="text-orange-500 text-xl" />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="shadow-sm" style={{ borderTop: '3px solid #faad14' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 mb-1">Jami qoplar</div>
                <div className="text-2xl font-bold text-yellow-600">{totalBags} qop</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-full">
                <WarningOutlined className="text-yellow-500 text-xl" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filters and Table */}
      <Card className="shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <Search
              placeholder="Qidirish..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={handleSearch}
              className="w-full sm:w-64"
            />
            <RangePicker
              size="large"
              format="DD.MM.YYYY"
              placeholder={['Boshlanish', 'Tugash']}
              value={dateRange as any}
              onChange={(dates) => setDateRange(dates as any)}
              className="w-full sm:w-auto"
            />
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={productsData?.data || []}
          rowKey="_id"
          loading={isLoading}
          scroll={{ x: 900 }}
          pagination={{
            current: productsData?.data?.pagination?.page || 1,
            pageSize: productsData?.data?.pagination?.limit || 10,
            total: productsData?.data?.pagination?.total || 0,
          }}
          onChange={() => refetch()}
        />
      </Card>

      {/* Edit Reason Modal */}
      <Modal
        title="Yaroqsizlik sababini kiritish"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setSelectedProduct(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveReason}
        >
          {selectedProduct && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <Space>
                <Tag color="blue">{selectedProduct.batchCode}</Tag>
                <Text strong>{selectedProduct.productName}</Text>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: selectedProduct.colorCode,
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                    display: 'inline-block',
                  }}
                />
                <span>{selectedProduct.colorName}</span>
              </Space>
            </div>
          )}
          <Form.Item
            name="reason"
            label="Yaroqsizlik sababi"
            rules={[{ required: true, message: "Sababni kiriting" }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Masalan: Rang o'tishi, iplar uzilgan, dog'lanish..."
            />
          </Form.Item>
          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={updateProductMutation.isLoading}
            >
              Saqlash
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DefectiveProductsPage;
