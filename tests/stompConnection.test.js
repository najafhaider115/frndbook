import test from "node:test";
import assert from "node:assert/strict";
import { createStompConnection, tokenExpiringSoon } from "../src/services/stompConnection.js";

const jwt = exp => `x.${btoa(JSON.stringify({ exp }))}.x`;
function fixture(refresh) {
  let token = jwt(9999999999), config, handler;
  const events = new EventTarget(), errors = [], messages = [];
  let opened = 0, closed = 0, subscriptions = 0, unsubscribed = 0;
  const client = { active: false, connected: false, connectHeaders: {},
    activate() { this.active = true; },
    async deactivate() { this.active = false; this.connected = false; },
    forceDisconnect() { this.connected = false; config.onWebSocketClose(); },
    subscribe(destination, callback) { assert.equal(destination, "/topic/conversations/12"); subscriptions++; handler = callback; return { unsubscribe() { unsubscribed++; } }; },
  };
  const socket = createStompConnection({ createClient: c => { config = c; return client; },
    destination: "/topic/conversations/12", getToken: () => token,
    refreshToken: async () => { const value = await refresh?.(); if (value) token = value; return value; },
    authEvents: events, authClearedEvent: "logout", onMessage: m => messages.push(m),
    onError: e => errors.push(e), onConnect: () => opened++, onDisconnect: () => closed++,
  });
  return { socket, client, events, errors, messages, config,
    setToken: t => { token = t; }, emit: body => handler({ body }),
    connect: async () => { socket.connect(); await config.beforeConnect(); if (client.active) { client.connected = true; config.onConnect(); } },
    counts: () => ({ opened, closed, subscriptions, unsubscribed }) };
}

test("expiry threshold and malformed tokens leave validation to backend", () => {
  assert.equal(tokenExpiringSoon(jwt(130),100000),true);
  assert.equal(tokenExpiringSoon(jwt(131),100000),false);
  assert.equal(tokenExpiringSoon("invalid"),false);
});
test("connect and reconnect use current token and one subscription", async () => {
  const f=fixture(); await f.connect(); f.emit('{"id":1}');
  f.setToken(jwt(9999999998)); await f.config.beforeConnect(); f.config.onConnect();
  assert.equal(f.client.connectHeaders.Authorization,`Bearer ${jwt(9999999998)}`);
  assert.deepEqual(f.counts(),{opened:2,closed:0,subscriptions:2,unsubscribed:1});
  assert.deepEqual(f.messages,[{id:1}]); await f.socket.disconnect();
});
test("malformed frame reports safe error and later valid update works", async () => {
  const f=fixture(); await f.connect(); f.emit("secret invalid payload"); f.emit('{"id":2}');
  assert.equal(f.errors.length,1); assert.ok(!f.errors[0].message.includes("secret"));
  assert.deepEqual(f.messages,[{id:2}]); await f.socket.disconnect();
});
test("close callbacks are deduplicated", async () => {
  const f=fixture(); await f.connect(); f.config.onWebSocketClose(); f.config.onDisconnect();
  assert.equal(f.counts().closed,1); await f.socket.disconnect();
});
test("logout during refresh stops connection and ignores late frames", async () => {
  let resolve; const pending=new Promise(r=>{resolve=r;});
  const f=fixture(()=>pending); await f.connect(); f.setToken(jwt(1));
  const flight=f.config.beforeConnect(); f.events.dispatchEvent(new Event("logout"));
  resolve(jwt(9999999999)); await flight; f.emit('{"id":3}');
  assert.equal(f.client.active,false); assert.equal(f.socket.isConnected(),false);
  assert.deepEqual(f.messages,[]);
});
test("refresh rejection settles beforeConnect without unhandled rejection", async () => {
  const f=fixture(()=>Promise.reject(new Error("private"))); f.setToken(jwt(1));
  f.socket.connect(); await assert.doesNotReject(f.config.beforeConnect());
  assert.equal(f.client.active,false); assert.equal(f.errors.length,1);
});
test("auth error refreshes on reconnect once and repeated rejection stops", async () => {
  let refreshes=0; const f=fixture(()=>{refreshes++;return jwt(9999999999);});
  await f.connect(); f.config.onStompError({headers:{message:"Unauthorized"}});
  await f.config.beforeConnect(); assert.equal(refreshes,1);
  f.config.onStompError({headers:{message:"Unauthorized"}});
  assert.equal(f.client.active,false); assert.equal(f.errors.length,1);
});
test("disposal is final and suppresses stale callbacks", async () => {
  const f=fixture(); await f.connect(); await f.socket.disconnect();
  f.socket.connect(); f.config.onConnect(); f.emit('{"id":9}'); f.config.onWebSocketError();
  assert.equal(f.client.active,false); assert.equal(f.counts().opened,1);
  assert.deepEqual(f.messages,[]); assert.deepEqual(f.errors,[]);
});
