import styles from "./foundation.module.css";

/** Preserve semantic markup with as="section" where the card represents a section. */
export default function Card({ as: Component = "div", className = "", children, ...props }) {
  return (
    <Component {...props} className={`${styles.card} ${className}`.trim()}>
      {children}
    </Component>
  );
}
