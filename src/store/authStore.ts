import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { AuthState, User, LoginRequest } from "@/types";
import { authService } from "@/services/authService";
import { message } from "@/utils/StaticAntd";

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  getProfile: () => Promise<void>;
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshAuthState: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      login: async (credentials: LoginRequest) => {
        try {
          set({ isLoading: true });

          const response = await authService.login(credentials);

          if (response.success && response.data) {
            const { user, accessToken, refreshToken } = response.data;

            set({
              user,
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });

            message.success("Muvaffaqiyatli tizimga kirildi");
            return true;
          } else {
            set({ isLoading: false });
            message.error(response.message || "Kirishda xatolik yuz berdi");
            return false;
          }
        } catch (error: any) {
          set({ isLoading: false });
          const errorMessage =
            error.response?.data?.message || "Kirishda xatolik yuz berdi";
          message.error(errorMessage);
          return false;
        }
      },

      logout: async () => {
        try {
          // Call logout API if user is authenticated
          if (get().isAuthenticated) {
            await authService.logout();
          }
        } catch (error) {
          // Ignore logout API errors
          console.error("Logout API error:", error);
        } finally {
          // Clear local state regardless of API call result
          get().clearAuth();
          message.success("Tizimdan chiqildi");
        }
      },

      getProfile: async () => {
        try {
          set({ isLoading: true });

          const response = await authService.getProfile();

          if (response.success && response.data) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
            get().clearAuth();
          }
        } catch (error: any) {
          set({ isLoading: false });
          console.error("Get profile error:", error);
          get().clearAuth();
        }
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },

      // Force refresh auth state from session storage
      refreshAuthState: () => {
        try {
          const storedAuth = sessionStorage.getItem("auth-storage");
          if (storedAuth) {
            const authData = JSON.parse(storedAuth);
            if (authData.state) {
              set({
                user: authData.state.user,
                accessToken: authData.state.accessToken,
                refreshToken: authData.state.refreshToken,
                isAuthenticated: !!authData.state.accessToken,
              });
            }
          }
        } catch (error) {
          console.error("Error refreshing auth state:", error);
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
