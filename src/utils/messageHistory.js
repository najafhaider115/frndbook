export const compareMessages = (a, b) => {
  const time = (Date.parse(a.createdAt || "") || 0) - (Date.parse(b.createdAt || "") || 0);
  if (time) return time;
  const first = String(a.id), second = String(b.id);
  return /^\d+$/.test(first) && /^\d+$/.test(second)
    ? first.length - second.length || first.localeCompare(second)
    : first.localeCompare(second);
};

/** History, REST acknowledgements and live echoes share one identity. */
export function mergeMessages(current, incoming, conversationId) {
  const rows = new Map();
  for (const message of [...current, ...incoming]) {
    if (message?.id == null || String(message.conversationId) !== String(conversationId)) continue;
    const id = String(message.id);
    const existing = rows.get(id);
    rows.set(id, { ...message, ...existing, read: Boolean(existing?.read || message.read) });
  }
  return [...rows.values()].sort(compareMessages);
}

export const lastPage = (data, page, size) => data.last === true ||
  (Number.isInteger(data.totalPages) && page >= data.totalPages - 1) ||
  (data.content?.length || 0) < size;
