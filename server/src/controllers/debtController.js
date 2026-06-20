import Debt from "../models/Debt.js";
import Client from "../models/Client.js";
import Invoice from "../models/Invoice.js";
import CashAccount from "../models/CashAccount.js";
import CashFlow from "../models/CashFlow.js";
import { logger } from "../config/logger.js";
import { z } from "zod";
import { Transaction } from "../models/ClientDebtTransaction.js";

// Validation schemas
const createDebtSchema = z.object({
  clientId: z.string().min(1, "Mijoz ID si talab qilinadi"),
  invoiceNo: z.string().optional(),
  reasonType: z
    .string()
    .min(1, "Sabab turi talab qilinadi")
    .max(100, "Sabab turi 100 ta belgidan oshmasligi kerak"),
  amount: z.number().positive("Miqdor musbat bo'lishi kerak"),
  paymentMethod: z
    .string()
    .min(1, "To'lov usuli talab qilinadi")
    .max(50, "To'lov usuli 50 ta belgidan oshmasligi kerak"),
  occurredAt: z.string().datetime().optional(),
  note: z.string().max(500, "Izoh 500 ta belgidan oshmasligi kerak").optional(),
});

const updateDebtSchema = z.object({
  reasonType: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  paymentMethod: z.string().min(1).max(50).optional(),
  occurredAt: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
});

const clientPaymentSchema = z.object({
  amount: z.number().positive("To'lov miqdori musbat bo'lishi kerak"),
  paymentMethod: z
    .string()
    .min(1, "To'lov usuli talab qilinadi")
    .max(50, "To'lov usuli 50 ta belgidan oshmasligi kerak"),
  note: z.string().max(500).optional(),
  accountId: z.string().min(1, "Hisob raqami talab qilinadi"),
  currency: z.enum(["USD", "UZS"]).optional(),
  rate: z.number().positive().optional(),
  amountUSD: z.number().positive().optional(),
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
  clientId: z.string().optional(),
  paymentMethod: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  hasCurrentDebt: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  hasInvoice: z
    .string()
    .transform((val) => val === "true")
    .optional(),
});

const updatePaymentSchema = z.object({
  amount: z.number().positive("To'lov miqdori musbat bo'lishi kerak"),
  note: z.string().max(500).optional(),
  rate: z.number().positive().optional(),
});

// ── Controller Functions ──

export const updateDebtPayment = async (req, res) => {
  try {
    const { debtId, paymentId } = req.params;
    // debtId = transactionId, paymentId ishlatilmaydi endi

    const validatedData = updatePaymentSchema.parse(req.body);

    const transaction = await Transaction.findById(debtId);
    if (!transaction || transaction.deletedAt)
      return res
        .status(404)
        .json({ success: false, message: "Tranzaksiya topilmadi" });

    const client = await Client.findById(transaction.clientId);
    if (!client)
      return res
        .status(404)
        .json({ success: false, message: "Mijoz topilmadi" });

    const rate = validatedData.rate ?? transaction.rate ?? 1;
    const oldAmountUSD = transaction.amount;
    const newAmountUSD =
      transaction.currency === "UZS"
        ? validatedData.amount / rate
        : validatedData.amount;

    // balance qayta hisoblanadi
    // eski to'lovni bekor qil, yangisini qo'y
    const diff = newAmountUSD - oldAmountUSD;
    // PAYMENT bo'lsa diff manfiy bo'lsa balance kamayadi (yaxshi)
    // DEBT bo'lsa diff musbat bo'lsa balance kamayadi (yomon)
    if (transaction.type === "PAYMENT" || transaction.type === "ADVANCE") {
      client.balance = (client.balance || 0) - diff;
    } else if (transaction.type === "DEBT") {
      client.balance = (client.balance || 0) - diff;
    }

    transaction.amount = newAmountUSD;
    transaction.balanceAfter = client.balance;
    transaction.rate = rate;
    transaction.isEdited = true;
    if (validatedData.note !== undefined) transaction.note = validatedData.note;
    if (validatedData.amount !== undefined)
      transaction.originalAmount =
        transaction.currency === "UZS" ? validatedData.amount : newAmountUSD;

    await transaction.save();
    await client.save();

    // CashFlow yangilanadi
    const cashFlow = await CashFlow.findOne({
      relatedTransactionId: transaction._id,
      deletedAt: null,
    });
    if (cashFlow) {
      const account = await CashAccount.findById(cashFlow.accountId);
      if (account) {
        account.currentBalance =
          account.currentBalance - cashFlow.amount + validatedData.amount;
        await account.save();
      }
      cashFlow.amount = validatedData.amount;
      if (validatedData.note !== undefined) cashFlow.note = validatedData.note;
      await cashFlow.save();
    }

    res.status(200).json({
      success: true,
      message: "To'lov muvaffaqiyatli yangilandi",
      data: { transaction },
    });
  } catch (error) {
    logger.error("Update debt payment error:", error);
    res.status(500).json({
      success: false,
      message: "To'lovni yangilashda xatolik yuz berdi",
    });
  }
};

export const getDebts = async (req, res) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const {
      page,
      limit,
      clientId,
      paymentMethod,
      startDate,
      endDate,
      hasCurrentDebt,
      hasInvoice,
    } = validatedQuery;
    const query = { deletedAt: null };
    if (clientId) query.clientId = clientId;
    if (paymentMethod)
      query.paymentMethod = { $regex: paymentMethod, $options: "i" };
    if (startDate || endDate) {
      query.occurredAt = {};
      if (startDate) query.occurredAt.$gte = new Date(startDate);
      if (endDate) query.occurredAt.$lte = new Date(endDate);
    }
    if (hasCurrentDebt !== undefined)
      query.currentDebt = hasCurrentDebt ? { $gt: 0 } : 0;
    if (hasInvoice !== undefined) {
      if (hasInvoice) query.invoiceNo = { $exists: true, $ne: null, $ne: "" };
      else
        query.$or = [
          { invoiceNo: { $exists: false } },
          { invoiceNo: null },
          { invoiceNo: "" },
        ];
    }
    const skip = (page - 1) * limit;
    const [debts, total] = await Promise.all([
      Debt.find(query)
        .populate("clientId", "name phone")
        .sort({ occurredAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Debt.countDocuments(query),
    ]);
    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
      success: true,
      data: {
        data: debts,
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
    logger.error("Get debts error:", error);
    res.status(500).json({
      success: false,
      message: "Qarzlarni yuklashda xatolik yuz berdi",
    });
  }
};

export const getDebtById = async (req, res) => {
  try {
    const { id } = req.params;
    const debt = await Debt.findById(id)
      .populate("clientId", "name phone address")
      .lean();
    if (!debt || debt.deletedAt)
      return res
        .status(404)
        .json({ success: false, message: "Qarz topilmadi" });
    res.status(200).json({ success: true, data: { debt } });
  } catch (error) {
    logger.error("Get debt by ID error:", error);
    res
      .status(500)
      .json({ success: false, message: "Qarzni yuklashda xatolik yuz berdi" });
  }
};

export const createDebt = async (req, res) => {
  try {
    const validatedData = createDebtSchema.parse(req.body);
    const client = await Client.findById(validatedData.clientId);
    if (!client || client.deletedAt)
      return res
        .status(404)
        .json({ success: false, message: "Mijoz topilmadi" });
    client.balance = (client.balance || 0) - validatedData.amount;
    // avans bo'lsa avtomatik kamayadi, chunki balance musbatdan manfiyga o'tadi

    await Transaction.create({
      clientId: client._id,
      type: "DEBT",
      amount: validatedData.amount,
      balanceAfter: client.balance,
      currency: "USD",
      rate: 1,
      note: validatedData.note || validatedData.reasonType,
      createdBy: req.user._id,
    });

    await client.save();

    res.status(201).json({
      success: true,
      message: "Qarz muvaffaqiyatli yaratildi",
      data: { balance: client.balance },
    });
  } catch (error) {
    logger.error("Create debt error:", error);
    res
      .status(500)
      .json({ success: false, message: "Qarz yaratishda xatolik yuz berdi" });
  }
};

export const updateDebt = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateDebtSchema.parse(req.body);
    const debt = await Debt.findById(id);
    if (!debt || debt.deletedAt)
      return res
        .status(404)
        .json({ success: false, message: "Qarz topilmadi" });
    let debtDifference = 0;
    if (
      validatedData.amount !== undefined &&
      validatedData.amount !== debt.amount
    )
      debtDifference = validatedData.amount - debt.amount;
    Object.assign(debt, validatedData, {
      occurredAt: validatedData.occurredAt
        ? new Date(validatedData.occurredAt)
        : debt.occurredAt,
      updatedBy: req.user._id,
    });
    if (debtDifference !== 0) {
      debt.currentDebt = Math.max(0, debt.currentDebt + debtDifference);
      debt.totalDebt = Math.max(debt.totalDebt, debt.currentDebt);
    }
    await debt.save();
    if (debtDifference !== 0) {
      const client = await Client.findById(debt.clientId);
      if (client)
        await client.updateDebt(Math.abs(debtDifference), debtDifference < 0);
    }
    await debt.populate("clientId", "name phone");
    res.status(200).json({
      success: true,
      message: "Qarz muvaffaqiyatli yangilandi",
      data: { debt },
    });
  } catch (error) {
    logger.error("Update debt error:", error);
    res.status(500).json({
      success: false,
      message: "Qarzni yangilashda xatolik yuz berdi",
    });
  }
};

export const deleteDebt = async (req, res) => {
  try {
    const { id } = req.params;
    const debt = await Debt.findById(id);
    if (!debt || debt.deletedAt)
      return res
        .status(404)
        .json({ success: false, message: "Qarz topilmadi" });
    if (debt.currentDebt > 0)
      return res.status(400).json({
        success: false,
        message: "To'lanmagan qoldig'i bor qarzni o'chirib bo'lmaydi",
      });
    debt.deletedAt = new Date();
    debt.updatedBy = req.user._id;
    await debt.save();
    res
      .status(200)
      .json({ success: true, message: "Qarz muvaffaqiyatli o'chirildi" });
  } catch (error) {
    logger.error("Delete debt error:", error);
    res.status(500).json({
      success: false,
      message: "Qarzni o'chirishda xatolik yuz berdi",
    });
  }
};

export const recordDebtPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      paymentMethod,
      note,
      accountId,
      currency,
      rate,
      amountUSD,
    } = req.body;
    if (!amount || amount <= 0)
      return res.status(400).json({
        success: false,
        message: "To'lov miqdori musbat bo'lishi kerak",
      });
    if (!accountId)
      return res.status(400).json({
        success: false,
        message: "To'lov uchun hisob raqami tanlanishi shart",
      });
    const debt = await Debt.findById(id);
    if (!debt || debt.deletedAt)
      return res
        .status(404)
        .json({ success: false, message: "Qarz topilmadi" });
    if (debt.currentDebt <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Qarz allaqachon to'liq to'langan" });
    const account = await CashAccount.findById(accountId);
    if (!account)
      return res
        .status(404)
        .json({ success: false, message: "Hisob raqami topilmadi" });

    const paymentCurrency = currency || "USD";
    const paymentRate = rate || 1;
    const computedAmountUSD =
      amountUSD !== undefined
        ? amountUSD
        : paymentCurrency === "UZS"
          ? amount / paymentRate
          : amount;
    const paymentAmountUSD = Math.min(computedAmountUSD, debt.currentDebt);
    debt.currentDebt -= paymentAmountUSD;
    debt.updatedBy = req.user._id;
    debt.payments.push({
      amount: paymentAmountUSD,
      method: paymentMethod || "CASH",
      date: new Date(),
      note: note || "",
      rate: paymentCurrency === "UZS" ? paymentRate : 1,
      currency: paymentCurrency,
      recordedBy: req.user._id,
      accountId: account._id,
    });
    await debt.save();
    const savedPayment = debt.payments[debt.payments.length - 1];
    const client = await Client.findById(debt.clientId);
    if (client) {
      await client.updateDebt(paymentAmountUSD, true);
      const remainingAdvanceUSD = computedAmountUSD - paymentAmountUSD;
      if (remainingAdvanceUSD > 0) {
        client.advanceBalance =
          (client.advanceBalance || 0) + remainingAdvanceUSD;
        await client.save();
      }
    }
    const ratio =
      computedAmountUSD > 0 ? paymentAmountUSD / computedAmountUSD : 0;
    const accountAmountApplied = amount * ratio;
    await account.updateBalance(accountAmountApplied, true);
    const extraAdvanceAccount = amount - accountAmountApplied;
    if (extraAdvanceAccount > 0)
      await account.updateBalance(extraAdvanceAccount, true);
    const cashFlow = new CashFlow({
      time: new Date(),
      category: "DEBT_PAYMENT",
      direction: "IN",
      amount: accountAmountApplied,
      paymentMethod: paymentMethod || "CASH",
      note:
        note || `Qarz uchun to'lov ${client ? client.name : "Noma'lum Mijoz"}`,
      accountId: account._id,
      relatedClientId: debt.clientId,
      relatedDebtId: debt._id,
      relatedPaymentId: savedPayment._id,
      createdBy: req.user._id,
    });
    if (debt.invoiceNo) {
      const invoice = await Invoice.findOne({ invoiceNo: debt.invoiceNo });
      if (invoice) {
        invoice.paid = (invoice.paid || 0) + paymentAmountUSD;
        invoice.balance = Math.max(0, invoice.netTotal - invoice.paid);
        invoice.status =
          invoice.balance === 0
            ? "PAID"
            : invoice.paid > 0
              ? "PARTIAL"
              : "UNPAID";
        invoice.transactions.push({
          type: "PAYMENT",
          amount: paymentAmountUSD,
          method: paymentMethod || "CASH",
          at: new Date(),
          note: note || "Qarz to'lovi",
        });
        await invoice.save();
        cashFlow.relatedInvoiceId = invoice._id;
      }
    }
    await cashFlow.save();
    const extraAdvanceUSD = computedAmountUSD - paymentAmountUSD;
    if (extraAdvanceUSD > 0)
      await CashFlow.create({
        time: new Date(),
        category: "ADVANCE_PAYMENT",
        direction: "IN",
        amount: extraAdvanceAccount,
        paymentMethod: paymentMethod || "CASH",
        note:
          note || `Avans to'lovi ${client ? client.name : "Noma'lum Mijoz"}`,
        accountId: account._id,
        relatedClientId: debt.clientId,
        createdBy: req.user._id,
      });
    await debt.populate("clientId", "name phone");
    res.status(200).json({
      success: true,
      message: "To'lov muvaffaqiyatli qayd etildi",
      data: { debt },
    });
  } catch (error) {
    logger.error("Record debt payment error:", error);
    res.status(500).json({
      success: false,
      message: "To'lovni qayd etishda xatolik yuz berdi",
    });
  }
};

export const recordClientDebtPayment = async (req, res) => {
  try {
    // CLIENT ID OLINYBADI
    const { clientId } = req.params;
    // SCHEMA BILAN VALIDATE QILYABDI
    const validatedData = clientPaymentSchema.parse(req.body);

    // CLIENT QIDIRYABDI
    const client = await Client.findById(clientId);
    // CLIENT BOLMASA 404
    if (!client || client.deletedAt)
      return res
        .status(404)
        .json({ success: false, message: "Mijoz topilmadi" });

    // ACCOUNT QIDIRILYABDI BODYDA KELGAN PAYOAD ICHIDAGI ACCOUNTID BILAN
    const account = await CashAccount.findById(validatedData.accountId);
    // ACCOUN BOLMASA 404
    if (!account)
      return res
        .status(404)
        .json({ success: false, message: "Hisob raqami topilmadi" });

    const paymentCurrency = validatedData.currency || account.currency || "USD";

    const paymentRate = validatedData.rate || 1;

    const amountUSD =
      validatedData.amountUSD !== undefined
        ? validatedData.amountUSD
        : paymentCurrency === "UZS"
          ? validatedData.amount / paymentRate
          : validatedData.amount;

    client.balance = (client.balance || 0) + amountUSD;
    const txType = client.balance >= 0 ? "ADVANCE" : "PAYMENT";

    const transaction = await Transaction.create({
      clientId: client._id,
      type: txType,
      amount: amountUSD,
      balanceAfter: client.balance,
      accountId: account._id,
      currency: paymentCurrency,
      rate: paymentRate,
      originalAmount:
        paymentCurrency === "UZS" ? validatedData.amount : amountUSD,
      paymentMethod: validatedData.paymentMethod || "CASH",
      note: validatedData.note || `To'lov ${client.name}`,
      createdBy: req.user._id,
    });

    await client.save();
    await account.updateBalance(validatedData.amount, true);

    await CashFlow.create({
      time: new Date(),
      category: txType === "ADVANCE" ? "ADVANCE_PAYMENT" : "DEBT_PAYMENT",
      direction: "IN",
      amount: validatedData.amount,
      paymentMethod: validatedData.paymentMethod || "CASH",
      note: validatedData.note || `To'lov ${client.name}`,
      accountId: account._id,
      relatedClientId: client._id,
      relatedTransactionId: transaction._id,
      createdBy: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: "To'lov muvaffaqiyatli qabul qilindi",
      data: { balance: client.balance },
    });
  } catch (error) {
    logger.error("Record client debt payment error:", error);
    res.status(500).json({
      success: false,
      message: "To'lovni taqsimlashda xatolik yuz berdi",
    });
  }
};

export const getDebtsByClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const [debts, total] = await Promise.all([
      Debt.find({ clientId, deletedAt: null })
        .sort({ occurredAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Debt.countDocuments({ clientId, deletedAt: null }),
    ]);
    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
      success: true,
      data: {
        data: debts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Get debts by client error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch client debts" });
  }
};

export const getDebtSummary = async (req, res) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const { startDate, endDate, paymentMethod, hasCurrentDebt, hasInvoice } =
      validatedQuery;
    const query = { deletedAt: null };
    if (paymentMethod)
      query.paymentMethod = { $regex: paymentMethod, $options: "i" };
    if (startDate || endDate) {
      query.occurredAt = {};
      if (startDate) query.occurredAt.$gte = new Date(startDate);
      if (endDate) query.occurredAt.$lte = new Date(endDate);
    }
    if (hasCurrentDebt !== undefined)
      query.currentDebt = hasCurrentDebt ? { $gt: 0 } : 0;
    if (hasInvoice !== undefined) {
      if (hasInvoice) query.invoiceNo = { $exists: true, $ne: null, $ne: "" };
      else
        query.$or = [
          { invoiceNo: { $exists: false } },
          { invoiceNo: null },
          { invoiceNo: "" },
        ];
    }
    const [totalDebts, totalAmount, paidAmount, outstandingAmount] =
      await Promise.all([
        Debt.countDocuments(query),
        Debt.aggregate([
          { $match: query },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        Debt.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              total: { $sum: { $subtract: ["$amount", "$currentDebt"] } },
            },
          },
        ]),
        Debt.aggregate([
          { $match: query },
          { $group: { _id: null, total: { $sum: "$currentDebt" } } },
        ]),
      ]);
    const summary = {
      totalDebts,
      totalAmount: totalAmount[0]?.total || 0,
      paidAmount: paidAmount[0]?.total || 0,
      outstandingAmount: outstandingAmount[0]?.total || 0,
      paymentRate:
        totalAmount[0]?.total > 0
          ? ((paidAmount[0]?.total || 0) / totalAmount[0].total) * 100
          : 0,
    };
    res.status(200).json({ success: true, data: { summary } });
  } catch (error) {
    logger.error("Get debt summary error:", error);
    res.status(500).json({
      success: false,
      message: "Qarz hisobotini yuklashda xatolik yuz berdi",
    });
  }
};

export const getRecentDebts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const debts = await Debt.find({ deletedAt: null })
      .populate("clientId", "name phone")
      .sort({ occurredAt: -1 })
      .limit(parseInt(limit))
      .lean();
    res.status(200).json({ success: true, data: { debts } });
  } catch (error) {
    logger.error("Get recent debts error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch recent debts" });
  }
};

export const getTransactionsByClient = async (req, res) => {
  try {
    const { clientId } = req.params;

    const transactions = await Transaction.find({
      clientId,
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        data: transactions,
        total: transactions.length,
      },
    });
  } catch (error) {
    logger.error("Get transactions by client error:", error);
    res.status(500).json({
      success: false,
      message: "Tranzaksiyalarni yuklashda xatolik yuz berdi",
    });
  }
};
