import { apiService } from "./api";
import { ApiResponse, SoftHank, PaginatedResponse, PaginationParams } from "@/types";
import { createResourceService } from "./resourceService";

export interface CreateSoftHankRequest {
  dyehouseName: string;
  rawMaterialName: string;
  weight: number;
  comment?: string;
  date: string;
  batchNumber?: string;
}

export interface CreateBulkSoftHankRequest {
  dyehouseName: string;
  date: string;
  batchNumber?: string;
  comment?: string;
  items: {
    materialId?: string;
    smallBaseTransferId?: string;
    rawMaterialName: string;
    weight: number;
  }[];
}

// Create a base service for SoftHank
const baseSoftHankService = createResourceService<SoftHank>("soft-hanks");

export const softHankService = {
  // Inherit basic CRUD operations from baseSoftHankService
  ...baseSoftHankService,

  // Custom getAll for soft hanks with specific query parameters (if any, otherwise just pass params)
  getAll: async (params?: PaginationParams & { /* Add specific params for soft hanks if needed */ }
  ): Promise<ApiResponse<PaginatedResponse<SoftHank>>> => {
    return baseSoftHankService.getAll(params);
  },

  // Custom functions
  createBulkSoftHank: async (
    data: CreateBulkSoftHankRequest
  ): Promise<ApiResponse<any>> => {
    return apiService.post<ApiResponse<any>>("/soft-hanks/bulk", data);
  },
};

export default softHankService;
