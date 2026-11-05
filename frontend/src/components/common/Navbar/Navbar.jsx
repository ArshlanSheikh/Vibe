import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Flame,
  Search,
  PlusCircle,
  ShieldAlert,
  User as UserIcon,
  LogOut,
  RefreshCw,
  Sparkles,
  Menu,
  X
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { useToast } from "../Toast/ToastContext";
import styles from "./Navbar.module.css";

const Navbar = ({ onOpenAuthModal, onOpenCreateModal }) => {
  const navigate = useNavigate();
  const { user, isLoggedIn, isAdmin, logout, regenerateUsername } = useAuth();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRolling, setIsRolling] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleRollUsername = async () => {
    try {
      setIsRolling(true);
      const updated = await regenerateUsername();
      showToast(`Identity rolled! You are now "${updated.anonymousUsername}"`, "success");
    } catch (err) {
      showToast(err.message || "Failed to roll username", "error");
    } finally {
      setIsRolling(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
    showToast("Logged out successfully", "info");
    navigate("/");
  };

  return (
    <header className={styles.header}>
      <div className={styles.navContainer}>
        {/* Brand Logo */}
        <Link to="/" className={styles.brand}>
          <div className={styles.logoIcon}>
            <Flame size={24} className={styles.flameIcon} />
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>Vibe</span>
            <span className={styles.brandTag}>anon</span>
          </div>
        </Link>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <Search size={17} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search discussions, polls, #topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </form>

        {/* Desktop Actions */}
        <div className={styles.navActions}>
          {isLoggedIn ? (
            <>
              {/* Quick Create Post / Poll */}
              <button
                onClick={onOpenCreateModal}
                className={styles.createBtn}
                title="Create Post or Poll"
              >
                <PlusCircle size={18} />
                <span>Create</span>
              </button>

              {/* Admin Portal Shortcut */}
              {isAdmin && (
                <Link to="/admin" className={styles.adminBadgeLink} title="Admin Center">
                  <ShieldAlert size={16} />
                  <span>Admin</span>
                </Link>
              )}

              {/* Anonymous Identity Pill / Dropdown */}
              <div className={styles.profileWrapper}>
                <button
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className={styles.profilePill}
                  aria-expanded={dropdownOpen}
                >
                  <div className={styles.avatarCircle}>
                    {user?.avatar?.startsWith("http") ? (
                      <img src={user.avatar} alt="Avatar" className={styles.avatarImg} />
                    ) : (
                      <span className={styles.avatarLetter}>
                        {user?.anonymousUsername?.charAt(0) || "A"}
                      </span>
                    )}
                  </div>
                  <span className={styles.usernameText}>
                    {user?.anonymousUsername || "Anonymous"}
                  </span>
                </button>

                {dropdownOpen && (
                  <div className={styles.dropdownMenu}>
                    <div className={styles.dropdownHeader}>
                      <p className={styles.dropdownTitle}>Anonymous Mask</p>
                      <p className={styles.dropdownHandle}>@{user?.anonymousUsername}</p>
                    </div>

                    <div className={styles.divider} />

                    <button
                      onClick={handleRollUsername}
                      disabled={isRolling}
                      className={styles.dropdownItem}
                    >
                      <RefreshCw size={16} className={isRolling ? styles.spinning : ""} />
                      <span>Roll New Username</span>
                    </button>

                    <Link
                      to="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className={styles.dropdownItem}
                    >
                      <UserIcon size={16} />
                      <span>Profile & Interests</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className={styles.dropdownItem}
                      >
                        <ShieldAlert size={16} />
                        <span>Admin Console</span>
                      </Link>
                    )}

                    <div className={styles.divider} />

                    <button
                      onClick={handleLogout}
                      className={`${styles.dropdownItem} ${styles.dangerItem}`}
                    >
                      <LogOut size={16} />
                      <span>Disconnect Session</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.authButtons}>
              <button
                onClick={() => onOpenAuthModal("login")}
                className={styles.loginBtn}
              >
                Log In
              </button>
              <button
                onClick={() => onOpenAuthModal("register")}
                className={styles.registerBtn}
              >
                <Sparkles size={16} />
                <span>Join Anon</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className={styles.mobileToggle}
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown View */}
      {mobileMenuOpen && (
        <div className={styles.mobileNav}>
          <form onSubmit={handleSearchSubmit} className={styles.mobileSearch}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search topics, polls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          {isLoggedIn ? (
            <div className={styles.mobileLinks}>
              <button
                onClick={() => {
                  onOpenCreateModal();
                  setMobileMenuOpen(false);
                }}
                className={styles.mobileCreateBtn}
              >
                <PlusCircle size={18} />
                <span>Create Post or Poll</span>
              </button>
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={styles.mobileLinkItem}
              >
                Profile & Interests (@{user?.anonymousUsername})
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={styles.mobileLinkItem}
                >
                  Admin Console
                </Link>
              )}
              <button onClick={handleLogout} className={styles.mobileLogoutBtn}>
                Disconnect Session
              </button>
            </div>
          ) : (
            <div className={styles.mobileAuthActions}>
              <button
                onClick={() => {
                  onOpenAuthModal("login");
                  setMobileMenuOpen(false);
                }}
                className={styles.loginBtn}
              >
                Log In
              </button>
              <button
                onClick={() => {
                  onOpenAuthModal("register");
                  setMobileMenuOpen(false);
                }}
                className={styles.registerBtn}
              >
                Join Anon
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
