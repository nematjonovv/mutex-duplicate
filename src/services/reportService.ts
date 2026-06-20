import { apiService } from "./api";
import { ReportFilters, FinancialReport, ApiResponse } from "@/types";

export const reportService = {
  // Get dashboard data
  getDashboardData: async (): Promise<ApiResponse<any>> => {
    return apiService.get<ApiResponse<any>>("/reports/dashboard");
  },

  // Get financial report
  getFinancialReport: async (
    filters: { startDate?: string; endDate?: string }
  ): Promise<ApiResponse<FinancialReport>> => {
    const queryParams = new URLSearchParams();
    if (filters.startDate) queryParams.append("startDate", filters.startDate);
    if (filters.endDate) queryParams.append("endDate", filters.endDate);

    const url = `/reports/financial${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    return apiService.get<ApiResponse<FinancialReport>>(url);
  },

  // Get sales report
  getSalesReport: async (
    filters: { startDate?: string; endDate?: string }
  ): Promise<ApiResponse<any>> => {
    const queryParams = new URLSearchParams();
    if (filters.startDate) queryParams.append("startDate", filters.startDate);
    if (filters.endDate) queryParams.append("endDate", filters.endDate);

    const url = `/reports/sales${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    return apiService.get<ApiResponse<any>>(url);
  },

  // Get inventory report
  getInventoryReport: async (): Promise<ApiResponse<any>> => {
    return apiService.get<ApiResponse<any>>(
      "/reports/inventory"
    );
  },

  // Get debtors report
  getDebtorsReport: async (): Promise<ApiResponse<{ debtors: any[] }>> => {
    return apiService.get<ApiResponse<{ debtors: any[] }>>("/reports/debtors");
  },

  // Get creditors report
  getCreditorsReport: async (): Promise<ApiResponse<{ creditors: any[] }>> => {
    return apiService.get<ApiResponse<{ creditors: any[] }>>(
      "/reports/creditors"
    );
  },

  // Get production report
  getProductionReport: async (
    filters: ReportFilters
  ): Promise<ApiResponse<{ production: any[] }>> => {
    const queryParams = new URLSearchParams();
    if (filters.startDate) queryParams.append("startDate", filters.startDate);
    if (filters.endDate) queryParams.append("endDate", filters.endDate);
    if (filters.dyehouseId)
      queryParams.append("dyehouseId", filters.dyehouseId);

    const url = `/reports/production${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    return apiService.get<ApiResponse<{ production: any[] }>>(url);
  },

  // Get cash flow report
  getCashFlowReport: async (
    filters: ReportFilters
  ): Promise<ApiResponse<{ cashFlow: any[] }>> => {
    const queryParams = new URLSearchParams();
    if (filters.startDate) queryParams.append("startDate", filters.startDate);
    if (filters.endDate) queryParams.append("endDate", filters.endDate);
    if (filters.category) queryParams.append("category", filters.category);

    const url = `/reports/cash-flow${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    return apiService.get<ApiResponse<{ cashFlow: any[] }>>(url);
  },
};
