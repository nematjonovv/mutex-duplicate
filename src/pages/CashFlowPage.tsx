import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Input, Select, DatePicker, Row, Col, AutoComplete, Form, Modal, InputNumber, Table, Space, Tooltip, Popconfirm, Tag } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SearchOutlined,
  PlusOutlined,
  BankOutlined,
  DollarOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useApiQuery, usePaginatedQuery, useApiMutation } from "@/hooks/useApi";
import { useSocket } from "@/hooks/useSocket";
import { CashFlow, CreateCashFlowRequest, UpdateCashFlowRequest, CashAccount, ApiResponse, CreateCashAccountRequest, UpdateCashAccountRequest } from "@/types";
import { useAuthStore } from "@/store/authStore";
import dayjs, { Dayjs } from "dayjs";
import { apiService } from "@/services/api";
import { cashFlowService } from "@/services/cashFlowService";
import { accountService } from "@/services/accountService";
import { formatNumber, inputNumberFormatter, inputNumberParser } from "@/utils";
import { exportToExcel } from "@/utils/excelUtils";
import Spreadsheet, {
  CellBase,
  DataEditorProps,
  DataEditor as DefaultDataEditor,
  DataViewerProps,
  DataViewer as DefaultDataViewer,
} from "react-spreadsheet";
import { message } from "@/utils/StaticAntd";
import { useReactToPrint } from "react-to-print";

const { Option } = Select;

const categoryLabels: Record<string, string> = {
  SALES: "Sotuv",
  PURCHASE: "Xarid",
  INVOICE_PAYMENT: "Faktura to'lovi",
  DEBT_PAYMENT: "Qarz to'lovi",
  ADVANCE_PAYMENT: "Avans to'lovi",
  SALARY: "Ish haqi",
  RENT: "Ijara",
  UTILITIES: "Kommunal to'lovlar",
  TRANSPORT: "Transport",
  RETURN_REFUND: "Qaytarish (Vozvrat)",
  REFUND: "Pul qaytarish",
  EXPENSE: "Xarajat",
  INCOME: "Daromad",
  LOAN: "Qarz",
  LOAN_REPAYMENT: "Qarz qaytarish",
  INVESTMENT: "Investitsiya",
  WITHDRAWAL: "Pul yechish",
  DEPOSIT: "Pul qo'yish",
  TRANSFER: "O'tkazma",
  OTHER: "Boshqa",
};

const DateCellEditor: React.FC<DataEditorProps<CellBase>> = (props) => {
  if (props.column !== 0) {
    return <DefaultDataEditor {...props} />;
  }

  const rawValue = props.cell?.value ? String(props.cell.value) : "";
  const parsed = rawValue ? dayjs(rawValue, ["DD.MM.YYYY HH:mm", "DD.MM.YYYY", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"], true) : null;

  return (
    <div className="cashflow-date-editor ">
      <DatePicker
        autoFocus
        open
        showTime
        format="DD.MM.YYYY HH:mm"
        value={parsed && parsed.isValid() ? parsed : null}
        onChange={(date) => {
          props.onChange({
            ...(props.cell || { value: "" }),
            value: date ? date.format("DD.MM.YYYY HH:mm") : "",
          });
          props.exitEditMode();
        }}
        onBlur={() => props.exitEditMode()}
      />
    </div>
  );
};

const AccountCellEditor: React.FC<DataEditorProps<CellBase> & { options: string[] }> = (props) => {
  const { options, column } = props;
  if (column < 0) {
    return <DefaultDataEditor {...props} />;
  }
  return (
    <div className="cashflow-account-editor">
      <Select
        autoFocus
        showSearch
        open
        value={props.cell?.value ? String(props.cell.value) : undefined}
        placeholder="Hisobni tanlang"
        onChange={(value) => {
          props.onChange({
            ...(props.cell || { value: "" }),
            value,
          });
          props.exitEditMode();
        }}
        onDropdownVisibleChange={(open) => {
          if (!open) {
            props.exitEditMode();
          }
        }}
        style={{ width: "100%" }}
        options={options.map((opt) => ({ label: opt, value: opt }))}
        filterOption={(input, option) =>
          String(option?.label || "").toLowerCase().includes(input.toLowerCase())
        }
        getPopupContainer={(trigger) => trigger.parentElement || document.body}
      />
    </div>
  );
};

// Category cell editor with autocomplete suggestions from existing categories
const CategoryCellEditor: React.FC<DataEditorProps<CellBase> & { existingCategories: string[] }> = (props) => {
  const { existingCategories } = props;

  if (props.column !== 1) {
    return <DefaultDataEditor {...props} />;
  }

  // Use existing categories from cash flows
  const categoryOptions = existingCategories.map((cat) => ({
    value: cat,
    label: cat,
  }));

  return (
    <div className="cashflow-category-editor">
      <AutoComplete
        autoFocus
        open
        value={props.cell?.value ? String(props.cell.value) : ""}
        placeholder="Kategoriyani tanlang yoki kiriting"
        options={categoryOptions}
        onChange={(value) => {
          props.onChange({
            ...(props.cell || { value: "" }),
            value,
          });
        }}
        onSelect={(value) => {
          props.onChange({
            ...(props.cell || { value: "" }),
            value,
          });
          props.exitEditMode();
        }}
        onBlur={() => props.exitEditMode()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            props.exitEditMode();
          }
          if (e.key === 'Escape') {
            props.exitEditMode();
          }
        }}
        style={{ width: "100%" }}
        filterOption={(inputValue, option) =>
          String(option?.label || "").toLowerCase().includes(inputValue.toLowerCase())
        }
        getPopupContainer={(trigger) => trigger.parentElement || document.body}
      />
    </div>
  );
};

const AmountCellViewer: React.FC<DataViewerProps<CellBase> & { formatAmount: (value: string) => string }> = (props) => {
  const { formatAmount } = props;
  if (props.column !== 3 && props.column !== 4) {
    return <DefaultDataViewer {...props} />;
  }
  const value = props.cell?.value ? String(props.cell.value) : "";
  const formatted = formatAmount(value);
  return <span className="Spreadsheet__data-viewer">{formatted}</span>;
};

const PrintableCashFlows = React.forwardRef<
  HTMLDivElement,
  { cashFlows: CashFlow[]; categoryLabels: Record<string, string>; showAccount: boolean; balancesTable: React.ReactNode }
>(({ cashFlows, categoryLabels, showAccount, balancesTable }, ref) => {
  return (
    <div ref={ref} className="p-8 print-content bg-white min-h-screen">
      <h2 className="text-xl font-bold mb-4">Naqd pul oqimi</h2>
      <div className="mb-4">
        <div className="font-semibold mb-2">Hisoblar qoldig'i</div>
        {balancesTable}
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2 text-left">Sana</th>
            <th className="border border-gray-300 p-2 text-left">Kategoriya</th>
            <th className="border border-gray-300 p-2 text-left">Izoh</th>
            <th className="border border-gray-300 p-2 text-right">Kirim</th>
            <th className="border border-gray-300 p-2 text-right">Chiqim</th>
            {showAccount && <th className="border border-gray-300 p-2 text-left">Hisob</th>}
          </tr>
        </thead>
        <tbody>
          {cashFlows.map((cf) => (
            <tr key={cf._id}>
              <td className="border border-gray-300 p-2">{dayjs(cf.time).format("DD.MM.YYYY HH:mm")}</td>
              <td className="border border-gray-300 p-2">{categoryLabels[cf.category] || cf.category}</td>
              <td className="border border-gray-300 p-2">{cf.note || "-"}</td>
              <td className="border border-gray-300 p-2 text-right">
                {cf.direction === "IN" ? formatNumber(cf.amount, cf.amount % 1 ? 2 : 0) : "-"}
              </td>
              <td className="border border-gray-300 p-2 text-right">
                {cf.direction === "OUT" ? formatNumber(cf.amount, cf.amount % 1 ? 2 : 0) : "-"}
              </td>
              {showAccount && (
                <td className="border border-gray-300 p-2">
                  {(cf.accountId as any)?.name || "Mavjud emas"}
                </td>
              )}
            </tr>
          ))}
          {cashFlows.length === 0 && (
            <tr>
              <td className="border border-gray-300 p-2 text-center" colSpan={showAccount ? 6 : 5}>
                Ma'lumot topilmadi
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});
PrintableCashFlows.displayName = "PrintableCashFlows";

const CashFlowPage: React.FC = () => {
  const { user } = useAuthStore();

  const [searchText, setSearchText] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([dayjs(), dayjs()]);
  const [page, setPage] = useState(1);
  const limit = 100;
  const [hasMore, setHasMore] = useState(true);
  const spreadsheetWrapperRef = useRef<HTMLDivElement>(null);

  const socket = useSocket();
  const [form] = Form.useForm();
  // Fetch cash flows with pagination
  const {
    data: cashFlowsData,
    isLoading,
    refetch,
  } = usePaginatedQuery(
    ["cash-flows", searchText, directionFilter, categoryFilter, accountFilter, dateRange, page],
    (params) => cashFlowService.getCashFlows({
      ...params,
      search: searchText,
      direction: directionFilter,
      category: categoryFilter,
      accountId: accountFilter,
      startDate: dateRange?.[0]?.startOf("day").toISOString(),
      endDate: dateRange?.[1]?.endOf("day").toISOString(),
    }),
    { page, limit }
  );

  useEffect(() => {
    const el = spreadsheetWrapperRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

      if (isNearBottom && hasMore && !isLoading) {
        setPage(prev => prev + 1);
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [hasMore, isLoading]);

  // Pagination ma'lumotini kuzat
  useEffect(() => {
    if (!cashFlowsData) return;
    const pagination = cashFlowsData.pagination;
    if (pagination) {
      setHasMore(page < pagination.pages);
    }
  }, [cashFlowsData, page]);

  // Filter o'zgarganda page ni reset qil
  useEffect(() => {
    setPage(1);
    setHasMore(true);
  }, [searchText, directionFilter, categoryFilter, accountFilter, dateRange]);

  const [allCashFlows, setAllCashFlows] = useState<CashFlow[]>([]);

  useEffect(() => {
    if (!cashFlowsData?.data) return;
    const newData = cashFlowsData.data as CashFlow[];

    if (page === 1) {
      setAllCashFlows(newData);
    } else {
      setAllCashFlows(prev => [...prev, ...newData]);
    }
  }, [cashFlowsData, page]);

  const cashFlows = allCashFlows;

  // Fetch accounts
  const { data: accountsData, refetch: refetchAccounts } = useApiQuery(
    ["accounts", "all"],
    () => accountService.getAllAccounts()
  );

  const accounts = (accountsData || []) as CashAccount[];

  useEffect(() => {
    if (!user || !socket || !socket.connected) {
      return;
    }

    if (user.role !== "DIRECTOR" && user.role !== "MANAGER" && user.role !== "ACCOUNTANT") {
      return;
    }

    const handleCashFlowUpdate = () => {
      refetch();
      refetchAccounts();
    };

    const handleDirectorUpdate = () => {
      if (user.role === "DIRECTOR" || user.role === "MANAGER") {
        refetch();
        refetchAccounts();
      }
    };

    socket.on("cash_flow:updated", handleCashFlowUpdate);
    socket.on("cash_flow:director_update", handleDirectorUpdate);

    return () => {
      socket.off("cash_flow:updated", handleCashFlowUpdate);
      socket.off("cash_flow:director_update", handleDirectorUpdate);
    };
  }, [socket, user, refetch, refetchAccounts]);

  // Create cash flow mutation
  const createCashFlowMutation = useApiMutation(
    (data: CreateCashFlowRequest) => {
      const formattedData = {
        ...data,
        time: data.time ? dayjs(data.time).toISOString() : new Date().toISOString(),
      };
      return apiService.post<ApiResponse<{ cashFlow: CashFlow }>>("/cash-flow", formattedData);
    },
    {
      successMessage: "Naqd pul oqimi muvaffaqiyatli yaratildi",
      invalidateQueries: ["cash-flows", "cash-flow-categories", "accounts"],
    }
  );

  // Update cash flow mutation
  const updateCashFlowMutation = useApiMutation(
    ({ id, data }: { id: string; data: UpdateCashFlowRequest }) => {
      const formattedData = {
        ...data,
        time: data.time ? dayjs(data.time).toISOString() : undefined,
      };
      return apiService.put<ApiResponse<{ cashFlow: CashFlow }>>(`/cash-flow/${id}`, formattedData);
    },
    {
      successMessage: "Naqd pul oqimi muvaffaqiyatli yangilandi",
      invalidateQueries: ["cash-flows", "cash-flow-categories", "accounts"],
    }
  );
  const deleteCashFlowMutation = useApiMutation(
    ({ id }: { id: string; }) => {
      return apiService.delete<ApiResponse<{ cashFlow: CashFlow }>>(`/cash-flow/${id}`);
    },
    {
      successMessage: "Naqd pul oqimi muvaffaqiyatli o'chirildi",
      invalidateQueries: ["cash-flows", "cash-flow-categories", "accounts"],
    }
  );

  const totalIncome = cashFlows
    .filter((cf) => cf.direction === "IN")
    .reduce((sum, cf) => sum + cf.amount, 0);

  const totalExpense = cashFlows
    .filter((cf) => cf.direction === "OUT")
    .reduce((sum, cf) => sum + cf.amount, 0);

  const totalsByCurrency = useMemo(() => {
    const totals = {
      USD: { income: 0, expense: 0 },
      UZS: { income: 0, expense: 0 },
    };
    cashFlows.forEach((cf) => {
      const cur = ((cf.accountId as any)?.currency || (cf.account as any)?.currency || "USD") as "USD" | "UZS";
      const key = cur === "UZS" ? "UZS" : "USD";
      if (cf.direction === "IN") {
        totals[key].income += cf.amount;
      } else {
        totals[key].expense += cf.amount;
      }
    });
    return totals;
  }, [cashFlows]);

  const formatByCurrency = (amount: number, cur: "USD" | "UZS") => {
    if (cur === "UZS") {
      return `${formatNumber(amount)} so'm`;
    }
    return `$${formatNumber(amount, 2)}`;
  };

  const accountBalances = useMemo(() => {
    return [...accounts].sort((a, b) => {
      const ac = a.currency || "USD";
      const bc = b.currency || "USD";
      if (ac !== bc) return ac.localeCompare(bc);
      return a.name.localeCompare(b.name);
    });
  }, [accounts]);

  const handleExportExcel = () => {
    const exportData = cashFlows.map((cf) => ({
      "Sana": dayjs(cf.time).format("DD.MM.YYYY HH:mm"),
      "Kategoriya": categoryLabels[cf.category] || cf.category,
      "Izoh": cf.note || "-",
      "Kirim": cf.direction === "IN" ? cf.amount : 0,
      "Chiqim": cf.direction === "OUT" ? cf.amount : 0,
      "Hisob": (cf.accountId as any)?.name || "Mavjud emas",
    }));
    exportToExcel(exportData, `Naqd_pul_oqimi_${new Date().toLocaleDateString()}`);
  };

  type RowValues = {
    id?: string;
    time: string;
    category: string;
    note: string;
    inAmount: string;
    outAmount: string;
    account: string;
    isEdited?: boolean;
    isLocked?: boolean;
  };

  const pendingUpdatesRef = useRef<Record<number, { id: string; data: UpdateCashFlowRequest }>>({});
  const [dirtyCount, setDirtyCount] = useState(0);

  const normalizeText = useCallback((value: string) => value.trim().toLowerCase(), []);

  const accountsByName = useMemo(() => {
    const map = new Map<string, CashAccount>();
    accounts.forEach((a) => map.set(normalizeText(a.name), a));
    return map;
  }, [accounts, normalizeText]);

  const accountsList = useMemo(() => accounts.map((a) => a.name), [accounts]);
  const existingCategories = useMemo(() => Array.from(new Set(cashFlows.map(cf => cf.category))), [cashFlows]);
  const hasAccountColumn = !accountFilter;
  const accountColumnIndex = hasAccountColumn ? 5 : -1;
  const canCreateDrafts = !!accountFilter;

  const categoryByLabel = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(categoryLabels).forEach(([key, label]) => {
      map.set(normalizeText(label), key);
      map.set(normalizeText(key), key);
    });
    return map;
  }, [normalizeText]);

  const [sheetData, setSheetData] = useState<CellBase[][]>([]);
  const [draftCount, setDraftCount] = useState(0);
  const draftCountRef = useRef(0);
  const setDraftCountSafe = useCallback(
    (updater: number | ((prev: number) => number)) => {
      setDraftCount((prev) => {
        const next = typeof updater === "function"
          ? (updater as (p: number) => number)(prev)
          : updater;
        draftCountRef.current = next;
        return next;
      });
    },
    []
  );
  const syncingRef = useRef(false);
  const syncResetRef = useRef<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: `
      @page { margin: 12mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
      .print-content { font-family: "Calibri", "Segoe UI", sans-serif; color: #111; }
      .print-content h2 { margin: 0 0 8px 0; font-size: 14px; }
      .print-content table { border-collapse: collapse; table-layout: auto; width: auto; }
      .print-content th, .print-content td { border: 1px solid #c8c8c8; padding: 4px 6px; vertical-align: top; font-size: 11px; line-height: 1.2; }
      .print-content th { background: #f3f3f3; font-weight: 600; text-align: left; }
      .print-content td.text-right { text-align: right; }
      .print-content th:nth-child(1), .print-content td:nth-child(1) { width: 90px; white-space: nowrap; }
      .print-content th:nth-child(4), .print-content td:nth-child(4),
      .print-content th:nth-child(5), .print-content td:nth-child(5) { width: 90px; white-space: nowrap; }
      .print-content th:nth-child(6), .print-content td:nth-child(6) { width: 110px; }
      .print-content td { word-break: break-word; }
      .print-content .accounts-table { font-size: 10px; }
      .print-content .accounts-table th, .print-content .accounts-table td { padding: 3px 5px; }
    `,
  });

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

  const printBalancesTable = (
    <div>
      {accountBalances.length === 0 && <div>Hisoblar yo'q</div>}
      {accountBalances.length > 0 && (
        <table className="accounts-table w-full border-collapse text-sm mb-2">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 text-left">Hisob</th>
              <th className="border border-gray-300 p-2 text-right">Qoldiq</th>
            </tr>
          </thead>
          <tbody>
            {accountBalances.map((account) => (
              <tr key={account._id}>
                <td className="border border-gray-300 p-2">{account.name}</td>
                <td className="border border-gray-300 p-2 text-right">
                  {account.currency === "UZS"
                    ? `${formatNumber(account.currentBalance || 0)} so'm`
                    : `$${formatNumber(account.currentBalance || 0, 2)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const rows: RowValues[] = useMemo(() => {
    return cashFlows.map((cf) => ({
      id: cf._id,
      time: dayjs(cf.time).format("DD.MM.YYYY HH:mm"),
      category: categoryLabels[cf.category] || cf.category,
      note: cf.note || "",
      inAmount: cf.direction === "IN" ? formatAmountValue(cf.amount) : "",
      outAmount: cf.direction === "OUT" ? formatAmountValue(cf.amount) : "",
      account: (cf.accountId as any)?.name || "",
      isEdited: cf.isEdited,
      isLocked: !!(
        (cf as any).relatedTransactionId ||
        (cf as any).relatedDebtId ||
        (cf as any).relatedPaymentId ||
        (cf as any).relatedInvoiceId ||
        (cf as any).relatedCreditorId
      ),
    }));
  }, [cashFlows, formatAmountValue]);

  useEffect(() => {
    const nowLabel = dayjs().format("DD.MM.YYYY HH:mm");
    if (syncResetRef.current) {
      window.clearTimeout(syncResetRef.current);
    }
    const dataRows = rows.map((r) => {
      const cellClass = r.isEdited ? "cell-edited" : "";
      const base = [
        { value: r.time, className: cellClass },
        { value: r.category, className: cellClass },
        { value: r.note, className: cellClass },
        { value: r.inAmount, className: cellClass },
        { value: r.outAmount, className: cellClass },
      ];
      if (hasAccountColumn) {
        base.push({ value: r.account, className: cellClass });
      }
      return base;
    });
    syncingRef.current = true;
    setSheetData((prev) => {
      const expectedLength = hasAccountColumn ? 6 : 5;
      const normalizedDrafts = prev.slice(0, draftCount).map((row) => {
        const normalized = Array.from({ length: expectedLength }).map((_, idx) => {
          return row[idx] ?? { value: "" };
        });
        return normalized;
      });

      if (draftCount > normalizedDrafts.length) {
        const missing = draftCount - normalizedDrafts.length;
        for (let i = 0; i < missing; i += 1) {
          const newRow = [
            { value: nowLabel },
            { value: "" },
            { value: "" },
            { value: "" },
            { value: "" },
          ];
          if (hasAccountColumn) {
            newRow.push({ value: "" });
          }
          normalizedDrafts.unshift(newRow);
        }
      }

      return [...normalizedDrafts, ...dataRows];
    });
    syncResetRef.current = window.setTimeout(() => {
      syncingRef.current = false;
      syncResetRef.current = null;
    }, 200);
  }, [rows, hasAccountColumn, draftCount]);
  const parseRow = (row: CellBase[]): RowValues => ({
    time: String(row?.[0]?.value ?? "").trim(),
    category: String(row?.[1]?.value ?? "").trim(),
    note: String(row?.[2]?.value ?? "").trim(),
    inAmount: String(row?.[3]?.value ?? "").trim(),
    outAmount: String(row?.[4]?.value ?? "").trim(),
    account: hasAccountColumn ? String(row?.[5]?.value ?? "").trim() : "",
  });
  const normalizeDateCell = (value: string) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const parsed = dayjs(raw, ["DD.MM.YYYY HH:mm", "DD.MM.YYYY", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"], true);
    if (!parsed.isValid()) return raw;
    return parsed.format("DD.MM.YYYY HH:mm");
  };

  const isComplete = (r: RowValues) => {
    const inVal = parseAmount(r.inAmount);
    const outVal = parseAmount(r.outAmount);
    const hasAccount = hasAccountColumn ? !!r.account : !!accountFilter;
    return r.category && hasAccount && ((inVal > 0 && outVal === 0) || (outVal > 0 && inVal === 0));
  };
  const selectedAccount = useMemo(
    () => accounts.find((a) => a._id === accountFilter) || null,
    [accounts, accountFilter]
  );
  const toPayload = (r: RowValues) => {
    const inVal = parseAmount(r.inAmount);
    const outVal = parseAmount(r.outAmount);
    const direction = inVal > 0 ? "IN" : "OUT";
    const amount = inVal > 0 ? inVal : outVal;
    const account = hasAccountColumn ? accountsByName.get(normalizeText(r.account)) : selectedAccount;
    const time = r.time ? dayjs(r.time, ["DD.MM.YYYY HH:mm", "DD.MM.YYYY"], true) : null;
    return {
      direction,
      amount,
      category: categoryByLabel.get(normalizeText(r.category)) || r.category,
      note: r.note || "",
      accountId: account?._id || accountFilter,
      time: time && time.isValid() ? time.toISOString() : undefined,
      paymentMethod: "CASH",
    };
  };

  const addDraftRows = (count = 1) => {
    if (!canCreateDrafts) return;
    const nowLabel = dayjs().format("DD.MM.YYYY HH:mm");

    const newRows = Array.from({ length: count }, () => {
      const row = [
        { value: nowLabel },
        { value: "" },
        { value: "" },
        { value: "" },
        { value: "" },
      ];
      if (hasAccountColumn) row.push({ value: "" });
      return row;
    });

    setSheetData((prev) => [...newRows, ...prev]);
    setDraftCountSafe((prev) => prev + count);
  };

  const handleCreateDrafts = (currentData?: CellBase[][]) => {
    if (!canCreateDrafts) {
      message.info("Yangi tranzaksiya faqat hisob bo'limida yaratiladi");
      return;
    }
    if (draftCountRef.current === 0) {
      message.info("Yangi qator qo'shilmagan");
      return;
    }

    const sourceData = currentData ?? sheetData;
    const draftRows = sourceData.slice(0, draftCountRef.current);
    const validRowIndexes: number[] = [];

    draftRows.forEach((row, idx) => {
      const rowValues = parseRow(row);
      if (!isComplete(rowValues)) return;

      if (rowValues.time) {
        const time = dayjs(rowValues.time, ["DD.MM.YYYY HH:mm", "DD.MM.YYYY", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"], true);
        if (!time.isValid()) {
          message.error("Sana formati noto'g'ri. Masalan: 31.12.2026 14:30");
          return;
        }
      }

      const payload = toPayload(rowValues);
      if (!payload.accountId) {
        message.error("Hisob topilmadi: hisob nomini to'g'ri kiriting");
        return;
      }

      validRowIndexes.push(idx);
      createCashFlowMutation.mutate({
        ...payload,
        time: new Date().toISOString(),
      } as CreateCashFlowRequest);
    });

    if (validRowIndexes.length === 0) return;

    const validSet = new Set(validRowIndexes);
    const dc = draftCountRef.current;
    setSheetData((prev) => prev.filter((_, idx) => !(idx < dc && validSet.has(idx))));
    setDraftCountSafe((prev) => prev - validRowIndexes.length);
  };


  const dataEditorComponent = useMemo(
    () =>
      (props: DataEditorProps<CellBase>) => {
        if (props.row < draftCount) {
          if (props.column === 0) {
            return <DateCellEditor {...props} />;
          }
          if (props.column === 1) {
            return <CategoryCellEditor {...props} existingCategories={existingCategories} />;
          }
          if (hasAccountColumn && props.column === accountColumnIndex) {
            return <AccountCellEditor {...props} options={accountsList} />;
          }
        }
        return <DefaultDataEditor {...props} />;
      },
    [draftCount, accountsList, accountColumnIndex, existingCategories, hasAccountColumn]
  );

  const dataViewerComponent = useMemo(
    () => (props: DataViewerProps<CellBase>) => <AmountCellViewer {...props} formatAmount={formatAmountCell} />,
    [formatAmountCell]
  );

  const handleSaveEdits = () => {
    const entries = Object.values(pendingUpdatesRef.current);
    if (entries.length === 0) {
      message.info("Saqlash uchun o'zgarish yo'q");
      return;
    }
    entries.forEach((entry) => {
      updateCashFlowMutation.mutate(entry);
    });
    pendingUpdatesRef.current = {};
    setDirtyCount(0);
  };


  // HISOB QOSHISH MODAL############
  const usdAccounts = accounts.filter((account) => account.currency === "USD" || !account.currency);
  const uzsAccounts = accounts.filter((account) => account.currency === "UZS");
  const usdTotal = usdAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const uzsTotal = uzsAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CashAccount | null>(
    null
  );
  const showCreateModal = () => {
    setEditingAccount(null);
    setModalVisible(true);
    form.resetFields();
  };

  const showEditModal = (account: CashAccount) => {
    setEditingAccount(account);
    setModalVisible(true);
    form.setFieldsValue({
      name: account.name,
      type: account.type,
      currency: account.currency || 'USD',
      currentBalance: account.currentBalance,
    });
  };

  const createAccountMutation = useApiMutation(
    (data: CreateCashAccountRequest) => accountService.createAccount(data),
    {
      successMessage: "Hisob muvaffaqiyatli yaratildi",
      invalidateQueries: ["accounts"],
      onSuccess: () => {
        setModalVisible(false);
        form.resetFields();
      },
    }
  );

  const updateAccountMutation = useApiMutation(
    ({ id, data }: { id: string; data: UpdateCashAccountRequest }) =>
      accountService.updateAccount(id, data),
    {
      successMessage: "Hisob muvaffaqiyatli yangilandi",
      invalidateQueries: ["accounts"],
      onSuccess: () => {
        setModalVisible(false);
        setEditingAccount(null);
        form.resetFields();
      },
    }
  );

  const deleteAccountMutation = useApiMutation(
    (id: string) => accountService.deleteAccount(id),
    {
      successMessage: "Hisob muvaffaqiyatli o'chirildi",
      invalidateQueries: ["accounts"],
    }
  );
  // Handle form submit
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingAccount) {
        updateAccountMutation.mutate({
          id: editingAccount._id,
          data: values,
        });
      } else {
        createAccountMutation.mutate(values);
      }
    });
  };


  // Handle delete
  const handleDelete = (accountId: string) => {
    deleteAccountMutation.mutate(accountId);
  };
  const {
    data: hisobData,
  } = usePaginatedQuery(
    ["accounts"],
    (params) => accountService.getAccounts(params),
    {
      page: 1,
      limit: 10,
      search: searchText,
    }
  );
  const hisoblar = hisobData?.data || [];
  const accountTypeOptions = [
    { label: "Naqd pul", value: "CASH" },
    { label: "Bank hisobi", value: "BANK" },
    { label: "Karta", value: "CARD" },
    { label: "Boshqa", value: "OTHER" },
  ];

  // hisoblar scroll uchun
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(320);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", handleWheel, { passive: false });

    const updateCardWidth = () => {
      setCardWidth((el.offsetWidth - 16 * 3) / 3.5);
    };
    updateCardWidth();
    window.addEventListener("resize", updateCardWidth);

    return () => {
      el.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", updateCardWidth);
    };
  }, []);


  const [activeTab, setActiveTab] = useState<"hisoblar" | "transaksiya">("transaksiya");
  const [viewRecord, setViewRecord] = useState<CashAccount | null>(null);

  const typeColorHex = {
    CASH: "#22c55e",
    BANK: "#3b82f6",
    CARD: "#a855f7",
    OTHER: "#f97316",
  };

  const handleSheetChange = (data: CellBase[][]) => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    let normalizedData = data;
    let changed = false;

    normalizedData = data.map((row) => {
      if (!row || !row[0]) {
        return row;
      }
      const updated = [...row];
      let rowChanged = false;

      const currentDate = String(row[0]?.value || "");
      const normalizedDate = normalizeDateCell(currentDate);
      if (normalizedDate !== currentDate) {
        updated[0] = { ...row[0], value: normalizedDate };
        rowChanged = true;
      }

      const inIndex = 3;
      const outIndex = 4;
      const currentIn = String(row[inIndex]?.value || "");
      const currentOut = String(row[outIndex]?.value || "");
      const normalizedIn = formatAmountCell(currentIn);
      const normalizedOut = formatAmountCell(currentOut);

      if (normalizedIn !== currentIn) {
        updated[inIndex] = { ...row[inIndex], value: normalizedIn };
        rowChanged = true;
      }
      if (normalizedOut !== currentOut) {
        updated[outIndex] = { ...row[outIndex], value: normalizedOut };
        rowChanged = true;
      }

      if (rowChanged) {
        changed = true;
        return updated;
      }

      return row;
    });

    const workingData = changed ? normalizedData : data;
    setSheetData(workingData);

    const nextPending: Record<number, { id: string; data: UpdateCashFlowRequest }> = {};

    workingData.forEach((row, idx) => {
      const rowValues = parseRow(row);
      const isDraftRow = idx < draftCountRef.current;

      if (isDraftRow || !isComplete(rowValues)) {
        return;
      }

      const payload = toPayload(rowValues);
      if (!payload.accountId) {
        return;
      }

      const original = rows[idx - draftCountRef.current];
      if (!original) return;
      if (original.isLocked) return;
      const hasChanges =
        rowValues.time !== original.time ||
        rowValues.category !== original.category ||
        rowValues.note !== original.note ||
        parseAmount(rowValues.inAmount) !== parseAmount(original.inAmount) ||
        parseAmount(rowValues.outAmount) !== parseAmount(original.outAmount) ||
        rowValues.account !== original.account;

      if (!hasChanges) {
        return;
      }

      nextPending[idx] = {
        id: original.id as string,
        data: payload as UpdateCashFlowRequest,
      };
    });

    pendingUpdatesRef.current = nextPending;
    const nextCount = Object.keys(nextPending).length;
    setDirtyCount(nextCount);
  };

  const handleAccountFilter = (id: string) => {
    setAccountFilter(id);
    setDraftCountSafe(0);
    setSheetData([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          size="large"
          type={activeTab === "transaksiya" ? "primary" : "default"}
          onClick={() => setActiveTab("transaksiya")}
        >
          Tranzaksiya
        </Button>
        <Button
          size="large"
          type={activeTab === "hisoblar" ? "primary" : "default"}
          onClick={() => setActiveTab("hisoblar")}
        >
          Hisoblar
        </Button>
      </div>

      {/* Hisoblar section */}
      {activeTab === "hisoblar" && (
        <div className=" space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 m-0">Naqd pul hisoblari boshqaruvi</h1>
              <p className="text-gray-500 mt-1">Naqd pul hisoblari va balanslarini samarali boshqaring</p>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showCreateModal}
              size="large"
              className="bg-blue-600 hover:bg-blue-700 shadow-md"
            >
              Hisob qo'shish
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ">
            <Card variant="borderless" className="shadow-sm hover:shadow-md transition-all duration-300 h-full" style={{ borderTop: '3px solid #52c41a' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-gray-500 mb-1">Jami hisoblar</div>
                  <div className="text-lg xl:text-xl font-bold text-green-600 break-words">
                    {accounts.length}
                    <span className="text-sm text-gray-500 ml-1">ta</span>
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded-full ml-4 flex-shrink-0">
                  <DollarOutlined className="text-green-600 text-xl" />
                </div>
              </div>
            </Card>

            <Card variant="borderless" className="shadow-sm hover:shadow-md transition-all duration-300 h-full" style={{ borderTop: '3px solid #52c41a' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-gray-500 mb-1">USD jami</div>
                  <div className="text-lg xl:text-xl font-bold text-green-600 break-words">
                    ${formatNumber(usdTotal, 2)}
                  </div>
                  <div className="text-xs text-gray-400">{usdAccounts.length} ta hisob</div>
                </div>
                <div className="bg-green-50 p-3 rounded-full ml-4 flex-shrink-0">
                  <DollarOutlined className="text-green-600 text-xl" />
                </div>
              </div>
            </Card>

            <Card variant="borderless" className="shadow-sm hover:shadow-md transition-all duration-300 h-full" style={{ borderTop: '3px solid #1890ff' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-gray-500 mb-1">UZS jami</div>
                  <div className="text-lg xl:text-xl font-bold text-blue-600 break-words">
                    {formatNumber(uzsTotal)} so'm
                  </div>
                  <div className="text-xs text-gray-400">{uzsAccounts.length} ta hisob</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-full ml-4 flex-shrink-0">
                  <BankOutlined className="text-blue-600 text-xl" />
                </div>
              </div>
            </Card>

            <Card variant="borderless" className="shadow-sm hover:shadow-md transition-all duration-300 h-full" style={{ borderTop: '3px solid #722ed1' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-gray-500 mb-1">Karta hisoblari</div>
                  <div className="text-lg xl:text-xl font-bold text-purple-600 break-words">
                    {accounts.filter(a => a.type === 'CARD').length}
                    <span className="text-sm text-gray-500 ml-1">ta</span>
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-full ml-4 flex-shrink-0">
                  <BankOutlined className="text-purple-600 text-xl" />
                </div>
              </div>
            </Card>
          </div>


          <Modal
            title={editingAccount ? "Hisobni tahrirlash" : "Yangi hisob qo'shish"}
            open={modalVisible}
            onOk={handleSubmit}
            onCancel={() => {
              setModalVisible(false);
              setEditingAccount(null);
              form.resetFields();
            }}
            width={600}
            okText={editingAccount ? "Yangilash" : "Yaratish"}
            cancelText="Bekor qilish"
            confirmLoading={
              createAccountMutation.isLoading || updateAccountMutation.isLoading
            }
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={{ currentBalance: 0, currency: 'USD' }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Hisob nomi"
                    rules={[
                      { required: true, message: "Iltimos, hisob nomini kiriting" },
                    ]}
                  >
                    <Input placeholder="Hisob nomini kiriting" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="type"
                    label="Hisob turi"
                    rules={[
                      { required: true, message: "Iltimos, hisob turini tanlang" },
                    ]}
                  >
                    <Select placeholder="Hisob turini tanlang">
                      {accountTypeOptions.map((option) => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="currency"
                    label="Valyuta"
                    rules={[
                      { required: true, message: "Iltimos, valyutani tanlang" },
                    ]}
                  >
                    <Select placeholder="Valyutani tanlang">
                      <Option value="USD">USD (Dollar)</Option>
                      <Option value="UZS">UZS (So'm)</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="currentBalance"
                    label="Boshlang'ich balans"
                    rules={[
                      { required: true, message: "Iltimos, boshlang'ich balansni kiriting" },
                    ]}
                  >
                    <InputNumber
                      placeholder="Boshlang'ich balansni kiriting"
                      style={{ width: "100%" }}
                      formatter={inputNumberFormatter}
                      parser={inputNumberParser}
                      min={0}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Modal>

          {/* Hisoblar card */}
          <div
            ref={scrollRef}
            className="overflow-x-auto pb-2 thin-scroll"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#d1d5db transparent" }}
          >
            <div className="flex gap-4" style={{ minWidth: "max-content" }}>
              {isLoading ? (
                <div className="flex gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} style={{ width: cardWidth, borderRadius: 12 }} loading />
                  ))}
                </div>
              ) : hisoblar.length === 0 ? (
                <div className="text-gray-400 py-8 px-4">Hisoblar topilmadi</div>
              ) : (
                hisoblar.map((record: CashAccount) => {
                  const typeColors = {
                    CASH: "green",
                    BANK: "blue",
                    CARD: "purple",
                    OTHER: "orange",
                  };

                  return (
                    <Card
                      key={record._id}
                      style={{
                        borderRadius: 16,
                        borderTop: `4px solid ${typeColorHex[record.type as keyof typeof typeColorHex]}`,
                        width: cardWidth,
                        minWidth: cardWidth,
                      }}
                      className="shadow-sm flex-shrink-0"
                      bodyStyle={{ padding: "20px" }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="font-bold text-xl">{record.name}</div>
                          <div className="flex gap-2 mt-2">
                            <Tag color={typeColors[record.type as keyof typeof typeColors]} style={{ margin: 0, fontSize: 14, padding: "2px 10px" }}>
                              {record.type}
                            </Tag>
                            <Tag color={record.currency === "USD" ? "green" : "blue"} style={{ margin: 0, fontSize: 14, padding: "2px 10px" }}>
                              {record.currency || "USD"}
                            </Tag>
                          </div>
                        </div>
                        <Button
                          type="text"
                          icon={<EyeOutlined style={{ fontSize: 20 }} />}
                          onClick={() => setViewRecord(record)}
                          className="text-gray-400 hover:text-blue-500"
                        />
                      </div>

                      <div className={`text-3xl font-bold mb-4 ${record.currentBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {record.currency === "UZS"
                          ? `${formatNumber(record.currentBalance)} so'm`
                          : `$${formatNumber(record.currentBalance, 2)}`}
                      </div>

                      <div className="flex items-center justify-between border-t pt-3 mt-1">
                        <div className="text-gray-400 text-base">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          <Tooltip title="Tahrirlash">
                            <Button
                              type="text"
                              icon={<EditOutlined style={{ fontSize: 18 }} />}
                              onClick={() => showEditModal(record)}
                            />
                          </Tooltip>
                          <Popconfirm
                            title="O'chirilsinmi?"
                            description="Bu amalni qaytarib bo'lmaydi."
                            onConfirm={() => handleDelete(record._id)}
                            okText="Ha"
                            cancelText="Yo'q"
                          >
                            <Tooltip title="O'chirish">
                              <Button type="text" danger icon={<DeleteOutlined style={{ fontSize: 18 }} />} />
                            </Tooltip>
                          </Popconfirm>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Naqd pul oqimi section */}
      {activeTab === "transaksiya" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h1 className="text-2xl font-bold">Naqd pul oqimi boshqaruvi</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                <div className="bg-green-100 p-1.5 rounded-full">
                  <ArrowUpOutlined className="text-green-600 text-sm" />
                </div>
                <div>
                  <div className="text-gray-400 text-xs">Jami kirim</div>
                  <div className="flex gap-2 text-xs font-semibold text-green-600">
                    <span>USD: {formatByCurrency(totalsByCurrency.USD.income, "USD")}</span>
                    <span className="text-gray-300">|</span>
                    <span>UZS: {formatByCurrency(totalsByCurrency.UZS.income, "UZS")}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2">
                <div className="bg-red-100 p-1.5 rounded-full">
                  <ArrowDownOutlined className="text-red-600 text-sm" />
                </div>
                <div>
                  <div className="text-gray-400 text-xs">Jami chiqim</div>
                  <div className="flex gap-2 text-xs font-semibold text-red-600">
                    <span>USD: {formatByCurrency(totalsByCurrency.USD.expense, "USD")}</span>
                    <span className="text-gray-300">|</span>
                    <span>UZS: {formatByCurrency(totalsByCurrency.UZS.expense, "UZS")}</span>
                  </div>
                </div>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <Button icon={<PrinterOutlined />} onClick={handlePrint}>Chop etish</Button>
              <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>Excel</Button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 justify-between items-center mb-10">
              {accounts?.filter((a) => a._id === accountFilter).map((ac) => (
                <span key={ac._id} className={`m-0 font-semibold text-xl flex gap-3`}>
                  Qoldiq:
                  <p className={`m-0 font-semibold text-xl ${ac.currentBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {ac.currency === "UZS"
                      ? `${formatNumber(ac.currentBalance)} so'm`
                      : `${formatNumber(ac.currentBalance, 2)} USD`}
                  </p>
                </span>
              ))}
              <div>
                <Input
                  placeholder="Kategoriya bo'yicha qidirish"
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                  style={{ width: 220 }}
                />
                <Select
                  placeholder="Yo'nalish"
                  value={directionFilter}
                  onChange={(value) => setDirectionFilter(value)}
                  allowClear
                  style={{ width: 140 }}
                >
                  <Option value="IN">Kirim</Option>
                  <Option value="OUT">Chiqim</Option>
                </Select>
                <DatePicker.RangePicker
                  placeholder={["Boshlanish", "Tugash"]}
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
                />
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setSearchText("");
                    setDirectionFilter("");
                    setCategoryFilter("");
                    setAccountFilter("");
                    setDateRange(null);
                  }}
                >
                  Tozalash
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type={accountFilter ? "default" : "primary"}
                onClick={() => handleAccountFilter("")}
              >
                Barchasi
              </Button>
              {accounts.map((account) => (
                <Button
                  key={account._id}
                  type={accountFilter === account._id ? "primary" : "default"}
                  onClick={() => handleAccountFilter(account._id)}
                >
                  {account.name} {account.currency ? `(${account.currency})` : ""}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                type="primary"
                disabled={draftCount === 0}
                onClick={() => handleCreateDrafts()}
                icon={<PlusOutlined />}
              >
                Yaratish
              </Button>
              <Button
                disabled={dirtyCount === 0}
                onClick={() => handleSaveEdits()}
                icon={<SaveOutlined />}
                className="!bg-green-500 !border-green-500 hover:!bg-green-600 hover:!border-green-600 !text-white disabled:!bg-gray-100 disabled:!text-gray-400 disabled:!border-gray-200"
              >
                Saqlash
              </Button>
            </div>
            {
              canCreateDrafts && (
                <button
                  onClick={() => addDraftRows(1)}
                  className="w-full py-1.5 border border-gray-200 border-t-0 text-gray-400 hover:bg-gray-50 hover:text-blue-500 transition-all duration-200 flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  style={{ fontSize: 13 }}
                >
                  <span className="w-8 text-center text-gray-300 border-r border-gray-200 pr-2 flex-shrink-0">
                    <PlusOutlined />
                  </span>
                  <span>Qator qo'shish</span>
                </button>
              )
            }
            <div
              ref={spreadsheetWrapperRef}
              style={{ maxHeight: "70vh", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#d1d5db transparent" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <Spreadsheet
                  data={sheetData}
                  onChange={handleSheetChange}
                  DataViewer={dataViewerComponent}
                  DataEditor={dataEditorComponent}
                  className="cashflow-spreadsheet"
                  columnLabels={
                    hasAccountColumn
                      ? ["Sana", "Kategoriya", "Izoh", "Kirim", "Chiqim", "Hisob"]
                      : ["Sana", "Kategoriya", "Izoh", "Kirim", "Chiqim"]
                  }
                  
                />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ height: 46 }} />
                  {sheetData.map((_, rowIndex) => {
                    const isDraft = rowIndex < draftCount;
                    const originalRow = !isDraft ? rows[rowIndex - draftCount] : null;
                    const rowId = originalRow && !originalRow.isLocked ? originalRow.id : null;
                    return (
                      <div key={rowIndex} style={{ height: 48, display: "flex", alignItems: "center", paddingLeft: 4 }} className="">
                        {rowId && (
                          <Popconfirm
                            title="O'chirilsinmi?"
                            description="Bu amalni qaytarib bo'lmaydi."
                            okText="Ha"
                            cancelText="Yo'q"
                            onConfirm={() => deleteCashFlowMutation.mutate({ id: rowId })}
                          >
                            <Button type="text" danger size="large" icon={<DeleteOutlined />} />
                          </Popconfirm>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {isLoading && page > 1 && (
                <div className="text-center py-3 text-gray-400 text-sm">
                  Yuklanmoqda...
                </div>
              )}
            </div>
          </div>
          <div className="cashflow-print">
            <PrintableCashFlows
              ref={printRef}
              cashFlows={cashFlows}
              categoryLabels={categoryLabels}
              showAccount={hasAccountColumn}
              balancesTable={printBalancesTable}
            />
          </div>
        </div>
      )}
      <Modal
        open={!!viewRecord}
        onCancel={() => setViewRecord(null)}
        footer={null}
        title={<span className="text-xl font-bold">Hisob ma'lumotlari</span>}
        width={600}
      >
        {viewRecord && (
          <div className="space-y-4 pt-3">
            <div className="bg-gray-50 rounded-xl p-5 text-center">
              <div className="text-gray-500 text-base mb-1">Joriy balans</div>
              <div className={`text-4xl font-bold ${viewRecord.currentBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {viewRecord.currency === "UZS"
                  ? `${formatNumber(viewRecord.currentBalance)} so'm`
                  : `$${formatNumber(viewRecord.currentBalance, 2)}`}
              </div>
            </div>
            {[
              { label: "Hisob nomi", value: <span className="font-semibold text-lg">{viewRecord.name}</span> },
              { label: "Turi", value: <Tag color={typeColorHex[viewRecord.type as keyof typeof typeColorHex]} style={{ fontSize: 15, padding: "2px 10px" }}>{viewRecord.type}</Tag> },
              { label: "Valyuta", value: <Tag color={viewRecord.currency === "USD" ? "green" : "blue"} style={{ fontSize: 15, padding: "2px 10px" }}>{viewRecord.currency || "USD"}</Tag> },
              { label: "Yaratilgan", value: <span className="font-medium">{new Date(viewRecord.createdAt).toLocaleString()}</span> },
              { label: "ID", value: <span className="text-gray-400 text-sm">{viewRecord._id}</span> },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between border-b pb-3">
                <span className="text-gray-500 text-lg">{label}</span>
                <span className="text-lg">{value}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CashFlowPage;
