import { apiService } from './api';
import { ApiResponse } from '@/types';

export interface CreateTransferRequest {
  materialId: string;
  weightKg: number;
  bagsCount: number;
  dateTime: string;
}

export const transferService = {
  createTransfer: async (data: CreateTransferRequest): Promise<ApiResponse<any>> => {
    return apiService.post<ApiResponse<any>>('/transfers', data);
  },
  getTransfers: async (params: any): Promise<ApiResponse<any>> => {
    return apiService.get<ApiResponse<any>>('/transfers', { params });
  },
  deleteTransfer: async (id: string): Promise<ApiResponse<any>> => {
    return apiService.delete<ApiResponse<any>>(`/transfers/${id}`);
  },
  returnToMainBase: async (id: string): Promise<ApiResponse<any>> => {
    return apiService.post<ApiResponse<any>>(`/transfers/${id}/return`);
  },
};
