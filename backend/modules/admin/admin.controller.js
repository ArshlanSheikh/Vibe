import User from "../auth/auth.model.js";
import UserProfile from "../users/user.model.js";
import Post from "../posts/post.model.js";
import Poll from "../polls/poll.model.js";
import Comment from "../comments/comment.model.js";
import ModerationLog from "../moderation/moderation.model.js";
import AdminAuditLog from "./audit.model.js";

/**
 * Fetch platform overview counters, safety analytics, and metrics
 */
export const GetDashboardStats = async (req, res) => {
  try {
    console.log("Hit GetDashboardStats api...");

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalPosts,
      approvedPosts,
      reviewPosts,
      totalComments,
      totalPolls,
      pendingModerationReviews,
      rejectedModerationLogs
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ status: "suspended" }),
      Post.countDocuments(),
      Post.countDocuments({ moderationStatus: "approved", isDeleted: false }),
      Post.countDocuments({ moderationStatus: "review", isDeleted: false }),
      Comment.countDocuments({ isDeleted: false }),
      Poll.countDocuments({ isDeleted: false }),
      ModerationLog.countDocuments({ "adminAction.action": "pending", requiresAdminReview: true }),
      ModerationLog.countDocuments({ aiDecision: "rejected" })
    ]);

    // Aggregate total poll votes
    const voteAgg = await Poll.aggregate([
      { $group: { _id: null, total: { $sum: "$totalVotes" } } }
    ]);
    const totalVotes = voteAgg.length > 0 ? voteAgg[0].total : 0;

    // Category breakdown of moderation violations
    const categoryBreakdown = await ModerationLog.aggregate([
      { $match: { aiDecision: "rejected" } },
      { $unwind: "$categories" },
      { $group: { _id: "$categories", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      message: "Admin metrics fetched successfully",
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers
        },
        content: {
          totalPosts,
          approvedPosts,
          reviewPosts,
          totalComments,
          totalPolls,
          totalVotes
        },
        moderation: {
          pendingReviews: pendingModerationReviews,
          totalRejected: rejectedModerationLogs,
          categoryBreakdown: categoryBreakdown.map((c) => ({
            category: c._id,
            count: c.count
          }))
        }
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle GetDashboardStats:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching admin stats",
      data: null,
      error: error.message
    });
  }
};

/**
 * Get paginated user accounts with their anonymous identities
 */
export const GetAdminUsersList = async (req, res) => {
  try {
    console.log("Hit GetAdminUsersList api...");
    const { search = "", status = "all", page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status !== "all") {
      query.status = status;
    }

    if (search.trim()) {
      query.email = new RegExp(search.trim(), "i");
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Attach anonymous profile info
    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const profile = await UserProfile.findOne({ userId: u._id });
        return {
          ...u.toObject(),
          anonymousProfile: profile
            ? {
                anonymousUsername: profile.anonymousUsername,
                avatar: profile.avatar,
                reputationScore: profile.reputationScore,
                interests: profile.interests
              }
            : null
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: {
        users: enrichedUsers,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle GetAdminUsersList:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching users",
      data: null,
      error: error.message
    });
  }
};

/**
 * Suspend, reactivate, or disable an account
 */
export const UpdateUserAccountStatus = async (req, res) => {
  try {
    console.log("Hit UpdateUserAccountStatus api...");
    const { id } = req.params;
    const { status, reason = "" } = req.body;
    const adminId = req.user.userId;

    if (!["active", "suspended", "disabled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
        data: null,
        error: "INVALID_STATUS"
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
        error: "USER_NOT_FOUND"
      });
    }

    const oldStatus = targetUser.status;
    targetUser.status = status;
    targetUser.suspensionReason = status === "suspended" ? reason : null;
    await targetUser.save();

    // Log admin audit event
    await AdminAuditLog.create({
      adminId,
      action: status === "suspended" ? "SUSPEND_USER" : status === "disabled" ? "DISABLE_USER" : "REACTIVATE_USER",
      targetType: "user",
      targetId: targetUser._id,
      details: { oldStatus, newStatus: status, reason },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Account status updated to ${status}`,
      data: {
        userId: targetUser._id,
        status: targetUser.status,
        suspensionReason: targetUser.suspensionReason
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle UpdateUserAccountStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating user account",
      data: null,
      error: error.message
    });
  }
};

/**
 * Manage moderation item: Approve or Reject content held in review
 */
export const AdminModerateContentAction = async (req, res) => {
  try {
    console.log("Hit AdminModerateContentAction api...");
    const { id } = req.params;
    const { action, notes = "" } = req.body; // 'approved' | 'rejected'
    const adminId = req.user.userId;

    if (!["approved", "rejected"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be either 'approved' or 'rejected'",
        data: null,
        error: "INVALID_ACTION"
      });
    }

    const modLog = await ModerationLog.findById(id);
    if (!modLog) {
      return res.status(404).json({
        success: false,
        message: "Moderation record not found",
        data: null,
        error: "RECORD_NOT_FOUND"
      });
    }

    // Update log
    modLog.adminAction = {
      action,
      adminId,
      adminNotes: notes,
      actionAt: new Date()
    };
    await modLog.save();

    // Update target content model if it exists
    if (modLog.contentId) {
      if (modLog.contentType === "post") {
        await Post.updateOne(
          { _id: modLog.contentId },
          {
            $set: {
              moderationStatus: action,
              isDeleted: action === "rejected"
            }
          }
        );
      } else if (modLog.contentType === "poll") {
        await Poll.updateOne(
          { _id: modLog.contentId },
          {
            $set: {
              moderationStatus: action,
              isDeleted: action === "rejected"
            }
          }
        );
      } else if (modLog.contentType === "comment") {
        await Comment.updateOne(
          { _id: modLog.contentId },
          {
            $set: {
              moderationStatus: action,
              isDeleted: action === "rejected"
            }
          }
        );
      }
    }

    // Record audit event
    await AdminAuditLog.create({
      adminId,
      action: action === "approved" ? "APPROVE_MODERATION_OVERRIDE" : "REJECT_MODERATION_OVERRIDE",
      targetType: "moderation",
      targetId: modLog._id,
      details: { contentType: modLog.contentType, contentId: modLog.contentId, notes },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Moderation item marked as ${action}`,
      data: modLog,
      error: null
    });
  } catch (error) {
    console.error("Failed to handle AdminModerateContentAction:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing moderation action",
      data: null,
      error: error.message
    });
  }
};

/**
 * Remove or restore inappropriate post, poll, or comment
 */
export const RemoveOrRestoreContent = async (req, res) => {
  try {
    console.log("Hit RemoveOrRestoreContent api...");
    const { contentType, id } = req.params;
    const { isDeleted, reason = "" } = req.body;
    const adminId = req.user.userId;

    let targetModel;
    if (contentType === "post") targetModel = Post;
    else if (contentType === "poll") targetModel = Poll;
    else if (contentType === "comment") targetModel = Comment;
    else {
      return res.status(400).json({
        success: false,
        message: "Invalid content type",
        data: null,
        error: "INVALID_CONTENT_TYPE"
      });
    }

    const item = await targetModel.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Content not found",
        data: null,
        error: "CONTENT_NOT_FOUND"
      });
    }

    item.isDeleted = Boolean(isDeleted);
    await item.save();

    await AdminAuditLog.create({
      adminId,
      action: isDeleted ? "REMOVE_CONTENT" : "RESTORE_CONTENT",
      targetType: contentType,
      targetId: item._id,
      details: { reason },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: isDeleted ? "Content removed by administrator" : "Content restored",
      data: { id: item._id, isDeleted: item.isDeleted },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle RemoveOrRestoreContent:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating content deletion state",
      data: null,
      error: error.message
    });
  }
};

/**
 * Retrieve immutable admin audit logs
 */
export const GetAuditLogs = async (req, res) => {
  try {
    console.log("Hit GetAuditLogs api...");
    const { page = 1, limit = 25 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await AdminAuditLog.countDocuments();
    const logs = await AdminAuditLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("adminId", "email role");

    return res.status(200).json({
      success: true,
      message: "Audit logs fetched successfully",
      data: {
        logs,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle GetAuditLogs:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching audit logs",
      data: null,
      error: error.message
    });
  }
};
