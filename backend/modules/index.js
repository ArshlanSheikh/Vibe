import express from "express";

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

export default router;
