import express from "express";
import {
  getFinishedProducts,
  createFinishedProduct,
  createBulkFinishedProduct,
  sendToBase,
  getAggregatedFinishedProducts,
  deleteFinishedProductGroup,
  getAutoSelectProducts,
} from "../controllers/finishedProductController.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.post(
  "/auto-select",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  getAutoSelectProducts
);

router.get(
  "/",
  requireRole(["DIRECTOR", "MANAGER", "WORKER", "SELLER"]),
  getFinishedProducts
);

router.get(
  "/aggregated",
  requireRole(["DIRECTOR", "MANAGER", "WORKER", "SELLER"]),
  getAggregatedFinishedProducts
);

router.post(
  "/delete-group",
  requireRole(["DIRECTOR", "MANAGER"]),
  deleteFinishedProductGroup
);

router.post(
  "/",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  createFinishedProduct
);
router.post(
  "/bulk",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  createBulkFinishedProduct
);

router.post(
  "/send-to-base",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  sendToBase
);

export default router;
