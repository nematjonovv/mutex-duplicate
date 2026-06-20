import { apiService } from "./api";
import {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
} from "@/types";
import { createResourceService } from "./resourceService";

export interface BatchPackage {
  id: string;
  lotNumber: string;
  conesCount: number;
  bruttoKg: number;
  taraKg: number;
  nettoKg: number;
  packageNumber?: number;
  createdAt?: string;
}

export interface Batch {
  _id: string;
  batchNumber: string;
  threadType: string;
  threadNumber: string;
  clientId?: string;
  clientName?: string;
  colorName: string;
  colorCode: string;
  weightKg: number;
  conesCount?: number;
  status: "CREATED" | "PROCESSING" | "WRAPPING" | "WRAPPED" | "COMPLETED" | "SHIPPED" | "RETURNED";
  materialId?: string;
  comment?: string;
  date?: string;
  packages?: BatchPackage[];
  createdBy: string | { _id: string; fullName: string };
  wrappingStartedAt?: string;
  sentToBaseAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBatchRequest {
  threadType: string;
  threadNumber: string;
  clientId?: string;
  clientName?: string;
  colorName: string;
  colorCode: string;
  weightKg: number;
  conesCount?: number;
  materialId?: string;
  comment?: string;
  date?: string;
}

interface ScanResult {
  found: boolean;
  stage: string;
  stageName: string;
  details: any;
  message?: string;
  history?: any;
}

// Create a base service for Batch
const baseBatchService = createResourceService<Batch>("batches");

export const batchService = {
  // Inherit basic CRUD operations from baseBatchService
  ...baseBatchService,

  // Custom getAll for batches with specific query parameters
  getAll: async (
    params?: PaginationParams & { search?: string; status?: string; startDate?: string; endDate?: string; }
  ): Promise<ApiResponse<PaginatedResponse<Batch>>> => {
    return baseBatchService.getAll(params);
  },

  // Custom functions
  // Scan batch by code
  scanBatch: async (batchCode: string): Promise<ApiResponse<ScanResult>> => {
    return apiService.get<ApiResponse<ScanResult>>(`/batches/scan/${batchCode}`);
  },

  // Get next batch number
  getNextBatchNumber: async (): Promise<ApiResponse<{ batchNumber: string }>> => {
    return apiService.get<ApiResponse<{ batchNumber: string }>>("/batches/next-number");
  },

  // Get batch suggestions (colors)
  getBatchSuggestions: async (
    type: "COLOR_NAME" | "COLOR_CODE",
    search?: string
  ): Promise<ApiResponse<{ suggestions: string[] }>> => {
    const params = new URLSearchParams({ type });
    if (search) params.append("search", search);
    return apiService.get<ApiResponse<{ suggestions: string[] }>>(
      `/batches/suggestions?${params.toString()}`
    );
  },

  // Get batch statistics
  getBatchStats: async (): Promise<
    ApiResponse<{
      totalBatches: number;
      createdBatches: number;
      processingBatches: number;
      completedBatches: number;
      shippedBatches: number;
    }>
  > => {
    return apiService.get<
      ApiResponse<{
        totalBatches: number;
        createdBatches: number;
        processingBatches: number;
        completedBatches: number;
        shippedBatches: number;
      }>
    >("/batches/stats");
  },

  // Send batch to finished products (base)
  sendToBase: async (id: string): Promise<ApiResponse<{ batch: Batch; finishedProductsCount: number }>> => {
    return apiService.post<ApiResponse<{ batch: Batch; finishedProductsCount: number }>>(`/batches/${id}/send-to-base`, {});
  },

  // Delete package from finished products
  deletePackageFromFinished: async (batchId: string, lotNumber: string): Promise<ApiResponse<void>> => {
    return apiService.delete<ApiResponse<void>>(`/batches/${batchId}/package/${encodeURIComponent(lotNumber)}`);
  },

  // Update package in finished products
  updatePackageInFinished: async (
    batchId: string,
    lotNumber: string,
    data: { bruttoKg: number; taraKg: number; nettoKg: number; conesCount: number }
  ): Promise<ApiResponse<void>> => {
    return apiService.put<ApiResponse<void>>(`/batches/${batchId}/package/${encodeURIComponent(lotNumber)}`, data);
  },
};