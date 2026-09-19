import styles from "./foundation.module.css";

/** Native button semantics; callers explicitly opt into form submission. */
export default function Button({ type = "button", className = "", children, ...props }) {
  return (
    <button {...props} type={type} className={`${styles.button} ${className}`.trim()}>
      {children}
    </button>
  );
}
