import { useState } from "react";

const MAX_MESSAGE_LENGTH = 5000;

const MessageComposer = ({ onSend, disabled = false }) => {
  const [content, setContent] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent || disabled) {
      return;
    }

    try {
      await onSend(trimmedContent);

      setContent("");
    } catch {
      // Parent handles the error.
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <form className="message-composer" onSubmit={handleSubmit}>
      <textarea
        value={content}
        maxLength={MAX_MESSAGE_LENGTH}
        rows={2}
        placeholder="Write a message..."
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />

      <div className="message-composer-footer">
        <span>
          {content.length}/{MAX_MESSAGE_LENGTH}
        </span>

        <button type="submit" disabled={disabled || !content.trim()}>
          Send
        </button>
      </div>
    </form>
  );
};

export default MessageComposer;
