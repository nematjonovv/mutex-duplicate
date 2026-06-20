import { apiService } from "./api";
import {
  Payroll,
  CreatePayrollRequest,
  UpdatePayrollRequest,
  PaginatedResponse,
  ApiResponse,
} from "@/types";

export const payrollService = {
  // Get all payroll records with pagination and filters
  getPayrolls: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    workerId?: string;
    accountId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<PaginatedResponse<Payroll>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.workerId) queryParams.append("workerId", params.workerId);
    if (params?.accountId) queryParams.append("accountId", params.accountId);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    const url = `/payroll${queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
    const response = await apiService.get<ApiResponse<any>>(url);

    // Map payrolls to materials to satisfy the type system and usePaginatedQuery hook
    if (response.success && response.data && response.data.payrolls) {
      response.data.materials = response.data.payrolls;
    }

    return response as ApiResponse<PaginatedResponse<Payroll>>;
  },

  // Get payroll by ID
  getPayrollById: async (
    id: string
  ): Promise<ApiResponse<{ payroll: Payroll }>> => {
    return apiService.get<ApiResponse<{ payroll: Payroll }>>(`/payroll/${id}`);
  },

  // Create new payroll
  createPayroll: async (
    payrollData: CreatePayrollRequest
  ): Promise<ApiResponse<{ payroll: Payroll }>> => {
    return apiService.post<ApiResponse<{ payroll: Payroll }>>(
      "/payroll",
      payrollData
    );
  },

  // Update payroll
  updatePayroll: async (
    id: string,
    payrollData: UpdatePayrollRequest
  ): Promise<ApiResponse<{ payroll: Payroll }>> => {
    return apiService.put<ApiResponse<{ payroll: Payroll }>>(
      `/payroll/${id}`,
      payrollData
    );
  },

  // Delete payroll
  deletePayroll: async (id: string): Promise<ApiResponse> => {
    return apiService.delete<ApiResponse>(`/payroll/${id}`);
  },

  // Get payroll by worker
  getPayrollByWorker: async (
    workerId: string
  ): Promise<ApiResponse<{ payrolls: Payroll[] }>> => {
    return apiService.get<ApiResponse<{ payrolls: Payroll[] }>>(
      `/payroll/worker/${workerId}`
    );
  },

  // Get payroll statistics
  getPayrollStats: async (): Promise<ApiResponse<{ stats: any }>> => {
    return apiService.get<ApiResponse<{ stats: any }>>("/payroll/stats/summary");
  },

  // Get recent payrolls
  getRecentPayrolls: async (): Promise<
    ApiResponse<{ payrolls: Payroll[] }>
  > => {
    return apiService.get<ApiResponse<{ payrolls: Payroll[] }>>(
      "/payroll/stats/recent"
    );
  },

  // Get monthly payroll
  getMonthlyPayroll: async (
    year: number,
    month: number
  ): Promise<ApiResponse<{ payrolls: Payroll[] }>> => {
    return apiService.get<ApiResponse<{ payrolls: Payroll[] }>>(
      `/payroll/monthly/${year}/${month}`
    );
  },

  // Get total payroll amount
  getTotalPayrollAmount: async (): Promise<ApiResponse<{ total: number }>> => {
    return apiService.get<ApiResponse<{ total: number }>>(
      "/payroll/stats/total-amount"
    );
  },

  // Get payroll by worker and date range
  getPayrollByWorkerAndDateRange: async (
    workerId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<{ payrolls: Payroll[] }>> => {
    return apiService.get<ApiResponse<{ payrolls: Payroll[] }>>(
      `/payroll/worker/${workerId}/date-range?startDate=${startDate}&endDate=${endDate}`
    );
  },

  // Search payrolls
  searchPayrolls: async (
    search: string
  ): Promise<ApiResponse<{ payrolls: Payroll[] }>> => {
    return apiService.get<ApiResponse<{ payrolls: Payroll[] }>>(
      `/payroll/search?search=${encodeURIComponent(search)}`
    );
  },

  // Get payroll count
  getPayrollCount: async (): Promise<ApiResponse<{ count: number }>> => {
    return apiService.get<ApiResponse<{ count: number }>>(
      "/payroll/stats/count"
    );
  },

  // Get worker salary summary
  getWorkerSalarySummary: async (
    workerId: string
  ): Promise<ApiResponse<{ summary: any }>> => {
    return apiService.get<ApiResponse<{ summary: any }>>(
      `/payroll/worker/${workerId}/salary-summary`
    );
  },
};

export default payrollService;
