import { useQuery, useMutation, useQueryClient } from "react-query";
import { message } from "@/utils/StaticAntd";
import { ApiResponse } from "@/types";

// Generic query hook
export const useApiQuery = <T>(
  key: string | string[],
  queryFn: () => Promise<ApiResponse<T>>,
  options?: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
    cacheTime?: number;
    keepPreviousData?: boolean;
  }
) => {
  return useQuery(
    key,
    async () => {
      const response = await queryFn();
      if (!response.success) {
        throw new Error(response.message || "API so'rovi muvaffaqiyatsiz tugadi");
      }
      return response.data;
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      ...options,
    }
  );
};

// Generic mutation hook
export const useApiMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    successMessage?: string;
    errorMessage?: string;
    invalidateQueries?: string[];
  }
) => {
  const queryClient = useQueryClient();

  return useMutation(
    async (variables: TVariables) => {
      const response = await mutationFn(variables);
      if (!response.success) {
        throw new Error(response.message || "API so'rovi muvaffaqiyatsiz tugadi");
      }
      return response.data;
    },
    {
      onSuccess: (data, variables) => {
        if (options?.successMessage) {
          message.success(options.successMessage);
        }

        if (options?.invalidateQueries) {
          options.invalidateQueries.forEach((queryKey) => {
            queryClient.invalidateQueries(queryKey);
            // Ensure both string and array-style keys are invalidated.
            queryClient.invalidateQueries([queryKey]);
          });
        }

        options?.onSuccess?.(data!, variables);
      },
      onError: (error: any, variables) => {
        const errorMessage =
          options?.errorMessage || 
          error?.response?.data?.message || 
          error?.message || 
          "Xatolik yuz berdi";
        message.error(errorMessage);
        options?.onError?.(error, variables);
      },
    }
  );
};

// Paginated query hook
export const usePaginatedQuery = <T>(
  key: string | string[],
  queryFn: (params: {
    page: number;
    limit: number;
    [key: string]: any;
  }) => Promise<ApiResponse<PaginatedResponse<T>>>,
  params: { page: number; limit: number; [key: string]: any },
  options?: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
    cacheTime?: number;
    keepPreviousData?: boolean;
  }
) => {
  return useQuery(
    [...(Array.isArray(key) ? key : [key]), params],
    async () => {
      const response = await queryFn(params);
      if (!response.success) {
        throw new Error(response.message || "API so'rovi muvaffaqiyatsiz tugadi");
      }
      return response.data;
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      ...options,
    }
  );
};

// Infinite query hook for pagination
export const useInfiniteQuery = <T>(
  key: string | string[],
  queryFn: (params: {
    page: number;
    limit: number;
    [key: string]: any;
  }) => Promise<ApiResponse<PaginatedResponse<T>>>,
  params: { limit: number; [key: string]: any },
  options?: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
    cacheTime?: number;
  }
) => {
  return useQuery(
    [...(Array.isArray(key) ? key : [key]), "infinite", params],
    async ({ pageParam = 1 }) => {
      const response = await queryFn({ ...params, page: pageParam });
      if (!response.success) {
        throw new Error(response.message || "API so'rovi muvaffaqiyatsiz tugadi");
      }
      return response.data;
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      getNextPageParam: (lastPage) => {
        if (!lastPage?.pagination) return undefined;
        return lastPage.pagination.hasNext
          ? lastPage.pagination.page + 1
          : undefined;
      },
      ...options,
    }
  );
};

// Optimistic update hook
export const useOptimisticMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    successMessage?: string;
    errorMessage?: string;
    invalidateQueries?: string[];
    optimisticUpdate?: (oldData: any, variables: TVariables) => any;
  }
) => {
  const queryClient = useQueryClient();

  return useMutation(
    async (variables: TVariables) => {
      const response = await mutationFn(variables);
      if (!response.success) {
        throw new Error(response.message || "API so'rovi muvaffaqiyatsiz tugadi");
      }
      return response.data;
    },
    {
      onMutate: async (variables) => {
        if (options?.optimisticUpdate) {
          // Cancel any outgoing refetches
          await queryClient.cancelQueries("data");

          // Snapshot the previous value
          const previousData = queryClient.getQueryData("data");

          // Optimistically update to the new value
          queryClient.setQueryData("data", (old: any) =>
            options.optimisticUpdate!(old, variables)
          );

          // Return a context object with the snapshotted value
          return { previousData };
        }
      },
      onError: (err: unknown, variables, context) => {
        // If the mutation fails, use the context returned from onMutate to roll back
        if (context?.previousData) {
          queryClient.setQueryData("data", context.previousData);
        }

        const errorMessage =
          options?.errorMessage || (err instanceof Error ? err.message : "Xatolik yuz berdi");
        message.error(errorMessage);
        options?.onError?.(err as Error, variables);
      },
      onSuccess: (data, variables) => {
        if (options?.successMessage) {
          message.success(options.successMessage);
        }

        if (options?.invalidateQueries) {
          options.invalidateQueries.forEach((queryKey) => {
            queryClient.invalidateQueries(queryKey);
            // Ensure both string and array-style keys are invalidated.
            queryClient.invalidateQueries([queryKey]);
          });
        }

        options?.onSuccess?.(data!, variables);
      },
      onSettled: () => {
        // Always refetch after error or success
        queryClient.invalidateQueries("data");
      },
    }
  );
};
