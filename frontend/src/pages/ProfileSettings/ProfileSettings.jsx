import React, { useState, useEffect } from "react";
import {
  User,
  Shield,
  RefreshCw,
  Sparkles,
  Save,
  Check,
  Award,
  Calendar,
  Lock
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/common/Toast/ToastContext";
import api from "../../services/api";
import styles from "./ProfileSettings.module.css";

const ProfileSettings = () => {
  const { user, updateProfile, regenerateUsername, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [avatar, setAvatar] = useState(user?.avatar || "avatar_cosmic_fox");
  const [bio, setBio] = useState(user?.bio || "");
  const [interests, setInterests] = useState(user?.interests || []);
  const [presetAvatars, setPresetAvatars] = useState([]);
  const [availableInterests, setAvailableInterests] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (user) {
      setAvatar(user.avatar || "avatar_cosmic_fox");
      setBio(user.bio || "");
      setInterests(user.interests || []);
    }
  }, [user]);

  useEffect(() => {
    api.get("/users/presets")
      .then((res) => {
        if (res?.success && res?.data) {
          setPresetAvatars(res.data.avatars || []);
          setAvailableInterests(res.data.interests || []);
        }
      })
      .catch((err) => {
        console.warn("Could not load presets:", err);
      });
  }, []);

  const toggleInterest = (topic) => {
    if (interests.includes(topic)) {
      setInterests((prev) => prev.filter((t) => t !== topic));
    } else {
      if (interests.length < 8) {
        setInterests((prev) => [...prev, topic]);
      } else {
        showToast("Maximum 8 interests allowed", "warning");
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateProfile({ avatar, bio, interests });
      showToast("Anonymous profile saved successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoll = async () => {
    try {
      setIsRolling(true);
      const res = await regenerateUsername();
      showToast(`Mask updated! You are now "${res.anonymousUsername}"`, "success");
    } catch (err) {
      showToast(err.message || "Failed to roll new username", "error");
    } finally {
      setIsRolling(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Mask & Account Settings</h1>
        <p className={styles.pageSubtitle}>
          Customize your public anonymous persona. Your authentic email and account ID are strictly protected.
        </p>
      </div>

      {/* Identity Summary Card */}
      <div className={styles.identityCard}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatarCircle}>
            <span className={styles.avatarLetter}>
              {user?.anonymousUsername?.charAt(0) || "A"}
            </span>
          </div>
        </div>

        <div className={styles.identityInfo}>
          <div className={styles.nameRow}>
            <h2 className={styles.anonymousName}>@{user?.anonymousUsername}</h2>
            <button
              onClick={handleRoll}
              disabled={isRolling}
              className={styles.rollBtn}
              title="Generate a new anonymous name"
            >
              <RefreshCw size={15} className={isRolling ? styles.spinning : ""} />
              <span>Roll New Handle</span>
            </button>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.statBadge}>
              <Award size={14} className={styles.statIcon} />
              <span>{user?.reputationScore || 0} Rep</span>
            </div>
            <div className={styles.statBadge}>
              <Shield size={14} className={styles.statIcon} />
              <span>Masked Identity</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className={styles.form}>
        {/* Avatar Selection */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Choose Avatar Persona</label>
          <div className={styles.avatarGrid}>
            {presetAvatars.map((preset) => {
              const isSelected = avatar === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setAvatar(preset.id)}
                  className={`${styles.avatarOption} ${isSelected ? styles.selectedAvatar : ""}`}
                >
                  <div
                    className={styles.presetIconWrap}
                    style={{ background: preset.color || "#8b5cf6" }}
                  >
                    <span>{preset.name.charAt(0)}</span>
                  </div>
                  <span className={styles.presetName}>{preset.name}</span>
                  {isSelected && <Check size={14} className={styles.checkBadge} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bio Field */}
        <div className={styles.section}>
          <div className={styles.labelRow}>
            <label className={styles.sectionLabel}>Anonymous Bio</label>
            <span className={styles.counter}>{bio.length}/160</span>
          </div>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Share a thought, confession, or motto without revealing who you are..."
            maxLength={160}
            className={styles.bioTextarea}
          />
        </div>

        {/* Interests Selection */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Topics of Interest</label>
          <div className={styles.interestsGrid}>
            {availableInterests.map((topic) => {
              const isSelected = interests.includes(topic);
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleInterest(topic)}
                  className={`${styles.interestPill} ${isSelected ? styles.selectedInterest : ""}`}
                >
                  {isSelected && <Check size={13} />}
                  <span>{topic}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Privacy Guarantee Box */}
        <div className={styles.privacyBox}>
          <Lock size={18} className={styles.privacyIcon} />
          <div>
            <h4 className={styles.privacyTitle}>Zero-Identity Disclosure Guarantee</h4>
            <p className={styles.privacyText}>
              All posts, comments, and votes you create reference only your anonymous mask. Your registered email is never queried or returned on public feeds.
            </p>
          </div>
        </div>

        <button type="submit" disabled={isSaving} className={styles.saveBtn}>
          <Save size={17} />
          <span>{isSaving ? "Saving..." : "Save Preferences"}</span>
        </button>
      </form>
    </div>
  );
};

export default ProfileSettings;
