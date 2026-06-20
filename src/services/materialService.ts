import { apiService } from "./api";
import {
  RawMaterialIntake,
  CreateMaterialRequest,
  UpdateMaterialRequest,
  PaginatedResponse,
  ApiResponse,
  PaginationParams,
} from "@/types";
import { createResourceService } from "./resourceService";

// Create a base service for RawMaterialIntake
const baseMaterialService = createResourceService<RawMaterialIntake>("materials");

export const materialService = {
  // Inherit basic CRUD operations from baseMaterialService
  ...baseMaterialService,

  // Custom getAll for materials with specific query parameters
  getAll: async (
    params?: PaginationParams & { search?: string; startDate?: string; endDate?: string; }
  ): Promise<ApiResponse<PaginatedResponse<RawMaterialIntake>>> => {
    return baseMaterialService.getAll(params);
  },

  // Custom functions (that are NOT part of basic CRUD)
  // Get material statistics
  getMaterialStats: async (): Promise<ApiResponse<{ stats: any }>> => {
    return apiService.get<ApiResponse<{ stats: any }>>(
      "/materials/stats/summary"
    );
  },

  // Get recent materials
  getRecentMaterials: async (): Promise<
    ApiResponse<{ materials: RawMaterialIntake[] }>
  > => {
    return apiService.get<ApiResponse<{ materials: RawMaterialIntake[] }>>(
      "/materials/stats/recent"
    );
  },

  // Get total weight by supplier
  getTotalWeightBySupplier: async (): Promise<
    ApiResponse<{ suppliers: any[] }>
  > => {
    return apiService.get<ApiResponse<{ suppliers: any[] }>>(
      "/materials/stats/by-supplier"
    );
  },

  // Get materials by supplier
  getMaterialsBySupplier: async (
    supplier: string
  ): Promise<ApiResponse<{ materials: RawMaterialIntake[] }>> => {
    return apiService.get<ApiResponse<{ materials: RawMaterialIntake[] }>>(
      `/materials/supplier/${encodeURIComponent(supplier)}`
    );
  },

  // Search materials
  searchMaterials: async (
    search: string
  ): Promise<ApiResponse<{ materials: RawMaterialIntake[] }>> => {
    return apiService.get<ApiResponse<{ materials: RawMaterialIntake[] }>>(
      `/materials/search?search=${encodeURIComponent(search)}`
    );
  },

  // Get material count
  getMaterialsCount: async (): Promise<ApiResponse<{ count: number }>> => {
    return apiService.get<ApiResponse<{ count: number }>>(
      "/materials/stats/count"
    );
  },

  // Get total weight
  getTotalWeight: async (): Promise<ApiResponse<{ totalWeight: number }>> => {
    return apiService.get<ApiResponse<{ totalWeight: number }>>(
      "/materials/stats/total-weight"
    );
  },

  // Get thread suggestions (Ip turi yoki Ip raqami)
  getThreadSuggestions: async (
    type: "THREAD_TYPE" | "THREAD_NUMBER",
    search?: string
  ): Promise<ApiResponse<{ suggestions: string[] }>> => {
    const params = new URLSearchParams({ type });
    if (search) params.append("search", search);
    return apiService.get<ApiResponse<{ suggestions: string[] }>>(
      `/materials/suggestions/threads?${params.toString()}`
    );
  },

  // Add intake to existing material
  addIntake: async (
    id: string,
    intakeData: { weightKg: number; date?: string; comment?: string }
  ): Promise<ApiResponse<RawMaterialIntake>> => {
    return apiService.post<ApiResponse<RawMaterialIntake>>(
      `/materials/${id}/intake`,
      intakeData
    );
  },

  // Get available materials for batch creation
  getAvailableMaterials: async (
    threadType?: string
  ): Promise<ApiResponse<{
    threadTypes: string[];
    threadNumbers: Array<{
      threadType: string;
      threadNumber: string;
      availableWeight: number;
    }>;
    materials: Array<{
      threadType: string;
      threadNumber: string;
      totalWeightKg: number;
    }>;
  }>> => {
    const params = new URLSearchParams();
    if (threadType) params.append("threadType", threadType);
    return apiService.get(`/materials/available${params.toString() ? `?${params.toString()}` : ""}`);
  },
};

export default materialService;
