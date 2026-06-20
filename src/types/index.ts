// User types
export interface User {
  _id: string;
  fullName: string;
  phone: string;
  position: string;
  role: "DIRECTOR" | "MANAGER" | "SELLER" | "ACCOUNTANT" | "WORKER" | "WRAPPER";
  permissions: string[];
  lastActiveAt?: string;
  lastWrappedBatchId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateUserRequest {
  fullName: string;
  phone: string;
  position: string;
  role: User["role"];
  permissions?: string[];
  password: string;
}

export interface UpdateUserRequest {
  fullName?: string;
  phone?: string;
  position?: string;
  role?: User["role"];
  permissions?: string[];
  isActive?: boolean;
}

// Supplier types
export interface Supplier {
  _id: string;
  companyName: string;
  responsiblePerson: string;
  phone: string;
  address: string;
  debt: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierRequest {
  companyName: string;
  responsiblePerson: string;
  phone: string;
  address: string;
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {}

export interface FinishedProduct {
  _id: string;
  productName: string;
  color: string;
  colorCode: string;
  weightKg: number;
  brutto?: number;
  tara?: number;
  weightDifference?: number;
  wrappingId?: string;
  bagsCount: number;
  bagsParties?: string[];
  softHankDate?: string;
  dyehouseDate?: string;
  hardHankDate?: string;
  finishedDate: string;
  comment?: string;
  dyehouseName?: string;
  type?: "to'q" | "och";
  batch: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Client types
export interface Client {
  _id: string;
  name: string;
  phone: string;
  tin?: string;
  address: string;
  notes?: string;
  currentDebt: number;
  totalDebt: number;
  advanceBalance?: number;
  invoices: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateClientRequest {
  name: string;
  phone: string;
  tin?: string;
  address: string;
  notes?: string;
  initialDebt?: number;
}

export interface UpdateClientRequest {
  name?: string;
  phone?: string;
  tin?: string;
  address?: string;
  notes?: string;
}

// Debt types
export interface Debt {
  _id: string;
  clientId: string;
  client?: Client;
  invoiceNo?: string;
  reasonType: string;
  amount: number;
  paymentMethod: string;
  occurredAt: string;
  currentDebt: number;
  totalDebt: number;
  note?: string;
  payments?: DebtPayment[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface DebtPayment {
  amount: number;
  method: string;
  date: string;
  note?: string;
  recordedBy?: string;
}

export interface CreateDebtRequest {
  clientId: string;
  invoiceNo?: string;
  reasonType: string;
  amount: number;
  paymentMethod: string;
  occurredAt: string;
  note?: string;
}

export interface UpdateDebtRequest {
  invoiceNo?: string;
  reasonType?: string;
  amount?: number;
  paymentMethod?: string;
  occurredAt?: string;
  note?: string;
}

export interface DebtPaymentRequest {
  amount: number;
  paymentMethod: string;
  note?: string;
  accountId?: string;
  currency?: "USD" | "UZS";
  rate?: number;
  amountUSD?: number;
}

// Our Debt types
export interface OurDebt {
  _id: string;
  creditorName: string;
  creditorPhone?: string;
  reasonType: string;
  amount: number;
  paymentMethod?: string;
  occurredAt: string;
  dueDate?: string;
  currentDebt: number;
  totalDebt: number;
  note?: string;
  payments?: OurDebtPayment[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface OurDebtPayment {
  _id: string;
  amount: number;
  method: string;
  date: string;
  note?: string;
  rate?: number;
  currency?: string;
  recordedBy?: string;
  accountId?: string;
}

export interface CreateOurDebtRequest {
  creditorName: string;
  creditorPhone?: string;
  reasonType: string;
  amount: number;
  paymentMethod?: string;
  occurredAt?: string;
  dueDate?: string;
  note?: string;
}

export interface UpdateOurDebtRequest extends Partial<CreateOurDebtRequest> {}

// Dyehouse types
export interface Dyehouse {
  _id: string;
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateDyehouseRequest {
  name: string;
  ownerName: string;
  phone: string;
  address: string;
}

export interface UpdateDyehouseRequest {
  name?: string;
  ownerName?: string;
  phone?: string;
  address?: string;
}

// Dyehouse Process types
export interface DyehouseProcess {
  _id: string;
  name: string;
  color: string;
  colorCode: string;
  weight: number;
  date?: string;
  comment?: string;
  softHankId?: string;
  createdAt: string;
  updatedAt: string;
}

// Hard Hank types
export interface HardHank {
  _id: string;
  dyehouseProcessId: string;
  name: string;
  color: string;
  colorCode: string;
  weight: number;
  comment?: string;
  batchNumber?: string;
  createdAt: string;
  updatedAt: string;
}

// Worker types
export interface Worker {
  _id: string;
  fullName: string;
  phone: string;
  address?: string;
  position: string;
  salary: number;
  workingSince: string;
  lastSalaryReceived?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkerRequest {
  fullName: string;
  phone: string;
  address?: string;
  position?: string;
  salary: number;
  workingSince: string;
}

export interface UpdateWorkerRequest extends Partial<CreateWorkerRequest> {}

// Raw Material types
export interface MaterialIntakeRecord {
  _id: string;
  date: string;
  weightKg: number;
  comment?: string;
  createdBy: string | { _id: string; fullName: string };
  createdAt: string;
}

export interface RawMaterialIntake {
  _id: string;
  name?: string; // Legacy field
  threadType: string;
  threadNumber: string;
  supplier: string;
  totalWeightKg: number;
  totalBags: number;
  intakes?: MaterialIntakeRecord[];
  date: string;
  comment?: string;
  createdBy: string | { _id: string; fullName: string };
  createdAt: string;
}

export interface CreateMaterialRequest {
  threadType: string;
  threadNumber: string;
  supplier: string;
  totalWeightKg: number;
  date: string;
  comment?: string;
}

export interface UpdateMaterialRequest {
  name?: string;
  supplier?: string;
  totalWeightKg?: number;
  totalBags?: number;
  date?: string;
  comment?: string;
}

// Dyeing types
export interface DyeingLot {
  _id: string;
  name: string;
  colorName: string;
  colorCode: string;
  weightKg: number;
  date: string;
  comment?: string;
  batchCode: string;
  createdBy: string;
  createdAt: string;
}

export interface SendToDyehouse {
  _id: string;
  dyehouseId: string;
  dyehouse?: Dyehouse;
  productName: string;
  weightKg: number;
  date: string;
  comment?: string;
  batchCode: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateDyeingLotRequest {
  name: string;
  colorName: string;
  colorCode: string;
  weightKg: number;
  date: string;
  comment?: string;
}

export interface CreateSendToDyehouseRequest {
  dyehouseId: string;
  productName: string;
  weightKg: number;
  date: string;
  comment?: string;
}

// Invoice types
export interface InvoiceItem {
  batchCode: string;
  productName: string;
  colorName: string;
  colorCode: string;
  weightKg: number;
  bagsCount: number;
  price: number;
  discount?: number;
  count?: number;
  total?: number;
}

export interface InvoiceTransaction {
  type: "PAYMENT" | "REFUND" | "ADJUST";
  amount: number;
  method: string;
  at: string;
  accountId?: string;
}

export interface Invoice {
  _id: string;
  invoiceNo: string;
  clientId: string;
  client?: Client;
  clientMeta: {
    name: string;
    phone: string;
    carNo?: string;
    clientType?: string;
  };
  items: InvoiceItem[];
  discountTotal: number;
  grossTotal: number;
  netTotal: number;
  currency?: "UZS" | "USD" | "RUB";
  currencyRate?: number;
  paid: number;
  balance: number;
  transactions: InvoiceTransaction[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  printedAt?: string;
  driver?: string;
  carNumber?: string;
  handedBy?: string;
  note?: string;
}

export interface InvoicePaymentInput {
  amount: number;
  accountId: string;
  method?: string;
}

export interface CreateInvoiceRequest {
  clientId: string;
  clientMeta: {
    name: string;
    phone: string;
    carNo?: string;
    clientType?: string;
  };
  items: InvoiceItem[];
  discountTotal: number;
  grossTotal: number;
  netTotal: number;
  discountPercent?: number;
  note?: string;
  driver?: string;
  driverName?: string;
  carNumber?: string;
  handedBy?: string;
  initialPayment?: number;
  accountId?: string;
  payments?: InvoicePaymentInput[];
   currency?: "UZS" | "USD" | "RUB";
   currencyRate?: number;
  paid?: number;
  balance?: number;
}

export interface UpdateInvoiceRequest {
  clientId?: string;
  clientMeta?: {
    name: string;
    phone: string;
    carNo?: string;
    clientType?: string;
  };
  items?: InvoiceItem[];
  discountTotal?: number;
  grossTotal?: number;
  netTotal?: number;
}

export interface InvoicePaymentRequest {
  amount: number;
  method: string;
}

// Cash Account types
export interface CashAccount {
  _id: string;
  id: string;
  name: string;
  type: string;
  currency?: 'USD' | 'UZS';
  currentBalance: number;
  createdAt: string;
}

export interface CreateCashAccountRequest {
  name: string;
  type: string;
  currency?: 'USD' | 'UZS';
  currentBalance: number;
}

export interface UpdateCashAccountRequest {
  name?: string;
  type?: string;
  currency?: 'USD' | 'UZS';
  currentBalance?: number;
}

// Cash Flow types
export interface CashFlow {
  _id: string;
  time: string;
  category: string;
  direction: "IN" | "OUT";
  amount: number;
  paymentMethod: string;
  note?: string;
  accountId: string;
  account?: CashAccount;
  relatedInvoiceId?: { _id: string; invoiceNo: string };
  relatedClientId?: { _id: string; name: string };
  createdAt: string;
}

export interface CreateCashFlowRequest {
  time: string;
  category: string;
  direction: "IN" | "OUT";
  amount: number;
  paymentMethod: string;
  note?: string;
  accountId: string;
}

export interface UpdateCashFlowRequest {
  time?: string;
  category?: string;
  direction?: "IN" | "OUT";
  amount?: number;
  paymentMethod?: string;
  note?: string;
  accountId?: string;
}

// Payroll types
export interface Payroll {
  _id: string;
  date: string;
  amount: number;
  workerId: string;
  worker?: Worker;
  accountId: string;
  account?: CashAccount;
  note?: string;
  createdAt: string;
}

export interface CreatePayrollRequest {
  date: string;
  amount: number;
  workerId: string;
  accountId: string;
  note?: string;
}

export interface UpdatePayrollRequest {
  date?: string;
  amount?: number;
  workerId?: string;
  accountId?: string;
  note?: string;
}

// Common types
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[]; // Changed from materials to data
  pagination: PaginationInfo;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

// Auth types
export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Dashboard types
export interface DashboardStats {
  totalClients: number;
  totalInvoices: number;
  totalDebts: number;
  totalRevenue: number;
  recentInvoices: Invoice[];
  recentDebts: Debt[];
  chartData: {
    monthlyRevenue: Array<{ month: string; amount: number }>;
    monthlyDebts: Array<{ month: string; amount: number }>;
  };
}

// Report types
export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  clientId?: string;
  dyehouseId?: string;
  category?: string;
}

export interface FinancialReport {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  totalDebts: number;
  totalPayments: number;
  monthlyData: Array<{
    month: string;
    income: number;
    expense: number;
    profit: number;
  }>;
}

// WebSocket types
export interface WebSocketEvent {
  type: "invoice" | "payment" | "debt" | "stock" | "cash";
  action: "created" | "updated" | "deleted";
  data: any;
}

// Return types
export interface ReturnItem {
  batchCode: string;
  productName: string;
  colorName?: string;
  colorCode?: string;
  weightKg: number;
  bagsCount: number;
  price: number;
  total: number;
  condition: 'GOOD' | 'DEFECTIVE';
}

export interface Return {
  _id: string;
  returnNo: string;
  invoiceId?: string;
  invoiceNo?: string;
  clientId?: string;
  clientName?: string;
  isManual?: boolean;
  manualClientName?: string;
  items: ReturnItem[];
  totalAmount: number;
  refundMethod: 'DEBT_REDUCTION' | 'CASH_REFUND';
  refundAccountId?: string;
  debtReduction?: number;
  cashRefund?: number;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateReturnRequest {
  invoiceId: string;
  invoiceNo: string;
  clientId: string;
  clientName: string;
  items: ReturnItem[];
  totalAmount: number;
  refundMethod: 'DEBT_REDUCTION' | 'CASH_REFUND';
  refundAccountId?: string;
  refundCurrency?: 'USD' | 'UZS';
  refundRate?: number;
  debtReduction?: number;
  cashRefund?: number;
  note?: string;
}

export interface CreateManualReturnRequest {
  isManual: true;
  clientId?: string;
  clientName?: string;
  manualClientName?: string;
  items: ReturnItem[];
  totalAmount: number;
  refundMethod: 'DEBT_REDUCTION' | 'CASH_REFUND';
  refundAccountId?: string;
  refundCurrency?: 'USD' | 'UZS';
  refundRate?: number;
  debtReduction?: number;
  cashRefund?: number;
  note?: string;
}

export interface DefectiveProduct {
  _id: string;
  returnId: string;
  returnNo: string;
  batchCode: string;
  productName: string;
  colorName: string;
  colorCode: string;
  weightKg: number;
  bagsCount: number;
  reason?: string;
  createdAt: string;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "textarea" | "phone";
  required?: boolean;
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
  rules?: any[];
}

// Table types
export interface TableColumn {
  title: string;
  dataIndex: string;
  key: string;
  render?: (value: any, record: any) => React.ReactNode;
  sorter?: boolean;
  filters?: Array<{ text: string; value: any }>;
  width?: number | string;
}

// Menu types
export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
  path?: string;
  permission?: string;
}
