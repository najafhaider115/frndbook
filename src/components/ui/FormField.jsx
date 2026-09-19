import { useId } from "react";
import styles from "./feedback.module.css";

export default function FormField({
  label, id, as: Control = "input", hint, error, className = "", ...props
}) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const description = [props["aria-describedby"], hint && `${controlId}-hint`, error && `${controlId}-error`]
    .filter(Boolean).join(" ") || undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={controlId}>{label}</label>
      <Control
        {...props}
        id={controlId}
        className={`${styles.control} ${className}`.trim()}
        aria-describedby={description}
        aria-invalid={error ? true : props["aria-invalid"]}
      />
      {hint && <span id={`${controlId}-hint`} className={styles.hint}>{hint}</span>}
      {error && <span id={`${controlId}-error`} className={styles.fieldError}>{error}</span>}
    </div>
  );
}
