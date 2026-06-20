import express from 'express';
import { createWrapping, getWrappings, getWrappingById, createBulkWrapping, updateWrapping, deleteWrapping } from '../controllers/wrappingController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', requireRole(['DIRECTOR', 'MANAGER', 'WORKER']), getWrappings);
router.get('/:id', requireRole(['DIRECTOR', 'MANAGER', 'WORKER']), getWrappingById);
router.post('/', requireRole(['DIRECTOR', 'MANAGER', 'WORKER']), createWrapping);
router.post('/bulk', requireRole(['DIRECTOR', 'MANAGER', 'WORKER']), createBulkWrapping);
router.put('/:id', requireRole(['DIRECTOR', 'MANAGER', 'WORKER']), updateWrapping);
router.delete('/:id', requireRole(['DIRECTOR', 'MANAGER']), deleteWrapping);

export default router;
