import mongoose from "mongoose";
import Batch from "../models/Batch.js";
import BatchSuggestion from "../models/BatchSuggestion.js";
import RawMaterialIntake from "../models/RawMaterialIntake.js";
import SoftHank from "../models/SoftHank.js";
import SendToDyehouse from "../models/SendToDyehouse.js";
import HardHank from "../models/HardHank.js";
import Wrapping from "../models/Wrapping.js";
import FinishedProduct from "../models/FinishedProduct.js";
import { logger } from "../config/logger.js";
import { z } from "zod";

// Validation schemas
const createBatchSchema = z.object({
  threadType: z.string().min(1, "Ip turi talab qilinadi"),
  threadNumber: z.string().min(1, "Ip raqami talab qilinadi"),
  clientId: z.string().min(1).optional().or(z.literal("")),
  clientName: z.string().optional(),
  colorName: z.string().min(1, "Rang nomi talab qilinadi"),
  colorCode: z.string().min(1, "Rang kodi talab qilinadi"),
  weightKg: z.number().positive("Og'irlik musbat son bo'lishi kerak"),
  conesCount: z
    .number()
    .min(0, "Bobina soni manfiy bo'lmasligi kerak")
    .optional(),
  materialId: z.string().optional(),
  comment: z.string().max(500).optional(),
  date: z.string().datetime().optional(),
});

const paginationSchema = z.object({
  page: z.preprocess(
    (val) => (val === undefined ? "1" : val),
    z
      .union([z.string(), z.number()])
      .transform(Number)
      .pipe(z.number().min(1))
      .default(1),
  ),
  limit: z.preprocess(
    (val) => (val === undefined ? "10" : val),
    z
      .union([z.string(), z.number()])
      .transform(Number)
      .pipe(z.number().min(1).max(2000))
      .default(10),
  ),
  search: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Get all batches
export const getBatches = async (req, res) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const { page, limit, search, status, startDate, endDate } = validatedQuery;

    const query = { deletedAt: null };

    if (search) {
      query.$or = [
        { batchNumber: { $regex: search, $options: "i" } },
        { threadType: { $regex: search, $options: "i" } },
        { threadNumber: { $regex: search, $options: "i" } },
        { colorName: { $regex: search, $options: "i" } },
        { colorCode: { $regex: search, $options: "i" } },
        { clientName: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [batches, total] = await Promise.all([
      Batch.find(query)
        .populate("clientId", "name phone")
        .populate("createdBy", "fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Batch.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        data: batches,
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
    logger.error("Get batches error:", error);
    res.status(500).json({
      success: false,
      message: "Partiyalarni olishda xatolik yuz berdi",
    });
  }
};

// Get batch by ID
export const getBatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await Batch.findById(id)
      .populate("clientId", "name phone")
      .populate("createdBy", "fullName")
      .lean();

    if (!batch || batch.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Partiya topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      data: { batch },
    });
  } catch (error) {
    logger.error("Get batch by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Partiyani olishda xatolik yuz berdi",
    });
  }
};

// Create new batch
export const createBatch = async (req, res) => {
  try {
    const validatedData = createBatchSchema.parse(req.body);

    // Find matching raw material by threadType and threadNumber
    const rawMaterial = await RawMaterialIntake.findOne({
      threadType: validatedData.threadType,
      threadNumber: validatedData.threadNumber,
      deletedAt: null,
    });

    if (!rawMaterial) {
      return res.status(400).json({
        success: false,
        message: `Xom ashyo topilmadi: ${validatedData.threadType} - ${validatedData.threadNumber}`,
      });
    }

    // Check if there's enough material
    if (rawMaterial.totalWeightKg < validatedData.weightKg) {
      return res.status(400).json({
        success: false,
        message: `Xom ashyo yetarli emas. Mavjud: ${rawMaterial.totalWeightKg} kg, Talab: ${validatedData.weightKg} kg`,
      });
    }

    // Generate batch number
    const batchNumber = await Batch.generateBatchNumber();

    // Deduct weight from raw material
    rawMaterial.totalWeightKg -= validatedData.weightKg;
    await rawMaterial.save();

    // Build batch data, excluding empty clientId to avoid ObjectId cast errors
    const batchData = {
      threadType: validatedData.threadType,
      threadNumber: validatedData.threadNumber,
      colorName: validatedData.colorName,
      colorCode: validatedData.colorCode,
      weightKg: validatedData.weightKg,
      conesCount: validatedData.conesCount,
      batchNumber,
      materialId: rawMaterial._id,
      date: validatedData.date ? new Date(validatedData.date) : new Date(),
      createdBy: req.user._id,
    };

    // Only add clientId if it's a valid non-empty string
    if (validatedData.clientId && validatedData.clientId.trim() !== "") {
      batchData.clientId = validatedData.clientId;
    }

    if (validatedData.clientName) {
      batchData.clientName = validatedData.clientName;
    }

    if (validatedData.comment) {
      batchData.comment = validatedData.comment;
    }

    const batch = new Batch(batchData);

    await batch.save();

    // Save color suggestions
    try {
      await Promise.all([
        BatchSuggestion.addSuggestion("COLOR_NAME", validatedData.colorName),
        BatchSuggestion.addSuggestion("COLOR_CODE", validatedData.colorCode),
      ]);
    } catch (suggestionError) {
      logger.warn("Failed to save batch suggestions:", suggestionError);
    }

    // Populate for response
    await batch.populate("clientId", "name phone");
    await batch.populate("createdBy", "fullName");

    logger.info(
      `Batch created: ${batchNumber}, deducted ${validatedData.weightKg}kg from material ${rawMaterial._id}`,
    );

    res.status(201).json({
      success: true,
      message: "Partiya muvaffaqiyatli yaratildi",
      data: { batch },
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
    logger.error("Create batch error:", error);
    res.status(500).json({
      success: false,
      message: "Partiya yaratishda xatolik yuz berdi",
    });
  }
};

// Update batch
export const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const batch = await Batch.findById(id);
    if (!batch || batch.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Partiya topilmadi",
      });
    }

    const oldWeight = batch.weightKg;
    const oldMaterialId = batch.materialId;

    // Determine if material properties changed
    const isMaterialChanged =
      (updates.threadType && updates.threadType !== batch.threadType) ||
      (updates.threadNumber && updates.threadNumber !== batch.threadNumber);

    const newWeight =
      updates.weightKg !== undefined ? Number(updates.weightKg) : oldWeight;

    if (isMaterialChanged) {
      // Refund old material
      if (oldMaterialId) {
        const oldRaw = await RawMaterialIntake.findById(oldMaterialId);
        if (oldRaw) {
          oldRaw.totalWeightKg += oldWeight;
          await oldRaw.save();
        }
      }

      // Deduct from new material
      const newThreadType = updates.threadType || batch.threadType;
      const newThreadNumber = updates.threadNumber || batch.threadNumber;

      const newRaw = await RawMaterialIntake.findOne({
        threadType: newThreadType,
        threadNumber: newThreadNumber,
        deletedAt: null,
      });

      if (!newRaw) {
        return res.status(400).json({
          success: false,
          message: `Yangi xom ashyo topilmadi: ${newThreadType} - ${newThreadNumber}`,
        });
      }

      if (newRaw.totalWeightKg < newWeight) {
        return res.status(400).json({
          success: false,
          message: `Yangi xom ashyo yetarli emas. Mavjud: ${newRaw.totalWeightKg} kg, Talab: ${newWeight} kg`,
        });
      }

      newRaw.totalWeightKg -= newWeight;
      await newRaw.save();
      batch.materialId = newRaw._id;
    } else if (newWeight !== oldWeight) {
      // Same material, weight changed
      const weightDiff = newWeight - oldWeight;
      if (oldMaterialId) {
        const rawMaterial = await RawMaterialIntake.findById(oldMaterialId);
        if (rawMaterial) {
          if (weightDiff > 0 && rawMaterial.totalWeightKg < weightDiff) {
            return res.status(400).json({
              success: false,
              message: `Xom ashyo yetarli emas. Mavjud: ${rawMaterial.totalWeightKg} kg, Talab qilingan qo'shimcha: ${weightDiff} kg`,
            });
          }
          rawMaterial.totalWeightKg -= weightDiff; // Negative diff adds back
          await rawMaterial.save();
        }
      }
    }

    // Update fields
    if (updates.threadType) batch.threadType = updates.threadType;
    if (updates.threadNumber) batch.threadNumber = updates.threadNumber;
    if (updates.colorName) batch.colorName = updates.colorName;
    if (updates.colorCode) batch.colorCode = updates.colorCode;
    if (updates.weightKg !== undefined) batch.weightKg = updates.weightKg;
    if (updates.conesCount !== undefined)
      batch.conesCount = updates.conesCount === "" ? null : updates.conesCount;

    // Check if client is cleared
    if ("clientId" in updates) {
      if (!updates.clientId || String(updates.clientId).trim() === "") {
        batch.clientId = undefined;
        batch.clientName = undefined;
      } else {
        batch.clientId = updates.clientId;
        batch.clientName = updates.clientName;
      }
    }

    if (updates.status) {
      batch.status = updates.status;
      if (updates.status === "WRAPPING" && !batch.wrappingStartedAt) {
        batch.wrappingStartedAt = new Date();
      }
    }
    if (updates.comment !== undefined) batch.comment = updates.comment;
    if (updates.date !== undefined) batch.date = new Date(updates.date);
    if (updates.packages) batch.packages = updates.packages;

    await batch.save();

    await batch.populate("clientId", "name phone");
    await batch.populate("createdBy", "fullName");

    res.status(200).json({
      success: true,
      message: "Partiya muvaffaqiyatli yangilandi",
      data: { batch },
    });
  } catch (error) {
    logger.error("Update batch error:", error);
    res.status(500).json({
      success: false,
      message: "Partiyani yangilashda xatolik yuz berdi",
    });
  }
};

// Delete batch (soft delete) - returns weight to raw material
export const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await Batch.findById(id);
    if (!batch || batch.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Partiya topilmadi",
      });
    }

    // Return weight to raw material if materialId exists
    if (batch.materialId) {
      const rawMaterial = await RawMaterialIntake.findById(batch.materialId);
      if (rawMaterial && !rawMaterial.deletedAt) {
        rawMaterial.totalWeightKg += batch.weightKg;
        await rawMaterial.save();
        logger.info(
          `Returned ${batch.weightKg}kg to material ${rawMaterial._id} after batch ${batch.batchNumber} deletion`,
        );
      }
    }

    batch.deletedAt = new Date();
    await batch.save();

    res.status(200).json({
      success: true,
      message: "Partiya muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    logger.error("Delete batch error:", error);
    res.status(500).json({
      success: false,
      message: "Partiyani o'chirishda xatolik yuz berdi",
    });
  }
};

// Get next batch number
export const getNextBatchNumber = async (req, res) => {
  try {
    const batchNumber = await Batch.generateBatchNumber();
    res.status(200).json({
      success: true,
      data: { batchNumber },
    });
  } catch (error) {
    logger.error("Get next batch number error:", error);
    res.status(500).json({
      success: false,
      message: "Keyingi partiya raqamini olishda xatolik",
    });
  }
};

// Get batch suggestions
export const getBatchSuggestions = async (req, res) => {
  try {
    const { type, search } = req.query;

    if (!type || !["COLOR_NAME", "COLOR_CODE"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type parametri kerak (COLOR_NAME yoki COLOR_CODE)",
      });
    }

    const suggestions = await BatchSuggestion.getSuggestions(type, search);

    res.status(200).json({
      success: true,
      data: { suggestions: suggestions.map((s) => s.value) },
    });
  } catch (error) {
    logger.error("Get batch suggestions error:", error);
    res.status(500).json({
      success: false,
      message: "Takliflarni olishda xatolik yuz berdi",
    });
  }
};

// Get batch stats
export const getBatchStats = async (req, res) => {
  try {
    const [total, created, processing, completed, shipped] = await Promise.all([
      Batch.countDocuments({ deletedAt: null }),
      Batch.countDocuments({ deletedAt: null, status: "CREATED" }),
      Batch.countDocuments({ deletedAt: null, status: "PROCESSING" }),
      Batch.countDocuments({ deletedAt: null, status: "COMPLETED" }),
      Batch.countDocuments({ deletedAt: null, status: "SHIPPED" }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBatches: total,
        createdBatches: created,
        processingBatches: processing,
        completedBatches: completed,
        shippedBatches: shipped,
      },
    });
  } catch (error) {
    logger.error("Get batch stats error:", error);
    res.status(500).json({
      success: false,
      message: "Statistikani olishda xatolik yuz berdi",
    });
  }
};

// Send batch packages to finished products (incremental - only sends new packages)
export const sendBatchToFinishedProducts = async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await Batch.findById(id);
    if (!batch || batch.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Partiya topilmadi",
      });
    }

    // Allow WRAPPING or WRAPPED status
    if (!["WRAPPING", "WRAPPED"].includes(batch.status)) {
      return res.status(400).json({
        success: false,
        message:
          "Faqat qoplanayotgan yoki qoplangan partiyalarni bazaga yuborish mumkin",
      });
    }

    if (!batch.packages || batch.packages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Partiyada qoplar topilmadi",
      });
    }

    // Get already sent package IDs (including soft-deleted ones to avoid unique index conflicts)
    const existingProducts = await FinishedProduct.find({
      batch: { $in: batch.packages.map((p) => p.lotNumber) },
    }).select("batch deletedAt");

    const sentLotNumbersMap = new Map(
      existingProducts.map((p) => [p.batch, p]),
    );

    // Filter packages that haven't been sent or need to be restored
    const packagesToProcess = batch.packages.filter((pkg) => {
      const existing = sentLotNumbersMap.get(pkg.lotNumber);
      return !existing || existing.deletedAt !== null;
    });

    if (packagesToProcess.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Barcha qoplar allaqachon yuborilgan",
        data: {
          batch,
          finishedProductsCount: 0,
        },
      });
    }

    // Create or restore finished products
    const finishedProducts = [];
    for (const pkg of packagesToProcess) {
      const existing = sentLotNumbersMap.get(pkg.lotNumber);

      if (existing && existing.deletedAt !== null) {
        // Restore soft-deleted product
        existing.deletedAt = null;
        existing.productName = batch.threadType;
        existing.color = batch.colorName;
        existing.colorCode = batch.colorCode;
        existing.weightKg = pkg.nettoKg;
        existing.brutto = pkg.bruttoKg;
        existing.tara = pkg.taraKg;
        existing.bagsCount = 1;
        existing.bagsParties = [batch.batchNumber];
        existing.comment = `Partiya: ${batch.batchNumber}, Konuslar: ${pkg.conesCount}`;
        existing.isSentToBase = false;
        existing.status = "ACTIVE";
        await existing.save();
        finishedProducts.push(existing);
      } else {
        // Create new product
        const finishedProduct = new FinishedProduct({
          productName: batch.threadType,
          color: batch.colorName,
          colorCode: batch.colorCode,
          weightKg: pkg.nettoKg,
          brutto: pkg.bruttoKg,
          tara: pkg.taraKg,
          bagsCount: 1,
          batch: pkg.lotNumber,
          bagsParties: [batch.batchNumber],
          comment: `Partiya: ${batch.batchNumber}, Konuslar: ${pkg.conesCount}`,
          createdBy: req.user._id,
          isSentToBase: false, // Set to false for consistency with manual creation
          status: "ACTIVE",
        });
        await finishedProduct.save();
        finishedProducts.push(finishedProduct);
      }
    }

    // Update sentToBaseAt timestamp
    if (!batch.sentToBaseAt) {
      batch.sentToBaseAt = new Date();
      await batch.save();
    }

    logger.info(
      `Batch ${batch.batchNumber} sent to finished products: ${finishedProducts.length} new items`,
    );

    res.status(200).json({
      success: true,
      message: `${finishedProducts.length} ta mahsulot bazaga yuborildi`,
      data: {
        batch,
        finishedProductsCount: finishedProducts.length,
      },
    });
  } catch (error) {
    logger.error("Send batch to finished products error:", error);
    res.status(500).json({
      success: false,
      message: "Bazaga yuborishda xatolik yuz berdi",
    });
  }
};

// Delete package from finished products
export const deletePackageFromFinished = async (req, res) => {
  try {
    const { id, lotNumber } = req.params;

    const batch = await Batch.findById(id);
    if (!batch || batch.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Partiya topilmadi",
      });
    }

    // Find and delete the finished product
    const finishedProduct = await FinishedProduct.findOne({
      batch: lotNumber,
      deletedAt: null,
    });

    if (finishedProduct) {
      finishedProduct.deletedAt = new Date();
      await finishedProduct.save();
      logger.info(`Package ${lotNumber} deleted from finished products`);
    }

    res.status(200).json({
      success: true,
      message: "Qop bazadan o'chirildi",
    });
  } catch (error) {
    logger.error("Delete package from finished products error:", error);
    res.status(500).json({
      success: false,
      message: "Qopni o'chirishda xatolik yuz berdi",
    });
  }
};

// Update package in finished products
export const updatePackageInFinished = async (req, res) => {
  try {
    const { id, lotNumber } = req.params;
    const { bruttoKg, taraKg, nettoKg, conesCount } = req.body;

    const batch = await Batch.findById(id);
    if (!batch || batch.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Partiya topilmadi",
      });
    }

    // Find and update the finished product
    const finishedProduct = await FinishedProduct.findOne({
      batch: lotNumber,
      deletedAt: null,
    });

    if (finishedProduct) {
      finishedProduct.brutto = bruttoKg;
      finishedProduct.tara = taraKg;
      finishedProduct.weightKg = nettoKg;
      finishedProduct.comment = `Partiya: ${batch.batchNumber}, Konuslar: ${conesCount}`;
      await finishedProduct.save();
      logger.info(`Package ${lotNumber} updated in finished products`);
    }

    res.status(200).json({
      success: true,
      message: "Qop bazada yangilandi",
    });
  } catch (error) {
    logger.error("Update package in finished products error:", error);
    res.status(500).json({
      success: false,
      message: "Qopni yangilashda xatolik yuz berdi",
    });
  }
};

// Scan batch (existing function - keep it)
export const scanBatch = async (req, res) => {
  try {
    const { batchCode } = req.params;

    // 1. Check new Batch model first
    const batch = await Batch.findOne({
      batchNumber: batchCode,
      deletedAt: null,
    })
      .populate("clientId", "name phone")
      .populate("createdBy", "fullName");

    if (batch) {
      return res.status(200).json({
        success: true,
        data: {
          found: true,
          stage: "BATCH",
          stageName: "Partiya",
          details: batch,
        },
      });
    }

    // 2. Check Finished Product
    const finishedProduct = await FinishedProduct.findOne({ batch: batchCode });
    if (finishedProduct) {
      return res.status(200).json({
        success: true,
        data: {
          found: true,
          stage: "FINISHED_PRODUCT",
          stageName: "Tayyor mahsulot",
          details: finishedProduct,
        },
      });
    }

    // 3. Check Wrapping
    const wrapping = await Wrapping.findOne({ batch: batchCode });
    if (wrapping) {
      if (wrapping.deletedAt) {
        const linkedFinished = await FinishedProduct.findOne({
          wrappingId: wrapping._id,
        });
        if (linkedFinished) {
          return res.status(200).json({
            success: true,
            data: {
              found: true,
              stage: "FINISHED_PRODUCT",
              stageName: "Tayyor mahsulot",
              details: linkedFinished,
              history: { wrapping },
            },
          });
        }
      }
      return res.status(200).json({
        success: true,
        data: {
          found: true,
          stage: "WRAPPING",
          stageName: "Qoplash",
          details: wrapping,
        },
      });
    }

    // 4. Check Hard Hank
    const hardHank = await HardHank.findOne({ batch: batchCode });
    if (hardHank) {
      if (hardHank.deletedAt) {
        return res.status(200).json({
          success: true,
          data: {
            found: true,
            stage: "PROCESSED_HARD_HANK",
            stageName: "Qayta ishlangan (Qattiq motka)",
            details: hardHank,
            message: "Bu partiya keyingi bosqichga o'tkazilgan.",
          },
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          found: true,
          stage: "HARD_HANK",
          stageName: "Qattiq motka",
          details: hardHank,
        },
      });
    }

    // 5. Check Dyeing (SendToDyehouse)
    const dyehouse = await SendToDyehouse.findOne({ batchCode });
    if (dyehouse) {
      if (dyehouse.deletedAt) {
        return res.status(200).json({
          success: true,
          data: {
            found: true,
            stage: "PROCESSED_DYEING",
            stageName: "Qayta ishlangan (Bo'yoqxona)",
            details: dyehouse,
            message: "Bu partiya keyingi bosqichga o'tkazilgan.",
          },
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          found: true,
          stage: "DYEING",
          stageName: "Bo'yoqxona jarayoni",
          details: dyehouse,
        },
      });
    }

    // 6. Check Soft Hank
    const softHank = await SoftHank.findOne({ batchNumber: batchCode });
    if (softHank) {
      if (softHank.deletedAt) {
        return res.status(200).json({
          success: true,
          data: {
            found: true,
            stage: "PROCESSED_SOFT_HANK",
            stageName: "Qayta ishlangan (Yumshoq motka)",
            details: softHank,
            message: "Bu partiya keyingi bosqichga o'tkazilgan.",
          },
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          found: true,
          stage: "SOFT_HANK",
          stageName: "Yumshoq motka",
          details: softHank,
        },
      });
    }

    // Not found
    return res.status(404).json({
      success: false,
      message: "Partiya topilmadi",
    });
  } catch (error) {
    logger.error("Scan batch error:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
    });
  }
};
