import express from "express";
import {
  setSalesPassword,
  setFinancePassword,
  setManagementPassword,
  getPasswordStatus,
} from "../controllers/settingController.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Middleware to protect routes (only managers can set passwords)
router.use(verifyToken, requireRole(["DIRECTOR", "MANAGER"]));

// Routes for setting/updating passwords
router.post("/security/sales-password", setSalesPassword);
router.post("/security/finance-password", setFinancePassword);
router.post("/security/management-password", setManagementPassword);

// Route to get password status (can be accessed by managers to check if set)
router.get("/security/password-status", getPasswordStatus);

export default router;
