import test from "node:test";
import assert from "node:assert/strict";
import { createMessageSession } from "../src/services/messageSession.js";
import { mergeMessages } from "../src/utils/messageHistory.js";

const message = (id, extra = {}) => ({ id, conversationId: 12, content: `message ${id}`,
  createdAt: "2026-09-14T10:00:00", sender: { id: 2 }, read: false, ...extra });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const pageOf = (rows, page, size) => ({ content: [...rows].reverse().slice(page * size, (page + 1) * size),
  totalPages: Math.ceil(rows.length / size), last: (page + 1) * size >= rows.length });
function setup(overrides = {}) {
  let state;
  const updates = [], messages = [];
  const session = createMessageSession({ conversationId: 12,
    fetchPage: async () => ({ content: [], last: true }),
    saveMessage: async () => message(1), markRead: async () => {}, isVisible: () => false,
    onState: value => { state = value; updates.push(value); }, onMessage: value => messages.push(value), ...overrides });
  return { session, state: () => state, updates, messages };
}

test("merge filters other conversations, deduplicates numeric/string IDs, sorts ties and preserves read=true", () => {
  const rows = mergeMessages([message(10, { read: true })], [message("10"), message(2), message(8, { conversationId: 99 }), null], 12);
  assert.deepEqual(rows.map(m => m.id), [2, 10]);
  assert.equal(rows[1].read, true);
});

test("late initial history merges with an already received live message", async () => {
  const wait = deferred(); const app = setup({ fetchPage: () => wait.promise });
  const loading = app.session.initialize();
  app.session.receive(message(2)); wait.resolve({ content: [message(1)], last: true });
  await loading;
  assert.deepEqual(app.state().messages.map(m => m.id), [1, 2]); app.session.dispose();
});

test("REST acknowledgement updates messages/sidebar and its live echo is deduplicated", async () => {
  const wait = deferred(); const app = setup({ saveMessage: () => wait.promise });
  await app.session.initialize(); const send = app.session.send("hello");
  app.session.receive(message(5)); wait.resolve(message(5)); await send;
  assert.equal(app.state().messages.length, 1);
  assert.equal(app.messages.at(-1).id, 5); app.session.dispose();
});

test("a second send is rejected while the first is pending", async () => {
  const wait = deferred(); let calls = 0;
  const app = setup({ saveMessage: () => { calls++; return wait.promise; } });
  const first = app.session.send("a"); await assert.rejects(app.session.send("a"));
  wait.resolve(message(1)); await first; assert.equal(calls, 1); app.session.dispose();
});

test("failed send does not fabricate a delivered message and allows explicit retry", async () => {
  let fail = true;
  const app = setup({ saveMessage: async () => { if (fail) throw new Error("offline"); return message(1); } });
  await app.session.initialize(); await assert.rejects(app.session.send("a"));
  assert.equal(app.state().messages.length, 0); assert.match(app.state().sendError, /Check recent messages/);
  fail = false; await app.session.send("a"); assert.equal(app.state().messages.length, 1); app.session.dispose();
});

test("reconnect scans several pages to the last synchronized anchor, not a newer live arrival", async () => {
  let rows = [message(1)]; const pages = [];
  const app = setup({ fetchPage: async (page, size) => { pages.push(page); return pageOf(rows, page, size); } });
  await app.session.initialize(); rows = Array.from({ length: 36 }, (_, i) => message(i + 1));
  app.session.receive(message(36)); await app.session.recover();
  assert.equal(app.state().messages.length, 36); assert.deepEqual(pages, [0, 0, 1, 2, 3]); app.session.dispose();
});

test("older history tolerates page offsets shifted by a burst of new messages", async () => {
  let rows = Array.from({ length: 30 }, (_, i) => message(i + 1));
  const app = setup({ fetchPage: async (page, size) => pageOf(rows, page, size) });
  await app.session.initialize(); rows = Array.from({ length: 55 }, (_, i) => message(i + 1));
  await app.session.loadOlder();
  assert.ok(app.state().messages.some(m => m.id === 20));
  while (app.state().hasOlder) await app.session.loadOlder();
  assert.deepEqual(app.state().messages.map(m => m.id), rows.map(m => m.id)); app.session.dispose();
});

test("disposed session ignores late history/send responses and aborts history", async () => {
  const history = deferred(), send = deferred(); let signal;
  const app = setup({ fetchPage: (_page, _size, value) => { signal = value; return history.promise; }, saveMessage: () => send.promise });
  const pending = app.session.initialize(), saving = app.session.send("a");
  const updates = app.updates.length; app.session.dispose();
  history.resolve({ content: [message(1)], last: true }); send.resolve(message(2));
  await Promise.all([pending, saving]); assert.equal(signal.aborted, true);
  assert.equal(app.updates.length, updates); assert.equal(app.messages.length, 0);
});

test("history error remains separate from a successful send and can be retried", async () => {
  let fail = true;
  const app = setup({ fetchPage: async () => { if (fail) throw new Error("history unavailable"); return { content: [message(1)], last: true }; } });
  await app.session.initialize(); await app.session.send("a");
  assert.equal(app.state().historyError, "history unavailable");
  fail = false; await app.session.recover(); assert.equal(app.state().historyError, ""); app.session.dispose();
});

test("read marking waits for history, is visibility-gated and batches arrivals", async () => {
  let visible = false, reads = 0;
  const app = setup({ isVisible: () => visible, markRead: async () => { reads++; } });
  await app.session.initialize(); app.session.receive(message(1));
  await new Promise(resolve => setTimeout(resolve, 120)); assert.equal(reads, 0);
  visible = true; app.session.requestRead(); app.session.receive(message(2)); app.session.receive(message(3));
  await new Promise(resolve => setTimeout(resolve, 120)); assert.equal(reads, 1); app.session.dispose();
});
