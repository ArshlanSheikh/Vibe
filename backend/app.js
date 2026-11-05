import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import moduleRoutes from "./modules/index.js";

dotenv.config();

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Allow during local dev for smooth testing
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  })
);

// In-Memory Rate Limiting (No Redis)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later",
    data: null,
    error: "RATE_LIMIT_EXCEEDED"
  }
});
app.use(globalLimiter);

// Body parsers & Cookie parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Request logging in development
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Central API v1 router mounting
app.use("/api/v1", moduleRoutes);

// Root path handler
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Welcome to Vibe - Anonymous Social Media Platform API",
    data: {
      documentation: "/api/v1/health",
      version: "1.0.0"
    },
    error: null
  });
});

// 404 Route Handler
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Resource not found at ${req.originalUrl}`,
    data: null,
    error: "NOT_FOUND"
  });
});

// Centralized Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Application Error:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "An unexpected internal server error occurred";

  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    error: process.env.NODE_ENV === "production" ? "SERVER_ERROR" : (err.stack || err)
  });
});

export default app;
