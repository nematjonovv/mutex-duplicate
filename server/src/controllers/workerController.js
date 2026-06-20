import Worker from "../models/Worker.js";
import Payroll from "../models/Payroll.js";
import { logger } from "../config/logger.js";
import { z } from "zod";
import { notifyWorkerUpdate, notifyWorkerDelete } from "../utils/notificationHelper.js";

const createWorkerSchema = z.object({
  fullName: z.string().min(1, "F.I.SH talab qilinadi"),
  phone: z.string().min(1, "Telefon raqam talab qilinadi"),
  address: z.string().optional(),
  position: z.string().optional(),
  salary: z.number().min(0, "Maosh musbat bo'lishi kerak"),
  workingSince: z.string().datetime("Sana noto'g'ri formatda"),
});

const updateWorkerSchema = createWorkerSchema.partial();

export const getWorkers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", position = "" } = req.query;
    const query = search ? { fullName: { $regex: search, $options: "i" } } : {};
    
    if (position) {
      query.position = position;
    }

    const workers = await Worker.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean()
      .exec();

    // Populate lastSalaryReceived if missing
    await Promise.all(
      workers.map(async (worker) => {
        if (!worker.lastSalaryReceived) {
          const lastPayroll = await Payroll.findOne({ workerId: worker._id })
            .sort({ date: -1 })
            .select("date");

          if (lastPayroll) {
            worker.lastSalaryReceived = lastPayroll.date;
            // Update the worker record in background
            await Worker.findByIdAndUpdate(worker._id, {
              lastSalaryReceived: lastPayroll.date,
            }).catch((err) =>
              logger.error("Failed to update worker lastSalaryReceived:", err)
            );
          }
        }
      })
    );

    const count = await Worker.countDocuments(query);

    res.status(200).json({
      success: true,
      data: workers,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: count,
      },
    });
  } catch (error) {
    logger.error("Get workers error:", error);
    res.status(500).json({ success: false, message: "Ishchilarni olishda xatolik yuz berdi" });
  }
};

export const createWorker = async (req, res) => {
  try {
    const validatedData = createWorkerSchema.parse(req.body);
    const worker = new Worker({
      ...validatedData,
      createdBy: req.user._id,
    });
    await worker.save();
    res.status(201).json({
      success: true,
      message: "Ishchi muvaffaqiyatli qo'shildi",
      data: { worker },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatosi",
        errors: error.errors,
      });
    }
    logger.error("Create worker error:", error);
    res
      .status(500)
      .json({ success: false, message: "Ishchi qo'shishda xatolik yuz berdi" });
  }
};

export const updateWorker = async (req, res) => {
  try {
    const validatedData = updateWorkerSchema.parse(req.body);
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      validatedData,
      { new: true }
    );
    if (!worker) {
      return res
        .status(404)
        .json({ success: false, message: "Ishchi topilmadi" });
    }

    // Create notification
    try {
      await notifyWorkerUpdate(worker, req.user._id);
    } catch (notifError) {
      logger.error("Failed to create notification:", notifError);
    }

    res.status(200).json({
      success: true,
      message: "Ishchi muvaffaqiyatli yangilandi",
      data: { worker },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatosi",
        errors: error.errors,
      });
    }
    logger.error("Update worker error:", error);
    res
      .status(500)
      .json({ success: false, message: "Ishchini yangilashda xatolik yuz berdi" });
  }
};

export const deleteWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndDelete(req.params.id);
    if (!worker) {
      return res
        .status(404)
        .json({ success: false, message: "Ishchi topilmadi" });
    }

    // Create notification
    try {
      await notifyWorkerDelete(worker, req.user._id);
    } catch (notifError) {
      logger.error("Failed to create notification:", notifError);
    }

    res
      .status(200)
      .json({ success: true, message: "Ishchi muvaffaqiyatli o'chirildi" });
  } catch (error) {
    logger.error("Delete worker error:", error);
    res
      .status(500)
      .json({ success: false, message: "Ishchini o'chirishda xatolik yuz berdi" });
  }
};
