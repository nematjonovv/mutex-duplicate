import { apiService } from "./api";
import {
  Debt,
  CreateDebtRequest,
  UpdateDebtRequest,
  DebtPaymentRequest,
  PaginatedResponse,
  ApiResponse,
  PaginationParams,
} from "@/types";
import { createResourceService } from "./resourceService";

// Create a base service for Debt
const baseDebtService = createResourceService<Debt>("debts");

export const debtService = {
  // Inherit basic CRUD operations from baseDebtService
  ...baseDebtService,

  // Custom getAll for debts with specific query parameters
  getAll: async (params?: PaginationParams & {
    search?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
    paymentMethod?: string;
    hasCurrentDebt?: boolean;
    hasInvoice?: boolean;
  }): Promise<ApiResponse<PaginatedResponse<Debt>>> => {
    return baseDebtService.getAll(params);
  },

  // Custom functions
  // Record payment for debt
  recordPayment: async (
    id: string,
    paymentData: DebtPaymentRequest
  ): Promise<ApiResponse<{ debt: Debt }>> => {
    return apiService.post<ApiResponse<{ debt: Debt }>>(
      `/debts/${id}/payment`,
      paymentData
    );
  },

  // Record payment across client debts (oldest first)
  recordClientPayment: async (
    clientId: string,
    paymentData: DebtPaymentRequest & { accountId: string }
  ): Promise<ApiResponse<{ totalPaid: number; remainingAmount: number }>> => {
    return apiService.post<ApiResponse<{ totalPaid: number; remainingAmount: number }>>(
      `/debts/client/${clientId}/payment`,
      paymentData
    );
  },

  // Get debts by client
  getDebtsByClient: async (
    clientId: string,
    params?: PaginationParams
  ): Promise<ApiResponse<any>> => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    return apiService.get(`/debts/client/${clientId}?${query.toString()}`);
  },

  // Get debt summary
  getDebtSummary: async (params?: {
    startDate?: string;
    endDate?: string;
    paymentMethod?: string;
    hasCurrentDebt?: boolean;
    hasInvoice?: boolean;
  }): Promise<ApiResponse<{ summary: any }>> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.paymentMethod) queryParams.append("paymentMethod", params.paymentMethod);
    if (params?.hasCurrentDebt !== undefined) queryParams.append("hasCurrentDebt", params.hasCurrentDebt.toString());
    if (params?.hasInvoice !== undefined) queryParams.append("hasInvoice", params.hasInvoice.toString());

    return apiService.get<ApiResponse<{ summary: any }>>(
      `/debts/stats/summary${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
    );
  },

  // Get recent debts
  getRecentDebts: async (): Promise<ApiResponse<{ debts: Debt[] }>> => {
    return apiService.get<ApiResponse<{ debts: Debt[] }>>(
      "/debts/stats/recent"
    );
  },

  // Get total debt amount
  getTotalDebtAmount: async (): Promise<ApiResponse<{ total: number }>> => {
    return apiService.get<ApiResponse<{ total: number }>>(
      "/debts/stats/total-amount"
    );
  },

  updatePayment: async (
    transactionId: string,
    paymentId: string,
    data: { amount: number; note?: string }
  ): Promise<ApiResponse<{ debt: Debt }>> => {
    return apiService.put<ApiResponse<{ debt: Debt }>>(
      `/debts/${transactionId }/payment/${paymentId}`,
      data
    );
  },
};

export default debtService;
