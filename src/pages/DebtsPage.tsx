import React, { useMemo, useRef, useState } from "react";
import { Card, Table, Input, Tag, Button, Space, Modal, Form, Select, InputNumber } from "antd";
import { SearchOutlined, UserOutlined, PhoneOutlined, ArrowRightOutlined, FileExcelOutlined, PrinterOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import { clientService } from "@/services/clientService";
import debtService from "@/services/debtService";
import { Client } from "@/types";
import { formatCurrency, formatPhone, formatDate } from "@/utils";
import { useCurrency } from "@/hooks/useCurrency";
import LoadingSpinner from "@/components/LoadingSpinner";
import { exportToExcel } from "@/utils/excelUtils";
import { useReactToPrint } from "react-to-print";
import AllDebtsLedger from "./components/DebtListView";
import dayjs from "dayjs";

const { Search } = Input;
type PrintableDebtsListProps = {
  clients: Client[];
  currency: string;
  convertPrice: (n: number) => number;
};

const PrintableDebtsList = React.forwardRef<HTMLDivElement, PrintableDebtsListProps>(
  ({ clients, currency, convertPrice }, ref) => {
    const totalDebt = clients.reduce((s, c) => s + (c.balance < 0 ? Math.abs(c.balance) : 0), 0);
    const totalAdvance = clients.reduce((s, c) => s + (c.balance > 0 ? c.balance : 0), 0);
    return (
      <div ref={ref} style={{ padding: "32px", background: "white", fontFamily: "Arial, sans-serif" }}>
        <style>{`@media print { @page { size: A4 landscape; margin: 16mm; } }`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #222", paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, textTransform: "uppercase", color: "#111", letterSpacing: 1 }}>
              Qarzlar ro'yxati
            </div>
            <div style={{ marginTop: 6, color: "#555", fontSize: 13 }}>
              Jami mijozlar: <b>{clients.length} ta</b>
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 13, color: "#555" }}>
            <div>Chop etilgan: <b>{dayjs().format("DD.MM.YYYY HH:mm")}</b></div>
            <div style={{ marginTop: 4 }}>
              Umumiy qarz: <b style={{ color: "#dc2626" }}>{formatCurrency(convertPrice(totalDebt), currency)}</b>
            </div>
            {totalAdvance > 0 && (
              <div style={{ marginTop: 2 }}>
                Umumiy avans: <b style={{ color: "#16a34a" }}>{formatCurrency(convertPrice(totalAdvance), currency)}</b>
              </div>
            )}
          </div>
        </div>

        {/* Jadval */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              {["#", "Mijoz", "Telefon", "Holat", "Haq (avans)"].map((h) => (
                <th
                  key={h}
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px 6px",
                    textAlign: ["Joriy qarz", "Haq (avans)", "#"].includes(h) ? "right" : "left",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    color: "#111",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((c, index) => (
              <tr key={c._id} style={{ backgroundColor: index % 2 === 0 ? "white" : "#f9fafb" }}>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", color: "#888", whiteSpace: "nowrap" }}>
                  {index + 1}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", fontWeight: 600 }}>
                  {c.name}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", whiteSpace: "nowrap", color: "#555" }}>
                  {formatPhone(c.phone)}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 600, color: (c.currentDebt || 0) > 0 ? "#dc2626" : "#111" }}>
                  {formatCurrency(convertPrice(c.currentDebt || 0), currency)}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 600, color: (c.advanceBalance || 0) > 0 ? "#16a34a" : "#111" }}>
                  {formatCurrency(convertPrice(c.advanceBalance || 0), currency)}
                </td>
              </tr>
            ))}

            {/* Jami */}
            <tr style={{ background: "#f9fafb", fontWeight: 700 }}>
              <td colSpan={3} style={{ border: "1px solid #d1d5db", padding: "8px 6px", textAlign: "right" }}>
                Jami:
              </td>
              <td style={{ border: "1px solid #d1d5db", padding: "8px 6px", textAlign: "right", color: "#dc2626" }}>
                {formatCurrency(convertPrice(totalDebt), currency)}
              </td>
              <td style={{ border: "1px solid #d1d5db", padding: "8px 6px", textAlign: "right", color: "#16a34a" }}>
                {formatCurrency(convertPrice(totalAdvance), currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
);

const DebtsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currency, convertPrice } = useCurrency();
  const printRef = useRef<HTMLDivElement>(null);

  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const { data: summaryData, isLoading, refetch } = useApiQuery(
    ["clients-debt-summary"],
    () => clientService.getClientsWithDebtSummary()
  );

  // Client search for debt modal
  const [clientSearch, setClientSearch] = useState("");
  const { data: clientsData, isLoading: clientsLoading } = useApiQuery(
    ["clients-search", clientSearch],
    () => clientService.getAll({ search: clientSearch, limit: 10 }),
    { enabled: isModalVisible }
  );

  const createDebtMutation = useApiMutation(
    (data: any) => debtService.create(data),
    {
      successMessage: "Qarz muvaffaqiyatli qo'shildi",
      invalidateQueries: ["clients-debt-summary", "clients"],
      onSuccess: () => {
        setIsModalVisible(false);
        form.resetFields();
        refetch();
      },
    }
  );

  const clients = (summaryData?.clients || []) as Client[];

  const filteredClients = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return clients.filter((c) => {
      const hasDebt = (c.balance || 0) < 0;
      const hasAdvance = (c.balance || 0) > 0;

      if (!hasDebt && !hasAdvance) return false;
      if (!q) return true;
      return (
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
      );
    });
  }, [clients, searchText]);

  const debtorsOnly = filteredClients.filter((c) => (c.balance || 0) < 0);

  const pagedClients = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    return filteredClients.slice(start, start + pagination.pageSize);
  }, [filteredClients, pagination]);

  const totalDebt = summaryData?.summary?.totalDebt || 0;
  const totalDebtors = summaryData?.summary?.clientsWithDebt || 0;
  const totalAdvance = clients.reduce((sum, c) => sum + (c.advanceBalance || 0), 0);

  const handleExportExcel = () => {
    const data = debtorsOnly.map((c) => ({
      "Mijoz": c.name,
      "Telefon": c.phone,
      "Joriy qarz": convertPrice(c.currentDebt || 0),
      "Qo'shilgan sana": formatDate(c.createdAt),
    }));
    exportToExcel(data, `Qarzlar_royxati_${new Date().toLocaleDateString()}`);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const handleSubmit = (values: any) => {
    createDebtMutation.mutate({
      ...values,
      paymentMethod: "CASH", // Default payment method
      occurredAt: new Date().toISOString(),
    });
  };

  const columns = [
    {
      title: "Mijoz",
      dataIndex: "name",
      key: "name",
      render: (_: string, record: Client) => (
        <div className="flex items-center">
          <UserOutlined className="mr-2 text-blue-500" />
          <div>
            <div className="font-medium">{record.name}</div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <PhoneOutlined />
              {formatPhone(record.phone)}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Holat summasi",
      dataIndex: "balance",
      key: "currentDebt",
      render: (value: number) => (
        <div className={`font-semibold ${value < 0 ? "text-red-600" : "text-green-600"}`}>
          {value < 0 ? "Qarz: " : "Avans: "}
          {formatCurrency(convertPrice(Math.abs(value || 0)), currency)}
        </div>
      ),
    },
    {
      title: "Holat",
      dataIndex: "balance",
      key: "status",
      render: (value: number) => (
        <Tag color={value < 0 ? "red" : "green"}>
          {value < 0 ? "Qarzi bor" : "Avans bor"}
        </Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      render: (_: any, record: Client) => (
        <Button
          type="link"
          icon={<ArrowRightOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/debts/${record._id}`);
          }}
        >
          Batafsil
        </Button>
      ),
    },
  ];
  const [activeView, setActiveView] = useState<'debts' | 'list'>("debts");

  if (isLoading) {
    return <LoadingSpinner />;
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Qarzlar</h1>
          <p className="text-gray-600">Qarzdor mijozlar ro'yxati</p>
        </div>
        <Space className={`${activeView === 'list' ? "hidden" : "flex"}`}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
            Yangi qarz
          </Button>
          <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>
            Excel
          </Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Chop etish
          </Button>
          <Tag color="red" className="text-base px-3 py-1">
            Jami qarz: {formatCurrency(convertPrice(totalDebt), currency)}
          </Tag>
          <Tag color="green" className="text-base px-3 py-1">
            Jami haq: {formatCurrency(convertPrice(totalAdvance), currency)}
          </Tag>
        </Space>
      </div>

      <div style={{ display: "none" }}>
        <PrintableDebtsList ref={printRef} clients={debtorsOnly} currency={currency} convertPrice={convertPrice} />
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-3">
        <Button
          type={activeView === 'debts' ? 'primary' : 'default'}
          onClick={() => setActiveView('debts')}
        >
          Qarzlar
        </Button>
        <Button
          type={activeView === 'list' ? 'primary' : 'default'}
          onClick={() => setActiveView('list')}
        >
          Qarzlar ro'yxati
        </Button>
      </div>

      {/* Qarzlar view */}
      {activeView === 'debts' && (
        <>
          {/* Search */}
          <Card className="shadow-sm">
            <div className="flex flex-wrap gap-4 items-center">
              <Search
                placeholder="Mijoz nomi yoki telefon bo'yicha qidirish..."
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                onSearch={(value) => {
                  setSearchText(value);
                  setPagination({ ...pagination, current: 1 });
                }}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPagination({ ...pagination, current: 1 });
                }}
                className="max-w-md flex-grow"
              />
              <div className="text-sm text-gray-500 ml-auto">
                Jami: {filteredClients.length} mijoz
              </div>
            </div>
          </Card>

          {/* Clients Table */}
          <Card className="shadow-sm">
            <Table
              columns={columns}
              dataSource={pagedClients}
              rowKey="_id"
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: filteredClients.length,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} dan ${total} ta`,
                pageSizeOptions: ["10", "20", "50", "100"],
              }}
              onChange={(newPagination) => {
                setPagination({
                  current: newPagination.current || 1,
                  pageSize: newPagination.pageSize || 20,
                });
              }}
              onRow={(record) => ({
                onClick: () => navigate(`/debts/${record._id}`),
              })}
            />
          </Card>
        </>
      )}

      {/* Qarzlar ro'yxati view — bo'sh div */}
      {activeView === 'list' && (
        <div className="min-h-40">
          <AllDebtsLedger />
        </div>
      )}

      {/* Add Debt Modal */}
      <Modal
        title="Yangi qarz qo'shish"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createDebtMutation.isLoading}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="clientId"
            label="Mijoz"
            rules={[{ required: true, message: "Mijozni tanlang!" }]}
          >
            <Select
              showSearch
              placeholder="Mijozni qidirish..."
              filterOption={false}
              onSearch={setClientSearch}
              loading={clientsLoading}
            >
              {clientsData?.data?.map((c: Client) => (
                <Select.Option key={c._id} value={c._id}>
                  {c.name} ({formatPhone(c.phone)})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label={`Summa (${currency})`}
            rules={[{ required: true, message: "Summani kiriting!" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
              parser={(value) => value!.replace(/\s?|UZS/g, "") as any}
              placeholder="0"
              min={1}
            />
          </Form.Item>

          <Form.Item
            name="reasonType"
            label="Sababi"
            rules={[{ required: true, message: "Sababini kiriting!" }]}
          >
            <Select placeholder="Qarz sababini tanlang">
              <Select.Option value="MANUAL">Qo'lda qo'shildi</Select.Option>
              <Select.Option value="SERVICE">Xizmat ko'rsatish</Select.Option>
              <Select.Option value="OTHER">Boshqa</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="note" label="Izoh">
            <Input.TextArea rows={3} placeholder="Qo'shimcha izohlar..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DebtsPage;
