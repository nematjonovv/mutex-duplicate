import express from "express";
import {
  getOurDebts,
  getOurDebtById,
  createCreditorDebt,
  createCreditor,
  updateOurDebt,
  deleteOurDebt,
  recordOurDebtPayment,
  getOurDebtSummary,
  updateOurDebtPayment,
  recordOurDebtAddition,
} from "../controllers/ourDebtController.js";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", auditLog("GET_OUR_DEBTS"), getOurDebts);

router.post(
  "/",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("CREATE_OUR_DEBT"),
  createCreditor,
);

router.get(
  "/stats/summary",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("GET_OUR_DEBT_SUMMARY"),
  getOurDebtSummary,
);

router.get("/:id", auditLog("GET_OUR_DEBT"), getOurDebtById);

router.put(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("UPDATE_OUR_DEBT"),
  updateOurDebt,
);

router.delete(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("DELETE_OUR_DEBT"),
  deleteOurDebt,
);

router.post(
  "/:id/payment",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("RECORD_OUR_DEBT_PAYMENT"),
  recordOurDebtPayment,
);

router.post(
  "/:id/addition",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("RECORD_OUR_DEBT_ADDITION"),
  recordOurDebtAddition,
);

router.put(
  "/:debtId/payment/:paymentId",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("UPDATE_OUR_DEBT_PAYMENT"),
  updateOurDebtPayment,
);

export default router;
