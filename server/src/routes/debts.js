import express from "express";
import {
  getDebts,
  getDebtById,
  createDebt,
  updateDebt,
  deleteDebt,
  recordDebtPayment,
  recordClientDebtPayment,
  getDebtsByClient,
  getDebtSummary,
  getRecentDebts,
  updateDebtPayment,
  getTransactionsByClient,
} from "../controllers/debtController.js";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get all debts
router.get("/", auditLog("GET_DEBTS"), getDebts);

// Create debt
router.post(
  "/",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("CREATE_DEBT"),
  createDebt,
);

// Record debt payment
router.post(
  "/:id/payment",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("RECORD_DEBT_PAYMENT"),
  recordDebtPayment,
);

// Record payment across client debts
router.post(
  "/client/:clientId/payment",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("RECORD_CLIENT_DEBT_PAYMENT"),
  recordClientDebtPayment,
);

// Get debts by client
router.get(
  "/client/:clientId",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("GET_DEBTS_BY_CLIENT"),
  getTransactionsByClient,
);

// Get debt summary
router.get(
  "/stats/summary",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("GET_DEBT_SUMMARY"),
  getDebtSummary,
);

// Get recent debts
router.get(
  "/stats/recent",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("GET_RECENT_DEBTS"),
  getRecentDebts,
);

// Get debt by ID
router.get("/:id", auditLog("GET_DEBT"), getDebtById);

// Update debt
router.put(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("UPDATE_DEBT"),
  updateDebt,
);

// Delete debt (soft delete)
router.delete(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("DELETE_DEBT"),
  deleteDebt,
);

router.put(
  "/:debtId/payment/:paymentId",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("UPDATE_DEBT_PAYMENT"),
  updateDebtPayment,
);

export default router;
