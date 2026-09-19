import { apiErrorMessage } from "../utils/apiError.js";
import { compareMessages, lastPage, mergeMessages } from "../utils/messageHistory.js";

export const MESSAGE_PAGE_SIZE = 10;
const MAX_SCAN_PAGES = 1000;

/** One lifetime per account/conversation. Dependencies make async races testable. */
export function createMessageSession({ conversationId, fetchPage, saveMessage, markRead,
  isVisible = () => true, onState, onMessage }) {
  let alive = true;
  let initialized = false;
  let anchor = null;
  let olderPage = 0;
  let historyFlight = null;
  let recoverQueued = false;
  let sendFlight = false;
  let readTimer = null;
  let reading = false;
  let readAgain = false;
  const abort = new AbortController();
  let state = { messages: [], loading: true, syncing: false, loadingOlder: false,
    hasOlder: false, historyError: "", sendError: "" };

  const update = (patch) => {
    if (!alive) return;
    state = { ...state, ...patch };
    onState(state);
  };
  const accept = (messages) => {
    if (!alive) return;
    update({ messages: mergeMessages(state.messages, messages, conversationId) });
  };
  const requestRead = () => {
    if (!alive || !initialized || !isVisible()) return;
    if (reading) { readAgain = true; return; }
    if (readTimer) return;
    readTimer = setTimeout(async () => {
      readTimer = null;
      if (!alive || !isVisible()) return;
      reading = true;
      try { await markRead(); } catch { /* Read failure must not hide delivered messages. */ }
      finally {
        reading = false;
        if (readAgain) { readAgain = false; requestRead(); }
      }
    }, 100);
  };
  const load = async (page) => {
    const data = await fetchPage(page, MESSAGE_PAGE_SIZE, abort.signal);
    if (!data || !Array.isArray(data.content)) throw new Error("Invalid message history response");
    return data;
  };
  const runHistory = (kind) => {
    if (!alive) return Promise.resolve();
    if (historyFlight) {
      if (kind !== "older") recoverQueued = true;
      return historyFlight;
    }
    const initial = !initialized;
    update({ historyError: "", loading: initial, syncing: !initial && kind !== "older", loadingOlder: kind === "older" });
    historyFlight = (async () => {
      try {
        if (initial) {
          const data = await load(0);
          if (!alive) return;
          accept(data.content);
          anchor = mergeMessages([], data.content, conversationId).at(-1) || null;
          olderPage = 0;
          initialized = true;
          update({ hasOlder: !lastPage(data, 0, MESSAGE_PAGE_SIZE) });
        } else {
          const oldest = state.messages[0];
          const boundary = kind === "older" ? oldest : anchor;
          let nextAnchor = null;
          let page = kind === "older" ? Math.max(0, olderPage - 1) : 0;
          let complete = false;
          for (let count = 0; count < MAX_SCAN_PAGES && alive; count++, page++) {
            const data = await load(page);
            if (!alive) return;
            const incoming = mergeMessages([], data.content, conversationId);
            if (kind !== "older" && page === 0) nextAnchor = incoming.at(-1) || anchor;
            accept(incoming);
            const end = lastPage(data, page, MESSAGE_PAGE_SIZE);
            const reached = kind === "older"
              ? incoming.some(message => !boundary || compareMessages(message, boundary) < 0)
              : incoming.some(message => boundary && String(message.id) === String(boundary.id));
            if (reached || end) {
              if (kind === "older") {
                olderPage = page;
                update({ hasOlder: !end });
              } else {
                anchor = nextAnchor;
                if (end) update({ hasOlder: false });
                else if (!oldest) update({ hasOlder: true });
              }
              complete = true;
              break;
            }
          }
          if (alive && !complete) throw new Error("History is too large to synchronize in one pass. Reopen this conversation to load recent messages.");
        }
        if (alive) {
          const latest = state.messages.at(-1);
          if (latest) onMessage?.(latest);
          requestRead();
        }
      } catch (error) {
        if (alive) update({ historyError: error.response?.data?.message || error.message || "Unable to load messages" });
      } finally {
        historyFlight = null;
        if (alive) {
          update({ loading: false, syncing: false, loadingOlder: false });
          if (recoverQueued) { recoverQueued = false; void runHistory("recover"); }
        }
      }
    })();
    return historyFlight;
  };

  return {
    initialize: () => runHistory("initial"),
    recover: () => runHistory("recover"),
    loadOlder: () => state.hasOlder ? runHistory("older") : Promise.resolve(),
    requestRead,
    receive(message) {
      if (!alive || message?.id == null || String(message.conversationId) !== String(conversationId)) return;
      accept([message]);
      onMessage?.(message);
      requestRead();
    },
    async send(content) {
      if (!alive || sendFlight) throw new Error("A message is already being sent");
      sendFlight = true;
      update({ sendError: "" });
      try {
        // REST provides a persistence acknowledgement. WebSocket remains live delivery.
        const saved = await saveMessage(content);
        if (saved?.id == null || String(saved.conversationId) !== String(conversationId)) {
          throw new Error("The server did not confirm this message");
        }
        if (alive) { accept([saved]); onMessage?.(saved); }
        return saved;
      } catch (error) {
        const uncertain = "Send could not be confirmed. Your text was kept. Check recent messages before retrying.";
        update({ sendError: error.response ? apiErrorMessage(error, uncertain) : uncertain });
        throw error;
      } finally { sendFlight = false; }
    },
    dispose() {
      alive = false;
      abort.abort();
      clearTimeout(readTimer);
    },
  };
}
