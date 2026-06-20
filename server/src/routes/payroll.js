import express from "express";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";
import {
  getPayrolls,
  createPayroll,
  updatePayroll,
  deletePayroll,
} from "../controllers/payrollController.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", auditLog("GET_PAYROLL"), getPayrolls);

router.post(
  "/",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("CREATE_PAYROLL"),
  createPayroll
);

router.put(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("UPDATE_PAYROLL"),
  updatePayroll
);

router.delete(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("DELETE_PAYROLL"),
  deletePayroll
);

export default router;
