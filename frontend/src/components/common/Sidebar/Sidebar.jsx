import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Compass,
  Clock,
  TrendingUp,
  HelpCircle,
  BarChart2,
  Flame,
  Hourglass,
  Settings,
  ShieldCheck,
  Hash
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import styles from "./Sidebar.module.css";

const navItems = [
  { label: "For You", path: "/", icon: Compass, tab: "for-you" },
  { label: "Latest", path: "/?tab=latest", icon: Clock, tab: "latest" },
  { label: "Trending", path: "/?tab=trending", icon: TrendingUp, tab: "trending" },
  { label: "Questions", path: "/?tab=questions", icon: HelpCircle, tab: "questions" },
  { label: "Polls", path: "/?tab=polls", icon: BarChart2, tab: "polls" },
  { label: "Hot Takes", path: "/?tab=hot-takes", icon: Flame, tab: "hot-takes" },
  { label: "Ending Soon", path: "/?tab=ending-soon", icon: Hourglass, tab: "ending-soon" }
];

const Sidebar = () => {
  const location = useLocation();
  const { isLoggedIn, isAdmin } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get("tab") || "for-you";

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.navGroup}>
        <p className={styles.groupTitle}>Feeds & Vibes</p>
        <ul className={styles.navList}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === "/" && currentTab === item.tab;

            return (
              <li key={item.tab}>
                <Link
                  to={item.path}
                  className={`${styles.navLink} ${isActive ? styles.activeLink : ""}`}
                >
                  <Icon size={19} className={styles.navIcon} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {isLoggedIn && (
        <nav className={styles.navGroup}>
          <p className={styles.groupTitle}>Preferences</p>
          <ul className={styles.navList}>
            <li>
              <Link
                to="/settings"
                className={`${styles.navLink} ${
                  location.pathname === "/settings" ? styles.activeLink : ""
                }`}
              >
                <Settings size={19} className={styles.navIcon} />
                <span>Mask & Interests</span>
              </Link>
            </li>
            {isAdmin && (
              <li>
                <Link
                  to="/admin"
                  className={`${styles.navLink} ${styles.adminNav} ${
                    location.pathname.startsWith("/admin") ? styles.activeLink : ""
                  }`}
                >
                  <ShieldCheck size={19} className={styles.navIcon} />
                  <span>Admin Console</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}

      {/* Community Guidelines Card */}
      <div className={styles.rulesCard}>
        <div className={styles.rulesHeader}>
          <Hash size={16} className={styles.rulesIcon} />
          <span>Vibe Safe Zone</span>
        </div>
        <p className={styles.rulesText}>
          Real thoughts. Zero real names. Powered by AI moderation to keep the community safe and toxicity-free.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
