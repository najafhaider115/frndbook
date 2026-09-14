import { mergeConversation } from "../utils/conversationUpdates.js";

// Dependencies are passed in so the lifecycle can be tested without a browser or cloud accounts.
export const subscribeConversationSidebar = ({
  createSocket, loadList, loadConversation, hasConversation, onUpdate, onRows, onError,
}) => {
  let stopped = false;
  let refreshVersion = 0;
  const pending = new Set();
  const latest = new Map();

  const refresh = async () => {
    const version = ++refreshVersion;
    try {
      const rows = await loadList();
      if (!stopped && version === refreshVersion) onRows(rows || []);
    } catch (error) {
      if (!stopped && version === refreshVersion) onError(error);
    }
  };

  const receive = (update) => {
    if (stopped || update?.conversationId == null || !update.lastMessage) return;
    const id = String(update.conversationId);
    const row = { id: update.conversationId, lastMessage: update.lastMessage,
      updatedAt: update.updatedAt || update.lastMessage.createdAt };
    latest.set(id, mergeConversation(latest.get(id), row));
    onUpdate(update);

    if (hasConversation(id) || pending.has(id)) return;
    pending.add(id);
    Promise.resolve().then(() => loadConversation(update.conversationId)).then((conversation) => {
      if (!stopped && conversation) {
        onRows([mergeConversation(conversation, latest.get(id))]);
      }
    }).catch((error) => {
      if (!stopped) onError(error);
    }).finally(() => pending.delete(id));
  };

  const socket = createSocket({
    onUpdate: receive,
    onConnect: () => { if (!stopped) void refresh(); },
    onError: (error) => { if (!stopped) onError(error); },
  });
  socket.connect();
  return () => {
    stopped = true;
    latest.clear();
    Promise.resolve(socket.disconnect()).catch(() => {});
  };
};
