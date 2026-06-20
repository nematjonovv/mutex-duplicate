import express from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import {
  getDefectiveProducts,
  updateDefectiveProduct,
  deleteDefectiveProduct,
} from '../controllers/returnController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Defective products routes
router.get('/', requireRole(['DIRECTOR', 'MANAGER', 'WORKER', 'SELLER']), getDefectiveProducts);
router.put('/:id', requireRole(['DIRECTOR', 'MANAGER', 'WORKER']), updateDefectiveProduct);
router.delete('/:id', requireRole(['DIRECTOR', 'MANAGER']), deleteDefectiveProduct);

export default router;
