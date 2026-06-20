import { logger } from "../config/logger.js";
import { z } from "zod";
import CashAccount from "../models/CashAccount.js";
import { Creditor, CreditorTransaction } from "../models/OurDebt.js";
import CashFlow from "../models/CashFlow.js";

// ─────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────
const createCreditorDebtSchema = z.object({
  creditorId: z.string().min(1, "Creditor ID is required"),
  amount: z.number().min(0.01, "Summa 0 dan katta bo'lishi kerak"),
  reasonType: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  occurredAt: z.string().optional().nullable(),
});

const recordPaymentSchema = z.object({
  amount: z.number().min(0.01, "Summa 0 dan katta bo'lishi kerak"),
  accountId: z.string().min(1, "Hisob raqami talab qilinadi"),
  paymentMethod: z.string().optional().nullable(),
  currency: z.enum(["USD", "UZS"]).optional().nullable(),
  rate: z.number().optional().nullable(),
  amountUSD: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
});

const updateCreditorSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updatePaymentSchema = z.object({
  amount: z.number().min(0.01, "Summa 0 dan katta bo'lishi kerak"),
  note: z.string().optional().nullable(),
  rate: z.number().optional().nullable(),
});

// ─────────────────────────────────────────────
// GET / — Barcha qarz beruvchilar ro'yxati
// ─────────────────────────────────────────────
export const getOurDebts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;

    const query = { deletedAt: null };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Creditor.countDocuments(query);

    const creditors = await Creditor.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      message: "Qarzlar ro'yxati yuklandi",
      data: {
        data: creditors,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error("Get our debts error:", error);
    res.status(500).json({
      success: false,
      message: "Qarzlar ro'yxatini yuklashda xatolik",
    });
  }
};

// ─────────────────────────────────────────────
// GET /:id — Bitta qarz beruvchi + tranzaksiya tarixi
// ─────────────────────────────────────────────
export const getOurDebtById = async (req, res) => {
  try {
    const { id } = req.params;

    const creditor = await Creditor.findById(id);
    if (!creditor || creditor.deletedAt)
      return res
        .status(404)
        .json({ success: false, message: "Qarz beruvchi topilmadi" });

    // Tranzaksiya tarixi (Oldi/Berdi)
    const transactions = await CreditorTransaction.find({
      creditorId: id,
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .populate("accountId", "name currency");

    res.status(200).json({
      success: true,
      message: "Qarz beruvchi ma'lumotlari yuklandi",
      data: {
        creditor,
        transactions,
      },
    });
  } catch (error) {
    logger.error("Get our debt by id error:", error);
    res.status(500).json({
      success: false,
      message: "Ma'lumotni yuklashda xatolik",
    });
  }
};

// ─────────────────────────────────────────────
// POST / — Yangi qarz qo'shish ("Oldi")  [createCreditorDebt]
// ─────────────────────────────────────────────
export const createCreditorDebt = async (req, res) => {
  try {
    const validatedData = createCreditorDebtSchema.parse(req.body);

    const creditor = await Creditor.findById(validatedData.creditorId);
    if (!creditor || creditor.deletedAt)
      return res
        .status(404)
        .json({ success: false, message: "Qarz beruvchi topilmadi" });

    // BIZ qarz oldik → balance kamayadi (manfiy tomonga)
    creditor.balance = (creditor.balance || 0) - validatedData.amount;

    await CreditorTransaction.create({
      creditorId: creditor._id,
      type: "DEBT",
      amount: validatedData.amount,
      balanceAfter: creditor.balance,
      currency: "USD",
      rate: 1,
      note:
        validatedData.note || validatedData.reasonType || "Qo'lda qo'shildi",
      createdBy: req.user._id,
    });

    await creditor.save();

    res.status(201).json({
      success: true,
      message: "Qarz muvaffaqiyatli qo'shildi",
      data: { balance: creditor.balance },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message:
          "Validatsiya xatoligi: " +
          error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", "),
        errors: error.errors,
      });
    }
    logger.error("Create creditor debt error:", error);
    res
      .status(500)
      .json({ success: false, message: "Qarz qo'shishda xatolik yuz berdi" });
  }
};

// ─────────────────────────────────────────────
// POST /:id/addition — Mavjud qarz beruvchiga yana qarz qo'shish
// (createCreditorDebt bilan bir xil, lekin creditorId paramdan keladi)
// ─────────────────────────────────────────────
export const recordOurDebtAddition = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, note, reasonType } = req.body;

    if (!amount || amount <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Summa 0 dan katta bo'lishi kerak" });

    const creditor = await Creditor.findById(id);
    if (!creditor || creditor.deletedAt)
      return res
        .status(404)
        .json({ success: false, message: "Qarz beruvchi topilmadi" });

    creditor.balance = (creditor.balance || 0) - amount;

    await CreditorTransaction.create({
      creditorId: creditor._id,
      type: "DEBT",
      amount,
      balanceAfter: creditor.balance,
      currency: "USD",
      rate: 1,
      note: note || reasonType || "Qo'lda qo'shildi",
      createdBy: req.user._id,
    });

    await creditor.save();

    res.status(201).json({
      success: true,
      message: "Qarz muvaffaqiyatli qo'shildi",
      data: { balance: creditor.balance },
    });
  } catch (error) {
    logger.error("Record our debt addition error:", error);
    res
      .status(500)
      .json({ success: false, message: "Qarz qo'shishda xatolik yuz berdi" });
  }
};

// ─────────────────────────────────────────────
// POST /:id/payment — Qarzni to'lash ("Berdi") — kassadan pul CHIQADI
// ─────────────────────────────────────────────
export const recordOurDebtPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = recordPaymentSchema.parse(req.body);

    const creditor = await Creditor.findById(id);
    if (!creditor || creditor.deletedAt)
      return res
        .status(404)
        .json({ success: false, message: "Qarz beruvchi topilmadi" });

    const account = await CashAccount.findById(validatedData.accountId);
    if (!account)
      return res
        .status(404)
        .json({ success: false, message: "Hisob raqami topilmadi" });

    const paymentCurrency = validatedData.currency || account.currency || "USD";
    const paymentRate = validatedData.rate || 1;

    const amountUSD =
      validatedData.amountUSD !== undefined && validatedData.amountUSD !== null
        ? validatedData.amountUSD
        : paymentCurrency === "UZS"
          ? validatedData.amount / paymentRate
          : validatedData.amount;

    // Kassada yetarli pul bormi? (chiqishdan oldin tekshiramiz)
    if (account.currentBalance < validatedData.amount) {
      return res.status(400).json({
        success: false,
        message: `Kassada yetarli mablag' yo'q. Mavjud: ${account.currentBalance}`,
      });
    }

    // BIZ qarzni to'ladik → balance oshadi (musbat tomonga)
    creditor.balance = (creditor.balance || 0) + amountUSD;
    const txType = creditor.balance >= 0 ? "ADVANCE" : "PAYMENT";

    await CreditorTransaction.create({
      creditorId: creditor._id,
      type: txType,
      amount: amountUSD,
      balanceAfter: creditor.balance,
      accountId: account._id,
      currency: paymentCurrency,
      rate: paymentRate,
      originalAmount:
        paymentCurrency === "UZS" ? validatedData.amount : amountUSD,
      paymentMethod: validatedData.paymentMethod || "CASH",
      note: validatedData.note || `To'lov ${creditor.name}`,
      createdBy: req.user._id,
    });

    await creditor.save();

    // KASSADAN PUL CHIQADI (isCredit = false)
    await account.updateBalance(validatedData.amount, false);

    await CashFlow.create({
      time: new Date(),
      category: "DEBT_PAYMENT",
      direction: "OUT",
      amount: validatedData.amount,
      paymentMethod: validatedData.paymentMethod || "CASH",
      note: validatedData.note || `Qarz to'lovi: ${creditor.name}`,
      accountId: account._id,
      relatedCreditorId: creditor._id,
      createdBy: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: "To'lov muvaffaqiyatli amalga oshirildi",
      data: { balance: creditor.balance },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message:
          "Validatsiya xatoligi: " +
          error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", "),
        errors: error.errors,
      });
    }
    if (error.message === "Insufficient balance") {
      return res.status(400).json({
        success: false,
        message: "Kassada yetarli mablag' yo'q",
      });
    }
    logger.error("Record our debt payment error:", error);
    res.status(500).json({
      success: false,
      message: "To'lovni amalga oshirishda xatolik",
    });
  }
};

// ─────────────────────────────────────────────
// PUT /:id — Qarz beruvchi ma'lumotini tahrirlash
// ─────────────────────────────────────────────
export const updateOurDebt = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateCreditorSchema.parse(req.body);

    const creditor = await Creditor.findById(id);
    if (!creditor || creditor.deletedAt)
      return res
        .status(404)
        .json({ success: false, message: "Qarz beruvchi topilmadi" });

    Object.assign(creditor, validatedData);
    await creditor.save();

    res.status(200).json({
      success: true,
      message: "Ma'lumot muvaffaqiyatli yangilandi",
      data: { creditor },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message:
          "Validatsiya xatoligi: " +
          error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", "),
        errors: error.errors,
      });
    }
    logger.error("Update our debt error:", error);
    res
      .status(500)
      .json({ success: false, message: "Yangilashda xatolik yuz berdi" });
  }
};

// ─────────────────────────────────────────────
// PUT /:debtId/payment/:paymentId — To'lov yozuvini tahrirlash
// ─────────────────────────────────────────────
export const updateOurDebtPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const validatedData = updatePaymentSchema.parse(req.body);

    const transaction = await CreditorTransaction.findById(paymentId);
    if (!transaction || transaction.deletedAt)
      return res
        .status(404)
        .json({ success: false, message: "Tranzaksiya topilmadi" });

    const creditor = await Creditor.findById(transaction.creditorId);
    if (!creditor)
      return res
        .status(404)
        .json({ success: false, message: "Qarz beruvchi topilmadi" });

    // Eski summa ta'sirini balansdan qaytaramiz
    if (transaction.type === "DEBT") {
      // eski qarz balansni kamaytirgan edi → qaytaramiz (qo'shamiz)
      creditor.balance += transaction.amount;
    } else {
      // eski to'lov balansni oshirgan edi → qaytaramiz (ayiramiz)
      creditor.balance -= transaction.amount;
    }

    // Yangi summani USD ga hisoblaymiz
    const newRate = validatedData.rate || transaction.rate || 1;
    const newAmountUSD =
      transaction.currency === "UZS"
        ? validatedData.amount / newRate
        : validatedData.amount;

    // Yangi summa ta'sirini qo'llaymiz
    if (transaction.type === "DEBT") {
      creditor.balance -= newAmountUSD;
    } else {
      creditor.balance += newAmountUSD;
    }

    // Tranzaksiyani yangilaymiz
    transaction.amount = newAmountUSD;
    transaction.originalAmount =
      transaction.currency === "UZS" ? validatedData.amount : newAmountUSD;
    transaction.rate = newRate;
    transaction.balanceAfter = creditor.balance;
    if (validatedData.note !== undefined) transaction.note = validatedData.note;
    transaction.isEdited = true;

    await transaction.save();
    await creditor.save();

    res.status(200).json({
      success: true,
      message: "To'lov muvaffaqiyatli yangilandi",
      data: { balance: creditor.balance },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message:
          "Validatsiya xatoligi: " +
          error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", "),
        errors: error.errors,
      });
    }
    logger.error("Update our debt payment error:", error);
    res
      .status(500)
      .json({ success: false, message: "To'lovni yangilashda xatolik" });
  }
};

// ─────────────────────────────────────────────
// DELETE /:id — Qarz beruvchini o'chirish (soft delete)
// ─────────────────────────────────────────────
export const deleteOurDebt = async (req, res) => {
  try {
    const { id } = req.params;

    const creditor = await Creditor.findByIdAndDelete(id);

    if (!creditor) {
      return res.status(404).json({
        success: false,
        message: "Qarz beruvchi topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      message: "Qarz beruvchi muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    logger.error("Delete our debt error:", error);
    res.status(500).json({
      success: false,
      message: "O'chirishda xatolik yuz berdi",
    });
  }
};
// ─────────────────────────────────────────────
// GET /stats/summary — Jami qarz / haq statistikasi
// ─────────────────────────────────────────────
export const getOurDebtSummary = async (req, res) => {
  try {
    const creditors = await Creditor.find({ deletedAt: null });

    let totalDebt = 0; // bizning jami qarzimiz (balance < 0)
    let totalAdvance = 0; // bizning jami haqimiz (balance > 0)
    let debtorsCount = 0;

    creditors.forEach((c) => {
      const balance = c.balance || 0;
      if (balance < 0) {
        totalDebt += Math.abs(balance);
        debtorsCount++;
      } else if (balance > 0) {
        totalAdvance += balance;
      }
    });

    res.status(200).json({
      success: true,
      message: "Statistika yuklandi",
      data: {
        summary: {
          totalDebt,
          totalAdvance,
          creditorsWithDebt: debtorsCount,
          totalCreditors: creditors.length,
        },
      },
    });
  } catch (error) {
    logger.error("Get our debt summary error:", error);
    res.status(500).json({
      success: false,
      message: "Statistikani yuklashda xatolik",
    });
  }
};

const createCreditorSchema = z.object({
  name: z.string().min(1, "Nomi kiritilishi shart"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // boshlang'ich qarz summasi (biz qancha qarzdormiz)
  amount: z.number().min(0).optional().nullable(),
  note: z.string().optional().nullable(),
});

export const createCreditor = async (req, res) => {
  try {
    const validatedData = createCreditorSchema.parse(req.body);

    const debtAmount = validatedData.amount || 0;

    // BIZ qarzdormiz → balance manfiy
    const creditor = new Creditor({
      name: validatedData.name,
      phone: validatedData.phone,
      address: validatedData.address,
      notes: validatedData.notes,
      balance: -debtAmount,
      createdBy: req.user._id,
    });

    await creditor.save();

    // Boshlang'ich qarz bo'lsa, tranzaksiya tarixiga ham yozamiz
    if (debtAmount > 0) {
      await CreditorTransaction.create({
        creditorId: creditor._id,
        type: "DEBT",
        amount: debtAmount,
        balanceAfter: creditor.balance,
        currency: "USD",
        rate: 1,
        note: validatedData.note || "Boshlang'ich qarz",
        createdBy: req.user._id,
      });
    }

    res.status(201).json({
      success: true,
      message: "Qarz beruvchi muvaffaqiyatli yaratildi",
      data: { creditor },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message:
          "Validatsiya xatoligi: " +
          error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", "),
        errors: error.errors,
      });
    }
    logger.error("Create creditor error:", error);
    res.status(500).json({
      success: false,
      message: "Qarz beruvchi yaratishda xatolik yuz berdi",
    });
  }
};
