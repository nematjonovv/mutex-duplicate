import express from "express";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";
import {
  getCashAccounts,
  getCashAccountById,
  createCashAccount,
  updateCashAccount,
  deleteCashAccount,
  getAccountStats,
} from "../controllers/accountController.js";

const router = express.Router();

router.use(verifyToken);

// Get all cash accounts with pagination and filters
router.get("/", auditLog("GET_ACCOUNTS"), getCashAccounts);

// Get account statistics
router.get("/stats/summary", auditLog("GET_ACCOUNT_STATS"), getAccountStats);

// Create new cash account
router.post(
  "/",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("CREATE_ACCOUNT"),
  createCashAccount
);

// Get cash account by ID
router.get("/:id", auditLog("GET_ACCOUNT"), getCashAccountById);

// Update cash account
router.put(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("UPDATE_ACCOUNT"),
  updateCashAccount
);

// Delete cash account
router.delete(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("DELETE_ACCOUNT"),
  deleteCashAccount
);

export default router;
