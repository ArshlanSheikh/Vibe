import express from "express";
import authRoutes from "./auth/auth.routes.js";
import userRoutes from "./users/user.routes.js";

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

export default router;
