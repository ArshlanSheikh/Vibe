import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, Hash, Flame, BarChart2, MessageSquare } from "lucide-react";
import api from "../../services/api";
import PostCard from "../../components/posts/PostCard/PostCard";
import PollCard from "../../components/polls/PollCard/PollCard";
import styles from "./Search.module.css";

const Search = ({ onOpenAuthModal }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";

  const [searchInput, setSearchInput] = useState(queryParam);
  const [results, setResults] = useState({ posts: [], polls: [] });
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'posts' | 'polls'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSearchInput(queryParam);
    if (queryParam.trim()) {
      handleSearch(queryParam);
    }
  }, [queryParam]);

  useEffect(() => {
    api.get("/search/trending-topics")
      .then((res) => {
        if (res?.success && res?.data) {
          setTrendingTopics(res.data);
        }
      })
      .catch((err) => console.warn(err));
  }, []);

  const handleSearch = async (term) => {
    try {
      setLoading(true);
      const res = await api.get(`/search?q=${encodeURIComponent(term)}&type=all`);
      if (res?.success && res?.data) {
        setResults({
          posts: res.data.posts || [],
          polls: res.data.polls || []
        });
      }
    } catch (err) {
      console.warn("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() });
    }
  };

  const handleTagClick = (tag) => {
    setSearchInput(`#${tag}`);
    setSearchParams({ q: `#${tag}` });
  };

  const allItems = [
    ...results.posts.map((p) => ({ ...p, feedType: "post" })),
    ...results.polls.map((p) => ({ ...p, feedType: "poll" }))
  ];

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.searchBar}>
        <SearchIcon size={20} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search topics, questions, polls, hot takes..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className={styles.inputField}
        />
        <button type="submit" className={styles.searchBtn}>
          Search
        </button>
      </form>

      {/* Trending Tags Carousel */}
      {trendingTopics.length > 0 && (
        <div className={styles.trendingSection}>
          <span className={styles.trendingLabel}>Trending Anonymous Topics:</span>
          <div className={styles.tagsRow}>
            {trendingTopics.map((topic) => (
              <button
                key={topic.tag}
                type="button"
                onClick={() => handleTagClick(topic.tag)}
                className={styles.tagPill}
              >
                <Hash size={13} />
                <span>{topic.tag}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className={styles.tabsRow}>
        <button
          onClick={() => setActiveTab("all")}
          className={`${styles.tabBtn} ${activeTab === "all" ? styles.activeTab : ""}`}
        >
          All ({allItems.length})
        </button>
        <button
          onClick={() => setActiveTab("posts")}
          className={`${styles.tabBtn} ${activeTab === "posts" ? styles.activeTab : ""}`}
        >
          Posts ({results.posts.length})
        </button>
        <button
          onClick={() => setActiveTab("polls")}
          className={`${styles.tabBtn} ${activeTab === "polls" ? styles.activeTab : ""}`}
        >
          Polls ({results.polls.length})
        </button>
      </div>

      {/* Results */}
      <div className={styles.resultsList}>
        {loading ? (
          <div className={styles.loadingSkeleton} />
        ) : (activeTab === "all" ? allItems : activeTab === "posts" ? results.posts : results.polls).length > 0 ? (
          (activeTab === "all" ? allItems : activeTab === "posts" ? results.posts : results.polls).map((item) =>
            item.feedType === "poll" || item.options ? (
              <PollCard key={item._id} poll={item} onAuthRequired={onOpenAuthModal} />
            ) : (
              <PostCard key={item._id} post={item} onAuthRequired={onOpenAuthModal} />
            )
          )
        ) : (
          <div className={styles.emptyState}>
            <p>No anonymous discussions found matching "{queryParam}".</p>
            <span className={styles.emptyTip}>Try searching for a hashtag like #hottake or #tech.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
