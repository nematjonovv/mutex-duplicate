import { apiService } from "./api";
import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  PaginatedResponse,
  ApiResponse,
  PaginationParams,
} from "@/types";
import { createResourceService } from "./resourceService";

// Create a base service for User
const baseUserService = createResourceService<User>("users");

export const userService = {
  // Inherit basic CRUD operations from baseUserService
  ...baseUserService,

  // Custom getAll for users with specific query parameters
  getAll: async (params?: PaginationParams & { search?: string; role?: string; isActive?: string; }
  ): Promise<ApiResponse<PaginatedResponse<User>>> => {
    return baseUserService.getAll(params);
  },

  // Standard aliases for components
  getUsers: async (params?: any) => userService.getAll(params),
  getUserById: async (id: string) => userService.getById(id),
  createUser: async (data: any) => userService.create(data),
  updateUser: async (id: string, data: any) => userService.update(id, data),
  deleteUser: async (id: string) => userService.remove(id),

  // Custom functions
  // Toggle user status
  toggleUserStatus: async (
    id: string,
    isActive: boolean
  ): Promise<ApiResponse<{ user: User }>> => {
    return apiService.put<ApiResponse<{ user: User }>>(`/users/${id}`, {
      isActive,
    });
  },

  // Get user profile
  getProfile: async (): Promise<ApiResponse<{ user: User }>> => {
    return apiService.get<ApiResponse<{ user: User }>>("/users/profile");
  },

  // Update user profile
  updateProfile: async (
    userData: UpdateUserRequest
  ): Promise<ApiResponse<{ user: User }>> => {
    return apiService.put<ApiResponse<{ user: User }>>(
      "/users/profile",
      userData
    );
  },

  // Change password
  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse> => {
    return apiService.put<ApiResponse>("/users/change-password", data);
  },
};

export default userService;
