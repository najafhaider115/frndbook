import { createServer } from "../node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin="http://127.0.0.1:41818";
process.env.VITE_API_BASE_URL=origin;process.env.VITE_WS_URL=origin.replace("http","ws")+"/ws";
const server=await createServer({root:fileURLToPath(new URL("..",import.meta.url)),server:{host:"127.0.0.1",port:41818,strictPort:true}});
const user={id:1,name:"Review",email:"review@example.invalid"},friend={id:2,name:"Friend"};
let browser,oldRoute,failPage=true;
const errors=[];
try {
  await server.listen();browser=await chromium.launch({channel:"msedge",headless:true});
  const page=await browser.newPage({viewport:{width:390,height:900}});
  page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(user=>{
    localStorage.setItem("frndbook_access_token","x."+btoa(JSON.stringify({exp:9999999999}))+".x");
    localStorage.setItem("frndbook_refresh_token","fixture");localStorage.setItem("frndbook_user",JSON.stringify(user));
  },user);
  await page.route("**/*",route=>{
    const url=new URL(route.request().url());assert.equal(url.origin,origin);
    if(!url.pathname.startsWith("/api/"))return route.continue();
    let body=[];
    if(url.pathname==="/api/users/me")body=user;
    else if(url.pathname==="/api/users/search") {
      const query=url.searchParams.get("name"),number=Number(url.searchParams.get("page"));
      if(query==="old"){oldRoute=route;return;}
      if(number===1&&failPage)return route.fulfill({status:503,json:{message:"Search temporarily unavailable"}});
      body={content:[{...friend,name:number===1?"Page two":"Latest result"}],number,totalPages:2};
    } else if(url.pathname.endsWith("unread-count"))body=1;
    else if(url.pathname==="/api/notifications")body={content:[{id:1,type:"NEW_MESSAGE",message:"Example message",createdAt:"invalid",read:false}],number:0,totalPages:1};
    else if(url.pathname==="/api/conversations")body=[{id:12,otherUser:friend,updatedAt:"2026-09-19T10:15:00"}];
    else if(url.pathname.endsWith("/messages"))body={content:[{id:1,conversationId:12,sender:friend,content:"Example chat",createdAt:"2026-09-19T10:15:00"}],last:true,totalPages:1};
    return route.fulfill({json:body});
  });
  await page.routeWebSocket("**/*",socket=>socket.onMessage(frame=>{
    if(/^(CONNECT|STOMP)/.test(String(frame)))socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
    if(String(frame).startsWith("DISCONNECT"))socket.close();
  }));
  await page.goto(origin+"/");assert.equal(await page.title(),"FrndBook");
  const search=page.getByRole("textbox",{name:"Search people by name"});
  await search.fill("old");await page.getByRole("status").filter({hasText:"Searching..."}).waitFor();
  assert.equal(await page.getByText("No users found.",{exact:true}).count(),0);
  for(let i=0;!oldRoute&&i<100;i++)await new Promise(r=>setTimeout(r,10));assert.ok(oldRoute);
  await search.fill("new");await page.getByText("Latest result",{exact:true}).waitFor();
  await oldRoute.fulfill({json:{content:[{...friend,name:"Obsolete result"}],number:0,totalPages:1}}).catch(()=>{});
  assert.equal(await page.getByText("Obsolete result",{exact:true}).count(),0);
  await page.getByRole("button",{name:"Next",exact:true}).click();
  await page.getByRole("button",{name:"Retry search"}).waitFor();
  failPage=false;await page.getByRole("button",{name:"Retry search"}).click();await page.getByText("Page two",{exact:true}).waitFor();
  await search.fill("");assert.equal(await page.getByText("Page two",{exact:true}).count(),0);
  assert.equal(await page.getByText("Searching...",{exact:true}).count(),0);
  await page.goto(origin+"/notifications");await page.getByText("New message",{exact:true}).waitFor();
  assert.equal(await page.getByText("NEW_MESSAGE",{exact:true}).count(),0);
  assert.equal(await page.getByText("Invalid Date",{exact:true}).count(),0);
  await page.goto(origin+"/messages");await page.locator(".conversation-item").first().click();
  await page.getByRole("textbox",{name:"Message",exact:true}).waitFor();
  // Simulate an overlay keyboard: visual viewport shrinks while layout viewport stays tall.
  await page.evaluate(()=>{
    Object.defineProperty(window.visualViewport,"height",{configurable:true,get:()=>400});
    window.visualViewport.dispatchEvent(new Event("resize"));
  });
  await page.waitForFunction(()=>{
    const composer=document.querySelector(".message-composer");
    return composer && composer.getBoundingClientRect().bottom<=401;
  });
  const bounds=await page.locator(".message-composer").boundingBox();assert.ok(bounds.y>=0&&bounds.y+bounds.height<=401);
  assert.equal(await page.getByRole("textbox",{name:"Message",exact:true}).evaluate(el=>getComputedStyle(el).fontSize),"16px");
  if(process.env.RELEASE_SCREENSHOT_DIR){await mkdir(process.env.RELEASE_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.RELEASE_SCREENSHOT_DIR+"/mobile-keyboard-layout.png",fullPage:true});}
  await page.evaluate(()=>{delete window.visualViewport.height;window.visualViewport.dispatchEvent(new Event("resize"));});
  await page.setViewportSize({width:1280,height:900});
  await page.waitForFunction(()=>!document.querySelector(".messages-page").style.getPropertyValue("--chat-available-height"));
  await page.getByRole("textbox",{name:"Message",exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log("PASS: title, pending search and stale-response isolation, failed-page retry, empty query cleanup, readable notifications, invalid dates, simulated keyboard viewport and desktop restoration.");
} finally {await browser?.close();await server.close();}
