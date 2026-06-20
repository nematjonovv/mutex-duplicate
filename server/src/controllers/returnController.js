import Return from "../models/Return.js";
import DefectiveProduct from "../models/DefectiveProduct.js";
import Invoice from "../models/Invoice.js";
import Client from "../models/Client.js";
import FinishedProduct from "../models/FinishedProduct.js";
import CashAccount from "../models/CashAccount.js";
import CashFlow from "../models/CashFlow.js";
import Debt from "../models/Debt.js";
import { logger } from "../config/logger.js";
import { z } from "zod";
import { Transaction } from "../models/ClientDebtTransaction.js";

// Validation schema for regular returns (with invoice)
const createReturnSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  invoiceNo: z.string().min(1, "Invoice number is required"),
  clientId: z.string().min(1, "Client ID is required"),
  clientName: z.string().min(1, "Client name is required"),
  items: z
    .array(
      z.object({
        batchCode: z.string(),
        productName: z.string(),
        colorName: z.string().optional(),
        colorCode: z.string().optional(),
        weightKg: z.number(),
        bagsCount: z.number(),
        price: z.number(),
        total: z.number(),
        condition: z.enum(["GOOD", "DEFECTIVE"]),
      }),
    )
    .min(1, "At least one item is required"),
  totalAmount: z.number().min(0, "Total amount must be non-negative"),
  note: z.string().optional().nullable(),
});

// Validation schema for manual returns (without invoice)
const createManualReturnSchema = z.object({
  isManual: z.literal(true),
  // Manual rejimda faktura yo'q — optional
  invoiceId: z.string().optional().nullable(),
  invoiceNo: z.string().optional().nullable(),
  // Mijoz manual rejimda bo'lmasligi ham mumkin — optional
  clientId: z.string().optional().nullable(),
  clientName: z.string().optional().nullable(),
  manualClientName: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        batchCode: z.string().optional(),
        productName: z.string(),
        colorName: z.string().optional(),
        colorCode: z.string().optional(),
        weightKg: z.number(),
        bagsCount: z.number(),
        price: z.number(),
        total: z.number(),
        condition: z.enum(["GOOD", "DEFECTIVE"]),
      }),
    )
    .min(1, "At least one item is required"),
  totalAmount: z.number().min(0, "Total amount must be non-negative"),
  note: z.string().optional().nullable(),
});

// Get all returns with pagination
export const getReturns = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const query = { deletedAt: null };

    if (search) {
      query.$or = [
        { returnNo: { $regex: search, $options: "i" } },
        { invoiceNo: { $regex: search, $options: "i" } },
        { clientName: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [returns, total] = await Promise.all([
      Return.find(query)
        .populate("clientId", "name phone")
        .populate("createdBy", "fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Return.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        data: returns,
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
    logger.error("Get returns error:", error);
    res.status(500).json({
      success: false,
      message: "Qaytarishlarni olishda xatolik",
    });
  }
};

// Get return by ID
export const getReturnById = async (req, res) => {
  try {
    const { id } = req.params;

    const returnDoc = await Return.findById(id)
      .populate("clientId", "name phone")
      .populate("createdBy", "fullName")
      .lean();

    if (!returnDoc || returnDoc.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Qaytarish topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      data: { return: returnDoc },
    });
  } catch (error) {
    logger.error("Get return by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Qaytarishni olishda xatolik",
    });
  }
};

// Create new return
export const createReturn = async (req, res) => {
  try {
    const isManual = req.body.isManual === true;

    let validatedData;
    let invoice = null;
    let client = null;

    if (isManual) {
      // Manual return - no invoice required
      validatedData = createManualReturnSchema.parse(req.body);
    } else {
      // Regular return - invoice required
      validatedData = createReturnSchema.parse(req.body);

      // Check if invoice exists
      invoice = await Invoice.findById(validatedData.invoiceId);
      if (!invoice || invoice.deletedAt) {
        return res.status(404).json({
          success: false,
          message: "Faktura topilmadi",
        });
      }
    }

    // clientId is now always required
    if (!validatedData.clientId) {
      return res.status(400).json({
        success: false,
        message: "Mijoz tanlanishi shart",
      });
    }

    client = await Client.findById(validatedData.clientId);
    if (!client || client.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Mijoz topilmadi",
      });
    }

    // Generate return number
    const returnNo = await Return.generateReturnNo();

    // Separate items by condition
    const goodItems = validatedData.items.filter(
      (item) => item.condition === "GOOD",
    );
    const defectiveItems = validatedData.items.filter(
      (item) => item.condition === "DEFECTIVE",
    );

    // Create return document
    const returnDoc = new Return({
      returnNo,
      invoiceId: isManual ? null : validatedData.invoiceId,
      invoiceNo: isManual ? null : validatedData.invoiceNo,
      clientId: validatedData.clientId,
      clientName: isManual
        ? validatedData.clientName || client?.name || null
        : validatedData.clientName,
      isManual,
      manualClientName: isManual
        ? validatedData.manualClientName || client?.name || null
        : null,
      items: validatedData.items.map((item) => ({
        ...item,
        batchCode: item.batchCode || `MANUAL-${Date.now()}`,
      })),
      totalAmount: validatedData.totalAmount,
      note: validatedData.note,
      createdBy: req.user._id,
    });

    await returnDoc.save();

    // Process good items - return to FinishedProducts (atomik upsert)
    for (const item of goodItems) {
      try {
        // Qaytarilgan partiya uchun yagona, izchil batch nomi
        const returnBatch = `${item.batchCode}-RET`;

        // Atomik: mavjud bo'lsa weight/bags ustiga qo'shadi, bo'lmasa yaratadi.
        // Duplicate key xatosi bo'lishi mumkin emas.
        await FinishedProduct.findOneAndUpdate(
          { batch: returnBatch },
          {
            $inc: {
              weightKg: item.weightKg,
              bagsCount: item.bagsCount,
            },
            $set: {
              status: "ACTIVE",
              soldAt: null,
            },
            $setOnInsert: {
              productName: item.productName || "Qaytarilgan",
              color: item.colorName || "Nomsiz",
              colorCode: item.colorCode || "",
              batch: returnBatch,
              createdBy: req.user._id,
              finishedDate: new Date(),
              isSentToBase: true,
              comment: `Qaytarilgan mahsulot - ${returnNo}`,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      } catch (err) {
        logger.error("Error processing good item:", err);
        throw err;
      }
    }

    // Process defective items - save to DefectiveProducts
    for (const item of defectiveItems) {
      try {
        await DefectiveProduct.create({
          returnId: returnDoc._id,
          returnNo,
          batchCode: item.batchCode,
          productName: item.productName || "Mahsulot",
          colorName: item.colorName || "",
          colorCode: item.colorCode || "",
          weightKg: item.weightKg,
          bagsCount: item.bagsCount,
          createdBy: req.user._id,
        });
      } catch (err) {
        logger.error("Error processing defective item:", err);
        throw err;
      }
    }

    // Update invoice items - only for non-manual returns
    if (!isManual && invoice) {
      for (const returnedItem of validatedData.items) {
        // Find matching invoice item by searching in batches array
        for (let i = 0; i < invoice.items.length; i++) {
          const invoiceItem = invoice.items[i];

          // Check if this invoice item contains the returned batch
          if (invoiceItem.batches && invoiceItem.batches.length > 0) {
            const batchIndex = invoiceItem.batches.findIndex(
              (b) => b.batch === returnedItem.batchCode,
            );

            if (batchIndex !== -1) {
              // Reduce weight and bags count from invoice item
              invoiceItem.weightKg -= returnedItem.weightKg;
              invoiceItem.bagsCount -= returnedItem.bagsCount;

              // Remove the batch from batches array
              invoiceItem.batches.splice(batchIndex, 1);

              // Also remove from batchCodes array if exists
              if (invoiceItem.batchCodes && invoiceItem.batchCodes.length > 0) {
                const codeIndex = invoiceItem.batchCodes.indexOf(
                  returnedItem.batchCode,
                );
                if (codeIndex !== -1) {
                  invoiceItem.batchCodes.splice(codeIndex, 1);
                }
              }

              // If item has no weight/bags left, remove it from invoice
              if (invoiceItem.weightKg <= 0 || invoiceItem.bagsCount <= 0) {
                invoice.items.splice(i, 1);
              }

              break; // Found and processed, move to next returned item
            }
          }
        }
      }

      // Recalculate invoice totals
      let newGrossTotal = 0;
      for (const item of invoice.items) {
        const itemTotal = (item.weightKg || 0) * (item.price || 0);
        const itemDiscount = item.discount || 0;
        newGrossTotal += itemTotal - itemDiscount;
      }

      invoice.grossTotal = newGrossTotal;
      invoice.netTotal = newGrossTotal - (invoice.discountTotal || 0);

      // Recalculate balance (netTotal - paid)
      invoice.balance = Math.max(0, invoice.netTotal - invoice.paid);

      // Update status based on new values
      if (invoice.items.length === 0) {
        invoice.status = "CANCELLED";
      } else if (invoice.balance === 0) {
        invoice.status = "PAID";
      } else if (invoice.paid > 0) {
        invoice.status = "PARTIAL";
      } else {
        invoice.status = "CONFIRMED";
      }

      // Save invoice with updated items and totals
      try {
        await invoice.save();
      } catch (err) {
        logger.error("Error updating invoice:", err);
        throw err;
      }
    }

    // Add totalAmount to client's balance and log a Transaction
    try {
      client.balance = (client.balance || 0) + validatedData.totalAmount;
      await client.save();

      await Transaction.create({
        clientId: client._id,
        type: "PAYMENT",
        amount: validatedData.totalAmount,
        balanceAfter: client.balance,
        invoiceId: isManual ? null : invoice?._id,
        invoiceNo: isManual ? null : invoice?.invoiceNo,
        currency: "USD",
        rate: 1,
        note: `Qaytarildi: ${returnNo}`,
        createdBy: req.user._id,
      });
    } catch (err) {
      logger.error("Error updating client balance for return:", err);
      throw err;
    }

    res.status(201).json({
      success: true,
      message: "Qaytarish muvaffaqiyatli amalga oshirildi",
      data: { return: returnDoc },
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

    logger.error("Create return error:", error);
    res.status(500).json({
      success: false,
      message: "Qaytarishni yaratishda xatolik",
    });
  }
};

// Delete return (soft delete) - admin only
export const deleteReturn = async (req, res) => {
  try {
    const { id } = req.params;

    const returnDoc = await Return.findById(id);
    if (!returnDoc || returnDoc.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Qaytarish topilmadi",
      });
    }

    returnDoc.deletedAt = new Date();
    await returnDoc.save();

    // Also soft delete related defective products
    await DefectiveProduct.updateMany(
      { returnId: id },
      { $set: { deletedAt: new Date() } },
    );

    res.status(200).json({
      success: true,
      message: "Qaytarish o'chirildi",
    });
  } catch (error) {
    logger.error("Delete return error:", error);
    res.status(500).json({
      success: false,
      message: "Qaytarishni o'chirishda xatolik",
    });
  }
};

// Get defective products
export const getDefectiveProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const query = { deletedAt: null };

    if (search) {
      query.$or = [
        { returnNo: { $regex: search, $options: "i" } },
        { batchCode: { $regex: search, $options: "i" } },
        { productName: { $regex: search, $options: "i" } },
        { colorName: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [defectiveProducts, total] = await Promise.all([
      DefectiveProduct.find(query)
        .populate("createdBy", "fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DefectiveProduct.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        data: defectiveProducts,
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
    logger.error("Get defective products error:", error);
    res.status(500).json({
      success: false,
      message: "Yaroqsiz mahsulotlarni olishda xatolik",
    });
  }
};

// Update defective product (reason)
export const updateDefectiveProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const product = await DefectiveProduct.findById(id);
    if (!product || product.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Yaroqsiz mahsulot topilmadi",
      });
    }

    if (reason !== undefined) {
      product.reason = reason;
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: "Yaroqsiz mahsulot yangilandi",
      data: { defectiveProduct: product },
    });
  } catch (error) {
    logger.error("Update defective product error:", error);
    res.status(500).json({
      success: false,
      message: "Yaroqsiz mahsulotni yangilashda xatolik",
    });
  }
};

// Search bag by batch code in invoices
export const searchBagByBatchCode = async (req, res) => {
  try {
    const { batchCode } = req.params;

    if (!batchCode || batchCode.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Qop raqamini kiriting (kamida 3 ta belgi)",
      });
    }

    const searchCode = batchCode.trim();

    // Search in invoice items' batches array
    const invoice = await Invoice.findOne({
      deletedAt: null,
      "items.batches.batch": searchCode,
    }).populate("clientId", "name phone");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: `"${searchCode}" raqamli qop sotilgan fakturalardan topilmadi`,
      });
    }

    // Find the specific item and bag
    let foundItem = null;
    let foundBag = null;

    for (const item of invoice.items) {
      if (item.batches && item.batches.length > 0) {
        const bag = item.batches.find((b) => b.batch === searchCode);
        if (bag) {
          foundItem = item;
          foundBag = bag;
          break;
        }
      }
    }

    if (!foundItem || !foundBag) {
      return res.status(404).json({
        success: false,
        message: `"${searchCode}" raqamli qop topilmadi`,
      });
    }

    // Check if this bag was already returned
    const existingReturn = await Return.findOne({
      deletedAt: null,
      "items.batchCode": searchCode,
    });

    if (existingReturn) {
      return res.status(400).json({
        success: false,
        message: `"${searchCode}" raqamli qop allaqachon qaytarilgan (${existingReturn.returnNo})`,
      });
    }

    // Build response with bag details
    const bagDetails = {
      batchCode: searchCode,
      productName: foundItem.productName,
      colorName: foundItem.colorName,
      colorCode: foundItem.colorCode || "",
      weightKg: foundBag.weight,
      bagsCount: foundBag.bags || 1,
      price: foundItem.price,
      total: foundBag.weight * foundItem.price,
      invoice: {
        _id: invoice._id,
        invoiceNo: invoice.invoiceNo,
        createdAt: invoice.createdAt,
        clientId: invoice.clientId?._id || invoice.clientId,
        clientMeta: invoice.clientMeta,
        balance: invoice.balance,
        paid: invoice.paid,
        netTotal: invoice.netTotal,
      },
    };

    res.status(200).json({
      success: true,
      data: { bag: bagDetails },
    });
  } catch (error) {
    logger.error("Search bag by batch code error:", error);
    res.status(500).json({
      success: false,
      message: "Qop qidirishda xatolik",
    });
  }
};

// Delete defective product
export const deleteDefectiveProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await DefectiveProduct.findById(id);
    if (!product || product.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Yaroqsiz mahsulot topilmadi",
      });
    }

    product.deletedAt = new Date();
    await product.save();

    res.status(200).json({
      success: true,
      message: "Yaroqsiz mahsulot o'chirildi",
    });
  } catch (error) {
    logger.error("Delete defective product error:", error);
    res.status(500).json({
      success: false,
      message: "Yaroqsiz mahsulotni o'chirishda xatolik",
    });
  }
};
