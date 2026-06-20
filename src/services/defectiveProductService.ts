import { apiService } from './api';
import { ApiResponse, DefectiveProduct, PaginatedResponse, PaginationParams } from '@/types';
import { createResourceService } from "./resourceService";

// Create a base service for DefectiveProduct
const baseDefectiveProductService = createResourceService<DefectiveProduct>("defective-products");

export const defectiveProductService = {
  // Inherit basic CRUD operations from baseDefectiveProductService
  ...baseDefectiveProductService,

  // Custom getAll for defective products with specific query parameters
  getAll: async (params?: PaginationParams & { search?: string; startDate?: string; endDate?: string; }
  ): Promise<ApiResponse<PaginatedResponse<DefectiveProduct>>> => {
    return baseDefectiveProductService.getAll(params);
  },
};

export default defectiveProductService;
