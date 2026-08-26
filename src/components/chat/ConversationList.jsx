import UserAvatar from "../users/UserAvatar";

const ConversationList = ({
  conversations,
  selectedConversationId,
  onSelect,
  loading,
}) => {
  return (
    <aside className="conversation-list">
      <div className="conversation-list-header">
        <h2>Messages</h2>
      </div>

      {loading && conversations.length === 0 && (
        <p className="chat-status">Loading conversations...</p>
      )}

      {!loading && conversations.length === 0 && (
        <div className="conversation-empty">
          <p>No conversations yet.</p>
          <p>Open a friend and start a conversation.</p>
        </div>
      )}

      <div className="conversation-items">
        {conversations.map((conversation) => {
          const otherUser = conversation.otherUser;

          const isSelected =
            String(conversation.id) === String(selectedConversationId);

          return (
            <button
              key={conversation.id}
              type="button"
              className={`conversation-item ${
                isSelected ? "conversation-item-active" : ""
              }`}
              onClick={() => onSelect(conversation)}
            >
              <UserAvatar
                name={otherUser?.name}
                image={otherUser?.profileImage}
                userId={otherUser?.id}
                size="medium"
              />

              <div className="conversation-item-content">
                <strong>{otherUser?.name || "Unknown User"}</strong>

                <span>
                  {conversation.lastMessage?.content || "No messages yet"}
                </span>
              </div>

              <div className="conversation-item-time">
                {conversation.updatedAt
                  ? new Date(conversation.updatedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
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
