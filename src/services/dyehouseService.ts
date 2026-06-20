import { apiService } from "./api";
import {
  Dyehouse,
  CreateDyehouseRequest,
  UpdateDyehouseRequest,
  PaginatedResponse,
  ApiResponse,
  PaginationParams,
} from "@/types";
import { createResourceService } from "./resourceService";

// Create a base service for Dyehouse
const baseDyehouseService = createResourceService<Dyehouse>("dyehouses");

export const dyehouseService = {
  // Inherit basic CRUD operations from baseDyehouseService
  ...baseDyehouseService,

  // Custom getAll for dyehouses with specific query parameters
  getAll: async (
    params?: PaginationParams & { search?: string; }
  ): Promise<ApiResponse<PaginatedResponse<Dyehouse>>> => {
    return baseDyehouseService.getAll(params);
  },

  // Custom functions
  getDyehouses: async (params?: any) => dyehouseService.getAll(params),
  getDyehouseById: async (id: string) => dyehouseService.getById(id),
  createDyehouse: async (data: any) => dyehouseService.create(data),
  updateDyehouse: async (id: string, data: any) => dyehouseService.update(id, data),
  deleteDyehouse: async (id: string) => dyehouseService.remove(id),

  // Get dyehouse statistics
  getDyehouseStats: async (
    id: string
  ): Promise<ApiResponse<{ stats: any }>> => {
    return apiService.get<ApiResponse<{ stats: any }>>(
      `/dyehouses/${id}/stats`
    );
  },

  // Get all dyehouses for dropdown
  getAllDyehouses: async (): Promise<
    ApiResponse<{ dyehouses: Dyehouse[] }>
  > => {
    // This calls a specific endpoint "/dyehouses/all" which doesn't return PaginatedResponse
    // So it should remain a custom function.
    return apiService.get<ApiResponse<{ dyehouses: Dyehouse[] }>>(
      "/dyehouses/all"
    );
  },

  // Search dyehouses
  searchDyehouses: async (
    search: string
  ): Promise<ApiResponse<{ dyehouses: Dyehouse[] }>> => {
    // This also calls a specific endpoint, so keep it custom
    return apiService.get<ApiResponse<{ dyehouses: Dyehouse[] }>>(
      `/dyehouses/search?search=${encodeURIComponent(search)}`
    );
  },

  // Get dyehouse count
  getDyehousesCount: async (): Promise<ApiResponse<{ count: number }>> => {
    return apiService.get<ApiResponse<{ count: number }>>(
      "/dyehouses/stats/count"
    );
  },
};

export default dyehouseService;
