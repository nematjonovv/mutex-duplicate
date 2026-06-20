import User from "../models/User.js";
import { generateTokens } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { z } from "zod";
import bcrypt from "bcrypt";
import { notifyUserUpdate, notifyUserDelete } from "../utils/notificationHelper.js";

// Validation schemas
const createUserSchema = z.object({
  fullName: z
    .string()
    .min(2, "To'liq ism kamida 2 ta belgidan iborat bo'lishi kerak")
    .max(100, "To'liq ism 100 ta belgidan oshmasligi kerak"),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Iltimos, to'g'ri telefon raqamini kiriting"),
  position: z
    .string()
    .min(1, "Lavozim talab qilinadi")
    .max(50, "Lavozim 50 ta belgidan oshmasligi kerak"),
  role: z.enum(["DIRECTOR", "MANAGER", "SELLER", "ACCOUNTANT", "WORKER", "WRAPPER"]),
  permissions: z.array(z.string()).optional(),
  password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  position: z.string().min(1).max(50).optional(),
  role: z
    .enum(["DIRECTOR", "MANAGER", "SELLER", "ACCOUNTANT", "WORKER", "WRAPPER"])
    .optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  password:z.string().optional()
});
const paginationSchema = z.object({
  page: z.preprocess((val) => val === undefined ? "1" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1)).default(1)),
  limit: z.preprocess((val) => val === undefined ? "10" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1).max(2000)).default(10)),
  search: z.string().optional(),
  role: z.enum(["DIRECTOR", "MANAGER", "SELLER", "ACCOUNTANT", "WORKER", "WRAPPER"]).optional(),
  isActive: z.union([z.string(), z.boolean()])
    .transform((val) => val === "true" || val === true)
    .optional(),
});

// Get all users with pagination and filters
export const getUsers = async (req, res) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const { page, limit, search, role, isActive } = validatedQuery;

    // Build query
    const query = { deletedAt: null };

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { position: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      query.role = role;
    }

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute query
    const [users, total] = await Promise.all([
      User.find(query)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatosi",
        errors: error.errors,
      });
    }

    logger.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Foydalanuvchilarni yuklashda xatolik yuz berdi",
    });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-passwordHash").lean();

    if (!user || user.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    logger.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Foydalanuvchini yuklashda xatolik yuz berdi",
    });
  }
};

// Create new user
export const createUser = async (req, res) => {
  try {
    const validatedData = createUserSchema.parse(req.body);

    // Check if phone already exists
    const existingUser = await User.findOne({ phone: validatedData.phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Bu telefon raqam allaqachon ro'yxatdan o'tgan",
      });
    }

    // Create user
    const user = new User({
      fullName: validatedData.fullName,
      phone: validatedData.phone,
      position: validatedData.position,
      role: validatedData.role,
      permissions: validatedData.permissions,
      createdBy: req.user._id,
    });

    // Hash password directly
    const saltRounds = 12;
    user.passwordHash = await bcrypt.hash(validatedData.password, saltRounds);

    await user.save();

    // Return user without password
    const userData = {
      _id: user._id,
      fullName: user.fullName,
      phone: user.phone,
      position: user.position,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    res.status(201).json({
      success: true,
      message: "Foydalanuvchi muvaffaqiyatli yaratildi",
      data: { user: userData },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatosi",
        errors: error.errors,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Telefon raqam allaqachon mavjud",
      });
    }

    logger.error("Create user error:", error);
    res.status(500).json({
      success: false,
      message: "Foydalanuvchi yaratishda xatolik yuz berdi",
    });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateUserSchema.parse(req.body);

    // Find user
    const user = await User.findById(id);
    if (!user || user.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi",
      });
    }

    // Check if phone is being updated and if it already exists
    if (validatedData.phone && validatedData.phone !== user.phone) {
      const existingUser = await User.findOne({ phone: validatedData.phone });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Bu telefon raqam allaqachon ro'yxatdan o'tgan",
        });
      }
    }

    // Update user
    Object.assign(user, validatedData, {
      updatedBy: req.user._id,
    });

    await user.save();

    // Create notification
    try {
      await notifyUserUpdate(user, req.user._id);
    } catch (notifError) {
      logger.error("Failed to create notification:", notifError);
    }

    // Return updated user without password
    const userData = {
      _id: user._id,
      fullName: user.fullName,
      phone: user.phone,
      position: user.position,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: "Foydalanuvchi muvaffaqiyatli yangilandi",
      data: { user: userData },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatosi",
        errors: error.errors,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Telefon raqam allaqachon mavjud",
      });
    }

    logger.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Foydalanuvchini yangilashda xatolik yuz berdi",
    });
  }
};

// Delete user (soft delete)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "O'z hisobingizni o'chira olmaysiz",
      });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      message: "Foydalanuvchi muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    logger.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Foydalanuvchini o'chirishda xatolik yuz berdi",
    });
  }
};

// Get user permissions
export const getUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("permissions role");
    if (!user || user.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        permissions: user.permissions,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error("Get user permissions error:", error);
    res.status(500).json({
      success: false,
      message: "Foydalanuvchi huquqlarini yuklashda xatolik yuz berdi",
    });
  }
};

// Update user permissions
export const updateUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: "Huquqlar massiv bo'lishi kerak",
      });
    }

    const user = await User.findById(id);
    if (!user || user.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi",
      });
    }

    user.permissions = permissions;
    user.updatedBy = req.user._id;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Foydalanuvchi huquqlari muvaffaqiyatli yangilandi",
      data: {
        permissions: user.permissions,
      },
    });
  } catch (error) {
    logger.error("Update user permissions error:", error);
    res.status(500).json({
      success: false,
      message: "Foydalanuvchi huquqlarini yangilashda xatolik yuz berdi",
    });
  }
};

// Get active users count
export const getActiveUsersCount = async (req, res) => {
  try {
    const count = await User.countDocuments({
      isActive: true,
      deletedAt: null,
    });

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    logger.error("Get active users count error:", error);
    res.status(500).json({
      success: false,
      message: "Faol foydalanuvchilar sonini yuklashda xatolik yuz berdi",
    });
  }
};

// Get users by role
export const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    const users = await User.find({
      role,
      isActive: true,
      deletedAt: null,
    })
      .select("_id fullName phone position")
      .sort({ fullName: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { users },
    });
  } catch (error) {
    logger.error("Get users by role error:", error);
    res.status(500).json({
      success: false,
      message: "Rol bo'yicha foydalanuvchilarni yuklashda xatolik yuz berdi",
    });
  }
};

// Update last wrapped batch for WRAPPER users
export const updateLastWrappedBatch = async (req, res) => {
  try {
    const { batchId } = req.body;
    const userId = req.user._id;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        message: "Batch ID talab qilinadi",
      });
    }

    const user = await User.findById(userId);
    if (!user || user.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi",
      });
    }

    user.lastWrappedBatchId = batchId;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Oxirgi qoplangan partiya saqlandi",
      data: { lastWrappedBatchId: batchId },
    });
  } catch (error) {
    logger.error("Update last wrapped batch error:", error);
    res.status(500).json({
      success: false,
      message: "Oxirgi qoplangan partiyani saqlashda xatolik yuz berdi",
    });
  }
};
