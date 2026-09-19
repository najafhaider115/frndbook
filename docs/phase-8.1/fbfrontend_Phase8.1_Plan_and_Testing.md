# fbfrontend - Phase 8.1: Plan, implementation and testing

## Outcome

Implemented locally in `C:/Users/synah/Testing/SpringBootRestApIShoppingCart/BKP_EXTRA/fbfrontend`.
This phase establishes the shared styling foundation while preserving current screen appearance and application behaviour.
It adds three reusable components and adopts them immediately. There are 7 new source files and 15 updated source files.
No backend, FrndBookWC2, environment variables, dependencies, API destinations, authentication logic or deployment settings were changed.

## Scope and design

1. Extract `tokens.css` and `base.css` from the existing global stylesheet.
2. Add `shared.css` for identical form-control, pagination, header and empty-state declarations.
3. Add scoped Button, Card and PageContainer primitives, using CSS Modules already supported by the existing build.
4. Adopt Button on Login, Signup, VerifyEmail, ForgotPassword and ResetPassword. Submit buttons retain `type="submit"`; resend retains `type="button"`.
5. Adopt Card/PageContainer on Home, Profile, UserProfile (including its error branch), Friends, FriendRequests and Notifications. Home retains a semantic section.
6. Move friend message/action styles from chat.css to friends.css. Friend styling no longer depends on the chat stylesheet being loaded.
7. Consolidate duplicate friend/request row styles and shared neutral colours while retaining existing values.

This is an incremental migration. Existing feature classes remain active, so responsive overrides and current selectors continue to work.
PageContainer always renders `main`; Card defaults to `div` and accepts `as="section"`. Neither adds extra DOM wrappers.
Button renders a native `button`, forwards native props, and defaults to `type="button"` to avoid accidental submission in future usage.
Callers must explicitly pass `type="submit"` for submit actions. Feature-specific width/spacing stay with the feature.
No unused UI library was added. FormField, additional status components and full per-feature module conversion belong to Phase 8.2.

## Files

| File | Action | Reason |
| --- | --- | --- |
| `src/components/ui/Button.jsx` | Added | Native button wrapper used by all five authentication pages; preserves explicit submit/button types. |
| `src/components/ui/Card.jsx` | Added | Reusable surface with optional semantic element and native DOM props. |
| `src/components/ui/PageContainer.jsx` | Added | Shared main element geometry; feature classes retain maximum widths and mobile overrides. |
| `src/components/ui/foundation.module.css` | Added | Scoped styles for the three primitives; low-specificity page/card rules preserve feature overrides. |
| `src/styles/base.css` | Added | Own reset, native element defaults and the existing focus outline. |
| `src/styles/shared.css` | Added | Share input chrome, pagination, friends/notification headers and empty states. |
| `src/styles/tokens.css` | Added | Extract existing tokens and add shared control colours/height without changing their values. |
| `src/index.css` | Updated | Load foundation styles; remove migrated rules; retain feature styles and responsive behaviour. |
| `src/pages/ForgotPassword.jsx` | Updated | Adopt Button; retain existing form handlers, native types and disabled conditions. |
| `src/pages/FriendRequests.jsx` | Updated | Adopt PageContainer and Card; preserve existing DOM tags, feature classes, data flow and handlers. |
| `src/pages/Friends.jsx` | Updated | Adopt PageContainer and Card; preserve existing DOM tags, feature classes, data flow and handlers. |
| `src/pages/Home.jsx` | Updated | Adopt PageContainer and Card; preserve existing DOM tags, feature classes, data flow and handlers. |
| `src/pages/Login.jsx` | Updated | Adopt Button; retain existing form handlers, native types and disabled conditions. |
| `src/pages/Notifications.jsx` | Updated | Adopt PageContainer and Card; preserve existing DOM tags, feature classes, data flow and handlers. |
| `src/pages/Profile.jsx` | Updated | Adopt PageContainer and Card; preserve existing DOM tags, feature classes, data flow and handlers. |
| `src/pages/ResetPassword.jsx` | Updated | Adopt Button; retain existing form handlers, native types and disabled conditions. |
| `src/pages/Signup.jsx` | Updated | Adopt Button; retain existing form handlers, native types and disabled conditions. |
| `src/pages/UserProfile.jsx` | Updated | Adopt PageContainer and Card; preserve existing DOM tags, feature classes, data flow and handlers. |
| `src/pages/VerifyEmail.jsx` | Updated | Adopt Button; retain existing form handlers, native types and disabled conditions. |
| `src/styles/chat.css` | Updated | Consume shared input chrome/tokens and remove friend-only styles. |
| `src/styles/friends.css` | Updated | Consolidate identical friend/request rows, consume shared styles and own friend message actions. |
| `src/styles/notifications.css` | Updated | Consume shared header, pagination, empty-state styles and colour tokens. |

## Import and cascade ownership

`main.jsx` continues to import `index.css`, `friends.css`, and `notifications.css`.
`index.css` imports tokens, base and shared CSS before its remaining feature rules.
The three reusable components import `foundation.module.css`.
Page/Card module selectors use `:where()` so existing feature dimensions and media queries can override them independent of bundler ordering.
Button uses ordinary module class specificity so the global native-control font reset does not remove its weight.
Existing breakpoints (700px, 600px, 380px and chat's 800px), dvh sizing, safe-area padding, reduced-motion rules and hover conditions are retained.
Avoid copying foundation declarations into new screens; use these components and keep only feature differences in the feature CSS.

## Verification completed

| Check | Result |
| --- | --- |
| Production Vite build | Passed |
| Existing sidebar unit tests | 7/7 passed |
| Existing sidebar browser test | Passed using mocked HTTP/STOMP; inactive chat update, selected chat preservation, deduplication and new conversation hydration |
| Before/after computed-style comparison | 33/33 screen/viewport combinations matched across 18 selected CSS properties and DOM tag ordering |
| Browser JavaScript errors during style comparison | None |
| Lint | No errors; same 13 existing warnings |
| Git diff whitespace check | Passed |

Style comparison covered login, signup, forgot password, reset password, home, profile, other-user profile, friends, friend requests, notifications and messages at widths 1280, 390 and 360px (height 900px).
The comparison used isolated fixture accounts and intercepted HTTP/WebSocket traffic; it did not send data to cloud services.
Representative mobile screenshots were inspected. This is not a claim that every interaction, mobile keyboard state or browser has been tested.
The email-verification page shares the migrated Button, but was not included in the 33-screen snapshot set; include it in the manual form checks below.
An initial authentication-button font-weight difference was corrected before the final comparison.

The existing ineffective dynamic import warning in ChatWindow/messageApi remains. The 13 lint warnings are pre-existing effect/dependency and Fast Refresh warnings, not newly introduced by this phase.

## Size measurements (production build)

| Measurement | Before | After |
| --- | ---: | ---: |
| Active CSS source lines (excluding unused App.css) | 2,505 | 2,366 |
| Built CSS | 23.34 kB | 24.25 kB |
| Gzipped CSS | 4.66 kB | 4.75 kB |
| Built JavaScript | 355.51 kB | 355.93 kB |
| Gzipped JavaScript | 109.49 kB | 109.71 kB |

Source duplication was reduced, but shipped CSS has not become smaller yet. Token references and scoped component selectors add bytes during this incremental migration.
Do not present source-line reduction as a network-performance improvement. Further feature consolidation in 8.2 should be measured against this baseline.
Unused App.css was not deleted because it is not shipped and its removal would not reduce the bundle.

## Local verification commands

Run from the frontend project directory with Node/npm available:

```sh
npm run build
npm run lint
node --test tests/conversationSidebar.test.js
```

The existing optional `tests/sidebar.browser.mjs` requires Playwright and Microsoft Edge; it uses mocked traffic. During this phase it ran with the bundled Playwright runtime, without installing packages in this project.

## What you should check locally

1. Open Login/Signup/Forgot Password/Reset Password/Verify Email. Confirm input sizing, submit buttons, disabled/loading states and verification resend behaviour.
2. Open Home, Profile, Friends, Friend Requests and Notifications. Confirm card widths, spacing and pagination at desktop and mobile widths.
3. Open another user's profile and its error/not-found state. Confirm the shared card is styled in both paths.
4. Open Messages, switch between the sidebar and chat on mobile, and verify the composer remains in its existing position.
5. Use keyboard Tab through controls and open the mobile menu. This phase preserves existing behaviour; broader accessibility improvements remain in 8.2.

No database migration or backend restart is required. Restart the frontend dev server if necessary, or use `npm run build` for a production bundle.
This phase has not been pushed to GitHub or deployed.

## Compatibility boundaries and next phase

Chat delivery races, notification synchronization, profile/auth state synchronization and request cancellation are unchanged and remain scheduled in later phases.
Phase 8.2 can migrate remaining feature CSS, expand shared form/status components and improve visual hierarchy/accessibility after this foundation is accepted.

## Companion files and rollback

The companion Full_Code_and_Changes Markdown and Code_and_Changes PDF contain every added/updated file in full, followed by exact unified diffs from the pre-phase local snapshot.
In diffs, `+` means an added/new version line and `-` means the previous removed line; `---`/`+++` are file headers and `@@` is a location marker.
New files have all lines prefixed `+`. Unchanged context is included around edits; full current files are provided separately.
Rollback must restore the updated source files and remove the seven newly added files as one unit; do not revert only the CSS or only the component usages.
The original source snapshot was captured before editing, so the diff is specific to Phase 8.1 rather than inferred from older commits.
