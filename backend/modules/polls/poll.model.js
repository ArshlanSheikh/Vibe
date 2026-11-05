import mongoose from "mongoose";

const pollOptionSchema = new mongoose.Schema({
  optionId: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 120
  },
  imageUrl: {
    type: String,
    default: null
  },
  voteCount: {
    type: Number,
    default: 0
  }
});

const pollSchema = new mongoose.Schema(
  {
    authorProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserProfile",
      required: true,
      index: true
    },
    question: {
      type: String,
      required: true,
      maxlength: 300
    },
    description: {
      type: String,
      maxlength: 1000,
      default: ""
    },
    pollType: {
      type: String,
      enum: ["standard", "this_or_that", "agree_disagree", "opinion"],
      default: "standard",
      index: true
    },
    options: {
      type: [pollOptionSchema],
      validate: [
        (val) => val.length >= 2 && val.length <= 6,
        "Poll must contain between 2 and 6 options"
      ]
    },
    totalVotes: {
      type: Number,
      default: 0
    },
    isMultiChoice: {
      type: Boolean,
      default: false
    },
    isResultsHiddenUntilVote: {
      type: Boolean,
      default: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    moderationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "review"],
      default: "pending",
      index: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

pollSchema.index({ question: "text", description: "text" });
pollSchema.index({ moderationStatus: 1, isDeleted: 1, expiresAt: 1 });

const Poll = mongoose.model("Poll", pollSchema);

export default Poll;
