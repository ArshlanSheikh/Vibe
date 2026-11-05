import mongoose from "mongoose";

const interactionSchema = new mongoose.Schema(
  {
    userProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserProfile",
      required: true,
      index: true
    },
    targetType: {
      type: String,
      enum: [
        "post_like",
        "post_agree",
        "post_disagree",
        "sentence_completion",
        "comment_upvote"
      ],
      required: true,
      index: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    value: {
      type: String,
      default: null,
      maxlength: 300
    }
  },
  {
    timestamps: true
  }
);

interactionSchema.index(
  { userProfileId: 1, targetType: 1, targetId: 1 },
  { unique: true }
);

const Interaction = mongoose.model("Interaction", interactionSchema);

export default Interaction;
