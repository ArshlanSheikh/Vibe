import React, { useState } from "react";
import { BarChart2, Clock, CheckCircle2, Share2, Sparkles } from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../hooks/useAuth";
import { useToast } from "../../common/Toast/ToastContext";
import styles from "./PollCard.module.css";

const PollCard = ({ poll, onAuthRequired }) => {
  const { isLoggedIn } = useAuth();
  const { showToast } = useToast();

  const [options, setOptions] = useState(poll.options || []);
  const [totalVotes, setTotalVotes] = useState(poll.totalVotes || 0);
  const [userVoted, setUserVoted] = useState(poll.userVoted || false);
  const [selectedOptionId, setSelectedOptionId] = useState(
    poll.selectedOptionIds?.[0] || null
  );
  const [isVoting, setIsVoting] = useState(false);

  const author = poll.authorProfileId || {};
  const isExpired = new Date() > new Date(poll.expiresAt);

  const handleVote = async (optionId) => {
    if (!isLoggedIn) {
      if (onAuthRequired) onAuthRequired("login");
      return;
    }

    if (userVoted || isExpired) return;

    try {
      setIsVoting(true);
      const res = await api.post(`/polls/${poll._id}/vote`, {
        optionIds: [optionId]
      });

      if (res?.success && res?.data) {
        setOptions(res.data.options);
        setTotalVotes(res.data.totalVotes);
        setUserVoted(true);
        setSelectedOptionId(optionId);
        showToast("Your anonymous vote has been recorded!", "success");
      }
    } catch (err) {
      showToast(err.message || "Failed to submit vote", "error");
    } finally {
      setIsVoting(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/poll/${poll._id}`;
    navigator.clipboard.writeText(url);
    showToast("Anonymous poll link copied to clipboard!", "info");
  };

  const getRemainingTime = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return "Poll Ended";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `Ends in ${minutes}m`;
    }
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Ends in ${days}d`;
    }
    return `Ends in ${hours}h`;
  };

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div className={styles.authorMeta}>
          <div className={styles.avatarCircle}>
            <span className={styles.avatarLetter}>
              {author.anonymousUsername?.charAt(0) || "P"}
            </span>
          </div>
          <div>
            <span className={styles.authorName}>@{author.anonymousUsername || "Anonymous"}</span>
            <span className={styles.timeTag}>{getRemainingTime(poll.expiresAt)}</span>
          </div>
        </div>

        <span className={styles.pollBadge}>
          <BarChart2 size={13} />
          <span>Interactive Poll</span>
        </span>
      </div>

      <h3 className={styles.questionText}>{poll.question}</h3>
      {poll.description && <p className={styles.description}>{poll.description}</p>}

      {/* Options List */}
      <div className={styles.optionsList}>
        {options.map((opt) => {
          const isSelected = selectedOptionId === opt.optionId;
          const showResults = userVoted || isExpired;

          return (
            <div
              key={opt.optionId}
              onClick={() => !showResults && !isVoting && handleVote(opt.optionId)}
              className={`${styles.optionItem} ${showResults ? styles.resultItem : styles.clickableOption} ${
                isSelected ? styles.selectedOption : ""
              }`}
            >
              {/* Background result bar */}
              {showResults && (
                <div
                  className={styles.resultBarFill}
                  style={{ width: `${opt.percentage || 0}%` }}
                />
              )}

              <div className={styles.optionContent}>
                <div className={styles.optionLabelRow}>
                  {isSelected && <CheckCircle2 size={16} className={styles.checkIcon} />}
                  <span className={styles.optionText}>{opt.text}</span>
                </div>

                {showResults && (
                  <span className={styles.percentageText}>{opt.percentage || 0}%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className={styles.footer}>
        <div className={styles.metaInfo}>
          <span>{totalVotes} total votes</span>
          <span>•</span>
          <span>{userVoted ? "You voted" : isExpired ? "Closed" : "Click option to vote"}</span>
        </div>

        <button onClick={handleShare} className={styles.shareBtn}>
          <Share2 size={16} />
          <span>Share</span>
        </button>
      </div>
    </article>
  );
};

export default PollCard;
