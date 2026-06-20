import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Button,
  Input,
  InputNumber,
  Space,
  Modal,
  Form,
  Popconfirm,
  Tooltip,
  DatePicker,
  Statistic,
  Row,
  Col,
  Select,
  AutoComplete,
} from "antd";
import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DatabaseOutlined,
  UserOutlined,
  CalendarOutlined,
  RightOutlined,
  DownloadOutlined,
  PrinterOutlined,
  ReloadOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { exportToExcel } from "@/utils/excelUtils";
import { usePaginatedQuery, useApiMutation } from "@/hooks/useApi";
import { useSocket } from "@/hooks/useSocket";
import { materialService } from "@/services/materialService";
import { supplierService } from "@/services/supplierService";
import { clientService } from "@/services/clientService";
import {
  RawMaterialIntake,
  CreateMaterialRequest,
  UpdateMaterialRequest,
  MaterialIntakeRecord,
} from "@/types";
import { formatDate, formatNumber, inputNumberFormatter, inputNumberParser } from "@/utils";
import { printBatch } from "@/utils/printBatch";
import LoadingSpinner from "@/components/LoadingSpinner";
import dayjs from "dayjs";
import { useReactToPrint } from "react-to-print";
import { PrintableTable } from "@/components/PrintableTable";
import { BatchCreateModal } from "@/components/BatchCreateModal"; // Added import

const { Option } = Select;
const { Search } = Input;

const MaterialsPage: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isBatchModalVisible, setIsBatchModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isAddIntakeModalVisible, setIsAddIntakeModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] =
    useState<RawMaterialIntake | null>(null);
  const [viewingMaterial, setViewingMaterial] =
    useState<RawMaterialIntake | null>(null);
  const [selectedMaterialForIntake, setSelectedMaterialForIntake] =
    useState<RawMaterialIntake | null>(null);

  // Thread suggestions state
  const [threadTypes, setThreadTypes] = useState<string[]>([]);
  const [threadNumbers, setThreadNumbers] = useState<string[]>([]);

  const [form] = Form.useForm();
  const [intakeForm] = Form.useForm();
  const navigate = useNavigate();
  const componentRef = React.useRef<HTMLDivElement>(null);
  const materialDetailRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const handlePrintMaterialDetail = useReactToPrint({
    content: () => materialDetailRef.current,
  });

  // Query for materials
  const {
    data: materialsData,
    isLoading,
    refetch,
  } = usePaginatedQuery(
    ["materials"],
    (params) => materialService.getAll(params),
    {
      page: 1,
      limit: 10,
      search: searchText,
    }
  );

  // Setup Socket.IO for real-time stock updates
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !socket.connected) {
      return;
    }

    const handleStockUpdate = () => {
      refetch();
    };

    socket.on("stock:updated", handleStockUpdate);

    return () => {
      socket.off("stock:updated", handleStockUpdate);
    };
  }, [socket, refetch]);

  // Load thread suggestions
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const [typesRes, numbersRes] = await Promise.all([
          materialService.getThreadSuggestions("THREAD_TYPE"),
          materialService.getThreadSuggestions("THREAD_NUMBER"),
        ]);
        if (typesRes.success && typesRes.data) {
          setThreadTypes(typesRes.data.suggestions || []);
        }
        if (numbersRes.success && numbersRes.data) {
          setThreadNumbers(numbersRes.data.suggestions || []);
        }
      } catch (error) {
        console.error("Failed to load suggestions:", error);
      }
    };
    loadSuggestions();
  }, []);

  // Query for suppliers
  const { data: suppliersData } = usePaginatedQuery(
    ["suppliers"],
    (params) => supplierService.getAll(params),
    { page: 1, limit: 100 }
  );

  // Create material mutation
  const createMaterialMutation = useApiMutation(
    (data: CreateMaterialRequest) => materialService.create(data),
    {
      successMessage: "Xom ashyo muvaffaqiyatli qo'shildi",
      invalidateQueries: ["materials"],
      onSuccess: async () => {
        setIsModalVisible(false);
        form.resetFields();
        // Reload suggestions
        const [typesRes, numbersRes] = await Promise.all([
          materialService.getThreadSuggestions("THREAD_TYPE"),
          materialService.getThreadSuggestions("THREAD_NUMBER"),
        ]);
        if (typesRes.success && typesRes.data) {
          setThreadTypes(typesRes.data.suggestions || []);
        }
        if (numbersRes.success && numbersRes.data) {
          setThreadNumbers(numbersRes.data.suggestions || []);
        }
      },
    }
  );

  // Update material mutation
  const updateMaterialMutation = useApiMutation(
    ({ id, data }: { id: string; data: UpdateMaterialRequest }) =>
      materialService.update(id, data),
    {
      successMessage: "Xom ashyo muvaffaqiyatli yangilandi",
      invalidateQueries: ["materials"],
      onSuccess: () => {
        setIsModalVisible(false);
        setEditingMaterial(null);
        form.resetFields();
      },
    }
  );

  // Delete material mutation
  const deleteMaterialMutation = useApiMutation(
    (id: string) => materialService.remove(id),
    {
      successMessage: "Xom ashyo muvaffaqiyatli o'chirildi",
      invalidateQueries: ["materials"],
    }
  );

  // Add intake mutation
  const addIntakeMutation = useApiMutation(
    ({ id, data }: { id: string; data: { weightKg: number; date?: string; comment?: string } }) =>
      materialService.addIntake(id, data),
    {
      successMessage: "Qo'shimcha qabul muvaffaqiyatli qo'shildi",
      invalidateQueries: ["materials"],
      onSuccess: async (response) => {
        setIsAddIntakeModalVisible(false);
        intakeForm.resetFields();
        // Update viewing material with new data
        if (response.data?.material) {
          setViewingMaterial(response.data.material);
        }
      },
    }
  );

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  // Handle form submit
  const handleSubmit = async (values: any) => {
    const materialData = {
      threadType: values.threadType,
      threadNumber: values.threadNumber,
      supplier: values.supplier,
      totalWeightKg: Number(values.totalWeightKg),
      date: values.date?.toISOString(),
      comment: values.comment,
    };

    if (editingMaterial) {
      await updateMaterialMutation.mutateAsync({
        id: editingMaterial._id,
        data: materialData,
      });
    } else {
      await createMaterialMutation.mutateAsync(materialData);
    }
  };

  // Handle edit
  const handleEdit = (material: RawMaterialIntake) => {
    setEditingMaterial(material);
    form.setFieldsValue({
      threadType: material.threadType,
      threadNumber: material.threadNumber,
      supplier: material.supplier,
      totalWeightKg: material.totalWeightKg,
      date: material.date ? dayjs(material.date) : null,
      comment: material.comment,
    });
    setIsModalVisible(true);
  };

  // Handle view - fetch full material data with intakes
  const handleView = async (material: RawMaterialIntake) => {
    try {
      const response = await materialService.getById(material._id);
      if (response.success && response.data) {
        setViewingMaterial((response.data as any).material || response.data);
      } else {
        setViewingMaterial(material);
      }
    } catch (error) {
      setViewingMaterial(material);
    }
    setIsViewModalVisible(true);
  };

  // Handle add intake
  const handleAddIntake = (material: RawMaterialIntake) => {
    setSelectedMaterialForIntake(material);
    intakeForm.setFieldsValue({
      date: dayjs(),
    });
    setIsAddIntakeModalVisible(true);
  };

  // Handle add intake submit
  const handleAddIntakeSubmit = async (values: any) => {
    if (!selectedMaterialForIntake) return;

    await addIntakeMutation.mutateAsync({
      id: selectedMaterialForIntake._id,
      data: {
        weightKg: Number(values.weightKg),
        date: values.date?.toISOString(),
        comment: values.comment,
      },
    });
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    await deleteMaterialMutation.mutateAsync(id);
  };

  // Table columns
  const columns = [
    {
      title: "Ip turi",
      dataIndex: "threadType",
      key: "threadType",
      render: (text: string, record: RawMaterialIntake) => (
        <div className="flex items-center">
          <DatabaseOutlined className="mr-2 text-blue-500" />
          <span className="font-medium">{text || record.name}</span>
        </div>
      ),
    },
    {
      title: "Ip raqami",
      dataIndex: "threadNumber",
      key: "threadNumber",
      render: (text: string) => (
        <span className="font-medium text-purple-600">{text && "-"}</span>
      ),
    },
    {
      title: "Yetkazib beruvchi",
      dataIndex: "supplier",
      key: "supplier",
      render: (text: string) => (
        <div className="flex items-center">
          <UserOutlined className="mr-2 text-green-500" />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: "Jami og'irlik",
      dataIndex: "totalWeightKg",
      key: "totalWeightKg",
      render: (weight: number) => (
        <div className="flex items-center">
          <RightOutlined className="mr-1 text-orange-500" />
          <span className="font-medium">{formatNumber(weight)} kg</span>
        </div>
      ),
    },
    {
      title: "Sana",
      dataIndex: "date",
      key: "date",
      render: (date: string) => (
        <div className="flex items-center">
          <CalendarOutlined className="mr-1 text-gray-400" />
          {formatDate(date)}
        </div>
      ),
    },
    {
      title: "Amallar",
      key: "actions",
      render: (record: RawMaterialIntake) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Ko'rish va tarix">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Qo'shimcha qabul">
            <Button
              type="text"
              icon={<PlusOutlined />}
              size="small"
              className="text-green-600"
              onClick={() => handleAddIntake(record)}
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
              title="Xom ashyoni o'chirishni xohlaysizmi?"
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

  // Calculate statistics
  const totalWeight =
    materialsData?.data?.reduce(
      (sum, material) => sum + material.totalWeightKg,
      0
    ) || 0;

  const uniqueSuppliers =
    new Set(materialsData?.data?.map((m: RawMaterialIntake) => m.supplier))
      .size || 0;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold m-0">Xom ashyo qabul qilish</h1>
        <Space wrap className="w-full md:w-auto justify-center md:justify-end">
          <Button icon={<ReloadOutlined />} onClick={refetch}>Yangilash</Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Chop etish
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => {
              const dataToExport = materialsData?.data?.map((m: RawMaterialIntake) => ({
                "Ip turi": m.threadType || m.name,
                "Ip raqami": m.threadNumber || "",
                "Yetkazib beruvchi": m.supplier,
                "Jami og'irlik (kg)": m.totalWeightKg,
                "Sana": formatDate(m.date),
                "Izohlar": m.comment || "",
              })) || [];
              exportToExcel(dataToExport, "Xom_ashyo_bazasi", [
                { wch: 25 },
                { wch: 15 },
                { wch: 25 },
                { wch: 15 },
                { wch: 15 },
                { wch: 50 },
              ]);
            }}
          >
            Excelga yuklash
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
            Yangi xom ashyo
          </Button>
        </Space>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Jami og'irlik"
              value={totalWeight}
              precision={0}
              valueStyle={{ color: "#1890ff" }}
              prefix={<RightOutlined />}
              suffix="kg"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Yetkazib beruvchilar"
              value={uniqueSuppliers}
              valueStyle={{ color: "#722ed1" }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Jami kirimlar"
              value={materialsData?.pagination?.total || 0}
              valueStyle={{ color: "#52c41a" }}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Search and Filters */}
      <Card className="shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <Search
            placeholder="Ip turi, ip raqami yoki yetkazib beruvchi bo'yicha qidirish..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={handleSearch}
            className="w-full md:max-w-md"
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className="w-full md:w-auto"
            onClick={() => setIsBatchModalVisible(true)}
          >
            Partiya yaratish
          </Button>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          Jami: {materialsData?.pagination?.total || 0} kirim
        </div>
      </Card>
            
      {/* Materials Table */}
      <Card className="shadow-sm">
        <Table
          columns={columns}
          dataSource={materialsData?.data || []}
          rowKey="_id"
          scroll={{ x: 800 }}
          onRow={(record) => ({
            onClick: () => handleView(record),
            style: { cursor: "pointer" },
          })}
          pagination={{
            current: materialsData?.pagination?.page || 1,
            pageSize: materialsData?.pagination?.limit || 10,
            total: materialsData?.pagination?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} dan ${total} ta`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          onChange={() => {
            refetch();
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={
          editingMaterial ? "Xom ashyoni tahrirlash" : "Yangi xom ashyo kirimi"
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingMaterial(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            threadType: "",
            threadNumber: "",
            supplier: "",
            totalWeightKg: 0,
            date: dayjs(),
            comment: "",
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="threadType"
                label="Ip turi"
                rules={[
                  { required: true, message: "Iltimos, ip turini kiriting!" },
                ]}
              >
                <AutoComplete
                  options={threadTypes.map(t => ({ value: t }))}
                  placeholder="Ip turini kiriting"
                  filterOption={(input, option) =>
                    (option?.value ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="threadNumber"
                label="Ip raqami"
                rules={[
                  { required: true, message: "Iltimos, ip raqamini kiriting!" },
                ]}
              >
                <AutoComplete
                  options={threadNumbers.map(t => ({ value: t }))}
                  placeholder="Ip raqamini kiriting"
                  filterOption={(input, option) =>
                    (option?.value ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="supplier"
            label="Yetkazib beruvchi"
            rules={[
              {
                required: true,
                message: "Iltimos, yetkazib beruvchini tanlang!",
              },
            ]}
          >
            <Select
              placeholder="Yetkazib beruvchini tanlang"
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
            >
              {(suppliersData?.data || []).map((supplier: any) => (
                <Option
                  key={supplier._id}
                  value={supplier.companyName}
                  label={supplier.companyName}
                >
                  {supplier.companyName} {supplier.responsiblePerson && `(${supplier.responsiblePerson})`}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="totalWeightKg"
                label="Jami og'irlik (kg)"
                rules={[
                  { required: true, message: "Iltimos, og'irlikni kiriting!" },
                ]}
              >
                <InputNumber
                  placeholder="0"
                  min={0}
                  step={0.1}
                  className="w-full"
                  formatter={inputNumberFormatter}
                  parser={inputNumberParser}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Sana"
                rules={[{ required: true, message: "Iltimos, sanani kiriting!" }]}
              >
                <DatePicker
                  placeholder="Sanani tanlang"
                  format="DD.MM.YYYY"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="comment" label="Izohlar">
            <Input.TextArea placeholder="Qo'shimcha ma'lumotlar..." rows={3} />
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex justify-end space-x-2">
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingMaterial(null);
                  form.resetFields();
                }}
              >
                Bekor qilish
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={
                  createMaterialMutation.isLoading ||
                  updateMaterialMutation.isLoading
                }
              >
                {editingMaterial ? "Yangilash" : "Qo'shish"}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Material Modal with Intake History */}
      <Modal
        title="Xom ashyo ma'lumotlari"
        open={isViewModalVisible}
        onCancel={() => {
          setIsViewModalVisible(false);
          setViewingMaterial(null);
        }}
        footer={[
          <Button
            key="print"
            icon={<PrinterOutlined />}
            onClick={handlePrintMaterialDetail}
          >
            Chop etish
          </Button>,
          <Button
            key="add-intake"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              if (viewingMaterial) {
                handleAddIntake(viewingMaterial);
              }
            }}
          >
            Qo'shimcha qabul
          </Button>,
          <Button
            key="close"
            onClick={() => {
              setIsViewModalVisible(false);
              setViewingMaterial(null);
            }}
          >
            Yopish
          </Button>,
        ]}
        width={700}
      >
        {viewingMaterial && (
          <div className="space-y-6">
            {/* Material Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Ip turi</p>
                <p className="font-medium">{viewingMaterial.threadType || viewingMaterial.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ip raqami</p>
                <p className="font-medium">{viewingMaterial.threadNumber || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Yetkazib beruvchi</p>
                <p className="font-medium">{viewingMaterial.supplier}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Umumiy og'irligi</p>
                <p className="font-bold text-lg text-blue-600">{formatNumber(viewingMaterial.totalWeightKg)} kg</p>
              </div>
            </div>

            {/* Intake History */}
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <CalendarOutlined className="mr-2" />
                Qabul tarixi ({viewingMaterial.intakes?.length || 1} marta)
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-3 font-medium">#</th>
                      <th className="text-left p-3 font-medium">Sana</th>
                      <th className="text-right p-3 font-medium">Og'irlik (kg)</th>
                      <th className="text-left p-3 font-medium">Izoh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingMaterial.intakes && viewingMaterial.intakes.length > 0 ? (
                      viewingMaterial.intakes.map((intake: MaterialIntakeRecord, index: number) => (
                        <tr key={intake._id}>
                          <td className="p-3 text-gray-500">{index + 1}</td>
                          <td className="p-3">
                            <div className="flex items-center">
                              <CalendarOutlined className="mr-2 text-gray-400" />
                              {formatDate(intake.date)}
                            </div>
                          </td>
                          <td className="p-3 text-right font-medium text-green-600">
                            +{formatNumber(intake.weightKg)} kg
                          </td>
                          <td className="p-3 text-gray-500">{intake.comment || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-3 text-gray-500">1</td>
                        <td className="p-3">
                          <div className="flex items-center">
                            <CalendarOutlined className="mr-2 text-gray-400" />
                            {formatDate(viewingMaterial.date)}
                          </div>
                        </td>
                        <td className="p-3 text-right font-medium text-green-600">
                          +{formatNumber(viewingMaterial.totalWeightKg)} kg
                        </td>
                        <td className="p-3 text-gray-500">{viewingMaterial.comment || "-"}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-100 font-bold">
                      <td colSpan={2} className="p-3 font-medium">Jami:</td>
                      <td className="p-3 text-right font-bold text-blue-600">
                        {formatNumber(viewingMaterial.totalWeightKg)} kg
                      </td>
                      <td className="p-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Intake Modal */}
      <Modal
        title={
          <span>
            Qo'shimcha qabul -{" "}
            <span className="text-blue-600">
              {selectedMaterialForIntake?.threadType} - {selectedMaterialForIntake?.threadNumber}
            </span>
          </span>
        }
        open={isAddIntakeModalVisible}
        onCancel={() => {
          setIsAddIntakeModalVisible(false);
          setSelectedMaterialForIntake(null);
          intakeForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Joriy umumiy og'irlik:</p>
          <p className="font-bold text-lg text-blue-600">
            {formatNumber(selectedMaterialForIntake?.totalWeightKg || 0)} kg
          </p>
        </div>

        <Form
          form={intakeForm}
          layout="vertical"
          onFinish={handleAddIntakeSubmit}
          initialValues={{
            date: dayjs(),
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="weightKg"
                label="Qo'shiladigan og'irlik (kg)"
                rules={[
                  { required: true, message: "Iltimos, og'irlikni kiriting!" },
                ]}
              >
                <InputNumber
                  placeholder="0"
                  min={0.1}
                  step={0.1}
                  className="w-full"
                  formatter={inputNumberFormatter}
                  parser={inputNumberParser}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Qabul sanasi"
                rules={[{ required: true, message: "Iltimos, sanani kiriting!" }]}
              >
                <DatePicker
                  placeholder="Sanani tanlang"
                  format="DD.MM.YYYY"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="comment" label="Izoh">
            <Input.TextArea placeholder="Qo'shimcha ma'lumotlar..." rows={2} />
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex justify-end space-x-2">
              <Button
                onClick={() => {
                  setIsAddIntakeModalVisible(false);
                  setSelectedMaterialForIntake(null);
                  intakeForm.resetFields();
                }}
              >
                Bekor qilish
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={addIntakeMutation.isLoading}
                icon={<PlusOutlined />}
              >
                Qo'shish
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Printable Material Detail */}
      <div style={{ display: "none" }}>
        <div ref={materialDetailRef} className="p-8 bg-white">
          {viewingMaterial && (
            <>
              {/* Header */}
              <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                <h1 className="text-2xl font-bold">XOM ASHYO MA'LUMOTLARI</h1>
                <p className="text-gray-600 mt-1">Chop etilgan sana: {new Date().toLocaleDateString()}</p>
              </div>

              {/* Material Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 border border-gray-300 rounded">
                <div>
                  <p className="text-sm text-gray-600">Ip turi:</p>
                  <p className="font-bold text-lg">{viewingMaterial.threadType || viewingMaterial.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ip raqami:</p>
                  <p className="font-bold text-lg">{viewingMaterial.threadNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Yetkazib beruvchi:</p>
                  <p className="font-bold text-lg">{viewingMaterial.supplier}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Umumiy og'irlik:</p>
                  <p className="font-bold text-xl text-blue-700">{formatNumber(viewingMaterial.totalWeightKg)} kg</p>
                </div>
              </div>

              {/* Intake History Table */}
              <div className="mb-4">
                <h2 className="text-lg font-bold mb-3">
                  Qabul tarixi ({viewingMaterial.intakes?.length || 1} marta)
                </h2>
                <table className="w-full border-collapse border border-gray-400">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="border border-gray-400 p-2 text-left w-12">#</th>
                      <th className="border border-gray-400 p-2 text-left">Sana</th>
                      <th className="border border-gray-400 p-2 text-right">Og'irlik (kg)</th>
                      <th className="border border-gray-400 p-2 text-left">Izoh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingMaterial.intakes && viewingMaterial.intakes.length > 0 ? (
                      viewingMaterial.intakes.map((intake: MaterialIntakeRecord, index: number) => (
                        <tr key={intake._id}>
                          <td className="border border-gray-400 p-2">{index + 1}</td>
                          <td className="border border-gray-400 p-2">{formatDate(intake.date)}</td>
                          <td className="border border-gray-400 p-2 text-right font-medium">
                            +{formatNumber(intake.weightKg)} kg
                          </td>
                          <td className="border border-gray-400 p-2">{intake.comment || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="border border-gray-400 p-2">1</td>
                        <td className="border border-gray-400 p-2">{formatDate(viewingMaterial.date)}</td>
                        <td className="border border-gray-400 p-2 text-right font-medium">
                          +{formatNumber(viewingMaterial.totalWeightKg)} kg
                        </td>
                        <td className="border border-gray-400 p-2">{viewingMaterial.comment || "-"}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-100 font-bold">
                      <td colSpan={2} className="border border-gray-400 p-2">Jami:</td>
                      <td className="border border-gray-400 p-2 text-right text-blue-700">
                        {formatNumber(viewingMaterial.totalWeightKg)} kg
                      </td>
                      <td className="border border-gray-400 p-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-gray-300 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Tizim tomonidan avtomatik yaratilgan hujjat</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Printable Materials List */}
      <div style={{ display: "none" }}>
        <PrintableTable
          ref={componentRef}
          title="Xom ashyo kirimlari"
          columns={[
            { title: "Ip turi", dataIndex: "threadType", render: (val, record) => val || record.name },
            { title: "Ip raqami", dataIndex: "threadNumber" },
            { title: "Yetkazib beruvchi", dataIndex: "supplier" },
            {
              title: "Jami og'irlik (kg)",
              dataIndex: "totalWeightKg",
              render: (val) => formatNumber(val),
            },
            {
              title: "Sana",
              dataIndex: "date",
              render: (val) => formatDate(val),
            },
            { title: "Izohlar", dataIndex: "comment" },
          ]}
          data={materialsData?.data || []}
        />
      </div>

      {/* Shared Create Batch Modal Component */}
      <BatchCreateModal
        open={isBatchModalVisible}
        onClose={() => setIsBatchModalVisible(false)}
        onSuccess={(batch) => {
          navigate("/batches", { state: { printBatch: batch } });
        }}
      />
    </div>
  );
};

export default MaterialsPage;