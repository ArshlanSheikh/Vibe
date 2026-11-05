import express from "express";
import {
  CreateComment,
  GetCommentsByPost,
  ToggleUpvoteComment,
  MarkHelpfulComment
} from "./comment.controller.js";
import { verifyToken } from "../auth/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, CreateComment);
router.get("/post/:postId", GetCommentsByPost);
router.post("/:id/upvote", verifyToken, ToggleUpvoteComment);
router.post("/:id/helpful", verifyToken, MarkHelpfulComment);

export default router;
