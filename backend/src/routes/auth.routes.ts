import { Router } from "express";
import { register, login, me, forgotPassword, resetPasswordOtp } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password-otp", resetPasswordOtp);
router.get("/me", requireAuth, me);

export default router;
