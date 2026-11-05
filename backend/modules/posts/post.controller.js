import mongoose from "mongoose";
import Post from "./post.model.js";
import UserProfile from "../users/user.model.js";
import Interaction from "../interactions/interaction.model.js";
import { evaluateContentSafety } from "../moderation/moderation.service.js";

/**
 * Create a new anonymous post (runs through the AI moderation pipeline)
 */
export const CreatePost = async (req, res) => {
  try {
    console.log("Hit CreatePost api...");
    const commingData = req.body;
    const userId = req.user.userId;

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Anonymous profile not found",
        data: null,
        error: "PROFILE_NOT_FOUND"
      });
    }

    const requiredFields = ["postType", "content"];
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

    const { postType, title = "", content, mediaUrl = null, tags = [], sentencePrefix = null } =
      commingData;

    const allowedTypes = [
      "text",
      "image",
      "question",
      "opinion",
      "discussion",
      "hot_take",
      "complete_sentence"
    ];

    if (!allowedTypes.includes(postType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid post type. Allowed: ${allowedTypes.join(", ")}`,
        data: null,
        error: "INVALID_POST_TYPE"
      });
    }

    // Combine text for AI moderation inspection
    const fullTextToInspect = `${title} ${content} ${sentencePrefix || ""}`.trim();

    // AI CONTENT MODERATION PIPELINE EXECUTION
    const modResult = await evaluateContentSafety({
      text: fullTextToInspect,
      contentType: "post",
      authorProfileId: profile._id
    });

    if (modResult.decision === "rejected") {
      return res.status(400).json({
        success: false,
        message: `Post violates safety policies: ${modResult.reason}`,
        data: {
          decision: "rejected",
          categories: modResult.categories,
          reason: modResult.reason
        },
        error: "CONTENT_POLICY_VIOLATION"
      });
    }

    const initialStatus = modResult.approved ? "approved" : "review";

    const newPost = await Post.create({
      authorProfileId: profile._id,
      postType,
      title: title.trim(),
      content: content.trim(),
      mediaUrl,
      tags: Array.isArray(tags) ? tags.map((t) => t.toLowerCase().trim()) : [],
      sentencePrefix: postType === "complete_sentence" ? sentencePrefix : null,
      moderationStatus: initialStatus,
      moderationDetails: {
        decision: modResult.decision,
        categories: modResult.categories || [],
        reason: modResult.reason,
        reviewedAt: new Date()
      }
    });

    // Populate presentation author
    await newPost.populate("authorProfileId", "anonymousUsername avatar reputationScore");

    const message =
      initialStatus === "approved"
        ? "Anonymous post published successfully"
        : "Post queued for administrator safety review";

    const statusCode = initialStatus === "approved" ? 201 : 202;

    return res.status(statusCode).json({
      success: true,
      message,
      data: newPost,
      error: null
    });
  } catch (error) {
    console.error("Failed to handle CreatePost:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error creating post",
      data: null,
      error: error.message
    });
  }
};

/**
 * Retrieve post by ID with populated anonymous author and user interaction state
 */
export const GetPostById = async (req, res) => {
  try {
    console.log("Hit GetPostById api...");
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID format",
        data: null,
        error: "INVALID_ID"
      });
    }

    const post = await Post.findOne({ _id: id, isDeleted: false }).populate(
      "authorProfileId",
      "anonymousUsername avatar reputationScore"
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found or has been removed",
        data: null,
        error: "POST_NOT_FOUND"
      });
    }

    let userInteractions = {
      isLiked: false,
      userStance: null // 'agree' | 'disagree' | null
    };

    if (req.user?.userId) {
      const profile = await UserProfile.findOne({ userId: req.user.userId });
      if (profile) {
        const like = await Interaction.findOne({
          userProfileId: profile._id,
          targetType: "post_like",
          targetId: post._id
        });
        const stance = await Interaction.findOne({
          userProfileId: profile._id,
          targetType: { $in: ["post_agree", "post_disagree"] },
          targetId: post._id
        });

        userInteractions = {
          isLiked: !!like,
          userStance: stance ? (stance.targetType === "post_agree" ? "agree" : "disagree") : null
        };
      }
    }

    // Calculate agreement percentages for hot_take or opinion posts
    const totalStanceVotes = post.agreesCount + post.disagreesCount;
    const agreePercentage =
      totalStanceVotes > 0 ? Math.round((post.agreesCount / totalStanceVotes) * 100) : 50;

    return res.status(200).json({
      success: true,
      message: "Post fetched successfully",
      data: {
        ...post.toObject(),
        agreePercentage,
        userInteractions
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle GetPostById:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching post",
      data: null,
      error: error.message
    });
  }
};

/**
 * Edit user's own post (re-runs AI moderation)
 */
export const UpdatePost = async (req, res) => {
  try {
    console.log("Hit UpdatePost api...");
    const { id } = req.params;
    const userId = req.user.userId;
    const commingData = req.body;

    const profile = await UserProfile.findOne({ userId });
    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
        error: "POST_NOT_FOUND"
      });
    }

    if (post.authorProfileId.toString() !== profile._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only edit your own posts",
        data: null,
        error: "FORBIDDEN"
      });
    }

    const newContent = commingData.content || post.content;
    const newTitle = commingData.title !== undefined ? commingData.title : post.title;

    // AI Moderation re-check
    const modResult = await evaluateContentSafety({
      text: `${newTitle} ${newContent}`,
      contentType: "post",
      authorProfileId: profile._id
    });

    if (modResult.decision === "rejected") {
      return res.status(400).json({
        success: false,
        message: `Updated content violates safety policies: ${modResult.reason}`,
        data: null,
        error: "CONTENT_POLICY_VIOLATION"
      });
    }

    post.content = newContent;
    post.title = newTitle;
    if (commingData.mediaUrl !== undefined) post.mediaUrl = commingData.mediaUrl;
    if (commingData.tags !== undefined) post.tags = commingData.tags;
    post.moderationStatus = modResult.approved ? "approved" : "review";

    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
      data: post,
      error: null
    });
  } catch (error) {
    console.error("Failed to handle UpdatePost:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating post",
      data: null,
      error: error.message
    });
  }
};

/**
 * Delete post (by author or admin)
 */
export const DeletePost = async (req, res) => {
  try {
    console.log("Hit DeletePost api...");
    const { id } = req.params;
    const userId = req.user.userId;

    const profile = await UserProfile.findOne({ userId });
    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
        error: "POST_NOT_FOUND"
      });
    }

    if (post.authorProfileId.toString() !== profile?._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only delete your own posts",
        data: null,
        error: "FORBIDDEN"
      });
    }

    post.isDeleted = true;
    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post removed successfully",
      data: null,
      error: null
    });
  } catch (error) {
    console.error("Failed to handle DeletePost:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting post",
      data: null,
      error: error.message
    });
  }
};

/**
 * Toggle like / unlike on post
 */
export const ToggleLikePost = async (req, res) => {
  try {
    console.log("Hit ToggleLikePost api...");
    const { id } = req.params;
    const userId = req.user.userId;

    const profile = await UserProfile.findOne({ userId });
    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
        error: "POST_NOT_FOUND"
      });
    }

    const existingLike = await Interaction.findOne({
      userProfileId: profile._id,
      targetType: "post_like",
      targetId: post._id
    });

    let isLiked = false;
    if (existingLike) {
      await Interaction.deleteOne({ _id: existingLike._id });
      post.likesCount = Math.max(0, post.likesCount - 1);
      isLiked = false;
    } else {
      await Interaction.create({
        userProfileId: profile._id,
        targetType: "post_like",
        targetId: post._id
      });
      post.likesCount += 1;
      isLiked = true;
    }

    await post.save();

    return res.status(200).json({
      success: true,
      message: isLiked ? "Post liked" : "Post unliked",
      data: {
        isLiked,
        likesCount: post.likesCount
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle ToggleLikePost:", error);
    return res.status(500).json({
      success: false,
      message: "Error toggling like",
      data: null,
      error: error.message
    });
  }
};

/**
 * Vote Agree or Disagree on Opinion / Hot Take Posts
 */
export const VoteStancePost = async (req, res) => {
  try {
    console.log("Hit VoteStancePost api...");
    const { id } = req.params;
    const { stance } = req.body; // 'agree' | 'disagree'
    const userId = req.user.userId;

    if (!["agree", "disagree"].includes(stance)) {
      return res.status(400).json({
        success: false,
        message: "Stance must be either 'agree' or 'disagree'",
        data: null,
        error: "INVALID_STANCE"
      });
    }

    const profile = await UserProfile.findOne({ userId });
    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
        error: "POST_NOT_FOUND"
      });
    }

    const targetType = stance === "agree" ? "post_agree" : "post_disagree";
    const oppositeType = stance === "agree" ? "post_disagree" : "post_agree";

    // Remove opposite stance if user previously cast it
    const existingOpposite = await Interaction.findOne({
      userProfileId: profile._id,
      targetType: oppositeType,
      targetId: post._id
    });

    if (existingOpposite) {
      await Interaction.deleteOne({ _id: existingOpposite._id });
      if (oppositeType === "post_agree") {
        post.agreesCount = Math.max(0, post.agreesCount - 1);
      } else {
        post.disagreesCount = Math.max(0, post.disagreesCount - 1);
      }
    }

    // Check if user already voted this stance
    const existingSame = await Interaction.findOne({
      userProfileId: profile._id,
      targetType,
      targetId: post._id
    });

    let activeStance = null;
    if (existingSame) {
      // Toggle off
      await Interaction.deleteOne({ _id: existingSame._id });
      if (stance === "agree") {
        post.agreesCount = Math.max(0, post.agreesCount - 1);
      } else {
        post.disagreesCount = Math.max(0, post.disagreesCount - 1);
      }
      activeStance = null;
    } else {
      // Vote stance
      await Interaction.create({
        userProfileId: profile._id,
        targetType,
        targetId: post._id
      });
      if (stance === "agree") {
        post.agreesCount += 1;
      } else {
        post.disagreesCount += 1;
      }
      activeStance = stance;
    }

    await post.save();

    const totalVotes = post.agreesCount + post.disagreesCount;
    const agreePercentage =
      totalVotes > 0 ? Math.round((post.agreesCount / totalVotes) * 100) : 50;

    return res.status(200).json({
      success: true,
      message: activeStance ? `Recorded your stance: ${stance}` : "Stance removed",
      data: {
        activeStance,
        agreesCount: post.agreesCount,
        disagreesCount: post.disagreesCount,
        agreePercentage,
        totalVotes
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle VoteStancePost:", error);
    return res.status(500).json({
      success: false,
      message: "Error voting stance",
      data: null,
      error: error.message
    });
  }
};

/**
 * Submit Answer for "Complete the Sentence" Post
 */
export const SubmitSentenceCompletion = async (req, res) => {
  try {
    console.log("Hit SubmitSentenceCompletion api...");
    const { id } = req.params;
    const { completion } = req.body;
    const userId = req.user.userId;

    if (!completion || completion.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Completion text is required",
        data: null,
        error: "MISSING_COMPLETION"
      });
    }

    const profile = await UserProfile.findOne({ userId });
    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post || post.postType !== "complete_sentence") {
      return res.status(400).json({
        success: false,
        message: "Target is not a valid complete-the-sentence post",
        data: null,
        error: "INVALID_TARGET"
      });
    }

    // AI Moderation check on completion answer
    const modResult = await evaluateContentSafety({
      text: completion.trim(),
      contentType: "comment",
      authorProfileId: profile._id
    });

    if (modResult.decision === "rejected") {
      return res.status(400).json({
        success: false,
        message: `Answer rejected by safety filter: ${modResult.reason}`,
        data: null,
        error: "CONTENT_POLICY_VIOLATION"
      });
    }

    const interaction = await Interaction.create({
      userProfileId: profile._id,
      targetType: "sentence_completion",
      targetId: post._id,
      value: completion.trim()
    });

    post.completionsCount += 1;
    await post.save();

    return res.status(201).json({
      success: true,
      message: "Sentence completed successfully",
      data: {
        completionId: interaction._id,
        completion: interaction.value,
        anonymousUsername: profile.anonymousUsername,
        avatar: profile.avatar,
        createdAt: interaction.createdAt
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle SubmitSentenceCompletion:", error);
    return res.status(500).json({
      success: false,
      message: "Error submitting sentence completion",
      data: null,
      error: error.message
    });
  }
};

/**
 * Get sentence completions for a post
 */
export const GetSentenceCompletions = async (req, res) => {
  try {
    const { id } = req.params;
    const completions = await Interaction.find({
      targetType: "sentence_completion",
      targetId: id
    })
      .sort({ createdAt: -1 })
      .populate("userProfileId", "anonymousUsername avatar");

    return res.status(200).json({
      success: true,
      message: "Completions fetched successfully",
      data: completions,
      error: null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch completions",
      data: null,
      error: error.message
    });
  }
};
