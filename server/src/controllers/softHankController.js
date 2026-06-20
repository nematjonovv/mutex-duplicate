import SoftHank from "../models/SoftHank.js";
import SmallBaseTransfer from "../models/SmallBaseTransfer.js";
import { logger } from "../config/logger.js";
import { notifySoftHankDelete } from "../utils/notificationHelper.js";
import { z } from "zod";
const paginationSchema = z.object({
  page: z.preprocess((val) => val === undefined ? "1" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1)).default(1)),
  limit: z.preprocess((val) => val === undefined ? "10" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1).max(2000)).default(10)),
  search: z.string().optional(),
  _id: z.string().optional(),
  batchNumber: z.string().optional(),
});

const createSoftHankSchema = z.object({
  dyehouseName: z.string(),
  rawMaterialName: z.string(),
  weight: z.number(),
  comment: z.string().optional(),
  date: z.string().datetime(),
  smallBaseTransferId: z.string().optional(),
  batchNumber: z.string().optional(),
});

const createBulkSoftHankSchema = z.object({
  dyehouseName: z.string(),
  date: z.string().datetime(),
  batchNumber: z.string().optional(),
  comment: z.string().optional(),
  items: z.array(z.object({
    materialId: z.string().optional(),
    smallBaseTransferId: z.string().optional(),
    rawMaterialName: z.string(),
    weight: z.number(),
  })),
});

const updateSoftHankSchema = z.object({
  dyehouseName: z.string().optional(),
  materialId: z.string().optional(),
  rawMaterialName: z.string().optional(),
  weight: z.number().optional(),
  comment: z.string().optional(),
  date: z.string().datetime().optional(),
});

export const getSoftHanks = async (req, res) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const { page, limit, search, _id } = validatedQuery;

    const query = { deletedAt: null };
    if (_id) {
      query._id = _id;
    }
    if (search) {
      query.$or = [
        { dyehouseName: { $regex: search, $options: "i" } },
        { rawMaterialName: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [softHanks, total] = await Promise.all([
      SoftHank.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SoftHank.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        data: softHanks,
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
    logger.error("Get soft hanks error:", error);
    res
      .status(500)
      .json({ success: false, message: "Yumshoq motkalarni olishda xatolik" });
  }
};

export const createSoftHank = async (req, res) => {
  try {
    const validatedData = createSoftHankSchema.parse(req.body);
    const { smallBaseTransferId, weight, ...rest } = validatedData;

    // Check if batch number already exists
    if (rest.batchNumber) {
      const existingSoftHank = await SoftHank.findOne({ batchNumber: rest.batchNumber });
      if (existingSoftHank) {
        return res.status(400).json({
          success: false,
          message: `Partiya raqami allaqachon mavjud: ${rest.batchNumber}`,
        });
      }
    }

    let transfer = null;
    if (smallBaseTransferId) {
      transfer = await SmallBaseTransfer.findById(smallBaseTransferId);
      if (!transfer || transfer.deletedAt) {
        return res
          .status(404)
          .json({ success: false, message: "Kichik bazadan o'tkazish topilmadi" });
      }

      // Check if weight exceeds available weight
      if (weight > transfer.weightKg) {
        return res.status(400).json({
          success: false,
          message: `Og'irlik ${transfer.weightKg} kg dan oshmasligi kerak!`,
        });
      }

      // Reduce the transfer weight (partial transfer support)
      transfer.weightKg -= weight;

      // If all weight is transferred, mark as deleted
      if (transfer.weightKg <= 0) {
        transfer.deletedAt = new Date();
      }

      await transfer.save();
    }

    const softHank = new SoftHank({
      ...rest,
      weight,
      createdBy: req.user._id,
    });
    await softHank.save();

    res
      .status(201)
      .json({
        success: true,
        message: "Yumshoq motka muvaffaqiyatli yaratildi",
        data: { softHank },
      });
  } catch (error) {
    logger.error("Create soft hank error:", error);
    res
      .status(500)
      .json({ success: false, message: "Yumshoq motka yaratishda xatolik" });
  }
};

export const createBulkSoftHank = async (req, res) => {
  try {
    const validatedData = createBulkSoftHankSchema.parse(req.body);
    const { dyehouseName, date, batchNumber, comment, items } = validatedData;

    const createdSoftHanks = [];
    const updatedTransfers = [];

    // Auto-generate batch number if not provided
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const rand = Math.floor(100 + Math.random() * 900);
    const baseBatchNumber = batchNumber || `B-${yy}${mm}${dd}-${rand}`;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Determine unique batch number for this item
      let currentBatchNumber = baseBatchNumber;
      if (items.length > 1) {
        currentBatchNumber = `${baseBatchNumber}-${i + 1}`;
      }

      // Check for uniqueness
      const existingBatch = await SoftHank.findOne({ batchNumber: currentBatchNumber });
      if (existingBatch) {
        return res.status(400).json({ 
          success: false, 
          message: `Partiya raqami allaqachon mavjud: ${currentBatchNumber}. Iltimos, boshqattan urinib ko'ring.` 
        });
      }

      // Find all available transfers for this material to consume weight from
      const transfers = await SmallBaseTransfer.find({
        materialId: item.materialId || item.smallBaseTransferId, // Support both specific ID or materialId
        deletedAt: null
      }).sort({ dateTime: 1 }); // FIFO consumption

      if (transfers.length === 0) {
        return res.status(404).json({ success: false, message: `Xom ashyo topilmadi: ${item.rawMaterialName}` });
      }

      const totalAvailable = transfers.reduce((sum, t) => sum + t.weightKg, 0);
      if (item.weight > totalAvailable) {
        return res.status(400).json({
          success: false,
          message: `${item.rawMaterialName} uchun jami og'irlik ${totalAvailable} kg dan oshmasligi kerak!`,
        });
      }

      let remainingToDeduct = item.weight;
      for (const transfer of transfers) {
        if (remainingToDeduct <= 0) break;

        const deduction = Math.min(transfer.weightKg, remainingToDeduct);
        transfer.weightKg -= deduction;
        remainingToDeduct -= deduction;

        if (transfer.weightKg <= 0) {
          transfer.deletedAt = new Date();
        }
        updatedTransfers.push(transfer);
      }

      const softHank = new SoftHank({
        dyehouseName,
        date,
        batchNumber: currentBatchNumber,
        comment,
        materialId: item.materialId || transfers[0].materialId,
        rawMaterialName: item.rawMaterialName,
        weight: item.weight,
        smallBaseTransferId: transfers[0]._id, // Associate with the first transfer record for reference
        createdBy: req.user._id,
      });
      createdSoftHanks.push(softHank);
    }

    // Save all changes
    await Promise.all([
      ...updatedTransfers.map(t => t.save()),
      ...createdSoftHanks.map(s => s.save())
    ]);

    res.status(201).json({
      success: true,
      message: `${createdSoftHanks.length} ta yumshoq motka muvaffaqiyatli yaratildi`,
      data: { softHanks: createdSoftHanks },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    logger.error("Create bulk soft hank error:", error);
    res
      .status(500)
      .json({ success: false, message: "Kichik bazadan o'tkazishda xatolik yuz berdi" });
  }
};

export const deleteSoftHank = async (req, res) => {
  try {
    const { id } = req.params;

    const softHank = await SoftHank.findById(id);
    if (!softHank) {
      return res
        .status(404)
        .json({ success: false, message: "Soft hank topilmadi" });
    }

    // Return weight to small base if materialId exists
    if (softHank.materialId && softHank.weight > 0) {
      const mId = softHank.materialId;
      const weightToReturn = softHank.weight;

      let transfer = await SmallBaseTransfer.findOne({ materialId: mId, deletedAt: null });
      if (transfer) {
        transfer.weightKg += weightToReturn;
        await transfer.save();
      } else {
        transfer = await SmallBaseTransfer.findOne({ materialId: mId }).sort({ dateTime: -1 });
        if (transfer) {
          transfer.weightKg += weightToReturn;
          transfer.deletedAt = null;
          await transfer.save();
        } else {
          await SmallBaseTransfer.create({
            materialId: mId,
            weightKg: weightToReturn,
            dateTime: new Date(),
            transferredBy: req.user._id
          });
        }
      }
    }

    softHank.deletedAt = new Date();
    await softHank.save();

    try {
      if (req.user) {
        await notifySoftHankDelete(softHank, req.user._id);
      }
    } catch (notifError) {
      logger.error("Notification send error:", notifError);
    }

    res.status(200).json({
      success: true,
      message: "Yumshoq motka muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    logger.error("Delete soft hank error:", error);
    res
      .status(500)
      .json({ success: false, message: "Yumshoq motkani o'chirishda xatolik" });
  }
};

export const updateSoftHank = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateSoftHankSchema.parse(req.body);
    const { materialId, weight: newWeight, dyehouseName, rawMaterialName, comment, date } = validatedData;

    const softHank = await SoftHank.findById(id);
    if (!softHank) {
      return res.status(404).json({ success: false, message: "Yumshoq motka topilmadi" });
    }

    const oldWeight = softHank.weight;
    const oldMaterialId = softHank.materialId;

    const updatedTransfers = [];

    // Helper to return weight to small base
    const returnToSmallBase = async (mId, weightToReturn) => {
      if (!mId) return;
      let transfer = await SmallBaseTransfer.findOne({ materialId: mId, deletedAt: null });
      if (transfer) {
        transfer.weightKg += weightToReturn;
        updatedTransfers.push(transfer);
      } else {
        // Find even a deleted one to revive if needed, or just create new
        transfer = await SmallBaseTransfer.findOne({ materialId: mId }).sort({ dateTime: -1 });
        if (transfer) {
          transfer.weightKg += weightToReturn;
          transfer.deletedAt = null;
          updatedTransfers.push(transfer);
        } else {
          // Create new record if none found (shouldn't happen usually)
          const newTransfer = new SmallBaseTransfer({
            materialId: mId,
            weightKg: weightToReturn,
            dateTime: new Date(),
            transferredBy: req.user._id
          });
          updatedTransfers.push(newTransfer);
        }
      }
    };

    // Helper to deduct weight from small base (FIFO)
    const deductFromSmallBase = async (mId, weightToDeduct, matName) => {
      if (!mId) return;
      const transfers = await SmallBaseTransfer.find({ materialId: mId, deletedAt: null }).sort({ dateTime: 1 });
      const totalAvailable = transfers.reduce((sum, t) => sum + t.weightKg, 0);

      if (weightToDeduct > totalAvailable) {
        throw new Error(`${matName || 'Xom ashyo'} uchun jami og'irlik ${totalAvailable} kg dan oshmasligi kerak!`);
      }

      let remaining = weightToDeduct;
      for (const t of transfers) {
        if (remaining <= 0) break;
        const deduction = Math.min(t.weightKg, remaining);
        t.weightKg -= deduction;
        remaining -= deduction;
        if (t.weightKg <= 0) t.deletedAt = new Date();
        updatedTransfers.push(t);
      }
    };

    // Check if material changed
    if (materialId && oldMaterialId && materialId.toString() !== oldMaterialId.toString()) {
      // Return ALL old weight to OLD material
      await returnToSmallBase(oldMaterialId, oldWeight);
      // Deduct ALL new weight from NEW material
      const targetWeight = newWeight !== undefined ? newWeight : oldWeight;
      await deductFromSmallBase(materialId, targetWeight, rawMaterialName);

      softHank.materialId = materialId;
      softHank.rawMaterialName = rawMaterialName || softHank.rawMaterialName;
      if (newWeight !== undefined) softHank.weight = newWeight;
    } else if (newWeight !== undefined && newWeight !== oldWeight) {
      // Weight changed for same material
      const mId = materialId || oldMaterialId;
      if (!mId) {
        // If we don't have materialId, we can't adjust stock reliably
        // but we should still allow updating the record if user wants
        softHank.weight = newWeight;
      } else {
        const diff = newWeight - oldWeight;
        if (diff > 0) {
          // Need more weight
          await deductFromSmallBase(mId, diff, rawMaterialName || softHank.rawMaterialName);
        } else {
          // Excess weight to return
          await returnToSmallBase(mId, Math.abs(diff));
        }
        softHank.weight = newWeight;
      }
    }

    // Update other fields
    if (dyehouseName) softHank.dyehouseName = dyehouseName;
    if (rawMaterialName) softHank.rawMaterialName = rawMaterialName;
    if (comment !== undefined) softHank.comment = comment;
    if (date) softHank.date = date;

    // Save all changes atomically
    await Promise.all([
      softHank.save(),
      ...updatedTransfers.map(t => t.save())
    ]);

    res.status(200).json({
      success: true,
      message: "Yumshoq motka muvaffaqiyatli yangilandi",
      data: { softHank }
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    if (error.message.includes("oshmasligi kerak")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    logger.error("Update soft hank error:", error);
    res.status(500).json({ success: false, message: "Yumshoq motkani yangilashda xatolik yuz berdi" });
  }
};
