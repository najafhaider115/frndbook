# fbfrontend - Phase 8.2: Plan, implementation and testing

## Outcome

Implemented locally in `C:/Users/synah/Testing/SpringBootRestApIShoppingCart/BKP_EXTRA/fbfrontend`.
There are 46 file entries: 33 updated files, 10 additions and 3 stylesheet renames.
This phase builds on Phase 8.1. Existing 8.1 changes and documents are retained. FrndBookWC2 and the backend were not modified.

## What was implemented

1. Move feature rules out of index.css into auth, navbar, home, profile and users CSS Modules.
2. Convert chat, friends and notifications stylesheets to CSS Modules, imported by the components using them.
3. Keep global CSS limited to tokens, base rules and shared compatibility styles. index.css is now only the foundation entry point.
4. Add FormField and use it on all five account forms and the profile form. Labels remain visible while typing; native value, onChange, type, required, length constraints and disabled behaviour are forwarded.
5. Add StatusMessage and adopt it for existing operation errors/success messages. Errors use role=alert; success uses role=status. Loading text also exposes status semantics.
6. Improve navigation: one link definition for desktop/mobile, active route indication, meaningful unread-count labels, aria-controls, Escape with focus return, outside-click and focus-exit dismissal, and closing when changing to desktop width.
7. Add a keyboard skip link to the focusable main landmark. Profile/user-profile, normal pages, chat and loading branches retain an appropriate target.
8. Refine visual details: roomier labelled account forms, consistent input chrome, visible blue keyboard focus, stronger muted text, primary-button hover, clearer selected conversation and 12px message timestamps.
9. Balance friend action buttons on mobile. Show the mobile navbar up to 900px to leave enough room for navigation links and account name.
10. Add an isolated UI browser regression script. No project dependencies were installed.

## Why class names remain readable in the DOM

`bindStyles` attaches the scoped class exported by each imported CSS Module while retaining the original class name as a stable hook.
Feature declarations are scoped; existing sidebar tests and shared foundation selectors continue to find the intended elements.
This avoids coupling tests to generated hashes and allows gradual removal of shared compatibility styles later.
The helper does not select DOM elements, fetch data, change state or alter API payloads.
Vite uses compact generated scoped names to limit selector overhead. No additional CSS framework is introduced.

## Files and responsibilities

| File | Action | Responsibility |
| --- | --- | --- |
| `src/auth/ProtectedRoute.jsx` | updated | Expose loading text as a status; authentication decisions are unchanged. |
| `src/auth/PublicRoute.jsx` | updated | Expose loading text as a status; authentication decisions are unchanged. |
| `src/components/chat/ChatWindow.jsx` | updated | Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow. |
| `src/components/chat/ConversationList.jsx` | updated | Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow. |
| `src/components/chat/MessageComposer.jsx` | updated | Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow. |
| `src/components/chat/MessageList.jsx` | updated | Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow. |
| `src/components/layout/Navbar.jsx` | updated | One link definition, active routes, labelled unread count, accessible disclosure behaviour and skip link. |
| `src/components/ui/FormField.jsx` | added | Reusable native field with persistent label, stable ID, autocomplete passthrough and description/error hooks. |
| `src/components/ui/PageContainer.jsx` | updated | Focusable main landmark for the skip link. |
| `src/components/ui/StatusMessage.jsx` | added | Consistent operation feedback with alert/status semantics. |
| `src/components/ui/feedback.module.css` | added | Shared visual treatment for fields, hints and operation feedback. |
| `src/components/ui/foundation.module.css` | updated | Primary-button hover styling; shared foundation retained. |
| `src/components/users/FriendAction.jsx` | updated | Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow. |
| `src/components/users/FriendCard.jsx` | updated | Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow. |
| `src/components/users/FriendRequestCard.jsx` | updated | Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow. |
| `src/components/users/UserAvatar.jsx` | updated | Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow. |
| `src/components/users/UserCard.jsx` | updated | Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow. |
| `src/components/users/UserSearch.jsx` | updated | Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow. |
| `src/index.css` | updated | Only global foundation imports remain; feature rules moved to their owners. |
| `src/main.jsx` | updated | Remove obsolete global feature stylesheet imports. |
| `src/pages/ForgotPassword.jsx` | updated | Adopt feature classes and shared fields/feedback; preserve existing handlers and native constraints. |
| `src/pages/FriendRequests.jsx` | updated | Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow. |
| `src/pages/Friends.jsx` | updated | Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow. |
| `src/pages/Home.jsx` | updated | Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow. |
| `src/pages/Login.jsx` | updated | Adopt feature classes and shared fields/feedback; preserve existing handlers and native constraints. |
| `src/pages/Messages.jsx` | updated | Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow. |
| `src/pages/Notifications.jsx` | updated | Adopt feature-scoped classes and appropriate status/accessibility markup without changing data flow. |
| `src/pages/Profile.jsx` | updated | Adopt feature classes and shared fields/feedback; preserve existing handlers and native constraints. |
| `src/pages/ResetPassword.jsx` | updated | Adopt feature classes and shared fields/feedback; preserve existing handlers and native constraints. |
| `src/pages/Signup.jsx` | updated | Adopt feature classes and shared fields/feedback; preserve existing handlers and native constraints. |
| `src/pages/UserProfile.jsx` | updated | Adopt feature classes and shared fields/feedback; preserve existing handlers and native constraints. |
| `src/pages/VerifyEmail.jsx` | updated | Adopt feature classes and shared fields/feedback; preserve existing handlers and native constraints. |
| `src/styles/auth.module.css` | added | Scoped feature styles, retaining current layouts and adding the phase-specific visual refinements. |
| `src/styles/base.css` | updated | Shared focus ring, loading status layout, reduced motion and skip-link styles. |
| `src/styles/chat.module.css` | renamed | Scoped feature styles, retaining current layouts and adding the phase-specific visual refinements. |
| `src/styles/friends.module.css` | renamed | Scoped feature styles, retaining current layouts and adding the phase-specific visual refinements. |
| `src/styles/home.module.css` | added | Scoped feature styles, retaining current layouts and adding the phase-specific visual refinements. |
| `src/styles/navbar.module.css` | added | Scoped feature styles, retaining current layouts and adding the phase-specific visual refinements. |
| `src/styles/notifications.module.css` | renamed | Scoped feature styles, retaining current layouts and adding the phase-specific visual refinements. |
| `src/styles/profile.module.css` | added | Scoped feature styles, retaining current layouts and adding the phase-specific visual refinements. |
| `src/styles/shared.css` | updated | Keep shared pagination/header chrome; remove field overrides now owned by FormField. |
| `src/styles/tokens.css` | updated | Shared focus/feedback colours and stronger muted text contrast. |
| `src/styles/users.module.css` | added | Scoped feature styles, retaining current layouts and adding the phase-specific visual refinements. |
| `src/utils/bindStyles.js` | added | Bind feature module classes while retaining existing DOM hooks used by tests/shared styles. |
| `tests/ui.browser.mjs` | added | Isolated responsive, form-payload and keyboard-navigation regression checks. |
| `vite.config.js` | updated | Compact generated CSS Module class names. |

## Stylesheet renames

Remove the old filenames when applying the documented code manually:

- `src/styles/chat.css` becomes `src/styles/chat.module.css`.
- `src/styles/friends.css` becomes `src/styles/friends.module.css`.
- `src/styles/notifications.css` becomes `src/styles/notifications.module.css`.

The full-code document gives complete contents at the new paths and diffs against each old file. Main/Messages imports were updated as part of the same change.
Do not copy only a page component or stylesheet: the new module imports, shared components and helper must be applied together.

## Compatibility boundaries

API client files, AuthContext and NotificationContext are unchanged from the Phase 8.1 snapshot.
Routes, API destinations, request payload construction, token refresh logic, backend validation and chat delivery logic are retained.
Native constraints and handlers remain attached to their original form controls through FormField.
No database migration, backend restart, environment change, GitHub push or deployment was performed.
The frontend still needs the existing API/WS environment configuration for normal local use.

This phase intentionally does not fix REST fallback rendering, history/live-message races, reconnect catch-up, notification races or shared profile state; those remain in their agreed later phases.
FormField has an error-description API for future field-level validation, but this phase does not wire backend fieldErrors into every form.
The existing image-preview issue and timestamp timezone contract also remain separate tasks.

## Verification completed

| Check | Result |
| --- | --- |
| Production build | Passed |
| Existing sidebar unit tests | 7/7 passed |
| Existing sidebar browser regression | Passed: inactive chat updates, selected chat retention, deduplication and new conversation hydration |
| New responsive UI checks | 48 screen/viewport combinations passed |
| Control names | All visible input/textarea controls in the fixture screens had labels or accessible names |
| Horizontal geometry | Checked main/auth card/navbar and form/button bounds at each viewport; no overflow in these fixtures |
| Login payload | Original email/password payload preserved; mocked server error rendered as an alert |
| Verification form | Numeric filtering, six-digit enablement, resend cooldown and original email/otp payload checked |
| Navigation | Escape/focus return, outside click, focus exit, active route, desktop resize and skip-link focus checked |
| Browser errors/external requests | No page JavaScript errors or external requests during the successful UI run |
| Lint | No errors; same 13 existing warnings |
| Whitespace check | Passed |

The 48 combinations cover 12 routes at 1280, 800, 390 and 320px widths, with a 900px viewport height:
Login, Signup, Forgot Password, Reset Password, Verify Email, Home, Profile, another user's profile, Friends, Friend Requests, Notifications and Messages.
Screenshots of representative desktop/mobile screens and feedback/navigation states were inspected.
The existing sidebar tests were reused. The full backend suite was not repeated for this presentation-focused phase.
HTTP and STOMP responses were mocked locally, so no emails/messages were sent and no cloud data was changed.

During verification, a misplaced navbar root rule was corrected and a layout assertion was added.
Test timing was adjusted to wait for the mobile menu transition; this is not a production delay or extra application logic.
The final interaction-only rerun avoided repeating the already-passing screen sweep.

## Size measurements

| Measurement | Phase 8.1 | Phase 8.2 |
| --- | ---: | ---: |
| Active CSS source lines (excluding unused App.css) | 2,366 | 1,965 |
| Built CSS | 24.25 kB | 24.81 kB |
| Gzipped CSS | 4.75 kB | 5.60 kB |
| Built JavaScript | 355.93 kB | 363.52 kB |
| Gzipped JavaScript | 109.71 kB | 113.49 kB |

CSS organization and reuse improved, but the downloaded bundles are slightly larger. Scoped class mappings and new accessible components add bytes.
Source-line reduction also includes formatting/consolidation and must not be presented as equivalent to a network-size reduction.
Further performance work should measure actual bundle output; this phase makes no claim of a download-speed improvement.
The existing messageApi ineffective dynamic-import warning and 13 pre-existing lint warnings remain.

## Run the checks locally

```sh
npm run build
npm run lint
node --test tests/conversationSidebar.test.js
node tests/sidebar.browser.mjs
node tests/ui.browser.mjs
```

The browser scripts require Microsoft Edge and Playwright. They use the existing `PLAYWRIGHT_MODULE` override when Playwright is supplied by an external runtime.
No Playwright package was added to package.json. The Node-only sidebar test and ordinary build/lint commands do not require it.
Optional `UI_SCREENSHOT_DIR` selects screenshot output. `UI_INTERACTIONS_ONLY=1` runs only the targeted form/navigation checks; omit it for the complete sweep.

## Manual checks before accepting this phase

1. Try your normal account forms locally, including Verify Email and resend after its cooldown. Confirm the labels, loading/disabled buttons and error/success messages.
2. Update profile text and check input sizing. Existing shared-profile-state limitations remain scheduled for 9.1.
3. Open the mobile menu, close it using Escape/outside click, and navigate between pages. Check the highlighted route and notification count.
4. Use Tab from the top of a protected page: Skip to content should become visible and move focus to main content when activated.
5. On a phone, open a conversation and use the composer with the actual keyboard visible. The automated desktop browser does not reproduce a physical mobile keyboard.
6. Check your real data with long names/messages and populated notifications. Fixture coverage is useful but is not exhaustive real-account testing.

## Applying or rolling back

The project files are already changed locally. The companion Markdown/PDF is for reviewing or copying the complete changes.
Diffs are relative to the pre-8.2 local snapshot, not the original pre-8.1 project or the old cloud deployment.
`+` identifies new/updated lines; `-` identifies removed previous lines; `@@` identifies diff positions.
Rollback should restore the Phase 8.1 versions, remove additions and restore all three old stylesheet paths together.
Phase 8.3 remains the next functional step: chat fallback, message merging, reconnect recovery and composer reliability.
