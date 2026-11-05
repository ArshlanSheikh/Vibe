import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    anonymousUsername: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    avatar: {
      type: String,
      required: true,
      default: "avatar_cosmic_fox"
    },
    bio: {
      type: String,
      maxlength: 160,
      default: ""
    },
    interests: {
      type: [String],
      default: []
    },
    reputationScore: {
      type: Number,
      default: 0
    },
    lastUsernameChangeAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const UserProfile = mongoose.model("UserProfile", userProfileSchema);

export default UserProfile;
