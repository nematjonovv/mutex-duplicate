import { apiService } from "./api";

export type Creditor = {
  _id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  balance: number;
  currentDebt?: number;
  advanceBalance?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreditorTransaction = {
  _id: string;
  creditorId: string;
  type: "DEBT" | "PAYMENT" | "ADVANCE";
  amount: number;
  balanceAfter: number;
  accountId?: any;
  currency?: "USD" | "UZS";
  rate?: number;
  originalAmount?: number;
  note?: string;
  isEdited?: boolean;
  createdAt: string;
};

export const ourDebtService = {
  // Ro'yxat: GET /our-debts?search=...&limit=...
  // Backend: { data: { data: Creditor[], pagination } }
  getAll: async (params?: { search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    return apiService.get<{
      success: boolean;
      message: string;
      data: { data: Creditor[]; pagination: any };
    }>(`/our-debts${query.toString() ? `?${query.toString()}` : ""}`);
  },

  // Bitta kreditor + tranzaksiyalar: GET /our-debts/:id
  // Backend: { data: { creditor, transactions } }
  getById: async (id: string) => {
    return apiService.get<{
      success: boolean;
      data: { creditor: Creditor; transactions: CreditorTransaction[] };
    }>(`/our-debts/${id}`);
  },
  remove: async (id: string) => {
    return apiService.get<{
      success: boolean;
      data: { creditor: Creditor; transactions: CreditorTransaction[] };
    }>(`/our-debts/${id}`);
  },

  // Yangi kreditor yaratish: POST /our-debts  (route'da "/" ga ulangan)
  createCreditor: async (data: {
    name: string;
    phone?: string;
    address?: string;
    notes?: string;
    amount?: number;
    note?: string;
  }) => {
    const res = await apiService.post<{
      success: boolean;
      data: { creditor: Creditor };
    }>(`/our-debts`, data);   // /creditor EMAS, faqat /our-debts
    return res;
  },

  // Mavjud kreditorga qarz qo'shish ("Oldi"): POST /our-debts
  create: async (data: {
    creditorId: string;
    amount: number;
    note?: string;
    reasonType?: string;
    occurredAt?: string;
  }) => {
    const res = await apiService.post<{
      success: boolean;
      data: { balance: number };
    }>(`/our-debts`, data);
    return res.data;
  },

  // Addition endpoint: POST /our-debts/:id/addition
  recordAddition: async (
    id: string,
    data: { amount: number; note?: string; reasonType?: string }
  ) => {
    const res = await apiService.post<{
      success: boolean;
      data: { balance: number };
    }>(`/our-debts/${id}/addition`, data);
    return res;
  },

  // Qarzni to'lash ("Berdi"): POST /our-debts/:id/payment
  recordPayment: async (
    id: string,
    paymentData: {
      amount: number;
      accountId: string;
      paymentMethod?: string;
      currency?: "USD" | "UZS";
      rate?: number;
      amountUSD?: number;
      note?: string;
      date?: string;
    }
  ) => {

    
    const res = await apiService.post<{
      success: boolean;
      data: { balance: number };
    }>(`/our-debts/${id}/payment`, paymentData);
    return res;
  },

  // To'lov yozuvini tahrirlash: PUT /our-debts/:debtId/payment/:paymentId
  updatePayment: async (
    debtId: string,
    paymentId: string,
    data: { amount: number; note?: string; rate?: number }
  ) => {
    const res = await apiService.put<{
      success: boolean;
      data: { balance: number };
    }>(`/our-debts/${debtId}/payment/${paymentId}`, data);
    return res;
  },

  // Statistika: GET /our-debts/stats/summary
  // Backend: { data: { summary } }
  getOurDebtSummary: async () => {
    return apiService.get<{
      success: boolean;
      data: { summary: any };
    }>(`/our-debts/stats/summary`);
  },
};

export default ourDebtService;