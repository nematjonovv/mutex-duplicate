import express from "express";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";
import {
  getCashFlows,
  getCashFlowById,
  createCashFlow,
  updateCashFlow,
  deleteCashFlow,
  getCashFlowStats,
  getCategories,
} from "../controllers/cashFlowController.js";

const router = express.Router();

router.use(verifyToken);

// Get distinct categories (Must be before /:id to avoid conflict)
router.get("/categories", auditLog("GET_CASH_FLOW_CATEGORIES"), getCategories);

// Get all cash flows with pagination and filters
router.get("/", auditLog("GET_CASH_FLOW"), getCashFlows);

// Get cash flow statistics
router.get("/stats/summary", auditLog("GET_CASH_FLOW_STATS"), getCashFlowStats);

// Create new cash flow
router.post(
  "/",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("CREATE_CASH_FLOW"),
  createCashFlow
);

// Get cash flow by ID
router.get("/:id", auditLog("GET_CASH_FLOW_BY_ID"), getCashFlowById);

// Update cash flow
router.put(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("UPDATE_CASH_FLOW"),
  updateCashFlow
);

// Delete cash flow
router.delete(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("DELETE_CASH_FLOW"),
  deleteCashFlow
);

export default router;
