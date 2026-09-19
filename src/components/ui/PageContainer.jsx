import styles from "./foundation.module.css";

/** Shared page geometry. Feature classes own maximum width and responsive overrides. */
export default function PageContainer({ className = "", children, ...props }) {
  return (
    <main id="main-content" tabIndex={-1} {...props} className={`${styles.page} ${className}`.trim()}>
      {children}
    </main>
  );
}
