import { apiService } from "./api";
import {
  CashFlow,
  CashAccount,
  CreateCashFlowRequest,
  UpdateCashFlowRequest,
  CreateCashAccountRequest,
  UpdateCashAccountRequest,
  PaginatedResponse,
  ApiResponse,
  PaginationParams,
} from "@/types";
import { createResourceService } from "./resourceService";

// Create base services
const baseCashFlowService = createResourceService<CashFlow>("cash-flow");
const baseCashAccountService = createResourceService<CashAccount>("cash-accounts");

export const cashFlowService = {
  // CashFlow operations
  // Inherit basic CRUD operations for CashFlow
  ...baseCashFlowService,
  
  // Custom getAll for cash flows with specific query parameters
  getAll: async (
    params?: PaginationParams & { accountId?: string; direction?: "IN" | "OUT"; startDate?: string; endDate?: string; }
  ): Promise<ApiResponse<PaginatedResponse<CashFlow>>> => {
    return baseCashFlowService.getAll(params);
  },

  // CashFlow Standard aliases for components
  getCashFlows: async (params?: any) => cashFlowService.getAll(params),
  getCashFlowById: async (id: string) => cashFlowService.getById(id),
  createCashFlow: async (data: any) => cashFlowService.create(data),
  updateCashFlow: async (id: string, data: any) => cashFlowService.update(id, data),
  deleteCashFlow: async (id: string) => cashFlowService.remove(id),

  // CashAccount operations (using baseCashAccountService methods directly)
  // For consistency, renaming getCashAccounts to getAccounts to match resourceService.getAll
  getAccounts: baseCashAccountService.getAll,
  getCashAccountById: baseCashAccountService.getById,
  createCashAccount: baseCashAccountService.create,
  updateCashAccount: baseCashAccountService.update,
  deleteCashAccount: baseCashAccountService.remove,

  // Custom CashFlow specific functions
  getCashFlowStats: async (): Promise<ApiResponse<{ stats: any }>> => {
    return apiService.get<ApiResponse<{ stats: any }>>(
      "/cash-flow/stats/summary"
    );
  },

  getCashFlowByAccount: async (
    accountId: string
  ): Promise<ApiResponse<{ cashFlows: CashFlow[] }>> => {
    return apiService.get<ApiResponse<{ cashFlows: CashFlow[] }>>(
      `/cash-flow/account/${accountId}`
    );
  },

  getRecentCashFlows: async (): Promise<
    ApiResponse<{ cashFlows: CashFlow[] }>
  > => {
    return apiService.get<ApiResponse<{ cashFlows: CashFlow[] }>>(
      "/cash-flow/stats/recent"
    );
  },

  getTotalBalance: async (): Promise<ApiResponse<{ total: number }>> => {
    return apiService.get<ApiResponse<{ total: number }>>(
      "/cash-flow/stats/total-balance"
    );
  },

  getMonthlyCashFlow: async (
    year: number,
    month: number
  ): Promise<ApiResponse<{ cashFlows: CashFlow[] }>> => {
    return apiService.get<ApiResponse<{ cashFlows: CashFlow[] }>>(
      `/cash-flow/monthly/${year}/${month}`
    );
  },

  searchCashFlows: async (
    search: string
  ): Promise<ApiResponse<{ cashFlows: CashFlow[] }>> => {
    return apiService.get<ApiResponse<{ cashFlows: CashFlow[] }>>(
      `/cash-flow/search?search=${encodeURIComponent(search)}`
    );
  },

  getCashFlowCount: async (): Promise<ApiResponse<{ count: number }>> => {
    return apiService.get<ApiResponse<{ count: number }>>(
      "/cash-flow/stats/count"
    );
  },
};