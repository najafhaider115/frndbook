import styles from "./feedback.module.css";

export default function StatusMessage({ tone = "error", children, className = "" }) {
  if (!children) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`${styles.message} ${styles[tone] || styles.info} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
