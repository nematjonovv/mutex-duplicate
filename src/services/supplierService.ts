import { apiService } from "./api";
import {
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  PaginatedResponse,
  ApiResponse,
  PaginationParams,
} from "@/types";
import { createResourceService } from "./resourceService";

// Create a base service for Supplier
const baseSupplierService = createResourceService<Supplier>("suppliers");

export const supplierService = {
  // Inherit basic CRUD operations from baseSupplierService
  ...baseSupplierService,

  // Custom getAll for suppliers with specific query parameters
  getAll: async (params?: PaginationParams & { search?: string; }
  ): Promise<ApiResponse<PaginatedResponse<Supplier>>> => {
    return baseSupplierService.getAll(params);
  },

  // Custom functions
  getSuppliers: async (params?: any) => supplierService.getAll(params),
  getSupplierById: async (id: string) => supplierService.getById(id),
  createSupplier: async (data: any) => supplierService.create(data),
  updateSupplier: async (id: string, data: any) => supplierService.update(id, data),
  deleteSupplier: async (id: string) => supplierService.remove(id),

  // Get supplier statistics
  getSupplierStats: async (
    id: string
  ): Promise<ApiResponse<{
    supplier: Supplier;
    stats: {
      totalWeight: number;
      totalDeliveries: number;
      materialStats: Array<{
        materialName: string;
        totalWeight: number;
        deliveryCount: number;
        deliveries: Array<{
          date: string;
          weight: number;
          comment?: string;
        }>;
      }>;
    };
  }>> => {
    return apiService.get<ApiResponse<any>>(`/suppliers/${id}/stats`);
  },
};

export default supplierService;
