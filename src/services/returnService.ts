import { apiService } from './api';
import { ApiResponse, Return, CreateReturnRequest, CreateManualReturnRequest, Invoice, PaginatedResponse, PaginationParams } from '@/types';
import { createResourceService } from "./resourceService";

// Bag details returned from search
export interface BagSearchResult {
  batchCode: string;
  productName: string;
  colorName: string;
  colorCode: string;
  weightKg: number;
  bagsCount: number;
  price: number;
  total: number;
  invoice: {
    _id: string;
    invoiceNo: string;
    createdAt: string;
    clientId: string;
    clientMeta: {
      name: string;
      phone: string;
    };
    balance: number;
    paid: number;
    netTotal: number;
  };
}

// Create a base service for Return
const baseReturnService = createResourceService<Return>("returns");

export const returnService = {
  // Inherit basic CRUD operations from baseReturnService
  ...baseReturnService,

  // Custom getAll for returns with specific query parameters
  getAll: async (params?: PaginationParams & { search?: string; startDate?: string; endDate?: string; }
  ): Promise<ApiResponse<PaginatedResponse<Return>>> => {
    return baseReturnService.getAll(params);
  },

  // Standard aliases for components
  getReturns: async (params?: any) => returnService.getAll(params),
  getReturnById: async (id: string) => returnService.getById(id),
  createReturn: async (data: CreateReturnRequest) => returnService.create(data),
  createManualReturn: async (data: CreateManualReturnRequest): Promise<ApiResponse<Return>> => {
    return apiService.post<ApiResponse<Return>>("/returns/manual", data);
  },
  deleteReturn: async (id: string) => returnService.remove(id),

  // Custom functions
  // Get invoice by invoice number (for return form) - direct API call
  getInvoiceByNumber: async (invoiceNo: string): Promise<ApiResponse<{ invoice: Invoice | null }>> => {
    try {
      // Use baseInvoiceService.getAll if available, otherwise make direct call
      // For now, keeping the direct call as it has specific search logic
      const response = await apiService.get<any>(`/invoices?search=${encodeURIComponent(invoiceNo)}&limit=50`);

      // Handle different response structures
      let invoices: Invoice[] = [];

      if (response.data?.data && Array.isArray(response.data.data)) {
        invoices = response.data.data;
      } else if (response.data?.invoices) {
        invoices = response.data.invoices;
      } else if (response.invoices) {
        invoices = response.invoices;
      } else if (Array.isArray(response.data)) {
        invoices = response.data;
      } else if (Array.isArray(response)) {
        invoices = response;
      }

      // Find exact match by invoice number (case insensitive)
      const invoice = invoices.find((inv: Invoice) =>
        inv.invoiceNo?.toUpperCase() === invoiceNo.toUpperCase()
      );

      return {
        success: !!invoice,
        data: { invoice: invoice || null },
        message: invoice ? 'Faktura topildi' : 'Faktura topilmadi'
      };
    } catch (error) {
      return {
        success: false,
        data: { invoice: null },
        message: 'Faktura qidirishda xatolik'
      };
    }
  },

  // Search bag by batch code
  searchBagByBatchCode: async (batchCode: string): Promise<ApiResponse<{ bag: BagSearchResult }>> => {
    return apiService.get<ApiResponse<{ bag: BagSearchResult }>>(`/returns/search-bag/${encodeURIComponent(batchCode)}`);
  },
};

export default returnService;
