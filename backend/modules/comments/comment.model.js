import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true
    },
    authorProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserProfile",
      required: true,
      index: true
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    upvotesCount: {
      type: Number,
      default: 0
    },
    isMarkedHelpful: {
      type: Boolean,
      default: false
    },
    moderationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "review"],
      default: "pending",
      index: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

commentSchema.index({ postId: 1, parentCommentId: 1, createdAt: 1 });

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
