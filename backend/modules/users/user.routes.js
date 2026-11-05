import express from "express";
import {
  GetCurrentUserProfile,
  UpdateUserProfile,
  RegenerateAnonymousUsername,
  GetAvailablePresets
} from "./user.controller.js";
import { verifyToken } from "../auth/auth.middleware.js";

const router = express.Router();

router.get("/presets", GetAvailablePresets);
router.get("/me", verifyToken, GetCurrentUserProfile);
router.patch("/profile", verifyToken, UpdateUserProfile);
router.post("/regenerate-username", verifyToken, RegenerateAnonymousUsername);

export default router;
