import express from "express";
import authRoutes from "./auth/auth.routes.js";
import userRoutes from "./users/user.routes.js";
import moderationRoutes from "./moderation/moderation.routes.js";
import postRoutes from "./posts/post.routes.js";
import commentRoutes from "./comments/comment.routes.js";
import pollRoutes from "./polls/poll.routes.js";
import feedRoutes from "./feed/feed.routes.js";
import searchRoutes from "./search/search.routes.js";
import adminRoutes from "./admin/admin.routes.js";

const router = express.Router();

// Health Check API
router.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Vibe Anonymous Social Platform API is operational",
    data: {
      status: "healthy",
      service: "vibe-backend",
      version: "1.0.0",
      timestamp: new Date().toISOString()
    },
    error: null
  });
});

// Feature Module Routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/moderation", moderationRoutes);
router.use("/posts", postRoutes);
router.use("/comments", commentRoutes);
router.use("/polls", pollRoutes);
router.use("/feed", feedRoutes);
router.use("/search", searchRoutes);
router.use("/admin", adminRoutes);

export default router;
