import DyehouseProcess from '../models/DyehouseProcess.js';
import SoftHank from '../models/SoftHank.js';
import { logger } from '../config/logger.js';
import { z } from 'zod';

const paginationSchema = z.object({
  page: z.preprocess((val) => val === undefined ? "1" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1)).default(1)),
  limit: z.preprocess((val) => val === undefined ? "10" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1).max(2000)).default(10)),
  search: z.string().optional(),
  _id: z.string().optional(),
  softHankId: z.string().optional(),
  batch: z.string().optional(),
});

const createDyehouseProcessSchema = z.object({
  name: z.string().min(1, "Nomi talab qilinadi"),
  color: z.string().min(1, "Rang talab qilinadi"),
  colorCode: z.string().min(1, "Rang kodi talab qilinadi"),
  weight: z.number().min(0.001, "Vazn musbat bo'lishi kerak"),
  date: z.string().datetime("Sana noto'g'ri formatda").optional(),
  comment: z.string().optional(),
  softHankId: z.string().optional(),
});

export const getDyehouseProcesses = async (req, res) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const { page, limit, search, _id, softHankId } = validatedQuery;

    // Build query
    const query = { deletedAt: null };
    if (_id) {
      query._id = _id;
    }
    if (softHankId) {
      query.softHankId = softHankId;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { color: { $regex: search, $options: 'i' } },
        { colorCode: { $regex: search, $options: 'i' } },
        { batch: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute query
    const [processes, total] = await Promise.all([
      DyehouseProcess.find(query)
        .populate('createdBy', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DyehouseProcess.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        data: processes,
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
    logger.error('Get dyehouse processes error:', error);
    res.status(500).json({ success: false, message: "Bo'yoqxona jarayonlarini olishda xatolik" });
  }
};

export const createDyehouseProcess = async (req, res) => {
  try {
    const validatedData = createDyehouseProcessSchema.parse(req.body);
    const { softHankId, ...rest } = validatedData;

    let softHank = null;
    if (softHankId) {
      softHank = await SoftHank.findById(softHankId);
      if (!softHank || softHank.deletedAt) {
        return res
          .status(404)
          .json({ success: false, message: "Yumshoq motka topilmadi" });
      }
    }

    let batch = `JAR-${Date.now()}-B`;
    if (softHank && softHank.batchNumber) {
      // If softHank batch is B-YYMMDD-XXX, change to YYMMDD-XXX-B
      if (softHank.batchNumber.startsWith('B-')) {
        batch = `${softHank.batchNumber.substring(2)}-B`;
      } else {
        batch = `${softHank.batchNumber}-B`;
      }
    }

    // Ensure batch uniqueness
    let finalBatch = batch;
    let counter = 1;
    while (await DyehouseProcess.findOne({ batch: finalBatch })) {
      finalBatch = `${batch}-${counter}`;
      counter++;
    }
    batch = finalBatch;

    const dyehouseProcess = new DyehouseProcess({
      ...rest,
      batch,
      softHankId,
      createdBy: req.user._id,
    });
    await dyehouseProcess.save();

    if (softHank) {
      // Check if requested weight exceeds available weight
      if (rest.weight > softHank.weight) {
        return res.status(400).json({
          success: false,
          message: `Og'irlik yetarli emas! Mavjud: ${softHank.weight} kg, So'ralgan: ${rest.weight} kg`
        });
      }

      // Deduct weight
      softHank.weight -= rest.weight;

      // If all weight is transferred, mark as deleted
      if (softHank.weight <= 0.001) { // Using small epsilon for float safety
        softHank.deletedAt = new Date();
      }

      await softHank.save();
    }

    res.status(201).json({ success: true, message: "Bo'yoqxona jarayoni muvaffaqiyatli yaratildi", data: { dyehouseProcess } });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatosi",
        errors: error.errors,
      });
    }
    logger.error('Create dyehouse process error:', error);
    res.status(500).json({ success: false, message: "Bo'yoqxona jarayonini yaratishda xatolik" });
  }
};

const updateDyehouseProcessSchema = z.object({
  name: z.string().optional(),
  color: z.string().optional(),
  colorCode: z.string().optional(),
  weight: z.number().optional(),
  date: z.string().datetime().optional(),
  comment: z.string().optional(),
});

export const updateDyehouseProcess = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateDyehouseProcessSchema.parse(req.body);
    const { weight: newWeight, ...rest } = validatedData;

    const process = await DyehouseProcess.findById(id);
    if (!process || process.deletedAt) {
      return res.status(404).json({ success: false, message: "Jarayon topilmadi" });
    }

    // Handle weight change and inventory sync
    if (newWeight !== undefined && newWeight !== process.weight) {
      if (process.softHankId) {
        const softHank = await SoftHank.findById(process.softHankId);
        if (softHank) {
          const weightDiff = newWeight - process.weight; // Positive means we take more from softHank

          if (weightDiff > softHank.weight) {
            return res.status(400).json({
              success: false,
              message: `Yumshoq motkada yetarli vazn yo'q! Mavjud: ${softHank.weight} kg, Qo'shimcha so'ralgan: ${weightDiff} kg`
            });
          }

          softHank.weight -= weightDiff;

          // Sync deletedAt status
          if (softHank.weight <= 0.001) {
            softHank.deletedAt = new Date();
          } else {
            softHank.deletedAt = null; // Re-activate if weight was returned
          }
          await softHank.save();
        }
      }
      process.weight = newWeight;
    }

    // Update other fields
    Object.assign(process, rest);
    await process.save();

    res.status(200).json({ success: true, message: "Jarayon yangilandi", data: { dyehouseProcess: process } });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatosi",
        errors: error.errors,
      });
    }
    logger.error('Update dyehouse process error:', error);
    res.status(500).json({ success: false, message: "Bo'yoqxona jarayonini yangilashda xatolik" });
  }
};

export const deleteDyehouseProcess = async (req, res) => {
  try {
    const { id } = req.params;
    const process = await DyehouseProcess.findById(id);

    if (!process || process.deletedAt) {
      return res.status(404).json({ success: false, message: "Jarayon topilmadi" });
    }

    // Return weight to SoftHank if possible
    if (process.softHankId) {
      const softHank = await SoftHank.findById(process.softHankId);
      if (softHank) {
        softHank.weight += process.weight;
        softHank.deletedAt = null; // Restore if it was deleted
        await softHank.save();
      }
    }

    process.deletedAt = new Date();
    await process.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('stock:updated');
    }

    res.status(200).json({ success: true, message: "Jarayon o'chirildi" });
  } catch (error) {
    logger.error('Delete dyehouse process error:', error);
    res.status(500).json({ success: false, message: "Bo'yoqxona jarayonini o'chirishda xatolik" });
  }
};
