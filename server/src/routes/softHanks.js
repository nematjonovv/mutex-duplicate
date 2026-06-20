import express from "express";
import {
  createSoftHank,
  createBulkSoftHank,
  getSoftHanks,
  deleteSoftHank,
  updateSoftHank,
} from "../controllers/softHankController.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", requireRole(["DIRECTOR", "MANAGER", "WORKER"]), getSoftHanks);
router.post(
  "/",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  createSoftHank
);
router.post(
  "/bulk",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  createBulkSoftHank
);

router.delete(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER"]),
  deleteSoftHank
);

router.put(
  "/:id",
  requireRole(["DIRECTOR", "MANAGER", "WORKER"]),
  updateSoftHank
);

export default router;
