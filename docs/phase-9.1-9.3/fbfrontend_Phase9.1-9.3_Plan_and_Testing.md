# fbfrontend - Phases 9.1-9.3: Plan, implementation and testing

## Scope and outcome

Implemented together locally in fbfrontend: 22 files, 19 updated and 3 added. The baseline is completed Phase 8.4. Existing earlier changes remain. Backend and FrndBookWC2 were not changed; no migration, new package, environment variable, push or deployment.

The saved earlier document explicitly identifies 9.1 as shared profile/account state. Exact 9.2/9.3 titles were not recorded in those files. The working scope was stated during implementation: 9.2 consistent backend validation/error feedback, 9.3 authentication and cross-tab state synchronization.

| Phase | Improvement | Result |
| --- | --- | --- |
| 9.1 | Shared profile/account state | Successful profile and image responses update AuthContext and stored user; Home and other consumers see the saved values. Unsaved form drafts remain independent. |
| 9.2 | Consistent backend error handling | One formatter consumes message/fieldErrors; labelled form controls display field errors with aria-invalid and description associations. Other operations include field details in their summaries. |
| 9.3 | Session and cross-tab state | Existing auth-cleared events now update React immediately; another tab's logout stops protected UI/live consumers. Storage changes trigger backend validation, and stale session responses cannot overwrite current state. |

## Changed files

| File | Change | Purpose |
| --- | --- | --- |
| `src/api/axiosClient.js` | updated | Scope requests and refresh flights to the local login; discard stale work and retain credentials on transient refresh failures. |
| `src/auth/AuthContext.jsx` | updated | Shared profile updater, server-validated session initialization, lifecycle guards and same-tab/cross-tab authentication events. |
| `src/auth/ProtectedRoute.jsx` | updated | Expose retryable session-check failures instead of silently removing credentials. |
| `src/auth/PublicRoute.jsx` | updated | Expose retryable session-check failures instead of silently removing credentials. |
| `src/components/users/UserSearch.jsx` | updated | Use the shared backend error formatter while retaining existing operation logic. |
| `src/context/NotificationContext.jsx` | updated | Use consistent error feedback and remount notification state for each account/session. |
| `src/pages/ForgotPassword.jsx` | updated | Present backend field validation beside labelled controls as well as the operation summary. |
| `src/pages/FriendRequests.jsx` | updated | Use the shared backend error formatter while retaining existing operation logic. |
| `src/pages/Friends.jsx` | updated | Use the shared backend error formatter while retaining existing operation logic. |
| `src/pages/Login.jsx` | updated | Present backend field validation beside labelled controls as well as the operation summary. |
| `src/pages/Messages.jsx` | updated | Use the shared backend error formatter while retaining existing operation logic. |
| `src/pages/Notifications.jsx` | updated | Use the shared backend error formatter while retaining existing operation logic. |
| `src/pages/Profile.jsx` | updated | Publish saved profile/image responses to shared state, retain drafts, serialize mutations and discard disposed responses. |
| `src/pages/ResetPassword.jsx` | updated | Present backend field validation beside labelled controls as well as the operation summary. |
| `src/pages/Signup.jsx` | updated | Present backend field validation beside labelled controls as well as the operation summary. |
| `src/pages/UserProfile.jsx` | updated | Use the shared backend error formatter while retaining existing operation logic. |
| `src/pages/VerifyEmail.jsx` | updated | Present backend field validation beside labelled controls as well as the operation summary. |
| `src/services/messageSession.js` | updated | Consistent server-error feedback while preserving the uncertain-send warning. |
| `src/utils/apiError.js` | added | Normalize the public backend error contract, field details, network failures and rate-limit fallback. |
| `src/utils/tokenStorage.js` | updated | Local login identifier and change-only profile storage writes for cross-tab synchronization. |
| `tests/accountState.browser.mjs` | added | Focused account-state and error-contract regression coverage. |
| `tests/apiError.test.js` | added | Focused account-state and error-contract regression coverage. |

## Design and compatibility

### 9.1 Profile

AuthContext exposes a guarded updateUser method. Profile updates are accepted only for the current user and local login identifier. Requests that finish after logout/account switch or component disposal do not replace the active account.

Profile text and image writes are serialized so an older whole-user response cannot overwrite a concurrent update. Text fields are disabled during saves/uploads. Saved values are derived from shared user state; edited drafts remain local until saved. Successful image upload switches back from the temporary object URL to the server-provided image. Failed upload keeps the saved account data and restores the saved avatar; object URLs are cleaned up. The image picker accepts JPEG/PNG/WebP, matching the current backend's supported types. Server content and size validation remain authoritative.

### 9.2 Errors

apiError validates message and fieldErrors types. apiErrorMessage adds otherwise hidden field details to operation summaries. It provides readable network/rate-limit fallbacks and never falls back to a raw Axios error message or object conversion. React still escapes all rendered text.

Login, Signup, Forgot Password, Reset Password, Verify Email and Profile display mapped backend field errors alongside the controls. Unknown fields remain visible in the summary. Errors clear on the next attempted operation; editing a field alone does not erase the server feedback. Existing request payloads, native constraints and endpoints are unchanged.

Friends, friend requests, user search, user profile, conversations and notifications adopt the same summary formatter. Chat send failures preserve the existing warning about uncertain persistence when no HTTP response was received. Internal history recovery errors and intentional recovery/fallback logic remain separate. This is consistent feedback for the existing operation handlers, not a claim that every future API call is automatically covered.

### 9.3 Session state

A new localStorage key, frndbook_session, identifies a local login. It is not a credential, backend token version or authorization control. Existing stored sessions without this key remain usable; the next login creates one.

AuthContext listens to auth-cleared and storage events. It validates restored or externally changed user data with /api/users/me instead of trusting stored account data for authorization. Change-only user storage writes prevent repeated cross-tab write loops. A session change also gives notification state a fresh lifetime so old account data cannot populate the new provider.

Axios tags requests with their originating local session. Responses/retries from a replaced session are rejected. Refresh requests still share a promise within the same session/token; a newer login does not borrow an older session's pending refresh. A stale refresh success/failure cannot overwrite or clear the new session.

An explicit 401/403 refresh rejection clears local auth. Network/server refresh failures preserve credentials and propagate a retryable error. Startup /me failures show Retry session check. This changes Phase 8.4's previous policy of clearing credentials on every refresh failure. It does not change backend logout/token-version behaviour.

## Tests and evidence

- 28 Node tests passed: 3 new error-contract tests plus the existing 25 message/sidebar/STOMP tests. Message-session tests were rerun after preserving uncertain-send feedback.
- New account-state browser test passed: profile save reaches Home/storage and another tab; validation retains previous saved data and the draft; failed/successful image uploads preserve text drafts; cross-tab logout; delayed save after logout discarded; signup inline validation; transient startup and refresh failures retain credentials; explicit refresh rejection clears them.
- Existing live-auth browser regression passed: old refresh cannot restore logout or overwrite/clear a newer login, all three adapters deliver and logout stops them.
- Existing chat and sidebar browser regressions passed, including 25-message reconnect recovery and inactive-chat sidebar updates.
- Existing UI interaction checks passed: login/OTP payloads, feedback roles and mobile/keyboard navigation. The prior 48-screen sweep was reused rather than repeated.
- Production build passed: 140 modules. CSS stays 24.85 kB (gzip 5.62). JavaScript is approximately 366.4 kB (gzip 115.3), compared with Phase 8.4's 362.76 / 114.09 kB. This phase adds functionality, not a bundle-size optimization.
- Lint has no errors and 13 warnings. The former Profile effect warning is removed; AuthContext's intentional external-state bootstrap now produces a set-state-in-effect warning. The count is unchanged, but the warning set is not identical. Whitespace check passed.

All browser tests use isolated local mocked HTTP/STOMP responses. No real cloud messages, email, account edits or database operations were performed. This verifies frontend behaviour and the existing contract; it does not establish that the currently deployed old backend matches the updated local backend.

## Run locally

```sh
npm run build
npm run lint
node --test tests/apiError.test.js tests/stompConnection.test.js tests/messageSession.test.js tests/conversationSidebar.test.js
node tests/accountState.browser.mjs
node tests/liveAuth.browser.mjs
node tests/chat.browser.mjs
node tests/sidebar.browser.mjs
```

The browser tests require Edge and Playwright; PLAYWRIGHT_MODULE can identify an external runtime. UI_INTERACTIONS_ONLY=1 runs the existing tests/ui.browser.mjs interaction checks without repeating the full screen sweep. No dependency was added.

## Manual checks

1. Update name/bio; navigate to Home and back without refreshing. Confirm the new name and saved form values.
2. Type an unsaved name, then upload a supported image. Confirm the new saved image and that the typed name remains unsaved. Fail an upload and confirm the previous avatar returns.
3. Trigger backend validation on signup/profile/password-reset/verification. Check field messages and the summary, then correct and resubmit.
4. Open the same account in two tabs. Save a profile in one; check shared profile values in the other. Logout in either; both tabs should leave protected content.
5. Delay a profile request, logout, then allow it to finish. Confirm it cannot restore user state. Repeat with an account change.
6. Temporarily stop the backend during startup or refresh. Confirm credentials remain and Retry works after recovery. Confirm a genuinely rejected refresh logs out.
7. Recheck live notifications, chat and sidebar using the updated local backend. Verify on a real phone before release.

## Limits and rollback

Cross-tab synchronization applies to tabs sharing the same origin and browser storage. Separate browser profiles/devices depend on backend revocation and subsequent requests. There is no new cross-tab distributed refresh lock or guarantee of an immediate device-wide visual logout. The local session identifier is not a security token.

Profile drafts are not persisted across navigation/reload. Notification provider remounting isolates sessions but does not redesign notification pagination or read-count concurrency. Existing WebSocket transport failure policy, temporary disconnect status, backend validation and Phase 8.3's uncertain-send limitation remain. Existing raw diagnostic console calls elsewhere were not comprehensively removed.

Files are already modified locally. The companion Markdown/PDF contains every changed file in full and exact unified diffs from the pre-9.1-9.3 snapshot. '+' means added/updated; '-' means removed. Roll back these updated files and additions as a set to that snapshot, retaining earlier phases. The extra localStorage session identifier can remain unused if rolled back; it is not part of the backend schema.
