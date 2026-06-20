import express from 'express';
import {
  getWorkers,
  createWorker,
  updateWorker,
  deleteWorker,
} from '../controllers/workerController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', requireRole(['DIRECTOR', 'MANAGER', 'ACCOUNTANT']), getWorkers);
router.post('/', requireRole(['DIRECTOR', 'MANAGER']), createWorker);
router.put('/:id', requireRole(['DIRECTOR', 'MANAGER']), updateWorker);
router.delete('/:id', requireRole(['DIRECTOR', 'MANAGER']), deleteWorker);

export default router;
