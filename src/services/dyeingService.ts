import { apiService } from "./api";
import {
  DyeingLot,
  SendToDyehouse,
  CreateDyeingLotRequest,
  CreateSendToDyehouseRequest,
  PaginatedResponse,
  ApiResponse,
  PaginationParams,
} from "@/types";
import { createResourceService } from "./resourceService";

// Create base services
const baseDyeingLotService = createResourceService<DyeingLot>("dyeing/lots");
const baseSendToDyehouseService = createResourceService<SendToDyehouse>("dyeing/send");

export const dyeingService = {
  // DyeingLot operations
  ...baseDyeingLotService, // Inherit basic CRUD for DyeingLot

  getAllDyeingLots: async (params?: PaginationParams & { search?: string; startDate?: string; endDate?: string; }
  ): Promise<ApiResponse<PaginatedResponse<DyeingLot>>> => {
    return baseDyeingLotService.getAll(params);
  },
  
  // Specific naming for clarity if needed, otherwise use baseDyeingLotService.getById etc.
  getDyeingLotById: baseDyeingLotService.getById,
  createDyeingLot: baseDyeingLotService.create,
  updateDyeingLot: baseDyeingLotService.update,
  deleteDyeingLot: baseDyeingLotService.remove,


  // SendToDyehouse operations
  // Note: For consistency, I will rename the "getSendToDyehouse" to "getAllSendToDyehouse"
  // to avoid confusion with the base service's getAll.
  getAllSendToDyehouse: async (params?: PaginationParams & { search?: string; dyehouseId?: string; startDate?: string; endDate?: string; }
  ): Promise<ApiResponse<PaginatedResponse<SendToDyehouse>>> => {
    return baseSendToDyehouseService.getAll(params);
  },
  getSendToDyehouseById: baseSendToDyehouseService.getById,
  createSendToDyehouse: baseSendToDyehouseService.create,
  updateSendToDyehouse: baseSendToDyehouseService.update,
  deleteSendToDyehouse: baseSendToDyehouseService.remove,


  // Custom functions
  getDyeingStats: async (): Promise<ApiResponse<{ stats: any }>> => {
    return apiService.get<ApiResponse<{ stats: any }>>("/dyeing/stats/summary");
  },

  getRecentDyeingLots: async (): Promise<
    ApiResponse<{ dyeingLots: DyeingLot[] }>
  > => {
    return apiService.get<ApiResponse<{ dyeingLots: DyeingLot[] }>>(
      "/dyeing/lots/stats/recent"
    );
  },

  getRecentSendToDyehouse: async (): Promise<
    ApiResponse<{ sendToDyehouse: SendToDyehouse[] }>
  > => {
    return apiService.get<ApiResponse<{ sendToDyehouse: SendToDyehouse[] }>>(
      "/dyeing/send/stats/recent"
    );
  },

  getDyeingLotsByBatchCode: async (
    batchCode: string
  ): Promise<ApiResponse<{ dyeingLots: DyeingLot[] }>> => {
    return apiService.get<ApiResponse<{ dyeingLots: DyeingLot[] }>>(
      `/dyeing/lots/batch/${batchCode}`
    );
  },

  getSendToDyehouseByBatchCode: async (
    batchCode: string
  ): Promise<ApiResponse<{ sendToDyehouse: SendToDyehouse[] }>> => {
    return apiService.get<ApiResponse<{ sendToDyehouse: SendToDyehouse[] }>>(
      `/dyeing/send/batch/${batchCode}`
    );
  },

  searchDyeingLots: async (
    search: string
  ): Promise<ApiResponse<{ dyeingLots: DyeingLot[] }>> => {
    return apiService.get<ApiResponse<{ dyeingLots: DyeingLot[] }>>(
      `/dyeing/lots/search?search=${encodeURIComponent(search)}`
    );
  },

  searchSendToDyehouse: async (
    search: string
  ): Promise<ApiResponse<{ sendToDyehouse: SendToDyehouse[] }>> => {
    return apiService.get<ApiResponse<{ sendToDyehouse: SendToDyehouse[] }>>(
      `/dyeing/send/search?search=${encodeURIComponent(search)}`
    );
  },

  getDyeingLotsCount: async (): Promise<ApiResponse<{ count: number }>> => {
    return apiService.get<ApiResponse<{ count: number }>>(
      "/dyeing/lots/stats/count"
    );
  },

  getSendToDyehouseCount: async (): Promise<ApiResponse<{ count: number }>> => {
    return apiService.get<ApiResponse<{ count: number }>>(
      "/dyeing/send/stats/count"
    );
  },
};

export default dyeingService;
