import HardHank from "../models/HardHank.js";
import DyehouseProcess from "../models/DyehouseProcess.js";
import { logger } from "../config/logger.js";
import { z } from "zod";

const paginationSchema = z.object({
  page: z.preprocess((val) => val === undefined ? "1" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1)).default(1)),
  limit: z.preprocess((val) => val === undefined ? "10" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1).max(2000)).default(10)),
  search: z.string().optional(),
});

const createHardHankSchema = z.object({
  dyehouseProcessId: z.string(),
  name: z.string(),
  color: z.string(),
  colorCode: z.string(),
  weight: z.number(),
  comment: z.string().optional(),
  batchNumber: z.string().optional(),
});

export const getHardHanks = async (req, res) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const { page, limit, search, dyehouseProcessId } = validatedQuery;

    // Build query
    const query = { deletedAt: null };
    if (dyehouseProcessId) {
      query.dyehouseProcessId = dyehouseProcessId;
    }
    if (validatedQuery.dyehouseBatch) {
      query.dyehouseBatch = validatedQuery.dyehouseBatch;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { color: { $regex: search, $options: "i" } },
        { colorCode: { $regex: search, $options: "i" } },
        { batch: { $regex: search, $options: "i" } },
        { batchNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute query
    const [hardHanks, total] = await Promise.all([
      HardHank.find(query)
        .populate("createdBy", "fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HardHank.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        data: hardHanks,
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
    logger.error("Get hard hanks error:", error);
    res
      .status(500)
      .json({ success: false, message: "Qattiq motkalarni olishda xatolik" });
  }
};

export const createHardHank = async (req, res) => {
  try {
    const validatedData = createHardHankSchema.parse(req.body);
    const { dyehouseProcessId, batchNumber, ...rest } = validatedData;

    const dyehouseProcess = await DyehouseProcess.findById(dyehouseProcessId);
    if (!dyehouseProcess) {
      return res
        .status(404)
        .json({ success: false, message: "Bo'yoqxona jarayoni topilmadi" });
    }

    if (rest.weight > dyehouseProcess.weight) {
      return res.status(400).json({
        success: false,
        message: `Vazn yetarli emas! Jarayonda mavjud: ${dyehouseProcess.weight} kg, so'ralgan: ${rest.weight} kg`,
      });
    }

    // Optional soft hank batch trace
    let softHankBatch = undefined;
    if (dyehouseProcess.softHankId) {
      try {
        const SoftHank = (await import("../models/SoftHank.js")).default;
        const softHank = await SoftHank.findById(dyehouseProcess.softHankId);
        softHankBatch = softHank?.batchNumber;
      } catch {}
    }

    const hardHank = new HardHank({
      ...rest,
      dyehouseProcessId,
      batch: dyehouseProcess.batch,
      batchNumber: batchNumber || `${dyehouseProcess.batch}-H`,
      softHankBatch,
      dyehouseBatch: dyehouseProcess.batch,
      softHankDate: dyehouseProcess.createdAt, // This is an approximation
      dyehouseDate: dyehouseProcess.date,
      createdBy: req.user._id,
    });
    await hardHank.save();

    // Decrease source dyehouse process weight; delete only if fully consumed
    dyehouseProcess.weight -= rest.weight;
    if (dyehouseProcess.weight <= 0.001) {
      dyehouseProcess.deletedAt = new Date();
    } else {
      dyehouseProcess.deletedAt = null;
    }
    await dyehouseProcess.save();

    res
      .status(201)
      .json({
        success: true,
        message: "Qattiq motka muvaffaqiyatli yaratildi",
        data: { hardHank },
      });
  } catch (error) {
    logger.error("Create hard hank error:", error);
    res
      .status(500)
      .json({ success: false, message: "Qattiq motka yaratishda xatolik" });
  }
};

export const updateHardHank = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, colorCode, weight, comment, batchNumber } = req.body;

    const hardHank = await HardHank.findById(id);
    if (!hardHank) {
      return res.status(404).json({ success: false, message: "Qattiq motka topilmadi" });
    }

    if (name) hardHank.name = name;
    if (color) hardHank.color = color;
    if (colorCode) hardHank.colorCode = colorCode;
    if (weight) hardHank.weight = weight;
    if (comment !== undefined) hardHank.comment = comment;
    if (batchNumber) hardHank.batchNumber = batchNumber;

    await hardHank.save();

    res.json({ success: true, data: hardHank });
  } catch (error) {
    logger.error("Update hard hank error:", error);
    res.status(500).json({ success: false, message: "Qattiq motkani yangilashda xatolik" });
  }
};

export const deleteHardHank = async (req, res) => {
  try {
    const { id } = req.params;

    const hardHank = await HardHank.findById(id);
    if (!hardHank) {
      return res
        .status(404)
        .json({ success: false, message: "Qattiq motka topilmadi" });
    }

    hardHank.deletedAt = new Date();
    await hardHank.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('stock:updated');
    }

    res.status(200).json({
      success: true,
      message: "Qattiq motka muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    logger.error("Delete hard hank error:", error);
    res
      .status(500)
      .json({ success: false, message: "Qattiq motkani o'chirishda xatolik" });
  }
};
const createBulkHardHankSchema = z.object({
  items: z.array(z.object({
    dyehouseProcessId: z.string(),
    name: z.string(),
    color: z.string(),
    colorCode: z.string(),
    weight: z.number(),
    comment: z.string().optional(),
    batchNumber: z.string().optional(),
  })),
});

export const createBulkHardHank = async (req, res) => {
  try {
    const validatedData = createBulkHardHankSchema.parse(req.body);
    const { items } = validatedData;
    const results = [];

    for (const item of items) {
      const { dyehouseProcessId, batchNumber, ...rest } = item;
      const dyehouseProcess = await DyehouseProcess.findById(dyehouseProcessId);

      if (!dyehouseProcess || dyehouseProcess.deletedAt) {
        continue; // Skip if not found or already moved
      }

      if (rest.weight > dyehouseProcess.weight) {
        continue;
      }

      // Optional soft hank batch trace
      let softHankBatch = undefined;
      if (dyehouseProcess.softHankId) {
        try {
          const SoftHank = (await import("../models/SoftHank.js")).default;
          const softHank = await SoftHank.findById(dyehouseProcess.softHankId);
          softHankBatch = softHank?.batchNumber;
        } catch {}
      }

      const hardHank = new HardHank({
        ...rest,
        batch: dyehouseProcess.batch,
        batchNumber: batchNumber || `${dyehouseProcess.batch}-H`,
        softHankBatch,
        dyehouseBatch: dyehouseProcess.batch,
        softHankDate: dyehouseProcess.createdAt,
        dyehouseDate: dyehouseProcess.date,
        createdBy: req.user._id,
      });
      await hardHank.save();

      dyehouseProcess.weight -= rest.weight;
      if (dyehouseProcess.weight <= 0.001) {
        dyehouseProcess.deletedAt = new Date();
      } else {
        dyehouseProcess.deletedAt = null;
      }
      await dyehouseProcess.save();
      results.push(hardHank);
    }

    res.status(201).json({
      success: true,
      message: `${results.length} ta element muvaffaqiyatli o'tkazildi`,
      data: { count: results.length }
    });
  } catch (error) {
    logger.error("Create bulk hard hank error:", error);
    res.status(500).json({ success: false, message: "Ommaviy o'tkazishda xatolik yuz berdi" });
  }
};
