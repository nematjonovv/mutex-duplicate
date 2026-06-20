import React, { useState, useMemo } from "react";
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
  Statistic,
  Row,
  Col,
  Descriptions,
  Badge,
  Select,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
  ToolOutlined,
  FileExcelOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { workerService } from "@/services/workerService";
import { Worker, CreateWorkerRequest, UpdateWorkerRequest } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { formatDate, cleanPhone, formatNumber, inputNumberFormatter, inputNumberParser } from "@/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import { message } from "@/utils/StaticAntd";
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';

const { Search } = Input;

// Printable component
const PrintableWorkerList = React.forwardRef<HTMLDivElement, { workers: Worker[] }>(
  ({ workers }, ref) => {
    return (
      <div ref={ref} className="p-8 print-content bg-white min-h-screen">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold uppercase text-gray-800">Ishchilar ro'yxati</h1>
            <p className="text-gray-600 mt-1">
              Jami ishchilar: {workers.length} ta
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Chop etilgan sana</p>
            <p className="font-medium">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 w-10 text-center">#</th>
              <th className="border border-gray-300 p-2 text-left">F.I.SH</th>
              <th className="border border-gray-300 p-2 text-left">Telefon</th>
              <th className="border border-gray-300 p-2 text-left">Lavozim</th>
              <th className="border border-gray-300 p-2 text-left">Manzil</th>
              <th className="border border-gray-300 p-2 text-right">Ish haqi</th>
              <th className="border border-gray-300 p-2 text-center">Ish boshlagan sana</th>
              <th className="border border-gray-300 p-2 text-center">Holati</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker, index) => (
              <tr key={worker._id}>
                <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                <td className="border border-gray-300 p-2 font-medium">{worker.fullName}</td>
                <td className="border border-gray-300 p-2">{worker.phone}</td>
                <td className="border border-gray-300 p-2">{worker.position || "Ishchi"}</td>
                <td className="border border-gray-300 p-2">{worker.address || "-"}</td>
                <td className="border border-gray-300 p-2 text-right">{formatNumber(worker.salary)} UZS</td>
                <td className="border border-gray-300 p-2 text-center">{formatDate(worker.workingSince)}</td>
                <td className="border border-gray-300 p-2 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${worker.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {worker.isActive ? "Faol" : "Faol emas"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

const WorkersPage: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [viewingWorker, setViewingWorker] = useState<Worker | null>(null);
  const [form] = Form.useForm();
  const { user } = useAuthStore();
  const componentRef = React.useRef<HTMLDivElement>(null);

  // Query for workers
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const {
    data: workersData,
    isLoading,
    refetch,
  } = useQuery(["workers", page, limit, searchText, positionFilter], () =>
    workerService.getWorkers({ page, limit, search: searchText, position: positionFilter })
  );

  // Fetch all workers for position filter and export/print
  const { data: allWorkersData } = useQuery(["allWorkers"], () =>
    workerService.getWorkers({ page: 1, limit: 1000 })
  );

  const uniquePositions = useMemo(() => {
    const workers = allWorkersData?.data || [];
    const positions = workers.map((w: Worker) => w.position).filter(Boolean);
    return Array.from(new Set(positions)) as string[];
  }, [allWorkersData]);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const handleExportExcel = () => {
    const workers = allWorkersData?.data || [];
    const data = workers.map((w: Worker) => ({
      "F.I.SH": w.fullName,
      "Telefon": w.phone,
      "Lavozim": w.position || "Ishchi",
      "Manzil": w.address || "-",
      "Ish haqi": w.salary,
      "Ish boshlagan sana": formatDate(w.workingSince),
      "Holati": w.isActive ? "Faol" : "Faol emas",
      "Qo'shilgan sana": formatDate(w.createdAt),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ishchilar");
    XLSX.writeFile(wb, `Ishchilar_royxati_${new Date().toLocaleDateString()}.xlsx`);
  };

  // Create worker mutation
  const createWorkerMutation = useMutation(workerService.createWorker, {
    onSuccess: () => {
      queryClient.invalidateQueries("workers");
      setIsModalVisible(false);
      form.resetFields();
    },
  });

  // Update worker mutation
  const updateWorkerMutation = useMutation(
    ({ id, data }: { id: string; data: UpdateWorkerRequest }) =>
      workerService.updateWorker(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("workers");
        setIsModalVisible(false);
        setEditingWorker(null);
        form.resetFields();
      },
    }
  );

  // Delete worker mutation
  const deleteWorkerMutation = useMutation(workerService.deleteWorker, {
    onSuccess: () => {
      queryClient.invalidateQueries("workers");
    },
  });

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  // Handle form submit
  const handleSubmit = async (values: any) => {
    // Clean phone number before submission
    const cleanedValues = {
      ...values,
      phone: values.phone ? cleanPhone(values.phone) : values.phone,
      salary: values.salary ? parseFloat(values.salary) : 0,
      workingSince: values.workingSince
        ? new Date(values.workingSince).toISOString()
        : new Date().toISOString(),
    };

    if (editingWorker) {
      await updateWorkerMutation.mutateAsync({
        id: editingWorker._id,
        data: cleanedValues,
      });
    } else {
      await createWorkerMutation.mutateAsync(cleanedValues);
    }
  };

  // Handle edit
  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    form.setFieldsValue({
      fullName: worker.fullName,
      phone: worker.phone,
      address: worker.address,
      position: worker.position,
      salary: worker.salary,
      workingSince: worker.workingSince,
    });
    setIsModalVisible(true);
  };

  // Handle view
  const handleView = (worker: Worker) => {
    setViewingWorker(worker);
    setIsViewModalVisible(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      const response = await workerService.deleteWorker(id);
      if (response.success) {
        message.success("Ishchi muvaffaqiyatli o'chirildi");
        queryClient.invalidateQueries(["workers"]);
      } else {
        message.error(response.message || "O'chirishda xato yuz berdi");
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      if (error.response?.status === 403) {
        message.error("Sizda o'chirish huquqi yo'q");
      } else {
        message.error("O'chirishda xatolik yuz berdi");
      }
    }
  };

  // Table columns
  const columns = [
    {
      title: "Ishchi",
      dataIndex: "fullName",
      key: "fullName",
    },
    {
      title: "Telefon",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "Manzil",
      dataIndex: "address",
      key: "address",
    },
    {
      title: "Lavozim",
      dataIndex: "position",
      key: "position",
    },
    {
      title: "Ish haqi",
      dataIndex: "salary",
      key: "salary",
    },
    {
      title: "Ish boshlagan sana",
      dataIndex: "workingSince",
      key: "workingSince",
      render: (date: string) => formatDate(date),
    },
    {
      title: "Oxirgi oylik olgan kun",
      dataIndex: "lastSalaryReceived",
      key: "lastSalaryReceived",
      render: (date: string) => (date ? formatDate(date) : "N/A"),
    },
    {
      title: "Amallar",
      key: "actions",
      render: (record: Worker) => (
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
          {(user?.role === "DIRECTOR" || user?.role === "MANAGER") && (
            <Tooltip title="O'chirish">
              <Popconfirm
                title="Ishchini o'chirishni xohlaysizmi?"
                description="Bu amalni qaytarib bo'lmaydi."
                onConfirm={() => handleDelete(record._id)}
                okText="Ha"
                cancelText="Yo'q"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  size="small"
                  danger
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ishchilar</h1>
          <p className="text-gray-600">Barcha ishchilar ro'yxati</p>
        </div>
        <Space>
          <Button
            icon={<FileExcelOutlined />}
            onClick={handleExportExcel}
            className="hidden md:inline-flex"
          >
            Excel
          </Button>
          <Button
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            className="hidden md:inline-flex"
          >
            Chop etish
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => {
              setEditingWorker(null);
              form.resetFields();
              setIsModalVisible(true);
            }}
          >
            Yangi ishchi
          </Button>
        </Space>
      </div>

      <div style={{ display: "none" }}>
        <PrintableWorkerList
          ref={componentRef}
          workers={allWorkersData?.data || []}
        />
      </div>

      {/* Statistics */}
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Jami ishchilar"
              value={workersData?.pagination?.total || 0}
              valueStyle={{ color: "#1890ff" }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Faol ishchilar"
              value={
                workersData?.data?.filter((w: Worker) => w.isActive)?.length ||
                0
              }
              valueStyle={{ color: "#52c41a" }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Lavozimlar"
              value={
                new Set(
                  workersData?.data?.map((w: Worker) => w.position || "Belgilanmagan")
                ).size || 0
              }
              valueStyle={{ color: "#722ed1" }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Search and Filters */}
      <Card className="shadow-sm">
        <div className="flex justify-between items-center gap-4">
          <Search
            placeholder="Ishchi nomi yoki telefon raqami bo'yicha qidirish..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={handleSearch}
            className="flex-grow"
          />
          <Select
            placeholder="Lavozim bo'yicha filtrlash"
            allowClear
            size="large"
            className="w-64"
            onChange={(value) => setPositionFilter(value)}
            value={positionFilter || undefined}
          >
            {uniquePositions.map((pos) => (
              <Select.Option key={pos} value={pos}>
                {pos}
              </Select.Option>
            ))}
          </Select>
          <div className="text-sm text-gray-500 whitespace-nowrap">
            Jami: {workersData?.pagination?.total || 0} ishchi
          </div>
        </div>
      </Card>

      {/* Workers Table */}
      <Card className="shadow-sm">
        <Table
          columns={columns}
          dataSource={workersData?.data || []}
          rowKey="_id"
          scroll={{ x: 800 }}
          pagination={{
            current: page,
            pageSize: limit,
            total: workersData?.pagination?.total || 0,
            onChange: (page, pageSize) => {
              setPage(page);
              setLimit(pageSize || 10);
            },
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingWorker ? "Ishchini tahrirlash" : "Yangi ishchi qo'shish"}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingWorker(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="fullName"
            label="To'liq ism"
            rules={[
              { required: true, message: "Iltimos, to'liq ismni kiriting!" },
            ]}
          >
            <Input placeholder="To'liq ism" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Telefon raqam"
            rules={[
              {
                required: true,
                message: "Iltimos, telefon raqamini kiriting!",
              },
            ]}
          >
            <Input placeholder="+998 XX XXX XX XX" />
          </Form.Item>

          <Form.Item name="address" label="Manzil">
            <Input placeholder="Manzil" />
          </Form.Item>

          <Form.Item name="position" label="Lavozim" initialValue="Ishchi">
            <Input placeholder="Lavozim (masalan: Tikuvchi)" />
          </Form.Item>

          <Form.Item
            name="salary"
            label="Ish haqi (UZS)"
            rules={[
              { required: true, message: "Iltimos, ish haqini kiriting!" },
            ]}
          >
            <InputNumber
              placeholder="Ish haqi"
              min={0}
              className="w-full"
              formatter={inputNumberFormatter}
              parser={inputNumberParser}
            />
          </Form.Item>

          <Form.Item
            name="workingSince"
            label="Qachondan beri ishlayapti"
            rules={[
              {
                required: true,
                message: "Iltimos, ish boshlagan sanani kiriting!",
              },
            ]}
          >
            <Input type="date" />
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex justify-end space-x-2">
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingWorker(null);
                  form.resetFields();
                }}
              >
                Bekor qilish
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={
                  createWorkerMutation.isLoading ||
                  updateWorkerMutation.isLoading
                }
              >
                {editingWorker ? "Yangilash" : "Qo'shish"}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        title="Ishchi ma'lumotlari"
        open={isViewModalVisible}
        onCancel={() => {
          setIsViewModalVisible(false);
          setViewingWorker(null);
        }}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsViewModalVisible(false)}>
            OK
          </Button>,
        ]}
        width={700}
      >
        {viewingWorker && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="To'liq ism">
              <span className="font-semibold">{viewingWorker.fullName}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Telefon">
              {viewingWorker.phone}
            </Descriptions.Item>
            <Descriptions.Item label="Manzil">
              {viewingWorker.address || "Belgilanmagan"}
            </Descriptions.Item>
            <Descriptions.Item label="Lavozim">
              {viewingWorker.position || "Ishchi"}
            </Descriptions.Item>
            <Descriptions.Item label="Ish haqi">
              <span className="text-green-600 font-bold">
                {formatNumber(viewingWorker.salary)} UZS
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Ish boshlagan sana">
              {formatDate(viewingWorker.workingSince)}
            </Descriptions.Item>
            <Descriptions.Item label="Oxirgi oylik olgan kun">
              {viewingWorker.lastSalaryReceived
                ? formatDate(viewingWorker.lastSalaryReceived)
                : "Hali oylik olinmagan"}
            </Descriptions.Item>
            <Descriptions.Item label="Holati">
              <Badge
                status={viewingWorker.isActive ? "success" : "error"}
                text={viewingWorker.isActive ? "Faol" : "Faol emas"}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Tizimga qo'shilgan sana">
              {formatDate(viewingWorker.createdAt)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default WorkersPage;
