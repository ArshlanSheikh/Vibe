import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import styles from "./Toast.module.css";

const ToastContainer = ({ toasts, onRemove }) => {
  if (!toasts || toasts.length === 0) return null;

  const renderIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={18} className={styles.iconSuccess} />;
      case "error":
        return <AlertCircle size={18} className={styles.iconError} />;
      case "warning":
        return <AlertTriangle size={18} className={styles.iconWarning} />;
      default:
        return <Info size={18} className={styles.iconInfo} />;
    }
  };

  return (
    <div className={styles.toastContainer} role="region" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toastItem} ${styles[toast.type] || styles.info}`}>
          <div className={styles.iconWrap}>{renderIcon(toast.type)}</div>
          <p className={styles.message}>{toast.message}</p>
          <button
            onClick={() => onRemove(toast.id)}
            className={styles.closeBtn}
            aria-label="Dismiss toast"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
