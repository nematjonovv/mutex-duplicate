import Payroll from "../models/Payroll.js";
import CashFlow from "../models/CashFlow.js";
import CashAccount from "../models/CashAccount.js";
import Worker from "../models/Worker.js";
import { logger } from "../config/logger.js";
import { z } from "zod";

// Validation schemas
const createPayrollSchema = z.object({
  date: z.string({ invalid_type_error: "Sana noto'g'ri formatda" }).datetime({ message: "Sana noto'g'ri formatda" }).optional(),
  amount: z.number({ required_error: "Miqdor talab qilinadi", invalid_type_error: "Miqdor raqam bo'lishi kerak" }).positive("Miqdor musbat bo'lishi kerak"),
  workerId: z.string({ required_error: "Ishchi talab qilinadi" }).min(1, "Ishchi talab qilinadi"),
  accountId: z.string({ required_error: "Hisob talab qilinadi" }).min(1, "Hisob talab qilinadi"),
  note: z.string().optional(),
  paymentMethod: z.string().optional(),
});

const updatePayrollSchema = z.object({
  date: z.string({ invalid_type_error: "Sana noto'g'ri formatda" }).datetime({ message: "Sana noto'g'ri formatda" }).optional(),
  amount: z.number({ invalid_type_error: "Miqdor raqam bo'lishi kerak" }).positive("Miqdor musbat bo'lishi kerak").optional(),
  workerId: z.string().min(1, "Ishchi talab qilinadi").optional(),
  accountId: z.string().min(1, "Hisob talab qilinadi").optional(),
  note: z.string().optional(),
  paymentMethod: z.string().optional(),
});

// Get all payrolls
export const getPayrolls = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      workerId = "",
      accountId = "",
      startDate = "",
      endDate = "",
      position = "",
    } = req.query;

    const query = { deletedAt: null };

    if (search) {
      const workers = await Worker.find({
        fullName: { $regex: search, $options: "i" },
      }).select("_id");
      const workerIds = workers.map((w) => w._id);

      query.$or = [
        { note: { $regex: search, $options: "i" } },
        { workerId: { $in: workerIds } },
      ];
    }

    if (position) {
      const workers = await Worker.find({ position }).select("_id");
      const workerIds = workers.map((w) => w._id);
      
      // If we already have a workerId filter (from search), we need to intersect
      if (query.workerId && query.workerId.$in) {
         // This is complex if search already set workerId.$in.
         // However, search uses $or. So we can add an $and condition or just set workerId.$in
         // If we set workerId directly, it might conflict with $or.
         // Better to add to $and array if needed, or simply add to the query if no conflict.
         // But wait, the search logic sets query.$or which contains { workerId: { $in: workerIds } }.
         // If we also set query.workerId = { $in: positionWorkerIds }, it acts as an AND with the $or.
         // So: (search matches OR worker name matches) AND (worker position matches).
         // This seems correct.
         query.workerId = { $in: workerIds };
      } else {
         // If search didn't set workerId (it sets $or), we can safely set query.workerId
         // But be careful if $or is present.
         // If $or is present, adding query.workerId acts as AND.
         // So if I search "Note" and position "Boss", it will find payrolls with note "Note" AND workerId in Bosses.
         // If I search "WorkerName" and position "Boss", it will find payrolls where (workerName matches OR note matches) AND worker is Boss.
         // This seems correct logic.
         
         // However, if we have workerId param (specific worker selected), we should respect it.
         // If both workerId and position are provided, they must both match (which is unlikely unless the worker has that position).
         
         if (query.workerId) {
             // If workerId is already set (e.g. from direct filter), we should check if it's in the position list?
             // Or just let MongoDB handle the intersection (it won't, key collision).
             // Actually `workerId` param is handled below: `if (workerId) query.workerId = workerId;`
             // So we should handle position before or merge.
         }
         
         // Let's set it here, and if workerId is set later, it will overwrite or we should merge.
         // Ideally, if workerId is passed, position filter might be redundant or contradictory, but let's assume valid input.
         
         query.workerId = { $in: workerIds };
      }
    }

    if (workerId) {
      // If specific worker is selected, it overrides position filter or should we check?
      // Usually specific filter > group filter.
      query.workerId = workerId;
    }

    if (accountId) {
      query.accountId = accountId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Payroll.countDocuments(query);

    const payrolls = await Payroll.find(query)
      .populate("workerId", "fullName phone")
      .populate("accountId", "name type")
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Map response to match frontend expectations if necessary
    // Frontend expects `worker` and `account` objects, but populate returns `workerId` and `accountId` as objects
    // We can lean() or just rely on mongoose behavior. 
    // Mongoose populate replaces the ID with the object, but keeps the field name `workerId`.
    // Frontend `columns` use `dataIndex: "worker"`, so we might need to map or rename.
    // Looking at frontend: `dataIndex: "worker"` in columns, but interface has `workerId` and `worker`.
    // Let's check frontend types again. `worker?: Worker`.
    // Mongoose populated result: `{ workerId: { fullName: ... } }`.
    // If frontend accesses `record.worker`, it will be undefined unless we map it.
    
    const formattedPayrolls = payrolls.map(p => {
      const pObj = p.toObject();
      return {
        ...pObj,
        worker: pObj.workerId,
        account: pObj.accountId,
      };
    });

    res.status(200).json({
      success: true,
      message: "Ish haqi ro'yxati yuklandi",
      data: {
        materials: formattedPayrolls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error("Error getting payrolls:", error);
    res.status(500).json({
      success: false,
      message: "Ish haqi ro'yxatini yuklashda xatolik",
    });
  }
};

// Create payroll
export const createPayroll = async (req, res) => {
  try {
    const validatedData = createPayrollSchema.parse(req.body);

    // Check account
    const account = await CashAccount.findById(validatedData.accountId);
    if (!account || account.deletedAt) {
      return res.status(404).json({ success: false, message: "Hisob topilmadi" });
    }

    // Check worker
    const worker = await Worker.findById(validatedData.workerId);
    if (!worker || worker.deletedAt) {
      return res.status(404).json({ success: false, message: "Ishchi topilmadi" });
    }

    // Check balance
    if (account.currentBalance < validatedData.amount) {
      return res.status(400).json({ success: false, message: "Hisobda mablag' yetarli emas" });
    }

    const date = validatedData.date ? new Date(validatedData.date) : new Date();

    // Create Payroll
    const payroll = new Payroll({
      ...validatedData,
      date,
      createdBy: req.user._id,
    });
    await payroll.save();

    // Update Account Balance
    account.currentBalance -= validatedData.amount;
    await account.save();

    // Update Worker's lastSalaryReceived
    worker.lastSalaryReceived = date;
    await worker.save();

    // Create CashFlow
    await CashFlow.create({
      time: date,
      category: "SALARY",
      direction: "OUT",
      amount: validatedData.amount,
      paymentMethod: validatedData.paymentMethod || "CASH",
      note: validatedData.note || `${worker.fullName} ga ish haqi`,
      accountId: validatedData.accountId,
      relatedPayrollId: payroll._id,
      createdBy: req.user._id,
    });

    await payroll.populate([
      { path: "workerId", select: "fullName phone" },
      { path: "accountId", select: "name type" }
    ]);

    const formattedPayroll = {
      ...payroll.toObject(),
      worker: payroll.workerId,
      account: payroll.accountId,
    };

    res.status(201).json({
      success: true,
      message: "Ish haqi muvaffaqiyatli saqlandi",
      data: { payroll: formattedPayroll },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validatsiya xatosi", errors: error.errors });
    }
    logger.error("Error creating payroll:", error);
    res.status(500).json({ success: false, message: "Ish haqi saqlashda xatolik" });
  }
};

// Update payroll
export const updatePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updatePayrollSchema.parse(req.body);

    const payroll = await Payroll.findById(id);
    if (!payroll || payroll.deletedAt) {
      return res.status(404).json({ success: false, message: "Ish haqi yozuvi topilmadi" });
    }

    // Check if account or amount needs update
    if (
      (validatedData.accountId && validatedData.accountId !== payroll.accountId.toString()) ||
      (validatedData.amount && validatedData.amount !== payroll.amount)
    ) {
      const oldAccountId = payroll.accountId;
      const newAccountId = validatedData.accountId || oldAccountId;
      const oldAmount = payroll.amount;
      const newAmount = validatedData.amount !== undefined ? validatedData.amount : oldAmount;

      if (oldAccountId.toString() === newAccountId.toString()) {
        // Same account, just amount change
        const account = await CashAccount.findById(oldAccountId);
        if (account) {
          account.currentBalance += oldAmount; // Revert old
          if (account.currentBalance < newAmount) {
            return res.status(400).json({ success: false, message: "Hisobda mablag' yetarli emas" });
          }
          account.currentBalance -= newAmount; // Apply new
          await account.save();
        }
      } else {
        // Account changed
        const newAccount = await CashAccount.findById(newAccountId);
        if (!newAccount) {
          return res.status(404).json({ success: false, message: "Yangi hisob topilmadi" });
        }
        if (newAccount.currentBalance < newAmount) {
          return res.status(400).json({ success: false, message: "Yangi hisobda mablag' yetarli emas" });
        }

        const oldAccount = await CashAccount.findById(oldAccountId);
        if (oldAccount) {
          oldAccount.currentBalance += oldAmount; // Revert old
          await oldAccount.save();
        }

        newAccount.currentBalance -= newAmount; // Apply new
        await newAccount.save();
      }
    }

    // Update Payroll
    const updatedPayroll = await Payroll.findByIdAndUpdate(
      id,
      {
        ...validatedData,
        date: validatedData.date ? new Date(validatedData.date) : undefined,
        updatedBy: req.user._id,
      },
      { new: true }
    ).populate([
      { path: "workerId", select: "fullName phone" },
      { path: "accountId", select: "name type" }
    ]);

    // Update related CashFlow
    const cashFlow = await CashFlow.findOne({ relatedPayrollId: id });
    if (cashFlow) {
      cashFlow.amount = validatedData.amount || cashFlow.amount;
      cashFlow.time = validatedData.date ? new Date(validatedData.date) : cashFlow.time;
      cashFlow.accountId = validatedData.accountId || cashFlow.accountId;
      cashFlow.note = validatedData.note || cashFlow.note;
      cashFlow.updatedBy = req.user._id;
      await cashFlow.save();
    }

    const formattedPayroll = {
      ...updatedPayroll.toObject(),
      worker: updatedPayroll.workerId,
      account: updatedPayroll.accountId,
    };

    res.status(200).json({
      success: true,
      message: "Ish haqi muvaffaqiyatli yangilandi",
      data: { payroll: formattedPayroll },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Validatsiya xatosi", errors: error.errors });
    }
    logger.error("Error updating payroll:", error);
    res.status(500).json({ success: false, message: "Ish haqi yangilashda xatolik" });
  }
};

// Delete payroll
export const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;

    const payroll = await Payroll.findById(id);
    if (!payroll || payroll.deletedAt) {
      return res.status(404).json({ success: false, message: "Ish haqi yozuvi topilmadi" });
    }

    // Revert account balance
    const account = await CashAccount.findById(payroll.accountId);
    if (account) {
      account.currentBalance += payroll.amount;
      await account.save();
    }

    // Soft delete Payroll
    payroll.deletedAt = new Date();
    payroll.updatedBy = req.user._id;
    await payroll.save();

    // Soft delete related CashFlow
    await CashFlow.findOneAndUpdate(
      { relatedPayrollId: id },
      { deletedAt: new Date(), updatedBy: req.user._id }
    );

    res.status(200).json({
      success: true,
      message: "Ish haqi muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    logger.error("Error deleting payroll:", error);
    res.status(500).json({ success: false, message: "Ish haqi o'chirishda xatolik" });
  }
};
