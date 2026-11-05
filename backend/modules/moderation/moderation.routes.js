import express from "express";
import {
  TestModerationEndpoint,
  GetModerationQueue
} from "./moderation.controller.js";
import { verifyToken, requireAdmin } from "../auth/auth.middleware.js";

const router = express.Router();

router.post("/test", TestModerationEndpoint);
router.get("/queue", verifyToken, requireAdmin, GetModerationQueue);

export default router;
