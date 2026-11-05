import React, { useState, useEffect } from "react";
import { X, Lock, Mail, Sparkles, Check, AlertCircle } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { useToast } from "../../common/Toast/ToastContext";
import api from "../../../services/api";
import styles from "./AuthModal.module.css";

const AuthModal = ({ isOpen, initialMode = "login", onClose }) => {
  const { login, register } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [availableInterests, setAvailableInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setMode(initialMode);
    setErrorMsg("");
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (mode === "register") {
      api.get("/users/presets")
        .then((res) => {
          if (res?.success && res?.data?.interests) {
            setAvailableInterests(res.data.interests);
          }
        })
        .catch(() => {
          setAvailableInterests([
            "Life Thoughts", "Hot Takes", "Confessions",
            "Tech & AI", "Relationships", "Work & Career"
          ]);
        });
    }
  }, [mode]);

  if (!isOpen) return null;

  const toggleInterest = (topic) => {
    if (selectedInterests.includes(topic)) {
      setSelectedInterests((prev) => prev.filter((t) => t !== topic));
    } else {
      if (selectedInterests.length < 5) {
        setSelectedInterests((prev) => [...prev, topic]);
      } else {
        showToast("Select up to 5 interests", "warning");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      if (mode === "login") {
        await login(email, password);
        showToast("Welcome back to the anonymous vibe!", "success");
      } else {
        await register(email, password, selectedInterests);
        showToast("Welcome to Vibe! Your anonymous mask is ready.", "success");
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Authentication failed. Please verify credentials.");
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
          <div className={styles.iconBadge}>
            <Sparkles size={20} className={styles.badgeIcon} />
          </div>
          <h2 className={styles.title}>
            {mode === "login" ? "Welcome Back to Vibe" : "Create Anonymous Identity"}
          </h2>
          <p className={styles.subtitle}>
            {mode === "login"
              ? "Sign in to access your masked identity and saved interactions."
              : "Your email is strictly for recovery. It is NEVER exposed to other users."}
          </p>
        </div>

        {/* Tab switch */}
        <div className={styles.tabSwitch}>
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`${styles.tabItem} ${mode === "login" ? styles.activeTab : ""}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`${styles.tabItem} ${mode === "register" ? styles.activeTab : ""}`}
          >
            Create Anon Mask
          </button>
        </div>

        {errorMsg && (
          <div className={styles.errorBox}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Private Email Address</label>
            <div className={styles.inputWrap}>
              <Mail size={18} className={styles.inputIcon} />
              <input
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.inputField}
              />
            </div>
            <span className={styles.helperText}>Kept 100% confidential. Never shown publicly.</span>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrap}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={styles.inputField}
              />
            </div>
          </div>

          {mode === "register" && (
            <>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Confirm Password</label>
                <div className={styles.inputWrap}>
                  <Lock size={18} className={styles.inputIcon} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className={styles.inputField}
                  />
                </div>
              </div>

              {availableInterests.length > 0 && (
                <div className={styles.interestsSection}>
                  <label className={styles.label}>Choose Your Topics (Optional)</label>
                  <div className={styles.tagsGrid}>
                    {availableInterests.map((topic) => {
                      const isSelected = selectedInterests.includes(topic);
                      return (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => toggleInterest(topic)}
                          className={`${styles.tagPill} ${isSelected ? styles.selectedTag : ""}`}
                        >
                          {isSelected && <Check size={12} />}
                          <span>{topic}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? (
              <span className={styles.spinner}>Processing...</span>
            ) : mode === "login" ? (
              "Sign In to Vibe"
            ) : (
              "Generate Anonymous Profile"
            )}
          </button>
        </form>

        <div className={styles.footerNotice}>
          <p>
            By continuing, you agree to our <strong>Safety Guidelines</strong>. Harmful, threatening, or illegal speech will be rejected by our AI moderation filter.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
