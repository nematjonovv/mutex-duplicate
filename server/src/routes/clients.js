import express from "express";
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientDetails,
  getClientsWithDebtSummary,
  searchClients,
  getClientsCount,
} from "../controllers/clientController.js";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get all clients
router.get(
  "/",
  requireRole(["DIRECTOR", "MANAGER", "SELLER", "ACCOUNTANT"]),
  auditLog("GET_CLIENTS"),
  getClients
);

// Create client
router.post(
  "/",
  requireRole(["DIRECTOR", "MANAGER", "SELLER"]),
  auditLog("CREATE_CLIENT"),
  createClient
);

// Get client by ID
router.get(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER", "SELLER", "ACCOUNTANT"]),
  auditLog("GET_CLIENT"),
  getClientById
);

// Update client
router.put(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER", "SELLER"]),
  auditLog("UPDATE_CLIENT"),
  updateClient
);

// Delete client (soft delete)
router.delete(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("DELETE_CLIENT"),
  deleteClient
);

// Get client details with invoices and debts
router.get(
  "/:id/details",
  requireRole(["DIRECTOR", "MANAGER", "SELLER", "ACCOUNTANT"]),
  auditLog("GET_CLIENT_DETAILS"),
  getClientDetails
);

// Get clients with debt summary
router.get(
  "/stats/debt-summary",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("GET_CLIENTS_DEBT_SUMMARY"),
  getClientsWithDebtSummary
);

// Search clients
router.get(
  "/search",
  requireRole(["DIRECTOR", "MANAGER", "SELLER", "ACCOUNTANT"]),
  auditLog("SEARCH_CLIENTS"),
  searchClients
);

// Get clients count
router.get(
  "/stats/count",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("GET_CLIENTS_COUNT"),
  getClientsCount
);

export default router;
