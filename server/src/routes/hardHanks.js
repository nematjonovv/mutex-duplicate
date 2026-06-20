import express from 'express';
import { createHardHank, getHardHanks, deleteHardHank, createBulkHardHank, updateHardHank } from '../controllers/hardHankController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', requireRole(['DIRECTOR', 'MANAGER', 'WORKER']), getHardHanks);
router.post('/', requireRole(['DIRECTOR', 'MANAGER', 'WORKER']), createHardHank);
router.post('/bulk', requireRole(['DIRECTOR', 'MANAGER', 'WORKER']), createBulkHardHank);
router.put('/:id', requireRole(['DIRECTOR', 'MANAGER']), updateHardHank);
router.delete('/:id', requireRole(['DIRECTOR', 'MANAGER']), deleteHardHank);

export default router;
