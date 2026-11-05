import mongoose from "mongoose";

const moderationLogSchema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      enum: ["post", "poll", "comment", "message", "test"],
      required: true,
      index: true
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    rawContent: {
      type: String,
      required: true,
      maxlength: 5000
    },
    authorProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserProfile",
      default: null,
      index: true
    },
    aiDecision: {
      type: String,
      enum: ["approved", "rejected", "review"],
      required: true,
      index: true
    },
    categories: {
      type: [String],
      default: []
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low"
    },
    reason: {
      type: String,
      default: ""
    },
    requiresAdminReview: {
      type: Boolean,
      default: false,
      index: true
    },
    adminAction: {
      action: {
        type: String,
        enum: ["pending", "approved", "rejected", "dismissed"],
        default: "pending",
        index: true
      },
      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      adminNotes: {
        type: String,
        default: ""
      },
      actionAt: {
        type: Date,
        default: null
      }
    },
    rawAiResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast admin queue queries
moderationLogSchema.index({ "adminAction.action": 1, requiresAdminReview: 1, createdAt: -1 });

const ModerationLog = mongoose.model("ModerationLog", moderationLogSchema);

export default ModerationLog;
