import { apiService } from './api';
import { ApiResponse } from '@/types';

export interface CreateFinishedProductRequest {
  wrappingId: string;
  productName: string;
  color: string;
  colorCode: string;
  weightKg: number;
  brutto?: number;
  tara?: number;
  weightDifference?: number;
  bagsCount: number;
  comment?: string;
  dyehouseName?: string;
  type?: "to'q" | "och";
}

export const finishedProductService = {
  createFinishedProduct: async (data: CreateFinishedProductRequest): Promise<ApiResponse<any>> => {
    return apiService.post<ApiResponse<any>>('/finished-products', data);
  },
  createBulkFinishedProduct: async (data: { items: CreateFinishedProductRequest[] }): Promise<ApiResponse<any>> => {
    return apiService.post<ApiResponse<any>>('/finished-products/bulk', data);
  },
  getProducts: async (params: any): Promise<ApiResponse<any>> => {
    return apiService.get<ApiResponse<any>>('/finished-products', { params });
  },
  getAggregatedProducts: async (params: any): Promise<ApiResponse<any>> => {
    return apiService.get<ApiResponse<any>>('/finished-products/aggregated', { params });
  },
  deleteProductGroup: async (data: { productName: string; color: string; colorCode: string }): Promise<ApiResponse<any>> => {
    return apiService.post<ApiResponse<any>>('/finished-products/delete-group', data);
  },
  sendToBase: async (ids: string[]): Promise<ApiResponse<any>> => {
    return apiService.post<ApiResponse<any>>('/finished-products/send-to-base', { ids });
  },
  autoSelectProducts: async (data: { productName: string; color: string; colorCode: string; targetAmount: number; targetType: 'weight' | 'bags' }): Promise<ApiResponse<any>> => {
    return apiService.post<ApiResponse<any>>('/finished-products/auto-select', data);
  },
};
