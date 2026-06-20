import express from "express";
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  recordPayment,
  scanBatch,
  markAsPrinted,
  getInvoiceSummary,
  getRecentInvoices,
  getSoldProducts,
} from "../controllers/invoiceController.js";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get invoice summary
router.get(
  "/stats/summary",
  requireRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"]),
  auditLog("GET_INVOICE_SUMMARY"),
  getInvoiceSummary
);

// Get recent invoices
router.get(
  "/stats/recent",
  requireRole(["DIRECTOR", "MANAGER", "SELLER", "ACCOUNTANT"]),
  auditLog("GET_RECENT_INVOICES"),
  getRecentInvoices
);

// Get sold products
router.get(
  "/sold-products",
  requireRole(["DIRECTOR", "MANAGER", "SELLER"]),
  auditLog("GET_SOLD_PRODUCTS"),
  getSoldProducts
);

// Scan batch
router.get(
  "/scan/:batchCode",
  requireRole(["DIRECTOR", "MANAGER", "SELLER"]),
  auditLog("SCAN_BATCH"),
  scanBatch
);

// Get all invoices
router.get("/", auditLog("GET_INVOICES"), getInvoices);

// Create invoice
router.post(
  "/",
  requireRole(["DIRECTOR", "MANAGER", "SELLER"]),
  auditLog("CREATE_INVOICE"),
  createInvoice
);

// Get invoice by ID
router.get("/:id", auditLog("GET_INVOICE"), getInvoiceById);

// Update invoice
router.put(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER", "SELLER"]),
  auditLog("UPDATE_INVOICE"),
  updateInvoice
);

// Delete invoice (soft delete)
router.delete(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("DELETE_INVOICE"),
  deleteInvoice
);

// Record payment
router.post(
  "/:id/payment",
  requireRole(["DIRECTOR", "MANAGER", "SELLER", "ACCOUNTANT"]),
  auditLog("ADD_PAYMENT"),
  recordPayment
);

// Mark as printed
router.put(
  "/:id/print",
  requireRole(["DIRECTOR", "MANAGER", "SELLER"]),
  auditLog("PRINT_INVOICE"),
  markAsPrinted
);

export default router;
