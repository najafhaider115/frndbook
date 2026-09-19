# fbfrontend - Phase 10: Plan, implementation and release verification

## Outcome

Implemented locally in fbfrontend on top of completed Phases 9.1-9.3: 15 files (11 updated, 4 added). Backend and FrndBookWC2 are unchanged. No package installation, migration, environment change, Git push or deployment.

## Phase 10 items

| Item | Before | Change |
| --- | --- | --- |
| Search feedback | Empty result text could appear during the debounce; old requests could overwrite a newer query | Set pending state immediately; abort obsolete requests and ignore their completions; clear results on query change |
| Search paging | Failure feedback did not offer an explicit retry | Retry the same requested page; retain loading/error separation |
| Recent searches | Load/clear errors only appeared in the console | Visible safe errors and disabled Clear while pending |
| Mobile composer | CSS dynamic viewport height alone may not follow an overlay keyboard | Measure visualViewport when available and keep the existing CSS fallback; 16px textarea font and no manual resizing on mobile |
| Notification labels | Internal enum-like text such as NEW_MESSAGE | New message, Friend request, Friend request accepted; Activity for unknown types |
| Browser title | fbfrontend | FrndBook, with page description |
| Timestamp differences | Repeated date parsing with an ambiguous offset-free backend contract | Shared formatting; preserve offset-free wall-clock fields, convert explicitly zoned timestamps using viewer locale, show a dash for invalid/missing values; document backend finding |
| Release checks | Prior phase-specific evidence | Reuse and rerun relevant automated suites, including the full responsive sweep |

## Files

| File | Change | Purpose |
| --- | --- | --- |
| `index.html` | updated | Use FrndBook as the browser title and add a concise page description. |
| `src/api/userApi.js` | updated | Allow cancellation of search requests without changing endpoint parameters. |
| `src/components/chat/ConversationList.jsx` | updated | Use the same safe timestamp formatter instead of repeated inline date construction. |
| `src/components/chat/MessageList.jsx` | updated | Use the same safe timestamp formatter instead of repeated inline date construction. |
| `src/components/users/FriendRequestCard.jsx` | updated | Use the same safe timestamp formatter instead of repeated inline date construction. |
| `src/components/users/UserSearch.jsx` | updated | Immediate pending feedback, stale-request cancellation, recoverable paging and recent-search errors. |
| `src/hooks/useChatViewport.js` | added | Size mobile chat against the visible viewport and clean up listeners on unmount. |
| `src/pages/Messages.jsx` | updated | Attach the viewport sizing hook to the existing chat page. |
| `src/pages/Notifications.jsx` | updated | Present human-readable notification types and safe timestamp text. |
| `src/pages/Profile.jsx` | updated | Use the same safe timestamp formatter instead of repeated inline date construction. |
| `src/pages/UserProfile.jsx` | updated | Use the same safe timestamp formatter instead of repeated inline date construction. |
| `src/styles/chat.module.css` | updated | Use measured mobile chat height, retain safe-area padding and avoid small-text input zoom. |
| `src/utils/displayText.js` | added | Readable notification labels and explicit handling of offset-free versus zoned timestamps. |
| `tests/displayText.test.js` | added | Unit and browser release checks for the phase-specific behaviours. |
| `tests/release.browser.mjs` | added | Unit and browser release checks for the phase-specific behaviours. |

## Compatibility and design details

Search retains the 400ms debounce and existing name/page/size API. The optional AbortSignal is only a client cancellation mechanism. Account exclusion compares IDs as strings. Paging uses the same cancellation lifecycle as a new query. Failed search pages can be retried without changing the query. Recent-search recording on navigation remains best-effort so it does not block opening a profile.

The mobile hook sets a CSS custom property on the Messages page, based on visualViewport height/offset and the page's current top edge. Resize/scroll measurement is coalesced with requestAnimationFrame. It removes listeners and the property when unmounted, and uses ordinary CSS on desktop, when visualViewport is absent or during pinch zoom. Existing independent scrolling, mobile conversation selection, safe-area composer padding and desktop split layout remain.

The shared formatter only changes display. It does not rewrite server data, database records, message IDs or the existing sorting/recovery algorithms. Unknown notification types display Activity rather than leaking an internal identifier. This is a safe fallback; a new backend type can be explicitly labelled later.

## Timestamp investigation

Read-only inspection of the current local backend found MessageResponse, ConversationResponse/ConversationUpdateResponse, NotificationResponse, FriendResponse and UserResponse use LocalDateTime fields. Message, Conversation, Notification and User entities populate timestamps using LocalDateTime.now(). The inspected Dockerfile does not set an explicit Java timezone. No explicit timezone setting was found in the inspected backend resource configuration.

An offset-free value such as 2026-09-19T10:15:00 does not identify a unique instant. The frontend cannot determine whether historical values were recorded in UTC, India time or another server timezone. Adding Z or a fixed 5:30 correction to all existing records would risk displaying incorrect times.

The formatter therefore preserves the supplied clock fields for offset-free values. Internally using UTC formatting is a display technique to keep those fields stable; it is not a claim that the original data is UTC. Values with an explicit Z or offset are treated as instants and displayed in the viewer's locale/timezone. Tests cover different viewer timezones and malformed dates.

Remaining backend follow-up: define an Instant/OffsetDateTime or documented UTC contract for new data, confirm deployment/JVM/database timezone behaviour, and decide how to interpret historical LocalDateTime values before migration. That backend work is not included in this frontend phase. Timestamp conversion is not certified fully resolved.

## Verification completed

- Production Vite build passed: 142 modules; CSS 25.01 kB (gzip 5.64); JavaScript 367.88 kB (gzip 115.96). Phase 9.1-9.3 was 24.85 / 5.62 CSS and 366.34 / 115.32 JavaScript. The additional behaviour slightly increases size.
- 31 Node tests passed, including 3 new display-text tests and the existing 28 error/auth-lifecycle/chat/sidebar tests.
- New release browser check passed: title; pending search without false empty result; old result isolation; failed-page retry; empty query cleanup; notification labels; invalid timestamp fallback; simulated overlay keyboard and desktop restoration.
- Full existing UI suite passed: 48 combinations of 12 routes and 1280/800/390/320px widths; labelled controls, horizontal geometry, login/OTP payloads, feedback roles, mobile/keyboard navigation. Representative screenshots were inspected.
- Existing account-state browser test passed: shared profile and image state, cross-tab updates/logout, validation, late-save rejection, temporary startup/refresh errors and rejected refresh.
- Existing live-auth browser test passed: stale refresh protection, three adapters and logout cleanup.
- Existing chat and sidebar browser tests passed, including 25 missed messages recovered after reconnect, REST-only sends, inactive-chat updates and selection retention.
- Lint: no errors, 12 remaining warnings (down from 13 after removing the old UserSearch effect pattern). Whitespace check passed.

All tests used local mocked HTTP and STOMP services. No real account, cloud database, mail, S3 or chat data was changed. No claim is made that the currently deployed older backend matches the updated local contract. No automatic deployment took place.

## Run the checks

```sh
npm run build
npm run lint
node --test tests/apiError.test.js tests/displayText.test.js tests/stompConnection.test.js tests/messageSession.test.js tests/conversationSidebar.test.js
node tests/release.browser.mjs
node tests/ui.browser.mjs
node tests/accountState.browser.mjs
node tests/liveAuth.browser.mjs
node tests/chat.browser.mjs
node tests/sidebar.browser.mjs
```

Browser tests require Edge and Playwright. PLAYWRIGHT_MODULE can use the bundled external runtime. No project dependency was added. RELEASE_SCREENSHOT_DIR and UI_SCREENSHOT_DIR optionally save screenshots. Leave UI_INTERACTIONS_ONLY unset for the full 48-screen suite.

## Manual acceptance before deployment

1. Run the updated local backend and frontend. Search quickly, clear the query and paginate; check that only the latest query's results remain. Temporarily fail search and use Retry search.
2. On a physical Android/iOS phone, open chat, focus the composer, show/hide the keyboard, rotate and test browser chrome/zoom. Confirm Send remains usable and older messages remain scrollable. The simulated viewport check is not a substitute for a real keyboard test.
3. Confirm new-message and friendship notifications have readable labels. Check known message times and last-seen values against backend records without assuming a timezone correction.
4. Recheck login, refresh, logout, profile/image save, friend requests, chat, inactive sidebar and notification flows with the actual integrations.
5. Before building for Netlify, verify the intended public VITE_API_BASE_URL and VITE_WS_URL point to the updated Render deployment using HTTPS/WSS, and backend CORS allows the frontend origin. The local .env and cloud settings were not changed or certified by mocked tests.
6. Deploy only after deciding to release. Check the deployed build/version and repeat a small real-account smoke test. A successful local build is not evidence of a successful cloud deployment.

## Limits and rollback

Very small viewports, physical keyboards, browser-specific keyboard panning and accessibility zoom still need device acceptance. Offset-free historical timestamps cannot be reliably converted without a backend/data decision. Existing earlier limitations, including uncertain message saves after a lost response and absence of cross-tab refresh locking, remain documented in earlier phases.

The project files are already changed locally. The companion Markdown/PDF contains complete current source and exact + / - diffs against the pre-Phase-10 snapshot. To roll back, restore this phase's updated files and remove its additions together, retaining earlier phases. No backend rollback or database migration is needed for these frontend changes.
