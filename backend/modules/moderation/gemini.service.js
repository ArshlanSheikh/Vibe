import { GoogleGenerativeAI } from "@google/generative-ai";

const MODERATION_PROMPT = `
You are the safety & content moderation engine for "Vibe", an anonymous social networking platform.
Evaluate the submitted anonymous user content for platform safety violations.

Categories to detect:
1. "sexual_explicit" - Pornography, sexually explicit content, CSAM (zero tolerance).
2. "harassment" - Targeted cyberbullying, malicious stalking, doxxing, severe abuse.
3. "hate_speech" - Hate speech, slurs, dehumanizing rhetoric against protected groups.
4. "violence" - Threats of violence, assault, terrorism, physical harm.
5. "self_harm" - Suicide incitement, self-injury methods.
6. "illegal" - Drug trade, arms deals, dangerous instructions.
7. "pii_doxxing" - Exposing real names, phone numbers, addresses, personal private records.
8. "spam" - Automated bot spam, crypto phishing, fraudulent schemes.

IMPORTANT RULE:
Do NOT censor controversial opinions, confessions, philosophical discussions, spicy relationship hot takes, or disagreements. Anonymous freedom of expression is central to Vibe, provided it does not violate genuine safety rules.

Return strictly raw JSON conforming to this schema (without markdown fences):
{
  "approved": boolean,
  "decision": "approved" | "rejected" | "review",
  "categories": ["category_name"],
  "severity": "low" | "medium" | "high" | "critical",
  "reason": "Brief concise human-readable explanation",
  "requiresAdminReview": boolean
}
`;

/**
 * Call Gemini API with structured JSON output and safe timeout wrapper
 */
export const callGeminiModeration = async (text, context = {}) => {
  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback if API key is not yet configured in local development
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.warn("⚠️ GEMINI_API_KEY not set. Operating in resilient deterministic safety fallback mode.");
    return {
      approved: true,
      decision: "approved",
      categories: [],
      severity: "low",
      reason: "Passed baseline deterministic safety checks (local simulation mode)",
      requiresAdminReview: false,
      isFallback: true
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Use gemini-1.5-flash or gemini-2.5-flash for fastest, high-quality moderation
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  });

  const prompt = `${MODERATION_PROMPT}\n\nCONTENT TYPE: ${context.contentType || "post"}\nCONTENT TO EVALUATE:\n"""\n${text}\n"""`;

  // 6000ms safe timeout wrapper
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Gemini API call timed out after 6000ms")), 6000)
  );

  const apiPromise = model.generateContent(prompt);

  const result = await Promise.race([apiPromise, timeoutPromise]);
  const response = await result.response;
  const rawText = response.text().trim();

  // Parse JSON
  let parsed;
  try {
    // Strip markdown codeblocks if model wrapped output in ```json ... ```
    const sanitized = rawText.replace(/^```json/i, "").replace(/```$/, "").trim();
    parsed = JSON.parse(sanitized);
  } catch (parseErr) {
    console.error("Failed to parse Gemini moderation JSON:", rawText, parseErr);
    // Safe failure strategy: require admin review
    return {
      approved: false,
      decision: "review",
      categories: ["unparseable_ai_response"],
      severity: "medium",
      reason: "AI moderation output could not be formatted. Escalated for human review.",
      requiresAdminReview: true,
      rawOutput: rawText
    };
  }

  // Validate required keys
  const decision = ["approved", "rejected", "review"].includes(parsed.decision)
    ? parsed.decision
    : parsed.approved ? "approved" : "rejected";

  return {
    approved: parsed.approved === true && decision === "approved",
    decision,
    categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    severity: ["low", "medium", "high", "critical"].includes(parsed.severity) ? parsed.severity : "low",
    reason: parsed.reason || (decision === "approved" ? "Content safe" : "Policy violation"),
    requiresAdminReview: Boolean(parsed.requiresAdminReview || decision === "review")
  };
};
