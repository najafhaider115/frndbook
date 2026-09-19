/** Shared lifecycle; each feature retains its own independently owned connection. */
export function createStompConnection({ createClient, getToken, refreshToken,
  authEvents, authClearedEvent, destination, onMessage, onConnect, onDisconnect,
  onError, publishDestination, brokerURL }) {
  let running = false;
  let disposed = false;
  let generation = 0;
  let subscription = null;
  let connected = false;
  let refreshRequired = false;
  let authenticationRetried = false;
  let listening = false;
  const report = (error) => { if (running) onError?.(error); };
  const notifyClosed = () => {
    subscription = null;
    if (connected) { connected = false; if (running) onDisconnect?.(); }
  };
  const stop = () => {
    running = false;
    generation++;
    connected = false;
    subscription = null;
    if (listening) authEvents.removeEventListener(authClearedEvent, stop);
    listening = false;
    return client.deactivate().catch(() => {});
  };
  const client = createClient({
    brokerURL, reconnectDelay: 5000, connectionTimeout: 10000,
    heartbeatIncoming: 10000, heartbeatOutgoing: 10000, debug: () => {},
    beforeConnect: async () => {
      const attempt = generation;
      try {
        let token = getToken();
        if (!running || !token) { await stop(); return; }
        if (refreshRequired || tokenExpiringSoon(token)) {
          refreshRequired = false;
          token = await refreshToken();
        }
        // Logout/disposal while refresh was pending must never reopen a socket.
        if (!running || attempt !== generation) return;
        if (!token || token !== getToken()) { await stop(); return; }
        client.connectHeaders = { Authorization: `Bearer ${token}` };
      } catch {
        // beforeConnect must settle normally: STOMP does not catch its rejection.
        report(new Error("Unable to authenticate live updates. Please sign in again."));
        await stop();
      }
    },
    onConnect: () => {
      if (!running) return;
      subscription?.unsubscribe();
      subscription = client.subscribe(destination, frame => {
        if (!running) return;
        try {
          const value = JSON.parse(frame.body);
          if (value && typeof value === "object" && !Array.isArray(value)) onMessage?.(value);
        } catch { report(new Error("Unable to read a live update.")); }
      });
      connected = true;
      authenticationRetried = false;
      onConnect?.();
    },
    onStompError: frame => {
      if (!running) return;
      const authError = /authentication|unauthorized|invalid access token/i.test(frame.headers?.message || "");
      if (authError && !authenticationRetried) {
        authenticationRetried = true;
        refreshRequired = true;
      } else {
        report(new Error(authError ? "Live authentication was rejected. Please sign in again." : "Live subscription was rejected."));
        void stop();
        onDisconnect?.();
        return;
      }
      // Reconnect runs beforeConnect and uses the latest token, even if ERROR stays open.
      notifyClosed();
      client.forceDisconnect();
    },
    onWebSocketError: () => report(new Error("Live connection is unavailable.")),
    onWebSocketClose: notifyClosed,
    onDisconnect: notifyClosed,
  });
  return {
    connect() {
      if (disposed || running) return;
      running = true;
      generation++;
      authEvents.addEventListener(authClearedEvent, stop);
      listening = true;
      client.activate();
    },
    disconnect() { disposed = true; return stop(); },
    isActive: () => running && client.active,
    isConnected: () => running && connected && client.connected,
    getClient: () => client,
    sendMessage(content) {
      if (!running || !connected || !client.connected || !publishDestination) throw new Error("Chat WebSocket is not connected");
      client.publish({ destination: publishDestination, body: JSON.stringify({ content }) });
    },
  };
}

export function tokenExpiringSoon(token, now = Date.now()) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp - Math.floor(now / 1000) <= 30;
  } catch { return false; } // Backend remains responsible for token validation.
}
