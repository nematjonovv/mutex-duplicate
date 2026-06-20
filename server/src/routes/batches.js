import express from "express";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";
import {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  scanBatch,
  getNextBatchNumber,
  getBatchSuggestions,
  getBatchStats,
  sendBatchToFinishedProducts,
  deletePackageFromFinished,
  updatePackageInFinished,
} from "../controllers/batchController.js";

const router = express.Router();

router.use(verifyToken);

// Get all batches
router.get("/", auditLog("GET_BATCHES"), getBatches);

// Get batch statistics
router.get("/stats", auditLog("GET_BATCH_STATS"), getBatchStats);

// Get next batch number
router.get("/next-number", auditLog("GET_NEXT_BATCH_NUMBER"), getNextBatchNumber);

// Get batch suggestions (colors)
router.get("/suggestions", auditLog("GET_BATCH_SUGGESTIONS"), getBatchSuggestions);

// Scan batch by code
router.get("/scan/:batchCode", auditLog("SCAN_BATCH"), scanBatch);

// Create batch
router.post(
  "/",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  auditLog("CREATE_BATCH"),
  createBatch
);

// Get batch by ID
router.get("/:id", auditLog("GET_BATCH"), getBatchById);

// Update batch
router.put(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER", "WRAPPER"]),
  auditLog("UPDATE_BATCH"),
  updateBatch
);

// Send batch to finished products
router.post(
  "/:id/send-to-base",
  requireRole(["DIRECTOR", "MANAGER", "WRAPPER"]),
  auditLog("SEND_BATCH_TO_BASE"),
  sendBatchToFinishedProducts
);

// Delete package from finished products
router.delete(
  "/:id/package/:lotNumber",
  requireRole(["DIRECTOR", "MANAGER", "WRAPPER"]),
  auditLog("DELETE_PACKAGE_FROM_FINISHED"),
  deletePackageFromFinished
);

// Update package in finished products
router.put(
  "/:id/package/:lotNumber",
  requireRole(["DIRECTOR", "MANAGER", "WRAPPER"]),
  auditLog("UPDATE_PACKAGE_IN_FINISHED"),
  updatePackageInFinished
);

// Delete batch (DIRECTOR and MANAGER can delete)
router.delete(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("DELETE_BATCH"),
  deleteBatch
);

export default router;
