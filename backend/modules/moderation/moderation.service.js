import ModerationLog from "./moderation.model.js";
import { runDeterministicChecks } from "./moderation.rules.js";
import { callGeminiModeration } from "./gemini.service.js";

/**
 * Orchestrate the full content moderation pipeline:
 * 1. Deterministic checks
 * 2. Gemini AI evaluation
 * 3. Safe-failure tri-state decision
 * 4. Audit logging
 */
export const evaluateContentSafety = async ({
  text,
  contentType = "post",
  contentId = null,
  authorProfileId = null
}) => {
  if (!text || typeof text !== "string" || text.trim() === "") {
    return {
      approved: false,
      decision: "rejected",
      reason: "Empty content cannot be submitted",
      logId: null
    };
  }

  const cleanText = text.trim();

  // 1. Run deterministic checks first
  const deterministicResult = runDeterministicChecks(cleanText);
  if (!deterministicResult.passed) {
    // Record deterministic rejection
    const log = await ModerationLog.create({
      contentType,
      contentId,
      rawContent: cleanText,
      authorProfileId,
      aiDecision: deterministicResult.decision,
      categories: [deterministicResult.category],
      severity: deterministicResult.severity,
      reason: deterministicResult.reason,
      requiresAdminReview: false,
      adminAction: { action: "rejected", adminNotes: "Auto-rejected by deterministic safety filter" }
    });

    return {
      approved: false,
      decision: deterministicResult.decision,
      categories: [deterministicResult.category],
      severity: deterministicResult.severity,
      reason: deterministicResult.reason,
      logId: log._id
    };
  }

  // 2. Call Gemini AI Moderation Service
  let aiResult;
  try {
    aiResult = await callGeminiModeration(cleanText, { contentType });
  } catch (err) {
    console.error("Gemini moderation execution failure:", err);
    // Safe Failure Strategy: Do not publish blindly! Mark as 'review'
    aiResult = {
      approved: false,
      decision: "review",
      categories: ["ai_service_error"],
      severity: "medium",
      reason: "Safety verification service temporarily unavailable. Content held for review.",
      requiresAdminReview: true,
      error: err.message
    };
  }

  // 3. Log decision to MongoDB
  const log = await ModerationLog.create({
    contentType,
    contentId,
    rawContent: cleanText,
    authorProfileId,
    aiDecision: aiResult.decision,
    categories: aiResult.categories,
    severity: aiResult.severity,
    reason: aiResult.reason,
    requiresAdminReview: aiResult.requiresAdminReview,
    rawAiResponse: aiResult,
    adminAction: {
      action: aiResult.approved ? "approved" : aiResult.decision === "review" ? "pending" : "rejected"
    }
  });

  return {
    approved: aiResult.approved,
    decision: aiResult.decision,
    categories: aiResult.categories,
    severity: aiResult.severity,
    reason: aiResult.reason,
    requiresAdminReview: aiResult.requiresAdminReview,
    logId: log._id
  };
};
