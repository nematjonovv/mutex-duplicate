import { apiService } from "./api";
import {
  Invoice,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  InvoicePaymentRequest,
  PaginatedResponse,
  ApiResponse,
  PaginationParams,
} from "@/types";
import { createResourceService } from "./resourceService";

// Create a base service for Invoice
const baseInvoiceService = createResourceService<Invoice>("invoices");

export const invoiceService = {
  // Inherit basic CRUD operations from baseInvoiceService
  ...baseInvoiceService,

  // Custom getAll for invoices with specific query parameters
  getAll: async (params?: PaginationParams & {
    search?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<PaginatedResponse<Invoice>>> => {
    return baseInvoiceService.getAll(params);
  },

  // Custom functions
  getInvoices: async (params?: any) => invoiceService.getAll(params),
  getInvoiceById: async (id: string) => invoiceService.getById(id),
  createInvoice: async (data: any) => invoiceService.create(data),
  updateInvoice: async (id: string, data: any) => invoiceService.update(id, data),
  deleteInvoice: async (id: string) => invoiceService.remove(id),

  // Record payment for invoice
  recordPayment: async (
    id: string,
    paymentData: InvoicePaymentRequest
  ): Promise<ApiResponse<{ invoice: Invoice }>> => {
    return apiService.post<ApiResponse<{ invoice: Invoice }>>(
      `/invoices/${id}/payment`,
      paymentData
    );
  },

  // Scan batch to get items
  scanBatch: async (
    batchCode: string
  ): Promise<ApiResponse<{ items: any[] }>> => {
    return apiService.get<ApiResponse<{ items: any[] }>>(
      `/invoices/scan/${encodeURIComponent(batchCode)}`
    );
  },

  // Mark invoice as printed
  markAsPrinted: async (
    id: string
  ): Promise<ApiResponse<{ invoice: Invoice }>> => {
    return apiService.post<ApiResponse<{ invoice: Invoice }>>(
      `/invoices/${id}/print`
    );
  },

  // Get invoice summary
  getInvoiceSummary: async (): Promise<ApiResponse<{ summary: any }>> => {
    return apiService.get<ApiResponse<{ summary: any }>>(
      "/invoices/stats/summary"
    );
  },

  // Get recent invoices
  getRecentInvoices: async (): Promise<
    ApiResponse<{ invoices: Invoice[] }>
  > => {
    return apiService.get<ApiResponse<{ invoices: Invoice[] }>>(
      "/invoices/stats/recent"
    );
  },

  // Generate invoice number
  generateInvoiceNumber: async (): Promise<
    ApiResponse<{ invoiceNo: string }>
  > => {
    return apiService.get<ApiResponse<{ invoiceNo: string }>>(
      "/invoices/generate-number"
    );
  },
};

export default invoiceService;
