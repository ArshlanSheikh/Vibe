import mongoose from "mongoose";

const pollVoteSchema = new mongoose.Schema(
  {
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poll",
      required: true,
      index: true
    },
    voterProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserProfile",
      required: true,
      index: true
    },
    selectedOptionIds: {
      type: [String],
      required: true
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index prevents double voting by the same anonymous profile
pollVoteSchema.index({ pollId: 1, voterProfileId: 1 }, { unique: true });

const PollVote = mongoose.model("PollVote", pollVoteSchema);

export default PollVote;
