import test from "node:test";
import assert from "node:assert/strict";
import { applyConversationUpdate, mergeConversationLists } from "../src/utils/conversationUpdates.js";
import { subscribeConversationSidebar } from "../src/services/conversationSidebarSubscription.js";

const message = (id, conversationId, content = "hello") => ({
  id, conversationId, content, createdAt: "2026-09-13T10:00:00",
});
const row = (id, otherUser, lastMessage) => ({
  id, otherUser: { id: otherUser, name: "Friend " + otherUser },
  lastMessage, updatedAt: lastMessage?.createdAt,
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = () => new Promise((resolve) => setImmediate(resolve));

function setup(initial, overrides = {}) {
  let rows = initial;
  let callbacks;
  let connects = 0, disconnects = 0;
  const errors = [];
  const stop = subscribeConversationSidebar({
    createSocket: (handlers) => {
      callbacks = handlers;
      return { connect: () => connects++, disconnect: async () => { disconnects++; } };
    },
    loadList: async () => initial,
    loadConversation: async (id) => row(id, 3, null),
    hasConversation: (id) => rows.some((item) => String(item.id) === id),
    onUpdate: (update) => { rows = applyConversationUpdate(rows, update); },
    onRows: (incoming) => { rows = mergeConversationLists(rows, incoming); },
    onError: (error) => errors.push(error),
    ...overrides,
  });
  return { callbacks, stop, errors, rows: () => rows, counts: () => [connects, disconnects] };
}

test("u2 receives u3 sidebar update while its u1 conversation remains untouched", () => {
  const oldMessage = message(1, 12, "u1 chat");
  const app = setup([row(12, 1, oldMessage), row(23, 3, null)]);
  app.callbacks.onUpdate({ conversationId: 23, lastMessage: message(2, 23, "u3 message"),
    updatedAt: "2026-09-13T10:01:00" });
  assert.equal(app.rows()[0].id, 23);
  assert.equal(app.rows()[0].lastMessage.content, "u3 message");
  assert.equal(app.rows().find((item) => item.id === 12).lastMessage, oldMessage);
  assert.deepEqual(app.counts(), [1, 0]);
  app.stop();
});

test("same message arriving from chat and sidebar does not duplicate rows", () => {
  const app = setup([row(12, 1, null)]);
  const update = { conversationId: 12, lastMessage: message(3, 12) };
  app.callbacks.onUpdate(update);
  app.callbacks.onUpdate(update);
  assert.equal(app.rows().length, 1);
  assert.equal(app.rows()[0].lastMessage.id, 3);
  app.stop();
});

test("delayed old event and REST response cannot replace a newer preview", async () => {
  const request = deferred();
  const app = setup([row(12, 1, null)], { loadList: () => request.promise });
  app.callbacks.onConnect();
  app.callbacks.onUpdate({ conversationId: 12, lastMessage: message(20, 12, "new") });
  app.callbacks.onUpdate({ conversationId: 12, lastMessage: message(9, 12, "old") });
  request.resolve([row(12, 1, message(8, 12, "snapshot"))]);
  await flush();
  assert.equal(app.rows()[0].lastMessage.content, "new");
  app.stop();
});

test("unknown conversation loads friend metadata once and retains newest arriving event", async () => {
  const request = deferred();
  let calls = 0;
  const app = setup([], { loadConversation: () => { calls++; return request.promise; } });
  app.callbacks.onUpdate({ conversationId: 23, lastMessage: message(2, 23) });
  app.callbacks.onUpdate({ conversationId: 23, lastMessage: message(3, 23, "latest") });
  await flush();
  assert.equal(calls, 1);
  assert.equal(app.rows().length, 0);
  request.resolve(row(23, 3, message(1, 23)));
  await flush();
  assert.equal(app.rows()[0].otherUser.id, 3);
  assert.equal(app.rows()[0].lastMessage.content, "latest");
  app.stop();
});

test("reconnect fetches conversation history to catch missed sidebar updates", async () => {
  let calls = 0;
  const app = setup([row(12, 1, null)], {
    loadList: async () => { calls++; return [row(12, 1, message(calls, 12))]; },
  });
  app.callbacks.onConnect();
  await flush();
  app.callbacks.onConnect();
  await flush();
  assert.equal(calls, 2);
  assert.equal(app.rows()[0].lastMessage.id, 2);
  app.stop();
});

test("leaving page disconnects and ignores pending fetches and late events", async () => {
  const request = deferred();
  const app = setup([], { loadList: () => request.promise, loadConversation: () => request.promise });
  app.callbacks.onConnect();
  app.stop();
  request.resolve([row(12, 1, message(1, 12))]);
  app.callbacks.onUpdate({ conversationId: 23, lastMessage: message(2, 23) });
  await flush();
  assert.deepEqual(app.rows(), []);
  assert.deepEqual(app.counts(), [1, 1]);
});

test("malformed events are ignored and fetch failures are recoverable", async () => {
  let fail = true;
  const app = setup([], { loadConversation: async (id) => {
    if (fail) throw new Error("offline");
    return row(id, 3, null);
  } });
  app.callbacks.onUpdate({});
  app.callbacks.onUpdate(null);
  app.callbacks.onUpdate({ conversationId: 23, lastMessage: message(1, 23) });
  await flush();
  assert.equal(app.errors.length, 1);
  fail = false;
  app.callbacks.onUpdate({ conversationId: 23, lastMessage: message(2, 23) });
  await flush();
  assert.equal(app.rows()[0].lastMessage.id, 2);
  app.stop();
});
