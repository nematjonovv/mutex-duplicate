import { z } from "zod";

// Login validation
export const loginSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password cannot exceed 100 characters"),
});

// Register validation
export const registerSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name cannot exceed 100 characters")
    .trim(),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"),
  position: z
    .string()
    .min(1, "Position is required")
    .max(50, "Position cannot exceed 50 characters")
    .trim(),
  role: z.enum(["DIRECTOR", "MANAGER", "SELLER", "ACCOUNTANT", "WORKER", "WRAPPER"], {
    errorMap: () => ({ message: "Invalid role selected" }),
  }),
  permissions: z.array(z.string().trim()).optional(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password cannot exceed 100 characters"),
});

// Update user validation
export const updateUserSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name cannot exceed 100 characters")
    .trim()
    .optional(),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number")
    .optional(),
  position: z
    .string()
    .min(1, "Position is required")
    .max(50, "Position cannot exceed 50 characters")
    .trim()
    .optional(),
  role: z
    .enum(["DIRECTOR", "MANAGER", "SELLER", "ACCOUNTANT", "WORKER", "WRAPPER"], {
      errorMap: () => ({ message: "Invalid role selected" }),
    })
    .optional(),
  permissions: z.array(z.string().trim()).optional(),
  isActive: z.boolean().optional(),
});

// Change password validation
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .max(100, "New password cannot exceed 100 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Refresh token validation
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// Forgot password validation
export const forgotPasswordSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"),
});

// Reset password validation
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .max(100, "New password cannot exceed 100 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Update profile validation
export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name cannot exceed 100 characters")
    .trim(),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"),
  position: z
    .string()
    .min(1, "Position is required")
    .max(50, "Position cannot exceed 50 characters")
    .trim(),
});

// User ID validation
export const userIdSchema = z.object({
  id: z
    .string()
    .min(1, "User ID is required")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
});

// Pagination validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(10),
  search: z.string().optional(),
  role: z
    .enum(["DIRECTOR", "MANAGER", "SELLER", "ACCOUNTANT", "WORKER", "WRAPPER"])
    .optional(),
  isActive: z.coerce.boolean().optional(),
});
