import express from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import {
  getReturns,
  getReturnById,
  createReturn,
  deleteReturn,
  searchBagByBatchCode,
} from '../controllers/returnController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Returns routes
router.get('/', requireRole(['DIRECTOR', 'MANAGER', 'SELLER']), getReturns);
router.get('/search-bag/:batchCode', requireRole(['DIRECTOR', 'MANAGER', 'SELLER']), searchBagByBatchCode);
router.get('/:id', requireRole(['DIRECTOR', 'MANAGER', 'SELLER']), getReturnById);
router.post('/', requireRole(['DIRECTOR', 'MANAGER', 'SELLER']), createReturn);
router.delete('/:id', requireRole(['DIRECTOR']), deleteReturn);

export default router;
