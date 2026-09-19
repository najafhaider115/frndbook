import { formatTimestamp } from "../../utils/displayText.js";
import chatStyles from "../../styles/chat.module.css";
import { bindStyles } from "../../utils/bindStyles";
import UserAvatar from "../users/UserAvatar";

const css = bindStyles(chatStyles);

const ConversationList = ({
  conversations,
  selectedConversationId,
  onSelect,
  loading,
}) => {
  return (
    <aside className={css("conversation-list")}>
      <div className={css("conversation-list-header")}>
        <h2>Messages</h2>
      </div>

      {loading && conversations.length === 0 && (
        <p className={css("chat-status")}>Loading conversations...</p>
      )}

      {!loading && conversations.length === 0 && (
        <div className={css("conversation-empty")}>
          <p>No conversations yet.</p>
          <p>Open a friend and start a conversation.</p>
        </div>
      )}

      <div className={css("conversation-items")}>
        {conversations.map((conversation) => {
          const otherUser = conversation.otherUser;

          const isSelected =
            String(conversation.id) === String(selectedConversationId);

          return (
            <button
              key={conversation.id}
              type="button"
              className={css(`conversation-item ${
                isSelected ? "conversation-item-active" : ""
              }`)}
              aria-current={isSelected ? "true" : undefined}
              onClick={() => onSelect(conversation)}
            >
              <UserAvatar
                name={otherUser?.name}
                image={otherUser?.profileImage}
                userId={otherUser?.id}
                size="medium"
              />

              <div className={css("conversation-item-content")}>
                <strong>{otherUser?.name || "Unknown User"}</strong>

                <span>
                  {conversation.lastMessage?.content || "No messages yet"}
                </span>
              </div>

              <div className={css("conversation-item-time")}>
                {conversation.updatedAt
                  ? formatTimestamp(conversation.updatedAt, true)
                  : ""}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

export default ConversationList;
