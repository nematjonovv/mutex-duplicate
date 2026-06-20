import express from 'express';
import { createDyehouseProcess, getDyehouseProcesses, updateDyehouseProcess, deleteDyehouseProcess } from '../controllers/dyehouseProcessController.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', requireRole(['DIRECTOR', 'MANAGER', 'WORKER']), getDyehouseProcesses);
router.post('/', requireRole(['DIRECTOR', 'MANAGER', 'WORKER']), createDyehouseProcess);
router.put('/:id', requireRole(['DIRECTOR', 'MANAGER', 'WORKER']), updateDyehouseProcess);
router.delete('/:id', requireRole(['DIRECTOR', 'MANAGER', 'WORKER']), deleteDyehouseProcess);

export default router;
