import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  InputNumber,
  Space,
  Tag,
  Modal,
  Form,
  message,
  Popconfirm,
  Tooltip,
  Select,
  Statistic,
  Row,
  Col,
  Typography,
  DatePicker
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileExcelOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { usePaginatedQuery, useApiMutation, useApiQuery } from "@/hooks/useApi";
import { invoiceService } from "@/services/invoiceService";
import { accountService } from "@/services/accountService";
import { Invoice } from "@/types";
import {
  formatDate,
  formatCurrency,
  formatNumber,
  getInvoiceStatus,
  inputNumberFormatter,
  inputNumberParser,
} from "@/utils";
import {
  exportInvoiceToExcel,
  exportInvoicesListToExcel,
  printInvoicesList,
  printInvoice,
  InvoiceExportData
} from "@/utils/exportUtils";
import { CompactAmount } from '@/components/CompactAmount';
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuthStore } from "@/store/authStore";
import { useSocket } from "@/hooks/useSocket";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const InvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>([
    dayjs().startOf('day'),
    dayjs().endOf('day')
  ]);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentForm] = Form.useForm();
  const { user } = useAuthStore();
  const currency = 'USD'; // USD only
  const rates = { USD: 1 };

  const convert = (amount: number) => amount; // USD only

  const convertToUzs = (amount: number) => {
    return Math.round(amount); // USD only
  };

  // Query for invoices
  const {
    data: invoicesData,
    isLoading,
    refetch,
  } = usePaginatedQuery(
    ["invoices"],
    (params) => invoiceService.getInvoices(params),
    {
      page: 1,
      limit: 10,
      search: searchText,
      startDate: dateRange?.[0]?.toISOString(),
      endDate: dateRange?.[1]?.toISOString(),
    }
  );

  // Query for accounts
  const { data: accountsData } = useApiQuery(
    ["accounts"],
    () => accountService.getAllAccounts(),
    {
      enabled: isPaymentModalVisible,
    }
  );

  // Setup Socket.IO for real-time invoice updates
  const socket = useSocket();

  useEffect(() => {
    if (!user || !socket || !socket.connected) {
      return;
    }

    if (user.role !== "DIRECTOR" && user.role !== "MANAGER" && user.role !== "ACCOUNTANT") {
      return;
    }

    const handleInvoiceUpdate = () => {
      refetch();
    };

    socket.on("invoice:updated", handleInvoiceUpdate);

    return () => {
      socket.off("invoice:updated", handleInvoiceUpdate);
    };
  }, [socket, user, refetch]);

  // Delete invoice mutation
  const deleteInvoiceMutation = useApiMutation(
    (id: string) => invoiceService.deleteInvoice(id),
    {
      successMessage: "Faktura muvaffaqiyatli o'chirildi",
      invalidateQueries: ["invoices"],
    }
  );

  // Record payment mutation
  const recordPaymentMutation = useApiMutation(
    ({ id, data }: { id: string; data: any }) =>
      invoiceService.recordPayment(id, data),
    {
      successMessage: "To'lov muvaffaqiyatli qayd etildi",
      invalidateQueries: ["invoices"],
      onSuccess: () => {
        setIsPaymentModalVisible(false);
        setSelectedInvoice(null);
        paymentForm.resetFields();
      },
    }
  );

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handlePrint = () => {
    if (invoicesData?.data) {
      printInvoicesList(invoicesData.data, currency, rates);
    }
  };

  const handleExportExcel = () => {
    if (invoicesData?.data) {
      exportInvoicesListToExcel(invoicesData.data, currency, rates);
    }
  };

  // Handle payment submit
  const handlePaymentSubmit = async (values: any) => {
    if (selectedInvoice) {
      const paymentCurrency = values.currency || "USD";
      const amount = Number(values.amount || 0);
      const rate = Number(values.rate || 1);
      const amountUSD = paymentCurrency === "USD" ? amount : (rate > 0 ? amount / rate : 0);

      await recordPaymentMutation.mutateAsync({
        id: selectedInvoice._id,
        data: {
          amount: amount,
          amountUSD: amountUSD,
          currency: paymentCurrency,
          rate: rate,
          accountId: values.accountId,
          method: values.method,
          note: values.note,
        },
      });
    }
  };

  // Handle delete
  const handleDelete = (record: Invoice) => {
    if (user?.role !== "DIRECTOR" && user?.role !== "MANAGER") {
      message.error("Sizda o'chirish huquqi yo'q");
      return;
    }
    setDeletingInvoice(record);
    setDeleteModalVisible(true);
  };

  // Handle payment
  const handlePayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    paymentForm.setFieldsValue({
      amount: convert(invoice.balance),
      method: "CASH",
    });
    setIsPaymentModalVisible(true);
  };

  // Handle export
  const handleExport = (record: Invoice, type: 'excel' | 'pdf') => {
    // Safely map items with defaults for undefined values
    const safeItems = (record.items || []).map(item => ({
      productName: item.productName || item.name || 'Mahsulot',
      colorName: item.colorName,
      colorCode: item.colorCode,
      bagsCount: Number(item.bagsCount) || 0,
      weightKg: Number(item.weightKg) || Number(item.count) || 0,
      quantity: Number(item.count) || Number(item.bagsCount) || Number(item.weightKg) || 0,
      price: convert(Number(item.price) || 0),
      total: convert(Number(item.total) || ((Number(item.price) || 0) * (Number(item.weightKg) || 0)) - (Number(item.discount) || 0))
    }));

    const exportData: InvoiceExportData = {
      invoiceNumber: record.invoiceNo || '-',
      customerName: record.clientMeta?.name || 'Mijoz',
      date: record.createdAt,
      totalAmount: convert(Number(record.netTotal) || 0),
      paidAmount: convert(Number(record.paid) || 0),
      remainingAmount: convert(Number(record.balance) || 0),
      status: getInvoiceStatus(record.paid, record.netTotal).status,
      items: safeItems,

      // Additional fields for print
      driverName: record.driver || record.driverName || '-',
      carNumber: record.carNumber || '-',
      submitterName: record.handedBy || (user?.firstName ? `${user.firstName} ${user.lastName || ''}` : '-'),
      note: record.note || record.comment || '-'
    };

    if (type === 'excel') {
      exportInvoiceToExcel(exportData);
    } else {
      printInvoice(exportData);
    }
  };
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  // Table columns
  const columns = [
    {
      title: "Faktura №",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Mijoz",
      dataIndex: "clientMeta",
      key: "clientMeta",
      render: (clientMeta: any) => (
        <div>
          <div className="font-bold">{clientMeta?.name}</div>
          <div className="text-xs text-gray-500">{clientMeta?.phone}</div>
        </div>
      ),
    },
    {
      title: "Jami summa",
      dataIndex: "netTotal",
      key: "netTotal",
      render: (amount: number, record: Invoice) => {
        const baseCurrency = record.currency || "UZS";
        const createdRate =
          record.currencyRate && record.currencyRate > 0
            ? record.currencyRate
            : rates[baseCurrency] || 1;
        const currentRate = rates[baseCurrency] || createdRate || 1;

        const originalAmount =
          baseCurrency === "UZS" ? amount : amount / createdRate;
        const revaluedAmount =
          baseCurrency === "UZS" ? amount : amount / currentRate;

        return (
          <Space direction="vertical" size={0}>
            <b className="text-green-600">
              <CompactAmount amount={convert(amount)} currency={currency} />
            </b>
            {baseCurrency !== "UZS" && (
              <span className="text-xs text-gray-500">
                {baseCurrency} {originalAmount.toFixed(2)} →{" "}
                {revaluedAmount.toFixed(2)}
              </span>
            )}
          </Space>
        );
      },
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
      render: (record: Invoice) => (
        <Space size="small">
          {/* <Tooltip title="To'lov">
            <Button icon={<DollarOutlined />} size="small" onClick={() => handlePayment(record)} disabled={record.balance <= 0} />
          </Tooltip> */}
          <Tooltip title="Excel yuklash">
            <Button
              icon={<FileExcelOutlined />}
              size="small"
              className="text-green-600 border-green-600 hover:text-green-700 hover:border-green-700"
              onClick={() => handleExport(record, 'excel')}
            />
          </Tooltip>
          <Tooltip title="Chop etish">
            <Button
              icon={<PrinterOutlined />}
              size="small"
              className="text-blue-600 border-blue-600 hover:text-blue-700 hover:border-blue-700"
              onClick={() => handleExport(record, 'pdf')}
            />
          </Tooltip>
          <Tooltip title="Tahrirlash">
            <Button icon={<EditOutlined />} size="small" onClick={() => navigate(`/invoices/edit/${record._id}`)} />
          </Tooltip>
          {(user?.role === "DIRECTOR" || user?.role === "MANAGER") && (
            <Tooltip title="O'chirish">
              <Button
                icon={<DeleteOutlined />}
                size="small"
                danger
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const totalInvoices = invoicesData?.data?.length || 0;
  const totalAmountVal = invoicesData?.data?.reduce((sum, invoice) => sum + invoice.netTotal, 0) || 0;
  const totalPaidVal = invoicesData?.data?.reduce((sum, invoice) => sum + invoice.paid, 0) || 0;
  const totalBalanceVal = invoicesData?.data?.reduce((sum, invoice) => sum + invoice.balance, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Title level={2} style={{ margin: 0, fontSize: '1.5rem' }}>Fakturalar</Title>
          <Text type="secondary">Sotuv va hisob-kitoblar</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => navigate("/invoices/create")}
          className="w-full sm:w-auto"
        >
          Yangi faktura
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition-all duration-300 h-full" style={{ borderTop: '3px solid #1890ff' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 mb-1">Jami fakturalar</div>
                <div className="text-2xl font-bold text-gray-800">{totalInvoices}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                <FileTextOutlined className="text-blue-500 text-xl" />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition-all duration-300 h-full" style={{ borderTop: '3px solid #52c41a' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 mb-1">Jami savdo</div>
                <div className="text-2xl font-bold text-gray-800">
                  <CompactAmount amount={convert(totalAmountVal)} currency={currency} />
                  <span className="text-sm text-gray-500 ml-1">{currency}</span>
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-full">
                <DollarOutlined className="text-green-500 text-xl" />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition-all duration-300 h-full" style={{ borderTop: '3px solid #3f8600' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 mb-1">Tushum</div>
                <div className="text-2xl font-bold text-gray-800">
                  <CompactAmount amount={convert(totalPaidVal)} currency={currency} />
                  <span className="text-sm text-gray-500 ml-1">{currency}</span>
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircleOutlined className="text-green-700 text-xl" />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition-all duration-300 h-full" style={{ borderTop: '3px solid #cf1322' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 mb-1">Qarzdorlik</div>
                <div className="text-2xl font-bold text-red-600">
                  <CompactAmount amount={convert(totalBalanceVal)} currency={currency} />
                  <span className="text-sm text-gray-500 ml-1">{currency}</span>
                </div>
              </div>
              <div className="bg-red-50 p-3 rounded-full">
                <ClockCircleOutlined className="text-red-500 text-xl" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

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
            <Space>
              <Button
                icon={<PrinterOutlined />}
                onClick={handlePrint}
                size="large"
              >
                Chop etish
              </Button>
              <Button
                icon={<FileExcelOutlined />}
                className="bg-green-600 text-white hover:!bg-green-500 hover:!text-white border-green-600"
                onClick={handleExportExcel}
                size="large"
              >
                Excel
              </Button>
            </Space>
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={invoicesData?.data || []}
          rowKey="_id"
          loading={isLoading}
          scroll={{ x: 800 }}
          pagination={{
            current: invoicesData?.pagination?.page || 1,
            pageSize: invoicesData?.pagination?.limit || 10,
            total: invoicesData?.pagination?.total || 0,
          }}
          onChange={() => refetch()}
        />
      </Card>

      <Modal
        title="Fakturani o'chirish"
        open={deleteModalVisible}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDeletingInvoice(null);
        }}
        onOk={() => {
          if (deletingInvoice) {
            deleteInvoiceMutation.mutate(deletingInvoice._id);
            setDeleteModalVisible(false);
            setDeletingInvoice(null);
          }
        }}
        okText="O'chirish"
        okButtonProps={{ danger: true }}
        cancelText="Bekor qilish"
        confirmLoading={deleteInvoiceMutation.isLoading}
      >
        {deletingInvoice && (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Faktura №:</span>
              <b>{deletingInvoice.invoiceNo}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Mijoz:</span>
              <b>{deletingInvoice.clientMeta?.name}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Faktura summasi:</span>
              <b className="text-green-600">${deletingInvoice.netTotal}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Mijoz holati:</span>
              <Tag color={(deletingInvoice.clientId as any)?.balance < 0 ? "red" : "green"}>
                {(deletingInvoice.clientId as any)?.balance < 0
                  ? `Qarzi bor: $${Math.abs((deletingInvoice.clientId as any)?.balance || 0)}`
                  : `Avansi bor: $${(deletingInvoice.clientId as any)?.balance || 0}`
                }
              </Tag>
            </div>
            <div className="p-3 bg-red-50 rounded border border-red-200 text-yellow-600 text-sm">
              {(() => {
                const balance = (deletingInvoice.clientId as any)?.balance || 0;
                const netTotal = deletingInvoice.netTotal;
                const newBalance = balance + netTotal;

                if (balance === 0) {
                  return <>Faktura o'chirilsa mijozga <b>${netTotal}</b> avans yoziladi.</>;
                } else if (balance < 0) {
                  if (newBalance >= 0) {
                    return <>Faktura o'chirilsa mijozning <b>${Math.abs(balance)}</b> qarzi to'lanib, <b>${newBalance}</b> avans qoladi.</>;
                  }
                  return <>Faktura o'chirilsa mijozning qarzi <b>${Math.abs(balance)}</b> dan <b>${Math.abs(newBalance)}</b> ga tushadi.</>;
                } else {
                  return <>Faktura o'chirilsa mijozning avansi <b>${balance}</b> dan <b>${newBalance}</b> ga ko'tariladi.</>;
                }
              })()}
            </div>
          </div>
        )}
      </Modal>

      {/* handleDelete(record._id) */}
    </div>
  );
};

export default InvoicesPage;
