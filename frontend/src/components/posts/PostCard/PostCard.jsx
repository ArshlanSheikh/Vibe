import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  MessageSquare,
  Share2,
  Flame,
  HelpCircle,
  Type,
  ThumbsUp,
  ThumbsDown,
  Check,
  Send,
  Sparkles,
  ExternalLink
} from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../hooks/useAuth";
import { useToast } from "../../common/Toast/ToastContext";
import styles from "./PostCard.module.css";

const PostCard = ({ post, onOpenComments, onAuthRequired }) => {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const { showToast } = useToast();

  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isLiked, setIsLiked] = useState(post.userInteractions?.isLiked || false);
  const [agreesCount, setAgreesCount] = useState(post.agreesCount || 0);
  const [disagreesCount, setDisagreesCount] = useState(post.disagreesCount || 0);
  const [activeStance, setActiveStance] = useState(post.userInteractions?.userStance || null);
  const [agreePercentage, setAgreePercentage] = useState(post.agreePercentage || 50);

  // Complete the sentence state
  const [completionInput, setCompletionInput] = useState("");
  const [completionsCount, setCompletionsCount] = useState(post.completionsCount || 0);
  const [recentCompletions, setRecentCompletions] = useState([]);
  const [showCompletions, setShowCompletions] = useState(false);
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);

  const author = post.authorProfileId || {};
  const isHotTake = post.postType === "hot_take";
  const isOpinion = post.postType === "opinion";
  const isSentence = post.postType === "complete_sentence";
  const isQuestion = post.postType === "question";

  const handleToggleLike = async () => {
    if (!isLoggedIn) {
      if (onAuthRequired) onAuthRequired("login");
      return;
    }

    try {
      // Optimistic update
      setIsLiked(!isLiked);
      setLikesCount((prev) => (isLiked ? Math.max(0, prev - 1) : prev + 1));

      const res = await api.post(`/posts/${post._id}/like`);
      if (res?.success) {
        setIsLiked(res.data.isLiked);
        setLikesCount(res.data.likesCount);
      }
    } catch {
      // Revert on error
      setIsLiked(isLiked);
      setLikesCount(post.likesCount);
    }
  };

  const handleVoteStance = async (stance) => {
    if (!isLoggedIn) {
      if (onAuthRequired) onAuthRequired("login");
      return;
    }

    try {
      const res = await api.post(`/posts/${post._id}/stance`, { stance });
      if (res?.success && res?.data) {
        setActiveStance(res.data.activeStance);
        setAgreesCount(res.data.agreesCount);
        setDisagreesCount(res.data.disagreesCount);
        setAgreePercentage(res.data.agreePercentage);
        showToast(res.message, "success");
      }
    } catch (err) {
      showToast(err.message || "Failed to vote stance", "error");
    }
  };

  const handleSubmitCompletion = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      if (onAuthRequired) onAuthRequired("login");
      return;
    }
    if (!completionInput.trim()) return;

    try {
      setIsSubmittingCompletion(true);
      const res = await api.post(`/posts/${post._id}/complete`, {
        completion: completionInput.trim()
      });
      if (res?.success && res?.data) {
        showToast("Sentence answered anonymously!", "success");
        setCompletionsCount((prev) => prev + 1);
        setRecentCompletions((prev) => [res.data, ...prev]);
        setCompletionInput("");
        setShowCompletions(true);
      }
    } catch (err) {
      showToast(err.message || "Failed to submit answer", "error");
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  const handleFetchCompletions = async () => {
    if (showCompletions) {
      setShowCompletions(false);
      return;
    }
    try {
      const res = await api.get(`/posts/${post._id}/completions`);
      if (res?.success && res?.data) {
        setRecentCompletions(res.data);
        setShowCompletions(true);
      }
    } catch (err) {
      console.warn("Could not fetch completions:", err);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/post/${post._id}`;
    navigator.clipboard.writeText(url);
    showToast("Anonymous post link copied to clipboard!", "info");
  };

  const timeAgo = (dateStr) => {
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <article className={`${styles.card} ${isHotTake ? styles.hotTakeGlow : ""}`}>
      {/* Header with anonymous persona */}
      <div className={styles.cardHeader}>
        <div className={styles.authorGroup}>
          <div className={styles.avatarCircle}>
            <span className={styles.avatarLetter}>
              {author.anonymousUsername?.charAt(0) || "A"}
            </span>
          </div>
          <div className={styles.authorMeta}>
            <span className={styles.authorName}>@{author.anonymousUsername || "Anonymous"}</span>
            <span className={styles.timeText}>{timeAgo(post.createdAt)}</span>
          </div>
        </div>

        {/* Post Type Badge */}
        <div className={styles.badgeWrapper}>
          {isHotTake && (
            <span className={`${styles.typeBadge} ${styles.badgeHotTake}`}>
              <Flame size={13} />
              <span>Hot Take</span>
            </span>
          )}
          {isQuestion && (
            <span className={`${styles.typeBadge} ${styles.badgeQuestion}`}>
              <HelpCircle size={13} />
              <span>Question</span>
            </span>
          )}
          {isSentence && (
            <span className={`${styles.typeBadge} ${styles.badgeSentence}`}>
              <Type size={13} />
              <span>Sentence</span>
            </span>
          )}
          {isOpinion && (
            <span className={`${styles.typeBadge} ${styles.badgeOpinion}`}>
              <MessageSquare size={13} />
              <span>Opinion</span>
            </span>
          )}
        </div>
      </div>

      {/* Title if present */}
      {post.title && <h3 className={styles.postTitle}>{post.title}</h3>}

      {/* Complete the sentence special layout */}
      {isSentence ? (
        <div className={styles.sentenceWrapper}>
          <p className={styles.sentencePrompt}>
            "{post.sentencePrefix} <span className={styles.blankLine}>________________</span>"
          </p>
          <p className={styles.sentenceSubtitle}>{post.content}</p>

          {/* Answer input */}
          <form onSubmit={handleSubmitCompletion} className={styles.completionForm}>
            <input
              type="text"
              placeholder="Finish this thought anonymously..."
              value={completionInput}
              onChange={(e) => setCompletionInput(e.target.value)}
              className={styles.completionInput}
            />
            <button
              type="submit"
              disabled={isSubmittingCompletion || !completionInput.trim()}
              className={styles.completionSubmitBtn}
            >
              <Send size={15} />
            </button>
          </form>

          {/* Show / Toggle existing completions */}
          {completionsCount > 0 && (
            <button
              type="button"
              onClick={handleFetchCompletions}
              className={styles.viewCompletionsBtn}
            >
              <span>{showCompletions ? "Hide Answers" : `View ${completionsCount} Anonymous Answers`}</span>
            </button>
          )}

          {showCompletions && recentCompletions.length > 0 && (
            <div className={styles.completionsList}>
              {recentCompletions.map((comp) => (
                <div key={comp._id || comp.completionId} className={styles.completionItem}>
                  <p className={styles.completionText}>"{comp.value || comp.completion}"</p>
                  <span className={styles.completionAuthor}>
                    — @{comp.userProfileId?.anonymousUsername || comp.anonymousUsername || "Anon"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Standard post body */
        <p className={styles.postBody}>{post.content}</p>
      )}

      {/* Image if available */}
      {post.mediaUrl && (
        <div className={styles.mediaContainer}>
          <img src={post.mediaUrl} alt="Post media" className={styles.postImage} />
        </div>
      )}

      {/* Stance Agree / Disagree Bar (for Hot Take & Opinion posts) */}
      {(isHotTake || isOpinion) && (
        <div className={styles.stanceContainer}>
          <div className={styles.stanceButtons}>
            <button
              onClick={() => handleVoteStance("agree")}
              className={`${styles.stanceBtn} ${activeStance === "agree" ? styles.activeAgree : ""}`}
            >
              <ThumbsUp size={15} />
              <span>Agree ({agreesCount})</span>
            </button>
            <button
              onClick={() => handleVoteStance("disagree")}
              className={`${styles.stanceBtn} ${activeStance === "disagree" ? styles.activeDisagree : ""}`}
            >
              <ThumbsDown size={15} />
              <span>Disagree ({disagreesCount})</span>
            </button>
          </div>

          {/* Percentage Bar */}
          <div className={styles.percentageBarWrap}>
            <div
              className={styles.percentageBarFill}
              style={{ width: `${agreePercentage}%` }}
            />
          </div>
          <div className={styles.percentageLabels}>
            <span>{agreePercentage}% Agree</span>
            <span>{100 - agreePercentage}% Disagree</span>
          </div>
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className={styles.tagsRow}>
          {post.tags.map((tag) => (
            <Link key={tag} to={`/search?q=%23${tag}`} className={styles.tagItem}>
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* Footer Action Bar */}
      <div className={styles.cardFooter}>
        <button
          onClick={handleToggleLike}
          className={`${styles.actionBtn} ${isLiked ? styles.likedAction : ""}`}
        >
          <Heart size={18} className={isLiked ? styles.heartFilled : ""} />
          <span>{likesCount}</span>
        </button>

        <button
          onClick={() => (onOpenComments ? onOpenComments(post) : navigate(`/post/${post._id}`))}
          className={styles.actionBtn}
        >
          <MessageSquare size={18} />
          <span>{post.commentsCount || 0}</span>
        </button>

        <button onClick={handleShare} className={styles.actionBtn}>
          <Share2 size={18} />
          <span>Share</span>
        </button>
      </div>
    </article>
  );
};

export default PostCard;
