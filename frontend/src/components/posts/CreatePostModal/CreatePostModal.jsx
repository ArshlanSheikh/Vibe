import React, { useState } from "react";
import {
  X,
  Sparkles,
  Flame,
  HelpCircle,
  BarChart2,
  Image as ImageIcon,
  MessageSquare,
  Type,
  Plus,
  Trash2,
  AlertCircle,
  Hash
} from "lucide-react";
import api from "../../../services/api";
import { useToast } from "../../common/Toast/ToastContext";
import styles from "./CreatePostModal.module.css";

const POST_TYPES = [
  { id: "hot_take", label: "Hot Take", icon: Flame, color: "#f43f5e" },
  { id: "question", label: "Question", icon: HelpCircle, color: "#8b5cf6" },
  { id: "opinion", label: "Opinion", icon: MessageSquare, color: "#06b6d4" },
  { id: "complete_sentence", label: "Finish Sentence", icon: Type, color: "#10b981" },
  { id: "text", label: "General", icon: MessageSquare, color: "#94a3b8" },
  { id: "discussion", label: "Discussion", icon: MessageSquare, color: "#3b82f6" },
  { id: "image", label: "Image Post", icon: ImageIcon, color: "#f59e0b" }
];

const CreatePostModal = ({ isOpen, initialType = "hot_take", onClose, onSuccess }) => {
  const { showToast } = useToast();

  const [mainMode, setMainMode] = useState("post"); // 'post' | 'poll'
  const [postType, setPostType] = useState(initialType);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sentencePrefix, setSentencePrefix] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  // Poll specific state
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollDescription, setPollDescription] = useState("");
  const [pollType, setPollType] = useState("standard");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [durationHours, setDurationHours] = useState(24);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions((prev) => [...prev, ""]);
    } else {
      showToast("Maximum 6 options allowed", "warning");
    }
  };

  const handleRemovePollOption = (idx) => {
    if (pollOptions.length > 2) {
      setPollOptions((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handlePollOptionChange = (idx, val) => {
    setPollOptions((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      if (mainMode === "post") {
        if (!content.trim()) {
          setErrorMsg("Content cannot be empty.");
          setLoading(false);
          return;
        }

        const tags = tagsInput
          .split(/[\s,]+/)
          .map((t) => t.replace(/^#/, "").trim())
          .filter(Boolean);

        const payload = {
          postType,
          title: title.trim(),
          content: content.trim(),
          mediaUrl: mediaUrl.trim() || null,
          sentencePrefix: postType === "complete_sentence" ? sentencePrefix.trim() : null,
          tags
        };

        const res = await api.post("/posts", payload);
        if (res?.success) {
          showToast(res.message || "Anonymous post published!", "success");
          if (onSuccess) onSuccess();
          onClose();
        }
      } else {
        // Create Poll
        if (!pollQuestion.trim()) {
          setErrorMsg("Poll question is required.");
          setLoading(false);
          return;
        }

        const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
        if (validOptions.length < 2) {
          setErrorMsg("Please provide at least 2 valid poll options.");
          setLoading(false);
          return;
        }

        const payload = {
          question: pollQuestion.trim(),
          description: pollDescription.trim(),
          pollType,
          options: validOptions.map((text) => ({ text })),
          durationHours: parseInt(durationHours)
        };

        const res = await api.post("/polls", payload);
        if (res?.success) {
          showToast(res.message || "Anonymous poll launched!", "success");
          if (onSuccess) onSuccess();
          onClose();
        }
      }
    } catch (err) {
      setErrorMsg(
        err.message || "Failed to publish. Content may have violated safety policies."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className={styles.closeBtn} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className={styles.header}>
          <div className={styles.titleRow}>
            <Sparkles size={20} className={styles.headerIcon} />
            <h2 className={styles.title}>Create Anonymous Content</h2>
          </div>
          <p className={styles.subtitle}>
            Your thoughts, polls, and opinions are shielded by zero-identity disclosure.
          </p>
        </div>

        {/* Main Mode Toggle: Post vs Poll */}
        <div className={styles.modeToggle}>
          <button
            type="button"
            onClick={() => setMainMode("post")}
            className={`${styles.modeBtn} ${mainMode === "post" ? styles.activeMode : ""}`}
          >
            <MessageSquare size={16} />
            <span>Anonymous Post</span>
          </button>
          <button
            type="button"
            onClick={() => setMainMode("poll")}
            className={`${styles.modeBtn} ${mainMode === "poll" ? styles.activeMode : ""}`}
          >
            <BarChart2 size={16} />
            <span>Interactive Poll</span>
          </button>
        </div>

        {errorMsg && (
          <div className={styles.errorBox}>
            <AlertCircle size={16} className={styles.errorIcon} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {mainMode === "post" ? (
            <>
              {/* Post Type Selector */}
              <div className={styles.typeSelectorRow}>
                {POST_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = postType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setPostType(type.id)}
                      className={`${styles.typeChip} ${isSelected ? styles.selectedChip : ""}`}
                      style={{
                        borderColor: isSelected ? type.color : "transparent"
                      }}
                    >
                      <Icon size={14} style={{ color: type.color }} />
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>

              {postType === "complete_sentence" && (
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Incomplete Sentence Prompt</label>
                  <input
                    type="text"
                    placeholder="e.g., The hardest thing about modern life is..."
                    value={sentencePrefix}
                    onChange={(e) => setSentencePrefix(e.target.value)}
                    required
                    className={styles.inputField}
                  />
                </div>
              )}

              <div className={styles.inputGroup}>
                <label className={styles.label}>Title or Headline (Optional)</label>
                <input
                  type="text"
                  placeholder="Give your thought a catchy headline..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={160}
                  className={styles.inputField}
                />
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.labelRow}>
                  <label className={styles.label}>Content / Unfiltered Thought</label>
                  <span className={styles.counter}>{content.length}/3000</span>
                </div>
                <textarea
                  rows={4}
                  placeholder={
                    postType === "hot_take"
                      ? "Drop your most controversial hot take..."
                      : postType === "question"
                      ? "Ask the community anything anonymously..."
                      : "Express yourself openly and honestly..."
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  maxLength={3000}
                  className={styles.textareaField}
                />
              </div>

              {postType === "image" && (
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Image URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className={styles.inputField}
                  />
                </div>
              )}

              <div className={styles.inputGroup}>
                <label className={styles.label}>Tags & Topics (Space separated)</label>
                <div className={styles.tagInputWrap}>
                  <Hash size={16} className={styles.tagIcon} />
                  <input
                    type="text"
                    placeholder="confessions tech hottake latediscussion"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className={styles.tagInput}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Poll Creation Form */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>Poll Question</label>
                <input
                  type="text"
                  placeholder="e.g., Is AI making society smarter or lazier?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  required
                  maxLength={300}
                  className={styles.inputField}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Optional Context / Description</label>
                <textarea
                  rows={2}
                  placeholder="Provide background context for your poll..."
                  value={pollDescription}
                  onChange={(e) => setPollDescription(e.target.value)}
                  className={styles.textareaField}
                />
              </div>

              <div className={styles.optionsSection}>
                <label className={styles.label}>Poll Options (2 to 6)</label>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className={styles.optionInputRow}>
                    <input
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                      required
                      className={styles.optionInput}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePollOption(idx)}
                        className={styles.removeOptionBtn}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}

                {pollOptions.length < 6 && (
                  <button
                    type="button"
                    onClick={handleAddPollOption}
                    className={styles.addOptionBtn}
                  >
                    <Plus size={15} />
                    <span>Add Another Option</span>
                  </button>
                )}
              </div>

              <div className={styles.durationRow}>
                <label className={styles.label}>Poll Closes In:</label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className={styles.selectField}
                >
                  <option value={6}>6 Hours</option>
                  <option value={24}>24 Hours (1 Day)</option>
                  <option value={48}>48 Hours (2 Days)</option>
                  <option value={168}>7 Days</option>
                </select>
              </div>
            </>
          )}

          <button type="submit" disabled={loading} className={styles.publishBtn}>
            {loading ? (
              <span className={styles.spinner}>Verifying AI Moderation...</span>
            ) : (
              `Publish Anonymous ${mainMode === "post" ? "Post" : "Poll"}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
