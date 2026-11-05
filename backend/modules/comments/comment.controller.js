import mongoose from "mongoose";
import Comment from "./comment.model.js";
import Post from "../posts/post.model.js";
import UserProfile from "../users/user.model.js";
import Interaction from "../interactions/interaction.model.js";
import { evaluateContentSafety } from "../moderation/moderation.service.js";

/**
 * Create a new comment or nested reply (AI moderated)
 */
export const CreateComment = async (req, res) => {
  try {
    console.log("Hit CreateComment api...");
    const commingData = req.body;
    const userId = req.user.userId;

    const requiredFields = ["postId", "content"];
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

    const { postId, content, parentCommentId = null } = commingData;

    const profile = await UserProfile.findOne({ userId });
    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
        error: "POST_NOT_FOUND"
      });
    }

    // AI Moderation on comment
    const modResult = await evaluateContentSafety({
      text: content.trim(),
      contentType: "comment",
      authorProfileId: profile._id
    });

    if (modResult.decision === "rejected") {
      return res.status(400).json({
        success: false,
        message: `Comment rejected by safety policy: ${modResult.reason}`,
        data: null,
        error: "CONTENT_POLICY_VIOLATION"
      });
    }

    const newComment = await Comment.create({
      postId: post._id,
      authorProfileId: profile._id,
      parentCommentId: parentCommentId || null,
      content: content.trim(),
      moderationStatus: modResult.approved ? "approved" : "review"
    });

    // Increment post comment counter
    post.commentsCount += 1;
    await post.save();

    await newComment.populate("authorProfileId", "anonymousUsername avatar reputationScore");

    return res.status(201).json({
      success: true,
      message: "Comment posted anonymously",
      data: newComment,
      error: null
    });
  } catch (error) {
    console.error("Failed to handle CreateComment:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating comment",
      data: null,
      error: error.message
    });
  }
};

/**
 * Get all comments & nested replies for a post
 */
export const GetCommentsByPost = async (req, res) => {
  try {
    console.log("Hit GetCommentsByPost api...");
    const { postId } = req.params;

    const comments = await Comment.find({
      postId,
      moderationStatus: "approved",
      isDeleted: false
    })
      .sort({ createdAt: 1 })
      .populate("authorProfileId", "anonymousUsername avatar reputationScore");

    // Organize into top-level and replies tree
    const commentMap = {};
    const rootComments = [];

    comments.forEach((c) => {
      commentMap[c._id.toString()] = { ...c.toObject(), replies: [] };
    });

    comments.forEach((c) => {
      if (c.parentCommentId && commentMap[c.parentCommentId.toString()]) {
        commentMap[c.parentCommentId.toString()].replies.push(commentMap[c._id.toString()]);
      } else {
        rootComments.push(commentMap[c._id.toString()]);
      }
    });

    return res.status(200).json({
      success: true,
      message: "Comments fetched successfully",
      data: rootComments,
      error: null
    });
  } catch (error) {
    console.error("Failed to handle GetCommentsByPost:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching comments",
      data: null,
      error: error.message
    });
  }
};

/**
 * Upvote a helpful comment
 */
export const ToggleUpvoteComment = async (req, res) => {
  try {
    console.log("Hit ToggleUpvoteComment api...");
    const { id } = req.params;
    const userId = req.user.userId;

    const profile = await UserProfile.findOne({ userId });
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
        data: null,
        error: "COMMENT_NOT_FOUND"
      });
    }

    const existingUpvote = await Interaction.findOne({
      userProfileId: profile._id,
      targetType: "comment_upvote",
      targetId: comment._id
    });

    let isUpvoted = false;
    if (existingUpvote) {
      await Interaction.deleteOne({ _id: existingUpvote._id });
      comment.upvotesCount = Math.max(0, comment.upvotesCount - 1);
      isUpvoted = false;
    } else {
      await Interaction.create({
        userProfileId: profile._id,
        targetType: "comment_upvote",
        targetId: comment._id
      });
      comment.upvotesCount += 1;
      isUpvoted = true;
    }

    await comment.save();

    return res.status(200).json({
      success: true,
      message: isUpvoted ? "Comment upvoted" : "Upvote removed",
      data: {
        isUpvoted,
        upvotesCount: comment.upvotesCount
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle ToggleUpvoteComment:", error);
    return res.status(500).json({
      success: false,
      message: "Error toggling upvote",
      data: null,
      error: error.message
    });
  }
};

/**
 * Mark comment as Helpful Answer (Question author only)
 */
export const MarkHelpfulComment = async (req, res) => {
  try {
    console.log("Hit MarkHelpfulComment api...");
    const { id } = req.params;
    const userId = req.user.userId;

    const profile = await UserProfile.findOne({ userId });
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
        data: null,
        error: "COMMENT_NOT_FOUND"
      });
    }

    const post = await Post.findById(comment.postId);
    if (!post || post.authorProfileId.toString() !== profile._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the author of the question post can mark an answer as helpful",
        data: null,
        error: "FORBIDDEN"
      });
    }

    comment.isMarkedHelpful = !comment.isMarkedHelpful;
    await comment.save();

    // Reward reputation to comment author
    if (comment.isMarkedHelpful) {
      await UserProfile.updateOne(
        { _id: comment.authorProfileId },
        { $inc: { reputationScore: 5 } }
      );
    }

    return res.status(200).json({
      success: true,
      message: comment.isMarkedHelpful ? "Marked as helpful answer!" : "Helpful mark removed",
      data: {
        commentId: comment._id,
        isMarkedHelpful: comment.isMarkedHelpful
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle MarkHelpfulComment:", error);
    return res.status(500).json({
      success: false,
      message: "Error marking helpful comment",
      data: null,
      error: error.message
    });
  }
};
