import { apiService } from "./api";
import {
  CashAccount,
  CreateCashAccountRequest,
  UpdateCashAccountRequest,
  PaginatedResponse,
  ApiResponse,
  PaginationParams,
} from "@/types";
import { createResourceService } from "./resourceService";

// Create a base service for CashAccount
const baseAccountService = createResourceService<CashAccount>("accounts");

export const accountService = {
  // Inherit basic CRUD operations from baseAccountService
  ...baseAccountService,

  // Custom getAll for accounts with specific query parameters
  getAll: async (
    params?: PaginationParams & { search?: string; type?: string; }
  ): Promise<ApiResponse<PaginatedResponse<CashAccount>>> => {
    return baseAccountService.getAll(params);
  },

  // Standard aliases for components
  getAccounts: async (params?: any) => accountService.getAll(params),
  getAccountById: async (id: string) => accountService.getById(id),
  createAccount: async (data: any) => accountService.create(data),
  updateAccount: async (id: string, data: any) => accountService.update(id, data),
  deleteAccount: async (id: string) => accountService.remove(id),

  // Custom functions
  // Get account balance
  getAccountBalance: async (
    id: string
  ): Promise<ApiResponse<{ balance: number }>> => {
    return apiService.get<ApiResponse<{ balance: number }>>(
      `/accounts/${id}/balance`
    );
  },

  // Get all accounts for dropdown
  getAllAccounts: async (): Promise<ApiResponse<CashAccount[]>> => {
    const response = await apiService.get<any>("/accounts", {
      params: { limit: 1000 },
    });
    
    // The backend returns data: { data: accounts, pagination: ... }
    if (response.success && response.data && response.data.data) {
        return {
            success: true,
            data: response.data.data, // Return flat array as data
            message: response.message
        };
    }
    return response;
  },
};