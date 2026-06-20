import { apiService } from "./api";
import {
  LoginRequest,
  LoginResponse,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  PaginatedResponse,
  ApiResponse,
} from "@/types";

export const authService = {
  // Login user
  login: async (
    credentials: LoginRequest
  ): Promise<ApiResponse<LoginResponse>> => {
    return apiService.post<ApiResponse<LoginResponse>>(
      "/auth/login",
      credentials
    );
  },

  // Logout user
  logout: async (): Promise<ApiResponse> => {
    return apiService.post<ApiResponse>("/auth/logout");
  },

  // Get current user profile
  getProfile: async (): Promise<ApiResponse<{ user: User }>> => {
    return apiService.get<ApiResponse<{ user: User }>>("/auth/profile");
  },

  // Update current user profile
  updateProfile: async (data: UpdateUserRequest): Promise<ApiResponse<User>> => {
    return apiService.put<ApiResponse<User>>("/auth/profile", data);
  },

  // Refresh token
  refreshToken: async (
    refreshToken: string
  ): Promise<ApiResponse<{ accessToken: string }>> => {
    return apiService.post<ApiResponse<{ accessToken: string }>>(
      "/auth/refresh-token",
      { refreshToken }
    );
  },

  // Change password
  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ApiResponse> => {
    return apiService.put<ApiResponse>("/auth/change-password", data);
  },

  // Get all users (for admin)
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: User["role"];
    isActive?: boolean;
  }): Promise<ApiResponse<PaginatedResponse<User>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.role) queryParams.append("role", params.role);
    if (params?.isActive !== undefined)
      queryParams.append("isActive", params.isActive.toString());

    const url = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
    return apiService.get<ApiResponse<PaginatedResponse<User>>>(url);
  },

  // Get user by ID
  getUserById: async (id: string): Promise<ApiResponse<{ user: User }>> => {
    return apiService.get<ApiResponse<{ user: User }>>(`/users/${id}`);
  },

  // Create new user
  createUser: async (
    userData: CreateUserRequest
  ): Promise<ApiResponse<{ user: User }>> => {
    return apiService.post<ApiResponse<{ user: User }>>("/users", userData);
  },

  // Update user
  updateUser: async (
    id: string,
    userData: UpdateUserRequest
  ): Promise<ApiResponse<{ user: User }>> => {
    return apiService.put<ApiResponse<{ user: User }>>(
      `/users/${id}`,
      userData
    );
  },

  // Delete user
  deleteUser: async (id: string): Promise<ApiResponse> => {
    return apiService.delete<ApiResponse>(`/users/${id}`);
  },

  // Get user permissions
  getUserPermissions: async (
    id: string
  ): Promise<ApiResponse<{ permissions: string[]; role: User["role"] }>> => {
    return apiService.get<
      ApiResponse<{ permissions: string[]; role: User["role"] }>
    >(`/users/${id}/permissions`);
  },

  // Update user permissions
  updateUserPermissions: async (
    id: string,
    permissions: string[]
  ): Promise<ApiResponse<{ permissions: string[] }>> => {
    return apiService.put<ApiResponse<{ permissions: string[] }>>(
      `/users/${id}/permissions`,
      { permissions }
    );
  },

  // Get active users count
  getActiveUsersCount: async (): Promise<ApiResponse<{ count: number }>> => {
    return apiService.get<ApiResponse<{ count: number }>>(
      "/users/stats/active-count"
    );
  },

  // Get users by role
  getUsersByRole: async (
    role: User["role"]
  ): Promise<ApiResponse<{ users: User[] }>> => {
    return apiService.get<ApiResponse<{ users: User[] }>>(
      `/users/role/${role}`
    );
  },

  // Update last wrapped batch for WRAPPER users
  updateLastWrappedBatch: async (
    batchId: string
  ): Promise<ApiResponse<{ lastWrappedBatchId: string }>> => {
    return apiService.put<ApiResponse<{ lastWrappedBatchId: string }>>(
      "/users/me/last-wrapped-batch",
      { batchId }
    );
  },
};

export default authService;
