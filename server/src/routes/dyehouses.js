import express from "express";
import {
  getDyehouses,
  getDyehouseById,
  createDyehouse,
  updateDyehouse,
  deleteDyehouse,
  searchDyehouses,
  getDyehousesCount,
} from "../controllers/dyehouseController.js";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get all dyehouses
router.get("/", auditLog("GET_DYEHOUSES"), getDyehouses);

// Create dyehouse
router.post(
  "/",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("CREATE_DYEHOUSE"),
  createDyehouse
);

// Get dyehouse by ID
router.get("/:id", auditLog("GET_DYEHOUSE"), getDyehouseById);

// Update dyehouse
router.put(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("UPDATE_DYEHOUSE"),
  updateDyehouse
);

// Delete dyehouse (soft delete)
router.delete(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("DELETE_DYEHOUSE"),
  deleteDyehouse
);

// Search dyehouses
router.get(
  "/search",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  auditLog("SEARCH_DYEHOUSES"),
  searchDyehouses
);

// Get dyehouses count
router.get(
  "/stats/count",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("GET_DYEHOUSES_COUNT"),
  getDyehousesCount
);

export default router;
