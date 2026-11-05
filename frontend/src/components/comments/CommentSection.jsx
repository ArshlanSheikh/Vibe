import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  ThumbsUp,
  Award,
  Send,
  CornerDownRight,
  Sparkles,
  Check
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../common/Toast/ToastContext";
import styles from "./CommentSection.module.css";

const CommentItem = ({
  comment,
  isPostAuthor,
  isQuestionPost,
  onReply,
  onUpvote,
  onMarkHelpful
}) => {
  const author = comment.authorProfileId || {};

  return (
    <div className={styles.commentItem}>
      <div className={styles.commentHeader}>
        <div className={styles.authorMeta}>
          <div className={styles.avatarCircle}>
            <span>{author.anonymousUsername?.charAt(0) || "A"}</span>
          </div>
          <div>
            <span className={styles.authorName}>@{author.anonymousUsername || "Anon"}</span>
            {comment.isMarkedHelpful && (
              <span className={styles.helpfulBadge}>
                <Award size={12} />
                <span>Helpful Answer</span>
              </span>
            )}
          </div>
        </div>

        <div className={styles.commentActions}>
          <button
            onClick={() => onUpvote(comment._id)}
            className={styles.upvoteBtn}
            title="Upvote helpful comment"
          >
            <ThumbsUp size={13} />
            <span>{comment.upvotesCount || 0}</span>
          </button>

          {isQuestionPost && isPostAuthor && (
            <button
              onClick={() => onMarkHelpful(comment._id)}
              className={`${styles.markHelpfulBtn} ${
                comment.isMarkedHelpful ? styles.markedActive : ""
              }`}
              title="Mark as helpful answer"
            >
              <Check size={13} />
              <span>{comment.isMarkedHelpful ? "Helpful" : "Mark Helpful"}</span>
            </button>
          )}

          <button
            onClick={() => onReply(comment._id, author.anonymousUsername)}
            className={styles.replyTriggerBtn}
          >
            Reply
          </button>
        </div>
      </div>

      <p className={styles.commentBody}>{comment.content}</p>

      {/* Render Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className={styles.repliesList}>
          {comment.replies.map((reply) => (
            <div key={reply._id} className={styles.replyItem}>
              <CornerDownRight size={14} className={styles.replyArrow} />
              <div className={styles.replyContent}>
                <div className={styles.replyHeader}>
                  <span className={styles.replyAuthor}>
                    @{reply.authorProfileId?.anonymousUsername || "Anon"}
                  </span>
                  <button
                    onClick={() => onUpvote(reply._id)}
                    className={styles.miniUpvoteBtn}
                  >
                    <ThumbsUp size={11} />
                    <span>{reply.upvotesCount || 0}</span>
                  </button>
                </div>
                <p className={styles.replyBody}>{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CommentSection = ({ postId, isPostAuthor, isQuestionPost, onAuthRequired }) => {
  const { isLoggedIn } = useAuth();
  const { showToast } = useToast();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null); // { id, username }
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/comments/post/${postId}`);
        if (res?.success) {
          setComments(res.data || []);
        }
      } catch (err) {
        console.warn("Error fetching comments:", err);
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchComments();
    }
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      if (onAuthRequired) onAuthRequired("login");
      return;
    }
    if (!newComment.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await api.post("/comments", {
        postId,
        content: newComment.trim(),
        parentCommentId: replyingTo?.id || null
      });

      if (res?.success && res?.data) {
        showToast("Anonymous comment posted!", "success");
        setNewComment("");
        setReplyingTo(null);

        // Refresh comments list
        const refreshed = await api.get(`/comments/post/${postId}`);
        if (refreshed?.success) {
          setComments(refreshed.data || []);
        }
      }
    } catch (err) {
      showToast(err.message || "Failed to post comment", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = async (commentId) => {
    if (!isLoggedIn) {
      if (onAuthRequired) onAuthRequired("login");
      return;
    }
    try {
      await api.post(`/comments/${commentId}/upvote`);
      // Update locally
      const refreshed = await api.get(`/comments/post/${postId}`);
      if (refreshed?.success) {
        setComments(refreshed.data || []);
      }
    } catch (err) {
      showToast(err.message || "Could not upvote", "error");
    }
  };

  const handleMarkHelpful = async (commentId) => {
    try {
      const res = await api.post(`/comments/${commentId}/helpful`);
      if (res?.success) {
        showToast(res.message, "success");
        const refreshed = await api.get(`/comments/post/${postId}`);
        if (refreshed?.success) {
          setComments(refreshed.data || []);
        }
      }
    } catch (err) {
      showToast(err.message || "Could not mark helpful", "error");
    }
  };

  return (
    <section className={styles.section}>
      <h3 className={styles.title}>
        <MessageSquare size={18} />
        <span>Discussion ({comments.length})</span>
      </h3>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className={styles.inputForm}>
        {replyingTo && (
          <div className={styles.replyingBanner}>
            <span>Replying to @{replyingTo.username}</span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className={styles.cancelReplyBtn}
            >
              Cancel
            </button>
          </div>
        )}
        <div className={styles.inputRow}>
          <input
            type="text"
            placeholder={
              replyingTo
                ? `Replying to @${replyingTo.username}...`
                : "Add to the anonymous discussion..."
            }
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className={styles.textInput}
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className={styles.submitBtn}
          >
            <Send size={15} />
            <span>Post</span>
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className={styles.commentsList}>
        {loading ? (
          <p className={styles.mutedText}>Loading discussion...</p>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              isPostAuthor={isPostAuthor}
              isQuestionPost={isQuestionPost}
              onReply={(id, username) => setReplyingTo({ id, username })}
              onUpvote={handleUpvote}
              onMarkHelpful={handleMarkHelpful}
            />
          ))
        ) : (
          <div className={styles.emptyDiscussion}>
            <p>No comments yet. Be the first to share an anonymous thought!</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CommentSection;
