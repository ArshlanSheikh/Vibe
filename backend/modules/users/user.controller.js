import UserProfile from "./user.model.js";
import User from "../auth/auth.model.js";
import {
  generateAnonymousUsername,
  AVATAR_PRESETS,
  AVAILABLE_INTERESTS
} from "./user.utils.js";

/**
 * Get current authenticated user's anonymous profile and account preferences
 */
export const GetCurrentUserProfile = async (req, res) => {
  try {
    console.log("Hit GetCurrentUserProfile api...");
    const userId = req.user.userId;

    const profile = await UserProfile.findOne({ userId });
    const userAccount = await User.findById(userId).select("role status createdAt");

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Anonymous profile not found",
        data: null,
        error: "PROFILE_NOT_FOUND"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        anonymousUsername: profile.anonymousUsername,
        avatar: profile.avatar,
        bio: profile.bio,
        interests: profile.interests,
        reputationScore: profile.reputationScore,
        lastUsernameChangeAt: profile.lastUsernameChangeAt,
        role: userAccount.role,
        memberSince: userAccount.createdAt
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle GetCurrentUserProfile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching profile",
      data: null,
      error: error.message
    });
  }
};

/**
 * Update anonymous profile fields (avatar, bio, interests)
 */
export const UpdateUserProfile = async (req, res) => {
  try {
    console.log("Hit UpdateUserProfile api...");
    const userId = req.user.userId;
    const commingData = req.body;

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Anonymous profile not found",
        data: null,
        error: "PROFILE_NOT_FOUND"
      });
    }

    if (commingData.avatar !== undefined) {
      profile.avatar = commingData.avatar;
    }

    if (commingData.bio !== undefined) {
      if (commingData.bio.length > 160) {
        return res.status(400).json({
          success: false,
          message: "Bio cannot exceed 160 characters",
          data: null,
          error: "BIO_TOO_LONG"
        });
      }
      profile.bio = commingData.bio;
    }

    if (commingData.interests !== undefined) {
      if (!Array.isArray(commingData.interests)) {
        return res.status(400).json({
          success: false,
          message: "Interests must be an array of strings",
          data: null,
          error: "INVALID_INTERESTS_FORMAT"
        });
      }
      profile.interests = commingData.interests.slice(0, 10); // at most 10 interests
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Anonymous profile updated successfully",
      data: {
        anonymousUsername: profile.anonymousUsername,
        avatar: profile.avatar,
        bio: profile.bio,
        interests: profile.interests,
        reputationScore: profile.reputationScore
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle UpdateUserProfile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error updating profile",
      data: null,
      error: error.message
    });
  }
};

/**
 * Regenerate / Roll a new anonymous username
 */
export const RegenerateAnonymousUsername = async (req, res) => {
  try {
    console.log("Hit RegenerateAnonymousUsername api...");
    const userId = req.user.userId;

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
        data: null,
        error: "PROFILE_NOT_FOUND"
      });
    }

    // Generate new unique anonymous username
    let newUsername = generateAnonymousUsername();
    let collision = await UserProfile.findOne({ anonymousUsername: newUsername });
    while (collision) {
      newUsername = generateAnonymousUsername();
      collision = await UserProfile.findOne({ anonymousUsername: newUsername });
    }

    profile.anonymousUsername = newUsername;
    profile.lastUsernameChangeAt = new Date();
    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Anonymous identity rolled successfully",
      data: {
        anonymousUsername: profile.anonymousUsername,
        lastUsernameChangeAt: profile.lastUsernameChangeAt
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle RegenerateAnonymousUsername:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to regenerate username",
      data: null,
      error: error.message
    });
  }
};

/**
 * Get available avatar presets & interest topics for setup
 */
export const GetAvailablePresets = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Presets fetched successfully",
      data: {
        avatars: AVATAR_PRESETS,
        interests: AVAILABLE_INTERESTS
      },
      error: null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch presets",
      data: null,
      error: error.message
    });
  }
};
