import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    authorProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserProfile",
      required: true,
      index: true
    },
    postType: {
      type: String,
      enum: [
        "text",
        "image",
        "question",
        "opinion",
        "discussion",
        "hot_take",
        "complete_sentence"
      ],
      required: true,
      index: true
    },
    title: {
      type: String,
      maxlength: 200,
      default: ""
    },
    content: {
      type: String,
      required: true,
      maxlength: 3000
    },
    mediaUrl: {
      type: String,
      default: null
    },
    tags: {
      type: [String],
      default: [],
      index: true
    },
    sentencePrefix: {
      type: String,
      default: null
    },
    moderationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "review"],
      default: "pending",
      index: true
    },
    moderationDetails: {
      decision: String,
      categories: [String],
      reason: String,
      reviewedAt: Date
    },
    likesCount: {
      type: Number,
      default: 0
    },
    commentsCount: {
      type: Number,
      default: 0
    },
    agreesCount: {
      type: Number,
      default: 0
    },
    disagreesCount: {
      type: Number,
      default: 0
    },
    completionsCount: {
      type: Number,
      default: 0
    },
    sharesCount: {
      type: Number,
      default: 0
    },
    isPinnedDaily: {
      type: Boolean,
      default: false,
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

// Text index for search functionality
postSchema.index({ content: "text", title: "text", tags: "text" });

// Feed sorting index
postSchema.index({ moderationStatus: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ moderationStatus: 1, isDeleted: 1, likesCount: -1 });

const Post = mongoose.model("Post", postSchema);

export default Post;
