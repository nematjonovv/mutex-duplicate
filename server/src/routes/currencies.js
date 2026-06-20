import express from "express";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";
import {
  addRate,
  getRateHistory,
  getLatestRates,
} from "../controllers/currencyController.js";

const router = express.Router();

router.use(verifyToken);

// Get latest rates
router.get("/latest", getLatestRates);

// Get history
router.get("/history", auditLog("GET_CURRENCY_HISTORY"), getRateHistory);

// Add new rate
router.post(
  "/",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("UPDATE_CURRENCY_RATE"),
  addRate
);

export default router;
