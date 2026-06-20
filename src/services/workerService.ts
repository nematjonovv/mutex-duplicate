import { apiService } from './api';
import { ApiResponse, Worker, CreateWorkerRequest, UpdateWorkerRequest } from '@/types';

export const workerService = {
  getWorkers: async (params: any): Promise<ApiResponse<Worker[]>> => {
    return apiService.get<ApiResponse<Worker[]>>('/workers', { params });
  },

  createWorker: async (data: CreateWorkerRequest): Promise<ApiResponse<Worker>> => {
    return apiService.post<ApiResponse<Worker>>('/workers', data);
  },

  updateWorker: async (id: string, data: UpdateWorkerRequest): Promise<ApiResponse<Worker>> => {
    return apiService.put<ApiResponse<Worker>>(`/workers/${id}`, data);
  },

  deleteWorker: async (id: string): Promise<ApiResponse<null>> => {
    return apiService.delete<ApiResponse<null>>(`/workers/${id}`);
  },
};

export default workerService;
