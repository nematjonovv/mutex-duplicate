import React, { useMemo, useRef, useState } from "react";
import { Card, Table, Input, Tag, Button, Space, Modal, Form, InputNumber } from "antd";
import { SearchOutlined, UserOutlined, ArrowRightOutlined, FileExcelOutlined, PrinterOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import ourDebtService from "@/services/ourDebtService";
import { OurDebt } from "@/types";
import { formatCurrency, formatDate } from "@/utils";
import { useCurrency } from "@/hooks/useCurrency";
import LoadingSpinner from "@/components/LoadingSpinner";
import { exportToExcel } from "@/utils/excelUtils";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";

const { Search } = Input;

type PrintableOurDebtsListProps = {
  debts: OurDebt[];
  currency: string;
  convertPrice: (n: number) => number;
};

const PrintableOurDebtsList = React.forwardRef<HTMLDivElement, PrintableOurDebtsListProps>(
  ({ debts, currency, convertPrice }, ref) => {
    const totalDebt = debts.reduce((s, c) => s + (c.currentDebt || 0), 0);

    return (
      <div ref={ref} style={{ padding: "32px", background: "white", fontFamily: "Arial, sans-serif" }}>
        <style>{`@media print { @page { size: A4 landscape; margin: 16mm; } }`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #222", paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, textTransform: "uppercase", color: "#111", letterSpacing: 1 }}>
              Bizning qarzlar ro'yxati
            </div>
            <div style={{ marginTop: 6, color: "#555", fontSize: 13 }}>
              Jami yozuvlar: <b>{debts.length} ta</b>
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 13, color: "#555" }}>
            <div>Chop etilgan: <b>{dayjs().format("DD.MM.YYYY HH:mm")}</b></div>
            <div style={{ marginTop: 4 }}>
              Umumiy qarz: <b style={{ color: "#dc2626" }}>{formatCurrency(convertPrice(totalDebt), currency)}</b>
            </div>
          </div>
        </div>

        {/* Jadval */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              {["#", "Kreditor", "Sabab", "Sana", "Joriy qarz"].map((h) => (
                <th
                  key={h}
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px 6px",
                    textAlign: ["Joriy qarz", "#"].includes(h) ? "right" : "left",
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
            {debts.map((d, index) => (
              <tr key={d._id} style={{ backgroundColor: index % 2 === 0 ? "white" : "#f9fafb" }}>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", color: "#888", whiteSpace: "nowrap" }}>
                  {index + 1}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", fontWeight: 600 }}>
                  {d.creditorName}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", color: "#555" }}>
                  {d.reasonType}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", color: "#555" }}>
                  {formatDate(d.occurredAt)}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 600, color: (d.currentDebt || 0) > 0 ? "#dc2626" : "#111" }}>
                  {formatCurrency(convertPrice(d.currentDebt || 0), currency)}
                </td>
              </tr>
            ))}

            {/* Jami */}
            <tr style={{ background: "#f9fafb", fontWeight: 700 }}>
              <td colSpan={4} style={{ border: "1px solid #d1d5db", padding: "8px 6px", textAlign: "right" }}>
                Jami:
              </td>
              <td style={{ border: "1px solid #d1d5db", padding: "8px 6px", textAlign: "right", color: "#dc2626" }}>
                {formatCurrency(convertPrice(totalDebt), currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
);

const OurDebtPage: React.FC = () => {
  const navigate = useNavigate();
  const { currency, convertPrice } = useCurrency();
  const printRef = useRef<HTMLDivElement>(null);

  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const { data: debtsData, isLoading, refetch } = useApiQuery(
    ["our-debts", searchText],
    () => ourDebtService.getAll({ creditorName: searchText, limit: 1000 })
  );
  console.log("debtsData",debtsData);

  const { data: summaryData } = useApiQuery(
    ["our-debts-summary"],
    () => ourDebtService.getOurDebtSummary()
  );
console.log(summaryData);

  const createDebtMutation = useApiMutation(
    (data: any) => ourDebtService.createCreditor(data),
    {
      successMessage: "Qarz muvaffaqiyatli qo'shildi",
      invalidateQueries: ["our-debts", "our-debts-summary"],
      onSuccess: () => {
        setIsModalVisible(false);
        form.resetFields();
        refetch();
      },
    }
  );

  

  const debts = (debtsData?.data || []) as OurDebt[];

  const filteredDebts = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return debts.filter((d: any) => {
      if (!q) return true;
      return d.name?.toLowerCase().includes(q);
    });
  }, [debts, searchText]);

  const pagedDebts = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    return filteredDebts.slice(start, start + pagination.pageSize);
  }, [filteredDebts, pagination]);

  const totalDebt = summaryData?.summary?.totalDebt || 0;

  const handleExportExcel = () => {
    const data = filteredDebts.map((d) => ({
      "Kreditor": d.creditorName,
      "Sabab": d.reasonType,
      "Joriy qarz": convertPrice(d.currentDebt || 0),
      "Sana": formatDate(d.occurredAt),
    }));
    exportToExcel(data, `Bizning_qarzlar_${new Date().toLocaleDateString()}`);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const handleSubmit = (values: any) => {
    createDebtMutation.mutate({
      ...values,
      occurredAt: new Date().toISOString(),
    });
  };

  const columns = [
    {
      title: "Kreditor",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <div className="flex items-center">
          <UserOutlined className="mr-2 text-red-500" />
          <div className="font-medium">{name}</div>
        </div>
      ),
    },
    {
      title: "Joriy qarz",
      dataIndex: "balance",
      key: "balance",
      render: (value: number) => (
        <div className={`font-semibold ${value < 0 ? "text-red-600" : "text-green-600"}`}>
          {value < 0 ? "Qarz: " : "Haq: "}
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
          {value < 0 ? "Qarzimiz bor" : "Haqimiz bor"}
        </Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<ArrowRightOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/our-debts/${record._id}`);
          }}
        >
          Batafsil
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Bizning qarzlar</h1>
          <p className="text-gray-600">Kreditorlar oldidagi qarzlar ro'yxati</p>
        </div>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
            Qarz olish
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
        </Space>
      </div>

      <div style={{ display: "none" }}>
        <PrintableOurDebtsList ref={printRef} debts={filteredDebts} currency={currency} convertPrice={convertPrice} />
      </div>

      <Card className="shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          <Search
            placeholder="Kreditor nomi bo'yicha qidirish..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={setSearchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="max-w-md flex-grow"
          />
          <div className="text-sm text-gray-500 ml-auto">
            Jami: {filteredDebts.length} ta yozuv
          </div>
        </div>
      </Card>

      <Card className="shadow-sm">
        <Table
          columns={columns}
          dataSource={pagedDebts}
          rowKey="_id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: filteredDebts.length,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} dan ${total} ta`,
          }}
          onChange={(newPagination) => {
            setPagination({
              current: newPagination.current || 1,
              pageSize: newPagination.pageSize || 20,
            });
          }}
          onRow={(record) => ({
            onClick: () => navigate(`/our-debts/${record._id}`),
          })}
        />
      </Card>

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
            name="name"
            label="Kimdan (Kreditor)"
            rules={[{ required: true, message: "Kreditor nomini kiriting!" }]}
          >
            <Input placeholder="Masalan: Paxta zavodi yoki Ism" />
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
            label="Sababi / Izoh"
            rules={[{ required: true, message: "Sababini kiriting!" }]}
          >
            <Input placeholder="Masalan: Mahsulot uchun, Xizmat uchun..." />
          </Form.Item>

          <Form.Item name="note" label="Qo'shimcha izoh">
            <Input.TextArea rows={3} placeholder="Ixtiyoriy izohlar..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OurDebtPage;
