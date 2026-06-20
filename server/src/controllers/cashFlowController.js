import CashFlow from "../models/CashFlow.js";
import CashAccount from "../models/CashAccount.js";
import Debt from "../models/Debt.js";
import Client from "../models/Client.js";
import Invoice from "../models/Invoice.js";
import { logger } from "../config/logger.js";
import { z } from "zod";
// Validation schemas
const createCashFlowSchema = z.object({
  time: z
    .string({ invalid_type_error: "Vaqt noto'g'ri formatda" })
    .datetime({ message: "Vaqt noto'g'ri formatda" })
    .optional(),
  category: z
    .string({ required_error: "Kategoriya talab qilinadi" })
    .min(1, "Kategoriya talab qilinadi"),
  direction: z.enum(["IN", "OUT"], {
    errorMap: () => ({ message: "Yo'nalish KIRIM yoki CHIQIM bo'lishi kerak" }),
  }),
  amount: z
    .number({
      required_error: "Miqdor talab qilinadi",
      invalid_type_error: "Miqdor raqam bo'lishi kerak",
    })
    .positive("Miqdor musbat bo'lishi kerak"),
  paymentMethod: z
    .string({ required_error: "To'lov usuli talab qilinadi" })
    .min(1, "To'lov usuli talab qilinadi"),
  note: z.string().optional(),
  accountId: z
    .string({ required_error: "Hisob ID si talab qilinadi" })
    .min(1, "Hisob ID si talab qilinadi"),
});

const updateCashFlowSchema = z.object({
  time: z
    .string({ invalid_type_error: "Vaqt noto'g'ri formatda" })
    .datetime({ message: "Vaqt noto'g'ri formatda" })
    .optional(),
  category: z.string().min(1, "Kategoriya talab qilinadi").optional(),
  direction: z
    .enum(["IN", "OUT"], {
      errorMap: () => ({
        message: "Yo'nalish KIRIM yoki CHIQIM bo'lishi kerak",
      }),
    })
    .optional(),
  amount: z
    .number({ invalid_type_error: "Miqdor raqam bo'lishi kerak" })
    .positive("Miqdor musbat bo'lishi kerak")
    .optional(),
  paymentMethod: z.string().min(1, "To'lov usuli talab qilinadi").optional(),
  note: z.string().optional(),
  accountId: z.string().min(1, "Hisob ID si talab qilinadi").optional(),
});
async function syncDebtPayment(cashFlow, newAmount, newNote, userId) {
  if (!cashFlow.relatedDebtId || !cashFlow.relatedPaymentId) return;

  const debt = await Debt.findById(cashFlow.relatedDebtId);
  if (!debt || debt.deletedAt) return;

  const payment = debt.payments.id(cashFlow.relatedPaymentId);
  if (!payment) return;

  const client = await Client.findById(debt.clientId);

  const rate = payment.rate && payment.rate > 0 ? payment.rate : 1;
  const oldAmountUSD =
    payment.currency === "UZS" ? payment.amount / rate : payment.amount;
  const newAmountUSD =
    payment.currency === "UZS" ? newAmount / rate : newAmount;

  // eski to'lovni bekor qilish
  debt.currentDebt += oldAmountUSD;
  if (client) client.currentDebt = (client.currentDebt || 0) + oldAmountUSD;

  let invoice = null;
  if (debt.invoiceNo) {
    invoice = await Invoice.findOne({ invoiceNo: debt.invoiceNo });
    if (invoice) {
      invoice.paid = Math.max(0, (invoice.paid || 0) - oldAmountUSD);
      invoice.balance = Math.max(0, invoice.netTotal - invoice.paid);
      invoice.status =
        invoice.balance === 0
          ? "PAID"
          : invoice.paid > 0
            ? "PARTIAL"
            : "UNPAID";
    }
  }

  // yangi to'lovni qo'llash
  const appliedUSD = Math.min(newAmountUSD, debt.currentDebt);
  debt.currentDebt -= appliedUSD;
  debt.updatedBy = userId;
  const leftoverUSD = newAmountUSD - appliedUSD;

  if (client) {
    client.currentDebt = Math.max(0, client.currentDebt - appliedUSD);
    if (leftoverUSD > 0)
      client.advanceBalance = (client.advanceBalance || 0) + leftoverUSD;
    await client.save();
  }

  if (invoice) {
    invoice.paid = (invoice.paid || 0) + appliedUSD;
    invoice.balance = Math.max(0, invoice.netTotal - invoice.paid);
    invoice.status =
      invoice.balance === 0 ? "PAID" : invoice.paid > 0 ? "PARTIAL" : "UNPAID";
    invoice.updatedBy = userId;
    await invoice.save();
  }

  payment.amount = newAmount;
  if (newNote !== undefined) payment.note = newNote;
  await debt.save();
}

// Get all cash flows with pagination and filters
export const getCashFlows = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      direction = "",
      category = "",
      accountId = "",
      startDate = "",
      endDate = "",
    } = req.query;

    // Build query
    const query = { deletedAt: null };

    if (search) {
      query.$or = [
        { category: { $regex: search, $options: "i" } },
        { note: { $regex: search, $options: "i" } },
      ];
    }

    if (direction) {
      query.direction = direction;
    }

    if (category) {
      query.category = category;
    }

    if (accountId) {
      query.accountId = accountId;
    }

    if (startDate || endDate) {
      query.time = {};
      if (startDate) query.time.$gte = new Date(startDate);
      if (endDate) query.time.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await CashFlow.countDocuments(query);

    // Get cash flows with account population
    const cashFlows = await CashFlow.find(query)
      .populate("accountId", "name type currency")
      .populate("relatedInvoiceId", "invoiceNo")
      .populate("relatedClientId", "name")
      .sort({ time: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      message: "Pul oqimlari muvaffaqiyatli yuklandi",
      data: {
        data: cashFlows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error("Error getting cash flows:", error);
    res.status(500).json({
      success: false,
      message: "Pul oqimlarini yuklashda xatolik yuz berdi",
    });
  }
};

// Get cash flow by ID
export const getCashFlowById = async (req, res) => {
  try {
    const { id } = req.params;

    const cashFlow = await CashFlow.findById(id)
      .populate("accountId", "name type currency")
      .populate("createdBy", "fullName");

    if (!cashFlow || cashFlow.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Pul oqimi topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      message: "Pul oqimi muvaffaqiyatli yuklandi",
      data: { cashFlow },
    });
  } catch (error) {
    logger.error("Error getting cash flow by ID:", error);
    res.status(500).json({
      success: false,
      message: "Pul oqimini yuklashda xatolik yuz berdi",
    });
  }
};

// Create new cash flow
export const createCashFlow = async (req, res) => {
  try {
    const validatedData = createCashFlowSchema.parse(req.body);

    // Check if account exists
    const account = await CashAccount.findById(validatedData.accountId);
    if (!account || account.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Hisob topilmadi",
      });
    }

    // Create cash flow
    const cashFlow = new CashFlow({
      ...validatedData,
      time: validatedData.time ? new Date(validatedData.time) : new Date(),
      createdBy: req.user._id,
    });

    if (
      validatedData.direction === "OUT" &&
      account.currentBalance < validatedData.amount
    ) {
      return res.status(400).json({
        success: false,
        message: "Hisobda mablag' yetarli emas",
      });
    }

    await cashFlow.save();

    // Update account balance
    if (validatedData.direction === "IN") {
      account.currentBalance += validatedData.amount;
    } else {
      account.currentBalance -= validatedData.amount;
    }
    await account.save();

    // Populate account for response
    await cashFlow.populate("accountId", "name type currency");

    res.status(201).json({
      success: true,
      message: "Pul oqimi muvaffaqiyatli yaratildi",
      data: { cashFlow },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Tasdiqlash xatosi",
        errors: error.errors,
      });
    }

    logger.error("Error creating cash flow:", error);
    res.status(500).json({
      success: false,
      message: "Pul oqimini yaratishda xatolik yuz berdi",
    });
  }
};

// Update cash flow
export const updateCashFlow = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateCashFlowSchema.parse(req.body);

    const cashFlow = await CashFlow.findById(id);
    if (!cashFlow || cashFlow.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Pul oqimi topilmadi",
      });
    }
    const isLinked =
      cashFlow.relatedTransactionId ||
      cashFlow.relatedDebtId ||
      cashFlow.relatedPaymentId ||
      cashFlow.relatedInvoiceId ||
      cashFlow.relatedCreditorId;

    if (isLinked) {
      return res.status(403).json({
        success: false,
        message:
          "Bu yozuv boshqa bo'limdan (qarz, faktura va h.k.) kelgan. Uni faqat o'sha bo'limdan tahrirlash mumkin.",
      });
    }
    if (
      cashFlow.relatedDebtId &&
      cashFlow.relatedPaymentId &&
      ((validatedData.amount !== undefined &&
        validatedData.amount !== cashFlow.amount) ||
        (validatedData.note !== undefined &&
          validatedData.note !== cashFlow.note))
    ) {
      const amountToApply =
        validatedData.amount !== undefined
          ? validatedData.amount
          : cashFlow.amount;
      await syncDebtPayment(
        cashFlow,
        amountToApply,
        validatedData.note,
        req.user._id,
      );
    }
    // Check if account, amount or direction needs update
    if (
      (validatedData.accountId &&
        validatedData.accountId !== cashFlow.accountId.toString()) ||
      validatedData.amount !== undefined ||
      validatedData.direction !== undefined
    ) {
      const oldAccountId = cashFlow.accountId;
      const newAccountId = validatedData.accountId || oldAccountId;
      const oldAmount = cashFlow.amount;
      const oldDirection = cashFlow.direction;

      const newAmount =
        validatedData.amount !== undefined ? validatedData.amount : oldAmount;
      const newDirection =
        validatedData.direction !== undefined
          ? validatedData.direction
          : oldDirection;

      if (oldAccountId.toString() === newAccountId.toString()) {
        const account = await CashAccount.findById(oldAccountId);
        if (account) {
          let updatedBalance = account.currentBalance;
          updatedBalance += oldDirection === "IN" ? -oldAmount : oldAmount;
          updatedBalance += newDirection === "IN" ? newAmount : -newAmount;

          if (updatedBalance < 0) {
            return res.status(400).json({
              success: false,
              message: "Hisobda mablag' yetarli emas",
            });
          }

          account.currentBalance = updatedBalance;
          await account.save();
        }
      } else {
        const oldAccount = await CashAccount.findById(oldAccountId);
        const newAccount = await CashAccount.findById(newAccountId);
        if (!newAccount) {
          return res
            .status(404)
            .json({ success: false, message: "Yangi hisob topilmadi" });
        }

        let oldBalance = oldAccount ? oldAccount.currentBalance : null;
        let newBalance = newAccount.currentBalance;

        if (oldAccount) {
          oldBalance += oldDirection === "IN" ? -oldAmount : oldAmount;
          if (oldBalance < 0) {
            return res.status(400).json({
              success: false,
              message: "Hisobda mablag' yetarli emas",
            });
          }
        }

        newBalance += newDirection === "IN" ? newAmount : -newAmount;
        if (newBalance < 0) {
          return res.status(400).json({
            success: false,
            message: "Yangi hisobda mablag' yetarli emas",
          });
        }

        if (oldAccount) {
          oldAccount.currentBalance = oldBalance;
          await oldAccount.save();
        }
        newAccount.currentBalance = newBalance;
        await newAccount.save();
      }
    }
    // Update cash flow
    const updateData = {
      ...validatedData,
      updatedBy: req.user._id,
      isEdited: true,
    };

    if (validatedData.time) {
      updateData.time = new Date(validatedData.time);
    }

    const updatedCashFlow = await CashFlow.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate("accountId", "name type currency");

    res.status(200).json({
      success: true,
      message: "Pul oqimi muvaffaqiyatli yangilandi",
      data: { cashFlow: updatedCashFlow },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Tasdiqlash xatosi",
        errors: error.errors,
      });
    }

    logger.error("Error updating cash flow:", error);
    res.status(500).json({
      success: false,
      message: "Pul oqimini yangilashda xatolik yuz berdi",
    });
  }
};

// Delete cash flow
export const deleteCashFlow = async (req, res) => {
  try {
    const { id } = req.params;

    const cashFlow = await CashFlow.findById(id);
    if (!cashFlow || cashFlow.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Pul oqimi topilmadi",
      });
    }

    const isLinked =
      cashFlow.relatedTransactionId ||
      cashFlow.relatedDebtId ||
      cashFlow.relatedPaymentId ||
      cashFlow.relatedInvoiceId ||
      cashFlow.relatedCreditorId;

    if (isLinked) {
      return res.status(403).json({
        success: false,
        message:
          "Bu yozuv boshqa bo'limdan kelgan. Uni faqat o'sha bo'limdan o'chirish mumkin.",
      });
    }

    // Update account balance (reverse the transaction)
    const account = await CashAccount.findById(cashFlow.accountId);
    if (account) {
      if (cashFlow.direction === "IN") {
        account.currentBalance -= cashFlow.amount;
      } else {
        account.currentBalance += cashFlow.amount;
      }
      await account.save();
    }

    // Soft delete
    await CashFlow.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      updatedBy: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: "Pul oqimi muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    logger.error("Error deleting cash flow:", error);
    res.status(500).json({
      success: false,
      message: "Pul oqimini o'chirishda xatolik yuz berdi",
    });
  }
};

// Get cash flow statistics
export const getCashFlowStats = async (req, res) => {
  try {
    const { startDate, endDate, accountId } = req.query;

    const query = { deletedAt: null };
    if (startDate || endDate) {
      query.time = {};
      if (startDate) query.time.$gte = new Date(startDate);
      if (endDate) query.time.$lte = new Date(endDate);
    }
    if (accountId) query.accountId = accountId;

    const [totalIncome, totalExpense, recentCashFlows] = await Promise.all([
      CashFlow.aggregate([
        { $match: { ...query, direction: "IN" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      CashFlow.aggregate([
        { $match: { ...query, direction: "OUT" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      CashFlow.find(query)
        .populate("account", "name")
        .sort({ time: -1 })
        .limit(10),
    ]);

    const stats = {
      totalIncome: totalIncome[0]?.total || 0,
      totalExpense: totalExpense[0]?.total || 0,
      netFlow: (totalIncome[0]?.total || 0) - (totalExpense[0]?.total || 0),
      recentCashFlows,
    };

    res.status(200).json({
      success: true,
      message: "Pul oqimi statistikasi muvaffaqiyatli yuklandi",
      data: { stats },
    });
  } catch (error) {
    logger.error("Error getting cash flow stats:", error);
    res.status(500).json({
      success: false,
      message: "Pul oqimi statistikasini yuklashda xatolik yuz berdi",
    });
  }
};

// Get distinct categories
export const getCategories = async (req, res) => {
  try {
    const categories = await CashFlow.distinct("category", { deletedAt: null });
    res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    logger.error("Error getting categories:", error);
    res.status(500).json({
      success: false,
      message: "Kategoriyalarni yuklashda xatolik yuz berdi",
    });
  }
};
