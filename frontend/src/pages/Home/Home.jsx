import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Sparkles,
  MessageSquare,
  BarChart3,
  Flame,
  HelpCircle,
  Hourglass,
  Clock,
  RefreshCw
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";
import PostCard from "../../components/posts/PostCard/PostCard";
import PollCard from "../../components/polls/PollCard/PollCard";
import styles from "./Home.module.css";

const tabs = [
  { id: "for-you", label: "For You", icon: Sparkles },
  { id: "latest", label: "Latest", icon: Clock },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "questions", label: "Questions", icon: HelpCircle },
  { id: "polls", label: "Polls", icon: BarChart3 },
  { id: "hot-takes", label: "Hot Takes", icon: Flame },
  { id: "ending-soon", label: "Ending Soon", icon: Hourglass }
];

const Home = ({ onOpenAuthModal, onOpenCreateModal }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "for-you";
  const { isLoggedIn } = useAuth();

  const [dailyQuestion, setDailyQuestion] = useState(null);
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/feed?tab=${currentTab}`);
      if (res?.success && res?.data) {
        setFeedItems(res.data.items || []);
        if (res.data.dailyQuestion) {
          setDailyQuestion(res.data.dailyQuestion);
        }
      }
    } catch (err) {
      console.warn("Feed fetch error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [currentTab]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchFeed();
  };

  return (
    <div className={styles.homeContainer}>
      {/* Daily Question Spotlight */}
      <div className={styles.dailySpotlight}>
        <div className={styles.spotlightHeader}>
          <div className={styles.spotlightBadge}>
            <Sparkles size={14} />
            <span>Today's Anonymous Question</span>
          </div>
          <button
            onClick={handleRefresh}
            className={styles.refreshBtn}
            title="Refresh feed"
          >
            <RefreshCw size={15} className={isRefreshing ? styles.spinning : ""} />
          </button>
        </div>

        <h2 className={styles.questionText}>
          {dailyQuestion?.content ||
            "What is a controversial opinion you hold that you would never admit in public?"}
        </h2>

        <div className={styles.spotlightActions}>
          <button
            onClick={() =>
              isLoggedIn ? onOpenCreateModal("question") : onOpenAuthModal("login")
            }
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
              <Icon size={15} />
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
            {feedItems.map((item) =>
              item.feedType === "poll" || item.options ? (
                <PollCard
                  key={item._id}
                  poll={item}
                  onAuthRequired={onOpenAuthModal}
                />
              ) : (
                <PostCard
                  key={item._id}
                  post={item}
                  onAuthRequired={onOpenAuthModal}
                />
              )
            )}
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
              onClick={() =>
                isLoggedIn ? onOpenCreateModal() : onOpenAuthModal("register")
              }
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
