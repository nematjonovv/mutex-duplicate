import CashAccount from "../models/CashAccount.js";
import { logger } from "../config/logger.js";
import { z } from "zod";

// Validation schemas
const createAccountSchema = z.object({
  name: z.string().min(1, "Hisob nomi talab qilinadi").max(100, "Hisob nomi juda uzun"),
  type: z.string().min(1, "Hisob turi talab qilinadi"),
  currency: z.enum(["USD", "UZS"]).default("USD"),
  currentBalance: z.number().min(0, "Balans manfiy bo'lishi mumkin emas"),
  description: z.string().optional(),
});

const updateAccountSchema = z.object({
  name: z.string().min(1, "Hisob nomi talab qilinadi").max(100, "Hisob nomi juda uzun").optional(),
  type: z.string().min(1, "Hisob turi talab qilinadi").optional(),
  currency: z.enum(["USD", "UZS"]).optional(),
  currentBalance: z.number().min(0, "Balans manfiy bo'lishi mumkin emas").optional(),
  description: z.string().optional(),
});

// Get all cash accounts
export const getCashAccounts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", type = "" } = req.query;

    // Build query
    const query = { deletedAt: null };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (type) {
      query.type = type;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await CashAccount.countDocuments(query);

    // Get accounts
    const accounts = await CashAccount.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // If limit is high (dropdown case), return all active accounts without pagination structure if needed, 
    // but consistent response is better. 
    // The issue might be that frontend expects a flat array for dropdown but gets paginated object.
    // Let's check how `getAllAccounts` is called. It passes `limit: 1000`.
    // The response structure is `{ data: accounts, pagination: ... }`.
    // Frontend `accountService.getAllAccounts` expects `ApiResponse<CashAccount[]>`.
    // But `apiService.get` returns `response.data`.
    // If backend returns `{ success: true, data: [...], pagination: ... }` then `response.data` is `[...]`.
    // Wait, `getCashAccounts` returns `data: accounts`.
    // So `apiService.get` returns `{ accounts, pagination }` object as `data`?
    // No, `apiService.get` usually returns the full response body or just data.
    // Let's check `apiService`.

    res.status(200).json({
      success: true,
      message: "Pul hisoblari muvaffaqiyatli yuklandi",
      data: { 
        data: accounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Error getting cash accounts:", error);
    res.status(500).json({
      success: false,
      message: "Pul hisoblarini yuklashda xatolik yuz berdi",
    });
  }
};

// Get cash account by ID
export const getCashAccountById = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await CashAccount.findById(id);

    if (!account || account.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Pul hisobi topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      message: "Pul hisobi muvaffaqiyatli yuklandi",
      data: { account },
    });
  } catch (error) {
    logger.error("Error getting cash account by ID:", error);
    res.status(500).json({
      success: false,
      message: "Pul hisobini yuklashda xatolik yuz berdi",
    });
  }
};

// Create new cash account
export const createCashAccount = async (req, res) => {
  try {
    const validatedData = createAccountSchema.parse(req.body);

    // Check if account with same name already exists
    const existingAccount = await CashAccount.findOne({
      name: validatedData.name,
      deletedAt: null,
    });

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: "Bunday nomli hisob allaqachon mavjud",
      });
    }

    // Create account
    const account = new CashAccount({
      ...validatedData,
      createdBy: req.user._id,
    });

    await account.save();

    res.status(201).json({
      success: true,
      message: "Pul hisobi muvaffaqiyatli yaratildi",
      data: { account },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Tasdiqlash xatosi",
        errors: error.errors,
      });
    }

    logger.error("Error creating cash account:", error);
    res.status(500).json({
      success: false,
      message: "Pul hisobini yaratishda xatolik yuz berdi",
    });
  }
};

// Update cash account
export const updateCashAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateAccountSchema.parse(req.body);

    const account = await CashAccount.findById(id);
    if (!account || account.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Pul hisobi topilmadi",
      });
    }

    // Check if name is being changed and if it conflicts
    if (validatedData.name && validatedData.name !== account.name) {
      const existingAccount = await CashAccount.findOne({
        name: validatedData.name,
        deletedAt: null,
        _id: { $ne: id },
      });

      if (existingAccount) {
        return res.status(400).json({
          success: false,
          message: "Bunday nomli hisob allaqachon mavjud",
        });
      }
    }

    // Update account
    const updatedAccount = await CashAccount.findByIdAndUpdate(
      id,
      {
        ...validatedData,
        updatedBy: req.user._id,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Pul hisobi muvaffaqiyatli yangilandi",
      data: { account: updatedAccount },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Tasdiqlash xatosi",
        errors: error.errors,
      });
    }

    logger.error("Error updating cash account:", error);
    res.status(500).json({
      success: false,
      message: "Pul hisobini yangilashda xatolik yuz berdi",
    });
  }
};

// Delete cash account
export const deleteCashAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await CashAccount.findById(id);
    if (!account || account.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Pul hisobi topilmadi",
      });
    }

    // Check if account has balance
    if (account.currentBalance > 0) {
      return res.status(400).json({
        success: false,
        message: "Musbat balansli hisobni o'chirib bo'lmaydi",
      });
    }

    // Soft delete
    await CashAccount.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      updatedBy: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: "Pul hisobi muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    logger.error("Error deleting cash account:", error);
    res.status(500).json({
      success: false,
      message: "Pul hisobini o'chirishda xatolik yuz berdi",
    });
  }
};

// Get account statistics
export const getAccountStats = async (req, res) => {
  try {
    const [totalAccounts, totalBalance, accountTypes] = await Promise.all([
      CashAccount.countDocuments({ deletedAt: null }),
      CashAccount.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: null, total: { $sum: "$currentBalance" } } },
      ]),
      CashAccount.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: "$type", count: { $sum: 1 }, totalBalance: { $sum: "$currentBalance" } } },
      ]),
    ]);

    const stats = {
      totalAccounts,
      totalBalance: totalBalance[0]?.total || 0,
      accountTypes,
    };

    res.status(200).json({
      success: true,
      message: "Hisob statistikasi muvaffaqiyatli yuklandi",
      data: { stats },
    });
  } catch (error) {
    logger.error("Error getting account stats:", error);
    res.status(500).json({
      success: false,
      message: "Hisob statistikasini yuklashda xatolik yuz berdi",
    });
  }
};
