import express from "express";
import {
  login,
  register,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  verifySectionPassword, // NEW: Import verifySectionPassword
} from "../controllers/authController.js";
import { verifyToken, requireRole, auditLog } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/login", auditLog("USER_LOGIN"), login);
router.post("/refresh-token", refreshToken);
router.post("/verify-section-password", verifySectionPassword); // NEW: Route for verifying section passwords

// Protected routes
router.use(verifyToken);

router.get("/profile", getProfile);
router.put("/profile", auditLog("UPDATE_PROFILE"), updateProfile);
router.put("/change-password", auditLog("CHANGE_PASSWORD"), changePassword);
router.post("/logout", auditLog("USER_LOGOUT"), logout);

// Admin only routes
router.post(
  "/register",
  requireRole(["DIRECTOR", "MANAGER"]),
  auditLog("REGISTER_USER"),
  register
);

export default router;
