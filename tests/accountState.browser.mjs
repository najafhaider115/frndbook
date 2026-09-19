import { createServer } from "../node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin="http://127.0.0.1:41817";
process.env.VITE_API_BASE_URL=origin;process.env.VITE_WS_URL=origin.replace("http","ws")+"/ws";
const server=await createServer({root:fileURLToPath(new URL("..",import.meta.url)),server:{host:"127.0.0.1",port:41817,strictPort:true}});
const errors=[];
let account={id:1,name:"Original",email:"person@example.invalid",bio:"Saved bio",profileImage:null};
let unavailable=false,rejectProfile=false,imageFailure=false,holdProfile=false,heldRoute;
let expired=false,refreshStatus=503;
let browser;
try {
  await server.listen();browser=await chromium.launch({channel:"msedge",headless:true});
  const context=await browser.newContext();
  await context.route("**/*",route=>{
    const url=new URL(route.request().url());assert.equal(url.origin,origin);
    if(!url.pathname.startsWith("/api/"))return route.continue();
    if(url.pathname==="/api/users/me") {
      if(route.request().method()==="PATCH") {
        if(holdProfile){heldRoute=route;return;}
        if(rejectProfile)return route.fulfill({status:400,json:{message:"Validation failed",fieldErrors:{name:"Name rejected"}}});
        account={...account,...route.request().postDataJSON()};
      } else if(expired)return route.fulfill({status:401,json:{message:"Expired"}});
      else if(unavailable)return route.fulfill({status:503,json:{message:"Temporary outage"}});
      return route.fulfill({json:account});
    }
    if(url.pathname.endsWith("profile-image")) {
      if(imageFailure)return route.fulfill({status:400,json:{message:"Image rejected"}});
      account={...account,profileImage:origin+"/fixture-avatar.png"};return route.fulfill({json:account});
    }
    if(url.pathname==="/api/auth/signup")return route.fulfill({status:400,json:{message:"Validation failed",fieldErrors:{email:"Email rejected",password:"Password rejected"}}});
    if(url.pathname==="/api/auth/refresh")return route.fulfill({status:refreshStatus,json:{message:"Refresh unavailable"}});
    if(url.pathname.endsWith("unread-count"))return route.fulfill({json:0});
    return route.fulfill({json:[]});
  });
  await context.routeWebSocket("**/*",socket=>socket.onMessage(frame=>{
    if(/^(CONNECT|STOMP)/.test(String(frame)))socket.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
    if(String(frame).startsWith("DISCONNECT"))socket.close();
  }));
  const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
  await page.goto(origin+"/login");
  await page.evaluate(async account=>{
    const {tokenStorage}=await import("/src/utils/tokenStorage.js");
    tokenStorage.saveAuth("test."+btoa(JSON.stringify({exp:9999999999}))+".test","refresh",account);
  },account);
  await page.goto(origin+"/profile");
  await page.getByLabel("Name",{exact:true}).fill("Updated");
  await page.getByRole("button",{name:"Save Changes",exact:true}).click();
  await page.getByText("Profile updated successfully.",{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("frndbook_user")).name),"Updated");
  await page.getByRole("link",{name:"Home",exact:true}).click();
  await page.getByText("Hello, Updated",{exact:true}).waitFor();
  const second=await context.newPage();second.on("pageerror",e=>errors.push(e.message));
  await second.goto(origin+"/");await second.getByText("Hello, Updated",{exact:true}).waitFor();
  await page.goto(origin+"/profile");await page.getByLabel("Name",{exact:true}).fill("Across tabs");
  await page.getByRole("button",{name:"Save Changes",exact:true}).click();
  await second.getByText("Hello, Across tabs",{exact:true}).waitFor();
  rejectProfile=true;await page.getByLabel("Name",{exact:true}).fill("Invalid name");
  await page.getByRole("button",{name:"Save Changes",exact:true}).click();
  await page.locator('input[aria-invalid="true"]').waitFor();
  assert.equal(await page.getByLabel("Name",{exact:true}).inputValue(),"Invalid name");
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("frndbook_user")).name),"Across tabs");
  rejectProfile=false;
  // Failed image upload retains the saved avatar and unsaved text draft.
  imageFailure=true;
  await page.locator('input[type="file"]').setInputFiles({name:"fixture.png",mimeType:"image/png",buffer:Buffer.from("fixture")});
  await page.getByRole("alert").filter({hasText:"Image rejected"}).waitFor();
  assert.equal(await page.getByLabel("Name",{exact:true}).inputValue(),"Invalid name");
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("frndbook_user")).profileImage),null);
  // Successful image response updates shared state without replacing a text draft.
  imageFailure=false;
  await page.locator('input[type="file"]').setInputFiles({name:"fixture.png",mimeType:"image/png",buffer:Buffer.from("fixture")});
  await page.getByText("Profile image updated successfully.",{exact:true}).waitFor();
  assert.equal(await page.getByLabel("Name",{exact:true}).inputValue(),"Invalid name");
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("frndbook_user")).profileImage),origin+"/fixture-avatar.png");
  // Clear credentials while a profile save is pending; late success cannot restore it.
  holdProfile=true;await page.getByRole("button",{name:"Save Changes",exact:true}).click();
  for(let i=0;!heldRoute&&i<200;i++)await new Promise(r=>setTimeout(r,10));assert.ok(heldRoute);
  await second.evaluate(async()=>{(await import("/src/utils/tokenStorage.js")).tokenStorage.clear();});
  await page.waitForURL("**/login");await second.waitForURL("**/login");
  await heldRoute.fulfill({json:{...account,name:"Stale saved result"}});holdProfile=false;
  assert.equal(await page.evaluate(()=>localStorage.getItem("frndbook_user")),null);
  // Actual signup fields display backend errors with accessible field associations.
  await page.goto(origin+"/signup");await page.getByLabel("Name",{exact:true}).fill("Name");
  await page.getByLabel("Email",{exact:true}).fill("person@example.invalid");await page.getByLabel("Password",{exact:true}).fill("password123");
  await page.getByRole("button",{name:"Create Account",exact:true}).click();
  await page.getByLabel("Email",{exact:true}).locator('xpath=..').getByText("Email rejected",{exact:true}).waitFor();
  assert.equal(await page.getByLabel("Password",{exact:true}).getAttribute("aria-invalid"),"true");
  // Startup outage: keep credentials, expose retry, recover using the same session.
  await page.evaluate(async account=>{(await import("/src/utils/tokenStorage.js")).tokenStorage.saveAuth("token","refresh",account);},account);
  unavailable=true;await page.goto(origin+"/");await page.getByRole("button",{name:"Retry session check"}).waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem("frndbook_access_token")),"token");
  unavailable=false;await page.getByRole("button",{name:"Retry session check"}).click();await page.getByText("Hello, Across tabs",{exact:true}).waitFor();
  expired=true;await page.goto(origin+"/");await page.getByRole("button",{name:"Retry session check"}).waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem("frndbook_access_token")),"token");
  expired=false;await page.getByRole("button",{name:"Retry session check"}).click();await page.getByText("Hello, Across tabs",{exact:true}).waitFor();
  refreshStatus=401;expired=true;await page.goto(origin+"/");await page.waitForURL("**/login");
  assert.equal(await page.evaluate(()=>localStorage.getItem("frndbook_access_token")),null);
  assert.deepEqual(errors,[]);
  console.log("PASS: shared profile/home/storage, cross-tab profile and logout, failed/successful images preserve drafts, inline validation, stale save after logout, transient startup/refresh retry, rejected refresh clears auth.");
} finally {await browser?.close();await server.close();}
