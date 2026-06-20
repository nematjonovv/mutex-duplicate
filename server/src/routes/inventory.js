import express from "express";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";
import { getInventory, getInventorySummary, getStockMovements } from "../controllers/inventoryController.js";

const router = express.Router();

router.use(verifyToken);

router.get(
  "/",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT", "WORKER"]),
  auditLog("GET_INVENTORY"),
  getInventory
);
router.get(
  "/movements",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("GET_INVENTORY_MOVEMENTS"),
  getStockMovements
);
router.get(
  "/summary",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("GET_INVENTORY_SUMMARY"),
  getInventorySummary
);

router.get("/charts", requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]), auditLog("GET_INVENTORY_CHARTS"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Inventory charts route - to be implemented",
  });
});

export default router;
