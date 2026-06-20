import React, { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Card,
  Row,
  Col,
  Statistic,
  Tooltip,
  Popconfirm,
  Space,
  Descriptions,
  Tag,
  Collapse,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  EyeOutlined,
  CalendarOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { usePaginatedQuery, useApiMutation, useApiQuery } from '@/hooks/useApi';
import { supplierService } from '@/services/supplierService';
import { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '@/types';
import { formatDate, formatNumber } from '@/utils';
import LoadingSpinner from '@/components/LoadingSpinner';

const { Panel } = Collapse;
const { Search } = Input;

const SuppliersPage: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isStatsModalVisible, setIsStatsModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [form] = Form.useForm();

  const { data: suppliersData, isLoading, refetch } = usePaginatedQuery(
    ['suppliers', searchText, pagination],
    (params) => supplierService.getAll(params),
    {
      page: pagination.page,
      limit: pagination.limit,
      search: searchText,
    }
  );

  const { data: statsData, isLoading: statsLoading } = useApiQuery(
    ['supplier-stats', selectedSupplier?._id],
    () => supplierService.getSupplierStats(selectedSupplier!._id),
    {
      enabled: !!selectedSupplier?._id && isStatsModalVisible,
    }
  );

  const createSupplierMutation = useApiMutation(
    (data: CreateSupplierRequest) => supplierService.create(data),
    {
      successMessage: "Yetkazib beruvchi muvaffaqiyatli qo'shildi",
      invalidateQueries: ['suppliers'],
      onSuccess: () => {
        setIsModalVisible(false);
        form.resetFields();
      },
    }
  );

  const updateSupplierMutation = useApiMutation(
    ({ id, data }: { id: string; data: UpdateSupplierRequest }) =>
      supplierService.update(id, data),
    {
      successMessage: "Yetkazib beruvchi muvaffaqiyatli yangilandi",
      invalidateQueries: ['suppliers'],
      onSuccess: () => {
        setIsModalVisible(false);
        setEditingSupplier(null);
        form.resetFields();
      },
    }
  );

  const deleteSupplierMutation = useApiMutation(
    (id: string) => supplierService.remove(id),
    {
      successMessage: "Yetkazib beruvchi muvaffaqiyatli o'chirildi",
      invalidateQueries: ['suppliers'],
    }
  );

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const showModal = (supplier: Supplier | null = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      form.setFieldsValue(supplier);
    } else {
      setEditingSupplier(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingSupplier(null);
    form.resetFields();
  };

  const handleSubmit = async (values: any) => {
    if (editingSupplier) {
      await updateSupplierMutation.mutateAsync({ id: editingSupplier._id, data: values });
    } else {
      await createSupplierMutation.mutateAsync(values);
    }
  };

  const handleViewStats = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsStatsModalVisible(true);
  };

  const handleCloseStats = () => {
    setIsStatsModalVisible(false);
    setSelectedSupplier(null);
  };

  const columns = [
    {
      title: 'Firma nomi',
      dataIndex: 'companyName',
      key: 'companyName',
      width: 180,
      render: (text: string) => (
        <div className="flex items-center">
          <UserOutlined className="mr-2 text-blue-500" />
          <span className="font-medium">{text}</span>
        </div>
      ),
    },
    {
      title: "Mas'ul shaxs",
      dataIndex: 'responsiblePerson',
      key: 'responsiblePerson',
      width: 150,
    },
    {
      title: 'Telefon',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
    },
    {
      title: 'Manzil',
      dataIndex: 'address',
      key: 'address',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Qarzdorlik',
      dataIndex: 'debt',
      key: 'debt',
      width: 140,
      align: 'right' as const,
      render: (debt: number) => (
        <Tag color={debt > 0 ? 'red' : 'green'} className="mr-0 scale-90 origin-right">
          {formatNumber(debt)} UZS
        </Tag>
      ),
    },
    {
      title: 'Amallar',
      key: 'actions',
      width: 110,
      fixed: 'right' as const,
      render: (record: Supplier) => (
        <Space size="small">
          <Tooltip title="Batafsil">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewStats(record)}
            />
          </Tooltip>
          <Tooltip title="Tahrirlash">
            <Button type="text" icon={<EditOutlined />} size="small" onClick={() => showModal(record)} />
          </Tooltip>
          <Tooltip title="O'chirish">
            <Popconfirm
              title="Yetkazib beruvchini o'chirishni xohlaysizmi?"
              onConfirm={() => deleteSupplierMutation.mutate(record._id)}
              okText="Ha"
              cancelText="Yo'q"
            >
              <Button type="text" danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const suppliers = suppliersData?.data || [];
  const totalDebt = suppliers.reduce((acc: number, supplier: Supplier) => acc + (supplier.debt || 0), 0);

  if (isLoading && !suppliersData) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Yetkazib beruvchilar</h1>
          <p className="text-gray-600 text-sm">Yetkazib beruvchilarni boshqarish</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          Qo'shish
        </Button>
      </div>

      <Row gutter={16}>
        <Col span={12}>
          <Card styles={{ body: { padding: '12px 24px' } }}>
            <Statistic
              title="Jami firma"
              value={suppliersData?.pagination?.total || 0}
              prefix={<UserOutlined />}
              valueStyle={{ fontSize: '18px' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card styles={{ body: { padding: '12px 24px' } }}>
            <Statistic
              title="Jami qarz"
              value={totalDebt}
              suffix="UZS"
              valueStyle={{ color: totalDebt > 0 ? '#cf1322' : '#3f8600', fontSize: '18px' }}
            />
          </Card>
        </Col>
      </Row>

      <Card styles={{ body: { padding: '12px 24px' } }}>
        <Search
          placeholder="Qidirish (Firma, mas'ul shaxs, telefon)..."
          onSearch={handleSearch}
          enterButton={<SearchOutlined />}
          size="middle"
        />
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={suppliers}
          rowKey="_id"
          size="small"
          loading={isLoading}
          scroll={{ x: 800 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: suppliersData?.pagination?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} dan ${total} ta`,
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
        title={editingSupplier ? "Yetkazib beruvchini tahrirlash" : "Yangi yetkazib beruvchi qo'shish"}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="companyName"
            label="Firma nomi"
            rules={[{ required: true, message: 'Iltimos, firma nomini kiriting!' }]}
          >
            <Input placeholder="Firma nomi" />
          </Form.Item>
          <Form.Item
            name="responsiblePerson"
            label="Mas'ul shaxs"
            rules={[{ required: true, message: "Iltimos, mas'ul shaxs nomini kiriting!" }]}
          >
            <Input placeholder="Mas'ul shaxs F.I.O." />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Telefon raqami"
            rules={[{
              pattern: /^\+?[1-9]\d{1,14}$/,
              message: "Iltimos, to'g'ri telefon raqam kiriting!",
            }]}
          >
            <Input placeholder="+998 XX XXX XX XX" />
          </Form.Item>
          <Form.Item
            name="address"
            label="Manzil"
            rules={[{ required: true, message: 'Iltimos, manzilni kiriting!' }]}
          >
            <Input.TextArea rows={3} placeholder="Manzil" />
          </Form.Item>
          <Form.Item className="mb-0">
            <div className="flex justify-end space-x-2">
              <Button onClick={handleCancel}>Bekor qilish</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createSupplierMutation.isLoading || updateSupplierMutation.isLoading}
              >
                {editingSupplier ? "Yangilash" : "Qo'shish"}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Stats Modal */}
      <Modal
        title={`${selectedSupplier?.companyName} - Batafsil ma'lumotlar`}
        open={isStatsModalVisible}
        onCancel={handleCloseStats}
        footer={null}
        width={800}
      >
        {statsLoading ? (
          <LoadingSpinner />
        ) : statsData ? (
          <div className="space-y-4">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Firma nomi">
                {statsData.supplier.companyName}
              </Descriptions.Item>
              <Descriptions.Item label="Mas'ul shaxs">
                {statsData.supplier.responsiblePerson}
              </Descriptions.Item>
              <Descriptions.Item label="Telefon">
                {statsData.supplier.phone}
              </Descriptions.Item>
              <Descriptions.Item label="Manzil">
                {statsData.supplier.address}
              </Descriptions.Item>
              <Descriptions.Item label="Jami yetkazib berilgan og'irlik">
                <Tag color="blue" style={{ fontSize: '14px', padding: '4px 8px' }}>
                  {formatNumber(statsData.stats.totalWeight)} kg
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Jami yetkazib berilganlar soni">
                <Tag color="green" style={{ fontSize: '14px', padding: '4px 8px' }}>
                  {statsData.stats.totalDeliveries} marta
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-3">Mahsulotlar bo'yicha ma'lumotlar</h3>
              {statsData.stats.materialStats.length > 0 ? (
                <Collapse>
                  {statsData.stats.materialStats.map((material: any, index: number) => (
                    <Panel
                      key={index}
                      header={
                        <div className="flex items-center justify-between">
                          <span>
                            <DatabaseOutlined className="mr-2" />
                            {material.materialName}
                          </span>
                          <Space>
                            <Tag color="blue">
                              {formatNumber(material.totalWeight)} kg
                            </Tag>
                            <Tag color="green">
                              {material.deliveryCount} marta
                            </Tag>
                          </Space>
                        </div>
                      }
                    >
                      <Table
                        size="small"
                        dataSource={material.deliveries}
                        rowKey={(record, idx) => `${record.date}-${idx}`}
                        pagination={false}
                        columns={[
                          {
                            title: 'Sana',
                            dataIndex: 'date',
                            key: 'date',
                            render: (date: string) => (
                              <div className="flex items-center">
                                <CalendarOutlined className="mr-2" />
                                {formatDate(date)}
                              </div>
                            ),
                          },
                          {
                            title: "Og'irlik (kg)",
                            dataIndex: 'weight',
                            key: 'weight',
                            render: (weight: number) => formatNumber(weight),
                          },
                          {
                            title: 'Izoh',
                            dataIndex: 'comment',
                            key: 'comment',
                            render: (comment: string) => comment || '-',
                          },
                        ]}
                      />
                    </Panel>
                  ))}
                </Collapse>
              ) : (
                <Empty description="Ma'lumotlar topilmadi" />
              )}
            </div>
          </div>
        ) : (
          <Empty description="Ma'lumotlar yuklanmoqda..." />
        )}
      </Modal>
    </div>
  );
};

export default SuppliersPage;