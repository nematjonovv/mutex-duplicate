import User from "../models/User.js";
import { generateTokens, verifyRefreshToken } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { notifyUserLogin } from "../utils/notificationHelper.js";
import crypto from "crypto";
import { z } from "zod";
import {
  loginSchema,
  registerSchema,
  updateUserSchema,
  changePasswordSchema,
  refreshTokenSchema,
  updateProfileSchema,
  userIdSchema,
  paginationSchema,
} from "../validations/auth.js";
import AppSetting from "../models/AppSetting.js"; // Import AppSetting model

const verifySectionPasswordSchema = z.object({
  section: z.enum(["sales", "finance", "management"], {
    required_error: "Bo'lim nomi majburiy",
    invalid_type_error: "Bo'lim nomi yaroqsiz",
  }),
  password: z.string().min(1, "Parol majburiy"),
});

const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getRefreshTokenExpiryDate = () => {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
  const match = /^(\d+)([dhm])$/i.exec(expiresIn);
  const expiresAt = new Date();

  if (!match) {
    expiresAt.setDate(expiresAt.getDate() + 7);
    return expiresAt;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  if (unit === "d") expiresAt.setDate(expiresAt.getDate() + value);
  if (unit === "h") expiresAt.setHours(expiresAt.getHours() + value);
  if (unit === "m") expiresAt.setMinutes(expiresAt.getMinutes() + value);

  return expiresAt;
};

// Login user
export const login = async (req, res) => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);

    // Find user by phone
    const user = await User.findOne({ phone: validatedData.phone });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Telefon raqami yoki parol noto'g'ri",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Akkaunt faol emas",
      });
    }

    // Check if user is deleted
    if (user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: "Akkaunt o'chirilgan",
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(validatedData.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Telefon raqami yoki parol noto'g'ri",
      });
    }

    // Update last active
    await user.updateLastActive();

    // Get IP address and user agent
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Noma\'lum';
    const userAgent = req.headers['user-agent'] || 'Noma\'lum';

    // Create login notification for MANAGER
    try {
        await notifyUserLogin(user, ipAddress, userAgent);
    } catch (notifError) {
        logger.error("Failed to create login notification:", notifError);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokenHash = hashRefreshToken(refreshToken);
    user.refreshTokenExpiresAt = getRefreshTokenExpiryDate();
    await user.save();

    // Return user data (without password)
    const userData = {
      _id: user._id,
      fullName: user.fullName,
      phone: user.phone,
      position: user.position,
      role: user.role,
      permissions: user.permissions,
      lastActiveAt: user.lastActiveAt,
      lastWrappedBatchId: user.lastWrappedBatchId,
      isActive: user.isActive,
    };

    res.status(200).json({
      success: true,
      message: "Tizimga kirish muvaffaqiyatli",
      data: {
        user: userData,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatoligi",
        errors: error.errors,
      });
    }

    logger.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Tizimga kirishda xatolik",
    });
  }
};

// Register new user
export const register = async (req, res) => {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await User.findOne({ phone: validatedData.phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Ushbu telefon raqamli foydalanuvchi allaqachon mavjud",
      });
    }

    // Create new user
    const user = new User({
      ...validatedData,
      createdBy: req.user._id,
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokenHash = hashRefreshToken(refreshToken);
    user.refreshTokenExpiresAt = getRefreshTokenExpiryDate();
    await user.save();

    // Return user data (without password)
    const userData = {
      _id: user._id,
      fullName: user.fullName,
      phone: user.phone,
      position: user.position,
      role: user.role,
      permissions: user.permissions,
      lastActiveAt: user.lastActiveAt,
      isActive: user.isActive,
    };

    res.status(201).json({
      success: true,
      message: "Foydalanuvchi muvaffaqiyatli ro'yxatdan o'tkazildi",
      data: {
        user: userData,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatoligi",
        errors: error.errors,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ushbu telefon raqamli foydalanuvchi allaqachon mavjud",
      });
    }

    logger.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Ro'yxatdan o'tishda xatolik",
    });
  }
};

// Refresh access token
export const refreshToken = async (req, res) => {
  try {
    // Validate request body
    const validatedData = refreshTokenSchema.parse(req.body);

    // Verify refresh token
    const decoded = verifyRefreshToken(validatedData.refreshToken);

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive || user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: "Yaroqsiz yangilash tokeni",
      });
    }

    if (
      !user.refreshTokenHash ||
      user.refreshTokenHash !== hashRefreshToken(validatedData.refreshToken) ||
      (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date())
    ) {
      return res.status(401).json({
        success: false,
        message: "Yaroqsiz yangilash tokeni",
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokenHash = hashRefreshToken(refreshToken);
    user.refreshTokenExpiresAt = getRefreshTokenExpiryDate();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Token muvaffaqiyatli yangilandi",
      data: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatoligi",
        errors: error.errors,
      });
    }

    logger.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "Yaroqsiz yangilash tokeni",
    });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const user = req.user;

    const userData = {
      _id: user._id,
      fullName: user.fullName,
      phone: user.phone,
      position: user.position,
      role: user.role,
      permissions: user.permissions,
      lastActiveAt: user.lastActiveAt,
      lastWrappedBatchId: user.lastWrappedBatchId,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    res.status(200).json({
      success: true,
      data: { user: userData },
    });
  } catch (error) {
    logger.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Profilni olishda xatolik",
    });
  }
};

// Update current user profile
export const updateProfile = async (req, res) => {
  try {
    // Validate request body
    const validatedData = updateProfileSchema.parse(req.body);

    const user = req.user;

    // Check if phone is being changed and if it's already taken
    if (validatedData.phone !== user.phone) {
      const existingUser = await User.findOne({ phone: validatedData.phone });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Telefon raqami band",
        });
      }
    }

    // Update user
    user.fullName = validatedData.fullName;
    user.phone = validatedData.phone;
    user.position = validatedData.position;
    user.updatedBy = user._id;

    await user.save();

    const userData = {
      _id: user._id,
      fullName: user.fullName,
      phone: user.phone,
      position: user.position,
      role: user.role,
      permissions: user.permissions,
      lastActiveAt: user.lastActiveAt,
      isActive: user.isActive,
    };

    res.status(200).json({
      success: true,
      message: "Profil muvaffaqiyatli yangilandi",
      data: userData,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatoligi",
        errors: error.errors,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Telefon raqami band",
      });
    }

    logger.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Profilni yangilashda xatolik",
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    // Validate request body
    const validatedData = changePasswordSchema.parse(req.body);

    const user = req.user;

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(
      validatedData.currentPassword
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Joriy parol noto'g'ri",
      });
    }

    // Update password
    user.password = validatedData.newPassword;
    user.updatedBy = user._id;
    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Parol muvaffaqiyatli o'zgartirildi",
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatoligi",
        errors: error.errors,
      });
    }

    logger.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Parolni o'zgartirishda xatolik",
    });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    // Update last active and revoke refresh token
    await req.user.updateLastActive();
    req.user.refreshTokenHash = null;
    req.user.refreshTokenExpiresAt = null;
    await req.user.save();

    res.status(200).json({
      success: true,
      message: "Tizimdan chiqildi",
    });
  } catch (error) {
    logger.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Tizimdan chiqishda xatolik",
    });
  }
};

// Verify section password
export const verifySectionPassword = async (req, res) => {
  try {
    const validatedData = verifySectionPasswordSchema.parse(req.body);
    const { section, password } = validatedData;

    const settings = await AppSetting.getSettings();
    const isPasswordValid = await settings.comparePassword(section, password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Noto'g'ri parol",
      });
    }

    res.status(200).json({
      success: true,
      message: "Parol muvaffaqiyatli tekshirildi",
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatosi",
        errors: error.errors,
      });
    }

    logger.error("Verify section password error:", error);
    res.status(500).json({
      success: false,
      message: "Parolni tekshirishda xatolik yuz berdi",
    });
  }
};
