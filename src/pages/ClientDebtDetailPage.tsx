import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Tag, Button, Select, Space, DatePicker, Input } from "antd";
import { ArrowLeftOutlined, FileExcelOutlined, PrinterOutlined, PlusOutlined, SaveOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useApiMutation, useApiQuery, usePaginatedQuery } from "@/hooks/useApi";
import { clientService } from "@/services/clientService";
import { debtService } from "@/services/debtService";
import { accountService } from "@/services/accountService";
import { Client, Debt, CashAccount } from "@/types";
import { formatCurrency, formatDate, formatDateTime, formatPhone, formatNumber } from "@/utils";
import { useCurrency } from "@/hooks/useCurrency";
import LoadingSpinner from "@/components/LoadingSpinner";
import { exportToExcel } from "@/utils/excelUtils";
import { useReactToPrint } from "react-to-print";
import Spreadsheet, {
  CellBase,
  DataEditorProps,
  DataEditor as DefaultDataEditor,
  DataViewerProps,
  DataViewer as DefaultDataViewer,
} from "react-spreadsheet";
import dayjs, { Dayjs } from "dayjs";
import { message } from "@/utils/StaticAntd";
import PaymentTable from "./components/ClientDebtDetail/PaymentTable";

const { Option } = Select;

const DateCellEditor: React.FC<DataEditorProps<CellBase>> = (props) => {
  if (props.column !== 0) return <DefaultDataEditor {...props} />;
  const rawValue = props.cell?.value ? String(props.cell.value) : "";
  const parsed = rawValue ? dayjs(rawValue, ["DD.MM.YYYY HH:mm", "DD.MM.YYYY", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"], true) : null;
  return (
    <div className="cashflow-date-editor">
      <DatePicker
        autoFocus open showTime format="DD.MM.YYYY HH:mm"
        value={parsed && parsed.isValid() ? parsed : null}
        onChange={(date) => {
          props.onChange({ ...(props.cell || { value: "" }), value: date ? date.format("DD.MM.YYYY HH:mm") : "" });
          props.exitEditMode();
        }}
        onBlur={() => props.exitEditMode()}
      />
    </div>
  );
};

const TypeCellEditor: React.FC<DataEditorProps<CellBase>> = (props) => (
  <div className="cashflow-account-editor">
    <Select
      autoFocus open
      value={props.cell?.value ? String(props.cell.value) : undefined}
      onChange={(value) => { props.onChange({ ...(props.cell || { value: "" }), value }); props.exitEditMode(); }}
      onBlur={() => props.exitEditMode()}
      style={{ width: "100%" }}
    >
      <Option value="Oldi">Oldi</Option>
      <Option value="Berdi">Berdi</Option>
    </Select>
  </div>
);

const AccountCellEditor: React.FC<DataEditorProps<CellBase> & { options: CashAccount[] }> = (props) => (
  <div className="cashflow-account-editor">
    <Select
      autoFocus showSearch open
      value={props.cell?.value ? String(props.cell.value) : undefined}
      placeholder="Hisobni tanlang"
      onChange={(value) => { props.onChange({ ...(props.cell || { value: "" }), value }); props.exitEditMode(); }}
      onBlur={() => props.exitEditMode()}
      style={{ width: "100%" }}
    >
      {props.options.map((account) => (
        <Option key={account._id} value={account.name}>{account.name} ({account.currency})</Option>
      ))}
    </Select>
  </div>
);

const AmountCellViewer: React.FC<DataViewerProps<CellBase> & { formatAmount: (v: string) => string }> = (props) => (
  <div className="cashflow-amount-viewer">{props.formatAmount(String(props.cell?.value || ""))}</div>
);

type PrintableClientDebtsProps = {
  client?: Client;
  ledgerEntries: Array<{
    key: string;
    at: Date;
    type: "DEBT" | "PAYMENT";
    note: string;
    debtAmount: number;
    paymentAmount: number;
    balanceAfter: number;
    rate?: number;
  }>;
  currency: string;
  convertPrice: (n: number) => number;
  showRateCol: boolean;
};

const PrintableClientDebts = React.forwardRef<HTMLDivElement, PrintableClientDebtsProps>(
  ({ client, ledgerEntries, currency, convertPrice, showRateCol }, ref) => {
    const totalDebt = ledgerEntries.reduce((s, r) => s + r.debtAmount, 0);
    const totalPayment = ledgerEntries.reduce((s, r) => s + r.paymentAmount, 0);

    return (
      <div ref={ref} style={{ padding: "32px", background: "white", fontFamily: "Arial, sans-serif" }}>
        <style>{`@media print { @page { size: A4 landscape; margin: 16mm; } }`}</style>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #222", paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, textTransform: "uppercase", color: "#111", letterSpacing: 1 }}>
              Oldi va Berdi
            </div>
            <div style={{ marginTop: 6, color: "#555", fontSize: 13 }}>
              {client?.name && <span style={{ fontWeight: 600 }}>{client.name}</span>}
              {client?.phone && <span style={{ marginLeft: 12 }}>{formatPhone(client.phone)}</span>}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 13, color: "#555" }}>
            <div>Chop etilgan: <b>{dayjs().format("DD.MM.YYYY HH:mm")}</b></div>
            <div style={{ marginTop: 4 }}>
              {(client?.balance || 0) < 0 ? "Joriy qarz:" : "Joriy avans:"}{" "}
              <b style={{ color: (client?.balance || 0) < 0 ? "#dc2626" : "#16a34a" }}>
                {formatCurrency(convertPrice(Math.abs(client?.balance || 0)), currency)}
              </b>
            </div>
            {(client?.advanceBalance || 0) > 0 && (
              <div style={{ marginTop: 2 }}>
                Avans:{" "}
                <b style={{ color: "#16a34a" }}>
                  {formatCurrency(convertPrice(client?.advanceBalance || 0), currency)}
                </b>
              </div>
            )}
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              {["#", "Sana", "Turi", "Izoh", "Oldi", "Berdi", ...(showRateCol ? ["Kurs"] : []), "Qoldiq"].map((h) => (
                <th
                  key={h}
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px 6px",
                    textAlign: ["Oldi", "Berdi", "Kurs", "Qoldiq", "#"].includes(h) ? "right" : "left",
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
            {ledgerEntries.map((row, index) => (
              <tr key={row.key} style={{ backgroundColor: row.type === "DEBT" ? "#fff1f0" : "white" }}>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", color: "#888", whiteSpace: "nowrap" }}>
                  {index + 1}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", whiteSpace: "nowrap" }}>
                  {formatDateTime(row.createdAt)}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", whiteSpace: "nowrap" }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: row.type === "DEBT" ? "#fee2e2" : "#dcfce7",
                    color: row.type === "DEBT" ? "#dc2626" : "#16a34a",
                  }}>
                    {row.type === "DEBT" ? "Oldi" : "Berdi"}
                  </span>
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", maxWidth: 220 }}>
                  {row.note}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", whiteSpace: "nowrap", color: "#dc2626", fontWeight: 500 }}>
                  {row.debtAmount > 0 ? formatCurrency(convertPrice(row.debtAmount), currency) : "-"}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", whiteSpace: "nowrap", color: "#16a34a", fontWeight: 500 }}>
                  {row.paymentAmount > 0 ? formatCurrency(convertPrice(row.paymentAmount), currency) : "-"}
                </td>
                {showRateCol && (
                  <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", whiteSpace: "nowrap" }}>
                    {row.rate && row.rate !== 1 ? row.rate.toLocaleString() : "-"}
                  </td>
                )}
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 700, color: row.balanceAfter > 0 ? "#dc2626" : "#16a34a" }}>
                  {formatCurrency(convertPrice(row.balanceAfter), currency)}
                </td>
              </tr>
            ))}
            <tr style={{ background: "#f9fafb", fontWeight: 700 }}>
              <td colSpan={4} style={{ border: "1px solid #d1d5db", padding: "8px 6px", textAlign: "right" }}>
                Jami:
              </td>
              <td style={{ border: "1px solid #d1d5db", padding: "8px 6px", textAlign: "right", color: "#dc2626" }}>
                {formatCurrency(convertPrice(totalDebt), currency)}
              </td>
              <td style={{ border: "1px solid #d1d5db", padding: "8px 6px", textAlign: "right", color: "#16a34a" }}>
                {formatCurrency(convertPrice(totalPayment), currency)}
              </td>
              {showRateCol && <td style={{ border: "1px solid #d1d5db", padding: "8px 6px" }} />}
              <td style={{ border: "1px solid #d1d5db", padding: "8px 6px" }} />
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
);

const ClientDebtDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const { currency, convertPrice } = useCurrency();

  // ── Refs ──
  const printRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  const syncResetRef = useRef<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paymentUpdateDebounceRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  // ── State ──
  const [sheetData, setSheetData] = useState<CellBase[][]>([]);
  const [draftCount, setDraftCount] = useState(0);
  const [accountFilter, setAccountFilter] = useState("");
  const [editedDebtRows, setEditedDebtRows] = useState<Map<string, { note: string; amount: number; debtId: string }>>(new Map());
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "DEBT" | "PAYMENT">("");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [rowMeta, setRowMeta] = useState<Array<{ type: "DEBT" | "PAYMENT"; debtId?: string; paymentId?: string } | null>>([]);
  const [editedPaymentRows, setEditedPaymentRows] = useState<Map<string, { debtId: string; paymentId: string; amount: number; note: string, rate: number }>>(new Map());
  const prevSheetDataRef = useRef<CellBase[][]>([]);
  // ── Queries ──
  const { data: clientData, isLoading: clientLoading, refetch: refetchClient } = useApiQuery(
    ["client", clientId],
    () => clientService.getClientById(clientId || ""),
    { enabled: !!clientId }
  );



  const { data: debtsData, isLoading: debtsLoading, refetch: refetchDebts } = usePaginatedQuery(
    ["client-debts", clientId],
    (params) => debtService.getDebtsByClient(clientId || "", { page: params.page, limit: params.limit }),
    { page: 1, limit: 1000 },
    { enabled: !!clientId }
  );

  const { data: accountsData } = usePaginatedQuery(
    ["accounts", "debts-detail"],
    (params) => accountService.getAccounts(params),
    { page: 1, limit: 100 }
  );

  // ── Mutations ──
  const recordClientPaymentMutation = useApiMutation(
    (data: { clientId: string; payload: any }) => debtService.recordClientPayment(data.clientId, data.payload),
    {
      successMessage: "To'lov muvaffaqiyatli taqsimlandi",
      invalidateQueries: ["invoices", "client", "client-debts", "accounts"],
      onSuccess: () => {
        refetchDebts();
        refetchClient();
        setDraftCount(0);
        setEditedDebtRows(new Map());
        setEditedPaymentRows(new Map());
      },
    }
  );

  const createDebtMutation = useApiMutation(
    (data: any) => debtService.create(data),
    {
      successMessage: "Qarz muvaffaqiyatli qo'shildi",
      invalidateQueries: ["client", "client-debts", "accounts"],
      onSuccess: () => {
        refetchDebts();
        refetchClient();
        setDraftCount(0);
        setEditedDebtRows(new Map());
        setEditedPaymentRows(new Map());
      },
    }
  );

  const updateDebtPaymentMutation = useApiMutation(
    (data: { debtId: string; paymentId: string; payload: { amount: number; note?: string, rate?: number } }) =>
      debtService.updatePayment(data.debtId, data.paymentId, data.payload),
    {
      successMessage: "To'lov muvaffaqiyatli yangilandi",
      invalidateQueries: ["invoices", "client", "client-debts", "accounts", "cash-flows"],
      onSuccess: () => { refetchDebts(); refetchClient(); },
    }
  );

  const updateDebtMutation = useApiMutation(
    (data: { id: string; payload: any }) => debtService.update(data.id, data.payload),
    {
      successMessage: "Qarz muvaffaqiyatli yangilandi",
      invalidateQueries: ["client", "client-debts"],
      onSuccess: () => { refetchDebts(); refetchClient(); },
    }
  );

  // ── Derived data ──
  const client = clientData?.client as Client | undefined;
  const debts = (debtsData?.data || []) as Debt[];
  const accounts = (accountsData?.data || []) as CashAccount[];
  console.log("debts", debts);
  console.log(client);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a._id === accountFilter) || null,
    [accounts, accountFilter]
  );

  const accountsByName = useMemo(() => {
    const map = new Map<string, CashAccount>();
    accounts.forEach((a) => map.set(a.name.toLowerCase().trim(), a));
    return map;
  }, [accounts]);

  // ── Helpers ──
  const parseAmount = (value: string) => {
    const normalized = String(value || "").replace(/\s+/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatAmountValue = useCallback((value: number) => {
    if (!Number.isFinite(value)) return "";
    const hasDecimals = value % 1 !== 0;
    return formatNumber(value, hasDecimals ? 2 : 0);
  }, []);

  const formatAmountCell = useCallback((val: string) => {
    const num = parseAmount(val);
    if (num === 0) return "";
    return formatNumber(num);
  }, []);

  // ── Column indexes ──
  const showAccountCol = !accountFilter;
  const showRateCol = !accountFilter || (selectedAccount?.currency === "UZS");

  const getColIndex = useCallback((type: "account" | "rate" | "balance") => {
    let idx = 4; // Sana(0), Izoh(1), Oldi(2), Berdi(3)
    if (type === "account") return showAccountCol ? 4 : -1;
    if (showAccountCol) idx++;
    if (type === "rate") return showRateCol ? idx : -1;
    if (showRateCol) idx++;
    if (type === "balance") return idx;
    return -1;
  }, [showAccountCol, showRateCol]);

  const accountColIdx = getColIndex("account");
  const rateColIdx = getColIndex("rate");
  const balanceColIdx = getColIndex("balance");

  // ── parseRow & isComplete ──
  const parseRow = useCallback((row: CellBase[]) => {
    const debtAmt = parseAmount(String(row[2]?.value || ""));
    const payAmt = parseAmount(String(row[3]?.value || ""));

    // Type inference: if Oldi has value -> DEBT, else if Berdi has value -> PAYMENT
    let type = "Berdi";
    if (debtAmt > 0) type = "Oldi";
    else if (payAmt > 0) type = "Berdi";

    return {
      time: String(row[0]?.value || ""),
      type,
      note: String(row[1]?.value || ""),
      debtAmount: debtAmt,
      payAmount: payAmt,
      accountName: showAccountCol
        ? String(row[accountColIdx]?.value || "").toLowerCase().trim()
        : selectedAccount?.name?.toLowerCase().trim() || "",
      rate: showRateCol
        ? parseAmount(String(row[rateColIdx]?.value || "1")) || 1
        : 1,
    };
  }, [showAccountCol, showRateCol, accountColIdx, rateColIdx, selectedAccount]);

  const isComplete = useCallback((rv: ReturnType<typeof parseRow>) => {
    if (rv.type === "Oldi") return rv.debtAmount > 0;
    if (rv.type === "Berdi") {
      if (rv.payAmount <= 0 || !rv.accountName) return false;
      if (showRateCol) {
        const account = accountsByName.get(rv.accountName) ?? selectedAccount ?? null;
        const needsRate = account?.currency === "UZS";
        if (needsRate && rv.rate <= 1) return false;
      }
      return true;
    }
    return false;
  }, [accountsByName, selectedAccount, showRateCol]);

  // ── Ledger entries ──
  type LedgerEntry = {
    key: string;
    at: Date;
    type: "DEBT" | "PAYMENT";
    note: string;
    debtAmount: number;
    paymentAmount: number;
    balanceAfter: number;
    rate?: number;
    accountName?: string;
    debtId?: string;
    paymentId?: string;
    isEdited?: boolean;
  };



  const ledgerEntries = useMemo(() => {
    const rows: Array<Omit<LedgerEntry, "balanceAfter"> & { balanceAfter: number }> = [];

    debts.forEach((debt: any) => {
      if (debt.type === "DEBT") {
        rows.push({
          key: `debt-${debt._id}`,
          debtId: debt._id,
          at: new Date(debt.createdAt),
          type: "DEBT",
          note: debt.note || debt.invoiceNo || "",
          debtAmount: debt.amount || 0,
          paymentAmount: 0,
          balanceAfter: debt.balanceAfter || 0,
          accountName: undefined,
        });
      } else if (debt.type === "PAYMENT" || debt.type === "ADVANCE") {
        rows.push({
          key: `payment-${debt._id}`,
          debtId: debt._id,
          at: new Date(debt.createdAt),
          type: "PAYMENT",
          note: debt.note || "",
          debtAmount: 0,
          paymentAmount: debt.amount || 0,
          balanceAfter: debt.balanceAfter || 0,
          rate: debt.rate,
          accountName: debt.accountId
            ? accounts.find((a) => a._id === debt.accountId)?.name || ""
            : "",
          isEdited: debt.isEdited,
        });
      }
    });

    rows.sort((a, b) => {
      const d = a.at.getTime() - b.at.getTime();
      if (d !== 0) return d;
      return a.type === "DEBT" ? -1 : 1;
    });

    return rows.reverse();
  }, [debts, accounts]);

  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      if (typeFilter && entry.type !== typeFilter) return false;
      if (searchText && !entry.note.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (dateRange) {
        const entryDate = dayjs(entry.at);
        if (entryDate.isBefore(dateRange[0].startOf("day"))) return false;
        if (entryDate.isAfter(dateRange[1].endOf("day"))) return false;
      }
      return true;
    });
  }, [ledgerEntries, typeFilter, searchText, dateRange]);
  // ── Handlers ──
  const lastRateRef = useRef<string>("");
  const addDraftRow = () => {
    if (!accountFilter) { message.info("To'lov qilish uchun avval hisobni tanlang"); return; }
    const nowLabel = dayjs().format("DD.MM.YYYY HH:mm");
    const newRow: CellBase[] = [{ value: nowLabel }, { value: "" }, { value: "" }, { value: "" }];
    if (showAccountCol) newRow.push({ value: selectedAccount?.name || "" });
    if (showRateCol) newRow.push({ value: lastRateRef.current });
    newRow.push({ value: "", readOnly: true });
    setSheetData((prev) => [newRow, ...prev]);
    setDraftCount((prev) => prev + 1);
  };



  const handleCreateDrafts = useCallback((currentData?: CellBase[][]) => {
    if (draftCount === 0) { message.info("Yangi qator qo'shilmagan"); return; }
    const sourceData = currentData ?? sheetData;
    const draftRows = sourceData.slice(0, draftCount);

    draftRows.forEach((row) => {
      const rv = parseRow(row);
      if (!isComplete(rv)) return;

      const time = dayjs(rv.time, "DD.MM.YYYY HH:mm", true);
      const occurredAt = time.isValid() ? time.toISOString() : new Date().toISOString();

      if (rv.type === "Oldi") {
        if (rv.debtAmount <= 0) { message.error("Qarz miqdorini kiriting"); return; }
        createDebtMutation.mutate({ clientId, amount: rv.debtAmount, reasonType: rv.note || "Qo'lda qo'shildi", note: rv.note, occurredAt, paymentMethod: "CASH" });
      } else {
        if (rv.payAmount <= 0) { message.error("To'lov miqdorini kiriting"); return; }
        const account = accountsByName.get(rv.accountName);
        if (!account) { message.error(`Hisob topilmadi: ${rv.accountName}`); return; }




        recordClientPaymentMutation.mutate({
          clientId: clientId!,
          payload: {
            amount: rv.payAmount,
            paymentMethod: "CASH",
            note: rv.note,
            accountId: account._id,
            currency: account.currency || "USD",
            rate: account.currency === "UZS" ? rv.rate : undefined,
            amountUSD: account.currency === "UZS" ? rv.payAmount / rv.rate : rv.payAmount,
            date: occurredAt
          },
        });



      }
    });
  }, [draftCount, sheetData, parseRow, isComplete, clientId, accountsByName, createDebtMutation, recordClientPaymentMutation]);

  const handleSheetChange = (data: CellBase[][]) => {
    if (syncingRef.current) return;

    data.forEach((row, idx) => {
      if (idx < draftCount) return;
      const entryIdx = idx - draftCount;
      const entry = filteredEntries[entryIdx];
      if (!entry || entry.type !== "DEBT") return;

      const newNote = String(row[1]?.value || "").trim();
      const originalNote = (entry.note || "").trim();
      const newAmount = parseAmount(String(row[2]?.value || ""));

      const noteChanged = (newNote !== originalNote) && (newNote !== "-" || originalNote !== "");
      const amountChanged = newAmount !== entry.debtAmount;

      if (noteChanged || amountChanged) {
        setEditedDebtRows(prev => new Map(prev).set(entry.key, {
          note: newNote,
          amount: newAmount,
          debtId: entry.debtId!,
        }));
      }
    });

    data.forEach((row, idx) => {
      if (idx < draftCount) return;
      const meta = rowMeta[idx];
      if (!meta || meta.type !== "PAYMENT" || !meta.debtId) return;

      if (showRateCol) {
        const rateVal = String(row[rateColIdx]?.value || "");
        if (rateVal && rateVal !== "1") {
          lastRateRef.current = rateVal;
        }
      }

      const newAmount = parseAmount(String(row[3]?.value || ""));
      const newNote = String(row[1]?.value || "").trim();
      const originalNote = (ledgerEntries[idx - draftCount]?.note || "").trim();

      const entryIdx = idx - draftCount;
      const originalEntry = filteredEntries[entryIdx];
      if (!originalEntry) return;

      const amountChanged = newAmount !== originalEntry.paymentAmount && newAmount > 0;
      const noteChanged = (newNote !== originalNote) && (newNote !== "-" || originalNote !== "");
      const newRate = showRateCol ? parseAmount(String(row[rateColIdx]?.value || "1")) || 1 : 1;
      const rateChanged = showRateCol && newRate !== (originalEntry.rate || 1);

      if (!amountChanged && !noteChanged && !rateChanged) return;

      setEditedPaymentRows(prev => new Map(prev).set(meta.paymentId!, {
        debtId: meta.debtId!,
        paymentId: meta.debtId!,
        amount: newAmount > 0 ? Number(newAmount) : originalEntry.paymentAmount,
        note: newNote,
        rate: newRate,
      }));
    });

    data.forEach((row, idx) => {
      if (idx >= draftCount) return;
      if (!showRateCol) return;
      const rateVal = String(row[rateColIdx]?.value || "");
      if (rateVal && rateVal !== "1" && rateVal !== "") {
        lastRateRef.current = rateVal;
      }
    });

    prevSheetDataRef.current = data;
    setSheetData(data);
  };

  const handleSaveEdits = () => {
    if (editedDebtRows.size === 0 && editedPaymentRows.size === 0) {
      message.info("O'zgarish yo'q");
      return;
    }

    editedDebtRows.forEach((data) => {
      updateDebtMutation.mutate({
        id: data.debtId,
        payload: { note: data.note, amount: data.amount },
      });
    });

    editedPaymentRows.forEach((data) => {
      updateDebtPaymentMutation.mutate({
        debtId: data.debtId,
        paymentId: data.paymentId,
        payload: { amount: data.amount, note: data.note === "-" ? "" : data.note, rate: data.rate, },
      });
    });

    setEditedDebtRows(new Map());
    setEditedPaymentRows(new Map());
  };

  const handleClearDrafts = () => {
    if (draftCount === 0) return;
    setSheetData((prev) => prev.slice(draftCount));
    setDraftCount(0);
    message.info("Yangi qatorlar tozalandi");
  };

  const dataEditorComponent = useMemo(() => (props: DataEditorProps<CellBase>) => {
    if (props.row >= draftCount) return <DefaultDataEditor {...props} />;
    if (props.column === 0) return <DateCellEditor {...props} />;
    // Turi column is gone, so column 1 is now Izoh
    if (showAccountCol && props.column === accountColIdx) return <AccountCellEditor {...props} options={accounts} />;
    return <DefaultDataEditor {...props} />;
  }, [draftCount, accounts, showAccountCol, accountColIdx]);

  const dataViewerComponent = useMemo(() => (props: DataViewerProps<CellBase>) => {
    if ([2, 3, rateColIdx, balanceColIdx].includes(props.column)) return <AmountCellViewer {...props} formatAmount={formatAmountCell} />;
    return <DefaultDataViewer {...props} />;
  }, [formatAmountCell, rateColIdx, balanceColIdx]);

  const handleExportExcel = () => {
    const data = debts.map((d) => {
      const paid = Math.max(0, d.amount - d.currentDebt);
      const lastPayment = d.payments?.length > 0 ? d.payments.reduce((latest: any, p: any) => (new Date(p.date) > new Date(latest.date) ? p : latest)) : null;
      return { "Sabab": d.reasonType, "Faktura": d.invoiceNo || "-", "Qolgan sana": formatDate(d.occurredAt), "Oldi": convertPrice(d.amount), "Berdi": convertPrice(paid), "Qoldiq": convertPrice(d.currentDebt), "So'ngi to'lov": lastPayment ? formatDateTime(lastPayment.date) : "-" };
    });
    exportToExcel(data, `OldiBerdi_${client?.name || "mijoz"}_${new Date().toLocaleDateString()}`);
  };

  const handlePrint = useReactToPrint({ content: () => printRef.current });

  useEffect(() => {
    if (syncResetRef.current) window.clearTimeout(syncResetRef.current);

    const dataRows = filteredEntries.map((entry) => {
      const isDebt = entry.type === "DEBT";
      let cellClass;
      if (isDebt) {
        if (entry.isEdited) {
          cellClass = "cell-edited"
        } else {
          cellClass = "cell-oldi"
        }
      } else {
        if (entry.isEdited) {
          cellClass = "cell-edited"
        } else {
          cellClass = "cell-berdi"
        }
      }

      const row = [
        { value: formatDateTime(entry.createdAt), readOnly: true, className: cellClass },
        { value: entry.note || "-", readOnly: false, className: cellClass },
        { value: entry.debtAmount > 0 ? formatAmountValue(entry.debtAmount) : "", readOnly: false, className: cellClass },
        { value: entry.paymentAmount > 0 ? formatAmountValue(entry.paymentAmount) : "", readOnly: isDebt, className: cellClass },
      ];
      if (showAccountCol) row.push({ value: entry.accountName || "-", readOnly: true, className: cellClass, });
      if (showRateCol) row.push({ value: entry.rate ? String(entry.rate) : "1", readOnly: isDebt, className: cellClass });
      row.push({ value: formatAmountValue(entry.balanceAfter), readOnly: true, className: cellClass });
      return row;
    });

    const metaRows = filteredEntries.map((entry) => ({
      type: entry.type,
      debtId: entry.debtId,      // bu Transaction._id
      paymentId: entry.debtId,   // paymentId o'rniga ham debtId ishlatamiz
    }));

    syncingRef.current = true;
    setSheetData((prev) => {
      const expectedLen = 5 + (showAccountCol ? 1 : 0) + (showRateCol ? 1 : 0);
      const drafts = prev.slice(0, draftCount).map((row) =>
        Array.from({ length: expectedLen }).map((_, idx) => row[idx] ?? { value: "", className: "cell-berdi" })
      );
      if (draftCount > drafts.length) {
        const nowLabel = dayjs().format("DD.MM.YYYY HH:mm");
        const defaultAccount = selectedAccount || accounts[0];
        for (let i = 0; i < draftCount - drafts.length; i++) {
          const newRow: CellBase[] = [
            { value: nowLabel, className: "cell-berdi" },
            { value: "", className: "cell-berdi" },
            { value: "", className: "cell-berdi" },
            { value: "", className: "cell-berdi" }
          ];
          if (showAccountCol) newRow.push({ value: defaultAccount?.name || "", className: "cell-berdi" });
          if (showRateCol) newRow.push({ value: "1", className: "cell-berdi" });
          newRow.push({ value: "", readOnly: true, className: "cell-berdi" });
          drafts.unshift(newRow);
        }
      }
      return [...drafts, ...dataRows];
    });

    setRowMeta(() => {
      const draftMeta = Array.from({ length: draftCount }, () => null);
      return [...draftMeta, ...metaRows];
    });

    syncResetRef.current = window.setTimeout(() => {
      syncingRef.current = false;
      syncResetRef.current = null;
    }, 200);
  }, [filteredEntries, draftCount, accounts, selectedAccount, showAccountCol, showRateCol]);

  if (clientLoading || debtsLoading) return <LoadingSpinner />;
  console.log(client);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <Button
          size="large"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/debts")}
          className="px-6"
        >
          Orqaga
        </Button>
        <Space size="middle">
          <Button size="large" icon={<FileExcelOutlined />} onClick={handleExportExcel}>Excel</Button>
          <Button size="large" icon={<PrinterOutlined />} onClick={handlePrint}>Chop etish</Button>
          <Tag
            color={(client?.balance || 0) < 0 ? "red" : "green"}
            className="text-lg px-4 py-1.5 font-semibold"
          >
            {(client?.balance || 0) < 0
              ? `Joriy qarz: $${Math.abs(client?.balance || 0)}`
              : `Joriy avans: $${(client?.balance || 0)}`
            }
          </Tag>
        </Space>
      </div>

      <div style={{ display: "none" }}>
        <PrintableClientDebts
          ref={printRef}
          client={client}
          ledgerEntries={ledgerEntries}
          currency={currency}
          convertPrice={convertPrice}
          showRateCol={showRateCol}
        />
      </div>

      <Card className="shadow-sm">
        <div className="flex items-center justify-around">
          <div><div className="text-xs text-gray-500">Mijoz</div><div className="font-medium text-base">{client?.name || "-"}</div></div>
          <div><div className="text-xs text-gray-500">Telefon</div><div className="font-medium text-base">{client?.phone ? formatPhone(client.phone) : "-"}</div></div>
          <div><div className="text-xs text-gray-500">Manzil</div><div className="font-medium text-base">{client?.address || "-"}</div></div>
          <div>
            <div className="text-xs text-gray-500">
              {(client?.balance || 0) < 0 ? "Joriy qarz" : "Joriy avans"}
            </div>
            <div className={`font-semibold text-lg ${(client?.balance || 0) < 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(convertPrice(Math.abs(client?.balance || 0)), currency)}
            </div>
          </div>
        </div>
      </Card>

      <Card
        className="shadow-sm"
        title={
          <div className="flex flex-wrap items-center justify-between gap-6 py-3">
            <span className="text-xl font-bold">Oldi va Berdi</span>
            <div className="flex flex-wrap gap-3">
              <Button
                type={accountFilter ? "default" : "primary"}
                onClick={() => setAccountFilter("")}
                size="large"
                className="min-w-[100px]"
              >
                Barchasi
              </Button>
              {accounts.map((account) => (
                <Button
                  key={account._id}
                  type={accountFilter === account._id ? "primary" : "default"}
                  onClick={() => setAccountFilter(account._id)}
                  size="large"
                  className="min-w-[120px]"
                >
                  {account.name} ({account.currency})
                </Button>
              ))}
            </div>
          </div>
        }
      >
        <div className="flex flex-wrap gap-4 mb-8 items-center bg-gray-50 p-6 rounded-xl border border-gray-200">
          <Input
            placeholder="Izoh bo'yicha qidirish"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 300 }}
            size="large"
          />
          <Select
            value={typeFilter}
            onChange={(v) => setTypeFilter(v)}
            style={{ width: 160 }}
            size="large"
            placeholder="Turi"
          >
            <Option value="">Barchasi</Option>
            <Option value="DEBT">Oldi</Option>
            <Option value="PAYMENT">Berdi</Option>
          </Select>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
            placeholder={["Boshlanish sanasi", "Tugash sanasi"]}
            size="large"
            format="DD.MM.YYYY"
            style={{ width: 350 }}
          />
          <Button
            size="large"
            className="px-6"
            icon={<ReloadOutlined />}
            onClick={() => { setSearchText(""); setTypeFilter(""); setDateRange(null); }}
          >
            Tozalash
          </Button>

          <div className="w-full flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <span className="text-base font-semibold text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
              {filteredEntries.length} ta yozuv topildi
            </span>

            <div className="flex items-center gap-4">
              <Button
                onClick={handleClearDrafts}
                disabled={draftCount === 0}
                size="large"
                danger
                className="px-6"
              >
                Qatorlarni o'chirish
              </Button>

              {draftCount > 0 && (
                <Button
                  type="primary"
                  size="large"
                  icon={<SaveOutlined />}
                  onClick={() => handleCreateDrafts()}
                  className="bg-green-600 hover:bg-green-700 border-green-600 px-8 font-bold"
                >
                  Qo'shish ({draftCount})
                </Button>
              )}

              {(editedDebtRows.size > 0 || editedPaymentRows.size > 0) && (
                <Button
                  type="primary"
                  size="large"
                  icon={<SaveOutlined />}
                  onClick={handleSaveEdits}
                  className="px-8 font-bold"
                >
                  O'zgarishlarni saqlash
                </Button>
              )}
            </div>
          </div>
        </div>
        {accountFilter && (
          <button
            onClick={addDraftRow}
            className="w-full py-3 border border-gray-200 border-t-0 text-gray-400 hover:bg-gray-50 hover:text-blue-500 transition-all duration-200 flex items-center gap-4 cursor-pointer"
            style={{ fontSize: 16 }}
          >
            <span className="w-12 text-center text-gray-300 border-r border-gray-200 pr-2 flex-shrink-0">
              <PlusOutlined style={{ fontSize: 20 }} />
            </span>
            <span className="font-medium">Yangi qator qo'shish</span>
          </button>
        )}
        <Spreadsheet
          data={sheetData}
          onChange={handleSheetChange}
          DataEditor={dataEditorComponent}
          DataViewer={dataViewerComponent}
          className="cashflow-spreadsheet client-debt-spreadsheet"
          columnLabels={(() => {
            const labels = ["Sana", "Izoh", "Oldi", "Berdi"];
            if (showAccountCol) labels.push("Hisob");
            if (showRateCol) labels.push("Kurs");
            labels.push("Qoldiq");
            return labels;
          })()}
        />


      </Card>

    </div>
  );
};

export default ClientDebtDetailPage;
