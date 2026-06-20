import { apiService } from './api';
import { ApiResponse, DyehouseProcess, PaginatedResponse, PaginationParams } from '@/types';
import { createResourceService } from "./resourceService";

// Create a base service for DyehouseProcess
const baseDyehouseProcessService = createResourceService<DyehouseProcess>("dyehouse-processes");

export const dyehouseProcessService = {
  // Inherit basic CRUD operations from baseDyehouseProcessService
  ...baseDyehouseProcessService,

  // Custom getAll for dyehouse processes with specific query parameters (if any, otherwise just pass params)
  getAll: async (params?: PaginationParams & { /* Add specific params for dyehouse processes if needed */ }
  ): Promise<ApiResponse<PaginatedResponse<DyehouseProcess>>> => {
    return baseDyehouseProcessService.getAll(params);
  },
};

export default dyehouseProcessService;
