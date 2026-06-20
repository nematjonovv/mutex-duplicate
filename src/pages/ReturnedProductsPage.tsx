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
  Descriptions,
  List,
} from "antd";
import {
  SearchOutlined,
  DeleteOutlined,
  EyeOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { usePaginatedQuery, useApiMutation } from "@/hooks/useApi";
import { returnService } from "@/services/returnService";
import { Return, ReturnItem } from "@/types";
import { formatDate, formatCurrency } from "@/utils";
import { useAuthStore } from "@/store/authStore";
import dayjs from "dayjs";

const { Search } = Input;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const ReturnedProductsPage: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  const { user } = useAuthStore();

  const convert = (amount: number) => amount; // USD only

  // Query for returns
  const {
    data: returnsData,
    isLoading,
    refetch,
  } = usePaginatedQuery(
    ["returns"],
    (params) => returnService.getReturns(params),
    {
      page: 1,
      limit: 10,
      search: searchText,
      startDate: dateRange?.[0]?.toISOString(),
      endDate: dateRange?.[1]?.toISOString(),
    }
  );

  // Delete return mutation
  const deleteReturnMutation = useApiMutation(
    (id: string) => returnService.deleteReturn(id),
    {
      successMessage: "Qaytarish o'chirildi",
      invalidateQueries: ["returns"],
    }
  );

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  // Handle view details
  const handleViewDetails = (record: Return) => {
    setSelectedReturn(record);
    setIsDetailModalVisible(true);
  };

  // Handle delete
  const handleDelete = (id: string) => {
    if (user?.role !== "DIRECTOR") {
      return;
    }
    deleteReturnMutation.mutate(id);
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
      title: "Faktura №",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Mijoz",
      dataIndex: "clientName",
      key: "clientName",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Mahsulotlar",
      dataIndex: "items",
      key: "items",
      render: (items: ReturnItem[]) => {
        const goodCount = items.filter(i => i.condition === 'GOOD').length;
        const defectiveCount = items.filter(i => i.condition === 'DEFECTIVE').length;
        return (
          <Space>
            {goodCount > 0 && (
              <Tag color="green">
                <CheckCircleOutlined /> {goodCount} yaroqli
              </Tag>
            )}
            {defectiveCount > 0 && (
              <Tag color="red">
                <CloseCircleOutlined /> {defectiveCount} yaroqsiz
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: "Jami summa",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (amount: number) => (
        <Text strong className="text-green-600">
          {formatCurrency(convert(amount))}
        </Text>
      ),
    },
    {
      title: "Qaytarish usuli",
      dataIndex: "refundMethod",
      key: "refundMethod",
      render: (method: string) => (
        <Tag color={method === 'DEBT_REDUCTION' ? 'orange' : 'green'}>
          {method === 'DEBT_REDUCTION' ? 'Qarzdan ayirildi' : 'Naqd qaytarildi'}
        </Tag>
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
      render: (record: Return) => (
        <Space size="small">
          <Tooltip title="Batafsil">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          {user?.role === "DIRECTOR" && (
            <Tooltip title="O'chirish">
              <Popconfirm
                title="O'chirasizmi?"
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
  const totalReturns = returnsData?.data?.length || 0;
  const totalAmount = returnsData?.data?.reduce((sum: number, r: Return) => sum + r.totalAmount, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Title level={2} style={{ margin: 0, fontSize: '1.5rem' }}>
            <RollbackOutlined className="mr-2" />
            Qaytarilgan mahsulotlar tarixi
          </Title>
          <Text type="secondary">Barcha qaytarishlar ro'yxati</Text>
        </div>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card bordered={false} className="shadow-sm" style={{ borderTop: '3px solid #722ed1' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 mb-1">Jami qaytarishlar</div>
                <div className="text-2xl font-bold">{totalReturns}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-full">
                <RollbackOutlined className="text-purple-500 text-xl" />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card bordered={false} className="shadow-sm" style={{ borderTop: '3px solid #52c41a' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 mb-1">Jami qaytarilgan summa</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(convert(totalAmount))}
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-full">
                <CheckCircleOutlined className="text-green-500 text-xl" />
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
          dataSource={returnsData?.data || []}
          rowKey="_id"
          loading={isLoading}
          scroll={{ x: 900 }}
          pagination={{
            current: returnsData?.pagination?.page || 1,
            pageSize: returnsData?.pagination?.limit || 10,
            total: returnsData?.pagination?.total || 0,
          }}
          onChange={() => refetch()}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <RollbackOutlined />
            Qaytarish tafsilotlari - {selectedReturn?.returnNo}
          </Space>
        }
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedReturn && (
          <div className="space-y-4">
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Qaytarish №">
                <Tag color="purple">{selectedReturn.returnNo}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Faktura №">
                <Tag color="blue">{selectedReturn.invoiceNo}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Mijoz">{selectedReturn.clientName}</Descriptions.Item>
              <Descriptions.Item label="Sana">{formatDate(selectedReturn.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="Jami summa">
                <Text strong className="text-green-600">
                  {formatCurrency(convert(selectedReturn.totalAmount))}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Qaytarish usuli">
                <Tag color={selectedReturn.refundMethod === 'DEBT_REDUCTION' ? 'orange' : 'green'}>
                  {selectedReturn.refundMethod === 'DEBT_REDUCTION' ? 'Qarzdan ayirildi' : 'Naqd qaytarildi'}
                </Tag>
              </Descriptions.Item>
              {selectedReturn.debtReduction && selectedReturn.debtReduction > 0 && (
                <Descriptions.Item label="Qarzdan ayirildi">
                  {formatCurrency(convert(selectedReturn.debtReduction))}
                </Descriptions.Item>
              )}
              {selectedReturn.cashRefund && selectedReturn.cashRefund > 0 && (
                <Descriptions.Item label="Naqd qaytarildi">
                  {formatCurrency(convert(selectedReturn.cashRefund))}
                </Descriptions.Item>
              )}
              {selectedReturn.note && (
                <Descriptions.Item label="Izoh" span={2}>
                  {selectedReturn.note}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Title level={5}>Qaytarilgan mahsulotlar</Title>
            <List
              bordered
              dataSource={selectedReturn.items}
              renderItem={(item: ReturnItem) => (
                <List.Item>
                  <div className="flex justify-between w-full items-center">
                    <div className="flex items-center space-x-3">
                      <Tag color={item.condition === 'GOOD' ? 'green' : 'red'}>
                        {item.condition === 'GOOD' ? 'Yaroqli' : 'Yaroqsiz'}
                      </Tag>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          backgroundColor: item.colorCode,
                          border: '1px solid #d9d9d9',
                          borderRadius: 4,
                        }}
                      />
                      <div>
                        <Text strong>{item.productName}</Text>
                        <div className="text-xs text-gray-500">{item.colorName}</div>
                        <Tag color="purple" style={{ marginTop: 4, fontSize: '11px' }}>
                          {item.batchCode}
                        </Tag>
                      </div>
                    </div>
                    <div className="text-right">
                      <div>{item.weightKg} kg / {item.bagsCount} qop</div>
                      <Text strong className="text-green-600">
                        {formatCurrency(convert(item.total))}
                      </Text>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReturnedProductsPage;
