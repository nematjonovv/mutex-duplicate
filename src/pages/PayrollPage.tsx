import React, { useState, useMemo, useRef } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Popconfirm,
  Card,
  Row,
  Col,
  Tag,
  Tooltip,
  InputNumber,
  Alert,
  Statistic,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserSwitchOutlined,
  SearchOutlined,
  ReloadOutlined,
  DollarOutlined,
  FileTextOutlined,
  UserOutlined,
  FileExcelOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { usePaginatedQuery, useApiMutation, useApiQuery } from "@/hooks/useApi";
import {
  Payroll,
  CreatePayrollRequest,
  UpdatePayrollRequest,
  Worker,
  CashAccount,
  ApiResponse,
} from "@/types";
import dayjs, { Dayjs } from "dayjs";
import { apiService } from "@/services/api";
import { workerService } from "@/services/workerService";
import { accountService } from "@/services/accountService";
import { useCurrency } from "@/hooks/useCurrency";
import { formatNumber, inputNumberFormatter, inputNumberParser } from "@/utils";
import { CompactAmount } from '@/components/CompactAmount';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';

const { Option } = Select;
const { TextArea } = Input;

// Printable component
const PrintablePayrollList = React.forwardRef<HTMLDivElement, { payrolls: Payroll[]; currency: string; dateRange: [Dayjs, Dayjs] | null }>(
  ({ payrolls, currency, dateRange }, ref) => {
    const totalAmount = payrolls.reduce((sum, p) => sum + p.amount, 0);

    return (
      <div ref={ref} className="p-8 print-content bg-white min-h-screen">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold uppercase text-gray-800">Ish haqi qaydnomasi</h1>
            <p className="text-gray-600 mt-1">
              {dateRange ? `${dateRange[0].format("DD.MM.YYYY")} - ${dateRange[1].format("DD.MM.YYYY")}` : "Barcha vaqtlar"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Chop etilgan sana</p>
            <p className="font-medium">{dayjs().format("DD.MM.YYYY HH:mm")}</p>
          </div>
        </div>

        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 w-10 text-center">#</th>
              <th className="border border-gray-300 p-2 text-left">Sana</th>
              <th className="border border-gray-300 p-2 text-left">Ishchi F.I.Sh</th>
              <th className="border border-gray-300 p-2 text-left">Hisob</th>
              <th className="border border-gray-300 p-2 text-left">Izoh</th>
              <th className="border border-gray-300 p-2 text-right">Miqdor</th>
              <th className="border border-gray-300 p-2 w-24 text-center">Imzo</th>
            </tr>
          </thead>
          <tbody>
            {payrolls.map((payroll, index) => (
              <tr key={payroll._id}>
                <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                <td className="border border-gray-300 p-2">{dayjs(payroll.date).format("DD.MM.YYYY")}</td>
                <td className="border border-gray-300 p-2 font-medium">
                  {payroll.workerId && typeof payroll.workerId === 'object' 
                    ? (payroll.workerId as any).fullName 
                    : "Noma'lum"}
                </td>
                <td className="border border-gray-300 p-2">
                  {payroll.accountId && typeof payroll.accountId === 'object'
                    ? (payroll.accountId as any).name
                    : "-"}
                </td>
                <td className="border border-gray-300 p-2 text-gray-600">{payroll.note || "-"}</td>
                <td className="border border-gray-300 p-2 text-right font-bold">
                  {formatNumber(payroll.amount, 2)} {currency}
                </td>
                <td className="border border-gray-300 p-2"></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold">
              <td colSpan={5} className="border border-gray-300 p-2 text-right">Jami:</td>
              <td className="border border-gray-300 p-2 text-right">
                {formatNumber(totalAmount, 2)} {currency}
              </td>
              <td className="border border-gray-300 p-2"></td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-12 grid grid-cols-2 gap-8">
          <div>
            <p className="mb-8 border-b border-gray-400 w-48 border-dashed"></p>
            <p className="font-bold">Direktor</p>
          </div>
          <div className="text-right">
            <div className="inline-block text-left">
              <p className="mb-8 border-b border-gray-400 w-48 border-dashed"></p>
              <p className="font-bold">G'aznachi</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

const PayrollPage: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
  const [form] = Form.useForm();
  const { formatPrice, currency, convertPrice } = useCurrency();

  const [searchText, setSearchText] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const handleExportExcel = () => {
    const data = statsPayrolls.map((p) => ({
      Sana: dayjs(p.date).format("DD/MM/YYYY HH:mm"),
      Ishchi: p.workerId && typeof p.workerId === 'object' ? (p.workerId as any).fullName : "Noma'lum",
      Miqdor: p.amount,
      Valyuta: currency,
      Hisob: p.accountId && typeof p.accountId === 'object' ? (p.accountId as any).name : "-",
      Izoh: p.note || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ish haqi");
    XLSX.writeFile(wb, `Ish_haqi_${dayjs().format("DD-MM-YYYY")}.xlsx`);
  };

  // Fetch payrolls with pagination
  const {
    data: payrollsData,
    isLoading,
    refetch,
  } = usePaginatedQuery(
    ["payrolls", pagination.current, pagination.pageSize, searchText, dateRange, positionFilter],
    (params) => {
      const queryParams = new URLSearchParams({
        page: params.page.toString(),
        limit: params.limit.toString(),
        search: params.search,
        startDate: params.startDate,
        endDate: params.endDate,
        position: params.position || "",
      });
      return apiService.get(`/payroll?${queryParams}`);
    },
    {
      page: pagination.current,
      limit: pagination.pageSize,
      search: searchText,
      startDate: dateRange?.[0]?.toISOString() || "",
      endDate: dateRange?.[1]?.toISOString() || "",
      position: positionFilter,
    }
  );

  const payrolls = (payrollsData?.materials || []) as Payroll[];

  // Fetch workers
  const { data: workersData } = usePaginatedQuery(
    ["workers"],
    (params) => workerService.getWorkers(params),
    {
      page: 1,
      limit: 1000,
    }
  );

  const workers = (workersData?.data || workersData?.materials || (Array.isArray(workersData) ? workersData : []) || []) as Worker[];

  const uniquePositions = useMemo(() => {
    const positions = workers.map((w) => w.position).filter(Boolean);
    return Array.from(new Set(positions));
  }, [workers]);

  // Fetch accounts
  const { data: accountsData } = usePaginatedQuery(
    ["accounts"],
    (params) => accountService.getAccounts(params),
    {
      page: 1,
      limit: 1000,
    }
  );

  const accounts = (accountsData?.materials || []) as CashAccount[];

  // Fetch payrolls for stats (selected period)
  const { data: statsPayrollsData } = useApiQuery<{ materials: Payroll[] }>(
    ["statsPayrolls", dateRange],
    () => {
      const startDate = dateRange?.[0]?.toISOString() || "";
      const endDate = dateRange?.[1]?.toISOString() || "";
      return apiService.get(
        `/payroll?startDate=${startDate}&endDate=${endDate}&limit=10000`
      );
    },
    {
      enabled: !!dateRange,
    }
  );

  const statsPayrolls = statsPayrollsData?.materials || [];

  const workerPaymentStatus = useMemo(() => {
    const status: Record<string, { paid: number; remaining: number }> = {};
    workers.forEach((worker) => {
      const paid = statsPayrolls
        .filter((p) => {
          const pWorkerId = p.workerId && typeof p.workerId === 'object' ? (p.workerId as any)._id : p.workerId;
          return pWorkerId === worker._id;
        })
        .reduce((sum, p) => sum + p.amount, 0);
      status[worker._id] = {
        paid,
        remaining: Math.max(0, worker.salary - paid),
      };
    });
    return status;
  }, [workers, statsPayrolls]);

  const handleWorkerChange = (workerId: string) => {
    const status = workerPaymentStatus[workerId];
    if (status && status.remaining > 0) {
      form.setFieldsValue({ amount: status.remaining });
    }
  };

  // Create payroll mutation
  const createPayrollMutation = useApiMutation(
    (data: CreatePayrollRequest) => {
      const formattedData = {
        ...data,
        date: data.date
          ? dayjs(data.date).toISOString()
          : new Date().toISOString(),
      };
      return apiService.post("/payroll", formattedData);
    },
    {
      successMessage: "Ish haqi muvaffaqiyatli yaratildi",
      invalidateQueries: ["payrolls", "accounts", "cash-flows", "workers"],
      onSuccess: () => {
        setModalVisible(false);
        form.resetFields();
      },
    }
  );

  // Update payroll mutation
  const updatePayrollMutation = useApiMutation(
    ({ id, data }: { id: string; data: UpdatePayrollRequest }) => {
      const formattedData = {
        ...data,
        date: data.date ? dayjs(data.date).toISOString() : undefined,
      };
      return apiService.put(`/payroll/${id}`, formattedData);
    },
    {
      successMessage: "Ish haqi muvaffaqiyatli yangilandi",
      invalidateQueries: ["payrolls", "accounts", "cash-flows", "workers"],
      onSuccess: () => {
        setModalVisible(false);
        setEditingPayroll(null);
        form.resetFields();
      },
    }
  );

  // Delete payroll mutation
  const deletePayrollMutation = useApiMutation(
    (id: string) => apiService.delete(`/payroll/${id}`),
    {
      successMessage: "Ish haqi muvaffaqiyatli o'chirildi",
      invalidateQueries: ["payrolls", "accounts", "cash-flows", "workers"],
    }
  );

  // Open create modal
  const showCreateModal = () => {
    setEditingPayroll(null);
    setModalVisible(true);
    form.resetFields();
    form.setFieldsValue({
      date: dayjs(),
    });
  };

  // Open edit modal
  const showEditModal = (payroll: Payroll) => {
    setEditingPayroll(payroll);
    setModalVisible(true);
    form.setFieldsValue({
      workerId: payroll.workerId,
      accountId: payroll.accountId,
      amount: payroll.amount,
      date: payroll.date ? dayjs(payroll.date) : undefined,
      note: payroll.note,
    });
  };

  // Handle form submit
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingPayroll) {
        updatePayrollMutation.mutate({
          id: editingPayroll._id,
          data: values,
        });
      } else {
        createPayrollMutation.mutate(values);
      }
    });
  };

  // Handle delete
  const handleDelete = (payrollId: string) => {
    deletePayrollMutation.mutate(payrollId);
  };

  // Table columns
  const columns = [
    {
      title: "Sana",
      dataIndex: "date",
      key: "date",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Ishchi",
      dataIndex: "worker",
      key: "worker",
      render: (worker: Worker) => (
        <div>
          <div className="font-medium">{worker?.fullName}</div>
        </div>
      ),
    },
    {
      title: "Miqdor",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number) => (
        <span className="font-medium text-green-600">
          {formatPrice(amount)}
        </span>
      ),
    },
    {
      title: "Hisob",
      dataIndex: "account",
      key: "account",
      render: (account: CashAccount) => (
        <Tag color="blue">{account?.name || "Mavjud emas"}</Tag>
      ),
    },
    {
      title: "Izoh",
      dataIndex: "note",
      key: "note",
      render: (note: string) => (
        <Tooltip title={note}>
          <span className="truncate max-w-xs block">{note || "-"}</span>
        </Tooltip>
      ),
    },
    {
      title: "Yaratilgan",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Amallar",
      key: "actions",
      render: (_: any, record: Payroll) => (
        <Space>
          <Tooltip title="Ish haqini tahrirlash">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => showEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this payroll?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Ish haqini o'chirish">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Calculate totals
  const totalPeriodPayroll = statsPayrolls.reduce(
    (sum, payroll) => sum + payroll.amount,
    0
  );

  const paidWorkersCount = Object.values(workerPaymentStatus).filter(
    (s) => s.paid > 0
  ).length;

  const unpaidWorkersCount = workers.length - paidWorkersCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Ish haqi boshqaruvi</h1>
          <p className="text-gray-600">
            Ishchilarning maoshlari va to'lovlarini boshqarish
          </p>
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
            onClick={showCreateModal}
          >
            Ish haqi qo'shish
          </Button>
        </Space>
      </div>

      <div style={{ display: "none" }}>
        <PrintablePayrollList
          ref={componentRef}
          payrolls={statsPayrolls}
          currency={currency}
          dateRange={dateRange}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Jami ish haqi (Selected Period) */}
        <Card
          variant="borderless"
          className="shadow-sm hover:shadow-md transition-all duration-300 h-full"
          style={{ borderTop: "3px solid #cf1322" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-gray-500 mb-1">Jami to'langan</div>
              <div className="text-lg xl:text-xl font-bold text-red-600 break-words">
                <CompactAmount
                  amount={convertPrice(totalPeriodPayroll)}
                  currency={currency}
                />
                <span className="text-sm text-gray-500 ml-1">{currency}</span>
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded-full ml-4 flex-shrink-0">
              <DollarOutlined className="text-red-600 text-xl" />
            </div>
          </div>
        </Card>

        {/* Card 2: Oylik olganlar */}
        <Card
          variant="borderless"
          className="shadow-sm hover:shadow-md transition-all duration-300 h-full"
          style={{ borderTop: "3px solid #1890ff" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-gray-500 mb-1">Oylik olganlar</div>
              <div className="text-lg xl:text-xl font-bold text-blue-600 break-words">
                {paidWorkersCount}
                <span className="text-sm text-gray-500 ml-1">ta</span>
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-full ml-4 flex-shrink-0">
              <UserSwitchOutlined className="text-blue-600 text-xl" />
            </div>
          </div>
        </Card>

        {/* Card 3: Oylik olmaganlar */}
        <Card
          variant="borderless"
          className="shadow-sm hover:shadow-md transition-all duration-300 h-full"
          style={{ borderTop: "3px solid #722ed1" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-gray-500 mb-1">Oylik olmaganlar</div>
              <div className="text-lg xl:text-xl font-bold text-purple-600 break-words">
                {unpaidWorkersCount}
                <span className="text-sm text-gray-500 ml-1">ta</span>
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-full ml-4 flex-shrink-0">
              <FileTextOutlined className="text-purple-600 text-xl" />
            </div>
          </div>
        </Card>

        {/* Card 4: Faol ishchilar */}
        <Card
          variant="borderless"
          className="shadow-sm hover:shadow-md transition-all duration-300 h-full"
          style={{ borderTop: "3px solid #3f8600" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-gray-500 mb-1">Faol ishchilar</div>
              <div className="text-lg xl:text-xl font-bold text-green-600 break-words">
                {workers.length}
                <span className="text-sm text-gray-500 ml-1">ta</span>
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-full ml-4 flex-shrink-0">
              <UserOutlined className="text-green-600 text-xl" />
            </div>
          </div>
        </Card>
      </div>

      {/* Info Alert */}
      <Alert
        message="Ish haqi boshqaruvi"
        description="Ishchilarga qilingan barcha maosh to'lovlarini kuzatib boring. Har bir to'lov ma'lum bir naqd pul hisobiga bog'langan va ma'lumot uchun eslatmalarni ichiga olishi mumkin."
        type="info"
        showIcon
        closable
      />

      {/* Filters */}
      <Card>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Input
              placeholder="Ishchi ismi bo'yicha qidirish"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="Lavozim bo'yicha filtrlash"
              value={positionFilter || undefined}
              onChange={(value) => setPositionFilter(value)}
              allowClear
              className="w-full"
            >
              {uniquePositions.map((pos) => (
                <Option key={pos} value={pos}>
                  {pos}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <DatePicker.RangePicker
              placeholder={["Boshlanish sanasi", "Tugash sanasi"]}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
              style={{ width: "100%" }}
            />
          </Col>
          <Col span={4}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearchText("");
                setPositionFilter("");
                setDateRange(null);
                setPagination({ current: 1, pageSize: 10 });
              }}
              block
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
          dataSource={payrolls}
          rowKey="_id"
          loading={isLoading}
          pagination={{
            current: payrollsData?.pagination?.current || 1,
            pageSize: payrollsData?.pagination?.pageSize || 10,
            total: payrollsData?.pagination?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / ${total} ta ish haqi yozuvlari`,
            onChange: (page, pageSize) => setPagination({ current: page, pageSize: pageSize || 10 }),
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingPayroll ? "Ish haqini tahrirlash" : "Yangi ish haqi qo'shish"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          setEditingPayroll(null);
          form.resetFields();
        }}
        width={600}
        okText={editingPayroll ? "Yangilash" : "Yaratish"}
        cancelText="Bekor qilish"
        confirmLoading={
          createPayrollMutation.isLoading || updatePayrollMutation.isLoading
        }
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="workerId"
                label="Ishchi"
                rules={[{ required: true, message: "Iltimos, ishchini tanlang" }]}
              >
                <Select placeholder="Ishchini tanlang" onChange={handleWorkerChange}>
                  {workers
                    .filter((worker) => {
                      // If editing, always show the current worker
                      if (editingPayroll && editingPayroll.workerId === worker._id)
                        return true;
                      // Otherwise show only if remaining > 0
                      return (workerPaymentStatus[worker._id]?.remaining || 0) > 0;
                    })
                    .map((worker) => (
                      <Option key={worker._id} value={worker._id}>
                        {worker.fullName} (Qoldiq:{" "}
                        {formatNumber(workerPaymentStatus[worker._id]?.remaining || 0, 2)} {currency}
                        )
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="accountId"
                label="To'lov hisobi"
                rules={[
                  { required: true, message: "Iltimos, hisobni tanlang" },
                ]}
              >
                <Select placeholder="Hisobni tanlang">
                  {accounts.map((account) => (
                    <Option key={account._id} value={account._id}>
                      {account.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Miqdor"
                rules={[{ required: true, message: "Iltimos, miqdorni kiriting" }]}
              >
                <InputNumber
                  placeholder="Miqdorni kiriting"
                  style={{ width: "100%" }}
                  formatter={inputNumberFormatter}
                  parser={inputNumberParser}
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="date"
                label="To'lov sanasi"
                rules={[
                  { required: true, message: "Iltimos, to'lov sanasini tanlang" },
                ]}
              >
                <DatePicker
                  placeholder="Sanani tanlang"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label="Izoh">
            <TextArea placeholder="Izoh kiriting (ixtiyoriy)" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PayrollPage;
