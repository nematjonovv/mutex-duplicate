// src/services/resourceService.ts
import { apiService } from "./api";
import { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

interface GetQueryParams extends PaginationParams {
  [key: string]: any;
}

const buildQueryParams = (params?: GetQueryParams): string => {
  if (!params) return "";
  const queryParams = new URLSearchParams();
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
      if (Array.isArray(params[key])) {
        params[key].forEach((item: any) => queryParams.append(key, item.toString()));
      } else {
        queryParams.append(key, params[key].toString());
      }
    }
  }
  return queryParams.toString();
};

export const createResourceService = <T>(resourceName: string) => {
  return {
    getAll: async (
      params?: GetQueryParams
    ): Promise<ApiResponse<PaginatedResponse<T>>> => {
      const queryString = buildQueryParams(params);
      const url = `/${resourceName}${queryString ? `?${queryString}` : ""}`;
      return apiService.get<ApiResponse<PaginatedResponse<T>>>(url);
    },

    getById: async (id: string): Promise<ApiResponse<T>> => {
      const url = `/${resourceName}/${id}`;
      return apiService.get<ApiResponse<T>>(url);
    },

    create: async (data: Partial<T>): Promise<ApiResponse<T>> => {
      const url = `/${resourceName}`;
      return apiService.post<ApiResponse<T>>(url, data);
    },

    update: async (id: string, data: Partial<T>): Promise<ApiResponse<T>> => {
      const url = `/${resourceName}/${id}`;
      return apiService.put<ApiResponse<T>>(url, data);
    },

    remove: async (id: string): Promise<ApiResponse<void>> => {
      const url = `/${resourceName}/${id}`;
      return apiService.delete<ApiResponse<void>>(url);
    },
  };
};