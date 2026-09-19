# fbfrontend - Phase 8.4: Plan and testing

## Implementation

Implemented locally on top of Phase 8.3: 8 files, 4 updated and 4 added. Backend and FrndBookWC2 unchanged. No deployment, migration or new dependency.

This phase consolidates the repeated WebSocket lifecycle code. Each feature retains its own physical connection so chat, sidebar and notifications still have independent lifetimes. This is code consolidation, not a single multiplexed socket.

## Before and after

| Area | Before | Now |
| --- | --- | --- |
| Common logic | Three copies of token/reconnect/subscription code | One lifecycle implementation with three small adapters |
| Connect failure | beforeConnect could reject without library handling | Failure settles, reports safe feedback and stops the client |
| Logout during refresh | Late refresh could save tokens after logout | Refresh result must still match the stored refresh token; pending socket checks its lifetime |
| New login during old refresh | Old success/failure could overwrite/clear new credentials | Stale success rejected and stale failure does not clear new credentials |
| Broker authentication ERROR | Refresh/reconnect ownership spread across services | One retry using latest credentials, then stop on repeated rejection before successful CONNECT |
| Broker authorization ERROR | Could repeatedly retry rejected subscription | Stop and report a generic rejection; reopening creates a fresh instance |
| Disconnect callbacks | Transport and STOMP close could both notify | Notify once for a connected lifetime |
| Handshake | Could wait indefinitely | 10-second connection timeout; existing 5-second reconnect and 10-second heartbeats retained |
| Logging | Raw transport/authentication errors logged repeatedly | Safe generic callback errors without frame/token bodies |

## Files

| File | Change | Purpose |
| --- | --- | --- |
| `src/api/axiosClient.js` | updated | Reject stale refresh results and protect a newer login from an earlier refresh failure. |
| `src/services/authenticatedWebSocket.js` | added | Bind the shared lifecycle to STOMP, existing token storage and shared Axios refresh. |
| `src/services/chatWebSocketService.js` | updated | Small compatibility adapter retaining the feature destination and callback names. |
| `src/services/conversationUpdateWebSocketService.js` | updated | Small compatibility adapter retaining the feature destination and callback names. |
| `src/services/stompConnection.js` | added | Shared, injectable STOMP authentication, subscription, reconnect and disposal lifecycle. |
| `src/services/webSocketService.js` | updated | Small compatibility adapter retaining the feature destination and callback names. |
| `tests/liveAuth.browser.mjs` | added | Regression coverage for lifecycle races, adapters and authentication changes. |
| `tests/stompConnection.test.js` | added | Regression coverage for lifecycle races, adapters and authentication changes. |

## Compatibility and decisions

Destinations are unchanged: /topic/conversations/:id, /user/queue/conversation-updates and /user/queue/notifications. The existing optional /app/chat/:id publish API is retained for compatibility; Phase 8.3 UI sends still use REST acknowledgement.

The factories retain their callback names and public methods. disconnect() is final for that instance; current callers create a fresh instance when mounting again. Backend JWT verification and subscription authorization remain authoritative. Client JWT decoding only decides whether to refresh within the existing 30-second buffer.

The existing shared refresh promise is retained. The small Axios guard additionally protects other consumers of that same refresh mechanism. It compares refresh-token identity; it does not redesign cross-tab refresh coordination, introduce per-device sessions or change the backend logout policy. Existing refresh-failure policy still clears the matching current session. Network-only refresh failures are not given a new retry policy in this phase.

## Validation

- 25 Node tests passed: 8 new lifecycle tests plus 17 existing message/sidebar tests.
- Existing chat browser test passed, including 25-message reconnect recovery and REST-only sending.
- Existing sidebar browser test passed, including inactive-conversation updates and selection retention.
- New live-auth browser test passed: stale refresh after logout; stale success and failure after a newer login; all three adapter destinations and message callbacks; logout stops all clients.
- Vite production build passed: 139 modules. JavaScript 362.76 kB, gzip 114.09 kB (Phase 8.3: 366.91 / 114.84). CSS unchanged at 24.85 kB, gzip 5.62 kB.
- Lint: no errors; the same 13 existing warnings. Whitespace check passed apart from Git's existing line-ending normalization notices.

Tests use local mocked HTTP/STOMP responses, not live accounts. No cloud data, email or messages were changed. Prior responsive tests and backend evidence were reused instead of repeating unrelated suites. Actual Render network behaviour remains a manual deployment acceptance check.

## Commands

```sh
npm run build
npm run lint
node --test tests/stompConnection.test.js tests/messageSession.test.js tests/conversationSidebar.test.js
node tests/liveAuth.browser.mjs
node tests/chat.browser.mjs
node tests/sidebar.browser.mjs
```

Browser checks require Edge and Playwright. PLAYWRIGHT_MODULE may point to an externally supplied Playwright module; package.json is unchanged.

## Manual acceptance

1. Log in locally with the updated backend; confirm notifications, sidebar updates and open chat messages all arrive.
2. Switch conversations and navigate away/back. Check that updates do not duplicate and subscriptions stop with their feature.
3. Disconnect/reconnect the network; confirm connection feedback, chat recovery and sidebar recovery continue working.
4. Leave the page until the token needs refresh, then reconnect. Verify authentication succeeds without repeated refresh requests or console promise errors.
5. Logout during a delayed refresh. Confirm old live clients stop and tokens are not restored. Login again and verify a fresh connection works.
6. If the backend rejects an unauthorized subscription, verify it stops rather than repeatedly connecting. This frontend change grants no additional access.

## Review and rollback

The companion Markdown and PDF contain all current changed files and exact + / - diffs against the completed local Phase 8.3 snapshot. The project is already modified; the files are for review or copying. Roll back all four updated files and remove all four additions together to that snapshot, retaining previous phases. No backend or environment-variable changes are required.
