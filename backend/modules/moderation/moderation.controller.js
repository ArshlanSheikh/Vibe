import { evaluateContentSafety } from "./moderation.service.js";
import ModerationLog from "./moderation.model.js";

/**
 * Direct API endpoint to test and verify the content moderation pipeline
 */
export const TestModerationEndpoint = async (req, res) => {
  try {
    console.log("Hit TestModerationEndpoint api...");
    const commingData = req.body;

    const requiredFields = ["text"];
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

    const result = await evaluateContentSafety({
      text: commingData.text,
      contentType: commingData.contentType || "test",
      authorProfileId: req.user?.profileId || null
    });

    return res.status(200).json({
      success: true,
      message: "Moderation evaluation complete",
      data: result,
      error: null
    });
  } catch (error) {
    console.error("Failed to handle TestModerationEndpoint:", error);
    return res.status(500).json({
      success: false,
      message: "Moderation test failed",
      data: null,
      error: error.message
    });
  }
};

/**
 * Retrieve moderation queue items (pending admin review)
 */
export const GetModerationQueue = async (req, res) => {
  try {
    console.log("Hit GetModerationQueue api...");
    const { status = "pending", page = 1, limit = 20 } = req.query;

    const query = {};
    if (status !== "all") {
      query["adminAction.action"] = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await ModerationLog.countDocuments(query);
    const items = await ModerationLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("authorProfileId", "anonymousUsername avatar");

    return res.status(200).json({
      success: true,
      message: "Moderation queue fetched successfully",
      data: {
        items,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle GetModerationQueue:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch moderation queue",
      data: null,
      error: error.message
    });
  }
};
