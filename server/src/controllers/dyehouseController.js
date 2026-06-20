import Dyehouse from "../models/Dyehouse.js";
import { logger } from "../config/logger.js";
import { z } from "zod";
import { notifyDyehouseUpdate, notifyDyehouseDelete } from "../utils/notificationHelper.js";

// Validation schemas
const createDyehouseSchema = z.object({
  name: z
    .string()
    .min(1, "Dyehouse name is required")
    .max(200, "Dyehouse name cannot exceed 200 characters"),
  ownerName: z
    .string()
    .min(1, "Owner name is required")
    .max(100, "Owner name cannot exceed 100 characters"),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"),
  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(500, "Address cannot exceed 500 characters"),
});

const updateDyehouseSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  ownerName: z.string().min(1).max(100).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  address: z.string().min(5).max(500).optional(),
});

const paginationSchema = z.object({
  page: z.preprocess((val) => val === undefined ? "1" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1)).default(1)),
  limit: z.preprocess((val) => val === undefined ? "10" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1).max(2000)).default(10)),
  search: z.string().optional(),
});

// Get all dyehouses with pagination and filters
export const getDyehouses = async (req, res) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const { page, limit, search } = validatedQuery;

    // Build query
    const query = { deletedAt: null };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { ownerName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute query
    const [dyehouses, total] = await Promise.all([
      Dyehouse.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Dyehouse.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        data: dyehouses,
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
        message: "Validatsiya xatoligi",
        errors: error.errors,
      });
    }

    logger.error("Get dyehouses error:", error);
    res.status(500).json({
      success: false,
      message: "Bo'yoqxonalarni olishda xatolik",
    });
  }
};

// Get dyehouse by ID
export const getDyehouseById = async (req, res) => {
  try {
    const { id } = req.params;

    const dyehouse = await Dyehouse.findById(id).lean();

    if (!dyehouse || dyehouse.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Bo'yoqxona topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      data: { dyehouse },
    });
  } catch (error) {
    logger.error("Get dyehouse by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Bo'yoqxona ma'lumotlarini olishda xatolik",
    });
  }
};

// Create new dyehouse
export const createDyehouse = async (req, res) => {
  try {
    const validatedData = createDyehouseSchema.parse(req.body);

    // Check if phone already exists
    const existingDyehouse = await Dyehouse.findOne({
      phone: validatedData.phone,
    });
    if (existingDyehouse) {
      return res.status(400).json({
        success: false,
        message: "Telefon raqami allaqachon ro'yxatdan o'tgan",
      });
    }

    // Create dyehouse
    const dyehouse = new Dyehouse({
      ...validatedData,
      createdBy: req.user._id,
    });

    await dyehouse.save();

    res.status(201).json({
      success: true,
      message: "Bo'yoqxona muvaffaqiyatli yaratildi",
      data: { dyehouse },
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
        message: "Telefon raqami allaqachon mavjud",
      });
    }

    logger.error("Create dyehouse error:", error);
    res.status(500).json({
      success: false,
      message: "Bo'yoqxona yaratishda xatolik",
    });
  }
};

// Update dyehouse
export const updateDyehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateDyehouseSchema.parse(req.body);

    // Find dyehouse
    const dyehouse = await Dyehouse.findById(id);
    if (!dyehouse || dyehouse.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Bo'yoqxona topilmadi",
      });
    }

    // Check if phone is being updated and if it already exists
    if (validatedData.phone && validatedData.phone !== dyehouse.phone) {
      const existingDyehouse = await Dyehouse.findOne({
        phone: validatedData.phone,
      });
      if (existingDyehouse) {
        return res.status(400).json({
          success: false,
          message: "Telefon raqami allaqachon ro'yxatdan o'tgan",
        });
      }
    }

    // Update dyehouse
    Object.assign(dyehouse, validatedData, {
      updatedBy: req.user._id,
    });

    await dyehouse.save();

    // Create notification
    try {
      await notifyDyehouseUpdate(dyehouse, req.user._id);
    } catch (notifError) {
      logger.error("Failed to create notification:", notifError);
    }

    res.status(200).json({
      success: true,
      message: "Bo'yoqxona muvaffaqiyatli yangilandi",
      data: { dyehouse },
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
        message: "Telefon raqami allaqachon mavjud",
      });
    }

    logger.error("Update dyehouse error:", error);
    res.status(500).json({
      success: false,
      message: "Bo'yoqxona yangilashda xatolik",
    });
  }
};

// Delete dyehouse (soft delete)
export const deleteDyehouse = async (req, res) => {
  try {
    const { id } = req.params;

    const dyehouse = await Dyehouse.findById(id);
    if (!dyehouse || dyehouse.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Dyehouse not found",
      });
    }

    // Soft delete
    dyehouse.deletedAt = new Date();
    dyehouse.updatedBy = req.user._id;
    await dyehouse.save();

    // Create notification
    try {
      await notifyDyehouseDelete(dyehouse, req.user._id);
    } catch (notifError) {
      logger.error("Failed to create notification:", notifError);
    }

    res.status(200).json({
      success: true,
      message: "Dyehouse deleted successfully",
    });
  } catch (error) {
    logger.error("Delete dyehouse error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete dyehouse",
    });
  }
};

// Search dyehouses
export const searchDyehouses = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const dyehouses = await Dyehouse.find({
      deletedAt: null,
      $or: [
        { name: { $regex: q, $options: "i" } },
        { ownerName: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ],
    })
      .select("_id name ownerName phone")
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      data: { dyehouses },
    });
  } catch (error) {
    logger.error("Search dyehouses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search dyehouses",
    });
  }
};

// Get dyehouses count
export const getDyehousesCount = async (req, res) => {
  try {
    const count = await Dyehouse.countDocuments({ deletedAt: null });

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    logger.error("Get dyehouses count error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dyehouses count",
    });
  }
};
