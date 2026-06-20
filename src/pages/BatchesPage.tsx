import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Space,
  Tag,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Modal,
  Form,
  message,
  Alert,
  Tooltip,
  Descriptions,
  InputRef,
  Popconfirm,
  AutoComplete,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  ScanOutlined,
  FileExcelOutlined,

  EyeOutlined,
  PrinterOutlined,
  DeleteOutlined,
  PlusOutlined,
  BarcodeOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { usePaginatedQuery, useApiMutation } from "@/hooks/useApi";
import { batchService, Batch } from "@/services/batchService";
import { materialService } from "@/services/materialService";
import { clientService } from "@/services/clientService";
import { formatDateTime, formatNumber, inputNumberFormatter, inputNumberParser } from "@/utils";
import { exportToExcel } from "@/utils/excelUtils";
import { printBatch } from "@/utils/printBatch";
import { printBatchList } from "@/utils/printBatchList";
import dayjs, { Dayjs } from "dayjs";
import { useAuthStore } from "@/store/authStore";
import { BatchCreateModal } from "@/components/BatchCreateModal"; // Added import
import { useLocation } from "react-router-dom";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Search } = Input;

const BatchesPage: React.FC = () => {
  const { user } = useAuthStore();
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const inputRef = useRef<InputRef>(null);

  // Check if user can delete/edit batches (DIRECTOR and MANAGER)
  const canDeleteBatch = user?.role === "DIRECTOR" || user?.role === "MANAGER";
  const canEditBatch = user?.role === "DIRECTOR" || user?.role === "MANAGER";

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isBatchModalVisible, setIsBatchModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  // Common data for Edit form
  const [colorNames, setColorNames] = useState<string[]>([]);
  const [colorCodes, setColorCodes] = useState<string[]>([]);
  const [availableThreadTypes, setAvailableThreadTypes] = useState<string[]>([]);
  const [availableThreadNumbers, setAvailableThreadNumbers] = useState<Array<{
    threadType: string;
    threadNumber: string;
    availableWeight: number;
  }>>([]);

  // Edit form state
  const [editSelectedThreadType, setEditSelectedThreadType] = useState<string>("");
  const [editMaxWeight, setEditMaxWeight] = useState<number>(0);

  // Fetch batches with pagination
  const {
    data: batchesData,
    isLoading,
    refetch,
  } = usePaginatedQuery(
    ["batches", searchText, statusFilter],
    (params) =>
      batchService.getAll({
        ...params,
        search: searchText,
        status: statusFilter,
        startDate: dateRange?.[0]?.toISOString(),
        endDate: dateRange?.[1]?.toISOString(),
      }),
    {
      page: 1,
      limit: 20,
    }
  );

  const batches = (batchesData?.data || []) as Batch[];
  const pagination = batchesData?.pagination;

  // Fetch batch stats
  const { data: statsData, refetch: refetchStats } = usePaginatedQuery(
    ["batchStats"],
    () => batchService.getBatchStats(),
    {}
  );

  // Query for clients (needed for Edit form)
  const { data: clientsData } = usePaginatedQuery(
    ["clients"],
    (params) => clientService.getAll(params),
    { page: 1, limit: 100 }
  );

  // Load common data for Edit form
  const loadBatchFormData = async () => {
    try {
      const [colorNamesRes, colorCodesRes, availableMaterialsRes] = await Promise.all([
        batchService.getBatchSuggestions("COLOR_NAME"),
        batchService.getBatchSuggestions("COLOR_CODE"),
        materialService.getAvailableMaterials(),
      ]);
      if (colorNamesRes.success && colorNamesRes.data) {
        setColorNames(colorNamesRes.data.suggestions || []);
      }
      if (colorCodesRes.success && colorCodesRes.data) {
        setColorCodes(colorCodesRes.data.suggestions || []);
      }
      if (availableMaterialsRes.success && availableMaterialsRes.data) {
        setAvailableThreadTypes(availableMaterialsRes.data.threadTypes || []);
        setAvailableThreadNumbers(availableMaterialsRes.data.threadNumbers || []);
      }
    } catch (error) {
      console.error("Failed to load batch form data:", error);
    }
  };

  // --- Handlers for Edit Form ---
  const handleEditThreadTypeChange = (value: string) => {
    setEditSelectedThreadType(value);
    editForm.setFieldValue("threadNumber", undefined);
    setEditMaxWeight(0);
  };

  const handleEditThreadNumberChange = (value: string) => {
    const material = availableThreadNumbers.find(
      m => m.threadType === editSelectedThreadType && m.threadNumber === value
    );

    // If the selected material is the same as the original batch material, add its weight to available max
    let available = material ? material.availableWeight : 0;
    if (editingBatch && editingBatch.threadType === editSelectedThreadType && editingBatch.threadNumber === value) {
      available += editingBatch.weightKg;
    }
    setEditMaxWeight(available);
  };

  const filteredEditThreadNumbers = availableThreadNumbers.filter(
    m => m.threadType === editSelectedThreadType
  );


  // Mutations
  const scanBatchMutation = useApiMutation(
    (batchCode: string) => batchService.scanBatch(batchCode),
    {
      successMessage: "Partiya topildi",
      onSuccess: (data) => {
        setScanResult(data);
        scanForm.setFieldsValue({ batchCode: "" });
        setTimeout(() => inputRef.current?.focus(), 100);
      },
      onError: () => {
        message.error("Partiya topilmadi");
        setScanResult(null);
        setTimeout(() => inputRef.current?.focus(), 100);
      },
    }
  );

  const deleteBatchMutation = useApiMutation(
    (id: string) => batchService.remove(id),
    {
      successMessage: "Partiya o'chirildi",
      invalidateQueries: ["batches", "batchStats"],
    }
  );

  const updateBatchMutation = useApiMutation(
    ({ id, data }: { id: string; data: any }) => batchService.update(id, data),
    {
      successMessage: "Partiya muvaffaqiyatli yangilandi",
      invalidateQueries: ["batches", "batchStats"],
      onSuccess: async () => {
        setIsEditModalVisible(false);
        setEditingBatch(null);
        editForm.resetFields();
        await loadBatchFormData(); // Refresh available materials stock
      },
    }
  );

  const handleEditSubmit = async (values: any) => {
    if (editingBatch) {
      const selectedClient = clientsData?.data?.find((c: any) => c._id === values.clientId);
      const batchData: any = {
        threadType: values.threadType,
        threadNumber: values.threadNumber,
        colorName: values.colorName,
        colorCode: values.colorCode,
        weightKg: Number(values.weightKg),
        conesCount: values.conesCount ? Number(values.conesCount) : "", // passing empty string to clear if needed
        status: values.status,
        comment: values.comment,
        clientId: values.clientId || "",
        clientName: selectedClient ? selectedClient.name : undefined,
        date: values.date?.toISOString(),
      };
      await updateBatchMutation.mutateAsync({
        id: editingBatch._id,
        data: batchData,
      });
    }
  };

  // Actions
  const handleScanBatch = async (values: { batchCode: string }) => {
    scanBatchMutation.mutate(values.batchCode);
  };

  const handleView = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsViewModalVisible(true);
  };

  const handleEdit = async (batch: Batch) => {
    await loadBatchFormData(); // Ensure we have latest materials before editing
    setEditingBatch(batch);
    setEditSelectedThreadType(batch.threadType);

    editForm.setFieldsValue({
      threadType: batch.threadType,
      threadNumber: batch.threadNumber,
      clientId: batch.clientId,
      colorName: batch.colorName,
      colorCode: batch.colorCode,
      weightKg: batch.weightKg,
      conesCount: batch.conesCount,
      status: batch.status,
      comment: batch.comment,
      date: batch.date ? dayjs(batch.date) : dayjs(),
    });
    setIsEditModalVisible(true);
  };

  // This effect ensures editMaxWeight is calculated accurately after availableThreadNumbers loads
  useEffect(() => {
    if (isEditModalVisible && editingBatch) {
      const material = availableThreadNumbers.find(
        m => m.threadType === editingBatch.threadType && m.threadNumber === editingBatch.threadNumber
      );
      let available = material ? material.availableWeight : 0;
      if (editSelectedThreadType === editingBatch.threadType && editForm.getFieldValue("threadNumber") === editingBatch.threadNumber) {
        available += editingBatch.weightKg;
      }
      setEditMaxWeight(available);
    }
  }, [availableThreadNumbers, isEditModalVisible, editingBatch, editSelectedThreadType]);

  const handlePrintSelected = (batch: Batch) => {
    printBatch(batch);
  };
  const handleExportExcel = () => {
    const exportData = batches.map((batch) => {
      const { totalNetto, diff } = getPackageTotals(batch);
      const base = batch.weightKg || 0;
      const percent = base > 0 ? (diff / base) * 100 : 0;
      const sign = diff > 0 ? "+" : "";

      return {
        "Partiya raqami": batch.batchNumber || "",
        "Ip turi": batch.threadType || "",
        "Ip raqami": batch.threadNumber || "",
        "Rang nomi": batch.colorName || "",
        "Rang kodi": batch.colorCode || "",
        "Mijoz": batch.clientName || "-",
        "Kirish (kg)": batch.weightKg || 0,
        "Chiqish (kg)": totalNetto,
        "Farq (kg)": diff,
        "Farq (%)": `${sign}${formatNumber(percent, 1)}%`,
        "Holati": statusLabels[batch.status] || batch.status,
        "Sana": batch.date ? formatDateTime(batch.date) : "-",
      };
    });

    const columnWidths = [
      { wch: 14 }, // Partiya raqami
      { wch: 12 }, // Ip turi
      { wch: 12 }, // Ip raqami
      { wch: 14 }, // Rang nomi
      { wch: 12 }, // Rang kodi
      { wch: 20 }, // Mijoz
      { wch: 12 }, // Kirish
      { wch: 12 }, // Chiqish
      { wch: 12 }, // Farq kg
      { wch: 12 }, // Farq %
      { wch: 14 }, // Holati
      { wch: 18 }, // Sana
    ];

    exportToExcel(exportData, `Partiyalar_${dayjs().format("DD.MM.YYYY")}`, columnWidths);
  };
  // Status mappings
  const statusColors: Record<string, string> = {
    CREATED: "blue",
    PROCESSING: "orange",
    WRAPPING: "cyan",
    WRAPPED: "geekblue",
    COMPLETED: "green",
    SHIPPED: "purple",
    RETURNED: "red",
  };

  const statusLabels: Record<string, string> = {
    CREATED: "Yaratilgan",
    PROCESSING: "Jarayonda",
    WRAPPING: "Qoplanmoqda",
    WRAPPED: "Qoplangan",
    COMPLETED: "Tayyor",
    SHIPPED: "Yuborilgan",
    RETURNED: "Qaytarilgan",
  };

  const getPackageTotals = (batch: Batch) => {
    const totalNetto = (batch.packages || []).reduce((sum, pkg) => sum + (pkg.nettoKg || 0), 0);
    const diff = totalNetto - (batch.weightKg || 0);
    return { totalNetto, diff };
  };

  // Columns
  const columns = [
    {
      title: "Partiya raqami",
      dataIndex: "batchNumber",
      key: "batchNumber",
      render: (batchNumber: string) => (
        <span className="font-mono font-bold text-blue-600 text-lg">{batchNumber}</span>
      ),
    },
    {
      title: "Ip turi / Raqami",
      key: "thread",
      render: (record: Batch) => (
        <div>
          <div className="font-medium">{record.threadType}</div>
          <div className="text-gray-500 text-sm">{record.threadNumber}</div>
        </div>
      ),
    },
    {
      title: "Rang",
      key: "color",
      render: (record: Batch) => (
        <div>
          <div className="font-medium">{record.colorName}</div>
          <div className="text-gray-500 text-sm">({record.colorCode})</div>
        </div>
      ),
    },
    {
      title: "Mijoz",
      dataIndex: "clientName",
      key: "clientName",
      render: (clientName: string) => clientName || "-",
    },
    {
      title: "Kirish",
      dataIndex: "weightKg",
      key: "weightKg",
      render: (weight: number) => (
        <span className="font-medium">{formatNumber(weight)} kg</span>
      ),
    },
    {
      title: "Chiqish",
      key: "packedWeight",
      render: (record: Batch) => {
        const { totalNetto } = getPackageTotals(record);
        return <span className="font-medium">{formatNumber(totalNetto)} kg</span>;
      },
    },
    {
      title: "Farq",
      key: "weightDiff",
      render: (record: Batch) => {
        const { diff } = getPackageTotals(record);
        const base = record.weightKg || 0;
        const percent = base > 0 ? (diff / base) * 100 : 0;
        const color = diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "";
        const sign = diff > 0 ? "+" : "";
        return (
          <span className={`font-medium ${color}`}>
            {sign}{formatNumber(diff)} kg
            <span className="text-gray-500 ml-2">({sign}{formatNumber(percent, 1)}%)</span>
          </span>
        );
      },
    },
    {
      title: "Sana",
      dataIndex: "date",
      key: "date",
      render: (date: string) => date ? formatDateTime(date) : "-",
    },
    {
      title: "Amallar",
      key: "actions",
      render: (record: Batch) => (
        <Space size="small">
          <Tooltip title="Ko'rish">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Chop etish">
            <Button
              type="text"
              icon={<PrinterOutlined />}
              size="small"
              onClick={() => handlePrintSelected(record)}
            />
          </Tooltip>
          {canEditBatch && (
            <Tooltip title="Tahrirlash">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
          )}
          {canDeleteBatch && (
            <Tooltip title="O'chirish">
              <Popconfirm
                title="Partiyani o'chirishni xohlaysizmi?"
                onConfirm={() => deleteBatchMutation.mutate(record._id)}
                okText="Ha"
                cancelText="Yo'q"
              >
                <Button type="text" icon={<DeleteOutlined />} size="small" danger />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const location = useLocation();

  useEffect(() => {
    console.log(location.state);

    if (location.state?.printBatch.batch) {
      printBatch(location.state.printBatch.batch, () => { });

      window.history.replaceState({}, "");
    }
  }, []);
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Partiyalar</h1>
          <p className="text-gray-600">Barcha partiyalar ro'yxati</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Yangilash
          </Button>
          <Button
            icon={<PrinterOutlined />}
            onClick={() => {
              const filterParts: string[] = [];
              if (searchText) filterParts.push(`Qidiruv: "${searchText}"`);
              if (statusFilter) filterParts.push(`Holat: ${statusFilter}`);
              if (dateRange) {
                filterParts.push(`Yangilangan sana: ${dateRange[0].format("DD.MM.YYYY")} - ${dateRange[1].format("DD.MM.YYYY")}`);
              }
              printBatchList(batches, {
                title: "Partiyalar ro'yxati",
                filterInfo: filterParts.length > 0 ? filterParts.join(" | ") : undefined,
              });
            }}
            disabled={batches.length === 0}
          >
            Ro'yxatni chop etish ({batches.length})
          </Button>
          <Button
            icon={<FileExcelOutlined />}
            onClick={handleExportExcel}
            disabled={batches.length === 0}
          >
            Excel ({batches.length})
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsBatchModalVisible(true)}
          >
            Yangi partiya
          </Button>
        </Space>
      </div>

      {/* Statistics */}
      <Row gutter={16}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Jami partiyalar"
              value={statsData?.totalBatches || pagination?.total || 0}
              valueStyle={{ color: "#1890ff" }}
              prefix={<BarcodeOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Yaratilgan"
              value={statsData?.createdBatches || 0}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Jarayonda"
              value={statsData?.processingBatches || 0}
              valueStyle={{ color: "#fa8c16" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Tayyor"
              value={statsData?.completedBatches || 0}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Scan Section */}
      <Card title="Partiyani skanerlash" size="small">
        <Form form={scanForm} onFinish={handleScanBatch} layout="inline">
          <Form.Item
            name="batchCode"
            rules={[{ required: true, message: "Partiya kodini kiriting" }]}
            className="flex-1"
          >
            <Input
              ref={inputRef}
              placeholder="Partiya kodini skaner qiling yoki kiriting"
              prefix={<ScanOutlined />}
              autoFocus
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={scanBatchMutation.isLoading}
              icon={<SearchOutlined />}
            >
              Qidirish
            </Button>
          </Form.Item>
        </Form>

        {/* Scan Result */}
        {scanResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <Alert
              message={scanResult.stageName}
              description={scanResult.message || "Partiya topildi"}
              type="success"
              showIcon
              className="mb-4"
            />
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Partiya kodi" span={2}>
                <span className="font-mono font-bold text-lg">
                  {scanResult.details?.batchNumber || scanResult.details?.batch}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Bosqich">
                <Tag color="blue">{scanResult.stageName}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Og'irlik">
                {formatNumber(scanResult.details?.weightKg || scanResult.details?.weight)} kg
              </Descriptions.Item>
            </Descriptions>
            <div className="mt-4">
              <Button onClick={() => setScanResult(null)}>Yangi qidiruv</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Search and Filters */}
      <Card size="small">
        <div className="flex flex-wrap gap-4 items-center">
          <Search
            placeholder="Partiya raqami, ip turi yoki rang bo'yicha qidirish..."
            allowClear
            onSearch={(value) => setSearchText(value)}
            className="w-64"
          />
          <Select
            placeholder="Holati"
            allowClear
            className="w-48"
            onChange={(value) => setStatusFilter(value)}
          >
            <Option value="CREATED">Yaratilgan</Option>
            <Option value="PROCESSING">Jarayonda</Option>
            <Option value="WRAPPING">Qoplanmoqda</Option>
            <Option value="WRAPPED">Qoplangan</Option>
            <Option value="COMPLETED">Tayyor</Option>
            <Option value="SHIPPED">Yuborilgan</Option>
          </Select>
          <RangePicker
            onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
          />
          <span className="text-gray-500">
            Jami: {pagination?.total || 0} partiya
          </span>
        </div>
      </Card>

      {/* Batches Table */}
      <Card>
        <Table
          size="small"
          className="batches-table"
          columns={columns}
          dataSource={batches}
          rowKey="_id"
          loading={isLoading}
          pagination={{
            current: pagination?.page || 1,
            pageSize: pagination?.limit || 20,
            total: pagination?.total || 0,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
          }}
          scroll={{ x: 1300 }}
        />
      </Card>

      {/* View Modal */}
      <Modal
        title={`Partiya: ${selectedBatch?.batchNumber}`}
        open={isViewModalVisible}
        onCancel={() => {
          setIsViewModalVisible(false);
          setSelectedBatch(null);
        }}
        footer={[
          <Button
            key="print"
            icon={<PrinterOutlined />}
            onClick={() => selectedBatch && handlePrintSelected(selectedBatch)}
          >
            Chop etish
          </Button>,
          <Button
            key="close"
            type="primary"
            onClick={() => setIsViewModalVisible(false)}
          >
            Yopish
          </Button>,
        ]}
        width={600}
      >
        {selectedBatch && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Partiya raqami">
              <span className="font-mono font-bold text-xl text-blue-600">
                {selectedBatch.batchNumber}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Ip turi">
              {selectedBatch.threadType}
            </Descriptions.Item>
            <Descriptions.Item label="Ip raqami">
              {selectedBatch.threadNumber}
            </Descriptions.Item>
            <Descriptions.Item label="Rang">
              {selectedBatch.colorName} ({selectedBatch.colorCode})
            </Descriptions.Item>
            <Descriptions.Item label="Mijoz">
              {selectedBatch.clientName || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Og'irlik">
              <span className="font-bold text-lg">
                {formatNumber(selectedBatch.weightKg)} kg
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Bobina soni">
              {selectedBatch.conesCount || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Holati">
              <Tag color={statusColors[selectedBatch.status]}>
                {statusLabels[selectedBatch.status]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Yaratilgan">
              {formatDateTime(selectedBatch.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Yangilangan sana">
              {selectedBatch.date ? formatDateTime(selectedBatch.date) : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Qoplash boshlangan">
              {selectedBatch.wrappingStartedAt ? formatDateTime(selectedBatch.wrappingStartedAt) : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Bazaga yuborilgan">
              {selectedBatch.sentToBaseAt ? formatDateTime(selectedBatch.sentToBaseAt) : "-"}
            </Descriptions.Item>
            {selectedBatch.comment && (
              <Descriptions.Item label="Izoh">
                {selectedBatch.comment}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Edit Batch Modal */}
      <Modal
        title={`Partiyani tahrirlash: ${editingBatch?.batchNumber}`}
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setEditingBatch(null);
          editForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="Holati" rules={[{ required: true }]}>
                <Select>
                  <Option value="CREATED">Yaratilgan</Option>
                  <Option value="PROCESSING">Jarayonda</Option>
                  <Option value="WRAPPING">Qoplanmoqda</Option>
                  <Option value="WRAPPED">Qoplangan</Option>
                  <Option value="COMPLETED">Tayyor</Option>
                  <Option value="SHIPPED">Yuborilgan</Option>
                  <Option value="RETURNED">Qaytarilgan</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="clientId"
                label="Mijoz"
              >
                <Select
                  placeholder="Mijozni tanlang (ixtiyoriy)"
                  showSearch
                  allowClear
                  filterOption={(input, option) =>
                    String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {(clientsData?.data || []).map((client: any) => (
                    <Option key={client._id} value={client._id} label={client.name}>
                      {client.name} {client.phone && `(${client.phone})`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="threadType"
                label="Ip turi (xom ashyodan)"
                rules={[{ required: true, message: "Iltimos, ip turini tanlang!" }]}
              >
                <Select
                  placeholder="Ip turini tanlang"
                  showSearch
                  onChange={handleEditThreadTypeChange}
                  filterOption={(input, option) =>
                    String(option?.children ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {availableThreadTypes.map((t) => (
                    <Option key={t} value={t}>
                      {t}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="threadNumber"
                label="Ip raqami"
                rules={[{ required: true, message: "Iltimos, ip raqamini tanlang!" }]}
              >
                <Select
                  placeholder={editSelectedThreadType ? "Ip raqamini tanlang" : "Avval ip turini tanlang"}
                  showSearch
                  disabled={!editSelectedThreadType}
                  onChange={handleEditThreadNumberChange}
                  filterOption={(input, option) =>
                    String(option?.children ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {filteredEditThreadNumbers.map((m) => {
                    let avWeight = m.availableWeight;
                    if (editingBatch && editingBatch.threadType === m.threadType && editingBatch.threadNumber === m.threadNumber) {
                      avWeight += editingBatch.weightKg;
                    }
                    return (
                      <Option key={m.threadNumber} value={m.threadNumber}>
                        {m.threadNumber} ({avWeight.toLocaleString()} kg mavjud)
                      </Option>
                    )
                  })}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="colorName"
                label="Rang nomi"
                rules={[{ required: true, message: "Iltimos, rang nomini kiriting!" }]}
              >
                <AutoComplete
                  options={colorNames.map(c => ({ value: c }))}
                  placeholder="Rang nomini kiriting"
                  filterOption={(input, option) =>
                    (option?.value ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="colorCode"
                label="Rang kodi"
                rules={[{ required: true, message: "Iltimos, rang kodini kiriting!" }]}
              >
                <AutoComplete
                  options={colorCodes.map(c => ({ value: c }))}
                  placeholder="Rang kodini kiriting"
                  filterOption={(input, option) =>
                    (option?.value ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="weightKg"
                label={`Og'irlik (kg)${editMaxWeight > 0 ? ` - max: ${editMaxWeight.toLocaleString()} kg` : ""}`}
                rules={[
                  { required: true, message: "Iltimos, og'irlikni kiriting!" },
                  {
                    validator: (_, value) => {
                      if (editMaxWeight > 0 && value > editMaxWeight) {
                        return Promise.reject(`Og'irlik ${editMaxWeight} kg dan oshmasligi kerak!`);
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber
                  placeholder="0"
                  min={0.1}
                  max={editMaxWeight > 0 ? editMaxWeight : undefined}
                  step={0.1}
                  className="w-full"
                  formatter={inputNumberFormatter}
                  parser={inputNumberParser}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="conesCount"
                label="Bobina soni"
                rules={[{ required: false }]}
              >
                <InputNumber
                  placeholder="0"
                  min={1}
                  step={1}
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="date" label="Sana">
                <DatePicker
                  format="DD.MM.YYYY"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="comment" label="Izoh">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item className="mb-0 text-right">
            <Space>
              <Button
                onClick={() => {
                  setIsEditModalVisible(false);
                  setEditingBatch(null);
                  editForm.resetFields();
                }}
              >
                Bekor qilish
              </Button>
              <Button type="primary" htmlType="submit" loading={updateBatchMutation.isLoading}>
                Saqlash
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Shared Create Batch Modal Component */}
      <BatchCreateModal
        open={isBatchModalVisible}
        onClose={() => setIsBatchModalVisible(false)}
        onSuccess={(batch) => {
          refetchStats();
          refetch();
          printBatch(batch);
        }}
      />
    </div>
  );
};

export default BatchesPage;