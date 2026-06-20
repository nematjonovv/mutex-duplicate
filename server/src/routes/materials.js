import express from "express";
import {
  getMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialSummary,
  getMaterialsBySupplier,
  getRecentMaterials,
  getSuppliers,
  getThreadSuggestions,
  getAvailableMaterials,
  addIntake,
} from "../controllers/materialController.js";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get all materials
router.get("/", auditLog("GET_MATERIALS"), getMaterials);

// Get thread suggestions (Ip turi va Ip raqami)
router.get("/suggestions/threads", auditLog("GET_THREAD_SUGGESTIONS"), getThreadSuggestions);

// Get available materials for batch creation
router.get("/available", auditLog("GET_AVAILABLE_MATERIALS"), getAvailableMaterials);

// Create material
router.post(
  "/",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  auditLog("CREATE_MATERIAL"),
  createMaterial
);

// Get material by ID
router.get("/:id", auditLog("GET_MATERIAL"), getMaterialById);

// Update material
router.put(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("UPDATE_MATERIAL"),
  updateMaterial
);

// Add intake to existing material
router.post(
  "/:id/intake",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  auditLog("ADD_MATERIAL_INTAKE"),
  addIntake
);

// Delete material (soft delete)
router.delete(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("DELETE_MATERIAL"),
  deleteMaterial
);

// Get material summary
router.get(
  "/stats/summary",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("GET_MATERIAL_SUMMARY"),
  getMaterialSummary
);

// Get materials by supplier
router.get(
  "/supplier/:supplier",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  auditLog("GET_MATERIALS_BY_SUPPLIER"),
  getMaterialsBySupplier
);

// Get recent materials
router.get(
  "/stats/recent",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  auditLog("GET_RECENT_MATERIALS"),
  getRecentMaterials
);

// Get suppliers list
router.get(
  "/suppliers/list",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  auditLog("GET_SUPPLIERS"),
  getSuppliers
);

export default router;
