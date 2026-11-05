import express from "express";
import { CreatePoll, GetPollById, VotePoll } from "./poll.controller.js";
import { verifyToken, optionalAuth } from "../auth/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, CreatePoll);
router.get("/:id", optionalAuth, GetPollById);
router.post("/:id/vote", verifyToken, VotePoll);

export default router;
