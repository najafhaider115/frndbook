const time = (value) => Date.parse(value || "") || 0;

const compareMessages = (first, second) => {
  const difference = time(first?.createdAt) - time(second?.createdAt);
  if (difference) return difference;
  const a = String(first?.id ?? "");
  const b = String(second?.id ?? "");
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
    return a.length - b.length || a.localeCompare(b);
  }
  return a.localeCompare(b);
};

export const mergeConversation = (current, incoming) => {
  if (!current) return incoming;
  const lastMessage =
    current.lastMessage &&
    (!incoming.lastMessage || compareMessages(current.lastMessage, incoming.lastMessage) > 0)
      ? current.lastMessage
      : incoming.lastMessage;
  return {
    ...current,
    ...incoming,
    lastMessage,
    updatedAt:
      time(current.updatedAt) > time(incoming.updatedAt)
        ? current.updatedAt
        : incoming.updatedAt || current.updatedAt,
  };
};

export const mergeConversationLists = (current, incoming) => {
  const rows = new Map(current.map((row) => [String(row.id), row]));
  incoming.forEach((row) => {
    if (row?.id == null) return;
    const id = String(row.id);
    rows.set(id, mergeConversation(rows.get(id), row));
  });
  return [...rows.values()].sort(
    (a, b) =>
      time(b.updatedAt) - time(a.updatedAt) ||
      compareMessages(b.lastMessage, a.lastMessage),
  );
};

export const applyConversationUpdate = (current, update) => {
  if (update?.conversationId == null || !update.lastMessage) return current;
  const existing = current.find((row) => String(row.id) === String(update.conversationId));
  if (!existing) return current; // Fetch the full row before adding it; otherUser is required.
  return mergeConversationLists(current, [{
    ...existing,
    lastMessage: update.lastMessage,
    updatedAt: update.updatedAt || update.lastMessage.createdAt,
  }]);
};
