import Post from "../posts/post.model.js";
import Poll from "../polls/poll.model.js";
import UserProfile from "../users/user.model.js";

/**
 * Fetch unified algorithmic and categorized feeds with pagination
 */
export const GetFeed = async (req, res) => {
  try {
    console.log("Hit GetFeed api...");
    const { tab = "for-you", page = 1, limit = 15 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 15));
    const skip = (pageNum - 1) * limitNum;

    let items = [];
    let total = 0;

    if (tab === "polls") {
      // Polls only
      total = await Poll.countDocuments({
        moderationStatus: "approved",
        isDeleted: false
      });
      items = await Poll.find({
        moderationStatus: "approved",
        isDeleted: false
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("authorProfileId", "anonymousUsername avatar reputationScore");

      items = items.map((p) => ({
        ...p.toObject(),
        feedType: "poll"
      }));
    } else if (tab === "ending-soon") {
      // Polls ending soonest
      const now = new Date();
      total = await Poll.countDocuments({
        moderationStatus: "approved",
        isDeleted: false,
        expiresAt: { $gt: now }
      });
      items = await Poll.find({
        moderationStatus: "approved",
        isDeleted: false,
        expiresAt: { $gt: now }
      })
        .sort({ expiresAt: 1 })
        .skip(skip)
        .limit(limitNum)
        .populate("authorProfileId", "anonymousUsername avatar reputationScore");

      items = items.map((p) => ({
        ...p.toObject(),
        feedType: "poll"
      }));
    } else if (tab === "questions") {
      total = await Post.countDocuments({
        postType: "question",
        moderationStatus: "approved",
        isDeleted: false
      });
      items = await Post.find({
        postType: "question",
        moderationStatus: "approved",
        isDeleted: false
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("authorProfileId", "anonymousUsername avatar reputationScore");

      items = items.map((p) => ({
        ...p.toObject(),
        feedType: "post"
      }));
    } else if (tab === "hot-takes") {
      total = await Post.countDocuments({
        postType: "hot_take",
        moderationStatus: "approved",
        isDeleted: false
      });
      items = await Post.find({
        postType: "hot_take",
        moderationStatus: "approved",
        isDeleted: false
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("authorProfileId", "anonymousUsername avatar reputationScore");

      items = items.map((p) => ({
        ...p.toObject(),
        feedType: "post"
      }));
    } else if (tab === "trending") {
      // Sort by combined engagement: likes + comments*2 + agrees + disagrees
      total = await Post.countDocuments({
        moderationStatus: "approved",
        isDeleted: false
      });

      items = await Post.aggregate([
        { $match: { moderationStatus: "approved", isDeleted: false } },
        {
          $addFields: {
            engagementScore: {
              $add: [
                { $multiply: ["$likesCount", 2] },
                { $multiply: ["$commentsCount", 3] },
                "$agreesCount",
                "$disagreesCount",
                "$completionsCount"
              ]
            }
          }
        },
        { $sort: { engagementScore: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum },
        {
          $lookup: {
            from: "userprofiles",
            localField: "authorProfileId",
            foreignField: "_id",
            as: "authorProfileId"
          }
        },
        { $unwind: "$authorProfileId" },
        {
          $project: {
            "authorProfileId.userId": 0,
            "authorProfileId.__v": 0
          }
        }
      ]);

      items = items.map((p) => ({
        ...p,
        feedType: "post"
      }));
    } else {
      // 'for-you' or 'latest'
      const postQuery = { moderationStatus: "approved", isDeleted: false };

      // If user is authenticated and has interests, bias towards their topics on 'for-you'
      if (tab === "for-you" && req.user?.userId) {
        const profile = await UserProfile.findOne({ userId: req.user.userId });
        if (profile?.interests && profile.interests.length > 0) {
          postQuery.$or = [
            { tags: { $in: profile.interests.map((t) => t.toLowerCase()) } },
            { isPinnedDaily: true },
            { likesCount: { $gt: 0 } }
          ];
        }
      }

      total = await Post.countDocuments(postQuery);
      items = await Post.find(postQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("authorProfileId", "anonymousUsername avatar reputationScore");

      items = items.map((p) => ({
        ...p.toObject(),
        feedType: "post"
      }));
    }

    // Retrieve daily pinned question
    const dailyQuestion = await Post.findOne({
      postType: "question",
      isPinnedDaily: true,
      moderationStatus: "approved",
      isDeleted: false
    }).populate("authorProfileId", "anonymousUsername avatar");

    return res.status(200).json({
      success: true,
      message: "Feed retrieved successfully",
      data: {
        items,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        dailyQuestion
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle GetFeed:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching feed",
      data: null,
      error: error.message
    });
  }
};

/**
 * Get Featured Daily Question Prompt
 */
export const GetDailyQuestion = async (req, res) => {
  try {
    let question = await Post.findOne({
      postType: "question",
      isPinnedDaily: true,
      moderationStatus: "approved",
      isDeleted: false
    }).populate("authorProfileId", "anonymousUsername avatar");

    if (!question) {
      question = await Post.findOne({
        postType: "question",
        moderationStatus: "approved",
        isDeleted: false
      })
        .sort({ createdAt: -1 })
        .populate("authorProfileId", "anonymousUsername avatar");
    }

    return res.status(200).json({
      success: true,
      message: "Daily question fetched",
      data: question || {
        _id: "default_q",
        title: "Daily Anonymous Question",
        content: "What is a controversial opinion you hold that you would never admit in public?",
        postType: "question"
      },
      error: null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch daily question",
      data: null,
      error: error.message
    });
  }
};
