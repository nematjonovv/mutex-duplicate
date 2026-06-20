import Client from "../models/Client.js";
import Invoice from "../models/Invoice.js";
import Debt from "../models/Debt.js";
import { logger } from "../config/logger.js";
import { z } from "zod";
import { Transaction } from "../models/ClientDebtTransaction.js";

// Validation schemas
const createClientSchema = z.object({
  name: z
    .string()
    .min(2, "Mijoz ismi kamida 2 ta belgidan iborat bo'lishi kerak")
    .max(200, "Mijoz ismi 200 ta belgidan oshmasligi kerak"),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Iltimos, to'g'ri telefon raqamini kiriting")
    .optional()
    .or(z.literal("")),
  tin: z.string().max(20, "STIR 20 ta belgidan oshmasligi kerak").optional(),
  address: z
    .string()
    .min(5, "Manzil kamida 5 ta belgidan iborat bo'lishi kerak")
    .max(500, "Manzil 500 ta belgidan oshmasligi kerak"),
  notes: z
    .string()
    .max(1000, "Izohlar 1000 ta belgidan oshmasligi kerak")
    .optional(),
  initialDebt: z.number().min(0).optional(),
});

const updateClientSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .or(z.literal("")),
  tin: z.string().max(20).optional(),
  address: z.string().min(5).max(500).optional(),
  notes: z.string().max(1000).optional(),
  initialDebt: z.number().min(0).optional(),
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
  hasDebt: z
    .union([z.string(), z.boolean()])
    .transform((val) => val === "true" || val === true)
    .optional(),
  debtStatus: z.enum(["CLEAR", "LOW", "MEDIUM", "HIGH"]).optional(),
});

// Get all clients with pagination and filters
export const getClients = async (req, res) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const { page, limit, search, hasDebt, debtStatus } = validatedQuery;

    // Build query
    const query = { deletedAt: null };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { tin: { $regex: search, $options: "i" } },
      ];
    }

    if (hasDebt !== undefined) {
      if (hasDebt) {
        query.currentDebt = { $gt: 0 };
      } else {
        query.currentDebt = 0;
      }
    }

    if (debtStatus) {
      switch (debtStatus) {
        case "CLEAR":
          query.currentDebt = 0;
          break;
        case "LOW":
          query.currentDebt = { $gt: 0, $lte: 1000000 };
          break;
        case "MEDIUM":
          query.currentDebt = { $gt: 1000000, $lte: 5000000 };
          break;
        case "HIGH":
          query.currentDebt = { $gt: 5000000 };
          break;
      }
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute query
    const [clients, total] = await Promise.all([
      Client.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Client.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        data: clients,
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
        message: "Validatsiya xatoligi",
        errors: error.errors,
      });
    }

    logger.error("Get clients error:", error);
    res.status(500).json({
      success: false,
      message: "Mijozlarni yuklashda xatolik yuz berdi",
    });
  }
};

// Get client by ID
export const getClientById = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findById(id).lean();

    if (!client || client.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Mijoz topilmadi",
      });
    }

    res.status(200).json({
      success: true,
      data: { client },
    });
  } catch (error) {
    logger.error("Get client by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Mijozni yuklashda xatolik yuz berdi",
    });
  }
};

// Create new client
export const createClient = async (req, res) => {
  try {
    const validatedData = createClientSchema.parse(req.body);
    const { initialDebt, ...clientData } = validatedData;

    // Check if phone already exists (if provided)
    if (clientData.phone) {
      const existingClient = await Client.findOne({ phone: clientData.phone });
      if (existingClient) {
        return res.status(400).json({
          success: false,
          message: "Ushbu telefon raqam ro'yxatdan o'tgan",
        });
      }
    }

    // Create client
    const client = new Client({
      ...clientData,
      balance: -(initialDebt || 0),
      currentDebt: initialDebt || 0,
      totalDebt: initialDebt || 0,
      createdBy: req.user._id,
    });

    await client.save();

    // If initial debt exists, create a debt record
    if (initialDebt && initialDebt > 0) {
      await Transaction.create({
        clientId: client._id,
        type: "DEBT",
        amount: initialDebt,
        balanceAfter: -initialDebt,
        currency: "USD",
        rate: 1,
        note: "Boshlang'ich qarz",
        createdBy: req.user._id,
      });
    }

    res.status(201).json({
      success: true,
      message: "Mijoz muvaffaqiyatli yaratildi",
      data: { client },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatoligi",
        errors: error.errors,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ushbu telefon raqam allaqachon mavjud",
      });
    }

    logger.error("Create client error:", error);
    res.status(500).json({
      success: false,
      message: "Mijoz yaratishda xatolik yuz berdi",
    });
  }
};

// Update client
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateClientSchema.parse(req.body);

    // Find client
    const client = await Client.findById(id);
    if (!client || client.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Mijoz topilmadi",
      });
    }

    // Check if phone is being updated and if it already exists
    if (validatedData.phone && validatedData.phone !== client.phone) {
      const existingClient = await Client.findOne({
        phone: validatedData.phone,
      });
      if (existingClient) {
        return res.status(400).json({
          success: false,
          message: "Ushbu telefon raqam ro'yxatdan o'tgan",
        });
      }
    }

    // Handle initialDebt update
    if (
      validatedData.initialDebt !== undefined &&
      validatedData.initialDebt !== client.initialDebt
    ) {
      // Only allow setting initialDebt if it was 0 or undefined
      if ((client.initialDebt || 0) === 0) {
        const diff = validatedData.initialDebt - (client.initialDebt || 0);

        client.currentDebt += diff;
        client.totalDebt += diff;

        // Update or create INITIAL_DEBT record
        let initialDebtRecord = await Debt.findOne({
          clientId: id,
          reasonType: "INITIAL_DEBT",
        });

        if (initialDebtRecord) {
          initialDebtRecord.amount = validatedData.initialDebt;
          initialDebtRecord.currentDebt = Math.max(
            0,
            initialDebtRecord.currentDebt + diff,
          );
          initialDebtRecord.totalDebt = Math.max(
            0,
            initialDebtRecord.totalDebt + diff,
          );
          await initialDebtRecord.save();
        } else if (validatedData.initialDebt > 0) {
          initialDebtRecord = new Debt({
            clientId: client._id,
            reasonType: "BOSHLANGIC_QARZ",
            amount: validatedData.initialDebt,
            currentDebt: validatedData.initialDebt,
            totalDebt: validatedData.initialDebt,
            paymentMethod: "OTHER",
            occurredAt: client.createdAt,
            note: "Boshlang'ich qarz",
            createdBy: req.user._id,
          });
          await initialDebtRecord.save();
        }
      }
    }

    // Update client
    Object.assign(client, validatedData, {
      updatedBy: req.user._id,
    });

    await client.save();

    res.status(200).json({
      success: true,
      message: "Mijoz muvaffaqiyatli yangilandi",
      data: { client },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatoligi",
        errors: error.errors,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ushbu telefon raqam allaqachon mavjud",
      });
    }

    logger.error("Update client error:", error);
    res.status(500).json({
      success: false,
      message: "Mijozni yangilashda xatolik yuz berdi",
    });
  }
};

// Delete client (soft delete)
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findById(id);
    if (!client || client.deletedAt) {
      return res.status(404).json({
        success: false,
        message: "Mijoz topilmadi",
      });
    }

    // Check if client has active invoices or debts
    const hasActiveInvoices = await Invoice.exists({
      clientId: id,
      balance: { $gt: 0 },
    });
    const hasActiveDebts = await Debt.exists({
      clientId: id,
      currentDebt: { $gt: 0 },
    });

    if (hasActiveInvoices || hasActiveDebts) {
      return res.status(400).json({
        success: false,
        message:
          "Faol hisob-fakturalari yoki qarzlari bor mijozni o'chirib bo'lmaydi",
      });
    }

    // Soft delete
    client.deletedAt = new Date();
    client.updatedBy = req.user._id;
    await client.save();

    res.status(200).json({
      success: true,
      message: "Mijoz muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    logger.error("Delete client error:", error);
    res.status(500).json({
      success: false,
      message: "Mijozni o'chirishda xatolik yuz berdi",
    });
  }
};

// Get client with invoices and debts
// getClientDetails
export const getClientDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const [client, invoices, transactions] = await Promise.all([
      Client.findById(id).lean(),
      Invoice.find({ clientId: id }).sort({ createdAt: -1 }).limit(10).lean(),
      Transaction.find({ clientId: id }) // Debt.find o'rniga
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);

    if (!client || client.deletedAt) {
      return res
        .status(404)
        .json({ success: false, message: "Mijoz topilmadi" });
    }

    res.status(200).json({
      success: true,
      data: {
        client,
        invoices,
        transactions, // debts o'rniga
      },
    });
  } catch (error) {
    logger.error("Get client details error:", error);
    res.status(500).json({
      success: false,
      message: "Mijoz ma'lumotlarini yuklashda xatolik yuz berdi",
    });
  }
};

// Get clients with debt summary
// getClientsWithDebtSummary
export const getClientsWithDebtSummary = async (req, res) => {
  try {
    // balance < 0 = qarzli mijozlar
    const clients = await Client.find({
      deletedAt: null,
      balance: { $ne: 0 }, // 0 dan farqli hammasi (qarz ham, avans ham)
    })
      .select("_id name phone balance address")
      .sort({ balance: 1 }) // eng ko'p qarz birinchi
      .lean();
    console.log("clients found:", clients.length);
    // balance manfiy — qarz, musbat qilip ko'rsatamiz
    const totalDebt = clients.reduce((sum, c) => sum + Math.abs(c.balance), 0);

    res.status(200).json({
      success: true,
      data: {
        data: clients,
        summary: {
          totalDebt,
          totalClients: clients.length,
          clientsWithDebt: clients.length,
          averageDebt: clients.length > 0 ? totalDebt / clients.length : 0,
        },
      },
    });
  } catch (error) {
    logger.error("Get clients with debt summary error:", error);
    res.status(500).json({
      success: false,
      message:
        "Mijozlar qarzdorligi bo'yicha hisobotni yuklashda xatolik yuz berdi",
    });
  }
};

// Search clients
export const searchClients = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const clients = await Client.find({
      deletedAt: null,
      $or: [
        { name: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { tin: { $regex: q, $options: "i" } },
      ],
    })
      .select("_id name phone currentDebt")
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      data: { data: clients },
    });
  } catch (error) {
    logger.error("Search clients error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search clients",
    });
  }
};

// Get clients count
export const getClientsCount = async (req, res) => {
  try {
    const [total, withDebt, withoutDebt] = await Promise.all([
      Client.countDocuments({ deletedAt: null }),
      Client.countDocuments({ deletedAt: null, currentDebt: { $gt: 0 } }),
      Client.countDocuments({ deletedAt: null, currentDebt: 0 }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        withDebt,
        withoutDebt,
      },
    });
  } catch (error) {
    logger.error("Get clients count error:", error);
    res.status(500).json({
      success: false,
      message: "Mijozlar sonini yuklashda xatolik yuz berdi",
    });
  }
};
