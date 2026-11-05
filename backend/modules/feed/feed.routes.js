import express from "express";
import { GetFeed, GetDailyQuestion } from "./feed.controller.js";
import { optionalAuth } from "../auth/auth.middleware.js";

const router = express.Router();

router.get("/", optionalAuth, GetFeed);
router.get("/daily-question", GetDailyQuestion);

export default router;
