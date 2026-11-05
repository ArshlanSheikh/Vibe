/**
 * Deterministic Moderation Rules
 * Provides instant pattern matching for critical safety violations (PII, threats, slurs, spam)
 * prior to or alongside Gemini AI verification.
 */

// PII Regex Patterns
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/;

// Violent & Self-Harm Indicators
const VIOLENCE_PATTERNS = [
  /\b(kill|murder|execute|shoot|bomb|slaughter|stab|attack)\s+(all\s+)?(of\s+)?(them|you|him|her|everyone|people|us)\b/i,
  /\b(how\s+to\s+)?(commit\s+suicide|kill\s+myself|hang\s+myself|cut\s+my\s+wrists|end\s+my\s+life)\b/i,
  /\b(bomb\s+threat|death\s+threat|put\s+a\s+bullet|going\s+to\s+shoot)\b/i,
  /\b(i\s+will|i'm\s+going\s+to|going\s+to)\s+(kill|shoot|bomb|murder|destroy)\b/i
];

// Explicit Hate Speech & Severe Harassment
const HATE_SPEECH_PATTERNS = [
  /\b(nazi|hitler\s+was\s+right|white\s+supremacy|gas\s+the)\b/i,
  /\b(all\s+(blacks|whites|jews|muslims|christians|gays|trans)\s+should\s+die)\b/i
];

// Spam & Scam Patterns
const SPAM_PATTERNS = [
  /\b(free\s+crypto|dm\s+for\s+crypto|earn\s+\$\d+\s+hourly|whatsapp\s+me\s+at)\b/i,
  /(https?:\/\/[^\s]+){4,}/i // 4 or more URLs in a single post
];

export const runDeterministicChecks = (text) => {
  if (!text || typeof text !== "string") {
    return { passed: true };
  }

  const cleanText = text.trim();

  // 1. Check for PII Exposure (Doxxing prevention)
  if (EMAIL_REGEX.test(cleanText)) {
    return {
      passed: false,
      decision: "rejected",
      category: "pii_exposure",
      severity: "high",
      reason: "Posting personal email addresses or contact details is forbidden for anonymous safety."
    };
  }

  if (PHONE_REGEX.test(cleanText)) {
    return {
      passed: false,
      decision: "rejected",
      category: "pii_exposure",
      severity: "high",
      reason: "Posting phone numbers or private contact digits violates our anti-doxxing policy."
    };
  }

  if (CREDIT_CARD_REGEX.test(cleanText) || SSN_REGEX.test(cleanText)) {
    return {
      passed: false,
      decision: "rejected",
      category: "pii_exposure",
      severity: "critical",
      reason: "Financial credentials or sensitive personal numbers detected."
    };
  }

  // 2. Check for Violence / Self-harm
  for (const pattern of VIOLENCE_PATTERNS) {
    if (pattern.test(cleanText)) {
      return {
        passed: false,
        decision: "rejected",
        category: "violence_and_harm",
        severity: "critical",
        reason: "Threats of physical violence or self-harm encouragement are strictly prohibited."
      };
    }
  }

  // 3. Check for Hate Speech
  for (const pattern of HATE_SPEECH_PATTERNS) {
    if (pattern.test(cleanText)) {
      return {
        passed: false,
        decision: "rejected",
        category: "hate_speech",
        severity: "critical",
        reason: "Hate speech, violent bigotry, or discrimination is prohibited."
      };
    }
  }

  // 4. Check for Spam / Crypto Scams
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(cleanText)) {
      return {
        passed: false,
        decision: "rejected",
        category: "spam_and_scam",
        severity: "medium",
        reason: "Automated spam, scam links, or solicitation detected."
      };
    }
  }

  return { passed: true };
};
