import express from 'express';
import {
  getSuppliers,
  getSupplierStats,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplierController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', requireRole(['DIRECTOR', 'MANAGER']), getSuppliers);
router.get('/:id/stats', requireRole(['DIRECTOR', 'MANAGER', 'ACCOUNTANT', 'WORKER', 'SELLER']), getSupplierStats);
router.post('/', requireRole(['DIRECTOR', 'MANAGER']), createSupplier);
router.put('/:id', requireRole(['DIRECTOR', 'MANAGER']), updateSupplier);
router.delete('/:id', requireRole(['DIRECTOR', 'MANAGER']), deleteSupplier);

export default router;
