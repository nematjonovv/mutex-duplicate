import { apiService } from "./api";
import { ApiResponse, PaginatedResponse } from "@/types";

interface InventoryItem {
  _id: string;
  name: string;
  type: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  lastUpdated: string;
  status: "LOW" | "NORMAL" | "HIGH";
}

interface StockMovement {
  _id: string;
  itemId: string;
  itemName: string;
  type: "IN" | "OUT";
  quantity: number;
  reason: string;
  date: string;
  reference: string;
}

interface InventorySummary {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
}

export const inventoryService = {
  // Get all inventory items
  getInventory: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    status?: string;
  }): Promise<ApiResponse<PaginatedResponse<InventoryItem>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.type) queryParams.append("type", params.type);
    if (params?.status) queryParams.append("status", params.status);

    const url = `/inventory${queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
    const response = await apiService.get<ApiResponse<any>>(url);

    // Map inventory to materials to satisfy the type system and usePaginatedQuery hook
    if (response.success && response.data && response.data.inventory) {
      response.data.materials = response.data.inventory;
    }

    return response as ApiResponse<PaginatedResponse<InventoryItem>>;
  },

  // Get inventory summary
  getInventorySummary: async (): Promise<
    ApiResponse<{ summary: InventorySummary }>
  > => {
    return apiService.get<ApiResponse<{ summary: InventorySummary }>>(
      "/inventory/summary"
    );
  },

  // Get stock movements
  getStockMovements: async (params?: {
    page?: number;
    limit?: number;
    itemId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<PaginatedResponse<StockMovement>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.itemId) queryParams.append("itemId", params.itemId);
    if (params?.type) queryParams.append("type", params.type);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    const url = `/inventory/movements${queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
    const response = await apiService.get<ApiResponse<any>>(url);

    // Map movements to materials to satisfy the type system and usePaginatedQuery hook
    if (response.success && response.data && response.data.movements) {
      response.data.materials = response.data.movements;
    }

    return response as ApiResponse<PaginatedResponse<StockMovement>>;
  },

  // Get inventory charts data
  getInventoryCharts: async (): Promise<ApiResponse<{ charts: any }>> => {
    return apiService.get<ApiResponse<{ charts: any }>>("/inventory/charts");
  },

  // Add stock movement
  addStockMovement: async (data: {
    itemId: string;
    type: "IN" | "OUT";
    quantity: number;
    reason: string;
    reference?: string;
  }): Promise<ApiResponse> => {
    return apiService.post<ApiResponse>("/inventory/movements", data);
  },

  // Update inventory item
  updateInventoryItem: async (
    id: string,
    data: {
      minStock?: number;
      maxStock?: number;
    }
  ): Promise<ApiResponse<{ item: InventoryItem }>> => {
    return apiService.put<ApiResponse<{ item: InventoryItem }>>(
      `/inventory/${id}`,
      data
    );
  },
};
