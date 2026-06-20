import Supplier from '../models/Supplier.js';
import RawMaterialIntake from '../models/RawMaterialIntake.js';
import { logger } from '../config/logger.js';
import { z } from 'zod';

const createSupplierSchema = z.object({
  companyName: z.string().min(2, "Kompaniya nomi kamida 2 ta belgidan iborat bo'lishi kerak").max(100, "Kompaniya nomi 100 ta belgidan oshmasligi kerak"),
  responsiblePerson: z.string().min(2, "Mas'ul shaxs ismi kamida 2 ta belgidan iborat bo'lishi kerak").max(100, "Mas'ul shaxs ismi 100 ta belgidan oshmasligi kerak"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Iltimos, to'g'ri telefon raqamini kiriting").optional().or(z.literal("")),
  address: z.string().min(5, "Manzil kamida 5 ta belgidan iborat bo'lishi kerak").max(500, "Manzil 500 ta belgidan oshmasligi kerak"),
});

const updateSupplierSchema = z.object({
  companyName: z.string().min(2).max(100).optional(),
  responsiblePerson: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional().or(z.literal("")),
  address: z.string().min(5).max(500).optional(),
});

const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(2000)).default('10'),
  search: z.string().optional(),
});

export const getSuppliers = async (req, res) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const { page, limit, search } = validatedQuery;

    const query = {};
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { responsiblePerson: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [suppliers, total] = await Promise.all([
      Supplier.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Supplier.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        data: suppliers,
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
    logger.error('Get suppliers error:', error);
    res.status(500).json({ success: false, message: "Ta'minotchilarni yuklashda xatolik yuz berdi" });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const validatedData = createSupplierSchema.parse(req.body);
    const supplier = new Supplier({
      ...validatedData,
      createdBy: req.user._id,
    });
    await supplier.save();
    res.status(201).json({ success: true, message: "Ta'minotchi muvaffaqiyatli yaratildi", data: { supplier } });
  } catch (error) {
    logger.error('Create supplier error:', error);
    res.status(500).json({ success: false, message: "Ta'minotchi yaratishda xatolik yuz berdi" });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateSupplierSchema.parse(req.body);
    const supplier = await Supplier.findByIdAndUpdate(id, { ...validatedData, updatedBy: req.user._id }, { new: true });
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Ta'minotchi topilmadi" });
    }
    res.status(200).json({ success: true, message: "Ta'minotchi muvaffaqiyatli yangilandi", data: { supplier } });
  } catch (error) {
    logger.error('Update supplier error:', error);
    res.status(500).json({ success: false, message: "Ta'minotchini yangilashda xatolik yuz berdi" });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByIdAndDelete(id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    logger.error('Delete supplier error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete supplier' });
  }
};

export const getSupplierStats = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // Get all materials from this supplier
    const materials = await RawMaterialIntake.find({
      supplier: supplier.companyName,
      deletedAt: null,
    })
      .sort({ date: -1 })
      .lean();

    // Calculate statistics
    const totalWeight = materials.reduce((sum, m) => sum + (m.totalWeightKg || 0), 0);
    const totalDeliveries = materials.length;

    // Group by material name
    const materialGroups = materials.reduce((acc, material) => {
      const name = material.name || 'Noma\'lum';
      if (!acc[name]) {
        acc[name] = {
          name,
          totalWeight: 0,
          deliveries: [],
        };
      }
      acc[name].totalWeight += material.totalWeightKg || 0;
      acc[name].deliveries.push({
        date: material.date,
        weight: material.totalWeightKg || 0,
        comment: material.comment,
      });
      return acc;
    }, {});

    const materialStats = Object.values(materialGroups).map((group) => ({
      materialName: group.name,
      totalWeight: group.totalWeight,
      deliveryCount: group.deliveries.length,
      deliveries: group.deliveries,
    }));

    res.status(200).json({
      success: true,
      data: {
        supplier: {
          _id: supplier._id,
          companyName: supplier.companyName,
          responsiblePerson: supplier.responsiblePerson,
          phone: supplier.phone,
          address: supplier.address,
        },
        stats: {
          totalWeight,
          totalDeliveries,
          materialStats,
        },
      },
    });
  } catch (error) {
    logger.error('Get supplier stats error:', error);
    res.status(500).json({ success: false, message: "Ta'minotchi statistikasini yuklashda xatolik yuz berdi" });
  }
};
