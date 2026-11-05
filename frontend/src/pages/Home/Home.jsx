import React, { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Sparkles, MessageSquare, BarChart3, Flame, HelpCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";
import styles from "./Home.module.css";

const tabs = [
  { id: "for-you", label: "For You", icon: Sparkles },
  { id: "latest", label: "Latest", icon: MessageSquare },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "questions", label: "Questions", icon: HelpCircle },
  { id: "polls", label: "Polls", icon: BarChart3 },
  { id: "hot-takes", label: "Hot Takes", icon: Flame }
];

const Home = ({ onOpenAuthModal, onOpenCreateModal }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "for-you";
  const { isLoggedIn, user } = useAuth();

  const [dailyQuestion, setDailyQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedItems, setFeedItems] = useState([]);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      setApiError(null);
      try {
        const response = await api.get(`/feed?tab=${currentTab}`);
        if (response?.success && response?.data) {
          setFeedItems(response.data.items || []);
          if (response.data.dailyQuestion) {
            setDailyQuestion(response.data.dailyQuestion);
          }
        }
      } catch (err) {
        // Feed endpoint may not be active yet until commit 4
        setApiError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [currentTab]);

  return (
    <div className={styles.homeContainer}>
      {/* Daily Question Spotlight */}
      <div className={styles.dailySpotlight}>
        <div className={styles.spotlightHeader}>
          <div className={styles.spotlightBadge}>
            <Sparkles size={14} />
            <span>Today's Anonymous Question</span>
          </div>
        </div>
        <h2 className={styles.questionText}>
          {dailyQuestion?.content || "What is a controversial opinion you hold that you would never admit in public?"}
        </h2>
        <div className={styles.spotlightActions}>
          <button
            onClick={() => (isLoggedIn ? onOpenCreateModal("question") : onOpenAuthModal("login"))}
            className={styles.answerBtn}
          >
            Answer Anonymously
          </button>
        </div>
      </div>

      {/* Feed Tabs Navigation */}
      <div className={styles.tabsRow}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`${styles.tabBtn} ${isActive ? styles.activeTab : ""}`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Feed Content Area */}
      <div className={styles.feedContent}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
          </div>
        ) : feedItems.length > 0 ? (
          <div className={styles.feedList}>
            {/* Feed items populated in Commit 4 */}
            {feedItems.map((item) => (
              <div key={item._id} className={styles.feedCard}>
                <p>{item.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrap}>
              <MessageSquare size={36} className={styles.emptyIcon} />
            </div>
            <h3 className={styles.emptyTitle}>The air is quiet right now...</h3>
            <p className={styles.emptySubtitle}>
              Be the first voice to break the silence. Share a hot take, confession, or poll without revealing your real identity.
            </p>
            <button
              onClick={() => (isLoggedIn ? onOpenCreateModal() : onOpenAuthModal("register"))}
              className={styles.firstPostBtn}
            >
              <Sparkles size={16} />
              <span>{isLoggedIn ? "Create First Anonymous Post" : "Join Vibe to Post"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
