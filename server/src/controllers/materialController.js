import RawMaterialIntake from "../models/RawMaterialIntake.js";
import ThreadSuggestion from "../models/ThreadSuggestion.js";
import { logger } from "../config/logger.js";
import { z } from "zod";
import { notifyMaterialDelete } from "../utils/notificationHelper.js";

// Validation schemas
const createMaterialSchema = z.object({
  threadType: z
    .string()
    .min(1, "Ip turi kiritilishi shart")
    .max(100, "Ip turi 100 belgidan oshmasligi kerak"),
  threadNumber: z
    .string()
    .min(1, "Ip raqami kiritilishi shart")
    .max(50, "Ip raqami 50 belgidan oshmasligi kerak"),
  supplier: z
    .string()
    .min(1, "Yetkazib beruvchi kiritilishi shart")
    .max(200, "Yetkazib beruvchi nomi 200 belgidan oshmasligi kerak"),
  totalWeightKg: z.number().positive("Og'irlik musbat son bo'lishi kerak"),
  date: z.string().datetime().optional(),
  comment: z
    .string()
    .max(1000, "Izoh 1000 belgidan oshmasligi kerak")
    .optional(),
});

const updateMaterialSchema = z.object({
  threadType: z.string().min(1).max(100).optional(),
  threadNumber: z.string().min(1).max(50).optional(),
  supplier: z.string().min(1).max(200).optional(),
  totalWeightKg: z.number().positive().optional(),
  date: z.string().datetime().optional(),
  comment: z.string().max(1000).optional(),
});
const paginationSchema = z.object({
  page: z.preprocess((val) => val === undefined ? "1" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1)).default(1)),
  limit: z.preprocess((val) => val === undefined ? "10" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1).max(2000)).default(10)),
  search: z.string().optional(),
  threadType: z.string().optional(),
  threadNumber: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Get all materials with pagination and filters
export const getMaterials = async (req, res) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const { page, limit, search, supplier, startDate, endDate } =
      validatedQuery;

    // Build query
    const query = { deletedAt: null };

    if (search) {
      query.$or = [
        { threadType: { $regex: search, $options: "i" } },
        { threadNumber: { $regex: search, $options: "i" } },
        { supplier: { $regex: search, $options: "i" } },
        { comment: { $regex: search, $options: "i" } },
      ];
    }

    if (supplier) {
      query.supplier = { $regex: supplier, $options: "i" };
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute query
    const [materials, total] = await Promise.all([
      RawMaterialIntake.find(query)
        .populate("createdBy", "fullName")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RawMaterialIntake.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        data: materials,
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
      const errorMessages = error.errors.map((err) => err.message).join(", ");
      return res.status(400).json({
        success: false,
        message: `Validatsiya xatosi: ${errorMessages}`,
        errors: error.errors,
      });
    }

    logger.error("Get materials error:", error);
    res.status(500).json({
      success: false,
      message: "Xom ashyolarni olishda xatolik yuz berdi",
    });
  }
};

// Get material by ID
export const getMaterialById = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await RawMaterialIntake.findById(id)
      .populate("createdBy", "fullName")
      .populate("intakes.createdBy", "fullName")
      .lean();

    if (!material || material.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Xom ashyo topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      data: { material },
    });
  } catch (error) {
    logger.error("Get material by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Xom ashyoni olishda xatolik yuz berdi",
    });
  }
};

// Create new material intake
export const createMaterial = async (req, res) => {
  try {
    const validatedData = createMaterialSchema.parse(req.body);
    const intakeDate = validatedData.date ? new Date(validatedData.date) : new Date();

    // Create material intake with first intake record
    const material = new RawMaterialIntake({
      ...validatedData,
      name: `${validatedData.threadType} - ${validatedData.threadNumber}`, // For backward compatibility
      date: intakeDate,
      createdBy: req.user._id,
      // Add first intake to intakes array
      intakes: [{
        date: intakeDate,
        weightKg: validatedData.totalWeightKg,
        comment: validatedData.comment,
        createdBy: req.user._id,
      }],
    });

    await material.save();

    // Save thread type and thread number suggestions
    try {
      await Promise.all([
        ThreadSuggestion.addSuggestion("THREAD_TYPE", validatedData.threadType),
        ThreadSuggestion.addSuggestion("THREAD_NUMBER", validatedData.threadNumber),
      ]);
    } catch (suggestionError) {
      logger.warn("Failed to save thread suggestions:", suggestionError);
    }

    // Populate creator info for response
    await material.populate("createdBy", "fullName");

    res.status(201).json({
      success: true,
      message: "Xom ashyo muvaffaqiyatli qo'shildi",
      data: { material },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      const errorMessages = error.errors.map((err) => err.message).join(", ");
      return res.status(400).json({
        success: false,
        message: `Validatsiya xatosi: ${errorMessages}`,
        errors: error.errors,
      });
    }

    logger.error("Create material error:", error);
    res.status(500).json({
      success: false,
      message: "Xom ashyo qo'shishda xatolik yuz berdi",
    });
  }
};

// Add intake schema
const addIntakeSchema = z.object({
  weightKg: z.number().positive("Og'irlik musbat son bo'lishi kerak"),
  date: z.string().datetime().optional(),
  comment: z.string().max(1000, "Izoh 1000 belgidan oshmasligi kerak").optional(),
});

// Add additional intake to existing material
export const addIntake = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = addIntakeSchema.parse(req.body);

    // Find material
    const material = await RawMaterialIntake.findById(id);
    if (!material || material.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Xom ashyo topilmadi",
      });
    }

    const intakeDate = validatedData.date ? new Date(validatedData.date) : new Date();

    // Add new intake record
    material.intakes.push({
      date: intakeDate,
      weightKg: validatedData.weightKg,
      comment: validatedData.comment,
      createdBy: req.user._id,
    });

    // Update total weight
    material.totalWeightKg += validatedData.weightKg;
    material.updatedBy = req.user._id;

    await material.save();

    // Populate creator info for response
    await material.populate("createdBy", "fullName");
    await material.populate("intakes.createdBy", "fullName");

    res.status(200).json({
      success: true,
      message: "Qo'shimcha qabul muvaffaqiyatli qo'shildi",
      data: { material },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      const errorMessages = error.errors.map((err) => err.message).join(", ");
      return res.status(400).json({
        success: false,
        message: `Validatsiya xatosi: ${errorMessages}`,
        errors: error.errors,
      });
    }

    logger.error("Add intake error:", error);
    res.status(500).json({
      success: false,
      message: "Qo'shimcha qabul qo'shishda xatolik yuz berdi",
    });
  }
};

// Update material intake
export const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateMaterialSchema.parse(req.body);

    // Find material
    const material = await RawMaterialIntake.findById(id);
    if (!material || material.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Xom ashyo topilmadi",
      });
    }

    // Update material
    Object.assign(material, validatedData, {
      date: validatedData.date ? new Date(validatedData.date) : material.date,
      updatedBy: req.user._id,
    });

    await material.save();

    // Populate creator info for response
    await material.populate("createdBy", "fullName");

    res.status(200).json({
      success: true,
      message: "Xom ashyo muvaffaqiyatli yangilandi",
      data: { material },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      const errorMessages = error.errors.map((err) => err.message).join(", ");
      return res.status(400).json({
        success: false,
        message: `Validatsiya xatosi: ${errorMessages}`,
        errors: error.errors,
      });
    }

    logger.error("Update material error:", error);
    res.status(500).json({
      success: false,
      message: "Xom ashyoni yangilashda xatolik yuz berdi",
    });
  }
};

// Delete material intake (soft delete)
export const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await RawMaterialIntake.findById(id);
    if (!material || material.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Xom ashyo topilmadi",
      });
    }

    // Soft delete
    material.deletedAt = new Date();
    material.updatedBy = req.user._id;
    await material.save();

    // Create notification
    try {
      await notifyMaterialDelete(material, req.user._id);
    } catch (notifError) {
      logger.error("Failed to create notification:", notifError);
    }

    res.status(200).json({
      success: true,
      message: "Xom ashyo muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    logger.error("Delete material error:", error);
    res.status(500).json({
      success: false,
      message: "Xom ashyoni o'chirishda xatolik yuz berdi",
    });
  }
};

// Get material summary
export const getMaterialSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = { deletedAt: null };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const [totalIntakes, totalWeight, totalBags, suppliers] = await Promise.all(
      [
        RawMaterialIntake.countDocuments(query),
        RawMaterialIntake.aggregate([
          { $match: query },
          { $group: { _id: null, total: { $sum: "$totalWeightKg" } } },
        ]),
        RawMaterialIntake.aggregate([
          { $match: query },
          { $group: { _id: null, total: { $sum: "$totalBags" } } },
        ]),
        RawMaterialIntake.aggregate([
          { $match: query },
          { $group: { _id: "$supplier" } },
          { $count: "count" },
        ]),
      ]
    );

    const summary = {
      totalIntakes,
      totalWeight: totalWeight[0]?.total || 0,
      totalBags: totalBags[0]?.total || 0,
      uniqueSuppliers: suppliers[0]?.count || 0,
      averageWeightPerIntake:
        totalIntakes > 0 ? (totalWeight[0]?.total || 0) / totalIntakes : 0,
      averageBagsPerIntake:
        totalIntakes > 0 ? (totalBags[0]?.total || 0) / totalIntakes : 0,
    };

    res.status(200).json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    logger.error("Get material summary error:", error);
    res.status(500).json({
      success: false,
      message: "Xom ashyo statistikasini olishda xatolik yuz berdi",
    });
  }
};

// Get materials by supplier
export const getMaterialsBySupplier = async (req, res) => {
  try {
    const { supplier } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const [materials, total] = await Promise.all([
      RawMaterialIntake.find({
        supplier: { $regex: supplier, $options: "i" },
        deletedAt: null,
      })
        .populate("createdBy", "fullName")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RawMaterialIntake.countDocuments({
        supplier: { $regex: supplier, $options: "i" },
        deletedAt: null,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        data: materials,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Get materials by supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Yetkazib beruvchi bo'yicha xom ashyolarni olishda xatolik yuz berdi",
    });
  }
};

// Get recent materials
export const getRecentMaterials = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const materials = await RawMaterialIntake.find({ deletedAt: null })
      .populate("createdBy", "fullName")
      .sort({ date: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: { materials },
    });
  } catch (error) {
    logger.error("Get recent materials error:", error);
    res.status(500).json({
      success: false,
      message: "So'nggi xom ashyolarni olishda xatolik yuz berdi",
    });
  }
};

// Get suppliers list
export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await RawMaterialIntake.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: "$supplier" } },
      { $sort: { _id: 1 } },
    ]);

    const supplierList = suppliers.map((s) => s._id);

    res.status(200).json({
      success: true,
      data: { suppliers: supplierList },
    });
  } catch (error) {
    logger.error("Get suppliers error:", error);
    res.status(500).json({
      success: false,
      message: "Yetkazib beruvchilarni olishda xatolik yuz berdi",
    });
  }
};

// Get thread suggestions (Ip turi va Ip raqami)
export const getThreadSuggestions = async (req, res) => {
  try {
    const { type, search } = req.query;

    if (!type || !["THREAD_TYPE", "THREAD_NUMBER"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type parametri kerak (THREAD_TYPE yoki THREAD_NUMBER)",
      });
    }

    const suggestions = await ThreadSuggestion.getSuggestions(type, search);

    res.status(200).json({
      success: true,
      data: { suggestions: suggestions.map(s => s.value) },
    });
  } catch (error) {
    logger.error("Get thread suggestions error:", error);
    res.status(500).json({
      success: false,
      message: "Takliflarni olishda xatolik yuz berdi",
    });
  }
};

// Get available materials for batch creation (Ip turlari va raqamlari)
export const getAvailableMaterials = async (req, res) => {
  try {
    const { threadType } = req.query;

    // Get all available materials with weight > 0
    const query = {
      deletedAt: null,
      totalWeightKg: { $gt: 0 }
    };

    if (threadType) {
      query.threadType = threadType;
    }

    const materials = await RawMaterialIntake.find(query)
      .select("threadType threadNumber totalWeightKg")
      .sort({ threadType: 1, threadNumber: 1 })
      .lean();

    // Group by threadType for cascading select
    const threadTypes = [...new Set(materials.map(m => m.threadType))];

    // Get thread numbers for selected threadType (or all if not selected)
    const threadNumbers = materials.map(m => ({
      threadType: m.threadType,
      threadNumber: m.threadNumber,
      availableWeight: m.totalWeightKg,
    }));

    res.status(200).json({
      success: true,
      data: {
        threadTypes,
        threadNumbers,
        materials
      },
    });
  } catch (error) {
    logger.error("Get available materials error:", error);
    res.status(500).json({
      success: false,
      message: "Mavjud xom ashyolarni olishda xatolik yuz berdi",
    });
  }
};
