# fbfrontend - Phase 8.3: Plan, implementation and testing

## Outcome and scope

Implemented locally in fbfrontend on top of the completed Phase 8.2 snapshot: 9 files (5 updated, 4 added). Full contents and exact unified diffs are in the companion Markdown and PDF. Backend, FrndBookWC2, dependencies and deployment configuration were not changed. Nothing was pushed or deployed.

## Before and after

| Area | Before | Implemented |
| --- | --- | --- |
| Sending | Fire-and-forget STOMP send when connected; REST fallback | REST response confirms the save for every UI send; WebSocket delivers live events |
| History and live events | Late history could replace newer events | Merge by message ID, filter conversation, preserve read state and sort deterministically |
| Duplicate delivery | REST acknowledgement and live echo could overlap | One message row per server ID |
| Reconnection | Recent history alone could miss a larger gap | Scan pages until the last successfully synchronized history anchor or server end |
| Older messages | New arrivals shift offset pages | Overlap and scan pages until older messages are found; preserve scroll position |
| Composer | Repeated sends and asynchronous clearing could lose text | Pending-send guard, unchanged-draft-only clearing, failed draft retained, IME-safe Enter |
| Conversation changes | Late requests and drafts could outlive selection | Account/conversation keyed lifetime; abort history and ignore disposed callbacks |
| Feedback | History and send errors could overwrite each other | Separate errors, history retry action and disconnected-live status |
| Read requests | Repeated arrivals could trigger redundant calls | Debounced/coalesced, after initial history and only when chat is visible |

## Changed files

| File | Change | Purpose |
| --- | --- | --- |
| `src/api/messageApi.js` | updated | Forward optional AbortSignal for disposed history requests; existing endpoints and payloads retained. |
| `src/components/chat/ChatWindow.jsx` | updated | Wire session and live updates, recover after reconnect/focus, separate send/history feedback and isolate conversation lifetimes. |
| `src/components/chat/MessageComposer.jsx` | updated | Guard repeated sends, retain failed or edited drafts and avoid IME Enter submission. |
| `src/components/chat/MessageList.jsx` | updated | Preserve older-history scroll position and distinguish failed history from an empty conversation. |
| `src/services/messageSession.js` | added | Own asynchronous history, recovery, acknowledged sends and visibility-gated read requests for one conversation lifetime. |
| `src/styles/chat.module.css` | updated | Add compact spacing for history retry feedback. |
| `src/utils/messageHistory.js` | added | Merge by message ID, preserve read state, filter conversations and sort deterministic timestamp ties. |
| `tests/chat.browser.mjs` | added | Mocked browser regression for actual chat behaviour, disconnect recovery and draft isolation. |
| `tests/messageSession.test.js` | added | Ten isolated unit tests for merging, asynchronous races, pagination, sends and read marking. |

## Backend compatibility

The current local backend MessageController and MessageService already save REST messages and publish after-commit chat/sidebar events. No endpoint or request-body changes are needed. GET /api/conversations/:id/messages still uses page/size, POST uses content, and read marking retains its existing endpoint. The backend repository orders history by createdAt DESC, id DESC; the client merges oldest-first for display.

The existing STOMP service remains in place for subscriptions. Its send method is no longer used by ChatWindow. This is an intentional transport choice: HTTP acknowledgement makes successful persistence visible to the composer. It is not a fallback that sends the same message through both transports.

The user's cloud deployment was previously identified as pre-Phase-1 code. These checks concern the current local frontend/backend contract, not proof that the old cloud backend broadcasts REST saves. Coordinate deployment with the updated backend before relying on that behaviour in production.

## Validation completed

- Production Vite build passed: 137 modules; CSS 24.85 kB (gzip 5.62); JavaScript 366.91 kB (gzip 114.84). The old mixed static/dynamic messageApi import warning is removed.
- All 17 Node tests passed: 10 new message-session tests and 7 existing sidebar tests.
- New actual-chat browser test passed: live-before-history race, REST echo deduplication, repeated Enter, editing during pending send, sending without socket, retained failed draft, recovery of 25 missed messages, IME Enter and stale older-request isolation after switching conversation.
- Existing sidebar browser regression passed: inactive conversation update/reordering, selection retention, deduplication and new conversation hydration.
- Lint has no errors and the same 13 existing warnings. Whitespace check passed; Git reports existing LF/CRLF normalization notices.
- Browser HTTP/STOMP responses were mocked locally. No cloud messages, emails or data mutations were performed. Earlier Phase 8.2 responsive evidence was reused; the full backend suite and 48-screen sweep were not repeated.

## Tests to run

```sh
npm run build
npm run lint
node --test tests/messageSession.test.js tests/conversationSidebar.test.js
node tests/chat.browser.mjs
node tests/sidebar.browser.mjs
```

Browser scripts need installed Microsoft Edge and Playwright. PLAYWRIGHT_MODULE can point to an external Playwright index.mjs; no new project dependency was added.

## Manual acceptance checklist

1. With the updated backend running, use two accounts. Send from the open chat and confirm one message appears for sender and receiver, with the sidebar updated.
2. Disconnect WebSocket while HTTP remains available. Send and confirm the message appears after acknowledgement. Reconnect and confirm no duplicate.
3. Disconnect a receiver, send more than 20 messages from the other account, reconnect and check all missed messages are present in order.
4. Delay or fail a send. Try Enter repeatedly, then type a new draft before the response. Confirm one pending send and no erasure of your new draft.
5. Load older messages while new ones arrive. Verify chronology and scroll position. Switch conversations during a delayed request and confirm no old messages or text leak into the new chat.
6. Check hidden-tab/mobile conversation read behaviour and real phone keyboard layout. Physical-keyboard/real-cloud behaviour is not established by mocked browser tests.

## Limits and deliberate behaviour

- No exactly-once guarantee: a network failure after the server saves can leave the result uncertain. We do not automatically resend. The draft stays with a warning to check recent messages before retrying; safe blind retry needs backend idempotency.
- Drafts reset when switching account or conversation. They are not stored per conversation or persisted across reloads.
- Recovery is bounded to 1000 pages per pass; an exceptionally large history shows a reopen instruction. Offset pagination is retained, not replaced with a server cursor. A continuously changing history is not a transactional snapshot.
- Read marking remains conversation-wide because that is the existing backend API. Visibility gating is not per-message viewport read tracking. Failed read updates do not hide delivered messages.
- Existing token refresh and WebSocket infrastructure are unchanged. Further connection consolidation and broader account/error-state improvements belong to later phases.
- This phase improves reliability, not bundle size. Compared with 8.2, gzip CSS rises from 5.60 to 5.62 kB and JavaScript from 113.49 to 114.84 kB.

## Applying and rollback

Files are already changed locally. Review the companion full-code document rather than replacing the entire project. Diffs use the completed Phase 8.2 local snapshot, not Git HEAD or the old cloud source. '+' means added/updated lines, '-' means removed lines. To roll back this phase, restore its five updated files to that snapshot and remove its four additions together. Retain earlier phase changes. No migration is required.
