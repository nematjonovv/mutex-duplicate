import SmallBaseTransfer from '../models/SmallBaseTransfer.js';
import RawMaterialIntake from '../models/RawMaterialIntake.js';
import { logger } from '../config/logger.js';
import { z } from 'zod';
import { notifyTransferDelete, notifyTransferReturned } from '../utils/notificationHelper.js';

const createTransferSchema = z.object({
  materialId: z.string().min(1, "Xom ashyo ID talab qilinadi"),
  weightKg: z.number().min(0.1, "Vazn kamida 0.1 kg bo'lishi kerak"),
  bagsCount: z.number().min(1, "Qoplar soni kamida 1 ta bo'lishi kerak").optional(),
  dateTime: z.string().datetime("Sana va vaqt noto'g'ri formatda"),
});

const paginationSchema = z.object({
  page: z.preprocess((val) => val === undefined ? "1" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1)).default(1)),
  limit: z.preprocess((val) => val === undefined ? "10" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1).max(2000)).default(10)),
});

export const createTransfer = async (req, res) => {
  try {
    const validatedData = createTransferSchema.parse(req.body);
    const { materialId, weightKg, bagsCount, dateTime } = validatedData;

    const material = await RawMaterialIntake.findById(materialId);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Xom ashyo topilmadi' });
    }

    if (material.totalWeightKg < weightKg) {
      return res.status(400).json({ success: false, message: 'Yetarli xom ashyo mavjud emas' });
    }

    // Only check bagsCount if it's provided
    if (bagsCount && material.totalBags && material.totalBags < bagsCount) {
      return res.status(400).json({ success: false, message: 'Yetarli qoplar mavjud emas' });
    }

    material.totalWeightKg -= weightKg;
    if (bagsCount && material.totalBags) {
      material.totalBags -= bagsCount;
    }
    await material.save();

    // Check if a transfer for this material already exists in the small base
    let transfer = await SmallBaseTransfer.findOne({
      materialId: validatedData.materialId,
      deletedAt: null
    });

    if (transfer) {
      // Merge with existing transfer
      transfer.weightKg += weightKg;
      transfer.bagsCount += (bagsCount || 0);
      transfer.dateTime = dateTime; // Update to latest transfer time
      transfer.transferredBy = req.user._id;
      await transfer.save();
    } else {
      // Create new transfer record
      transfer = new SmallBaseTransfer({
        materialId: validatedData.materialId,
        weightKg: validatedData.weightKg,
        bagsCount: validatedData.bagsCount || 0,
        dateTime: validatedData.dateTime,
        transferredBy: req.user._id,
      });
      await transfer.save();
    }

    res.status(201).json({ success: true, message: 'Xom ashyo kichik bazaga muvaffaqiyatli qo\'shildi', data: { transfer } });
  } catch (error) {
    if (error.name === 'ZodError') {
      const errorMessages = error.errors.map((err) => err.message).join(', ');
      return res.status(400).json({
        success: false,
        message: `Validatsiya xatosi: ${errorMessages}`,
        errors: error.errors,
      });
    }
    logger.error('Create transfer error:', error);
    res.status(500).json({ success: false, message: 'O\'tkazish amalga oshirilmadi' });
  }
};

export const getTransfers = async (req, res) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const { page, limit } = validatedQuery;

    const skip = (page - 1) * limit;

    const [transfers, total] = await Promise.all([
      SmallBaseTransfer.find({ deletedAt: null })
        .populate('materialId', 'name supplier')
        .populate('transferredBy', 'fullName')
        .sort({ dateTime: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SmallBaseTransfer.countDocuments({ deletedAt: null }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        data: transfers,
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
    logger.error('Get transfers error:', error);
    res.status(500).json({ success: false, message: 'O\'tkazishlarni olishda xatolik yuz berdi' });
  }
};

// Delete transfer (soft delete)
export const deleteTransfer = async (req, res) => {
  try {
    const { id } = req.params;

    const transfer = await SmallBaseTransfer.findById(id).populate('materialId', 'name');
    if (!transfer || transfer.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'O\'tkazish topilmadi',
      });
    }

    // Soft delete
    transfer.deletedAt = new Date();
    await transfer.save();

    // Create notification
    try {
      const materialName = transfer.materialId?.name || 'Noma\'lum';
      await notifyTransferDelete(transfer, materialName, req.user._id);
    } catch (notifError) {
      logger.error('Failed to create notification:', notifError);
    }

    res.status(200).json({
      success: true,
      message: 'O\'tkazish muvaffaqiyatli o\'chirildi',
    });
  } catch (error) {
    logger.error('Delete transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'O\'tkazishni o\'chirishda xatolik yuz berdi',
    });
  }
};

// Return transfer to main base
export const returnToMainBase = async (req, res) => {
  try {
    const { id } = req.params;

    const transfer = await SmallBaseTransfer.findById(id).populate('materialId');
    if (!transfer || transfer.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'O\'tkazish topilmadi',
      });
    }

    const material = await RawMaterialIntake.findById(transfer.materialId._id || transfer.materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Xom ashyo topilmadi',
      });
    }

    // Return weight to main base
    material.totalWeightKg += transfer.weightKg;
    if (transfer.bagsCount && material.totalBags !== undefined) {
      material.totalBags += transfer.bagsCount;
    }
    await material.save();

    // Soft delete the transfer
    transfer.deletedAt = new Date();
    await transfer.save();

    // Create notification
    try {
      const materialName = material.name || 'Noma\'lum';
      await notifyTransferReturned(transfer, materialName, req.user._id);
    } catch (notifError) {
      logger.error('Failed to create notification:', notifError);
    }

    res.status(200).json({
      success: true,
      message: 'Xom ashyo katta bazaga muvaffaqiyatli qaytarildi',
    });
  } catch (error) {
    logger.error('Return to main base error:', error);
    res.status(500).json({
      success: false,
      message: 'Katta bazaga qaytarishda xatolik yuz berdi',
    });
  }
};
