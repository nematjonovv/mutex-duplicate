import express from "express";
import {
  getDyeingLots,
  getDyeingLotById,
  createDyeingLot,
  updateDyeingLot,
  deleteDyeingLot,
  getSendToDyehouse,
  getSendToDyehouseById,
  createSendToDyehouse,
  updateSendToDyehouse,
  deleteSendToDyehouse,
  getDyeingSummary,
  getRecentDyeingActivities,
} from "../controllers/dyeingController.js";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Dyeing Lots routes
router.get(
  "/lots",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  auditLog("GET_DYEING_LOTS"),
  getDyeingLots
);

router.post(
  "/lots",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  auditLog("CREATE_DYEING_LOT"),
  createDyeingLot
);

router.get(
  "/lots/:id",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  auditLog("GET_DYEING_LOT"),
  getDyeingLotById
);

router.put(
  "/lots/:id",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  auditLog("UPDATE_DYEING_LOT"),
  updateDyeingLot
);

router.delete(
  "/lots/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("DELETE_DYEING_LOT"),
  deleteDyeingLot
);

// Send to Dyehouse routes
router.get(
  "/send",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  auditLog("GET_SEND_TO_DYEHOUSE"),
  getSendToDyehouse
);

router.post(
  "/send",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  auditLog("CREATE_SEND_TO_DYEHOUSE"),
  createSendToDyehouse
);

router.get(
  "/send/:id",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  auditLog("GET_SEND_TO_DYEHOUSE_BY_ID"),
  getSendToDyehouseById
);

router.put(
  "/send/:id",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  auditLog("UPDATE_SEND_TO_DYEHOUSE"),
  updateSendToDyehouse
);

router.delete(
  "/send/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("DELETE_SEND_TO_DYEHOUSE"),
  deleteSendToDyehouse
);

// Summary and stats routes
router.get(
  "/stats/summary",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("GET_DYEING_SUMMARY"),
  getDyeingSummary
);

router.get(
  "/stats/recent",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  auditLog("GET_RECENT_DYEING_ACTIVITIES"),
  getRecentDyeingActivities
);

export default router;
