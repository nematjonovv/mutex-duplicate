import express from 'express';
import { createTransfer, getTransfers, deleteTransfer, returnToMainBase } from '../controllers/transferController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.post('/', requireRole(['DIRECTOR', 'MANAGER']), createTransfer);
router.get('/', requireRole(['DIRECTOR', 'MANAGER']), getTransfers);
router.delete('/:id', requireRole(['DIRECTOR', 'MANAGER']), deleteTransfer);
router.post('/:id/return', requireRole(['DIRECTOR', 'MANAGER']), returnToMainBase);

export default router;
