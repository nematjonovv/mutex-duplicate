import React, { useEffect, useMemo, useState, useRef } from "react";
import { Card, Button, Table, Tag, DatePicker } from "antd";
import { usePaginatedQuery } from "@/hooks/useApi";
import { debtService } from "@/services/debtService";
import { accountService } from "@/services/accountService";
import { CashAccount, Client, Debt } from "@/types";
import { formatCurrency, formatDateTime, formatPhone } from "@/utils";
import { useCurrency } from "@/hooks/useCurrency";
import dayjs, { Dayjs } from "dayjs";
import { PrinterOutlined } from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";

const { RangePicker } = DatePicker;

type LedgerRow = {
  key: string;
  at: Date;
  type: "DEBT" | "PAYMENT";
  clientName: string;
  clientPhone: string;
  clientId: string;
  note: string;
  debtAmount: number;
  paymentAmount: number;
  balanceAfter: number;
  accountName?: string;
  rate?: number;
};
type PrintableLedgerProps = {
  entries: LedgerRow[];
  currency: string;
  convertPrice: (n: number) => number;
  dateRange: [Dayjs | null, Dayjs | null];
  accountFilter: string;
  accounts: CashAccount[];
};

// ── Print komponenti ──
const PrintableLedger = React.forwardRef<HTMLDivElement, PrintableLedgerProps>(
  ({ entries, currency, convertPrice, dateRange, accountFilter, accounts }, ref) => {
    const selectedAccount = accounts.find((a) => a._id === accountFilter);
    const [from, to] = dateRange;

    const totalDebt = entries.reduce((s, r) => s + r.debtAmount, 0);
    const totalPayment = entries.reduce((s, r) => s + r.paymentAmount, 0);

    return (
      <div ref={ref} style={{ padding: "32px", background: "white", fontFamily: "Arial, sans-serif" }}>
        {/* Print landscape */}
        <style>{`@media print { @page { size: A4 landscape; margin: 16mm; } }`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #222", paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, textTransform: "uppercase", color: "#111", letterSpacing: 1 }}>
              Barcha qarz va to'lovlar
            </div>
            <div style={{ marginTop: 6, color: "#555", fontSize: 13 }}>
              {(from || to) && (
                <span>
                  Sana: {from ? from.format("DD.MM.YYYY") : "—"} → {to ? to.format("DD.MM.YYYY") : "—"}
                  {"  "}
                </span>
              )}
              {selectedAccount && (
                <span>Hisob: <b>{selectedAccount.name}</b> ({selectedAccount.currency})</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 13, color: "#555" }}>
            <div>Chop etilgan: <b>{dayjs().format("DD.MM.YYYY HH:mm")}</b></div>
            <div style={{ marginTop: 4 }}>Jami yozuv: <b>{entries.length} ta</b></div>
          </div>
        </div>

        {/* Jadval */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              {["#", "Sana", "Turi", "Mijoz", "Telefon", "Izoh", "Qarz", "To'lov", "Hisob", "Kurs", "Qoldiq"].map((h) => (
                <th
                  key={h}
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px 6px",
                    textAlign: ["Qarz", "To'lov", "Kurs", "Qoldiq", "#"].includes(h) ? "right" : "left",
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
            {entries.map((row, index) => (
              <tr
                key={row.key}
                style={{ backgroundColor: row.type === "DEBT" ? "#fff1f0" : "white" }}
              >
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", color: "#888", whiteSpace: "nowrap" }}>
                  {index + 1}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", whiteSpace: "nowrap" }}>
                  {formatDateTime(row.at.toISOString())}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", whiteSpace: "nowrap" }}>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    background: row.type === "DEBT" ? "#fee2e2" : "#dcfce7",
                    color: row.type === "DEBT" ? "#dc2626" : "#16a34a",
                  }}>
                    {row.type === "DEBT" ? "Qarz" : "To'lov"}
                  </span>
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", fontWeight: 600 }}>
                  {row.clientName}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", whiteSpace: "nowrap", color: "#555" }}>
                  {formatPhone(row.clientPhone)}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", maxWidth: 200 }}>
                  {row.note}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", whiteSpace: "nowrap", color: "#dc2626", fontWeight: 500 }}>
                  {row.debtAmount > 0 ? formatCurrency(convertPrice(row.debtAmount), currency) : "-"}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", whiteSpace: "nowrap", color: "#16a34a", fontWeight: 500 }}>
                  {row.paymentAmount > 0 ? formatCurrency(convertPrice(row.paymentAmount), currency) : "-"}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", whiteSpace: "nowrap" }}>
                  {row.accountName || "-"}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", whiteSpace: "nowrap" }}>
                  {row.rate && row.rate !== 1 ? row.rate.toLocaleString() : "-"}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 700, color: row.balanceAfter > 0 ? "#dc2626" : "#16a34a" }}>
                  {formatCurrency(convertPrice(row.balanceAfter), currency)}
                </td>
              </tr>
            ))}
            {/* Footer — jami */}
            <tr style={{ background: "#f9fafb", fontWeight: 700 }}>
              <td colSpan={6} style={{ border: "1px solid #d1d5db", padding: "8px 6px", textAlign: "right" }}>
                Jami:
              </td>
              <td style={{ border: "1px solid #d1d5db", padding: "8px 6px", textAlign: "right", color: "#dc2626" }}>
                {formatCurrency(convertPrice(totalDebt), currency)}
              </td>
              <td style={{ border: "1px solid #d1d5db", padding: "8px 6px", textAlign: "right", color: "#16a34a" }}>
                {formatCurrency(convertPrice(totalPayment), currency)}
              </td>
              <td colSpan={3} style={{ border: "1px solid #d1d5db", padding: "8px 6px" }} />
            </tr>
          </tbody>

        </table>
      </div>
    );
  }
);

const AllDebtsLedger: React.FC = () => {
  const { currency, convertPrice } = useCurrency();
  const [accountFilter, setAccountFilter] = useState("");
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf("day"),
    dayjs().endOf("day"),
  ]);

  // ── Print ref ──
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  // ── Queries ──
  const { data: accountsData } = usePaginatedQuery(
    ["accounts", "all-ledger"],
    (params) => accountService.getAccounts(params),
    { page: 1, limit: 100 }
  );

  const { data: allDebtsData, isLoading: debtsLoading } = usePaginatedQuery(
    ["all-debts-ledger"],
    (params) => debtService.getAll(params),
    { page: 1, limit: 100 }
  );

  const accounts = (accountsData?.data || []) as CashAccount[];
  const allDebts = (allDebtsData?.data || []) as (Debt & {
    clientId: Client | string;
    payments?: any[];
  })[];

  // ── Build ledger ──
  const ledgerEntries = useMemo(() => {
    const rows: Omit<LedgerRow, "balanceAfter">[] = [];

    allDebts.forEach((debt) => {
      const clientObj = typeof debt.clientId === "object" ? debt.clientId as Client : null;
      const clientName = clientObj?.name || "-";
      const clientPhone = clientObj?.phone || "-";
      const clientId = clientObj?._id || (debt.clientId as string) || "";

      rows.push({
        key: `debt-${debt._id}`,
        at: new Date(debt.occurredAt),
        type: "DEBT",
        clientName,
        clientPhone,
        clientId,
        note: `${debt.reasonType}${debt.invoiceNo ? ` (${debt.invoiceNo})` : ""}`,
        debtAmount: debt.amount || 0,
        paymentAmount: 0,
        accountName: undefined,
        rate: undefined,
      });

      (debt.payments || []).forEach((payment: any, idx: number) => {
        rows.push({
          key: `payment-${debt._id}-${idx}`,
          at: new Date(payment.date),
          type: "PAYMENT",
          clientName,
          clientPhone,
          clientId,
          note: payment.note ? `Qarz to'lovi - ${payment.note}` : "Qarz to'lovi",
          debtAmount: 0,
          paymentAmount: payment.amount || 0,
          accountName: payment.accountId
            ? accounts.find((a) => a._id === payment.accountId)?.name || ""
            : "",
          rate: payment.rate,
        });
      });
    });

    rows.sort((a, b) => {
      const d = a.at.getTime() - b.at.getTime();
      if (d !== 0) return d;
      return a.type === "DEBT" ? -1 : 1;
    });

    let runningBalance = 0;
    return rows
      .map((row) => {
        runningBalance += row.debtAmount;
        runningBalance -= row.paymentAmount;
        return { ...row, balanceAfter: Math.max(0, runningBalance) };
      })
      .reverse();
  }, [allDebts]);

  // ── Filters ──
  const filteredEntries = useMemo(() => {
    let result = ledgerEntries;

    if (accountFilter) {
      result = result.filter(
        (e) =>
          e.type === "PAYMENT" &&
          accounts.find((a) => a._id === accountFilter)?.name?.toLowerCase() ===
          e.accountName?.toLowerCase()
      );
    }

    const [from, to] = dateRange;
    if (from)
      result = result.filter(
        (e) => dayjs(e.at).valueOf() >= from.startOf("day").valueOf()
      );
    if (to)
      result = result.filter(
        (e) => dayjs(e.at).valueOf() <= to.endOf("day").valueOf()
      );

    return result;
  }, [ledgerEntries, accountFilter, dateRange, accounts]);

  // ── Columns ──
  const columns = [
    {
      title: "Sana",
      dataIndex: "at",
      key: "at",
      width: 160,
      render: (v: Date) => formatDateTime(v.toISOString()),
    },
    {
      title: "Turi",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (v: string) =>
        v === "DEBT" ? (
          <Tag color="red">Qarz</Tag>
        ) : (
          <Tag color="green">To'lov</Tag>
        ),
    },
    {
      title: "Mijoz",
      key: "client",
      width: 180,
      render: (_: any, row: LedgerRow) => (
        <div>
          <div className="font-medium">{row.clientName}</div>
          <div className="text-xs text-gray-400">{formatPhone(row.clientPhone)}</div>
        </div>
      ),
    },
    {
      title: "Izoh",
      dataIndex: "note",
      key: "note",
    },
    {
      title: "Qarz",
      dataIndex: "debtAmount",
      key: "debtAmount",
      width: 140,
      align: "right" as const,
      render: (v: number) =>
        v > 0 ? (
          <span className="text-red-500 font-medium">
            {formatCurrency(convertPrice(v), currency)}
          </span>
        ) : (
          "-"
        ),
    },
    {
      title: "To'lov",
      dataIndex: "paymentAmount",
      key: "paymentAmount",
      width: 140,
      align: "right" as const,
      render: (v: number) =>
        v > 0 ? (
          <span className="text-green-600 font-medium">
            {formatCurrency(convertPrice(v), currency)}
          </span>
        ) : (
          "-"
        ),
    },
    {
      title: "Hisob",
      dataIndex: "accountName",
      key: "accountName",
      width: 130,
      render: (v: string) => v || "-",
    },
    {
      title: "Kurs",
      dataIndex: "rate",
      key: "rate",
      width: 100,
      align: "right" as const,
      render: (v?: number) => (v && v !== 1 ? v.toLocaleString() : "-"),
    },
    {
      title: "Qoldiq",
      dataIndex: "balanceAfter",
      key: "balanceAfter",
      width: 150,
      align: "right" as const,
      render: (v: number) => (
        <span
          className={
            v > 0 ? "text-red-500 font-semibold" : "text-green-600 font-semibold"
          }
        >
          {formatCurrency(convertPrice(v), currency)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Print uchun yashirin div */}
      <div style={{ display: "none" }}>
        <PrintableLedger
          ref={printRef}
          entries={filteredEntries}
          currency={currency}
          convertPrice={convertPrice}
          dateRange={dateRange}
          accountFilter={accountFilter}
          accounts={accounts}
        />
      </div>

      <Card
        className="shadow-sm"
        title={
          <div className="flex flex-wrap items-center justify-between gap-4 py-2">
            <span>Barcha qarz va to'lovlar</span>
            <div className="flex flex-wrap gap-2">
              <Button
                type={!accountFilter ? "primary" : "default"}
                onClick={() => setAccountFilter("")}
                size="small"
              >
                Barchasi
              </Button>
              {accounts.map((account) => (
                <Button
                  key={account._id}
                  type={accountFilter === account._id ? "primary" : "default"}
                  onClick={() => setAccountFilter(account._id)}
                  size="small"
                >
                  {account.name} ({account.currency})
                </Button>
              ))}
            </div>
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap gap-3 items-center">
          <RangePicker
            format="DD.MM.YYYY"
            value={dateRange}
            onChange={(vals) =>
              setDateRange(vals ? [vals[0], vals[1]] : [null, null])
            }
            placeholder={["Dan", "Gacha"]}
          />
          {(dateRange[0] || dateRange[1] || accountFilter) && (
            <Button
              size="small"
              onClick={() => {
                setDateRange([null, null]);
                setAccountFilter("");
              }}
            >
              Tozalash
            </Button>
          )}
          <span className="text-sm text-gray-500 ml-auto">
            Jami: {filteredEntries.length} ta yozuv
          </span>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Chop etish
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={filteredEntries}
          rowKey="key"
          loading={debtsLoading}
          size="small"
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            pageSizeOptions: ["20", "50", "100"],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} dan ${total} ta`,
          }}
          rowClassName={(row) => (row.type === "DEBT" ? "bg-red-50" : "")}
        />
      </Card>
    </div>
  );
};

export default AllDebtsLedger;