import { apiService } from "./api";
import { ApiResponse } from "@/types";

export const settingsService = {
  // Set Sales Password
  setSalesPassword: async (data: { password: string }): Promise<ApiResponse<any>> => {
    return apiService.post<ApiResponse<any>>("/settings/security/sales-password", data);
  },

  // Set Finance Password
  setFinancePassword: async (data: { password: string }): Promise<ApiResponse<any>> => {
    return apiService.post<ApiResponse<any>>("/settings/security/finance-password", data);
  },

  // Set Management Password
  setManagementPassword: async (data: { password: string }): Promise<ApiResponse<any>> => {
    return apiService.post<ApiResponse<any>>("/settings/security/management-password", data);
  },

  // Get Password Status
  getPasswordStatus: async (): Promise<ApiResponse<{
    salesPasswordSet: boolean;
    financePasswordSet: boolean;
    managementPasswordSet: boolean;
  }>> => {
    return apiService.get<ApiResponse<{
      salesPasswordSet: boolean;
      financePasswordSet: boolean;
      managementPasswordSet: boolean;
    }>>("/settings/security/password-status");
  },

  // Verify Section Password
  verifySectionPassword: async (data: { section: "sales" | "finance" | "management"; password: string }): Promise<ApiResponse<any>> => {
    return apiService.post<ApiResponse<any>>("/auth/verify-section-password", data);
  },
};
