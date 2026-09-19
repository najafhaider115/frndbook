// Isolated UI regression checks. HTTP and WebSocket traffic never reaches cloud services.
import { createServer } from "../node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const origin = "http://127.0.0.1:41814";
process.env.VITE_API_BASE_URL = origin;
process.env.VITE_WS_URL = origin.replace("http", "ws") + "/ws";
const server = await createServer({
  root: fileURLToPath(new URL("..", import.meta.url)),
  server: { host: "127.0.0.1", port: 41814, strictPort: true },
});
const account = { id: 1, name: "Review User", email: "review@example.invalid", bio: "Profile fixture", profileImage: null };
const friend = { ...account, id: 2, name: "Sample Friend With A Longer Name", bio: "A longer biography to check wrapping on smaller screens." };
const errors = [];
const blocked = [];
const requests = [];
let browser;
const screenshots = process.env.UI_SCREENSHOT_DIR;
const token = "test." + Buffer.from(JSON.stringify({ sub: account.email, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64") + ".test";

async function pageFor(width, authenticated = false) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on("pageerror", error => errors.push(error.message));
  if (authenticated) await page.addInitScript(({ account, token }) => {
    localStorage.setItem("frndbook_access_token", token);
    localStorage.setItem("frndbook_refresh_token", "fixture");
    localStorage.setItem("frndbook_user", JSON.stringify(account));
  }, { account, token });
  await page.route("**/*", route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) { blocked.push(url.origin); return route.abort(); }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (request.method() !== "GET") requests.push({ path: url.pathname, body: request.postDataJSON() });
    let body = [];
    if (url.pathname === "/api/auth/login") {
      return route.fulfill({ status: 401, json: { message: "Fixture login rejected" } });
    }
    if (url.pathname === "/api/users/me") body = account;
    else if (url.pathname === "/api/users/2") body = friend;
    else if (url.pathname === "/api/friends") body = [friend];
    else if (url.pathname.endsWith("/requests/received")) body = [{ id: 5, sender: friend }];
    else if (url.pathname.endsWith("/requests/sent")) body = [{ id: 6, receiver: friend }];
    else if (url.pathname.endsWith("unread-count")) body = 1;
    else if (url.pathname === "/api/notifications") body = {
      content: [{ id: 1, message: "Sample notification", type: "CHAT_MESSAGE", read: false }], totalPages: 2, number: 0,
    };
    else if (url.pathname === "/api/conversations") body = [{ id: 12, otherUser: friend, lastMessage: null }];
    else if (url.pathname.includes("/messages")) body = { content: [], last: true, totalElements: 0 };
    return route.fulfill({ json: body });
  });
  await page.routeWebSocket("**/*", socket => {
    if (!socket.url().startsWith(origin.replace("http", "ws"))) { socket.close(); return; }
    socket.onMessage(data => {
      if (/^(CONNECT|STOMP)/.test(String(data))) socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
    });
  });
  return page;
}

try {
  await server.listen();
  browser = await chromium.launch({ channel: "msedge", headless: true });
  if (screenshots) await mkdir(screenshots, { recursive: true });
  const publicPaths = ["/login", "/signup", "/forgot-password", "/reset-password?token=fixture", "/verify-email?email=review%40example.invalid"];
  const privatePaths = ["/", "/profile", "/users/2", "/friends", "/friend-requests", "/notifications", "/messages"];
  let screens = 0;
  for (const width of process.env.UI_INTERACTIONS_ONLY ? [] : [1280, 800, 390, 320]) {
    for (const path of [...publicPaths, ...privatePaths]) {
      const page = await pageFor(width, privatePaths.includes(path));
      await page.goto(origin + path);
      if (privatePaths.includes(path)) {
        await page.locator("nav").waitFor();
        assert.equal(await page.locator("nav").evaluate(el => getComputedStyle(el).display), "flex");
        assert.equal(await page.locator("nav").evaluate(el => getComputedStyle(el).position), "sticky");
      }
      if (path === "/messages") {
        await page.locator(".chat-header h2").waitFor({ state: "attached" });
        if (width <= 800) await page.locator(".conversation-item").first().click();
        await page.locator(".chat-header h2").waitFor();
      }
      if (path === "/friends") await page.locator(".friend-card").waitFor();
      await page.waitForTimeout(150);
      const badControls = await page.locator("input:not([hidden]), textarea").evaluateAll(elements => elements.filter(el =>
        !el.labels?.length && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby"),
      ).map(el => el.outerHTML));
      assert.deepEqual(badControls, [], `Unlabelled controls at ${width} ${path}`);
      const overflow = await page.locator("body").evaluate(body => [...body.querySelectorAll("main, .auth-card, nav, button, input, textarea")].filter(el => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (!rect.width || style.visibility === "hidden") return false;
        return rect.right > innerWidth + 1 || rect.left < -1;
      }).map(el => el.className));
      assert.deepEqual(overflow, [], `Horizontal overflow at ${width} ${path}`);
      if (screenshots && ["/login", "/profile", "/friends", "/messages", "/notifications"].includes(path)) {
        await page.screenshot({ path: `${screenshots}/${width}-${path.slice(1)}.png`, fullPage: true });
      }
      screens++;
      await page.close();
    }
  }

  // Labelled form controls still submit the original payload and expose server feedback.
  let page = await pageFor(390);
  await page.goto(origin + "/login");
  await page.getByLabel("Email", { exact: true }).fill("person@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Fixture login rejected" }).waitFor();
  assert.deepEqual(requests.find(r => r.path === "/api/auth/login").body, { email: "person@example.invalid", password: "password123" });
  if (screenshots) await page.screenshot({ path: `${screenshots}/login-error.png`, fullPage: true });
  await page.close();

  page = await pageFor(390);
  await page.goto(origin + "/verify-email?email=review%40example.invalid");
  assert.ok(await page.getByRole("button", { name: "Verify Email", exact: true }).isDisabled());
  const otp = page.getByLabel("Verification code", { exact: true });
  await otp.fill("12a");
  assert.equal(await otp.inputValue(), "12");
  await otp.fill("123456");
  assert.equal(await otp.inputValue(), "123456");
  assert.ok(await page.getByRole("button", { name: /Resend code in/ }).isDisabled());
  await page.getByRole("button", { name: "Verify Email", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Email verified successfully" }).waitFor();
  assert.deepEqual(requests.find(r => r.path === "/api/auth/verify-email").body, { email: "review@example.invalid", otp: "123456" });
  await page.close();

  // Disclosure navigation supports Escape, outside clicks, focus exit and active pages.
  page = await pageFor(390, true);
  await page.goto(origin + "/friends");
  const toggle = page.locator(".navbar-menu-toggle");
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  const menuId = await toggle.getAttribute("aria-controls");
  assert.ok(menuId);
  await page.locator(".navbar-mobile-menu a").first().focus();
  await page.keyboard.press("Escape");
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.ok(await toggle.evaluate(el => el === document.activeElement));
  await toggle.click();
  await page.mouse.click(380, 850);
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  await toggle.click();
  await page.locator(".friend-message-button").focus();
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  await toggle.click();
  const active = page.locator('.navbar-mobile-menu a[aria-current="page"]');
  await page.waitForFunction(() =>
    getComputedStyle(document.querySelector(".navbar-mobile-menu")).opacity === "1",
  );
  assert.equal(await active.innerText(), "Friends");
  if (screenshots) await page.screenshot({ path: `${screenshots}/mobile-menu.png`, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(100);
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await skip.focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.activeElement.id), "main-content");
  await page.close();

  assert.deepEqual(errors, [], "Unexpected browser JavaScript errors");
  assert.deepEqual(blocked, [], "Unexpected external network attempts");
  console.log(`PASS: ${screens ? `${screens} responsive screens, control labels and overflow checks; ` : "interaction-only run; "}login/OTP payloads; feedback roles; keyboard/mobile navigation; no external traffic.`);
} finally {
  await browser?.close();
  await server.close();
}
