const notificationLabels = {
  NEW_MESSAGE: "New message", CHAT_MESSAGE: "New message",
  FRIEND_REQUEST: "Friend request", FRIEND_REQUEST_ACCEPTED: "Friend request accepted",
};
export function notificationLabel(type) {
  return notificationLabels[type] || "Activity";
}

/** Offset-free backend LocalDateTime is a wall clock, not a known UTC instant. */
export function formatTimestamp(value, timeOnly = false, locale) {
  if (typeof value !== "string" || !value.trim()) return "—";
  const wallClock = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value);
  const zoned = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  if (!wallClock && !zoned) return "—";
  // UTC formatting here preserves the supplied clock fields; it does not infer UTC storage.
  const date = new Date(wallClock ? `${value}Z` : value);
  if (Number.isNaN(date.getTime())) return "—";
  if (wallClock && date.toISOString().slice(0, 16) !== value.slice(0, 16)) return "—";
  const options = timeOnly ? { hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
  if (wallClock) options.timeZone = "UTC";
  return new Intl.DateTimeFormat(locale, options).format(date);
}
