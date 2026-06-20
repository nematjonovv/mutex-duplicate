import FinishedProduct from "../models/FinishedProduct.js";
import Wrapping from "../models/Wrapping.js";
import Notification from "../models/Notification.js";
import { logger } from "../config/logger.js";
import { z } from "zod";

const paginationSchema = z.object({
  page: z.preprocess((val) => val === undefined ? "1" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1)).default(1)),
  limit: z.preprocess((val) => val === undefined ? "10" : val, z.union([z.string(), z.number()]).transform(Number).pipe(z.number().min(1).max(2000)).default(10)),
  search: z.string().optional(),
  isSentToBase: z.union([z.string(), z.boolean()])
    .transform((val) => val === "true" || val === true)
    .optional(),
  productName: z.string().optional(),
  color: z.string().optional(),
  colorCode: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["ACTIVE", "SOLD"]).optional(),
});

const createFinishedProductSchema = z.object({
  wrappingId: z.string().min(1, "O'ram ID talab qilinadi"),
  productName: z.string().min(1, "Mahsulot nomi talab qilinadi"),
  color: z.string().min(1, "Rang talab qilinadi"),
  colorCode: z.string().min(1, "Rang kodi talab qilinadi"),
  weightKg: z.number().positive("Vazn musbat bo'lishi kerak"),
  weightDifference: z.number().optional(),
  bagsCount: z.number().positive("Qoplar soni musbat bo'lishi kerak"),
  comment: z.string().optional(),
  dyehouseName: z.string().optional(),
  type: z.enum(["to’q", "och"]).optional(),
});

export const getFinishedProducts = async (req, res) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const {
      page,
      limit,
      search,
      isSentToBase,
      productName,
      color,
      colorCode,
      startDate,
      endDate,
      status,
    } = validatedQuery;

    const query = { deletedAt: null };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    
    if (isSentToBase !== undefined) {
      if (isSentToBase) {
        query.isSentToBase = true;
      } else {
        query.isSentToBase = { $ne: true };
      }
    }

    if (productName) query.productName = productName;
    if (color) query.color = color;
    if (colorCode) query.colorCode = colorCode;

    if (search) {
      const searchCondition = {
        $or: [
          { productName: { $regex: search, $options: "i" } },
          { color: { $regex: search, $options: "i" } },
          { colorCode: { $regex: search, $options: "i" } },
          { batch: { $regex: search, $options: "i" } },
          { bagsParties: { $regex: search, $options: "i" } },
        ],
      };

      if (query.$or) {
      if (searchCondition.$or) {
        query.$and = [{ $or: query.$or }, searchCondition];
        delete query.$or;
      }
    } else {
      query.$or = searchCondition.$or;
    }
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      FinishedProduct.find(query)
        .populate("createdBy", "fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FinishedProduct.countDocuments(query),
    ]);

    // Map products - weightKg is NETTO (used for sales)
    const mappedProducts = products.map(product => ({
      ...product,
      brutto: product.brutto || product.weightKg, // BRUTTO saqlanadi
      // weightKg = NETTO - sotish uchun ishlatiladi
    }));

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        data: mappedProducts,
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
    logger.error("Get finished products error:", error);
    res
      .status(500)
      .json({ success: false, message: "Mahsulotlarni yuklashda xatolik yuz berdi" });
  }
};

export const createFinishedProduct = async (req, res) => {
  try {
    const validatedData = createFinishedProductSchema.parse(req.body);
    const { wrappingId, ...rest } = validatedData;

    const wrapping = await Wrapping.findById(wrappingId);
    if (!wrapping) {
      return res
        .status(404)
        .json({ success: false, message: "O'ram topilmadi" });
    }

    // Generate shorter batch: FP-YYMMDD-XXXX (4 random digits)
    const date = new Date();
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, "");
    const random = Math.floor(1000 + Math.random() * 9000);
    const batch = `FP-${dateStr}-${random}`;

    const finishedProduct = new FinishedProduct({
      ...rest,
      wrappingId,
      batch,
      bagsParties: [wrapping.batch],
      softHankDate: wrapping.softHankDate,
      dyehouseDate: wrapping.dyehouseDate,
      hardHankDate: wrapping.hardHankDate,
      createdBy: req.user._id,
      isSentToBase: false,
    });
    await finishedProduct.save();

    // Mark source wrapping as moved to next stage
    wrapping.deletedAt = new Date();
    await wrapping.save();

    res
      .status(201)
      .json({
        success: true,
        message: "Tayyor mahsulot muvaffaqiyatli yaratildi",
        data: { finishedProduct },
      });
  } catch (error) {
    logger.error("Create finished product error:", error);
    res
      .status(500)
      .json({ success: false, message: "Tayyor mahsulotni yaratishda xatolik yuz berdi" });
  }
};

const createBulkFinishedProductSchema = z.object({
  items: z.array(z.object({
    wrappingId: z.string().min(1, "O'ram ID talab qilinadi"),
    productName: z.string().min(1, "Mahsulot nomi talab qilinadi"),
    color: z.string().min(1, "Rang talab qilinadi"),
    colorCode: z.string().min(1, "Rang kodi talab qilinadi"),
    weightKg: z.number().positive("Vazn musbat bo'lishi kerak"),
    weightDifference: z.number().optional(),
    bagsCount: z.number().positive("Qoplar soni musbat bo'lishi kerak"),
    comment: z.string().optional(),
    dyehouseName: z.string().optional(),
    type: z.enum(["to’q", "och"]).optional(),
    batch: z.string().optional(),
  })),
});

export const createBulkFinishedProduct = async (req, res) => {
  try {
    const validatedData = createBulkFinishedProductSchema.parse(req.body);
    const { items } = validatedData;
    const results = [];

    // Group items by wrappingId
    const itemsByWrapping = {};
    for (const item of items) {
      if (!itemsByWrapping[item.wrappingId]) {
        itemsByWrapping[item.wrappingId] = [];
      }
      itemsByWrapping[item.wrappingId].push(item);
    }

    for (const wrappingId in itemsByWrapping) {
      const wrappingItems = itemsByWrapping[wrappingId];
      const wrapping = await Wrapping.findById(wrappingId);

      if (!wrapping || wrapping.deletedAt) {
        continue;
      }

      let totalConsumed = 0;
      for (const item of wrappingItems) {
        const { wrappingId, batch: providedBatch, ...rest } = item;
        
        let batch = providedBatch;
        if (!batch) {
            // Generate shorter batch: FP-YYMMDD-XXXX (4 random digits)
            const date = new Date();
            const dateStr = date.toISOString().slice(2, 10).replace(/-/g, "");
            const random = Math.floor(1000 + Math.random() * 9000);
            batch = `FP-${dateStr}-${random}`;
        }
        
        totalConsumed += item.weightKg;

        const finishedProduct = new FinishedProduct({
          ...rest,
          wrappingId,
          batch,
          bagsParties: [wrapping.batch],
          softHankDate: wrapping.softHankDate,
          dyehouseDate: wrapping.dyehouseDate,
          hardHankDate: wrapping.hardHankDate,
          createdBy: req.user._id,
          isSentToBase: false,
        });
        await finishedProduct.save();
        results.push(finishedProduct);
      }

      // Update wrapping weight or delete if finished
      wrapping.weightKg -= totalConsumed;
      wrapping.weightKg = Math.round(wrapping.weightKg * 100) / 100; // Fix float precision

      if (wrapping.weightKg <= 0.1) {
        wrapping.deletedAt = new Date();
        wrapping.weightKg = 0;
      }
      
      await wrapping.save();
    }

    res.status(201).json({
      success: true,
      message: `${results.length} ta mahsulot tayyor bazaga o'tkazildi`,
      data: { count: results.length }
    });
  } catch (error) {
    logger.error("Create bulk finished product error:", error);
    res.status(500).json({ success: false, message: "Ommaviy o'tkazishda xatolik yuz berdi" });
  }
};

export const sendToBase = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Iltimos, kamida bitta mahsulotni tanlang" 
      });
    }

    await FinishedProduct.updateMany(
      { _id: { $in: ids } },
      { $set: { isSentToBase: true } }
    );

    res.json({ 
      success: true, 
      message: `${ids.length} ta mahsulot bazaga muvaffaqiyatli yuborildi` 
    });
  } catch (error) {
    logger.error("Send to base error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Bazaga yuborishda xatolik yuz berdi" 
    });
  }
};

export const getAggregatedFinishedProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const matchStage = {
      deletedAt: null,
      status: "ACTIVE"
    }; // Show all active items

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchStage.createdAt.$lte = end;
      }
    }

    if (search) {
      matchStage.$or = [
        { productName: { $regex: search, $options: "i" } },
        { color: { $regex: search, $options: "i" } },
        { colorCode: { $regex: search, $options: "i" } },
      ];
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            productName: "$productName",
            color: "$color",
            colorCode: "$colorCode",
          },
          totalWeight: { $sum: "$weightKg" }, // NETTO - sotish uchun
          totalBags: { $sum: "$bagsCount" },
          lastDate: { $max: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { lastDate: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: Number(limit) }],
        },
      },
    ];

    const result = await FinishedProduct.aggregate(pipeline);
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;
    const materials = result[0].data.map(item => ({
      productName: item._id.productName,
      color: item._id.color,
      colorCode: item._id.colorCode,
      weightKg: item.totalWeight,
      bagsCount: item.totalBags,
      createdAt: item.lastDate,
      _id: `${item._id.productName}-${item._id.color}-${item._id.colorCode}`,
    }));

    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      data: {
        data: materials,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Get aggregated finished products error:", error);
    res.status(500).json({ success: false, message: "Yig'ma mahsulotlarni olishda xatolik yuz berdi" });
  }
};

export const deleteFinishedProductGroup = async (req, res) => {
  try {
    const { productName, color, colorCode } = req.body;
    
    if (!["MANAGER", "DIRECTOR"].includes(req.user.role)) {
       return res.status(403).json({ success: false, message: "Ruxsat yo'q" });
    }

    const query = {
      productName,
      color,
      colorCode,
      deletedAt: null,
    };
    const products = await FinishedProduct.find(query);
    
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: "Mahsulotlar topilmadi" });
    }

    await FinishedProduct.updateMany(query, { deletedAt: new Date() });

    const notification = new Notification({
      title: "Mahsulotlar guruhi o'chirildi",
      message: `${productName} (${color} - ${colorCode}) mahsulotlar guruhi ${req.user.fullName} tomonidan o'chirildi. Jami: ${products.length} ta partiya.`,
      type: "MATERIAL_DELETED",
      targetRoles: ["DIRECTOR", "MANAGER"],
      createdBy: req.user._id,
      entityId: "group",
      entityName: productName,
    });
    await notification.save();

    res.json({ success: true, message: "Mahsulotlar guruhi muvaffaqiyatli o'chirildi" });

  } catch (error) {
     logger.error("Delete finished product group error:", error);
     res.status(500).json({ success: false, message: "Mahsulotlar guruhini o'chirishda xatolik yuz berdi" });
  }
};

export const getAutoSelectProducts = async (req, res) => {
  try {
    const { productName, color, colorCode, targetAmount, targetType } = req.body;

    if (!productName || !color || !colorCode || !targetAmount || !targetType) {
      return res.status(400).json({ success: false, message: "Barcha maydonlarni to'ldiring" });
    }

    const query = {
      deletedAt: null,
      status: "ACTIVE",
      productName,
      color,
      colorCode
    };

    // Fetch all active candidates sorted by createdAt ASC (FIFO)
    const products = await FinishedProduct.find(query).sort({ createdAt: 1 });

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: "Mos keluvchi mahsulotlar topilmadi" });
    }

    const target = Number(targetAmount);

    // Helper function to get weight - use NETTO (weightKg) for sales
    const getWeight = (item) => item.weightKg;

    // Strategy: Randomized Greedy to find exact match or closest subset <= target
    // Then fill remainder with partial split if needed.

    const solveSubsetSum = (candidates, target) => {
        let bestSelection = [];
        let bestSum = 0;

        // Helper to run greedy on a specific order
        const runGreedy = (items) => {
            let currentSelection = [];
            let currentSum = 0;

            for (const item of items) {
                const val = targetType === 'weight' ? getWeight(item) : item.bagsCount;
                if (currentSum + val <= target + 0.001) {
                    currentSelection.push(item);
                    currentSum += val;
                }
            }
            
            if (Math.abs(currentSum - target) < Math.abs(bestSum - target)) {
                bestSum = currentSum;
                bestSelection = currentSelection;
            } else if (Math.abs(currentSum - target) === Math.abs(bestSum - target)) {
                // Prefer fewer items (cleaner)
                if (currentSelection.length < bestSelection.length) {
                    bestSelection = currentSelection;
                }
            }
            
            return Math.abs(currentSum - target) <= 0.001;
        };

        // 1. Deterministic Strategies
        // Largest First
        const sortedDesc = [...candidates].sort((a, b) => {
             const valA = targetType === 'weight' ? getWeight(a) : a.bagsCount;
             const valB = targetType === 'weight' ? getWeight(b) : b.bagsCount;
             return valB - valA;
        });
        if (runGreedy(sortedDesc)) return { selected: bestSelection, total: bestSum, exact: true };

        // Smallest First
        const sortedAsc = [...candidates].sort((a, b) => {
             const valA = targetType === 'weight' ? getWeight(a) : a.bagsCount;
             const valB = targetType === 'weight' ? getWeight(b) : b.bagsCount;
             return valA - valB;
        });
        if (runGreedy(sortedAsc)) return { selected: bestSelection, total: bestSum, exact: true };

        // 2. Randomized Greedy (Monte Carlo)
        // Run 1000 iterations or until exact match
        const iterations = 1000;
        const pool = [...candidates];
        for (let i = 0; i < iterations; i++) {
            // Fisher-Yates shuffle
            for (let j = pool.length - 1; j > 0; j--) {
                const k = Math.floor(Math.random() * (j + 1));
                [pool[j], pool[k]] = [pool[k], pool[j]];
            }
            if (runGreedy(pool)) return { selected: bestSelection, total: bestSum, exact: true };
        }

        return { selected: bestSelection, total: bestSum, exact: false };
    };

    const result = solveSubsetSum(products, target);
    let finalSelection = result.selected.map(p => ({
        ...p.toObject(),
        weightKg: getWeight(p), // BRUTTO ishlatiladi
        originalWeight: getWeight(p),
        originalBags: p.bagsCount
    }));
    let currentTotal = result.total;

    // If not exact, fill remainder
    if (!result.exact && currentTotal < target) {
        const remainder = target - currentTotal;
        const selectedIds = new Set(finalSelection.map(p => p._id.toString()));
        const remainingCandidates = products.filter(p => !selectedIds.has(p._id.toString()));

        // Sort remaining by weight ASC to find smallest sufficient bag
        remainingCandidates.sort((a, b) => {
             const valA = targetType === 'weight' ? getWeight(a) : a.bagsCount;
             const valB = targetType === 'weight' ? getWeight(b) : b.bagsCount;
             return valA - valB;
        });

        // Try to find one bag that covers the remainder
        let filler = remainingCandidates.find(p => {
             const val = targetType === 'weight' ? getWeight(p) : p.bagsCount;
             return val >= remainder - 0.001;
        });

        if (!filler && remainingCandidates.length > 0) {
            // If no single bag is big enough, take the largest available to cover as much as possible
            // Actually, just take whatever is needed from the largest/smallest?
            // Let's just take the largest one to maximize coverage?
            // Or just take the first one (smallest) and we might need more?
            // Simplification: Just take the first available one (smallest) and cut it?
            // But wait, if filler is not found, it means ALL remaining bags are smaller than remainder.
            // So we need MULTIPLE bags.
            // But usually we just add one partial.
            // Let's just consume bags until remainder is filled.
            
            // Re-sort desc to fill efficiently? Or asc?
            // Let's use the standard "fill gap" logic.
            // Iterate and consume.
            let needed = remainder;
            for (const p of remainingCandidates) {
                const pWeight = getWeight(p);
                const val = targetType === 'weight' ? pWeight : p.bagsCount;
                const take = Math.min(val, needed);

                const isPartial = Math.abs(take - val) > 0.001;
                const bagsPart = (take / pWeight) * p.bagsCount; // Estimate bags count

                finalSelection.push({
                    ...p.toObject(),
                    weightKg: targetType === 'weight' ? take : (take / p.bagsCount) * pWeight, // BRUTTO ishlatiladi
                    bagsCount: targetType === 'weight' ? bagsPart : take,
                    originalWeight: pWeight,
                    originalBags: p.bagsCount,
                    isPartial: isPartial,
                    note: isPartial ? "Qisman olingan" : undefined
                });

                needed -= take;
                currentTotal += take;

                if (needed <= 0.001) break;
            }
        } else if (filler) {
            // We found a bag big enough. Cut it.
            const fillerWeight = getWeight(filler);
            const val = targetType === 'weight' ? fillerWeight : filler.bagsCount;
            const take = remainder;
            const isPartial = Math.abs(take - val) > 0.001;

            // Calculate proportional values
            // If target is weight: take = remainder (kg)
            // bags = (take / fullWeight) * fullBags

            // If target is bags: take = remainder (bags)
            // weight = (take / fullBags) * fullWeight

            let finalWeight, finalBags;

            if (targetType === 'weight') {
                finalWeight = take;
                finalBags = (take / fillerWeight) * filler.bagsCount;
            } else {
                finalBags = take;
                finalWeight = (take / filler.bagsCount) * fillerWeight;
            }

            finalSelection.push({
                ...filler.toObject(),
                weightKg: Number(finalWeight.toFixed(2)),
                bagsCount: Number(finalBags.toFixed(2)),
                originalWeight: fillerWeight,
                originalBags: filler.bagsCount,
                isPartial: isPartial,
                note: isPartial ? "Qisman olingan" : undefined
            });
            currentTotal += take;
        }
    }

    res.json({
      success: true,
      data: {
        products: finalSelection,
        totalWeight: Number(finalSelection.reduce((sum, p) => sum + p.weightKg, 0).toFixed(2)),
        totalBags: Number(finalSelection.reduce((sum, p) => sum + p.bagsCount, 0).toFixed(2)),
      }
    });
  } catch (error) {
    logger.error("Auto select products error:", error);
    res.status(500).json({ success: false, message: "Avtomatik tanlashda xatolik yuz berdi" });
  }
};
