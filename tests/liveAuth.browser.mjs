import { createServer } from "../node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = "http://127.0.0.1:41816";
process.env.VITE_API_BASE_URL = origin;
process.env.VITE_WS_URL = origin.replace("http", "ws") + "/ws";
const server = await createServer({ root: fileURLToPath(new URL("..", import.meta.url)),
  server: { host: "127.0.0.1", port: 41816, strictPort: true } });
let browser;
try {
  await server.listen(); browser = await chromium.launch({channel:"msedge",headless:true});
  const page = await browser.newPage(), errors = [], destinations = [];
  page.on("pageerror", e => errors.push(e.message));
  let pendingRoute;
  await page.route("**/*", route => {
    const url=new URL(route.request().url());
    assert.equal(url.origin,origin,"External traffic is prohibited");
    if(url.pathname==="/fixture") return route.fulfill({contentType:"text/html",body:"<html><body>Local fixture</body></html>"});
    if(url.pathname==="/api/auth/refresh") { pendingRoute=route; return; }
    return route.continue();
  });
  await page.routeWebSocket("**/ws", socket => {
    socket.onMessage(frame => {
      const text=String(frame);
      if(/^(CONNECT|STOMP)/.test(text)) socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
      if(text.startsWith("SUBSCRIBE")) {
        const destination=text.match(/\ndestination:([^\n]+)/)[1],id=text.match(/\nid:([^\n]+)/)[1];
        destinations.push(destination);
        socket.send(`MESSAGE\nsubscription:${id}\nmessage-id:1\ndestination:${destination}\n\n{"id":1}\0`);
      }
      if(text.startsWith("DISCONNECT")) socket.close();
    });
  });
  await page.goto(origin+"/fixture");
  await page.evaluate(async () => {
    window.storage=(await import("/src/utils/tokenStorage.js")).tokenStorage;
    window.refresh=(await import("/src/api/axiosClient.js")).refreshAccessToken;
    window.storage.saveAuth("old-access","old-refresh",{id:1});
  });
  for(const scenario of ["logout","new-login-success","new-login-failure"]) {
    pendingRoute=null;
    await page.evaluate(() => { window.storage.saveAuth("old-access","old-refresh",{id:1}); window.result=window.refresh().then(()=>"success",()=>"rejected"); });
    for(let i=0;!pendingRoute&&i<200;i++) await new Promise(r=>setTimeout(r,10));
    assert.ok(pendingRoute);
    await page.evaluate(mode => mode==="logout" ? window.storage.clear() : window.storage.saveAuth("new-access","new-refresh",{id:2}),scenario);
    await pendingRoute.fulfill({status:scenario.endsWith("failure")?401:200,json:{accessToken:"stale-access",refreshToken:"stale-refresh"}});
    assert.equal(await page.evaluate(()=>window.result),"rejected");
    assert.equal(await page.evaluate(()=>window.storage.getAccessToken()),scenario==="logout"?null:"new-access");
  }
  await page.evaluate(async () => {
    const {createNotificationWebSocket}=await import("/src/services/webSocketService.js");
    const {createConversationUpdateWebSocket}=await import("/src/services/conversationUpdateWebSocketService.js");
    const {createChatWebSocket}=await import("/src/services/chatWebSocketService.js");
    window.received=[];
    window.sockets=[createNotificationWebSocket({onNotification:x=>window.received.push(x)}),
      createConversationUpdateWebSocket({onUpdate:x=>window.received.push(x)}),
      createChatWebSocket({conversationId:12,onMessage:x=>window.received.push(x)})];
    window.sockets.forEach(s=>s.connect());
  });
  await page.waitForFunction(()=>window.received.length===3);
  assert.deepEqual(destinations.sort(),["/topic/conversations/12","/user/queue/conversation-updates","/user/queue/notifications"].sort());
  await page.evaluate(()=>window.storage.clear());
  await page.waitForFunction(()=>window.sockets.every(s=>!s.isActive()));
  assert.deepEqual(errors,[]);
  console.log("PASS: stale refresh cannot restore logout or overwrite/clear newer login; all three adapters subscribe and deliver; logout stops all clients.");
} finally { await browser?.close(); await server.close(); }
