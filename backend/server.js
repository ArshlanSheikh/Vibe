import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Create HTTP Server
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 Vibe Server running on port ${PORT}`);
      console.log(`📡 API Base: http://localhost:${PORT}/api/v1`);
      console.log(`🩺 Health:   http://localhost:${PORT}/api/v1/health`);
      console.log(`===============================================`);
    });

    // Handle Unhandled Promise Rejections
    process.on("unhandledRejection", (err) => {
      console.error("Unhandled Rejection:", err);
    });

    // Handle Uncaught Exceptions
    process.on("uncaughtException", (err) => {
      console.error("Uncaught Exception:", err);
    });

    // Graceful Shutdown
    const shutdown = () => {
      console.log("Shutting down Vibe server gracefully...");
      server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

  } catch (error) {
    console.error("Failed to start Vibe server:", error);
    process.exit(1);
  }
};

startServer();
