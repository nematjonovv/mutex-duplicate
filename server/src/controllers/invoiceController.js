import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import Client from "../models/Client.js";
import Debt from "../models/Debt.js";
import FinishedProduct from "../models/FinishedProduct.js";
import CashFlow from "../models/CashFlow.js";
import { logger } from "../config/logger.js";
import { z } from "zod";

import CashAccount from "../models/CashAccount.js";

import {
  paginate,
  paginationSchema as basePaginationSchema,
} from "../utils/pagination.js";
import { withTransaction } from "../utils/transaction.js";
import { Transaction } from "../models/ClientDebtTransaction.js";

// Validation schemas
const createInvoiceSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientMeta: z.object({
    name: z.string().min(1, "Client name is required"),
    phone: z.string().optional(),
    carNo: z.string().optional(),
    clientType: z.string().optional(),
  }),
  items: z
    .array(
      z.object({
        batchCode: z.string().optional(),
        batchCodes: z.array(z.string()).optional(),
        productName: z.string().min(1, "Product name is required"),
        colorName: z.string().min(1, "Color name is required"),
        colorCode: z.string().optional(),
        weightKg: z.number().min(0, "Weight must be non-negative"),
        bagsCount: z
          .number()
          .min(0, "Bags count must be non-negative")
          .optional()
          .default(0),
        price: z
          .number()
          .min(0, "Price must be non-negative")
          .optional()
          .default(0),
        discount: z.number().min(0).optional(),
        batches: z
          .array(
            z.object({
              batch: z.string(),
              weight: z.number(),
              bags: z.number().optional(),
            }),
          )
          .optional(),
        isManual: z.boolean().optional(),
      }),
    )
    .min(1, "At least one item is required"),
  discountPercent: z.number().min(0).max(100).optional(),
  discountTotal: z.number().min(0).optional(),
  paymentMethod: z.string().optional(),
  note: z.string().max(500).optional(),
  driver: z.string().optional(),
  driverName: z.string().optional(),
  carNumber: z.string().optional(),
  handedBy: z.string().optional(),
  initialPayment: z.number().min(0).optional(),
  accountId: z.string().optional(),
  currency: z.enum(["UZS", "USD", "RUB"]).optional(),
  currencyRate: z.number().positive().optional(),
  payments: z
    .array(
      z.object({
        amount: z.number().min(0),
        accountId: z.string().min(1, "Kassa tanlanishi shart"),
        method: z.string().optional(),
        currency: z.enum(["USD", "UZS"]).optional(),
        rate: z.number().min(1).optional(),
        amountUSD: z.number().min(0).optional(),
      }),
    )
    .optional(),
});

const updateInvoiceSchema = z.object({
  items: z
    .array(
      z.object({
        batchCode: z.string().optional(),
        batchCodes: z.array(z.string()).optional(),
        productName: z.string().min(1),
        colorName: z.string().min(1),
        colorCode: z.string().optional(),
        weightKg: z.number().min(0),
        bagsCount: z.number().min(0).optional().default(0),
        price: z.number().min(0).optional().default(0),
        discount: z.number().min(0).optional(),
        batches: z
          .array(
            z.object({
              batch: z.string(),
              weight: z.number(),
              bags: z.number().optional(),
            }),
          )
          .optional(),
        isManual: z.boolean().optional(),
      }),
    )
    .optional(),
  discountTotal: z.number().min(0).optional(),
  note: z.string().max(500).optional(),
  driver: z.string().optional(),
  driverName: z.string().optional(),
  carNumber: z.string().optional(),
  handedBy: z.string().optional(),
});

const paginationSchema = basePaginationSchema.extend({
  clientId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  hasBalance: z
    .union([z.string(), z.boolean()])
    .transform((val) => val === "true" || val === true)
    .optional(),
  paymentMethod: z.string().optional(),
});

// Generate invoice number
const generateInvoiceNumber = async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  // Get count of invoices for today
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );

  const count = await Invoice.countDocuments({
    createdAt: { $gte: startOfDay, $lt: endOfDay },
  });

  const sequence = String(count + 1).padStart(3, "0");
  return `INV-${year}${month}${day}-${sequence}`;
};

// Get all invoices with pagination and filters
export const getInvoices = async (req, res) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const {
      page,
      limit,
      clientId,
      startDate,
      endDate,
      hasBalance,
      paymentMethod,
    } = validatedQuery;

    const query = { deletedAt: null };

    if (clientId) {
      query.clientId = clientId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (hasBalance !== undefined) {
      if (hasBalance) {
        query.balance = { $gt: 0 };
      } else {
        query.balance = 0;
      }
    }

    if (paymentMethod) {
      query["transactions.method"] = { $regex: paymentMethod, $options: "i" };
    }

    const result = await paginate(Invoice, query, {
      page,
      limit,
      populate: "clientId", // Assuming clientId needs to be populated
      sort: { createdAt: -1 },
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatoligi",
        errors: error.errors,
      });
    }

    logger.error("Get invoices error:", error);
    res.status(500).json({
      success: false,
      message: "Fakturalarni olishda xatolik yuz berdi",
    });
  }
};

// Get invoice by ID
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id)
      .populate("clientId", "name phone address tin")
      .lean();

    if (!invoice || invoice.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Faktura topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      data: { invoice },
    });
  } catch (error) {
    logger.error("Get invoice by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Fakturani olishda xatolik yuz berdi",
    });
  }
};

// Create new invoice
export const createInvoice = async (req, res) => {
  try {
    const result = await withTransaction(async (session) => {
      const validatedData = createInvoiceSchema.parse(req.body);

      // Check if client exists
      const client = await Client.findById(validatedData.clientId).session(
        session,
      );
      if (!client || client.deletedAt) {
        throw { status: 404, message: "Mijoz topilmadi" };
      }

      // Extract all batch codes and validate status
      const productState = new Map(); // batchCode -> { weight, bags, status, originalDoc }

      const getProductState = async (batchCode) => {
        if (productState.has(batchCode)) return productState.get(batchCode);

        const product = await FinishedProduct.findOne({
          batch: batchCode,
        }).session(session);
        if (!product) return null;

        const state = {
          weight: product.weightKg,
          bags: product.bagsCount,
          status: product.status,
          originalDoc: product,
          isModified: false,
        };
        productState.set(batchCode, state);
        return state;
      };

      // Validate and simulate deductions
      for (const item of validatedData.items) {
        if (item.isManual) {
          // NEW: Skip inventory deduction for manual items
          continue;
        }
        if (item.isManual) {
          // NEW: Skip inventory deduction for manual items
          continue;
        }
        if (item.isManual) {
          // NEW: Skip inventory deduction for manual items
          continue;
        }
        if (item.batches && item.batches.length > 0) {
          // Detailed batch tracking
          for (const batchInfo of item.batches) {
            const state = await getProductState(batchInfo.batch);

            if (!state) {
              throw {
                status: 400,
                message: `Partiya topilmadi: ${batchInfo.batch}`,
              };
            }

            if (state.status === "SOLD") {
              throw {
                status: 400,
                message: `Partiya allaqachon sotilgan: ${batchInfo.batch}`,
              };
            }

            if (state.weight < batchInfo.weight - 0.1) {
              throw {
                status: 400,
                message: `Partiya ${batchInfo.batch} da yetarli mahsulot yo'q. Qoldiq: ${state.weight.toFixed(2)}kg, So'raldi: ${batchInfo.weight}kg`,
              };
            }

            // Simulate deduction
            state.weight -= batchInfo.weight;
            state.bags -= batchInfo.bags || 0;
            state.isModified = true;

            // Check if depleted
            if (state.weight <= 0.1) {
              state.status = "SOLD";
            }
          }
        } else {
          // Legacy/Simple path (assume full batch sale)
          const rawCodes = [];
          if (item.batchCode) rawCodes.push(item.batchCode);
          if (item.batchCodes && Array.isArray(item.batchCodes)) {
            rawCodes.push(...item.batchCodes);
          }
          const codes = [...new Set(rawCodes)];

          for (const code of codes) {
            if (!code) continue; // Skip empty codes for manual entries

            const state = await getProductState(code);

            if (!state) {
              throw { status: 400, message: `Partiya topilmadi: ${code}` };
            }

            if (state.status === "SOLD") {
              throw {
                status: 400,
                message: `Partiya allaqachon sotilgan: ${code}`,
              };
            }

            // Mark as sold
            state.status = "SOLD";
            state.weight = 0;
            state.bags = 0;
            state.isModified = true;
          }
        }
      }

      // Generate invoice number
      const invoiceNo = await generateInvoiceNumber();

      // Calculate totals
      const grossTotal = validatedData.items.reduce((sum, item) => {
        const itemTotal = item.weightKg * item.price;
        const itemDiscount = item.discount || 0;
        return sum + itemTotal - itemDiscount;
      }, 0);

      let discountTotal = validatedData.discountTotal || 0;

      // If discount percent is provided, calculate discount total
      if (validatedData.discountPercent > 0) {
        discountTotal = (grossTotal * validatedData.discountPercent) / 100;
      }

      const netTotal = grossTotal - discountTotal;

      // Create invoice
      const invoice = new Invoice({
        invoiceNo,
        clientId: validatedData.clientId,
        clientMeta: {
          ...validatedData.clientMeta,
          carNo: validatedData.carNumber || validatedData.clientMeta.carNo,
        },
        items: validatedData.items,
        grossTotal,
        discountPercent: validatedData.discountPercent || 0,
        discountTotal,
        netTotal,
        currency: validatedData.currency || "UZS",
        currencyRate: validatedData.currencyRate || 1,
        paid: 0,
        balance: netTotal,
        transactions: [],
        createdBy: req.user._id,
        driver: validatedData.driver || validatedData.driverName,
        driverName: validatedData.driverName || validatedData.driver,
        carNumber: validatedData.carNumber,
        handedBy: validatedData.handedBy,
        note: validatedData.note,
      });

      // Handle initial payments (multiple methods supported)
      const paymentEntries = [];

      if (validatedData.payments && validatedData.payments.length > 0) {
        for (const p of validatedData.payments) {
          if (p.amount > 0 && p.accountId) {
            const currency = p.currency || "USD";
            const rate = p.rate || 1;
            const amountUSD =
              p.amountUSD || (currency === "USD" ? p.amount : p.amount / rate);

            paymentEntries.push({
              amount: p.amount,
              amountUSD: amountUSD,
              currency: currency,
              rate: rate,
              accountId: p.accountId,
              method: p.method,
            });
          }
        }
      } else if (validatedData.initialPayment > 0) {
        if (!validatedData.accountId) {
          throw {
            status: 400,
            message: "Boshlang'ich to'lov uchun kassa tanlanishi shart",
          };
        }

        paymentEntries.push({
          amount: validatedData.initialPayment,
          accountId: validatedData.accountId,
          method: validatedData.paymentMethod,
        });
      }

      let firstPaymentMethod = validatedData.paymentMethod;

      for (const entry of paymentEntries) {
        const account = await CashAccount.findById(entry.accountId).session(
          session,
        );
        if (!account || account.deletedAt) {
          throw { status: 404, message: "Kassa topilmadi" };
        }

        if (invoice.balance <= 0) break;

        const usdAmount = entry.amountUSD || entry.amount;
        if (usdAmount <= 0) continue;

        const paymentAmountUSD = Math.min(usdAmount, invoice.balance);
        if (paymentAmountUSD <= 0) continue;

        const ratio = paymentAmountUSD / usdAmount;
        const originalAmount = entry.amount * ratio;

        const method =
          entry.method || account.type || validatedData.paymentMethod || "CASH";

        if (!firstPaymentMethod) firstPaymentMethod = method;

        invoice.paid += paymentAmountUSD;
        invoice.balance -= paymentAmountUSD;

        invoice.transactions.push({
          type: "PAYMENT",
          amount: paymentAmountUSD,
          originalAmount: originalAmount,
          currency: entry.currency || "USD",
          rate: entry.rate || 1,
          method,
          accountId: entry.accountId,
          at: new Date(),
          note:
            entry.currency === "UZS"
              ? `Boshlang'ich to'lov (${originalAmount.toLocaleString()} so'm, kurs: ${entry.rate})`
              : "Boshlang'ich to'lov",
          recordedBy: req.user._id,
        });

        account.currentBalance += originalAmount;
        await account.save({ session });

        await CashFlow.create(
          [
            {
              time: new Date(),
              category: "INVOICE_PAYMENT",
              direction: "IN",
              amount: originalAmount,
              currency: entry.currency || "USD",
              amountUSD: paymentAmountUSD,
              rate: entry.rate || 1,
              paymentMethod: method,
              note:
                entry.currency === "UZS"
                  ? `Faktura #${invoiceNo} (${originalAmount.toLocaleString()} so'm = $${paymentAmountUSD.toFixed(2)})`
                  : `Faktura #${invoiceNo} uchun boshlang'ich to'lov`,
              accountId: entry.accountId,
              relatedInvoiceId: invoice._id,
              relatedClientId: validatedData.clientId,
              createdBy: req.user._id,
            },
          ],
          { session },
        );
      }

      // Apply client's advance balance
      if (client.advanceBalance > 0 && invoice.balance > 0) {
        const usedAdvance = Math.min(client.advanceBalance, invoice.balance);
        invoice.paid += usedAdvance;
        invoice.balance -= usedAdvance;
        invoice.transactions.push({
          type: "PAYMENT",
          amount: usedAdvance,
          method: "ADVANCE",
          at: new Date(),
          note: "Avansdan qoplandi",
          recordedBy: req.user._id,
        });
        client.advanceBalance = Math.max(
          0,
          client.advanceBalance - usedAdvance,
        );
      }

      await invoice.save({ session });

      client.balance = (client.balance || 0) - invoice.balance;
      // minus = qarz, masalan: 0 - 500 = -500

      await Transaction.create(
        [
          {
            clientId: invoice.clientId,
            type: "DEBT",
            amount: invoice.balance, // USD, to'lanmagan qism
            balanceAfter: client.balance, // bu tranzaksiyadan keyin client.balance
            invoiceId: invoice._id,
            invoiceNo: invoice.invoiceNo,
            currency: "USD",
            rate: 1,
            note: `Faktura #${invoice.invoiceNo}`,
            createdBy: req.user._id,
          },
        ],
        { session },
      );
      client.invoices.push(invoice._id);
      await client.save({ session });
      const updatePromises = [];
      for (const [code, state] of productState.entries()) {
        if (state.isModified) {
          const update = {
            weightKg: Math.max(0, state.weight),
            bagsCount: Math.max(0, state.bags),
          };
          if (state.status === "SOLD") {
            update.status = "SOLD";
            update.soldAt = new Date();
          }
          updatePromises.push(
            FinishedProduct.updateOne(
              { batch: code },
              { $set: update },
              { session },
            ),
          );
        }
      }
      await Promise.all(updatePromises);
      await invoice.populate("clientId", "name phone");

      return invoice;
    });

    res.status(201).json({
      success: true,
      message: "Faktura muvaffaqiyatli yaratildi",
      data: { invoice: result },
    });
  } catch (error) {
    if (error.status) {
      return res
        .status(error.status)
        .json({ success: false, message: error.message });
    }
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatoligi",
        errors: error.errors,
      });
    }

    logger.error("Create invoice error:", error);
    res.status(500).json({
      success: false,
      message: "Fakturani yaratishda xatolik yuz berdi",
    });
  }
};

// Update invoice
export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateInvoiceSchema.parse(req.body);

    const invoice = await Invoice.findById(id);
    if (!invoice || invoice.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Faktura topilmadi",
      });
    }

    // Check if invoice has payments
    if (invoice.paid > 0) {
      return res.status(400).json({
        success: false,
        message: "To'lov qilingan fakturani o'zgartirib bo'lmaydi",
      });
    }

    // Update items if provided
    if (validatedData.items) {
      invoice.items = validatedData.items;

      // Recalculate totals
      const grossTotal = invoice.items.reduce((sum, item) => {
        const itemTotal = item.weightKg * item.price;
        const itemDiscount = item.discount || 0;
        return sum + itemTotal - itemDiscount;
      }, 0);

      invoice.grossTotal = grossTotal;
      invoice.netTotal = grossTotal - (validatedData.discountTotal || 0);
      invoice.balance = invoice.netTotal - invoice.paid;
    }

    // Update other fields
    if (validatedData.discountTotal !== undefined) {
      invoice.discountTotal = validatedData.discountTotal;
      invoice.netTotal = invoice.grossTotal - validatedData.discountTotal;
      invoice.balance = invoice.netTotal - invoice.paid;
    }

    if (validatedData.note !== undefined) {
      invoice.note = validatedData.note;
    }

    if (validatedData.driver !== undefined) {
      invoice.driver = validatedData.driver;
    }
    if (validatedData.driverName !== undefined) {
      invoice.driverName = validatedData.driverName;
      if (!invoice.driver) invoice.driver = validatedData.driverName;
    }

    if (validatedData.carNumber !== undefined) {
      invoice.carNumber = validatedData.carNumber;
      // Also update clientMeta.carNo if it matches logic
      invoice.clientMeta = {
        ...invoice.clientMeta,
        carNo: validatedData.carNumber,
      };
    }

    if (validatedData.handedBy !== undefined) {
      invoice.handedBy = validatedData.handedBy;
    }

    // Apply client's advance balance to invoice if any
    const client = await Client.findById(invoice.clientId);
    if (client && client.advanceBalance > 0 && invoice.balance > 0) {
      const usedAdvance = Math.min(client.advanceBalance, invoice.balance);
      invoice.paid += usedAdvance;
      invoice.balance -= usedAdvance;
      invoice.transactions.push({
        type: "PAYMENT",
        amount: usedAdvance,
        method: "ADVANCE",
        at: new Date(),
        note: "Avansdan qoplandi",
        recordedBy: req.user._id,
      });
      client.advanceBalance = Math.max(0, client.advanceBalance - usedAdvance);
      await client.save();
    }

    invoice.updatedBy = req.user._id;
    await invoice.save();

    // Sync Debt record
    try {
      const debt = await Debt.findOne({ invoiceNo: invoice.invoiceNo });
      if (debt) {
        debt.amount = invoice.netTotal;
        debt.currentDebt = invoice.balance;
        debt.totalDebt = invoice.netTotal;
        debt.updatedBy = req.user._id;
        if (invoice.note) debt.note = invoice.note;
        await debt.save();
      } else {
        // If debt record is missing (backfill), create it
        const paymentTx = invoice.transactions?.find(
          (t) => t.type === "PAYMENT",
        );
        await Debt.create({
          clientId: invoice.clientId,
          invoiceNo: invoice.invoiceNo,
          reasonType: "Faktura",
          amount: invoice.netTotal,
          currentDebt: invoice.balance,
          totalDebt: invoice.netTotal,
          paymentMethod: paymentTx?.method || "OTHER",
          occurredAt: invoice.createdAt,
          note: invoice.note,
          createdBy: invoice.createdBy,
          updatedBy: req.user._id,
        });
      }
    } catch (err) {
      logger.error("Error syncing debt for invoice update:", err);
    }

    // Populate client info for response
    await invoice.populate("clientId", "name phone");

    res.status(200).json({
      success: true,
      message: "Faktura muvaffaqiyatli yangilandi",
      data: { invoice },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatoligi",
        errors: error.errors,
      });
    }

    logger.error("Update invoice error:", error);
    res.status(500).json({
      success: false,
      message: "Fakturani yangilashda xatolik yuz berdi",
    });
  }
};

// Delete invoice (soft delete)
export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);
    if (!invoice || invoice.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Faktura topilmadi",
      });
    }

    // Kassadan to'lovlarni qaytarish (o'zgarmadi)
    if (invoice.paid > 0) {
      const payments = invoice.transactions.filter((t) => t.type === "PAYMENT");
      for (const payment of payments) {
        if (payment.accountId) {
          const account = await CashAccount.findById(payment.accountId);
          if (account) {
            account.currentBalance -= payment.amount;
            await account.save();
          }
        }
      }
    }

    // Client balance yangilanadi
    const client = await Client.findById(invoice.clientId);
    if (client) {
      client.balance = (client.balance || 0) + invoice.netTotal;

      await Transaction.create({
        clientId: client._id,
        type: "PAYMENT", // har doim PAYMENT
        amount: invoice.netTotal,
        balanceAfter: client.balance,
        invoiceId: invoice._id,
        invoiceNo: invoice.invoiceNo,
        currency: "USD",
        rate: 1,
        note: `Faktura o'chirildi #${invoice.invoiceNo}`,
        createdBy: req.user._id,
      });

      client.invoices = client.invoices.filter(
        (invId) => invId.toString() !== invoice._id.toString(),
      );
      await client.save();
    }

    // Soft delete
    invoice.deletedAt = new Date();
    invoice.updatedBy = req.user._id;
    await invoice.save();

    res.status(200).json({
      success: true,
      message: "Faktura muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    logger.error("Delete invoice error:", error);
    res.status(500).json({
      success: false,
      message: "Fakturani o'chirishda xatolik yuz berdi",
    });
  }
};

// Record payment
export const recordPayment = async (req, res) => {
  try {
    const result = await withTransaction(async (session) => {
      const { id } = req.params;
      const { amount, method, note, accountId, currency, rate, amountUSD } =
        req.body;

      if (!amount || amount <= 0) {
        throw { status: 400, message: "To'lov summasi musbat bo'lishi kerak" };
      }

      if (!accountId) {
        throw { status: 400, message: "Kassa tanlanishi shart" };
      }

      const account = await CashAccount.findById(accountId).session(session);
      if (!account || account.deletedAt) {
        throw { status: 404, message: "Kassa topilmadi" };
      }

      const invoice = await Invoice.findById(id).session(session);
      if (!invoice || invoice.deletedAt) {
        throw { status: 404, message: "Faktura topilmadi" };
      }

      if (invoice.balance <= 0) {
        throw { status: 400, message: "Faktura to'liq to'langan" };
      }

      // Calculate USD amount for invoice
      const paymentInUSD = amountUSD !== undefined ? amountUSD : amount;
      const originalAmount = amount;

      const paymentAmountUSD = Math.min(paymentInUSD, invoice.balance);
      invoice.paid += paymentAmountUSD;
      invoice.balance -= paymentAmountUSD;

      // Add transaction record
      invoice.transactions.push({
        type: "PAYMENT",
        amount: paymentAmountUSD,
        method: method || "CASH",
        accountId: accountId,
        currency: currency || "USD",
        rate: rate || 1,
        originalAmount: originalAmount,
        at: new Date(),
        note: note || "",
        recordedBy: req.user._id,
      });

      invoice.updatedBy = req.user._id;
      await invoice.save({ session });

      const client = await Client.findById(invoice.clientId).session(session);
      if (!client) throw { status: 404, message: "Mijoz topilmadi" };

      const txCurrency = currency || "USD";
      const txRate = rate || 1;

      client.balance = (client.balance || 0) + paymentAmountUSD;

      await Transaction.create(
        [
          {
            clientId: invoice.clientId,
            type: client.balance >= 0 ? "ADVANCE" : "PAYMENT",
            amount: paymentAmountUSD,
            balanceAfter: client.balance,
            invoiceId: invoice._id,
            invoiceNo: invoice.invoiceNo,
            accountId,
            currency: txCurrency,
            rate: txRate,
            originalAmount:
              txCurrency === "UZS" ? originalAmount : paymentAmountUSD,
            paymentMethod: method || "CASH",
            note: note || `Faktura #${invoice.invoiceNo} uchun to'lov`,
            createdBy: req.user._id,
          },
        ],
        { session },
      );

      client.updatedBy = req.user._id;
      await client.save({ session });

      // Create CashFlow record
      await CashFlow.create(
        [
          {
            time: new Date(),
            category: "INVOICE_PAYMENT",
            direction: "IN",
            amount: originalAmount,
            paymentMethod: method || "CASH",
            note: note || `Faktura #${invoice.invoiceNo} uchun to'lov`,
            accountId: accountId,
            relatedInvoiceId: invoice._id,
            relatedClientId: invoice.clientId,
            createdBy: req.user._id,
          },
        ],
        { session },
      );

      if (client) {
        client.currentDebt = Math.max(0, client.currentDebt - paymentAmountUSD);
        client.totalDebt = Math.max(client.totalDebt, client.currentDebt);
        client.updatedBy = req.user._id;
        await client.save({ session });
      }

      await invoice.populate("clientId", "name phone");
      return invoice;
    });

    res.status(200).json({
      success: true,
      message: "To'lov muvaffaqiyatli qabul qilindi",
      data: { invoice: result },
    });
  } catch (error) {
    if (error.status) {
      return res
        .status(error.status)
        .json({ success: false, message: error.message });
    }
    logger.error("Record payment error:", error);
    res.status(500).json({
      success: false,
      message: "To'lovni qabul qilishda xatolik yuz berdi",
    });
  }
};

// Scan batch and get items
export const scanBatch = async (req, res) => {
  try {
    const { batchCode } = req.params;
    const decodedBatchCode = decodeURIComponent(batchCode).trim();

    const items = await FinishedProduct.find({
      $or: [
        { batch: { $regex: new RegExp(`^${decodedBatchCode}$`, "i") } },
        { bagsParties: { $regex: new RegExp(`^${decodedBatchCode}$`, "i") } },
      ],
      deletedAt: null,
    })
      .select(
        "productName color colorCode weightKg brutto bagsCount batch bagsParties status",
      )
      .lean();

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Mahsulot topilmadi",
      });
    }

    // Check if item is sold
    if (items[0].status === "SOLD") {
      return res.status(400).json({
        success: false,
        message: "Bu mahsulot allaqachon sotilgan",
      });
    }

    // Map items to invoice item format - use NETTO (weightKg) for sales
    const formattedItems = items.map((item) => ({
      _id: item._id,
      batchCode: item.batch,
      productName: item.productName,
      colorName: item.color,
      colorCode: item.colorCode,
      weightKg: item.weightKg, // NETTO - tarasiz sof og'irlik
      bagsCount: item.bagsCount,
    }));

    res.status(200).json({
      success: true,
      data: { items: formattedItems },
    });
  } catch (error) {
    logger.error("Scan batch error:", error);
    res.status(500).json({
      success: false,
      message: "Partiyani skanerlashda xatolik yuz berdi",
    });
  }
};

// Mark invoice as printed
export const markAsPrinted = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);
    if (!invoice || invoice.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    invoice.printedAt = new Date();
    invoice.updatedBy = req.user._id;
    await invoice.save();

    res.status(200).json({
      success: true,
      message: "Faktura chop etilgan deb belgilandi",
      data: { invoice },
    });
  } catch (error) {
    logger.error("Mark as printed error:", error);
    res.status(500).json({
      success: false,
      message: "Fakturani chop etilgan deb belgilashda xatolik",
    });
  }
};

// Get invoice summary
export const getInvoiceSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = { deletedAt: null };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [totalInvoices, totalAmount, totalPaid, totalBalance] =
      await Promise.all([
        Invoice.countDocuments(query),
        Invoice.aggregate([
          { $match: query },
          { $group: { _id: null, total: { $sum: "$netTotal" } } },
        ]),
        Invoice.aggregate([
          { $match: query },
          { $group: { _id: null, total: { $sum: "$paid" } } },
        ]),
        Invoice.aggregate([
          { $match: query },
          { $group: { _id: null, total: { $sum: "$balance" } } },
        ]),
      ]);

    const summary = {
      totalInvoices,
      totalAmount: totalAmount[0]?.total || 0,
      totalPaid: totalPaid[0]?.total || 0,
      totalBalance: totalBalance[0]?.total || 0,
      paymentRate:
        totalAmount[0]?.total > 0
          ? ((totalPaid[0]?.total || 0) / totalAmount[0].total) * 100
          : 0,
    };

    res.status(200).json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    logger.error("Get invoice summary error:", error);
    res.status(500).json({
      success: false,
      message: "Faktura hisobotini olishda xatolik",
    });
  }
};

// Get recent invoices
export const getRecentInvoices = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const invoices = await Invoice.find({ deletedAt: null })
      .populate("clientId", "name phone")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: { invoices },
    });
  } catch (error) {
    logger.error("Get recent invoices error:", error);
    res.status(500).json({
      success: false,
      message: "So'nggi fakturalarni olishda xatolik",
    });
  }
};

// Get sold products from invoices
export const getSoldProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const clientId = req.query.clientId;

    // Build match query for invoices
    const invoiceMatch = { deletedAt: null };

    if (startDate || endDate) {
      invoiceMatch.createdAt = {};
      if (startDate) invoiceMatch.createdAt.$gte = new Date(startDate);
      if (endDate) invoiceMatch.createdAt.$lte = new Date(endDate);
    }

    if (clientId) {
      invoiceMatch.clientId = new mongoose.Types.ObjectId(clientId);
    }

    // Aggregate to get sold products
    const pipeline = [
      { $match: invoiceMatch },
      { $unwind: "$items" },
      {
        $project: {
          invoiceNo: 1,
          invoiceId: "$_id",
          createdAt: 1,
          clientId: 1,
          clientMeta: 1,
          batchCode: "$items.batchCode",
          productName: "$items.productName",
          colorName: "$items.colorName",
          colorCode: "$items.colorCode",
          weightKg: "$items.weightKg",
          bagsCount: "$items.bagsCount",
          price: "$items.price",
          total: { $multiply: ["$items.weightKg", "$items.price"] },
          batches: "$items.batches",
        },
      },
    ];

    // Add search filter if provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { productName: { $regex: search, $options: "i" } },
            { colorName: { $regex: search, $options: "i" } },
            { batchCode: { $regex: search, $options: "i" } },
            { invoiceNo: { $regex: search, $options: "i" } },
            { "clientMeta.name": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Sort by date descending
    pipeline.push({ $sort: { createdAt: -1 } });

    // Get total count
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await Invoice.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add pagination
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });

    const soldProducts = await Invoice.aggregate(pipeline);

    // Get summary statistics
    const summaryPipeline = [
      { $match: invoiceMatch },
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          totalWeight: { $sum: "$items.weightKg" },
          totalBags: { $sum: "$items.bagsCount" },
          totalAmount: {
            $sum: { $multiply: ["$items.weightKg", "$items.price"] },
          },
          totalItems: { $sum: 1 },
        },
      },
    ];

    const summaryResult = await Invoice.aggregate(summaryPipeline);
    const summary = summaryResult[0] || {
      totalWeight: 0,
      totalBags: 0,
      totalAmount: 0,
      totalItems: 0,
    };

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        soldProducts,
        summary,
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
    logger.error("Get sold products error:", error);
    res.status(500).json({
      success: false,
      message: "Sotilgan mahsulotlarni olishda xatolik",
    });
  }
};
