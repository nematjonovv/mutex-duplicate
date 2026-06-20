import { apiService } from './api';
import { ApiResponse, Wrapping, PaginatedResponse, PaginationParams } from '@/types';
import { createResourceService } from "./resourceService";

export interface CreateWrappingRequest {
  hardHankId: string;
  name: string;
  color: string;
  colorCode: string;
  weightKg: number;
  comment?: string;
}

// Create a base service for Wrapping
const baseWrappingService = createResourceService<Wrapping>("wrappings");

export const wrappingService = {
  // Inherit basic CRUD operations from baseWrappingService
  ...baseWrappingService,

  // Custom getAll for wrappings with specific query parameters (if any, otherwise just pass params)
  getAll: async (params?: PaginationParams & { /* Add specific params for wrappings if needed */ }
  ): Promise<ApiResponse<PaginatedResponse<Wrapping>>> => {
    return baseWrappingService.getAll(params);
  },

  // Custom functions
  createBulkWrapping: async (data: { items: CreateWrappingRequest[] }): Promise<ApiResponse<any>> => {
    return apiService.post<ApiResponse<any>>('/wrappings/bulk', data);
  },
};

export default wrappingService;
