import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    deviceInfo: {
      type: String,
      default: ""
    },
    isRevoked: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index automatically deletes documents when expiresAt is reached
    }
  },
  {
    timestamps: true
  }
);

const RefreshToken = mongoose.model("RefreshToken", tokenSchema);

export default RefreshToken;
