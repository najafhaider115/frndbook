import { createServer } from "../node_modules/vite/dist/node/index.js";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
import assert from "node:assert/strict";

process.env.VITE_API_BASE_URL = "http://127.0.0.1:41793";
process.env.VITE_WS_URL = "ws://127.0.0.1:41793/ws";
const origin = process.env.VITE_API_BASE_URL;
const server = await createServer({ server: { host: "127.0.0.1", port: 41793, strictPort: true } });
let browser;
const user = (id) => ({ id, name: "U" + id, email: "u" + id + "@example.invalid", profileImage: null });
const rows = [
  { id: 12, otherUser: user(1), updatedAt: "2026-09-13T10:00:00", lastMessage: null },
  { id: 23, otherUser: user(3), updatedAt: "2026-09-13T09:00:00", lastMessage: null },
];
const subscriptions = [];
let navigationCount = 0;
try {
  await server.listen();
  browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("request", (request) => { if (request.resourceType() === "document") navigationCount++; });
  await page.addInitScript((account) => {
    const payload = btoa(JSON.stringify({ sub: account.email, exp: Math.floor(Date.now() / 1000) + 3600 }));
    localStorage.setItem("frndbook_access_token", "test." + payload + ".test");
    localStorage.setItem("frndbook_refresh_token", "test-only");
    localStorage.setItem("frndbook_user", JSON.stringify(account));
  }, user(2));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) {
      let body = [];
      if (url.pathname === "/api/users/me") body = user(2);
      else if (url.pathname === "/api/conversations") body = rows;
      else if (/\/api\/conversations\/\d+$/.test(url.pathname)) body = rows.find((row) => row.id === Number(url.pathname.split("/").at(-1)));
      else if (url.pathname.endsWith("/unread-count")) body = 0;
      else if (url.pathname.endsWith("/messages")) body = { content: [], last: true, totalElements: 0 };
      else if (url.pathname.startsWith("/api/notifications")) body = { content: [], last: true };
      return route.fulfill({ json: body });
    }
    if (url.origin === origin) return route.continue();
    return route.abort(); // No network access to cloud services is allowed in this test.
  });
  await page.routeWebSocket("**/*", (socket) => {
    if (!socket.url().includes("/ws")) { socket.close(); return; }
    socket.onMessage((data) => {
      const frame = typeof data === "string" ? data : data.toString();
      if (frame.startsWith("CONNECT") || frame.startsWith("STOMP")) {
        socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
      } else if (frame.startsWith("SUBSCRIBE")) {
        const destination = frame.match(/\ndestination:([^\n]+)/)?.[1];
        const id = frame.match(/\nid:([^\n]+)/)?.[1];
        subscriptions.push({ socket, destination, id });
      }
    });
  });
  await page.goto(origin + "/messages");
  await page.locator(".chat-header h2").filter({ hasText: "U1" }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".conversation-item").length === 2);
  for (let attempt = 0; attempt < 100 && !subscriptions.some((s) => s.destination === "/user/queue/conversation-updates"); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const sidebar = subscriptions.findLast((s) => s.destination === "/user/queue/conversation-updates");
  assert.ok(sidebar, "Messages page must establish the sidebar STOMP subscription");
  const deliver = (conversationId, sender, content, id) => {
    const lastMessage = { id, conversationId, sender: user(sender), content, createdAt: "2026-09-13T12:00:00", read: false };
    const update = { conversationId, lastMessage, updatedAt: lastMessage.createdAt };
    const target = rows.find((row) => row.id === conversationId);
    Object.assign(target, update);
    const body = JSON.stringify(update);
    sidebar.socket.send("MESSAGE\nsubscription:" + sidebar.id + "\nmessage-id:" + id + "\ndestination:" + sidebar.destination + "\ncontent-type:application/json\n\n" + body + "\0");
  };
  deliver(23, 3, "U3 to U2 while U1 chat stays open", 100);
  await page.locator(".conversation-item").first().filter({ hasText: "U3 to U2 while U1 chat stays open" }).waitFor();
  assert.equal(await page.locator(".chat-header h2").innerText(), "U1");
  assert.equal(await page.locator(".conversation-item-active strong").innerText(), "U1");
  deliver(23, 3, "U3 to U2 while U1 chat stays open", 100);
  assert.equal(await page.locator(".conversation-item").count(), 2);
  rows.push({ id: 24, otherUser: user(4), lastMessage: null, updatedAt: null });
  deliver(24, 4, "First message from a new conversation", 101);
  await page.locator(".conversation-item").filter({ hasText: "First message from a new conversation" }).waitFor();
  assert.equal(await page.locator(".chat-header h2").innerText(), "U1");
  assert.equal(await page.locator(".conversation-item").count(), 3);
  assert.equal(navigationCount, 1, "No page refresh should be needed");
  console.log("PASS: actual Messages page receives sidebar STOMP updates, reorders inactive chat, keeps U1 selected, deduplicates, and adds an unknown conversation without refresh.");
} finally {
  if (browser) await browser.close();
  await server.close();
}


