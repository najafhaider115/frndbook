import { createServer } from "../node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = "http://127.0.0.1:41815";
process.env.VITE_API_BASE_URL = origin;
process.env.VITE_WS_URL = origin.replace("http", "ws") + "/ws";
const server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)),
  server: { host: "127.0.0.1", port: 41815, strictPort: true } });
const user = id => ({ id, name: `U${id}`, email: `u${id}@example.invalid` });
const message = (id, content, conversationId = 12) => ({ id, content, conversationId,
  sender: user(1), createdAt: "2026-09-14T10:00:00", read: false });
const rows = new Map([[12, Array.from({ length: 20 }, (_, i) => message(i + 1, `history-${i + 1}`))],
  [23, [message(101, "other-conversation", 23)]]]);
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
const initial = deferred(); let initialHeld = true;
let postGate = null, olderGate = null, rejectSend = false, echo = true;
let posts = 0, olderRequested = false;
const subscriptions = [], errors = [], external = [];
const until = async (condition) => {
  for (let i = 0; i < 400; i++) { if (condition()) return; await new Promise(resolve => setTimeout(resolve, 25)); }
  throw new Error("Timed out waiting for fixture event");
};
const deliver = row => {
  for (const sub of subscriptions.filter(s => !s.closed && s.destination === `/topic/conversations/${row.conversationId}`)) {
    sub.socket.send(`MESSAGE\nsubscription:${sub.id}\nmessage-id:${row.id}\ndestination:${sub.destination}\ncontent-type:application/json\n\n${JSON.stringify(row)}\0`);
  }
};
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(account => {
    const payload = btoa(JSON.stringify({ sub: account.email, exp: Math.floor(Date.now() / 1000) + 3600 }));
    localStorage.setItem("frndbook_access_token", `test.${payload}.test`);
    localStorage.setItem("frndbook_refresh_token", "fixture");
    localStorage.setItem("frndbook_user", JSON.stringify(account));
  }, user(2));
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { external.push(url.origin); return route.abort(); }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let body = [];
    if (url.pathname === "/api/users/me") body = user(2);
    else if (url.pathname === "/api/conversations") body = [
      { id: 12, otherUser: user(1), lastMessage: rows.get(12).at(-1) },
      { id: 23, otherUser: user(3), lastMessage: null },
    ];
    else if (url.pathname.endsWith("unread-count")) body = 0;
    const match = url.pathname.match(/^\/api\/conversations\/(\d+)\/messages$/);
    if (match) {
      const id = Number(match[1]);
      if (route.request().method() === "POST") {
        posts++;
        if (rejectSend) return route.fulfill({ status: 422, json: { message: "Fixture rejected" } });
        const row = message(Math.max(...rows.get(id).map(m => m.id)) + 1, route.request().postDataJSON().content, id);
        row.sender = user(2); rows.get(id).push(row); body = row;
        if (echo) deliver(row);
        if (postGate) await postGate.promise;
      } else {
        const number = Number(url.searchParams.get("page") || 0), size = Number(url.searchParams.get("size") || 10);
        const sorted = [...rows.get(id)].reverse();
        body = { content: sorted.slice(number * size, (number + 1) * size), number,
          totalPages: Math.ceil(sorted.length / size), last: (number + 1) * size >= sorted.length };
        if (initialHeld && id === 12 && number === 0) await initial.promise;
        if (olderGate && id === 12 && number > 0) { olderRequested = true; await olderGate.promise; }
      }
    }
    try { await route.fulfill({ json: body }); } catch { /* The app may abort a disposed history request. */ }
  });
  await page.routeWebSocket("**/*", socket => {
    socket.onMessage(data => {
      const frame = String(data);
      if (/^(CONNECT|STOMP)/.test(frame)) socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
      if (frame.startsWith("SUBSCRIBE")) subscriptions.push({ socket, closed: false,
        destination: frame.match(/\ndestination:([^\n]+)/)?.[1], id: frame.match(/\nid:([^\n]+)/)?.[1] });
      assert.ok(!frame.startsWith("SEND"), "UI sends must use acknowledged REST, not fire-and-forget STOMP");
    });
    socket.onClose(() => { subscriptions.filter(s => s.socket === socket).forEach(s => { s.closed = true; }); });
  });
  await page.goto(origin + "/messages");
  await until(() => subscriptions.some(s => s.destination === "/topic/conversations/12" && !s.closed));
  const live = message(21, "live-before-history"); rows.get(12).push(live); deliver(live);
  await page.locator(".message-bubble p").filter({ hasText: "live-before-history" }).waitFor();
  initialHeld = false; initial.resolve();
  await page.locator(".message-bubble p").filter({ hasText: "history-20" }).waitFor();
  assert.equal(await page.locator(".message-bubble p").filter({ hasText: "live-before-history" }).count(), 1);

  const composer = page.getByRole("textbox", { name: "Message", exact: true });
  postGate = deferred();
  await composer.fill("pending-send"); await page.getByRole("button", { name: "Send", exact: true }).click();
  await until(() => posts === 1);
  await composer.press("Enter"); assert.equal(posts, 1);
  assert.ok(await page.getByRole("button", { name: "Sending...", exact: true }).isDisabled());
  await composer.fill("next draft"); postGate.resolve(); postGate = null;
  await page.getByRole("button", { name: "Send", exact: true }).waitFor();
  assert.equal(await composer.inputValue(), "next draft");
  assert.equal(await page.locator(".message-bubble p").filter({ hasText: "pending-send" }).count(), 1);

  const liveSub = subscriptions.findLast(s => s.destination === "/topic/conversations/12" && !s.closed);
  liveSub.closed = true; liveSub.socket.close(); echo = false;
  await page.getByText("Live updates disconnected", { exact: true }).waitFor();
  await composer.fill("rest-without-socket"); await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.locator(".message-bubble p").filter({ hasText: "rest-without-socket" }).waitFor();
  rejectSend = true;
  await composer.fill("keep-on-failure"); await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Fixture rejected" }).waitFor();
  assert.equal(await composer.inputValue(), "keep-on-failure"); rejectSend = false;

  for (let i = 1; i <= 25; i++) rows.get(12).push(message(rows.get(12).at(-1).id + 1, `missed-${i}`));
  await until(() => subscriptions.some(s => s.destination === "/topic/conversations/12" && !s.closed));
  await page.locator(".message-bubble p").filter({ hasText: /^missed-1$/ }).waitFor();
  for (let i = 1; i <= 25; i++) assert.equal(await page.locator(".message-bubble p").filter({ hasText: new RegExp(`^missed-${i}$`) }).count(), 1);

  // IME Enter must not trigger submission.
  const previousPosts = posts;
  await composer.dispatchEvent("keydown", { key: "Enter", code: "Enter", isComposing: true });
  assert.equal(posts, previousPosts);
  olderGate = deferred();
  await page.getByRole("button", { name: /See older messages/ }).click();
  await until(() => olderRequested);
  await page.locator(".conversation-item").filter({ hasText: "U3" }).click();
  await page.locator(".chat-header h2").filter({ hasText: "U3" }).waitFor();
  assert.equal(await composer.inputValue(), "");
  olderGate.resolve(); olderGate = null;
  await page.locator(".message-bubble p").filter({ hasText: "other-conversation" }).waitFor();
  assert.equal(await page.locator(".message-bubble p").filter({ hasText: /history-|missed-/ }).count(), 0);
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  console.log("PASS: live/history race; acknowledged send and echo dedupe; repeated Enter; edits during send; REST without socket; retained failed draft; 25-message reconnect recovery; IME Enter; stale older request and draft isolation.");
} finally {
  await browser?.close(); await server.close();
}
