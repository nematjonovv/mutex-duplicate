import CurrencyRate from "../models/CurrencyRate.js";
import { logger } from "../config/logger.js";
import { z } from "zod";

const addRateSchema = z.object({
  currency: z.enum(["USD", "RUB"]),
  rate: z.number().positive("Kurs musbat bo'lishi kerak"),
});

// Add new currency rate
export const addRate = async (req, res) => {
  try {
    const validatedData = addRateSchema.parse(req.body);

    const newRate = new CurrencyRate({
      ...validatedData,
      createdBy: req.user._id,
      date: new Date(),
    });

    await newRate.save();

    res.status(201).json({
      success: true,
      message: "Valyuta kursi muvaffaqiyatli yangilandi",
      data: newRate,
    });
  } catch (error) {
    logger.error("Add currency rate error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Valyuta kursini saqlashda xatolik yuz berdi",
    });
  }
};

// Get currency history
export const getRateHistory = async (req, res) => {
  try {
    const { currency, page = 1, limit = 10 } = req.query;
    const query = {};
    
    if (currency) {
      query.currency = currency;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [history, total] = await Promise.all([
      CurrencyRate.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("createdBy", "fullName"),
      CurrencyRate.countDocuments(query),
    ]);

    // Calculate changes
    const historyWithChange = await Promise.all(history.map(async (item, index) => {
        // Simple change calculation: compare with next item in the list (which is previous in time)
        // Note: This only works perfectly if we fetch everything, but for pagination we might miss the context.
        // For a better approach, we could fetch one more item or just rely on the client to calculate diffs if feasible,
        // or just store the 'change' value in the DB when saving.
        
        // Let's try to find the previous rate from DB for accurate change calculation
        const previousRate = await CurrencyRate.findOne({
            currency: item.currency,
            date: { $lt: item.date }
        }).sort({ date: -1 });

        const change = previousRate ? item.rate - previousRate.rate : 0;
        
        return {
            ...item.toObject(),
            change
        };
    }));

    res.status(200).json({
      success: true,
      data: {
        data: historyWithChange,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit))
        }
      },
    });
  } catch (error) {
    logger.error("Get rate history error:", error);
    res.status(500).json({
      success: false,
      message: "Valyuta tarixini yuklashda xatolik yuz berdi",
    });
  }
};

// Get latest rates
export const getLatestRates = async (req, res) => {
    try {
        const usdRate = await CurrencyRate.findOne({ currency: "USD" }).sort({ date: -1 });
        const rubRate = await CurrencyRate.findOne({ currency: "RUB" }).sort({ date: -1 });

        res.status(200).json({
            success: true,
            data: {
                USD: usdRate ? usdRate.rate : 12000, // Default fallback
                RUB: rubRate ? rubRate.rate : 149,   // Default fallback
                UZS: 1
            }
        });
    } catch (error) {
        logger.error("Get latest rates error:", error);
        res.status(500).json({
            success: false,
            message: "Valyuta kurslarini yuklashda xatolik yuz berdi"
        });
    }
};
