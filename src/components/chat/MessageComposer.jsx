import chatStyles from "../../styles/chat.module.css";
import { bindStyles } from "../../utils/bindStyles";
import { useEffect, useRef, useState } from "react";

const css = bindStyles(chatStyles);
const MAX_MESSAGE_LENGTH = 5000;

export default function MessageComposer({ onSend, disabled = false }) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  const revision = useRef(0);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const value = content.trim();
    if (!value || disabled || inFlight.current) return;
    inFlight.current = true;
    const submittedRevision = revision.current;
    setSending(true);
    try {
      await onSend(value);
      // Preserve edits made while waiting for the server acknowledgement.
      if (mounted.current && submittedRevision === revision.current) setContent("");
    } catch {
      // The chat shows the error; retain the draft for an explicit retry.
    } finally {
      inFlight.current = false;
      if (mounted.current) setSending(false);
    }
  };
  const handleKeyDown = (event) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };
  return (
    <form className={css("message-composer")} onSubmit={handleSubmit} aria-busy={sending}>
      <textarea aria-label="Message" value={content} maxLength={MAX_MESSAGE_LENGTH}
        rows={2} placeholder="Write a message..."
        onChange={(event) => { revision.current++; setContent(event.target.value); }}
        onKeyDown={handleKeyDown} disabled={disabled} />
      <div className={css("message-composer-footer")}>
        <span>{content.length}/{MAX_MESSAGE_LENGTH}</span>
        <button type="submit" disabled={disabled || sending || !content.trim()}>
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
