import express from "express";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";
import {
  getFinancialReport,
  getSalesReport,
  getInventoryReport,
  getDashboardData
} from "../controllers/reportController.js";

const router = express.Router();

router.use(verifyToken);

// Financial reports (Accountant, Director, Manager)
router.get(
  "/financial",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("GET_FINANCIAL_REPORTS"),
  getFinancialReport
);

// Inventory reports (Manager, Director)
router.get(
  "/inventory",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("GET_INVENTORY_REPORTS"),
  getInventoryReport
);

// Sales reports (Seller, Manager, Director)
router.get(
  "/sales",
  requireRole(["DIRECTOR", "MANAGER", "SELLER"]),
  auditLog("GET_SALES_REPORTS"),
  getSalesReport
);

// Dashboard data (All roles)
router.get("/dashboard", auditLog("GET_DASHBOARD"), getDashboardData);

// Export reports
router.get(
  "/export/:type",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("EXPORT_REPORT"),
  (req, res) => {
    // TODO: Implement export functionality using exceljs or similar
    res.status(200).json({
      success: true,
      message: "Export report route - to be implemented",
    });
  }
);

export default router;
