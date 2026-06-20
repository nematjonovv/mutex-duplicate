import DyeingLot from "../models/DyeingLot.js";
import SendToDyehouse from "../models/SendToDyehouse.js";
import Dyehouse from "../models/Dyehouse.js";
import { logger } from "../config/logger.js";
import { z } from "zod";

// Validation schemas
const createDyeingLotSchema = z.object({
  name: z.string().min(1, "Nom talab qilinadi").max(200, "Nom 200 ta belgidan oshmasligi kerak"),
  colorName: z.string().min(1, "Rang nomi talab qilinadi").max(100, "Rang nomi 100 ta belgidan oshmasligi kerak"),
  colorCode: z.string().max(50, "Rang kodi 50 ta belgidan oshmasligi kerak").optional(),
  weightKg: z.number().positive("Vazn musbat bo'lishi kerak"),
  date: z.string().datetime("Sana noto'g'ri formatda").optional(),
  comment: z.string().max(1000, "Izoh 1000 ta belgidan oshmasligi kerak").optional(),
  batchCode: z.string().min(1, "Partiya kodi talab qilinadi").max(50, "Partiya kodi 50 ta belgidan oshmasligi kerak"),
});

const updateDyeingLotSchema = z.object({
  name: z.string().min(1, "Nom talab qilinadi").max(200, "Nom 200 ta belgidan oshmasligi kerak").optional(),
  colorName: z.string().min(1, "Rang nomi talab qilinadi").max(100, "Rang nomi 100 ta belgidan oshmasligi kerak").optional(),
  colorCode: z.string().max(50, "Rang kodi 50 ta belgidan oshmasligi kerak").optional(),
  weightKg: z.number().positive("Vazn musbat bo'lishi kerak").optional(),
  date: z.string().datetime("Sana noto'g'ri formatda").optional(),
  comment: z.string().max(1000, "Izoh 1000 ta belgidan oshmasligi kerak").optional(),
});

const createSendToDyehouseSchema = z.object({
  dyehouseId: z.string().min(1, "Bo'yoqxona ID si talab qilinadi"),
  productName: z.string().min(1, "Mahsulot nomi talab qilinadi").max(200, "Mahsulot nomi 200 ta belgidan oshmasligi kerak"),
  weightKg: z.number().positive("Vazn musbat bo'lishi kerak"),
  date: z.string().datetime("Sana noto'g'ri formatda").optional(),
  comment: z.string().max(1000, "Izoh 1000 ta belgidan oshmasligi kerak").optional(),
});

const updateSendToDyehouseSchema = z.object({
  productName: z.string().min(1, "Mahsulot nomi talab qilinadi").max(200, "Mahsulot nomi 200 ta belgidan oshmasligi kerak").optional(),
  weightKg: z.number().positive("Vazn musbat bo'lishi kerak").optional(),
  date: z.string().datetime("Sana noto'g'ri formatda").optional(),
  comment: z.string().max(1000, "Izoh 1000 ta belgidan oshmasligi kerak").optional(),
});

const paginationSchema = z.object({
  page: z.preprocess((val) => val === undefined ? "1" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1)).default(1)),
  limit: z.preprocess((val) => val === undefined ? "10" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1).max(2000)).default(10)),
  search: z.string().optional(),
  dyehouseId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Generate batch code
const generateBatchCode = async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  // Get count of batches for today
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  const count = await DyeingLot.countDocuments({
    createdAt: { $gte: startOfDay, $lt: endOfDay }
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `PART-${year}${month}${day}-${sequence}`;
};

// Get all dyeing lots with pagination and filters
export const getDyeingLots = async (req, res) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const { page, limit, search, startDate, endDate } = validatedQuery;

    // Build query
    const query = { deletedAt: null };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { colorName: { $regex: search, $options: "i" } },
        { colorCode: { $regex: search, $options: "i" } },
        { batchCode: { $regex: search, $options: "i" } },
        { comment: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute query
    const [dyeingLots, total] = await Promise.all([
      DyeingLot.find(query)
        .populate("createdBy", "fullName")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DyeingLot.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        data: dyeingLots,
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

    logger.error("Get dyeing lots error:", error);
    res.status(500).json({
      success: false,
      message: "Bo'yash partiyalarini yuklashda xatolik yuz berdi",
    });
  }
};

// Get dyeing lot by ID
export const getDyeingLotById = async (req, res) => {
  try {
    const { id } = req.params;

    const dyeingLot = await DyeingLot.findById(id)
      .populate("createdBy", "fullName")
      .lean();

    if (!dyeingLot || dyeingLot.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Bo'yash partiyasi topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      data: { dyeingLot },
    });
  } catch (error) {
    logger.error("Get dyeing lot by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Bo'yash partiyasini yuklashda xatolik yuz berdi",
    });
  }
};

// Create new dyeing lot
export const createDyeingLot = async (req, res) => {
  try {
    const validatedData = createDyeingLotSchema.parse(req.body);

    // Generate batch code if not provided
    let batchCode = validatedData.batchCode;
    if (!batchCode) {
      batchCode = await generateBatchCode();
    }

    // Create dyeing lot
    const dyeingLot = new DyeingLot({
      ...validatedData,
      batchCode,
      date: validatedData.date ? new Date(validatedData.date) : new Date(),
      createdBy: req.user._id,
    });

    await dyeingLot.save();

    // Populate creator info for response
    await dyeingLot.populate("createdBy", "fullName");

    res.status(201).json({
      success: true,
      message: "Bo'yash partiyasi muvaffaqiyatli yaratildi",
      data: { dyeingLot },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatoligi",
        errors: error.errors,
      });
    }

    logger.error("Create dyeing lot error:", error);
    res.status(500).json({
      success: false,
      message: "Bo'yash partiyasini yaratishda xatolik yuz berdi",
    });
  }
};

// Update dyeing lot
export const updateDyeingLot = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateDyeingLotSchema.parse(req.body);

    // Find dyeing lot
    const dyeingLot = await DyeingLot.findById(id);
    if (!dyeingLot || dyeingLot.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Bo'yash partiyasi topilmadi",
      });
    }

    // Update dyeing lot
    Object.assign(dyeingLot, validatedData, {
      date: validatedData.date ? new Date(validatedData.date) : dyeingLot.date,
      updatedBy: req.user._id,
    });

    await dyeingLot.save();

    // Populate creator info for response
    await dyeingLot.populate("createdBy", "fullName");

    res.status(200).json({
      success: true,
      message: "Bo'yash partiyasi muvaffaqiyatli yangilandi",
      data: { dyeingLot },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatoligi",
        errors: error.errors,
      });
    }

    logger.error("Update dyeing lot error:", error);
    res.status(500).json({
      success: false,
      message: "Bo'yash partiyasini yangilashda xatolik yuz berdi",
    });
  }
};

// Delete dyeing lot (soft delete)
export const deleteDyeingLot = async (req, res) => {
  try {
    const { id } = req.params;

    const dyeingLot = await DyeingLot.findById(id);
    if (!dyeingLot || dyeingLot.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Bo'yash partiyasi topilmadi",
      });
    }

    // Soft delete
    dyeingLot.deletedAt = new Date();
    dyeingLot.updatedBy = req.user._id;
    await dyeingLot.save();

    res.status(200).json({
      success: true,
      message: "Bo'yash partiyasi muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    logger.error("Delete dyeing lot error:", error);
    res.status(500).json({
      success: false,
      message: "Bo'yash partiyasini o'chirishda xatolik yuz berdi",
    });
  }
};

// Get all send to dyehouse records
export const getSendToDyehouse = async (req, res) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const { page, limit, search, dyehouseId, startDate, endDate } = validatedQuery;

    // Build query
    const query = { deletedAt: null };
    
    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: "i" } },
        { batchCode: { $regex: search, $options: "i" } },
        { comment: { $regex: search, $options: "i" } },
      ];
    }

    if (dyehouseId) {
      query.dyehouseId = dyehouseId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute query
    const [sendToDyehouse, total] = await Promise.all([
      SendToDyehouse.find(query)
        .populate("dyehouseId", "name ownerName")
        .populate("createdBy", "fullName")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SendToDyehouse.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        data: sendToDyehouse,
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

    logger.error("Get send to dyehouse error:", error);
    res.status(500).json({
      success: false,
      message: "Bo'yoqxonaga yuborilgan yozuvlarni yuklashda xatolik yuz berdi",
    });
  }
};

// Get send to dyehouse by ID
export const getSendToDyehouseById = async (req, res) => {
  try {
    const { id } = req.params;

    const sendToDyehouse = await SendToDyehouse.findById(id)
      .populate("dyehouseId", "name ownerName phone address")
      .populate("createdBy", "fullName")
      .lean();

    if (!sendToDyehouse || sendToDyehouse.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Bo'yoqxonaga yuborilgan yozuv topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      data: { sendToDyehouse },
    });
  } catch (error) {
    logger.error("Get send to dyehouse by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Bo'yoqxonaga yuborilgan yozuvni yuklashda xatolik yuz berdi",
    });
  }
};

// Create new send to dyehouse record
export const createSendToDyehouse = async (req, res) => {
  try {
    const validatedData = createSendToDyehouseSchema.parse(req.body);

    // Check if dyehouse exists
    const dyehouse = await Dyehouse.findById(validatedData.dyehouseId);
    if (!dyehouse || dyehouse.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Bo'yoqxona topilmadi",
      });
    }

    // Generate batch code
    const batchCode = await generateBatchCode();

    // Create send to dyehouse record
    const sendToDyehouse = new SendToDyehouse({
      ...validatedData,
      batchCode,
      date: validatedData.date ? new Date(validatedData.date) : new Date(),
      createdBy: req.user._id,
    });

    await sendToDyehouse.save();

    // Populate related info for response
    await sendToDyehouse.populate("dyehouseId", "name ownerName");
    await sendToDyehouse.populate("createdBy", "fullName");

    res.status(201).json({
      success: true,
      message: "Bo'yoqxonaga yuborish yozuvi muvaffaqiyatli yaratildi",
      data: { sendToDyehouse },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatoligi",
        errors: error.errors,
      });
    }

    logger.error("Create send to dyehouse error:", error);
    res.status(500).json({
      success: false,
      message: "Bo'yoqxonaga yuborish yozuvini yaratishda xatolik yuz berdi",
    });
  }
};

// Update send to dyehouse record
export const updateSendToDyehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateSendToDyehouseSchema.parse(req.body);

    // Find send to dyehouse record
    const sendToDyehouse = await SendToDyehouse.findById(id);
    if (!sendToDyehouse || sendToDyehouse.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Bo'yoqxonaga yuborilgan yozuv topilmadi",
      });
    }

    // Update send to dyehouse record
    Object.assign(sendToDyehouse, validatedData, {
      date: validatedData.date ? new Date(validatedData.date) : sendToDyehouse.date,
      updatedBy: req.user._id,
    });

    await sendToDyehouse.save();

    // Populate related info for response
    await sendToDyehouse.populate("dyehouseId", "name ownerName");
    await sendToDyehouse.populate("createdBy", "fullName");

    res.status(200).json({
      success: true,
      message: "Bo'yoqxonaga yuborish yozuvi muvaffaqiyatli yangilandi",
      data: { sendToDyehouse },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatoligi",
        errors: error.errors,
      });
    }

    logger.error("Update send to dyehouse error:", error);
    res.status(500).json({
      success: false,
      message: "Bo'yoqxonaga yuborish yozuvini yangilashda xatolik yuz berdi",
    });
  }
};

// Delete send to dyehouse record (soft delete)
export const deleteSendToDyehouse = async (req, res) => {
  try {
    const { id } = req.params;

    const sendToDyehouse = await SendToDyehouse.findById(id);
    if (!sendToDyehouse || sendToDyehouse.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Bo'yoqxonaga yuborish yozuvi topilmadi",
      });
    }

    // Soft delete
    sendToDyehouse.deletedAt = new Date();
    sendToDyehouse.updatedBy = req.user._id;
    await sendToDyehouse.save();

    res.status(200).json({
      success: true,
      message: "Bo'yoqxonaga yuborish yozuvi muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    logger.error("Delete send to dyehouse error:", error);
    res.status(500).json({
      success: false,
      message: "Bo'yoqxonaga yuborish yozuvini o'chirishda xatolik yuz berdi",
    });
  }
};

// Get dyeing summary
export const getDyeingSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = { deletedAt: null };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const [totalLots, totalWeight, totalSendToDyehouse, totalSendWeight] = await Promise.all([
      DyeingLot.countDocuments(query),
      DyeingLot.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$weightKg" } } },
      ]),
      SendToDyehouse.countDocuments(query),
      SendToDyehouse.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$weightKg" } } },
      ]),
    ]);

    const summary = {
      totalLots,
      totalWeight: totalWeight[0]?.total || 0,
      totalSendToDyehouse,
      totalSendWeight: totalSendWeight[0]?.total || 0,
      averageWeightPerLot: totalLots > 0 ? (totalWeight[0]?.total || 0) / totalLots : 0,
      averageWeightPerSend: totalSendToDyehouse > 0 ? (totalSendWeight[0]?.total || 0) / totalSendToDyehouse : 0,
    };

    res.status(200).json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    logger.error("Get dyeing summary error:", error);
    res.status(500).json({
      success: false,
      message: "Bo'yash hisobotini yuklashda xatolik yuz berdi",
    });
  }
};

// Get recent dyeing activities
export const getRecentDyeingActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const [dyeingLots, sendToDyehouse] = await Promise.all([
      DyeingLot.find({ deletedAt: null })
        .populate("createdBy", "fullName")
        .sort({ date: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .lean(),
      SendToDyehouse.find({ deletedAt: null })
        .populate("dyehouseId", "name")
        .populate("createdBy", "fullName")
        .sort({ date: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: { dyeingLots, sendToDyehouse },
    });
  } catch (error) {
    logger.error("Get recent dyeing activities error:", error);
    res.status(500).json({
      success: false,
      message: "So'nggi bo'yash faoliyatini yuklashda xatolik yuz berdi",
    });
  }
};
