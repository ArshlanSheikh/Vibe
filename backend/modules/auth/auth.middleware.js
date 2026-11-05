import jwt from "jsonwebtoken";
import User from "./auth.model.js";

export const verifyToken = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.vibe_access_token) {
      token = req.cookies.vibe_access_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing or invalid",
        data: null,
        error: "UNAUTHORIZED"
      });
    }

    const secret = process.env.JWT_ACCESS_SECRET || "vibe_access_secret_super_secure_key_2026_jwt";
    const decoded = jwt.verify(token, secret);

    // Verify user account status
    const user = await User.findById(decoded.userId).select("role status");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account no longer exists",
        data: null,
        error: "USER_NOT_FOUND"
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Your account is temporarily suspended due to community guidelines violation",
        data: null,
        error: "ACCOUNT_SUSPENDED"
      });
    }

    if (user.status === "disabled") {
      return res.status(403).json({
        success: false,
        message: "This account has been permanently disabled",
        data: null,
        error: "ACCOUNT_DISABLED"
      });
    }

    req.user = {
      userId: user._id,
      role: user.role,
      status: user.status
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid token",
      data: null,
      error: error.message
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.vibe_access_token) {
      token = req.cookies.vibe_access_token;
    }

    if (token) {
      const secret = process.env.JWT_ACCESS_SECRET || "vibe_access_secret_super_secure_key_2026_jwt";
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.userId).select("role status");
      if (user && user.status === "active") {
        req.user = {
          userId: user._id,
          role: user.role,
          status: user.status
        };
      }
    }
  } catch {
    // Silently continue without req.user for optional endpoints
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Administrative privileges required",
      data: null,
      error: "ACCESS_DENIED"
    });
  }
  next();
};
