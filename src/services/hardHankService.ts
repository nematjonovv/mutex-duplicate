import { apiService } from './api';
import { ApiResponse, HardHank, PaginatedResponse, PaginationParams } from '@/types';
import { createResourceService } from "./resourceService";

export interface CreateHardHankRequest {
  dyehouseProcessId: string;
  name: string;
  color: string;
  colorCode: string;
  weight: number;
  comment?: string;
  batchNumber?: string;
}

// Create a base service for HardHank
const baseHardHankService = createResourceService<HardHank>("hard-hanks");

export const hardHankService = {
  // Inherit basic CRUD operations from baseHardHankService
  ...baseHardHankService,

  // Custom getAll for hard hanks with specific query parameters (if any, otherwise just pass params)
  getAll: async (params?: PaginationParams & { /* Add specific params for hard hanks if needed */ }
  ): Promise<ApiResponse<PaginatedResponse<HardHank>>> => {
    return baseHardHankService.getAll(params);
  },

  // Custom functions
  createBulkHardHank: async (data: { items: CreateHardHankRequest[] }): Promise<ApiResponse<any>> => {
    return apiService.post<ApiResponse<any>>('/hard-hanks/bulk', data);
  },
};

export default hardHankService;
