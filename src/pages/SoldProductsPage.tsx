import React, { useState } from "react";
import {
  Card,
  Table,
  Input,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  DatePicker,
  Button,
  Tooltip,
  Drawer,
  Descriptions,
  List,
  Divider,
} from "antd";
import {
  SearchOutlined,
  ShoppingCartOutlined,
  CalendarOutlined,
  ReloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  UserOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { useQuery } from "react-query";
import { apiService } from "@/services/api";
import { formatDate, formatCurrency } from "@/utils";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Search } = Input;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface SoldProduct {
  _id: string;
  invoiceNo: string;
  invoiceId: string;
  createdAt: string;
  clientId: string;
  clientMeta: {
    name: string;
    phone: string;
  };
  batchCode: string;
  productName: string;
  colorName: string;
  colorCode: string;
  weightKg: number;
  bagsCount: number;
  price: number;
  total: number;
  batches?: Array<{
    batch: string;
    weight: number;
    bags?: number;
  }>;
}

interface SoldProductsResponse {
  soldProducts: SoldProduct[];
  summary: {
    totalWeight: number;
    totalBags: number;
    totalAmount: number;
    totalItems: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const SoldProductsPage: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [selectedProduct, setSelectedProduct] = useState<SoldProduct | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const convert = (amount: number) => amount; // USD only

  // Fetch sold products
  const { data, isLoading, refetch } = useQuery<SoldProductsResponse>(
    ["sold-products", page, pageSize, searchText, dateRange],
    async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", pageSize.toString());
      if (searchText) params.append("search", searchText);
      if (dateRange[0]) params.append("startDate", dateRange[0].toISOString());
      if (dateRange[1]) params.append("endDate", dateRange[1].toISOString());

      const response = await apiService.get<any>(`/invoices/sold-products?${params.toString()}`);
      return response.data;
    },
    {
      keepPreviousData: true,
    }
  );

  const soldProducts = data?.soldProducts || [];
  const summary = data?.summary || { totalWeight: 0, totalBags: 0, totalAmount: 0, totalItems: 0 };
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  // Handle date range change
  const handleDateRangeChange = (dates: any) => {
    setDateRange(dates || [null, null]);
    setPage(1);
  };

  // Reset filters
  const handleReset = () => {
    setSearchText("");
    setDateRange([null, null]);
    setPage(1);
  };

  // View product details
  const handleViewProduct = (product: SoldProduct) => {
    setSelectedProduct(product);
    setDrawerVisible(true);
  };

  // Table columns
  const columns: ColumnsType<SoldProduct> = [
    {
      title: "Sana",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 100,
      render: (date: string) => (
        <Text type="secondary" className="text-xs">
          {formatDate(date)}
        </Text>
      ),
    },
    {
      title: "Faktura",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      width: 150,
      render: (invoiceNo: string) => (
        <Tag color="blue" icon={<FileTextOutlined />}>
          {invoiceNo}
        </Tag>
      ),
    },
    {
      title: "Mijoz",
      key: "client",
      width: 180,
      render: (_: any, record: SoldProduct) => (
        <div>
          <Text strong className="block">{record.clientMeta?.name}</Text>
          <Text type="secondary" className="text-xs">{record.clientMeta?.phone}</Text>
        </div>
      ),
    },
    {
      title: "Mahsulot",
      dataIndex: "productName",
      key: "productName",
      width: 200,
      render: (name: string, record: SoldProduct) => (
        <Space>
          {record.colorCode && (
            <div
              style={{
                width: 20,
                height: 20,
                backgroundColor: record.colorCode,
                border: "1px solid #d9d9d9",
                borderRadius: 4,
              }}
            />
          )}
          <div>
            <Text strong>{name}</Text>
            <div className="text-xs text-gray-500">{record.colorName}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Partiya",
      dataIndex: "batchCode",
      key: "batchCode",
      width: 150,
      render: (code: string) => (
        <Tag color="geekblue" className="font-mono">
          {code || "-"}
        </Tag>
      ),
    },
    {
      title: "Og'irlik",
      dataIndex: "weightKg",
      key: "weightKg",
      width: 100,
      align: "right",
      render: (weight: number) => (
        <Text strong>{weight?.toFixed(2)} kg</Text>
      ),
    },
    {
      title: "Qoplar",
      dataIndex: "bagsCount",
      key: "bagsCount",
      width: 80,
      align: "center",
      render: (count: number) => (
        <Tag color="purple">{count} ta</Tag>
      ),
    },
    {
      title: "Narxi",
      dataIndex: "price",
      key: "price",
      width: 120,
      align: "right",
      render: (price: number) => (
        <Text>{formatCurrency(convert(price))}/kg</Text>
      ),
    },
    {
      title: "Summa",
      dataIndex: "total",
      key: "total",
      width: 140,
      align: "right",
      render: (total: number) => (
        <Text strong className="text-green-600">
          {formatCurrency(convert(total))}
        </Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      align: "center",
      render: (_: any, record: SoldProduct) => (
        <Tooltip title="Batafsil">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewProduct(record)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Title level={2} style={{ margin: 0, fontSize: "1.5rem" }}>
            <ShoppingCartOutlined className="mr-2" />
            Sotilgan mahsulotlar
          </Title>
          <Text type="secondary">Fakturalar orqali sotilgan barcha mahsulotlar</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
          Yangilash
        </Button>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Jami mahsulotlar"
              value={summary.totalItems}
              prefix={<InboxOutlined />}
              suffix="ta"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Jami og'irlik"
              value={summary.totalWeight?.toFixed(2)}
              suffix="kg"
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Jami qoplar"
              value={summary.totalBags}
              suffix="ta"
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Jami summa"
              value={formatCurrency(convert(summary.totalAmount))}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="shadow-sm">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Mahsulot, rang, faktura, mijoz..."
              allowClear
              enterButton={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <RangePicker
              style={{ width: "100%" }}
              value={dateRange}
              onChange={handleDateRangeChange}
              placeholder={["Boshlanish", "Tugash"]}
              format="DD.MM.YYYY"
            />
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Space>
              <Button onClick={handleReset}>Tozalash</Button>
              <Text type="secondary">
                Jami: {pagination.total} ta yozuv
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <Table
          columns={columns}
          dataSource={soldProducts}
          rowKey={(record) => `${record.invoiceId}-${record.batchCode}-${record._id}`}
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
            pageSizeOptions: ["10", "20", "50", "100"],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>

      {/* Detail Drawer */}
      <Drawer
        title={
          <Space>
            <ShoppingCartOutlined />
            Sotilgan mahsulot tafsilotlari
          </Space>
        }
        placement="right"
        width={500}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedProduct && (
          <div className="space-y-6">
            {/* Product Info */}
            <Card size="small" title="Mahsulot ma'lumotlari">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Mahsulot">
                  <Text strong>{selectedProduct.productName}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Rang">
                  <Space>
                    {selectedProduct.colorCode && (
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          backgroundColor: selectedProduct.colorCode,
                          border: "1px solid #d9d9d9",
                          borderRadius: 4,
                        }}
                      />
                    )}
                    {selectedProduct.colorName}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Partiya kodi">
                  <Tag color="geekblue">{selectedProduct.batchCode || "-"}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Og'irlik">
                  <Text strong>{selectedProduct.weightKg?.toFixed(2)} kg</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Qoplar soni">
                  <Tag color="purple">{selectedProduct.bagsCount} ta</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Narxi">
                  {formatCurrency(convert(selectedProduct.price))}/kg
                </Descriptions.Item>
                <Descriptions.Item label="Jami summa">
                  <Text strong className="text-green-600 text-lg">
                    {formatCurrency(convert(selectedProduct.total))}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Invoice Info */}
            <Card size="small" title="Faktura ma'lumotlari">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Faktura raqami">
                  <Tag color="blue" icon={<FileTextOutlined />}>
                    {selectedProduct.invoiceNo}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Sana">
                  <CalendarOutlined className="mr-2" />
                  {formatDate(selectedProduct.createdAt)}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Client Info */}
            <Card size="small" title="Mijoz ma'lumotlari">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Ism">
                  <UserOutlined className="mr-2" />
                  {selectedProduct.clientMeta?.name}
                </Descriptions.Item>
                <Descriptions.Item label="Telefon">
                  {selectedProduct.clientMeta?.phone}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Individual Bags */}
            {selectedProduct.batches && selectedProduct.batches.length > 0 && (
              <Card size="small" title={`Alohida qoplar (${selectedProduct.batches.length} ta)`}>
                <List
                  size="small"
                  dataSource={selectedProduct.batches}
                  renderItem={(bag, index) => (
                    <List.Item>
                      <Space className="w-full justify-between">
                        <Space>
                          <Tag color="cyan">{index + 1}</Tag>
                          <Text className="font-mono">{bag.batch}</Text>
                        </Space>
                        <Space split={<Divider type="vertical" />}>
                          <Text>{bag.weight?.toFixed(2)} kg</Text>
                          {bag.bags && <Text>{bag.bags} qop</Text>}
                        </Space>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default SoldProductsPage;
