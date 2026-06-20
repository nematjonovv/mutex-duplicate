import { apiService } from "./api";
import {
  Client,
  CreateClientRequest,
  UpdateClientRequest,
  PaginatedResponse,
  ApiResponse,
  PaginationParams,
} from "@/types";
import { createResourceService } from "./resourceService";

// Create a base service for Client
const baseClientService = createResourceService<Client>("clients");

export const clientService = {
  // Inherit basic CRUD operations from baseClientService
  ...baseClientService,

  // Custom getAll for clients with specific query parameters
  getAll: async (
    params?: PaginationParams & { search?: string; hasDebt?: boolean; }
  ): Promise<ApiResponse<PaginatedResponse<Client>>> => {
    return baseClientService.getAll(params);
  },

  // Custom functions
  getClients: async (params?: any) => clientService.getAll(params),
  getClientById: async (id: string) => clientService.getById(id),
  createClient: async (data: any) => clientService.create(data),
  updateClient: async (id: string, data: any) => clientService.update(id, data),
  deleteClient: async (id: string) => clientService.remove(id),

  // Get client details with debts and invoices
  getClientDetails: async (
    id: string
  ): Promise<
    ApiResponse<{ client: Client; debts: any[]; invoices: any[] }>
  > => {
    return apiService.get<
      ApiResponse<{ client: Client; debts: any[]; invoices: any[] }>
    >(`/clients/${id}/details`);
  },

  // Get clients with debt summary
  getClientsWithDebtSummary: async (): Promise<
    ApiResponse<{ clients: Client[]; summary: { totalDebt: number; totalClients: number; clientsWithDebt: number; averageDebt: number } }>
  > => {
    const response = await apiService.get<ApiResponse<any>>(
      "/clients/stats/debt-summary"
    );

    if (response.success && response.data?.data) {
      response.data.clients = response.data.data;
      response.data.summary = response.data.summary;
    }

    return response as ApiResponse<{ clients: Client[]; summary: { totalDebt: number; totalClients: number; clientsWithDebt: number; averageDebt: number } }>;
  },

  // Search clients
  searchClients: async (
    search: string
  ): Promise<ApiResponse<{ clients: Client[] }>> => {
    return apiService.get<ApiResponse<{ clients: Client[] }>>(
      `/clients/search?search=${encodeURIComponent(search)}`
    );
  },

  // Get clients count
  getClientsCount: async (): Promise<ApiResponse<{ count: number }>> => {
    return apiService.get<ApiResponse<{ count: number }>>(
      "/clients/stats/count"
    );
  },
};

export default clientService;