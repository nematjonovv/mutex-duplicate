import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Tag, Button, Select, Space, DatePicker, Input, Popconfirm } from "antd";
import { ArrowLeftOutlined, FileExcelOutlined, PrinterOutlined, PlusOutlined, SaveOutlined, ReloadOutlined, SearchOutlined, DeleteOutlined } from "@ant-design/icons";
import { useApiMutation, useApiQuery, usePaginatedQuery } from "@/hooks/useApi";
import ourDebtService, { Creditor, CreditorTransaction } from "@/services/ourDebtService";
import { accountService } from "@/services/accountService";
import { CashAccount } from "@/types";
import { formatCurrency, formatDateTime, formatNumber } from "@/utils";
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

type PrintableOurDebtProps = {
  creditor?: Creditor;
  ledgerEntries: Array<any>;
  currency: string;
  convertPrice: (n: number) => number;
  showRateCol: boolean;
};

const PrintableOurDebt = React.forwardRef<HTMLDivElement, PrintableOurDebtProps>(
  ({ creditor, ledgerEntries, currency, convertPrice, showRateCol }, ref) => {
    const currentDebt = (creditor?.balance || 0) < 0 ? Math.abs(creditor!.balance) : 0;
    return (
      <div ref={ref} style={{ padding: "32px", background: "white", fontFamily: "Arial, sans-serif" }}>
        <style>{`@media print { @page { size: A4 landscape; margin: 16mm; } }`}</style>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #222", paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, textTransform: "uppercase", color: "#111", letterSpacing: 1 }}>
              Bizning Qarz va To'lovlar (Oldi-Berdi)
            </div>
            <div style={{ marginTop: 6, color: "#555", fontSize: 13 }}>
              {creditor?.name && <span style={{ fontWeight: 600 }}>{creditor.name}</span>}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 13, color: "#555" }}>
            <div>Chop etilgan: <b>{dayjs().format("DD.MM.YYYY HH:mm")}</b></div>
            <div style={{ marginTop: 4 }}>
              Joriy qarz:{" "}
              <b style={{ color: "#dc2626" }}>
                {formatCurrency(convertPrice(currentDebt), currency)}
              </b>
            </div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              {["#", "Sana", "Izoh", "Berildi", "Olindi", ...(showRateCol ? ["Kurs"] : []), "Qoldiq"].map((h) => (
                <th
                  key={h}
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px 6px",
                    textAlign: ["Berildi", "Olindi", "Kurs", "Qoldiq", "#"].includes(h) ? "right" : "left",
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
                  {formatDateTime(row.at.toISOString())}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", maxWidth: 220 }}>
                  {row.note}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", whiteSpace: "nowrap", color: "#16a34a", fontWeight: 500 }}>
                  {row.paymentAmount > 0 ? formatCurrency(convertPrice(row.paymentAmount), currency) : "-"}
                </td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", whiteSpace: "nowrap", color: "#dc2626", fontWeight: 500 }}>
                  {row.debtAmount > 0 ? formatCurrency(convertPrice(row.debtAmount), currency) : "-"}
                </td>
                {showRateCol && (
                  <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", whiteSpace: "nowrap" }}>
                    {row.rate && row.rate !== 1 ? row.rate.toLocaleString() : "-"}
                  </td>
                )}
                <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 700, color: row.balanceAfter < 0 ? "#dc2626" : "#16a34a" }}>
                  {formatCurrency(convertPrice(Math.abs(row.balanceAfter)), currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

const OurDebtDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currency, convertPrice } = useCurrency();

  const printRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  const syncResetRef = useRef<number | null>(null);
  const lastRateRef = useRef<string>("");

  const [sheetData, setSheetData] = useState<CellBase[][]>([]);
  const [draftCount, setDraftCount] = useState(0);
  const [accountFilter, setAccountFilter] = useState("");
  const [editedPaymentRows, setEditedPaymentRows] = useState<Map<string, { debtId: string; paymentId: string; amount: number; note: string; rate: number }>>(new Map());
  const [editedDebtRows, setEditedDebtRows] = useState<Map<string, { debtId: string; amount: number; note: string }>>(new Map());
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "DEBT" | "PAYMENT">("");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [rowMeta, setRowMeta] = useState<Array<any>>([]);

  const { data: debtData, isLoading: debtLoading, refetch: refetchDebt } = useApiQuery(
    ["our-debt", id],
    () => ourDebtService.getById(id || ""),
    { enabled: !!id }
  );

  const { data: accountsData } = usePaginatedQuery(
    ["accounts", "our-debts-detail"],
    (params) => accountService.getAccounts(params),
    { page: 1, limit: 100 }
  );

  const recordPaymentMutation = useApiMutation(
    (data: { id: string; payload: any }) => ourDebtService.recordPayment(data.id, data.payload),
    {
      successMessage: "To'lov muvaffaqiyatli qayd etildi",
      invalidateQueries: ["our-debt", "our-debts", "accounts", "cash-flow"],
      onSuccess: () => { refetchDebt(); setDraftCount(0); },
    }
  );

  const recordAdditionMutation = useApiMutation(
    (data: { id: string; payload: any }) => ourDebtService.recordAddition(data.id, data.payload),
    {
      successMessage: "Qarz muvaffaqiyatli qo'shildi",
      invalidateQueries: ["our-debt", "our-debts"],
      onSuccess: () => { refetchDebt(); setDraftCount(0); },
    }
  );

  const updatePaymentMutation = useApiMutation(
    (data: { debtId: string; paymentId: string; payload: any }) => ourDebtService.updatePayment(data.debtId, data.paymentId, data.payload),
    {
      successMessage: "To'lov muvaffaqiyatli yangilandi",
      invalidateQueries: ["our-debt", "our-debts", "accounts", "cash-flow"],
      onSuccess: () => { refetchDebt(); },
    }
  );

  const updateDebtMutation = useApiMutation(
    (data: { debtId: string; paymentId: string; payload: any }) => ourDebtService.updatePayment(data.debtId, data.paymentId, data.payload),
    {
      successMessage: "Qarz muvaffaqiyatli yangilandi",
      invalidateQueries: ["our-debt", "our-debts"],
      onSuccess: () => { refetchDebt(); },
    }
  );

  const deleteDebtMutation = useApiMutation(
    (delId: string) => ourDebtService.remove(delId),
    {
      successMessage: "Qarz muvaffaqiyatli o'chirildi",
      invalidateQueries: ["our-debts"],
      onSuccess: () => navigate("/our-debts"),
    }
  );

  const handleDelete = () => {
    if (creditor?._id) {
      deleteDebtMutation.mutate(creditor._id);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const creditor = debtData?.creditor as Creditor | undefined;
  const transactions = (debtData?.transactions || []) as CreditorTransaction[];
  const accounts = (accountsData?.data || []) as CashAccount[];

  // balance < 0 → qarzimiz, > 0 → haqimiz
  const currentDebt = (creditor?.balance || 0) < 0 ? Math.abs(creditor!.balance) : 0;
  const advanceBalance = (creditor?.balance || 0) > 0 ? creditor!.balance : 0;

  // Statistika
  const stats = useMemo(() => {
    const additional = transactions
      .filter((t) => t.type === "DEBT")
      .reduce((s, t) => s + t.amount, 0);
    const paid = transactions
      .filter((t) => t.type === "PAYMENT" || t.type === "ADVANCE")
      .reduce((s, t) => s + t.amount, 0);
    return { additional, paid };
  }, [transactions]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a._id === accountFilter) || null,
    [accounts, accountFilter]
  );

  const accountsByName = useMemo(() => {
    const map = new Map<string, CashAccount>();
    accounts.forEach((a) => map.set(a.name.toLowerCase().trim(), a));
    return map;
  }, [accounts]);

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

  const showAccountCol = !accountFilter;
  const showRateCol = !accountFilter || (selectedAccount?.currency === "UZS");

  const getColIndex = useCallback((type: "account" | "rate" | "balance") => {
    let idx = 4; // Sana(0), Izoh(1), Berildi(2), Olindi(3)
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

  const parseRow = useCallback((row: CellBase[]) => {
    const payAmt = parseAmount(String(row[2]?.value || ""));
    const debtAmt = parseAmount(String(row[3]?.value || ""));

    let type = "Berildi";
    if (debtAmt > 0) type = "Olindi";
    else if (payAmt > 0) type = "Berildi";

    return {
      time: String(row[0]?.value || ""),
      type,
      note: String(row[1]?.value || ""),
      payAmount: payAmt,
      debtAmount: debtAmt,
      accountName: showAccountCol
        ? String(row[accountColIdx]?.value || "").toLowerCase().trim()
        : selectedAccount?.name?.toLowerCase().trim() || "",
      rate: showRateCol
        ? parseAmount(String(row[rateColIdx]?.value || "1")) || 1
        : 1,
    };
  }, [showAccountCol, showRateCol, accountColIdx, rateColIdx, selectedAccount]);

  const isComplete = useCallback((rv: ReturnType<typeof parseRow>) => {
    if (rv.type === "Olindi") return rv.debtAmount > 0;
    if (rv.type === "Berildi") {
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

  // Ledger — to'g'ridan-to'g'ri transactions dan, balanceAfter backend'dan keladi
  const ledgerEntries = useMemo(() => {
    const rows = transactions.map((t) => {
      const isDebt = t.type === "DEBT";
      return {
        key: `trans-${t._id}`,
        at: new Date(t.createdAt),
        type: isDebt ? "DEBT" : "PAYMENT",
        note: t.note || (isDebt ? "Yangi qarz" : "Qarz to'lovi"),
        debtAmount: isDebt ? t.amount : 0,
        paymentAmount: isDebt ? 0 : t.amount,
        rate: t.rate,
        accountName: t.accountId
          ? (typeof t.accountId === "object" ? t.accountId.name : accounts.find((a) => a._id === t.accountId)?.name) || ""
          : "",
        balanceAfter: t.balanceAfter,
        debtId: t._id,
        paymentId: t._id,
      };
    });

    // backend createdAt desc qaytaradi; eng yangi yuqorida bo'lsin
    rows.sort((a, b) => b.at.getTime() - a.at.getTime());
    return rows;
  }, [transactions, accounts]);

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
        { value: formatDateTime(entry.at.toISOString()), readOnly: true, className: cellClass },
        { value: entry.note || "-", readOnly: false, className: cellClass },
        { value: entry.paymentAmount > 0 ? formatAmountValue(entry.paymentAmount) : "", readOnly: isDebt, className: cellClass },
        { value: entry.debtAmount > 0 ? formatAmountValue(entry.debtAmount) : "", readOnly: !isDebt, className: cellClass },
      ];
      if (showAccountCol) row.push({ value: entry.accountName || "-", readOnly: true, className: cellClass });
      if (showRateCol) row.push({ value: entry.rate ? String(entry.rate) : "1", readOnly: isDebt, className: cellClass });
      // balanceAfter manfiy bo'lsa qarz — absolyut ko'rsatamiz
      row.push({ value: formatAmountValue(Math.abs(entry.balanceAfter)), readOnly: true, className: cellClass });
      return row;
    });

    const metaRows = filteredEntries.map((entry) => ({
      type: entry.type,
      debtId: entry.debtId,
      paymentId: entry.paymentId,
    }));

    syncingRef.current = true;
    setSheetData((prev) => {
      const expectedLen = 5 + (showAccountCol ? 1 : 0) + (showRateCol ? 1 : 0);
      const drafts = prev.slice(0, draftCount).map(row =>
        Array.from({ length: expectedLen }).map((_, idx) => row[idx] ?? { value: "" })
      );
      return [...drafts, ...dataRows];
    });
    setRowMeta([...Array(draftCount).fill(null), ...metaRows]);
    syncResetRef.current = window.setTimeout(() => { syncingRef.current = false; }, 200);
  }, [filteredEntries, draftCount, showAccountCol, showRateCol, formatAmountValue]);

  const handleSheetChange = (data: CellBase[][]) => {
    if (syncingRef.current) return;
    data.forEach((row, idx) => {
      if (idx < draftCount) return;
      const meta = rowMeta[idx];
      if (!meta) return;

      const entryIdx = idx - draftCount;
      const entry = filteredEntries[entryIdx];
      if (!entry) return;

      if (meta.type === "PAYMENT" && meta.paymentId) {
        const newAmount = parseAmount(String(row[2]?.value || ""));
        const newNote = String(row[1]?.value || "");
        const newRate = showRateCol ? parseAmount(String(row[rateColIdx]?.value || "1")) || 1 : 1;

        if (newAmount !== entry.paymentAmount || newNote !== entry.note || newRate !== (entry.rate || 1)) {
          setEditedPaymentRows(prev => new Map(prev).set(meta.paymentId, {
            debtId: meta.debtId,
            paymentId: meta.paymentId,
            amount: newAmount,
            note: newNote,
            rate: newRate
          }));
        }
      } else if (meta.type === "DEBT" && meta.debtId) {
        const newNote = String(row[1]?.value || "");
        const newAmount = parseAmount(String(row[3]?.value || ""));
        if (newNote !== entry.note || newAmount !== entry.debtAmount) {
          setEditedDebtRows(prev => new Map(prev).set(meta.debtId, {
            debtId: meta.debtId,
            amount: newAmount,
            note: newNote
          }));
        }
      }
    });
    setSheetData(data);
  };

  const addDraftRow = () => {
    if (!accountFilter) { message.info("To'lov qilish uchun hisobni tanlang"); return; }
    const nowLabel = dayjs().format("DD.MM.YYYY HH:mm");
    const newRow: CellBase[] = [{ value: nowLabel }, { value: "" }, { value: "" }, { value: "" }];
    if (showAccountCol) newRow.push({ value: selectedAccount?.name || "" });
    if (showRateCol) newRow.push({ value: lastRateRef.current || "1" });
    newRow.push({ value: "", readOnly: true });
    setSheetData(prev => [newRow, ...prev]);
    setDraftCount(prev => prev + 1);
  };

  const handleSaveEdits = () => {
    editedPaymentRows.forEach(data => {
      updatePaymentMutation.mutate({ debtId: data.debtId, paymentId: data.paymentId, payload: { amount: data.amount, note: data.note, rate: data.rate } });
    });
    editedDebtRows.forEach(data => {
      updateDebtMutation.mutate({ debtId: data.debtId, paymentId: data.debtId, payload: { amount: data.amount, note: data.note } });
    });
    setEditedPaymentRows(new Map());
    setEditedDebtRows(new Map());
  };

  const handleCreateDrafts = () => {
    const draftRows = sheetData.slice(0, draftCount);
    draftRows.forEach(row => {
      const rv = parseRow(row);
      if (!isComplete(rv)) return;

      if (rv.type === "Berildi") {
        const account = accountsByName.get(rv.accountName);
        if (rv.payAmount > 0 && account) {
          recordPaymentMutation.mutate({
            id: id!,
            payload: {
              amount: rv.payAmount,
              accountId: account._id,
              note: rv.note,
              currency: account.currency,
              rate: account.currency === "UZS" ? rv.rate : undefined,
              amountUSD: account.currency === "UZS" ? rv.payAmount / rv.rate : rv.payAmount,
              paymentMethod: "CASH"
            }
          });
        }
      } else if (rv.type === "Olindi") {
        if (rv.debtAmount > 0) {
          recordAdditionMutation.mutate({
            id: id!,
            payload: { amount: rv.debtAmount, note: rv.note }
          });
        }
      }
    });
  };

  const dataEditorComponent = useMemo(() => (props: DataEditorProps<CellBase>) => {
    if (props.row >= draftCount) return <DefaultDataEditor {...props} />;
    if (props.column === 0) return <DateCellEditor {...props} />;
    if (showAccountCol && props.column === accountColIdx) return <AccountCellEditor {...props} options={accounts} />;
    return <DefaultDataEditor {...props} />;
  }, [draftCount, accounts, showAccountCol, accountColIdx]);

  const dataViewerComponent = useMemo(() => (props: DataViewerProps<CellBase>) => {
    if ([2, 3, rateColIdx, balanceColIdx].includes(props.column)) return <AmountCellViewer {...props} formatAmount={formatAmountCell} />;
    return <DefaultDataViewer {...props} />;
  }, [formatAmountCell, rateColIdx, balanceColIdx]);

  if (debtLoading) return <LoadingSpinner />;
  console.log(creditor);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/our-debts")}>Orqaga</Button>
        <Space>
          <Button icon={<FileExcelOutlined />} onClick={() => exportToExcel(ledgerEntries, "Bizning_qarz")}>Excel</Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>Chop etish</Button>
          <Tag
            color={(creditor?.balance || 0) < 0 ? "red" : "green"}
            className="text-lg px-4 py-1.5 font-semibold"
          >
            {(creditor?.balance || 0) < 0
              ? `Joriy qarz: $${Math.abs(creditor?.balance || 0)}`
              : `Joriy avans: $${(creditor?.balance || 0)}`
            }
          </Tag>
        </Space>
      </div>

      <div style={{ display: "none" }}>
        <PrintableOurDebt ref={printRef} creditor={creditor} ledgerEntries={ledgerEntries} currency={currency} convertPrice={convertPrice} showRateCol={showRateCol} />
      </div>

      <Card className="shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-center sm:text-left">
          <div className="border-r border-gray-100 last:border-0">
            <div className="text-xs text-gray-500 mb-1">Kreditor</div>
            <div className="font-bold text-lg">{creditor?.name || "-"}</div>
          </div>
          <div className="border-r border-gray-100 last:border-0">
            <div className="text-xs text-gray-500 mb-1">Jami olingan qarz</div>
            <div className="font-bold text-lg text-gray-700">{formatCurrency(convertPrice(stats.additional), currency)}</div>
          </div>
          <div><div className="text-xs text-gray-500">Manzil</div><div className="font-medium text-base">{creditor?.address || "-"}</div></div>
          <div>
            <div className="text-xs text-gray-500">
              {(creditor?.balance || 0) < 0 ? "Joriy qarz" : "Joriy avans"}
            </div>
            <div className={`font-semibold text-lg ${(creditor?.balance || 0) < 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(convertPrice(Math.abs(creditor?.balance || 0)), currency)}
            </div>
          </div>
        </div>
      </Card >

      <Card title={
        <div className="flex flex-wrap items-center justify-between gap-4 py-2">
          <span>Oldi va Berdi tarixi</span>
          <div className="flex flex-wrap gap-2">
            <Button type={accountFilter ? "default" : "primary"} onClick={() => setAccountFilter("")} size="large"
              className="min-w-[120px]">Barchasi</Button>
            {accounts.map(a => (
              <Button key={a._id} type={accountFilter === a._id ? "primary" : "default"} onClick={() => setAccountFilter(a._id)} size="large"
                className="min-w-[120px]">
                {a.name} ({a.currency})
              </Button>
            ))}
          </div>
        </div>
      }>
        <div className="flex flex-wrap gap-4 mb-8 items-center bg-gray-50 p-6 rounded-xl border border-gray-200">
          <Input placeholder="Izoh qidirish" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear
            style={{ width: 300 }}
            size="large" />
          <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 160 }}
            size="large">
            <Option value="">Barchasi</Option>
            <Option value="DEBT">Olindi</Option>
            <Option value="PAYMENT">Berildi</Option>
          </Select>
          <Button size="large"
            className="px-6" icon={<ReloadOutlined />} onClick={() => { setSearchText(""); setTypeFilter(""); setDateRange(null); }}>
            Tozalash
          </Button>

          <div className="w-full flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <span className="text-base font-semibold text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
              {filteredEntries.length} ta yozuv topildi
            </span>

            <div className="flex items-center gap-4">
              <Button
                onClick={() => { setSheetData(prev => prev.slice(draftCount)); setDraftCount(0); }} disabled={draftCount === 0}
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
                  onClick={handleCreateDrafts}
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
          <Button block type="dashed" icon={<PlusOutlined />} onClick={addDraftRow} className="mb-2">Yangi qator qo'shish</Button>
        )}
        <div className="cashflow-spreadsheet mt-4" style={{ minHeight: "500px" }}>
          <Spreadsheet
            data={sheetData}
            onChange={handleSheetChange}
            DataEditor={dataEditorComponent}
            DataViewer={dataViewerComponent}
            className="cashflow-spreadsheet client-debt-spreadsheet"
            columnLabels={(() => {
              const labels = ["Sana", "Izoh", "Berildi", "Olindi"];
              if (showAccountCol) labels.push("Hisob");
              if (showRateCol) labels.push("Kurs");
              labels.push("Qoldiq");
              return labels;
            })()}
          />
        </div>
      </Card>

      {
        currentDebt < 0.01 && advanceBalance < 0.01 && (
          <div className="flex justify-end pt-4">
            <Popconfirm
              title="Qarzni butunlay o'chirib tashlamoqchimisiz?"
              description="Bu amalni ortga qaytarib bo'lmaydi va ma'lumotlar bazasidan o'chib ketadi."
              onConfirm={handleDelete}
              okText="Ha, o'chirish"
              cancelText="Yo'q"
              okButtonProps={{ danger: true, loading: deleteDebtMutation.isLoading }}
            >
              <Button danger icon={<DeleteOutlined />} size="large">
                Qarzni o'chirish
              </Button>
            </Popconfirm>
          </div>
        )
      }
    </div >
  );
};

export default OurDebtDetailPage;