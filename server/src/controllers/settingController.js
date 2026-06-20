import AppSetting from "../models/AppSetting.js";
import User from "../models/User.js";
import { logger } from "../config/logger.js";
import { z } from "zod";
import bcrypt from "bcrypt";

// Schemas for password setting/updating
const passwordSchema = z.object({
  password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
});

// Set/Update Sales Password
export const setSalesPassword = async (req, res) => {
  try {
    // Only Managers can set these passwords
    if (req.user.role !== "DIRECTOR" && req.user.role !== "MANAGER") {
      return res.status(403).json({
        success: false,
        message: "Sizda ushbu amalni bajarish uchun yetarli huquq yo'q",
      });
    }

    const { password } = passwordSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(password, 12);

    const settings = await AppSetting.getSettings();
    settings.salesPasswordHash = hashedPassword;
    settings.passwordSetBy = req.user._id;
    settings.updatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      success: true,
      message: "Sotuv bo'limi paroli muvaffaqiyatli o'rnatildi/yangilandi",
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatosi",
        errors: error.errors,
      });
    }
    logger.error("Set sales password error:", error);
    res.status(500).json({
      success: false,
      message: "Sotuv parolini o'rnatishda xatolik yuz berdi",
    });
  }
};

// Set/Update Finance Password
export const setFinancePassword = async (req, res) => {
  try {
    // Only Managers can set these passwords
    if (req.user.role !== "DIRECTOR" && req.user.role !== "MANAGER") {
      return res.status(403).json({
        success: false,
        message: "Sizda ushbu amalni bajarish uchun yetarli huquq yo'q",
      });
    }

    const { password } = passwordSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(password, 12);

    const settings = await AppSetting.getSettings();
    settings.financePasswordHash = hashedPassword;
    settings.passwordSetBy = req.user._id;
    settings.updatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      success: true,
      message: "Moliya bo'limi paroli muvaffaqiyatli o'rnatildi/yangilandi",
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatosi",
        errors: error.errors,
      });
    }
    logger.error("Set finance password error:", error);
    res.status(500).json({
      success: false,
      message: "Moliya parolini o'rnatishda xatolik yuz berdi",
    });
  }
};

// Set/Update Management Password
export const setManagementPassword = async (req, res) => {
  try {
    // Only Managers can set these passwords
    if (req.user.role !== "DIRECTOR" && req.user.role !== "MANAGER") {
      return res.status(403).json({
        success: false,
        message: "Sizda ushbu amalni bajarish uchun yetarli huquq yo'q",
      });
    }

    const { password } = passwordSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(password, 12);

    const settings = await AppSetting.getSettings();
    settings.managementPasswordHash = hashedPassword;
    settings.passwordSetBy = req.user._id;
    settings.updatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      success: true,
      message: "Boshqaruv bo'limi paroli muvaffaqiyatli o'rnatildi/yangilandi",
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validatsiya xatosi",
        errors: error.errors,
      });
    }
    logger.error("Set management password error:", error);
    res.status(500).json({
      success: false,
      message: "Boshqaruv parolini o'rnatishda xatolik yuz berdi",
    });
  }
};

// Get Password Status (whether set or not)
export const getPasswordStatus = async (req, res) => {
  try {
    const settings = await AppSetting.getSettings();
    res.status(200).json({
      success: true,
      data: {
        salesPasswordSet: !!settings.salesPasswordHash,
        financePasswordSet: !!settings.financePasswordHash,
        managementPasswordSet: !!settings.managementPasswordHash,
      },
    });
  } catch (error) {
    logger.error("Get password status error:", error);
    res.status(500).json({
      success: false,
      message: "Parol holatini yuklashda xatolik yuz berdi",
    });
  }
};
