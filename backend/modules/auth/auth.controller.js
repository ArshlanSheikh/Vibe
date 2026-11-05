import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "./auth.model.js";
import RefreshToken from "./token.model.js";
import UserProfile from "../users/user.model.js";
import { generateAnonymousUsername, getRandomAvatar } from "../users/user.utils.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "vibe_access_secret_super_secure_key_2026_jwt";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "vibe_refresh_secret_super_secure_key_2026_jwt";
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
const REFRESH_EXPIRY_DAYS = 7;

// Utility to generate token pair
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign({ userId, role }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRY
  });

  const refreshToken = crypto.randomBytes(40).toString("hex");
  const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRY_DAYS);

  return { accessToken, refreshToken, refreshTokenHash, expiresAt };
};

/**
 * Register a new user account and provision an anonymous identity
 */
export const RegisterUser = async (req, res) => {
  try {
    console.log("Hit RegisterUser api...");
    const commingData = req.body;

    const requiredFields = ["email", "password"];
    const missingFields = requiredFields.filter((item) => {
      return (
        commingData[item] === null ||
        commingData[item] === undefined ||
        commingData[item] === ""
      );
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
        data: null,
        error: missingFields
      });
    }

    const email = commingData.email.trim().toLowerCase();
    const password = commingData.password;

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
        data: null,
        error: "PASSWORD_TOO_SHORT"
      });
    }

    // Check existing email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists",
        data: null,
        error: "EMAIL_ALREADY_EXISTS"
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Initial user account (role check: first registered user or admin email can be admin)
    const countUsers = await User.countDocuments();
    const role = countUsers === 0 ? "admin" : "user";

    const newUser = await User.create({
      email,
      passwordHash,
      role,
      status: "active",
      lastLoginAt: new Date()
    });

    // Generate unique anonymous username
    let anonymousUsername = generateAnonymousUsername();
    let collision = await UserProfile.findOne({ anonymousUsername });
    while (collision) {
      anonymousUsername = generateAnonymousUsername();
      collision = await UserProfile.findOne({ anonymousUsername });
    }

    // Initial avatar & interests
    const avatar = commingData.avatar || getRandomAvatar();
    const interests = Array.isArray(commingData.interests) ? commingData.interests : [];

    const newProfile = await UserProfile.create({
      userId: newUser._id,
      anonymousUsername,
      avatar,
      interests,
      reputationScore: 10
    });

    // Generate Tokens
    const { accessToken, refreshToken, refreshTokenHash, expiresAt } = generateTokens(
      newUser._id,
      newUser.role
    );

    // Save refresh token in MongoDB (No Redis)
    await RefreshToken.create({
      tokenHash: refreshTokenHash,
      userId: newUser._id,
      deviceInfo: req.headers["user-agent"] || "unknown",
      expiresAt
    });

    // Set secure HTTP-only cookie for refresh token
    res.cookie("vibe_refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      success: true,
      message: "Anonymous account registered successfully",
      data: {
        accessToken,
        refreshToken,
        user: {
          anonymousUsername: newProfile.anonymousUsername,
          avatar: newProfile.avatar,
          interests: newProfile.interests,
          reputationScore: newProfile.reputationScore,
          role: newUser.role
        }
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle RegisterUser:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during registration",
      data: null,
      error: error.message
    });
  }
};

/**
 * Log in to existing account
 */
export const LoginUser = async (req, res) => {
  try {
    console.log("Hit LoginUser api...");
    const commingData = req.body;

    const requiredFields = ["email", "password"];
    const missingFields = requiredFields.filter((item) => {
      return (
        commingData[item] === null ||
        commingData[item] === undefined ||
        commingData[item] === ""
      );
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
        data: null,
        error: missingFields
      });
    }

    const email = commingData.email.trim().toLowerCase();
    const password = commingData.password;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        data: null,
        error: "INVALID_CREDENTIALS"
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: `Account is suspended: ${user.suspensionReason || "Violations of community guidelines"}`,
        data: null,
        error: "ACCOUNT_SUSPENDED"
      });
    }

    if (user.status === "disabled") {
      return res.status(403).json({
        success: false,
        message: "Account has been permanently disabled",
        data: null,
        error: "ACCOUNT_DISABLED"
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        data: null,
        error: "INVALID_CREDENTIALS"
      });
    }

    // Update login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    // Fetch user's anonymous profile
    const profile = await UserProfile.findOne({ userId: user._id });

    // Generate tokens
    const { accessToken, refreshToken, refreshTokenHash, expiresAt } = generateTokens(
      user._id,
      user.role
    );

    // Save refresh token in MongoDB
    await RefreshToken.create({
      tokenHash: refreshTokenHash,
      userId: user._id,
      deviceInfo: req.headers["user-agent"] || "unknown",
      expiresAt
    });

    res.cookie("vibe_refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        refreshToken,
        user: {
          anonymousUsername: profile?.anonymousUsername || "Anonymous",
          avatar: profile?.avatar || "avatar_cosmic_fox",
          bio: profile?.bio || "",
          interests: profile?.interests || [],
          reputationScore: profile?.reputationScore || 0,
          role: user.role
        }
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle LoginUser:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during login",
      data: null,
      error: error.message
    });
  }
};

/**
 * Rotate Refresh Token & Issue New Access Token
 */
export const RefreshTokenHandler = async (req, res) => {
  try {
    console.log("Hit RefreshTokenHandler api...");
    const incomingRefreshToken =
      req.body?.refreshToken || req.cookies?.vibe_refresh_token;

    if (!incomingRefreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
        data: null,
        error: "MISSING_REFRESH_TOKEN"
      });
    }

    const tokenHash = crypto.createHash("sha256").update(incomingRefreshToken).digest("hex");
    const storedToken = await RefreshToken.findOne({ tokenHash });

    if (!storedToken || storedToken.isRevoked) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is invalid or expired",
        data: null,
        error: "INVALID_REFRESH_TOKEN"
      });
    }

    const user = await User.findById(storedToken.userId);
    if (!user || user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account not active",
        data: null,
        error: "ACCOUNT_INACTIVE"
      });
    }

    // Revoke old token (rotation)
    storedToken.isRevoked = true;
    await storedToken.save();

    // Generate new token pair
    const { accessToken, refreshToken: newRefreshToken, refreshTokenHash, expiresAt } =
      generateTokens(user._id, user.role);

    await RefreshToken.create({
      tokenHash: refreshTokenHash,
      userId: user._id,
      deviceInfo: req.headers["user-agent"] || "unknown",
      expiresAt
    });

    res.cookie("vibe_refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      message: "Tokens refreshed successfully",
      data: {
        accessToken,
        refreshToken: newRefreshToken
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle RefreshTokenHandler:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to refresh token",
      data: null,
      error: error.message
    });
  }
};

/**
 * Logout User (Revoke refresh token)
 */
export const LogoutUser = async (req, res) => {
  try {
    console.log("Hit LogoutUser api...");
    const incomingRefreshToken =
      req.body?.refreshToken || req.cookies?.vibe_refresh_token;

    if (incomingRefreshToken) {
      const tokenHash = crypto.createHash("sha256").update(incomingRefreshToken).digest("hex");
      await RefreshToken.updateOne({ tokenHash }, { $set: { isRevoked: true } });
    }

    res.clearCookie("vibe_refresh_token");

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
      data: null,
      error: null
    });
  } catch (error) {
    console.error("Failed to handle LogoutUser:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
      data: null,
      error: error.message
    });
  }
};
