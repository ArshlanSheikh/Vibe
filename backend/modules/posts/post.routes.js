import express from "express";
import {
  CreatePost,
  GetPostById,
  UpdatePost,
  DeletePost,
  ToggleLikePost,
  VoteStancePost,
  SubmitSentenceCompletion,
  GetSentenceCompletions
} from "./post.controller.js";
import { verifyToken, optionalAuth } from "../auth/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, CreatePost);
router.get("/:id", optionalAuth, GetPostById);
router.patch("/:id", verifyToken, UpdatePost);
router.delete("/:id", verifyToken, DeletePost);

router.post("/:id/like", verifyToken, ToggleLikePost);
router.post("/:id/stance", verifyToken, VoteStancePost);
router.post("/:id/complete", verifyToken, SubmitSentenceCompletion);
router.get("/:id/completions", GetSentenceCompletions);

export default router;
