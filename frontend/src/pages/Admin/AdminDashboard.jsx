import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Users,
  MessageSquare,
  BarChart2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  UserX,
  UserCheck,
  Search,
  Filter,
  RefreshCw
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/common/Toast/ToastContext";
import styles from "./AdminDashboard.module.css";

const AdminDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'moderation' | 'users' | 'audit'
  const [stats, setStats] = useState(null);
  const [moderationQueue, setModerationQueue] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");

  const fetchStats = async () => {
    try {
      const res = await api.get("/admin/dashboard/stats");
      if (res?.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn("Failed to fetch admin stats:", err);
    }
  };

  const fetchModerationQueue = async () => {
    try {
      const res = await api.get("/moderation/queue?status=pending");
      if (res?.success) {
        setModerationQueue(res.data.items || []);
      }
    } catch (err) {
      console.warn("Failed to fetch moderation queue:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get(`/admin/users?search=${encodeURIComponent(userSearch)}`);
      if (res?.success) {
        setUsersList(res.data.users || []);
      }
    } catch (err) {
      console.warn("Failed to fetch users:", err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get("/admin/audit-logs");
      if (res?.success) {
        setAuditLogs(res.data.logs || []);
      }
    } catch (err) {
      console.warn("Failed to fetch audit logs:", err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchModerationQueue(), fetchUsers(), fetchAuditLogs()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const handleModerationAction = async (logId, action) => {
    try {
      const res = await api.post(`/admin/moderation/${logId}/action`, {
        action,
        notes: `Admin manual ${action} override`
      });
      if (res?.success) {
        showToast(`Content ${action} successfully!`, "success");
        fetchModerationQueue();
        fetchStats();
        fetchAuditLogs();
      }
    } catch (err) {
      showToast(err.message || "Failed to process moderation action", "error");
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === "suspended" ? "active" : "suspended";
    try {
      const res = await api.patch(`/admin/users/${userId}/status`, {
        status: newStatus,
        reason: newStatus === "suspended" ? "Admin policy enforcement" : ""
      });
      if (res?.success) {
        showToast(`User account status updated to ${newStatus}`, "info");
        fetchUsers();
        fetchStats();
        fetchAuditLogs();
      }
    } catch (err) {
      showToast(err.message || "Failed to update user status", "error");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerBrand}>
          <ShieldAlert size={28} className={styles.shieldIcon} />
          <div>
            <h1 className={styles.title}>Admin Command Center</h1>
            <p className={styles.subtitle}>
              Safety moderation, user policy governance, and platform analytics
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchStats();
            fetchModerationQueue();
            fetchUsers();
            fetchAuditLogs();
            showToast("Admin data refreshed", "info");
          }}
          className={styles.refreshBtn}
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Nav Tabs */}
      <div className={styles.tabBar}>
        <button
          onClick={() => setActiveTab("overview")}
          className={`${styles.tabBtn} ${activeTab === "overview" ? styles.activeTab : ""}`}
        >
          <BarChart2 size={16} />
          <span>Metrics Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("moderation")}
          className={`${styles.tabBtn} ${activeTab === "moderation" ? styles.activeTab : ""}`}
        >
          <AlertTriangle size={16} />
          <span>AI Moderation Queue ({moderationQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`${styles.tabBtn} ${activeTab === "users" ? styles.activeTab : ""}`}
        >
          <Users size={16} />
          <span>User Accounts ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`${styles.tabBtn} ${activeTab === "audit" ? styles.activeTab : ""}`}
        >
          <FileText size={16} />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && stats && (
        <div className={styles.overviewSection}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Users</span>
              <h3 className={styles.statValue}>{stats.users.total}</h3>
              <span className={styles.statSub}>{stats.users.active} active accounts</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Posts</span>
              <h3 className={styles.statValue}>{stats.content.totalPosts}</h3>
              <span className={styles.statSub}>{stats.content.approvedPosts} approved</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Pending Safety Reviews</span>
              <h3 className={`${styles.statValue} ${styles.warningValue}`}>
                {stats.moderation.pendingReviews}
              </h3>
              <span className={styles.statSub}>Awaiting human decision</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Rejected Violations</span>
              <h3 className={`${styles.statValue} ${styles.dangerValue}`}>
                {stats.moderation.totalRejected}
              </h3>
              <span className={styles.statSub}>Blocked by safety rules</span>
            </div>
          </div>

          {/* Safety Violations Breakdown */}
          <div className={styles.panelCard}>
            <h3 className={styles.panelTitle}>AI Safety Violations by Category</h3>
            {stats.moderation.categoryBreakdown.length > 0 ? (
              <div className={styles.categoryGrid}>
                {stats.moderation.categoryBreakdown.map((cat) => (
                  <div key={cat.category} className={styles.categoryItem}>
                    <span className={styles.catName}>{cat.category}</span>
                    <span className={styles.catCount}>{cat.count} caught</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyNotice}>No safety violations logged yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Moderation Queue Tab */}
      {activeTab === "moderation" && (
        <div className={styles.queueSection}>
          <h3 className={styles.panelTitle}>Pending AI Moderation Queue</h3>
          {moderationQueue.length > 0 ? (
            <div className={styles.queueList}>
              {moderationQueue.map((item) => (
                <div key={item._id} className={styles.queueCard}>
                  <div className={styles.queueHeader}>
                    <span className={styles.contentTypeBadge}>{item.contentType}</span>
                    <span className={styles.severityBadge}>{item.severity} severity</span>
                    <span className={styles.authorBadge}>
                      @{item.authorProfileId?.anonymousUsername || "Anon"}
                    </span>
                  </div>

                  <p className={styles.queueContent}>"{item.rawContent}"</p>

                  <div className={styles.queueMeta}>
                    <span className={styles.reasonText}>
                      <strong>AI Reason:</strong> {item.reason || "Under review"}
                    </span>
                    <div className={styles.categoriesRow}>
                      {item.categories.map((c) => (
                        <span key={c} className={styles.tag}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.queueActions}>
                    <button
                      onClick={() => handleModerationAction(item._id, "approved")}
                      className={styles.approveBtn}
                    >
                      <CheckCircle size={15} />
                      <span>Approve & Publish</span>
                    </button>
                    <button
                      onClick={() => handleModerationAction(item._id, "rejected")}
                      className={styles.rejectBtn}
                    >
                      <XCircle size={15} />
                      <span>Reject & Block</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyCard}>
              <CheckCircle size={36} className={styles.checkSuccessIcon} />
              <h4>All Clean!</h4>
              <p>No content currently requires administrator safety review.</p>
            </div>
          )}
        </div>
      )}

      {/* User Accounts Tab */}
      {activeTab === "users" && (
        <div className={styles.usersSection}>
          <div className={styles.usersSearchRow}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchUsers();
              }}
              className={styles.searchWrap}
            >
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by registered email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </form>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Private Email</th>
                  <th>Anonymous Mask</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Member Since</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u._id}>
                    <td className={styles.monoCell}>{u.email}</td>
                    <td>
                      <span className={styles.maskCell}>
                        @{u.anonymousProfile?.anonymousUsername || "No Mask"}
                      </span>
                    </td>
                    <td>
                      <span className={u.role === "admin" ? styles.adminPill : styles.userPill}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          u.status === "active" ? styles.activeStatus : styles.suspendedStatus
                        }
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className={styles.timeCell}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {u.role !== "admin" && (
                        <button
                          onClick={() => handleToggleUserStatus(u._id, u.status)}
                          className={u.status === "suspended" ? styles.activateBtn : styles.suspendBtn}
                        >
                          {u.status === "suspended" ? (
                            <>
                              <UserCheck size={14} />
                              <span>Reactivate</span>
                            </>
                          ) : (
                            <>
                              <UserX size={14} />
                              <span>Suspend</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === "audit" && (
        <div className={styles.auditSection}>
          <h3 className={styles.panelTitle}>Immutable Administrative Audit Trail</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Target Type</th>
                  <th>Target ID</th>
                  <th>Admin</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <span className={styles.actionBadge}>{log.action}</span>
                    </td>
                    <td className={styles.monoCell}>{log.targetType}</td>
                    <td className={styles.monoCell}>{log.targetId}</td>
                    <td>{log.adminId?.email || "System Admin"}</td>
                    <td className={styles.timeCell}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
