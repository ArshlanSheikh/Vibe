import mongoose from "mongoose";
import crypto from "crypto";
import Poll from "./poll.model.js";
import PollVote from "./pollVote.model.js";
import UserProfile from "../users/user.model.js";
import { evaluateContentSafety } from "../moderation/moderation.service.js";

/**
 * Create a new anonymous interactive poll (AI moderated)
 */
export const CreatePoll = async (req, res) => {
  try {
    console.log("Hit CreatePoll api...");
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

    const requiredFields = ["question", "options"];
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

    const {
      question,
      description = "",
      pollType = "standard",
      options,
      isMultiChoice = false,
      isResultsHiddenUntilVote = true,
      durationHours = 24
    } = commingData;

    if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
      return res.status(400).json({
        success: false,
        message: "Poll must have between 2 and 6 options",
        data: null,
        error: "INVALID_OPTIONS_COUNT"
      });
    }

    // Format options with unique IDs
    const formattedOptions = options.map((opt, idx) => {
      const text = typeof opt === "string" ? opt.trim() : opt.text.trim();
      const imageUrl = typeof opt === "object" ? opt.imageUrl : null;
      return {
        optionId: `opt_${idx}_${crypto.randomBytes(4).toString("hex")}`,
        text,
        imageUrl,
        voteCount: 0
      };
    });

    // Run AI Moderation on question, description & options
    const fullTextToInspect = `${question} ${description} ${formattedOptions.map((o) => o.text).join(" ")}`;
    const modResult = await evaluateContentSafety({
      text: fullTextToInspect,
      contentType: "poll",
      authorProfileId: profile._id
    });

    if (modResult.decision === "rejected") {
      return res.status(400).json({
        success: false,
        message: `Poll violates safety policies: ${modResult.reason}`,
        data: null,
        error: "CONTENT_POLICY_VIOLATION"
      });
    }

    // Calculate expiration
    const hours = Math.min(Math.max(1, parseInt(durationHours) || 24), 168); // between 1h and 7 days
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);

    const newPoll = await Poll.create({
      authorProfileId: profile._id,
      question: question.trim(),
      description: description.trim(),
      pollType,
      options: formattedOptions,
      isMultiChoice: Boolean(isMultiChoice),
      isResultsHiddenUntilVote: Boolean(isResultsHiddenUntilVote),
      expiresAt,
      moderationStatus: modResult.approved ? "approved" : "review"
    });

    await newPoll.populate("authorProfileId", "anonymousUsername avatar reputationScore");

    return res.status(201).json({
      success: true,
      message: "Anonymous poll published successfully",
      data: newPoll,
      error: null
    });
  } catch (error) {
    console.error("Failed to handle CreatePoll:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating poll",
      data: null,
      error: error.message
    });
  }
};

/**
 * Retrieve poll by ID with live results and percentage calculation
 */
export const GetPollById = async (req, res) => {
  try {
    console.log("Hit GetPollById api...");
    const { id } = req.params;

    const poll = await Poll.findOne({ _id: id, isDeleted: false }).populate(
      "authorProfileId",
      "anonymousUsername avatar reputationScore"
    );

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: "Poll not found",
        data: null,
        error: "POLL_NOT_FOUND"
      });
    }

    let userVoted = false;
    let selectedOptionIds = [];

    if (req.user?.userId) {
      const profile = await UserProfile.findOne({ userId: req.user.userId });
      if (profile) {
        const existingVote = await PollVote.findOne({
          pollId: poll._id,
          voterProfileId: profile._id
        });
        if (existingVote) {
          userVoted = true;
          selectedOptionIds = existingVote.selectedOptionIds;
        }
      }
    }

    const isExpired = new Date() > new Date(poll.expiresAt);
    const shouldHideResults = poll.isResultsHiddenUntilVote && !userVoted && !isExpired;

    // Calculate percentages
    const totalVotes = poll.totalVotes;
    const optionsWithPercentages = poll.options.map((opt) => {
      const percentage =
        totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;

      return {
        optionId: opt.optionId,
        text: opt.text,
        imageUrl: opt.imageUrl,
        voteCount: shouldHideResults ? null : opt.voteCount,
        percentage: shouldHideResults ? null : percentage,
        isUserSelected: selectedOptionIds.includes(opt.optionId)
      };
    });

    return res.status(200).json({
      success: true,
      message: "Poll fetched successfully",
      data: {
        _id: poll._id,
        author: poll.authorProfileId,
        question: poll.question,
        description: poll.description,
        pollType: poll.pollType,
        options: optionsWithPercentages,
        totalVotes: shouldHideResults ? null : totalVotes,
        isMultiChoice: poll.isMultiChoice,
        isResultsHiddenUntilVote: poll.isResultsHiddenUntilVote,
        expiresAt: poll.expiresAt,
        isExpired,
        userVoted,
        selectedOptionIds,
        createdAt: poll.createdAt
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle GetPollById:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching poll",
      data: null,
      error: error.message
    });
  }
};

/**
 * Cast vote on poll (prevents duplicate voting)
 */
export const VotePoll = async (req, res) => {
  try {
    console.log("Hit VotePoll api...");
    const { id } = req.params;
    const { optionIds } = req.body; // array of optionIds
    const userId = req.user.userId;

    if (!Array.isArray(optionIds) || optionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Must provide at least one option to vote",
        data: null,
        error: "MISSING_SELECTION"
      });
    }

    const profile = await UserProfile.findOne({ userId });
    const poll = await Poll.findOne({ _id: id, isDeleted: false });

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: "Poll not found",
        data: null,
        error: "POLL_NOT_FOUND"
      });
    }

    // Check expiration
    if (new Date() > new Date(poll.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: "This poll has ended. No new votes are accepted.",
        data: null,
        error: "POLL_EXPIRED"
      });
    }

    if (!poll.isMultiChoice && optionIds.length > 1) {
      return res.status(400).json({
        success: false,
        message: "This poll only allows a single vote",
        data: null,
        error: "MULTI_CHOICE_NOT_ALLOWED"
      });
    }

    // Verify optionIds exist on this poll
    const validOptionIds = poll.options.map((o) => o.optionId);
    const hasInvalid = optionIds.some((id) => !validOptionIds.includes(id));
    if (hasInvalid) {
      return res.status(400).json({
        success: false,
        message: "One or more selected options are invalid for this poll",
        data: null,
        error: "INVALID_OPTION"
      });
    }

    // Check duplicate vote
    const existingVote = await PollVote.findOne({
      pollId: poll._id,
      voterProfileId: profile._id
    });

    if (existingVote) {
      return res.status(409).json({
        success: false,
        message: "You have already voted on this poll",
        data: null,
        error: "ALREADY_VOTED"
      });
    }

    // Record vote
    await PollVote.create({
      pollId: poll._id,
      voterProfileId: profile._id,
      selectedOptionIds: optionIds
    });

    // Atomically increment option counts
    optionIds.forEach((selectedId) => {
      const opt = poll.options.find((o) => o.optionId === selectedId);
      if (opt) {
        opt.voteCount += 1;
      }
    });
    poll.totalVotes += 1;
    await poll.save();

    // Calculate updated percentages
    const updatedOptions = poll.options.map((opt) => {
      const percentage = Math.round((opt.voteCount / poll.totalVotes) * 100);
      return {
        optionId: opt.optionId,
        text: opt.text,
        voteCount: opt.voteCount,
        percentage,
        isUserSelected: optionIds.includes(opt.optionId)
      };
    });

    return res.status(200).json({
      success: true,
      message: "Vote cast successfully",
      data: {
        pollId: poll._id,
        options: updatedOptions,
        totalVotes: poll.totalVotes,
        selectedOptionIds: optionIds
      },
      error: null
    });
  } catch (error) {
    console.error("Failed to handle VotePoll:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already voted on this poll",
        data: null,
        error: "DUPLICATE_VOTE"
      });
    }
    return res.status(500).json({
      success: false,
      message: "Error submitting vote",
      data: null,
      error: error.message
    });
  }
};
