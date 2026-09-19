# fbfrontend - Phase 8.1: Full code and changes

All paths are relative to the fbfrontend project root. These are the complete current contents, followed by phase-specific unified diffs. No secrets or environment files are included.

## src/components/ui/Button.jsx

Native button wrapper used by all five authentication pages; preserves explicit submit/button types.

### Full current content

```jsx
import styles from "./foundation.module.css";

/** Native button semantics; callers explicitly opt into form submission. */
export default function Button({ type = "button", className = "", children, ...props }) {
  return (
    <button {...props} type={type} className={`${styles.button} ${className}`.trim()}>
      {children}
    </button>
  );
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/components/ui/Button.jsx
@@ -0,0 +1,10 @@
+import styles from "./foundation.module.css";
+
+/** Native button semantics; callers explicitly opt into form submission. */
+export default function Button({ type = "button", className = "", children, ...props }) {
+  return (
+    <button {...props} type={type} className={`${styles.button} ${className}`.trim()}>
+      {children}
+    </button>
+  );
+}
```

## src/components/ui/Card.jsx

Reusable surface with optional semantic element and native DOM props.

### Full current content

```jsx
import styles from "./foundation.module.css";

/** Preserve semantic markup with as="section" where the card represents a section. */
export default function Card({ as: Component = "div", className = "", children, ...props }) {
  return (
    <Component {...props} className={`${styles.card} ${className}`.trim()}>
      {children}
    </Component>
  );
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/components/ui/Card.jsx
@@ -0,0 +1,10 @@
+import styles from "./foundation.module.css";
+
+/** Preserve semantic markup with as="section" where the card represents a section. */
+export default function Card({ as: Component = "div", className = "", children, ...props }) {
+  return (
+    <Component {...props} className={`${styles.card} ${className}`.trim()}>
+      {children}
+    </Component>
+  );
+}
```

## src/components/ui/PageContainer.jsx

Shared main element geometry; feature classes retain maximum widths and mobile overrides.

### Full current content

```jsx
import styles from "./foundation.module.css";

/** Shared page geometry. Feature classes own maximum width and responsive overrides. */
export default function PageContainer({ className = "", children, ...props }) {
  return (
    <main {...props} className={`${styles.page} ${className}`.trim()}>
      {children}
    </main>
  );
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/components/ui/PageContainer.jsx
@@ -0,0 +1,10 @@
+import styles from "./foundation.module.css";
+
+/** Shared page geometry. Feature classes own maximum width and responsive overrides. */
+export default function PageContainer({ className = "", children, ...props }) {
+  return (
+    <main {...props} className={`${styles.page} ${className}`.trim()}>
+      {children}
+    </main>
+  );
+}
```

## src/components/ui/foundation.module.css

Scoped styles for the three primitives; low-specificity page/card rules preserve feature overrides.

### Full current content

```css
/* Low specificity lets feature classes retain existing dimensions and breakpoints. */
:where(.page) {
  width: 100%;
  margin: 0 auto;
  padding: var(--page-padding-y) var(--page-padding-x);
}

:where(.card) {
  padding: 30px;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
}

.button {
  min-height: var(--control-height);
  padding: 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 600;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.button:disabled {
  opacity: 0.6;
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/components/ui/foundation.module.css
@@ -0,0 +1,28 @@
+/* Low specificity lets feature classes retain existing dimensions and breakpoints. */
+:where(.page) {
+  width: 100%;
+  margin: 0 auto;
+  padding: var(--page-padding-y) var(--page-padding-x);
+}
+
+:where(.card) {
+  padding: 30px;
+  background: var(--color-surface);
+  border-radius: var(--radius-xl);
+  box-shadow: var(--shadow-card);
+}
+
+.button {
+  min-height: var(--control-height);
+  padding: 12px;
+  border: none;
+  border-radius: var(--radius-sm);
+  background: var(--color-primary);
+  color: var(--color-on-primary);
+  font-weight: 600;
+  transition: background var(--transition-fast), transform var(--transition-fast);
+}
+
+.button:disabled {
+  opacity: 0.6;
+}
```

## src/styles/base.css

Own reset, native element defaults and the existing focus outline.

### Full current content

```css
/* ==================================================
   RESET
   ================================================== */

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  width: 100%;
  min-height: 100%;
  overflow-x: hidden;
}

body {
  margin: 0;

  width: 100%;
  min-height: 100vh;

  font-family: Arial, Helvetica, sans-serif;

  background: var(--color-bg);
  color: var(--color-text);

  line-height: 1.45;

  overflow-x: hidden;

  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

#root {
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
}

button,
input,
textarea,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}

a {
  color: inherit;
}

img {
  max-width: 100%;
}

input,
textarea {
  min-width: 0;
}

button,
a,
input,
textarea {
  -webkit-tap-highlight-color: transparent;
}

/* ==================================================
   ACCESSIBILITY / FOCUS
   ================================================== */

button:focus-visible,
a:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--color-outline);
  outline-offset: 2px;
}

```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/styles/base.css
@@ -0,0 +1,88 @@
+/* ==================================================
+   RESET
+   ================================================== */
+
+*,
+*::before,
+*::after {
+  box-sizing: border-box;
+}
+
+html {
+  width: 100%;
+  min-height: 100%;
+  overflow-x: hidden;
+}
+
+body {
+  margin: 0;
+
+  width: 100%;
+  min-height: 100vh;
+
+  font-family: Arial, Helvetica, sans-serif;
+
+  background: var(--color-bg);
+  color: var(--color-text);
+
+  line-height: 1.45;
+
+  overflow-x: hidden;
+
+  -webkit-font-smoothing: antialiased;
+  text-rendering: optimizeLegibility;
+}
+
+#root {
+  width: 100%;
+  min-height: 100vh;
+  overflow-x: hidden;
+}
+
+button,
+input,
+textarea,
+select {
+  font: inherit;
+}
+
+button {
+  cursor: pointer;
+}
+
+button:disabled {
+  cursor: not-allowed;
+}
+
+a {
+  color: inherit;
+}
+
+img {
+  max-width: 100%;
+}
+
+input,
+textarea {
+  min-width: 0;
+}
+
+button,
+a,
+input,
+textarea {
+  -webkit-tap-highlight-color: transparent;
+}
+
+/* ==================================================
+   ACCESSIBILITY / FOCUS
+   ================================================== */
+
+button:focus-visible,
+a:focus-visible,
+input:focus-visible,
+textarea:focus-visible {
+  outline: 2px solid var(--color-outline);
+  outline-offset: 2px;
+}
+
```

## src/styles/shared.css

Share input chrome, pagination, friends/notification headers and empty states.

### Full current content

```css
/* Compatibility selectors allow incremental adoption without rewriting forms. */
.auth-card input,
.search-input,
.profile-form input,
.profile-form textarea,
.message-composer textarea {
  width: 100%;
  border: 1px solid var(--color-control-border);
  outline: none;
}

.friends-header,
.notifications-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 25px;
}

.friends-header h1,
.notifications-header h1 {
  margin: 0 0 6px;
}

.friends-header p,
.notifications-header p {
  margin: 0;
  color: var(--color-text-secondary);
}

.pagination,
.notification-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.pagination button,
.notification-pagination button {
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid var(--color-control-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.pagination button:disabled,
.notification-pagination button:disabled {
  opacity: 0.5;
}

.friends-empty,
.notifications-empty {
  text-align: center;
  border: 1px dashed var(--color-control-border);
  border-radius: var(--radius-lg);
}

.friends-empty h2,
.notifications-empty h2 {
  margin: 0 0 8px;
}

.friends-empty p,
.notifications-empty p {
  margin: 0;
  color: var(--color-text-secondary);
}
```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/styles/shared.css
@@ -0,0 +1,70 @@
+/* Compatibility selectors allow incremental adoption without rewriting forms. */
+.auth-card input,
+.search-input,
+.profile-form input,
+.profile-form textarea,
+.message-composer textarea {
+  width: 100%;
+  border: 1px solid var(--color-control-border);
+  outline: none;
+}
+
+.friends-header,
+.notifications-header {
+  display: flex;
+  align-items: center;
+  justify-content: space-between;
+  gap: 20px;
+  margin-bottom: 25px;
+}
+
+.friends-header h1,
+.notifications-header h1 {
+  margin: 0 0 6px;
+}
+
+.friends-header p,
+.notifications-header p {
+  margin: 0;
+  color: var(--color-text-secondary);
+}
+
+.pagination,
+.notification-pagination {
+  display: flex;
+  align-items: center;
+  justify-content: center;
+  gap: 20px;
+}
+
+.pagination button,
+.notification-pagination button {
+  min-height: 40px;
+  padding: 8px 14px;
+  border: 1px solid var(--color-control-border);
+  border-radius: var(--radius-sm);
+  background: var(--color-surface);
+}
+
+.pagination button:disabled,
+.notification-pagination button:disabled {
+  opacity: 0.5;
+}
+
+.friends-empty,
+.notifications-empty {
+  text-align: center;
+  border: 1px dashed var(--color-control-border);
+  border-radius: var(--radius-lg);
+}
+
+.friends-empty h2,
+.notifications-empty h2 {
+  margin: 0 0 8px;
+}
+
+.friends-empty p,
+.notifications-empty p {
+  margin: 0;
+  color: var(--color-text-secondary);
+}
```

## src/styles/tokens.css

Extract existing tokens and add shared control colours/height without changing their values.

### Full current content

```css
/* ==================================================
   DESIGN SYSTEM / GLOBAL
   ================================================== */

:root {
  --color-bg: #f5f6f8;
  --color-surface: #ffffff;

  --color-text: #222222;
  --color-text-secondary: #666666;
  --color-text-muted: #888888;

  --color-border: #e2e5e9;
  --color-border-light: #eeeeee;

  --color-primary: #222222;
  --color-primary-hover: #111111;

  --color-danger: #b3261e;
  --color-success: #2e7d32;

  --color-hover: #f7f7f7;
  --color-selected: #f0f1f3;
  --color-disabled: #f2f2f2;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;

  --shadow-card: 0 2px 10px rgba(0, 0, 0, 0.05);
  --shadow-menu: 0 8px 24px rgba(0, 0, 0, 0.1);

  --navbar-height: 64px;

  --page-padding-x: 20px;
  --page-padding-y: 35px;

  --transition-fast: 0.15s ease;
  /* Shared control colours; retain existing values during migration. */
  --color-control-border: #cccccc;
  --color-outline: #555555;
  --color-text-strong: #333333;
  --color-text-subtle: #777777;
  --color-item-border: #e5e5e5;
  --color-on-primary: #ffffff;
  --control-height: 44px;
}

```

### Changes (+ added / - removed)

```diff
--- /dev/null
+++ after/src/styles/tokens.css
@@ -0,0 +1,49 @@
+/* ==================================================
+   DESIGN SYSTEM / GLOBAL
+   ================================================== */
+
+:root {
+  --color-bg: #f5f6f8;
+  --color-surface: #ffffff;
+
+  --color-text: #222222;
+  --color-text-secondary: #666666;
+  --color-text-muted: #888888;
+
+  --color-border: #e2e5e9;
+  --color-border-light: #eeeeee;
+
+  --color-primary: #222222;
+  --color-primary-hover: #111111;
+
+  --color-danger: #b3261e;
+  --color-success: #2e7d32;
+
+  --color-hover: #f7f7f7;
+  --color-selected: #f0f1f3;
+  --color-disabled: #f2f2f2;
+
+  --radius-sm: 6px;
+  --radius-md: 8px;
+  --radius-lg: 10px;
+  --radius-xl: 12px;
+
+  --shadow-card: 0 2px 10px rgba(0, 0, 0, 0.05);
+  --shadow-menu: 0 8px 24px rgba(0, 0, 0, 0.1);
+
+  --navbar-height: 64px;
+
+  --page-padding-x: 20px;
+  --page-padding-y: 35px;
+
+  --transition-fast: 0.15s ease;
+  /* Shared control colours; retain existing values during migration. */
+  --color-control-border: #cccccc;
+  --color-outline: #555555;
+  --color-text-strong: #333333;
+  --color-text-subtle: #777777;
+  --color-item-border: #e5e5e5;
+  --color-on-primary: #ffffff;
+  --control-height: 44px;
+}
+
```

## src/index.css

Load foundation styles; remove migrated rules; retain feature styles and responsive behaviour.

### Full current content

```css
/* Foundation first; existing feature selectors remain compatible with current markup. */
@import "./styles/tokens.css";
@import "./styles/base.css";
@import "./styles/shared.css";

/* ==================================================
   AUTH
   ================================================== */

.auth-page {
  min-height: 100vh;
  min-height: 100dvh;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 20px;
}

.auth-card {
  width: min(380px, 100%);

  background: var(--color-surface);

  padding: 30px;

  border-radius: var(--radius-xl);

  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.auth-card h1 {
  margin-top: 0;
}

.auth-card h2 {
  margin-bottom: 25px;
}

.auth-card form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.auth-card input {
  padding: 12px;

  border-radius: var(--radius-sm);

}

.auth-card input:focus {
  border-color: var(--color-outline);
}

.auth-card button {
  width: 100%;
}

/* ==================================================
   COMMON
   ================================================== */

.error {
  color: #d32f2f;
  margin: 10px 0;
}

.success {
  color: var(--color-success);
  margin: 10px 0;
}

.loading-screen {
  min-height: 100vh;
  min-height: 100dvh;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 20px;

  font-size: 18px;
  color: var(--color-text-secondary);

  text-align: center;
}

/* ==================================================
   NAVBAR
   ================================================== */

.navbar {
  position: sticky;
  top: 0;

  z-index: 1000;

  width: 100%;
  min-height: var(--navbar-height);

  padding: 0 30px;

  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);

  display: flex;
  align-items: center;
  justify-content: space-between;
}

.navbar-left {
  min-width: 0;

  display: flex;
  align-items: center;
}

.navbar-brand {
  color: var(--color-text);

  text-decoration: none;

  font-size: 22px;
  font-weight: 700;

  white-space: nowrap;
}

.navbar-right {
  display: flex;
  align-items: center;

  gap: 20px;
}

.navbar-link {
  position: relative;

  min-height: 40px;

  display: inline-flex;
  align-items: center;

  color: var(--color-text-strong);

  text-decoration: none;

  white-space: nowrap;

  font-size: 14px;
}

.navbar-link:hover {
  text-decoration: underline;
}

.navbar-user {
  max-width: 160px;

  font-weight: 600;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.navbar-logout {
  min-height: 40px;

  padding: 8px 14px;

  border: none;
  border-radius: var(--radius-sm);

  background: var(--color-primary);
  color: var(--color-on-primary);

  font-weight: 600;

  transition: background var(--transition-fast);
}

.navbar-logout:hover {
  background: var(--color-primary-hover);
}

/* ==================================================
   MOBILE NAVBAR
   ================================================== */

.navbar-menu-toggle {
  display: none;

  width: 42px;
  height: 42px;

  padding: 9px;

  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);

  background: var(--color-surface);

  flex-direction: column;
  align-items: center;
  justify-content: center;

  gap: 4px;
}

.navbar-menu-toggle span {
  width: 20px;
  height: 2px;

  border-radius: 2px;

  background: var(--color-text);
}

.navbar-mobile-menu {
  display: none;
}

/* ==================================================
   HOME
   ================================================== */

.home-page {
  max-width: 1000px;

}

.welcome-section {
  padding: 25px;

  margin-bottom: 25px;

}

.welcome-section h1 {
  margin-top: 0;
  margin-bottom: 12px;

  line-height: 1.2;
}

.welcome-section p {
  margin: 6px 0;

  color: var(--color-text-secondary);
}

/* ==================================================
   SEARCH
   ================================================== */

.user-search {
  background: var(--color-surface);

  padding: 25px;

  border-radius: var(--radius-xl);

  box-shadow: var(--shadow-card);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 15px;

  margin-bottom: 15px;
}

.section-header h2,
.section-header h3 {
  margin: 0;
}

.search-input {
  min-height: 44px;

  padding: 11px 14px;

  border-radius: var(--radius-md);

  background: var(--color-surface);
}

.search-input:focus {
  border-color: var(--color-outline);
}

.search-status {
  color: var(--color-text-secondary);
}

.user-results {
  display: flex;
  flex-direction: column;

  gap: 10px;

  margin-top: 15px;
}

/* ==================================================
   USER CARD
   ================================================== */

.user-card {
  min-width: 0;

  display: flex;
  align-items: center;

  gap: 14px;

  padding: 12px;

  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);

  background: var(--color-surface);

  cursor: pointer;

  text-decoration: none;
  color: inherit;

  transition:
    background var(--transition-fast),
    transform var(--transition-fast);
}

.user-card-info {
  min-width: 0;
}

.user-card-info h3 {
  margin: 0 0 5px;

  font-size: 16px;
}

.user-card-info p {
  margin: 0;

  color: var(--color-text-secondary);

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ==================================================
   AVATAR
   ================================================== */

.user-avatar {
  flex-shrink: 0;

  object-fit: cover;

  border-radius: 50%;
}

.user-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;

  background: #dddddd;
  color: var(--color-text-strong);

  font-weight: 700;
}

.user-avatar.small {
  width: 36px;
  height: 36px;

  font-size: 14px;
}

.user-avatar.medium {
  width: 48px;
  height: 48px;

  font-size: 18px;
}

.user-avatar.large {
  width: 120px;
  height: 120px;

  font-size: 42px;
}

/* ==================================================
   RECENT SEARCHES
   ================================================== */

.recent-searches {
  margin-top: 30px;
}

.text-button {
  border: none;
  background: transparent;

  color: #444444;

  text-decoration: underline;

  padding: 6px 8px;
}

/* ==================================================
   PAGINATION
   ================================================== */

.pagination {
  margin-top: 20px;
}

/* ==================================================
   PROFILE
   ================================================== */

.profile-page {
  max-width: 700px;

}

.profile-card h1 {
  margin-top: 0;
  margin-bottom: 20px;
}

.profile-image-section {
  display: flex;
  flex-direction: column;

  align-items: center;

  gap: 15px;

  margin: 25px 0;
}

.profile-image {
  width: 120px;
  height: 120px;

  object-fit: cover;

  border-radius: 50%;
}

.profile-image-section button {
  min-height: 40px;

  padding: 8px 14px;

  border: 1px solid var(--color-control-border);
  border-radius: var(--radius-sm);

  background: var(--color-surface);

  font-weight: 600;
}

.profile-form {
  display: flex;
  flex-direction: column;

  gap: 10px;
}

.profile-form label {
  font-weight: 600;

  margin-top: 8px;
}

.profile-form input,
.profile-form textarea {
  padding: 11px;

  border-radius: 7px;

  resize: vertical;

}

.profile-form input:focus,
.profile-form textarea:focus {
  border-color: var(--color-outline);
}

.profile-form input:disabled {
  background: var(--color-disabled);

  color: var(--color-text-secondary);

  cursor: not-allowed;
}

.profile-form button {
  width: 100%;

  min-height: 44px;

  margin-top: 10px;

  padding: 11px;

  border: none;
  border-radius: 7px;

  background: var(--color-primary);
  color: var(--color-on-primary);

  font-weight: 600;
}

.profile-form button:disabled {
  opacity: 0.6;
}

.character-count {
  text-align: right;

  font-size: 12px;

  color: var(--color-text-subtle);
}

.profile-details {
  margin-top: 25px;

  padding-top: 20px;

  border-top: 1px solid var(--color-border-light);

  color: var(--color-outline);
}

.profile-details p {
  margin: 8px 0;
}

.back-link {
  display: inline-block;

  margin-bottom: 20px;

  color: var(--color-text-strong);

  text-decoration: none;

  font-weight: 600;
}

.back-link:hover {
  text-decoration: underline;
}

.user-profile-card {
  max-width: 700px;
  margin: 0 auto;
}

.user-profile-info {
  text-align: center;
}

.user-profile-info h1 {
  margin: 0 0 10px;
}

.user-profile-bio {
  color: var(--color-outline);

  margin: 0;

  line-height: 1.5;
}

/* ==================================================
   REDUCED MOTION
   ================================================== */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}

/* ==================================================
   MOBILE
   ================================================== */

@media (max-width: 700px) {
  :root {
    --navbar-height: 56px;
  }

  .navbar {
    min-height: var(--navbar-height);

    padding: 0 12px;
  }

  .navbar-brand {
    font-size: 20px;
  }

  .navbar-right {
    display: none;
  }

  .navbar-menu-toggle {
    display: flex;
  }

  .navbar-mobile-menu {
    position: absolute;

    top: 100%;
    left: 0;
    right: 0;

    display: flex;
    flex-direction: column;

    max-height: calc(100dvh - var(--navbar-height));

    overflow-y: auto;

    padding: 8px 12px 16px;

    background: var(--color-surface);

    border-bottom: 1px solid var(--color-border);

    box-shadow: var(--shadow-menu);

    visibility: hidden;
    opacity: 0;
    transform: translateY(-8px);

    pointer-events: none;

    transition:
      opacity 0.15s ease,
      transform 0.15s ease,
      visibility 0.15s ease;
  }

  .navbar-mobile-menu.open {
    visibility: visible;
    opacity: 1;
    transform: translateY(0);

    pointer-events: auto;
  }

  .navbar-mobile-user {
    display: flex;
    flex-direction: column;

    padding: 14px 12px;

    margin-bottom: 4px;

    border-bottom: 1px solid var(--color-border-light);
  }

  .navbar-mobile-user-name {
    font-weight: 700;
  }

  .navbar-mobile-user-email {
    margin-top: 3px;

    color: var(--color-text-secondary);

    font-size: 13px;

    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .navbar-mobile-link {
    min-height: 46px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 0 12px;

    border-radius: var(--radius-md);

    color: var(--color-text);

    text-decoration: none;

    font-size: 15px;
    font-weight: 500;
  }

  .navbar-mobile-link:active {
    background: var(--color-hover);
  }

  .navbar-mobile-logout {
    width: 100%;

    min-height: 46px;

    margin-top: 8px;

    border: none;
    border-radius: var(--radius-md);

    background: var(--color-primary);
    color: var(--color-on-primary);

    font-weight: 600;
  }

  .home-page,
  .profile-page {
    padding: 20px 12px;
  }

  .welcome-section,
  .user-search,
  .profile-card {
    padding: 20px;

    border-radius: var(--radius-lg);
  }

  .welcome-section h1 {
    font-size: 24px;
  }

  .section-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .pagination {
    gap: 12px;
  }

  .pagination button {
    min-width: 90px;
  }

  .profile-page {
    padding-top: 20px;
  }

  .profile-card {
    width: 100%;
  }
}

@media (max-width: 380px) {
  .auth-page {
    padding: 12px;
  }

  .auth-card {
    padding: 22px 18px;
  }

  .welcome-section,
  .user-search,
  .profile-card {
    padding: 16px;
  }

  .welcome-section h1 {
    font-size: 22px;
  }
}

/* ==================================================
   DESKTOP-ONLY HOVER
   ================================================== */

@media (hover: hover) and (pointer: fine) {
  .user-card:hover {
    background: #f8f8f8;
    transform: translateY(-1px);
  }
}
```

### Changes (+ added / - removed)

```diff
--- before/src/index.css
+++ after/src/index.css
@@ -1,131 +1,7 @@
-/* ==================================================
-   DESIGN SYSTEM / GLOBAL
-   ================================================== */
-
-:root {
-  --color-bg: #f5f6f8;
-  --color-surface: #ffffff;
-
-  --color-text: #222222;
-  --color-text-secondary: #666666;
-  --color-text-muted: #888888;
-
-  --color-border: #e2e5e9;
-  --color-border-light: #eeeeee;
-
-  --color-primary: #222222;
-  --color-primary-hover: #111111;
-
-  --color-danger: #b3261e;
-  --color-success: #2e7d32;
-
-  --color-hover: #f7f7f7;
-  --color-selected: #f0f1f3;
-  --color-disabled: #f2f2f2;
-
-  --radius-sm: 6px;
-  --radius-md: 8px;
-  --radius-lg: 10px;
-  --radius-xl: 12px;
-
-  --shadow-card: 0 2px 10px rgba(0, 0, 0, 0.05);
-  --shadow-menu: 0 8px 24px rgba(0, 0, 0, 0.1);
-
-  --navbar-height: 64px;
-
-  --page-padding-x: 20px;
-  --page-padding-y: 35px;
-
-  --transition-fast: 0.15s ease;
-}
-
-/* ==================================================
-   RESET
-   ================================================== */
-
-*,
-*::before,
-*::after {
-  box-sizing: border-box;
-}
-
-html {
-  width: 100%;
-  min-height: 100%;
-  overflow-x: hidden;
-}
-
-body {
-  margin: 0;
-
-  width: 100%;
-  min-height: 100vh;
-
-  font-family: Arial, Helvetica, sans-serif;
-
-  background: var(--color-bg);
-  color: var(--color-text);
-
-  line-height: 1.45;
-
-  overflow-x: hidden;
-
-  -webkit-font-smoothing: antialiased;
-  text-rendering: optimizeLegibility;
-}
-
-#root {
-  width: 100%;
-  min-height: 100vh;
-  overflow-x: hidden;
-}
-
-button,
-input,
-textarea,
-select {
-  font: inherit;
-}
-
-button {
-  cursor: pointer;
-}
-
-button:disabled {
-  cursor: not-allowed;
-}
-
-a {
-  color: inherit;
-}
-
-img {
-  max-width: 100%;
-}
-
-input,
-textarea {
-  min-width: 0;
-}
-
-button,
-a,
-input,
-textarea {
-  -webkit-tap-highlight-color: transparent;
-}
-
-/* ==================================================
-   ACCESSIBILITY / FOCUS
-   ================================================== */
-
-button:focus-visible,
-a:focus-visible,
-input:focus-visible,
-textarea:focus-visible {
-  outline: 2px solid #555;
-  outline-offset: 2px;
-}
+/* Foundation first; existing feature selectors remain compatible with current markup. */
+@import "./styles/tokens.css";
+@import "./styles/base.css";
+@import "./styles/shared.css";
 
 /* ==================================================
    AUTH
@@ -169,358 +45,320 @@
 }
 
 .auth-card input {
-  width: 100%;
-
   padding: 12px;
 
-  border: 1px solid #cccccc;
   border-radius: var(--radius-sm);
 
-  outline: none;
 }
 
 .auth-card input:focus {
-  border-color: #555555;
+  border-color: var(--color-outline);
 }
 
 .auth-card button {
   width: 100%;
-
-  min-height: 44px;
-
-  padding: 12px;
+}
+
+/* ==================================================
+   COMMON
+   ================================================== */
+
+.error {
+  color: #d32f2f;
+  margin: 10px 0;
+}
+
+.success {
+  color: var(--color-success);
+  margin: 10px 0;
+}
+
+.loading-screen {
+  min-height: 100vh;
+  min-height: 100dvh;
+
+  display: flex;
+  align-items: center;
+  justify-content: center;
+
+  padding: 20px;
+
+  font-size: 18px;
+  color: var(--color-text-secondary);
+
+  text-align: center;
+}
+
+/* ==================================================
+   NAVBAR
+   ================================================== */
+
+.navbar {
+  position: sticky;
+  top: 0;
+
+  z-index: 1000;
+
+  width: 100%;
+  min-height: var(--navbar-height);
+
+  padding: 0 30px;
+
+  background: var(--color-surface);
+  border-bottom: 1px solid var(--color-border);
+
+  display: flex;
+  align-items: center;
+  justify-content: space-between;
+}
+
+.navbar-left {
+  min-width: 0;
+
+  display: flex;
+  align-items: center;
+}
+
+.navbar-brand {
+  color: var(--color-text);
+
+  text-decoration: none;
+
+  font-size: 22px;
+  font-weight: 700;
+
+  white-space: nowrap;
+}
+
+.navbar-right {
+  display: flex;
+  align-items: center;
+
+  gap: 20px;
+}
+
+.navbar-link {
+  position: relative;
+
+  min-height: 40px;
+
+  display: inline-flex;
+  align-items: center;
+
+  color: var(--color-text-strong);
+
+  text-decoration: none;
+
+  white-space: nowrap;
+
+  font-size: 14px;
+}
+
+.navbar-link:hover {
+  text-decoration: underline;
+}
+
+.navbar-user {
+  max-width: 160px;
+
+  font-weight: 600;
+
+  white-space: nowrap;
+  overflow: hidden;
+  text-overflow: ellipsis;
+}
+
+.navbar-logout {
+  min-height: 40px;
+
+  padding: 8px 14px;
 
   border: none;
   border-radius: var(--radius-sm);
 
   background: var(--color-primary);
-  color: white;
+  color: var(--color-on-primary);
 
   font-weight: 600;
+
+  transition: background var(--transition-fast);
+}
+
+.navbar-logout:hover {
+  background: var(--color-primary-hover);
+}
+
+/* ==================================================
+   MOBILE NAVBAR
+   ================================================== */
+
+.navbar-menu-toggle {
+  display: none;
+
+  width: 42px;
+  height: 42px;
+
+  padding: 9px;
+
+  border: 1px solid var(--color-border);
+  border-radius: var(--radius-md);
+
+  background: var(--color-surface);
+
+  flex-direction: column;
+  align-items: center;
+  justify-content: center;
+
+  gap: 4px;
+}
+
+.navbar-menu-toggle span {
+  width: 20px;
+  height: 2px;
+
+  border-radius: 2px;
+
+  background: var(--color-text);
+}
+
+.navbar-mobile-menu {
+  display: none;
+}
+
+/* ==================================================
+   HOME
+   ================================================== */
+
+.home-page {
+  max-width: 1000px;
+
+}
+
+.welcome-section {
+  padding: 25px;
+
+  margin-bottom: 25px;
+
+}
+
+.welcome-section h1 {
+  margin-top: 0;
+  margin-bottom: 12px;
+
+  line-height: 1.2;
+}
+
+.welcome-section p {
+  margin: 6px 0;
+
+  color: var(--color-text-secondary);
+}
+
+/* ==================================================
+   SEARCH
+   ================================================== */
+
+.user-search {
+  background: var(--color-surface);
+
+  padding: 25px;
+
+  border-radius: var(--radius-xl);
+
+  box-shadow: var(--shadow-card);
+}
+
+.section-header {
+  display: flex;
+  align-items: center;
+  justify-content: space-between;
+
+  gap: 15px;
+
+  margin-bottom: 15px;
+}
+
+.section-header h2,
+.section-header h3 {
+  margin: 0;
+}
+
+.search-input {
+  min-height: 44px;
+
+  padding: 11px 14px;
+
+  border-radius: var(--radius-md);
+
+  background: var(--color-surface);
+}
+
+.search-input:focus {
+  border-color: var(--color-outline);
+}
+
+.search-status {
+  color: var(--color-text-secondary);
+}
+
+.user-results {
+  display: flex;
+  flex-direction: column;
+
+  gap: 10px;
+
+  margin-top: 15px;
+}
+
+/* ==================================================
+   USER CARD
+   ================================================== */
+
+.user-card {
+  min-width: 0;
+
+  display: flex;
+  align-items: center;
+
+  gap: 14px;
+
+  padding: 12px;
+
+  border: 1px solid var(--color-border);
+  border-radius: var(--radius-lg);
+
+  background: var(--color-surface);
+
+  cursor: pointer;
+
+  text-decoration: none;
+  color: inherit;
 
   transition:
     background var(--transition-fast),
     transform var(--transition-fast);
 }
 
-.auth-card button:disabled {
-  opacity: 0.6;
-}
-
-/* ==================================================
-   COMMON
-   ================================================== */
-
-.error {
-  color: #d32f2f;
-  margin: 10px 0;
-}
-
-.success {
-  color: var(--color-success);
-  margin: 10px 0;
-}
-
-.loading-screen {
-  min-height: 100vh;
-  min-height: 100dvh;
-
-  display: flex;
-  align-items: center;
-  justify-content: center;
-
-  padding: 20px;
-
-  font-size: 18px;
+.user-card-info {
+  min-width: 0;
+}
+
+.user-card-info h3 {
+  margin: 0 0 5px;
+
+  font-size: 16px;
+}
+
+.user-card-info p {
+  margin: 0;
+
   color: var(--color-text-secondary);
-
-  text-align: center;
-}
-
-/* ==================================================
-   NAVBAR
-   ================================================== */
-
-.navbar {
-  position: sticky;
-  top: 0;
-
-  z-index: 1000;
-
-  width: 100%;
-  min-height: var(--navbar-height);
-
-  padding: 0 30px;
-
-  background: var(--color-surface);
-  border-bottom: 1px solid var(--color-border);
-
-  display: flex;
-  align-items: center;
-  justify-content: space-between;
-}
-
-.navbar-left {
-  min-width: 0;
-
-  display: flex;
-  align-items: center;
-}
-
-.navbar-brand {
-  color: var(--color-text);
-
-  text-decoration: none;
-
-  font-size: 22px;
-  font-weight: 700;
-
-  white-space: nowrap;
-}
-
-.navbar-right {
-  display: flex;
-  align-items: center;
-
-  gap: 20px;
-}
-
-.navbar-link {
-  position: relative;
-
-  min-height: 40px;
-
-  display: inline-flex;
-  align-items: center;
-
-  color: #333333;
-
-  text-decoration: none;
-
-  white-space: nowrap;
-
-  font-size: 14px;
-}
-
-.navbar-link:hover {
-  text-decoration: underline;
-}
-
-.navbar-user {
-  max-width: 160px;
-
-  font-weight: 600;
 
   white-space: nowrap;
   overflow: hidden;
   text-overflow: ellipsis;
 }
 
-.navbar-logout {
-  min-height: 40px;
-
-  padding: 8px 14px;
-
-  border: none;
-  border-radius: var(--radius-sm);
-
-  background: var(--color-primary);
-  color: white;
-
-  font-weight: 600;
-
-  transition: background var(--transition-fast);
-}
-
-.navbar-logout:hover {
-  background: var(--color-primary-hover);
-}
-
-/* ==================================================
-   MOBILE NAVBAR
-   ================================================== */
-
-.navbar-menu-toggle {
-  display: none;
-
-  width: 42px;
-  height: 42px;
-
-  padding: 9px;
-
-  border: 1px solid var(--color-border);
-  border-radius: var(--radius-md);
-
-  background: white;
-
-  flex-direction: column;
-  align-items: center;
-  justify-content: center;
-
-  gap: 4px;
-}
-
-.navbar-menu-toggle span {
-  width: 20px;
-  height: 2px;
-
-  border-radius: 2px;
-
-  background: var(--color-text);
-}
-
-.navbar-mobile-menu {
-  display: none;
-}
-
-/* ==================================================
-   HOME
-   ================================================== */
-
-.home-page {
-  width: 100%;
-  max-width: 1000px;
-
-  margin: 0 auto;
-
-  padding: var(--page-padding-y) var(--page-padding-x);
-}
-
-.welcome-section {
-  background: var(--color-surface);
-
-  padding: 25px;
-
-  border-radius: var(--radius-xl);
-
-  margin-bottom: 25px;
-
-  box-shadow: var(--shadow-card);
-}
-
-.welcome-section h1 {
-  margin-top: 0;
-  margin-bottom: 12px;
-
-  line-height: 1.2;
-}
-
-.welcome-section p {
-  margin: 6px 0;
-
-  color: var(--color-text-secondary);
-}
-
-/* ==================================================
-   SEARCH
-   ================================================== */
-
-.user-search {
-  background: var(--color-surface);
-
-  padding: 25px;
-
-  border-radius: var(--radius-xl);
-
-  box-shadow: var(--shadow-card);
-}
-
-.section-header {
-  display: flex;
-  align-items: center;
-  justify-content: space-between;
-
-  gap: 15px;
-
-  margin-bottom: 15px;
-}
-
-.section-header h2,
-.section-header h3 {
-  margin: 0;
-}
-
-.search-input {
-  width: 100%;
-
-  min-height: 44px;
-
-  padding: 11px 14px;
-
-  border: 1px solid #cccccc;
-  border-radius: var(--radius-md);
-
-  outline: none;
-
-  background: white;
-}
-
-.search-input:focus {
-  border-color: #555555;
-}
-
-.search-status {
-  color: var(--color-text-secondary);
-}
-
-.user-results {
-  display: flex;
-  flex-direction: column;
-
-  gap: 10px;
-
-  margin-top: 15px;
-}
-
-/* ==================================================
-   USER CARD
-   ================================================== */
-
-.user-card {
-  min-width: 0;
-
-  display: flex;
-  align-items: center;
-
-  gap: 14px;
-
-  padding: 12px;
-
-  border: 1px solid var(--color-border);
-  border-radius: var(--radius-lg);
-
-  background: white;
-
-  cursor: pointer;
-
-  text-decoration: none;
-  color: inherit;
-
-  transition:
-    background var(--transition-fast),
-    transform var(--transition-fast);
-}
-
-.user-card-info {
-  min-width: 0;
-}
-
-.user-card-info h3 {
-  margin: 0 0 5px;
-
-  font-size: 16px;
-}
-
-.user-card-info p {
-  margin: 0;
-
-  color: var(--color-text-secondary);
-
-  white-space: nowrap;
-  overflow: hidden;
-  text-overflow: ellipsis;
-}
-
 /* ==================================================
    AVATAR
    ================================================== */
@@ -539,7 +377,7 @@
   justify-content: center;
 
   background: #dddddd;
-  color: #333333;
+  color: var(--color-text-strong);
 
   font-weight: 700;
 }
@@ -589,51 +427,16 @@
    ================================================== */
 
 .pagination {
-  display: flex;
-  align-items: center;
-  justify-content: center;
-
-  gap: 20px;
-
   margin-top: 20px;
 }
 
-.pagination button {
-  min-height: 40px;
-
-  padding: 8px 14px;
-
-  border: 1px solid #cccccc;
-  border-radius: var(--radius-sm);
-
-  background: white;
-}
-
-.pagination button:disabled {
-  opacity: 0.5;
-}
-
 /* ==================================================
    PROFILE
    ================================================== */
 
 .profile-page {
-  width: 100%;
   max-width: 700px;
 
-  margin: 0 auto;
-
-  padding: var(--page-padding-y) var(--page-padding-x);
-}
-
-.profile-card {
-  background: white;
-
-  padding: 30px;
-
-  border-radius: var(--radius-xl);
-
-  box-shadow: var(--shadow-card);
 }
 
 .profile-card h1 {
@@ -666,10 +469,10 @@
 
   padding: 8px 14px;
 
-  border: 1px solid #cccccc;
+  border: 1px solid var(--color-control-border);
   border-radius: var(--radius-sm);
 
-  background: white;
+  background: var(--color-surface);
 
   font-weight: 600;
 }
@@ -689,27 +492,23 @@
 
 .profile-form input,
 .profile-form textarea {
-  width: 100%;
-
   padding: 11px;
 
-  border: 1px solid #cccccc;
   border-radius: 7px;
 
   resize: vertical;
 
-  outline: none;
 }
 
 .profile-form input:focus,
 .profile-form textarea:focus {
-  border-color: #555555;
+  border-color: var(--color-outline);
 }
 
 .profile-form input:disabled {
   background: var(--color-disabled);
 
-  color: #666666;
+  color: var(--color-text-secondary);
 
   cursor: not-allowed;
 }
@@ -727,7 +526,7 @@
   border-radius: 7px;
 
   background: var(--color-primary);
-  color: white;
+  color: var(--color-on-primary);
 
   font-weight: 600;
 }
@@ -741,7 +540,7 @@
 
   font-size: 12px;
 
-  color: #777777;
+  color: var(--color-text-subtle);
 }
 
 .profile-details {
@@ -751,7 +550,7 @@
 
   border-top: 1px solid var(--color-border-light);
 
-  color: #555555;
+  color: var(--color-outline);
 }
 
 .profile-details p {
@@ -763,7 +562,7 @@
 
   margin-bottom: 20px;
 
-  color: #333333;
+  color: var(--color-text-strong);
 
   text-decoration: none;
 
@@ -788,7 +587,7 @@
 }
 
 .user-profile-bio {
-  color: #555555;
+  color: var(--color-outline);
 
   margin: 0;
 
@@ -852,7 +651,7 @@
 
     padding: 8px 12px 16px;
 
-    background: white;
+    background: var(--color-surface);
 
     border-bottom: 1px solid var(--color-border);
 
@@ -939,7 +738,7 @@
     border-radius: var(--radius-md);
 
     background: var(--color-primary);
-    color: white;
+    color: var(--color-on-primary);
 
     font-weight: 600;
   }
```

## src/pages/ForgotPassword.jsx

Adopt Button; retain existing form handlers, native types and disabled conditions.

### Full current content

```jsx
import Button from "../components/ui/Button";
import { useState } from "react";
import { Link } from "react-router-dom";

import { forgotPassword } from "../api/authApi";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await forgotPassword(email);

      /*
       * Always show the same message.
       *
       * This prevents revealing whether
       * the email exists in FrndBook.
       */
      setSuccess(
        "If an account exists for this email, a password reset link has been sent.",
      );
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message || "Unable to process your request",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>FrndBook</h1>

        <h2>Forgot Password</h2>

        <p>
          Enter your email and we'll send you a password reset link if an
          account exists.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {error && <p className="error">{error}</p>}

          {success && <p className="success">{success}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <p>
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/ForgotPassword.jsx
+++ after/src/pages/ForgotPassword.jsx
@@ -1,3 +1,4 @@
+import Button from "../components/ui/Button";
 import { useState } from "react";
 import { Link } from "react-router-dom";
 
@@ -66,9 +67,9 @@
 
           {success && <p className="success">{success}</p>}
 
-          <button type="submit" disabled={loading}>
+          <Button type="submit" disabled={loading}>
             {loading ? "Sending..." : "Send Reset Link"}
-          </button>
+          </Button>
         </form>
 
         <p>
```

## src/pages/FriendRequests.jsx

Adopt PageContainer and Card; preserve existing DOM tags, feature classes, data flow and handlers.

### Full current content

```jsx
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { useEffect, useState } from "react";

import Navbar from "../components/layout/Navbar";

import FriendRequestCard from "../components/users/FriendRequestCard";

import {
  getReceivedFriendRequests,
  getSentFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
} from "../api/friendApi";

const FriendRequests = () => {
  const [receivedRequests, setReceivedRequests] = useState([]);

  const [sentRequests, setSentRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [actionRequestId, setActionRequestId] = useState(null);

  // ==================================================
  // LOAD REQUESTS
  // ==================================================

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const [received, sent] = await Promise.all([
        getReceivedFriendRequests(),
        getSentFriendRequests(),
      ]);

      setReceivedRequests(received || []);
      setSentRequests(sent || []);
    } catch (error) {
      console.error("Failed to load friend requests:", error);

      setError(
        error.response?.data?.message || "Unable to load friend requests",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // ==================================================
  // ACCEPT
  // ==================================================

  const handleAccept = async (requestId) => {
    try {
      setError("");
      setActionRequestId(requestId);

      await acceptFriendRequest(requestId);

      setReceivedRequests((requests) =>
        requests.filter((request) => request.id !== requestId),
      );
    } catch (error) {
      console.error("Failed to accept friend request:", error);

      setError(
        error.response?.data?.message || "Unable to accept friend request",
      );
    } finally {
      setActionRequestId(null);
    }
  };

  // ==================================================
  // REJECT
  // ==================================================

  const handleReject = async (requestId) => {
    try {
      setError("");
      setActionRequestId(requestId);

      await rejectFriendRequest(requestId);

      setReceivedRequests((requests) =>
        requests.filter((request) => request.id !== requestId),
      );
    } catch (error) {
      console.error("Failed to reject friend request:", error);

      setError(
        error.response?.data?.message || "Unable to reject friend request",
      );
    } finally {
      setActionRequestId(null);
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="loading-screen">Loading friend requests...</div>
      </>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <>
      <Navbar />

      <PageContainer className="friend-requests-page">
        <Card className="friend-requests-card">
          <div className="friends-header">
            <div>
              <h1>Friend Requests</h1>

              <p>Manage your incoming and outgoing requests.</p>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          {/* ========================================
              RECEIVED
              ======================================== */}

          <section className="request-section">
            <div className="request-section-header">
              <h2>Received</h2>

              <span>{receivedRequests.length}</span>
            </div>

            {receivedRequests.length === 0 ? (
              <p className="request-empty">No pending friend requests.</p>
            ) : (
              <div className="friend-request-list">
                {receivedRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    type="received"
                    onAccept={handleAccept}
                    onReject={handleReject}
                    actionLoading={actionRequestId === request.id}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ========================================
              SENT
              ======================================== */}

          <section className="request-section">
            <div className="request-section-header">
              <h2>Sent</h2>

              <span>{sentRequests.length}</span>
            </div>

            {sentRequests.length === 0 ? (
              <p className="request-empty">No pending sent requests.</p>
            ) : (
              <div className="friend-request-list">
                {sentRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    type="sent"
                  />
                ))}
              </div>
            )}
          </section>
        </Card>
      </PageContainer>
    </>
  );
};

export default FriendRequests;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/FriendRequests.jsx
+++ after/src/pages/FriendRequests.jsx
@@ -1,3 +1,5 @@
+import PageContainer from "../components/ui/PageContainer";
+import Card from "../components/ui/Card";
 import { useEffect, useState } from "react";
 
 import Navbar from "../components/layout/Navbar";
@@ -125,8 +127,8 @@
     <>
       <Navbar />
 
-      <main className="friend-requests-page">
-        <div className="friend-requests-card">
+      <PageContainer className="friend-requests-page">
+        <Card className="friend-requests-card">
           <div className="friends-header">
             <div>
               <h1>Friend Requests</h1>
@@ -191,8 +193,8 @@
               </div>
             )}
           </section>
-        </div>
-      </main>
+        </Card>
+      </PageContainer>
     </>
   );
 };
```

## src/pages/Friends.jsx

Adopt PageContainer and Card; preserve existing DOM tags, feature classes, data flow and handlers.

### Full current content

```jsx
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { useEffect, useState } from "react";

import Navbar from "../components/layout/Navbar";

import FriendCard from "../components/users/FriendCard";

import { getFriends, removeFriend } from "../api/friendApi";

const Friends = () => {
  const [friends, setFriends] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [removingFriendId, setRemovingFriendId] = useState(null);

  // ==================================================
  // LOAD FRIENDS
  // ==================================================

  const loadFriends = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getFriends();

      setFriends(data || []);
    } catch (error) {
      console.error("Failed to load friends:", error);

      setError(error.response?.data?.message || "Unable to load friends");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  // ==================================================
  // REMOVE FRIEND
  // ==================================================

  const handleRemoveFriend = async (friend) => {
    if (!friend) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove ${friend.name} from your friends?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setRemovingFriendId(friend.id);

      await removeFriend(friend.id);

      setFriends((currentFriends) =>
        currentFriends.filter(
          (currentFriend) => currentFriend.id !== friend.id,
        ),
      );
    } catch (error) {
      console.error("Failed to remove friend:", error);

      setError(error.response?.data?.message || "Unable to remove friend");
    } finally {
      setRemovingFriendId(null);
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="loading-screen">Loading friends...</div>
      </>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <>
      <Navbar />

      <PageContainer className="friends-page">
        <Card className="friends-card">
          <div className="friends-header">
            <div>
              <h1>Friends</h1>

              <p>
                {friends.length} {friends.length === 1 ? "friend" : "friends"}
              </p>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          {!error && friends.length === 0 && (
            <div className="friends-empty">
              <h2>No friends yet</h2>

              <p>Search for people and send them a friend request.</p>
            </div>
          )}

          {friends.length > 0 && (
            <div className="friends-list">
              {friends.map((friend) => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  onRemove={handleRemoveFriend}
                  removing={removingFriendId === friend.id}
                />
              ))}
            </div>
          )}
        </Card>
      </PageContainer>
    </>
  );
};

export default Friends;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/Friends.jsx
+++ after/src/pages/Friends.jsx
@@ -1,3 +1,5 @@
+import PageContainer from "../components/ui/PageContainer";
+import Card from "../components/ui/Card";
 import { useEffect, useState } from "react";
 
 import Navbar from "../components/layout/Navbar";
@@ -99,8 +101,8 @@
     <>
       <Navbar />
 
-      <main className="friends-page">
-        <div className="friends-card">
+      <PageContainer className="friends-page">
+        <Card className="friends-card">
           <div className="friends-header">
             <div>
               <h1>Friends</h1>
@@ -133,8 +135,8 @@
               ))}
             </div>
           )}
-        </div>
-      </main>
+        </Card>
+      </PageContainer>
     </>
   );
 };
```

## src/pages/Home.jsx

Adopt PageContainer and Card; preserve existing DOM tags, feature classes, data flow and handlers.

### Full current content

```jsx
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import Navbar from "../components/layout/Navbar";

import UserSearch from "../components/users/UserSearch";

import { useAuth } from "../auth/AuthContext";

const Home = () => {
  const { user } = useAuth();

  return (
    <>
      <Navbar />

      <PageContainer className="home-page">
        <Card as="section" className="welcome-section">
          <h1>Welcome to FrndBook</h1>

          <p>Hello, {user?.name}</p>

          <p>{user?.email}</p>
        </Card>

        <UserSearch />
      </PageContainer>
    </>
  );
};

export default Home;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/Home.jsx
+++ after/src/pages/Home.jsx
@@ -1,3 +1,5 @@
+import PageContainer from "../components/ui/PageContainer";
+import Card from "../components/ui/Card";
 import Navbar from "../components/layout/Navbar";
 
 import UserSearch from "../components/users/UserSearch";
@@ -11,17 +13,17 @@
     <>
       <Navbar />
 
-      <main className="home-page">
-        <section className="welcome-section">
+      <PageContainer className="home-page">
+        <Card as="section" className="welcome-section">
           <h1>Welcome to FrndBook</h1>
 
           <p>Hello, {user?.name}</p>
 
           <p>{user?.email}</p>
-        </section>
+        </Card>
 
         <UserSearch />
-      </main>
+      </PageContainer>
     </>
   );
 };
```

## src/pages/Login.jsx

Adopt Button; retain existing form handlers, native types and disabled conditions.

### Full current content

```jsx
import Button from "../components/ui/Button";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

const Login = () => {
  const navigate = useNavigate();

  const { login } = useAuth();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(email, password);

      navigate("/");
    } catch (error) {
      console.error(error);

      setError(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>FrndBook</h1>

        <h2>Login</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && <p className="error">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <p>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        <p>
          Don't have an account? <Link to="/signup">Signup</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/Login.jsx
+++ after/src/pages/Login.jsx
@@ -1,3 +1,4 @@
+import Button from "../components/ui/Button";
 import { useState } from "react";
 import { Link, useNavigate } from "react-router-dom";
 
@@ -61,9 +62,9 @@
 
           {error && <p className="error">{error}</p>}
 
-          <button type="submit" disabled={loading}>
+          <Button type="submit" disabled={loading}>
             {loading ? "Logging in..." : "Login"}
-          </button>
+          </Button>
         </form>
 
         <p>
```

## src/pages/Notifications.jsx

Adopt PageContainer and Card; preserve existing DOM tags, feature classes, data flow and handlers.

### Full current content

```jsx
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { useEffect, useState } from "react";

import Navbar from "../components/layout/Navbar";

import { useNotifications } from "../context/NotificationContext";

const PAGE_SIZE = 10;

const Notifications = () => {
  const {
    notifications,
    loading,
    error,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [page, setPage] = useState(0);

  const [totalPages, setTotalPages] = useState(0);

  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [markAllLoading, setMarkAllLoading] = useState(false);

  const [actionError, setActionError] = useState("");

  // ==================================================
  // LOAD PAGE
  // ==================================================

  const loadPage = async (nextPage) => {
    try {
      setActionError("");

      const data = await loadNotifications(nextPage, PAGE_SIZE);

      setPage(data?.number ?? nextPage);
      setTotalPages(data?.totalPages ?? 0);
    } catch (error) {
      console.error("Failed to load notification page:", error);
    }
  };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    loadPage(0);
  }, []);

  // ==================================================
  // MARK ONE AS READ
  // ==================================================

  const handleMarkAsRead = async (notificationId) => {
    try {
      setActionError("");
      setActionLoadingId(notificationId);

      await markAsRead(notificationId);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);

      setActionError(
        error.response?.data?.message || "Unable to mark notification as read",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // ==================================================
  // MARK ALL AS READ
  // ==================================================

  const handleMarkAllAsRead = async () => {
    try {
      setActionError("");
      setMarkAllLoading(true);

      await markAllAsRead();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);

      setActionError(
        error.response?.data?.message ||
          "Unable to mark all notifications as read",
      );
    } finally {
      setMarkAllLoading(false);
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading && notifications.length === 0) {
    return (
      <>
        <Navbar />

        <div className="loading-screen">Loading notifications...</div>
      </>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <>
      <Navbar />

      <PageContainer className="notifications-page">
        <Card className="notifications-card">
          <div className="notifications-header">
            <div>
              <h1>Notifications</h1>

              <p>Stay up to date with your FrndBook activity.</p>
            </div>

            {notifications.some((notification) => !notification.read) && (
              <button
                type="button"
                className="notifications-mark-all"
                onClick={handleMarkAllAsRead}
                disabled={markAllLoading}
              >
                {markAllLoading ? "Marking..." : "Mark all as read"}
              </button>
            )}
          </div>

          {(error || actionError) && (
            <p className="error">{actionError || error}</p>
          )}

          {notifications.length === 0 && !error && (
            <div className="notifications-empty">
              <h2>No notifications yet</h2>

              <p>You're all caught up. New activity will appear here.</p>
            </div>
          )}

          {notifications.length > 0 && (
            <div className="notification-list">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`notification-item ${
                    notification.read
                      ? "notification-read"
                      : "notification-unread"
                  }`}
                >
                  <div className="notification-indicator">
                    {!notification.read && (
                      <span
                        className="notification-unread-dot"
                        aria-label="Unread"
                      />
                    )}
                  </div>

                  <div className="notification-content">
                    <p className="notification-message">
                      {notification.message}
                    </p>

                    <div className="notification-meta">
                      <span>
                        {notification.createdAt
                          ? new Date(notification.createdAt).toLocaleString()
                          : ""}
                      </span>

                      {notification.type && (
                        <span className="notification-type">
                          {notification.type}
                        </span>
                      )}
                    </div>
                  </div>

                  {!notification.read && (
                    <button
                      type="button"
                      className="notification-read-button"
                      onClick={() => handleMarkAsRead(notification.id)}
                      disabled={actionLoadingId === notification.id}
                    >
                      {actionLoadingId === notification.id
                        ? "..."
                        : "Mark read"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="notification-pagination">
              <button
                type="button"
                disabled={loading || page === 0}
                onClick={() => loadPage(page - 1)}
              >
                Previous
              </button>

              <span>
                Page {page + 1} of {totalPages}
              </span>

              <button
                type="button"
                disabled={loading || page >= totalPages - 1}
                onClick={() => loadPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </Card>
      </PageContainer>
    </>
  );
};

export default Notifications;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/Notifications.jsx
+++ after/src/pages/Notifications.jsx
@@ -1,3 +1,5 @@
+import PageContainer from "../components/ui/PageContainer";
+import Card from "../components/ui/Card";
 import { useEffect, useState } from "react";
 
 import Navbar from "../components/layout/Navbar";
@@ -116,8 +118,8 @@
     <>
       <Navbar />
 
-      <main className="notifications-page">
-        <div className="notifications-card">
+      <PageContainer className="notifications-page">
+        <Card className="notifications-card">
           <div className="notifications-header">
             <div>
               <h1>Notifications</h1>
@@ -229,8 +231,8 @@
               </button>
             </div>
           )}
-        </div>
-      </main>
+        </Card>
+      </PageContainer>
     </>
   );
 };
```

## src/pages/Profile.jsx

Adopt PageContainer and Card; preserve existing DOM tags, feature classes, data flow and handlers.

### Full current content

```jsx
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { useEffect, useRef, useState } from "react";

import Navbar from "../components/layout/Navbar";

import UserAvatar from "../components/users/UserAvatar";

import { updateProfile, updateProfileImage } from "../api/userApi";

import { useAuth } from "../auth/AuthContext";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState(user);

  const [name, setName] = useState(user?.name || "");

  const [bio, setBio] = useState(user?.bio || "");

  const [loading, setLoading] = useState(false);

  const [imageLoading, setImageLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [previewImage, setPreviewImage] = useState(null);

  const fileInputRef = useRef(null);

  // ==================================================
  // SYNC USER
  // ==================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfile(user);
    setName(user.name || "");
    setBio(user.bio || "");
  }, [user]);

  // ==================================================
  // CLEANUP PREVIEW
  // ==================================================

  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  // ==================================================
  // UPDATE PROFILE
  // ==================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const updatedUser = await updateProfile(name.trim(), bio.trim());

      setProfile(updatedUser);
      setName(updatedUser.name || "");
      setBio(updatedUser.bio || "");

      setSuccess("Profile updated successfully.");
    } catch (error) {
      console.error("Profile update failed:", error);

      setError(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // IMAGE SELECTION
  // ==================================================

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setError("");
    setSuccess("");

    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }

    const previewUrl = URL.createObjectURL(file);

    setPreviewImage(previewUrl);

    handleImageUpload(file);
  };

  // ==================================================
  // IMAGE UPLOAD
  // ==================================================

  const handleImageUpload = async (file) => {
    setImageLoading(true);

    setError("");
    setSuccess("");

    try {
      const updatedUser = await updateProfileImage(file);

      setProfile(updatedUser);

      setSuccess("Profile image updated successfully.");

      /*
       * Keep the local preview visible until
       * the profile page is refreshed.
       */
    } catch (error) {
      console.error("Profile image upload failed:", error);

      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }

      setPreviewImage(null);

      setError(
        error.response?.data?.message || "Failed to upload profile image",
      );
    } finally {
      setImageLoading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (authLoading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!profile) {
    return <div className="loading-screen">Unable to load profile.</div>;
  }

  return (
    <>
      <Navbar />

      <PageContainer className="profile-page">
        <Card className="profile-card">
          <h1>My Profile</h1>

          {error && <p className="error">{error}</p>}

          {success && <p className="success">{success}</p>}

          <div className="profile-image-section">
            <UserAvatar
              name={profile.name}
              image={previewImage || profile.profileImage}
              userId={profile.id}
              size="large"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageLoading}
            >
              {imageLoading ? "Uploading..." : "Change Photo"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              hidden
            />
          </div>

          <form className="profile-form" onSubmit={handleSubmit}>
            <label>Name</label>

            <input
              type="text"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              required
            />

            <label>Email</label>

            <input type="email" value={profile.email} disabled />

            <label>Bio</label>

            <textarea
              value={bio}
              maxLength={500}
              rows={5}
              onChange={(event) => setBio(event.target.value)}
            />

            <div className="character-count">{bio.length}/500</div>

            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>

          <div className="profile-details">
            <p>
              <strong>Status:</strong> {profile.status || "—"}
            </p>

            <p>
              <strong>Last seen:</strong>{" "}
              {profile.lastSeen
                ? new Date(profile.lastSeen).toLocaleString()
                : "—"}
            </p>
          </div>
        </Card>
      </PageContainer>
    </>
  );
};

export default Profile;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/Profile.jsx
+++ after/src/pages/Profile.jsx
@@ -1,3 +1,5 @@
+import PageContainer from "../components/ui/PageContainer";
+import Card from "../components/ui/Card";
 import { useEffect, useRef, useState } from "react";
 
 import Navbar from "../components/layout/Navbar";
@@ -171,8 +173,8 @@
     <>
       <Navbar />
 
-      <main className="profile-page">
-        <div className="profile-card">
+      <PageContainer className="profile-page">
+        <Card className="profile-card">
           <h1>My Profile</h1>
 
           {error && <p className="error">{error}</p>}
@@ -247,8 +249,8 @@
                 : "—"}
             </p>
           </div>
-        </div>
-      </main>
+        </Card>
+      </PageContainer>
     </>
   );
 };
```

## src/pages/ResetPassword.jsx

Adopt Button; retain existing form handlers, native types and disabled conditions.

### Full current content

```jsx
import Button from "../components/ui/Button";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { resetPassword } from "../api/authApi";

const ResetPassword = () => {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError("Invalid or missing reset link.");

      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");

      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");

      return;
    }

    setLoading(true);

    try {
      await resetPassword({
        token,
        newPassword: password,
      });

      setSuccess("Password reset successfully. Redirecting to login...");

      window.setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      console.error(error);

      setError(error.response?.data?.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>FrndBook</h1>

        <h2>Reset Password</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />

          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />

          {error && <p className="error">{error}</p>}

          {success && <p className="success">{success}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>

        <p>
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/ResetPassword.jsx
+++ after/src/pages/ResetPassword.jsx
@@ -1,3 +1,4 @@
+import Button from "../components/ui/Button";
 import { useState } from "react";
 import { Link, useNavigate, useSearchParams } from "react-router-dom";
 
@@ -96,9 +97,9 @@
 
           {success && <p className="success">{success}</p>}
 
-          <button type="submit" disabled={loading}>
+          <Button type="submit" disabled={loading}>
             {loading ? "Resetting..." : "Reset Password"}
-          </button>
+          </Button>
         </form>
 
         <p>
```

## src/pages/Signup.jsx

Adopt Button; retain existing form handlers, native types and disabled conditions.

### Full current content

```jsx
import Button from "../components/ui/Button";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

const Signup = () => {
  const navigate = useNavigate();

  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await signup(name, email, password);

      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message || "Unable to send verification code",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>FrndBook</h1>

        <h2>Create Account</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />

          {error && <p className="error">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Sending code..." : "Create Account"}
          </Button>
        </form>

        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/Signup.jsx
+++ after/src/pages/Signup.jsx
@@ -1,3 +1,4 @@
+import Button from "../components/ui/Button";
 import { useState } from "react";
 import { Link, useNavigate } from "react-router-dom";
 
@@ -71,9 +72,9 @@
 
           {error && <p className="error">{error}</p>}
 
-          <button type="submit" disabled={loading}>
+          <Button type="submit" disabled={loading}>
             {loading ? "Sending code..." : "Create Account"}
-          </button>
+          </Button>
         </form>
 
         <p>
```

## src/pages/UserProfile.jsx

Adopt PageContainer and Card; preserve existing DOM tags, feature classes, data flow and handlers.

### Full current content

```jsx
import PageContainer from "../components/ui/PageContainer";
import Card from "../components/ui/Card";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Navbar from "../components/layout/Navbar";

import UserAvatar from "../components/users/UserAvatar";
import FriendAction from "../components/users/FriendAction";

import { getUserById } from "../api/userApi";

import {
  sendFriendRequest,
  getFriends,
  getReceivedFriendRequests,
  getSentFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from "../api/friendApi";

import { useAuth } from "../auth/AuthContext";

import { FRIENDSHIP_STATUS, getFriendshipState } from "../utils/friendship";

const UserProfile = () => {
  const { userId } = useParams();

  const navigate = useNavigate();

  const { user: currentUser } = useAuth();

  const [user, setUser] = useState(null);

  const [friendshipStatus, setFriendshipStatus] = useState(
    FRIENDSHIP_STATUS.NONE,
  );

  const [friendRequestId, setFriendRequestId] = useState(null);

  const [loading, setLoading] = useState(true);

  const [friendshipLoading, setFriendshipLoading] = useState(false);

  const [friendshipLoaded, setFriendshipLoaded] = useState(false);

  const [error, setError] = useState("");

  const [friendshipError, setFriendshipError] = useState("");

  // ==================================================
  // LOAD PROFILE
  // ==================================================

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getUserById(userId);

        setUser(data);
      } catch (error) {
        console.error("Failed to load user profile:", error);

        setError(
          error.response?.data?.message || "Unable to load user profile",
        );
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  // ==================================================
  // LOAD FRIENDSHIP STATE
  // ==================================================

  useEffect(() => {
    if (!user || !currentUser) {
      return;
    }

    if (String(user.id) === String(currentUser.id)) {
      setFriendshipLoaded(true);

      return;
    }

    const loadFriendshipState = async () => {
      try {
        setFriendshipError("");
        setFriendshipLoaded(false);

        const [friends, receivedRequests, sentRequests] = await Promise.all([
          getFriends(),
          getReceivedFriendRequests(),
          getSentFriendRequests(),
        ]);

        const state = getFriendshipState(
          user.id,
          friends || [],
          receivedRequests || [],
          sentRequests || [],
        );

        setFriendshipStatus(state.status);

        setFriendRequestId(state.requestId);
      } catch (error) {
        console.error("Failed to load friendship state:", error);

        setFriendshipError(
          error.response?.data?.message || "Unable to load friendship status",
        );
      } finally {
        setFriendshipLoaded(true);
      }
    };

    loadFriendshipState();
  }, [user, currentUser]);

  // ==================================================
  // ADD FRIEND
  // ==================================================

  const handleAddFriend = async () => {
    if (!user) {
      return;
    }

    try {
      setFriendshipLoading(true);
      setFriendshipError("");

      const request = await sendFriendRequest(user.id);

      setFriendshipStatus(FRIENDSHIP_STATUS.REQUEST_SENT);

      setFriendRequestId(request?.id || null);
    } catch (error) {
      console.error("Failed to send friend request:", error);

      setFriendshipError(
        error.response?.data?.message || "Unable to send friend request",
      );
    } finally {
      setFriendshipLoading(false);
    }
  };

  // ==================================================
  // ACCEPT
  // ==================================================

  const handleAcceptFriend = async () => {
    if (!friendRequestId) {
      return;
    }

    try {
      setFriendshipLoading(true);
      setFriendshipError("");

      await acceptFriendRequest(friendRequestId);

      setFriendshipStatus(FRIENDSHIP_STATUS.FRIENDS);

      setFriendRequestId(null);
    } catch (error) {
      console.error("Failed to accept friend request:", error);

      setFriendshipError(
        error.response?.data?.message || "Unable to accept friend request",
      );
    } finally {
      setFriendshipLoading(false);
    }
  };

  // ==================================================
  // REJECT
  // ==================================================

  const handleRejectFriend = async () => {
    if (!friendRequestId) {
      return;
    }

    try {
      setFriendshipLoading(true);
      setFriendshipError("");

      await rejectFriendRequest(friendRequestId);

      setFriendshipStatus(FRIENDSHIP_STATUS.NONE);

      setFriendRequestId(null);
    } catch (error) {
      console.error("Failed to reject friend request:", error);

      setFriendshipError(
        error.response?.data?.message || "Unable to reject friend request",
      );
    } finally {
      setFriendshipLoading(false);
    }
  };

  // ==================================================
  // REMOVE FRIEND
  // ==================================================

  const handleRemoveFriend = async () => {
    if (!user) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove ${user.name} from your friends?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setFriendshipLoading(true);
      setFriendshipError("");

      await removeFriend(user.id);

      setFriendshipStatus(FRIENDSHIP_STATUS.NONE);
    } catch (error) {
      console.error("Failed to remove friend:", error);

      setFriendshipError(
        error.response?.data?.message || "Unable to remove friend",
      );
    } finally {
      setFriendshipLoading(false);
    }
  };

  // ==================================================
  // OPEN MESSAGE
  // ==================================================

  const handleMessage = () => {
    if (!user) {
      return;
    }

    /*
     * Reuse the existing Messages page flow.
     *
     * Messages.jsx already handles:
     *
     * /messages?userId={userId}
     *
     * and resolves/opens the conversation using
     * getOrCreateConversation().
     */
    navigate(`/messages?userId=${user.id}`);
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="loading-screen">Loading profile...</div>
      </>
    );
  }

  // ==================================================
  // PROFILE ERROR
  // ==================================================

  if (error || !user) {
    return (
      <>
        <Navbar />

        <PageContainer className="profile-page">
          <Card className="profile-card">
            <p className="error">{error || "User not found."}</p>

            <Link to="/" className="back-link">
              ← Back to Home
            </Link>
          </Card>
        </PageContainer>
      </>
    );
  }

  const isOwnProfile = String(user.id) === String(currentUser?.id);

  // ==================================================
  // UI
  // ==================================================

  return (
    <>
      <Navbar />

      <PageContainer className="profile-page">
        <Card className="profile-card user-profile-card">
          <Link to="/" className="back-link">
            ← Back to Home
          </Link>

          <div className="profile-image-section">
            <UserAvatar
              name={user.name}
              image={user.profileImage}
              userId={user.id}
              size="large"
            />
          </div>

          <div className="user-profile-info">
            <h1>{user.name}</h1>

            <p className="user-profile-bio">{user.bio || "No bio available"}</p>

            <div className="profile-details">
              <p>
                <strong>Status:</strong> {user.status || "—"}
              </p>

              <p>
                <strong>Last seen:</strong>{" "}
                {user.lastSeen ? new Date(user.lastSeen).toLocaleString() : "—"}
              </p>
            </div>
          </div>

          {!isOwnProfile && (
            <div className="friend-action-section">
              {friendshipError && <p className="error">{friendshipError}</p>}

              {!friendshipLoaded ? (
                <p className="friendship-loading">Checking friendship...</p>
              ) : (
                <FriendAction
                  status={friendshipStatus}
                  onAdd={handleAddFriend}
                  onAccept={handleAcceptFriend}
                  onReject={handleRejectFriend}
                  onRemove={handleRemoveFriend}
                  onMessage={handleMessage}
                  loading={friendshipLoading}
                />
              )}
            </div>
          )}
        </Card>
      </PageContainer>
    </>
  );
};

export default UserProfile;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/UserProfile.jsx
+++ after/src/pages/UserProfile.jsx
@@ -1,3 +1,5 @@
+import PageContainer from "../components/ui/PageContainer";
+import Card from "../components/ui/Card";
 import { useEffect, useState } from "react";
 import { Link, useNavigate, useParams } from "react-router-dom";
 
@@ -291,15 +293,15 @@
       <>
         <Navbar />
 
-        <main className="profile-page">
-          <div className="profile-card">
+        <PageContainer className="profile-page">
+          <Card className="profile-card">
             <p className="error">{error || "User not found."}</p>
 
             <Link to="/" className="back-link">
               ← Back to Home
             </Link>
-          </div>
-        </main>
+          </Card>
+        </PageContainer>
       </>
     );
   }
@@ -314,8 +316,8 @@
     <>
       <Navbar />
 
-      <main className="profile-page">
-        <div className="profile-card user-profile-card">
+      <PageContainer className="profile-page">
+        <Card className="profile-card user-profile-card">
           <Link to="/" className="back-link">
             ← Back to Home
           </Link>
@@ -365,8 +367,8 @@
               )}
             </div>
           )}
-        </div>
-      </main>
+        </Card>
+      </PageContainer>
     </>
   );
 };
```

## src/pages/VerifyEmail.jsx

Adopt Button; retain existing form handlers, native types and disabled conditions.

### Full current content

```jsx
import Button from "../components/ui/Button";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { resendVerification, verifyEmail } from "../api/authApi";

const RESEND_COOLDOWN_SECONDS = 60;

const VerifyEmail = () => {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");

  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [resendCountdown, setResendCountdown] = useState(
    RESEND_COOLDOWN_SECONDS,
  );

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendCountdown]);

  const handleVerify = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await verifyEmail({
        email,
        otp,
      });

      setSuccess("Email verified successfully. Redirecting to login...");

      window.setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      console.error(error);

      setError(error.response?.data?.message || "Unable to verify email");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) {
      return;
    }

    setError("");
    setSuccess("");
    setResending(true);

    try {
      await resendVerification({
        email,
      });

      setSuccess("A new verification code has been sent.");

      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message || "Unable to resend verification code",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>FrndBook</h1>

        <h2>Verify Your Email</h2>

        <p>Enter the 6-digit verification code sent to your email.</p>

        <form onSubmit={handleVerify}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            required
          />

          {error && <p className="error">{error}</p>}

          {success && <p className="success">{success}</p>}

          <Button type="submit" disabled={loading || otp.length !== 6}>
            {loading ? "Verifying..." : "Verify Email"}
          </Button>
        </form>

        <Button
          type="button"
          onClick={handleResend}
          disabled={resending || resendCountdown > 0}
        >
          {resending
            ? "Sending..."
            : resendCountdown > 0
              ? `Resend code in ${resendCountdown}s`
              : "Resend code"}
        </Button>

        <p>
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
```

### Changes (+ added / - removed)

```diff
--- before/src/pages/VerifyEmail.jsx
+++ after/src/pages/VerifyEmail.jsx
@@ -1,3 +1,4 @@
+import Button from "../components/ui/Button";
 import { useEffect, useState } from "react";
 import { Link, useNavigate, useSearchParams } from "react-router-dom";
 
@@ -127,12 +128,12 @@
 
           {success && <p className="success">{success}</p>}
 
-          <button type="submit" disabled={loading || otp.length !== 6}>
+          <Button type="submit" disabled={loading || otp.length !== 6}>
             {loading ? "Verifying..." : "Verify Email"}
-          </button>
+          </Button>
         </form>
 
-        <button
+        <Button
           type="button"
           onClick={handleResend}
           disabled={resending || resendCountdown > 0}
@@ -142,7 +143,7 @@
             : resendCountdown > 0
               ? `Resend code in ${resendCountdown}s`
               : "Resend code"}
-        </button>
+        </Button>
 
         <p>
           <Link to="/login">Back to Login</Link>
```

## src/styles/chat.css

Consume shared input chrome/tokens and remove friend-only styles.

### Full current content

```css
/* ==================================================
   MESSAGES PAGE
   ================================================== */

.messages-page {
  width: 100%;
  max-width: 1200px;

  height: calc(100dvh - var(--navbar-height));

  margin: 0 auto;

  padding: 24px 20px;

  box-sizing: border-box;
}

.messages-card {
  width: 100%;
  height: 100%;

  min-height: 0;

  background: var(--color-surface);

  border-radius: 12px;

  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);

  overflow: hidden;

  display: flex;
  flex-direction: column;
}

/* ==================================================
   MESSAGES LAYOUT
   ================================================== */

.messages-layout {
  flex: 1;

  min-width: 0;
  min-height: 0;

  display: grid;

  grid-template-columns: 320px minmax(0, 1fr);
}

/* ==================================================
   CONVERSATION LIST
   ================================================== */

.conversation-list {
  min-width: 0;
  min-height: 0;

  border-right: 1px solid var(--color-item-border);

  display: flex;
  flex-direction: column;

  overflow: hidden;
}

.conversation-list-header {
  flex-shrink: 0;

  padding: 18px 20px;

  border-bottom: 1px solid var(--color-item-border);
}

.conversation-list-header h2 {
  margin: 0;

  font-size: 18px;
}

.conversation-items {
  flex: 1;

  min-width: 0;
  min-height: 0;

  overflow-y: auto;
  overflow-x: hidden;

  overscroll-behavior: contain;
}

.conversation-item {
  width: 100%;

  min-height: 72px;

  box-sizing: border-box;

  padding: 12px 14px;

  border: none;
  border-bottom: 1px solid var(--color-border-light);

  background: var(--color-surface);

  display: flex;
  align-items: center;

  gap: 12px;

  text-align: left;

  cursor: pointer;
}

.conversation-item:hover {
  background: var(--color-hover);
}

.conversation-item-active {
  background: var(--color-selected);
}

.conversation-item-content {
  min-width: 0;

  flex: 1;

  display: flex;
  flex-direction: column;

  gap: 4px;
}

.conversation-item-content strong {
  overflow: hidden;

  white-space: nowrap;

  text-overflow: ellipsis;
}

.conversation-item-content span {
  color: var(--color-text-secondary);

  font-size: 13px;

  overflow: hidden;

  white-space: nowrap;

  text-overflow: ellipsis;
}

.conversation-item-time {
  color: var(--color-text-muted);

  font-size: 11px;

  flex-shrink: 0;
}

.conversation-empty {
  padding: 25px 20px;

  color: var(--color-text-secondary);

  text-align: center;
}

.chat-status {
  flex-shrink: 0;

  padding: 15px;

  color: var(--color-text-subtle);
}

/* ==================================================
   CHAT WINDOW
   ================================================== */

.chat-window {
  min-width: 0;
  min-height: 0;

  overflow: hidden;

  display: flex;
  flex-direction: column;
}

.chat-window-empty {
  align-items: center;
  justify-content: center;

  color: var(--color-text-subtle);
}

/* ==================================================
   CHAT HEADER
   ================================================== */

.chat-header {
  flex-shrink: 0;

  min-height: 72px;

  padding: 12px 18px;

  border-bottom: 1px solid var(--color-item-border);

  display: flex;
  align-items: center;

  gap: 12px;

  box-sizing: border-box;
}

.chat-header h2 {
  margin: 0 0 4px;

  font-size: 18px;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-header-avatar-link {
  display: flex;
  flex-shrink: 0;

  border-radius: 50%;
  text-decoration: none;
}

.chat-header-avatar-link:focus-visible {
  outline: 2px solid var(--color-outline);
  outline-offset: 2px;
}

.chat-connection-status {
  color: var(--color-text-muted);

  font-size: 12px;
}

.chat-connection-status.connected {
  color: var(--color-success);
}

.chat-header-info {
  min-width: 0;

  flex: 1;
}

/* ==================================================
   MOBILE CHAT BACK BUTTON
   ================================================== */

.mobile-chat-back-button {
  display: none;

  flex-shrink: 0;

  width: 38px;
  height: 38px;

  padding: 0;

  border: 1px solid #dddddd;
  border-radius: 50%;

  background: var(--color-surface);
  color: var(--color-text);

  font-size: 20px;

  align-items: center;
  justify-content: center;

  cursor: pointer;
}

.mobile-chat-back-button:hover {
  background: var(--color-hover);
}

/* ==================================================
   ERRORS
   ================================================== */

.chat-error {
  flex-shrink: 0;

  margin: 10px 15px;
}

.chat-page-error {
  flex-shrink: 0;

  margin: 12px 15px;
}

/* ==================================================
   MESSAGE LIST CONTAINER
   ================================================== */

.message-list-container {
  flex: 1;

  min-width: 0;
  min-height: 0;

  overflow: hidden;

  display: flex;
  flex-direction: column;
}

/* ==================================================
   OLDER MESSAGES
   ================================================== */

.older-messages-bar {
  flex-shrink: 0;

  padding: 8px 12px;

  border-bottom: 1px solid var(--color-item-border);

  display: flex;
  justify-content: center;
  align-items: center;

  background: var(--color-surface);
}

.chat-secondary-button {
  min-height: 36px;

  padding: 7px 12px;

  border: 1px solid var(--color-control-border);
  border-radius: 6px;

  background: var(--color-surface);
  color: var(--color-text-strong);

  cursor: pointer;

  white-space: nowrap;
}

.chat-secondary-button:hover:not(:disabled) {
  background: var(--color-hover);
}

.chat-secondary-button:disabled {
  opacity: 0.6;
}

/* ==================================================
   MESSAGE SCROLLER
   ================================================== */

.message-list {
  flex: 1;

  min-width: 0;
  min-height: 0;

  padding: 20px;

  overflow-y: auto;
  overflow-x: hidden;

  display: flex;
  flex-direction: column;

  gap: 10px;

  box-sizing: border-box;

  overscroll-behavior: contain;

  scroll-behavior: smooth;
}

.message-list-loading {
  align-items: center;
  justify-content: center;

  color: var(--color-text-subtle);
}

.message-empty {
  flex: 1;

  min-height: 100%;

  display: flex;
  flex-direction: column;

  align-items: center;
  justify-content: center;

  color: var(--color-text-subtle);

  text-align: center;
}

.message-empty p {
  margin: 4px;
}

/* ==================================================
   MESSAGE ROW
   ================================================== */

.message-row {
  display: flex;

  align-items: flex-end;

  gap: 8px;

  max-width: 75%;

  flex-shrink: 0;
}

.message-row-own {
  align-self: flex-end;

  justify-content: flex-end;
}

.message-row-other {
  align-self: flex-start;
}

/* ==================================================
   MESSAGE BUBBLE
   ================================================== */

.message-bubble {
  min-width: 50px;

  max-width: 100%;

  padding: 9px 12px;

  border-radius: 12px;

  box-sizing: border-box;
}

.message-bubble p {
  margin: 0;

  white-space: pre-wrap;

  overflow-wrap: anywhere;

  word-break: break-word;
}

.message-bubble span {
  display: block;

  margin-top: 5px;

  font-size: 10px;

  text-align: right;
}

.message-bubble-own {
  background: var(--color-primary);
  color: var(--color-on-primary);

  border-bottom-right-radius: 4px;
}

.message-bubble-other {
  background: var(--color-selected);
  color: var(--color-text);

  border-bottom-left-radius: 4px;
}

.message-bubble-own span {
  color: var(--color-control-border);
}

.message-bubble-other span {
  color: var(--color-text-subtle);
}

/* ==================================================
   COMPOSER
   ================================================== */

.message-composer {
  flex-shrink: 0;

  border-top: 1px solid var(--color-item-border);

  padding: 12px;

  padding-bottom: max(12px, env(safe-area-inset-bottom));

  display: flex;
  flex-direction: column;

  gap: 8px;

  box-sizing: border-box;

  background: var(--color-surface);
}

.message-composer textarea {
  box-sizing: border-box;

  resize: vertical;

  min-height: 50px;
  max-height: 150px;

  padding: 10px;

  border-radius: 7px;

}

.message-composer textarea:focus {
  border-color: var(--color-outline);
}

.message-composer-footer {
  display: flex;

  align-items: center;
  justify-content: space-between;

  gap: 10px;
}

.message-composer-footer span {
  color: var(--color-text-muted);

  font-size: 12px;
}

.message-composer-footer button {
  flex-shrink: 0;

  min-height: 40px;

  padding: 8px 18px;

  border: none;
  border-radius: 6px;

  background: var(--color-primary);
  color: var(--color-on-primary);

  cursor: pointer;

  font-weight: 600;
}

.message-composer-footer button:disabled {
  opacity: 0.5;
}

/* ==================================================
   TABLET
   ================================================== */

@media (max-width: 800px) {
  .messages-page {
    height: calc(100dvh - var(--navbar-height));

    padding: 10px;
  }

  .messages-layout {
    grid-template-columns: 1fr;
  }

  .messages-layout.mobile-conversations-active .chat-window {
    display: none;
  }

  .messages-layout.mobile-chat-active .conversation-list {
    display: none;
  }

  .conversation-list {
    min-width: 0;
    min-height: 0;
  }

  .chat-window {
    min-width: 0;
    min-height: 0;
  }

  .mobile-chat-back-button {
    display: inline-flex;
  }

  .message-row {
    max-width: 90%;
  }
}

/* ==================================================
   PHONE
   ================================================== */

@media (max-width: 600px) {
  .messages-page {
    height: calc(100dvh - var(--navbar-height));

    padding: 0;
  }

  .messages-card {
    border-radius: 0;

    box-shadow: none;
  }

  .conversation-list-header {
    padding: 16px;
  }

  .conversation-item {
    min-height: 68px;

    padding: 11px 12px;
  }

  .chat-header {
    min-height: 64px;

    padding: 10px 12px;

    gap: 10px;
  }

  .chat-header h2 {
    font-size: 16px;
  }

  .mobile-chat-back-button {
    width: 36px;
    height: 36px;
  }

  .message-list {
    padding: 12px;

    gap: 8px;
  }

  .older-messages-bar {
    padding: 7px 10px;
  }

  .message-row {
    max-width: 92%;
  }

  .message-bubble {
    padding: 8px 11px;
  }

  .message-composer {
    padding: 10px;
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }

  .message-composer textarea {
    min-height: 48px;
    max-height: 120px;
  }

  .message-composer-footer button {
    min-width: 70px;
  }
}

/* ==================================================
   VERY SMALL PHONES
   ================================================== */

@media (max-width: 380px) {
  .message-list {
    padding: 10px;
  }

  .message-row {
    max-width: 94%;
  }

  .message-composer {
    padding-left: 8px;
    padding-right: 8px;
  }

  .message-composer-footer {
    gap: 6px;
  }

  .message-composer-footer span {
    font-size: 11px;
  }

  .message-composer-footer button {
    padding-left: 14px;
    padding-right: 14px;
  }
}
```

### Changes (+ added / - removed)

```diff
--- before/src/styles/chat.css
+++ after/src/styles/chat.css
@@ -21,7 +21,7 @@
 
   min-height: 0;
 
-  background: white;
+  background: var(--color-surface);
 
   border-radius: 12px;
 
@@ -56,7 +56,7 @@
   min-width: 0;
   min-height: 0;
 
-  border-right: 1px solid #e5e5e5;
+  border-right: 1px solid var(--color-item-border);
 
   display: flex;
   flex-direction: column;
@@ -69,7 +69,7 @@
 
   padding: 18px 20px;
 
-  border-bottom: 1px solid #e5e5e5;
+  border-bottom: 1px solid var(--color-item-border);
 }
 
 .conversation-list-header h2 {
@@ -100,9 +100,9 @@
   padding: 12px 14px;
 
   border: none;
-  border-bottom: 1px solid #eeeeee;
-
-  background: white;
+  border-bottom: 1px solid var(--color-border-light);
+
+  background: var(--color-surface);
 
   display: flex;
   align-items: center;
@@ -115,11 +115,11 @@
 }
 
 .conversation-item:hover {
-  background: #f7f7f7;
+  background: var(--color-hover);
 }
 
 .conversation-item-active {
-  background: #f0f1f3;
+  background: var(--color-selected);
 }
 
 .conversation-item-content {
@@ -142,7 +142,7 @@
 }
 
 .conversation-item-content span {
-  color: #666666;
+  color: var(--color-text-secondary);
 
   font-size: 13px;
 
@@ -154,7 +154,7 @@
 }
 
 .conversation-item-time {
-  color: #888888;
+  color: var(--color-text-muted);
 
   font-size: 11px;
 
@@ -164,7 +164,7 @@
 .conversation-empty {
   padding: 25px 20px;
 
-  color: #666666;
+  color: var(--color-text-secondary);
 
   text-align: center;
 }
@@ -174,7 +174,7 @@
 
   padding: 15px;
 
-  color: #777777;
+  color: var(--color-text-subtle);
 }
 
 /* ==================================================
@@ -195,7 +195,7 @@
   align-items: center;
   justify-content: center;
 
-  color: #777777;
+  color: var(--color-text-subtle);
 }
 
 /* ==================================================
@@ -209,7 +209,7 @@
 
   padding: 12px 18px;
 
-  border-bottom: 1px solid #e5e5e5;
+  border-bottom: 1px solid var(--color-item-border);
 
   display: flex;
   align-items: center;
@@ -238,18 +238,18 @@
 }
 
 .chat-header-avatar-link:focus-visible {
-  outline: 2px solid #555555;
+  outline: 2px solid var(--color-outline);
   outline-offset: 2px;
 }
 
 .chat-connection-status {
-  color: #888888;
+  color: var(--color-text-muted);
 
   font-size: 12px;
 }
 
 .chat-connection-status.connected {
-  color: #2e7d32;
+  color: var(--color-success);
 }
 
 .chat-header-info {
@@ -275,8 +275,8 @@
   border: 1px solid #dddddd;
   border-radius: 50%;
 
-  background: white;
-  color: #222222;
+  background: var(--color-surface);
+  color: var(--color-text);
 
   font-size: 20px;
 
@@ -287,7 +287,7 @@
 }
 
 .mobile-chat-back-button:hover {
-  background: #f7f7f7;
+  background: var(--color-hover);
 }
 
 /* ==================================================
@@ -331,13 +331,13 @@
 
   padding: 8px 12px;
 
-  border-bottom: 1px solid #e5e5e5;
+  border-bottom: 1px solid var(--color-item-border);
 
   display: flex;
   justify-content: center;
   align-items: center;
 
-  background: white;
+  background: var(--color-surface);
 }
 
 .chat-secondary-button {
@@ -345,11 +345,11 @@
 
   padding: 7px 12px;
 
-  border: 1px solid #cccccc;
+  border: 1px solid var(--color-control-border);
   border-radius: 6px;
 
-  background: white;
-  color: #333333;
+  background: var(--color-surface);
+  color: var(--color-text-strong);
 
   cursor: pointer;
 
@@ -357,7 +357,7 @@
 }
 
 .chat-secondary-button:hover:not(:disabled) {
-  background: #f7f7f7;
+  background: var(--color-hover);
 }
 
 .chat-secondary-button:disabled {
@@ -395,7 +395,7 @@
   align-items: center;
   justify-content: center;
 
-  color: #777777;
+  color: var(--color-text-subtle);
 }
 
 .message-empty {
@@ -409,7 +409,7 @@
   align-items: center;
   justify-content: center;
 
-  color: #777777;
+  color: var(--color-text-subtle);
 
   text-align: center;
 }
@@ -481,25 +481,25 @@
 }
 
 .message-bubble-own {
-  background: #222222;
-  color: white;
+  background: var(--color-primary);
+  color: var(--color-on-primary);
 
   border-bottom-right-radius: 4px;
 }
 
 .message-bubble-other {
-  background: #f0f1f3;
-  color: #222222;
+  background: var(--color-selected);
+  color: var(--color-text);
 
   border-bottom-left-radius: 4px;
 }
 
 .message-bubble-own span {
-  color: #cccccc;
+  color: var(--color-control-border);
 }
 
 .message-bubble-other span {
-  color: #777777;
+  color: var(--color-text-subtle);
 }
 
 /* ==================================================
@@ -509,7 +509,7 @@
 .message-composer {
   flex-shrink: 0;
 
-  border-top: 1px solid #e5e5e5;
+  border-top: 1px solid var(--color-item-border);
 
   padding: 12px;
 
@@ -522,12 +522,10 @@
 
   box-sizing: border-box;
 
-  background: white;
+  background: var(--color-surface);
 }
 
 .message-composer textarea {
-  width: 100%;
-
   box-sizing: border-box;
 
   resize: vertical;
@@ -537,14 +535,12 @@
 
   padding: 10px;
 
-  border: 1px solid #cccccc;
   border-radius: 7px;
 
-  outline: none;
 }
 
 .message-composer textarea:focus {
-  border-color: #555555;
+  border-color: var(--color-outline);
 }
 
 .message-composer-footer {
@@ -557,7 +553,7 @@
 }
 
 .message-composer-footer span {
-  color: #888888;
+  color: var(--color-text-muted);
 
   font-size: 12px;
 }
@@ -572,8 +568,8 @@
   border: none;
   border-radius: 6px;
 
-  background: #222222;
-  color: white;
+  background: var(--color-primary);
+  color: var(--color-on-primary);
 
   cursor: pointer;
 
@@ -582,31 +578,6 @@
 
 .message-composer-footer button:disabled {
   opacity: 0.5;
-}
-
-/* ==================================================
-   FRIEND CARD MESSAGE BUTTON
-   ================================================== */
-
-.friend-card-actions {
-  flex-shrink: 0;
-
-  display: flex;
-  align-items: center;
-
-  gap: 8px;
-}
-
-.friend-message-button {
-  min-height: 40px;
-
-  padding: 8px 13px;
-
-  border: 1px solid #222222;
-  border-radius: 6px;
-
-  background: #222222;
-  color: white;
 }
 
 /* ==================================================
```

## src/styles/friends.css

Consolidate identical friend/request rows, consume shared styles and own friend message actions.

### Full current content

```css
/* ==================================================
   FRIEND ACTIONS
   ================================================== */

.friend-action-section {
  margin-top: 25px;
  padding-top: 20px;

  border-top: 1px solid var(--color-border-light);

  display: flex;
  justify-content: center;
}

.friend-action-group {
  display: flex;
  align-items: center;
  justify-content: center;

  gap: 10px;

  flex-wrap: wrap;
}

.friend-action-button {
  min-height: 40px;

  padding: 9px 16px;

  border: 1px solid var(--color-control-border);
  border-radius: 7px;

  background: var(--color-surface);

  font-weight: 600;
}

.friend-action-button.primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-color: var(--color-primary);
}

.friend-action-button.secondary {
  background: var(--color-surface);
  color: var(--color-text-strong);
}

.friend-action-button.danger {
  color: var(--color-danger);
  border-color: #d8a7a3;
  background: var(--color-surface);
}

.friend-action-button:disabled {
  opacity: 0.6;
}

.friend-status-label {
  font-weight: 600;
  color: var(--color-success);
}

.friendship-loading {
  margin: 0;
  color: var(--color-text-secondary);
}

/* ==================================================
   FRIENDS PAGE
   ================================================== */

.friends-page,
.friend-requests-page {
  max-width: 900px;

}

.friends-list,
.friend-request-list {
  display: flex;
  flex-direction: column;

  gap: 12px;
}

.friend-card,
.friend-request-card {
  min-width: 0;

  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 15px;

  padding: 14px;

  border: 1px solid var(--color-item-border);
  border-radius: 10px;

  background: var(--color-surface);
}

.friend-card-main,
.friend-request-main {
  min-width: 0;
  flex: 1;

  display: flex;
  align-items: center;

  gap: 14px;

  text-decoration: none;
  color: inherit;
}

.friend-card-info,
.friend-request-info {
  min-width: 0;
}

.friend-card-info h3,
.friend-request-info h3 {
  margin: 0 0 5px;

  font-size: 16px;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.friend-card-info p,
.friend-request-info p {
  margin: 0 0 5px;

  color: var(--color-text-secondary);

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.friend-card-status {
  font-size: 13px;
  color: var(--color-text-subtle);
}

.friend-remove-button {
  flex-shrink: 0;

  min-height: 40px;

  padding: 8px 13px;

  border: 1px solid var(--color-control-border);
  border-radius: 6px;

  background: var(--color-surface);
  color: var(--color-danger);

  font-weight: 600;
}

.friend-remove-button:disabled {
  opacity: 0.6;
}

.friends-empty {
  padding: 40px 20px;

}

/* ==================================================
   FRIEND REQUESTS
   ================================================== */

.request-section {
  margin-top: 30px;
}

.request-section:first-of-type {
  margin-top: 10px;
}

.request-section-header {
  display: flex;
  align-items: center;

  gap: 10px;

  margin-bottom: 12px;
}

.request-section-header h2 {
  margin: 0;
}

.request-section-header span {
  min-width: 24px;
  height: 24px;

  padding: 0 7px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  border-radius: 12px;

  background: var(--color-border-light);

  font-size: 13px;
  font-weight: 600;
}

.friend-request-info span {
  color: var(--color-text-muted);
  font-size: 12px;
}

.friend-request-actions {
  flex-shrink: 0;

  display: flex;

  gap: 8px;
}

.friend-request-sent-label {
  flex-shrink: 0;

  color: var(--color-text-secondary);

  font-size: 14px;
  font-weight: 600;
}

.request-empty {
  margin: 0;

  padding: 18px;

  border: 1px dashed var(--color-control-border);
  border-radius: 8px;

  color: var(--color-text-secondary);
}

/* ==================================================
   MOBILE
   ================================================== */

@media (max-width: 700px) {
  .friends-page,
  .friend-requests-page {
    padding: 20px 12px;
  }

  .friends-card,
  .friend-requests-card {
    padding: 18px;
  }

  .friends-header {
    align-items: flex-start;
    flex-direction: column;

    margin-bottom: 20px;
  }

  .friends-header h1 {
    font-size: 24px;
  }

  .friend-card,
  .friend-request-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .friend-card-main,
  .friend-request-main {
    width: 100%;
  }

  .friend-remove-button {
    width: 100%;
  }

  .friend-request-actions {
    width: 100%;
  }

  .friend-request-actions .friend-action-button {
    flex: 1;
  }

  .friend-action-group {
    width: 100%;
  }

  .friend-action-group .friend-action-button {
    flex: 1;
  }
}

@media (max-width: 380px) {
  .friends-card,
  .friend-requests-card {
    padding: 15px;
  }

  .friend-action-group {
    flex-direction: column;
  }

  .friend-action-group .friend-action-button {
    width: 100%;
  }
}

/* ==================================================
   FRIEND CARD MESSAGE BUTTON
   ================================================== */

.friend-card-actions {
  flex-shrink: 0;

  display: flex;
  align-items: center;

  gap: 8px;
}

.friend-message-button {
  min-height: 40px;

  padding: 8px 13px;

  border: 1px solid var(--color-primary);
  border-radius: 6px;

  background: var(--color-primary);
  color: var(--color-on-primary);
}
```

### Changes (+ added / - removed)

```diff
--- before/src/styles/friends.css
+++ after/src/styles/friends.css
@@ -6,7 +6,7 @@
   margin-top: 25px;
   padding-top: 20px;
 
-  border-top: 1px solid #eeeeee;
+  border-top: 1px solid var(--color-border-light);
 
   display: flex;
   justify-content: center;
@@ -27,29 +27,29 @@
 
   padding: 9px 16px;
 
-  border: 1px solid #cccccc;
+  border: 1px solid var(--color-control-border);
   border-radius: 7px;
 
-  background: white;
+  background: var(--color-surface);
 
   font-weight: 600;
 }
 
 .friend-action-button.primary {
-  background: #222222;
-  color: white;
-  border-color: #222222;
+  background: var(--color-primary);
+  color: var(--color-on-primary);
+  border-color: var(--color-primary);
 }
 
 .friend-action-button.secondary {
-  background: white;
-  color: #333333;
+  background: var(--color-surface);
+  color: var(--color-text-strong);
 }
 
 .friend-action-button.danger {
-  color: #b3261e;
+  color: var(--color-danger);
   border-color: #d8a7a3;
-  background: white;
+  background: var(--color-surface);
 }
 
 .friend-action-button:disabled {
@@ -58,12 +58,12 @@
 
 .friend-status-label {
   font-weight: 600;
-  color: #2e7d32;
+  color: var(--color-success);
 }
 
 .friendship-loading {
   margin: 0;
-  color: #666666;
+  color: var(--color-text-secondary);
 }
 
 /* ==================================================
@@ -72,69 +72,38 @@
 
 .friends-page,
 .friend-requests-page {
-  width: 100%;
   max-width: 900px;
 
-  margin: 0 auto;
-
-  padding: 35px 20px;
-}
-
-.friends-card,
-.friend-requests-card {
-  background: white;
-
-  padding: 30px;
-
-  border-radius: 12px;
-
-  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
-}
-
-.friends-header {
+}
+
+.friends-list,
+.friend-request-list {
+  display: flex;
+  flex-direction: column;
+
+  gap: 12px;
+}
+
+.friend-card,
+.friend-request-card {
+  min-width: 0;
+
   display: flex;
   align-items: center;
   justify-content: space-between;
 
-  gap: 20px;
-
-  margin-bottom: 25px;
-}
-
-.friends-header h1 {
-  margin: 0 0 6px;
-}
-
-.friends-header p {
-  margin: 0;
-  color: #666666;
-}
-
-.friends-list {
-  display: flex;
-  flex-direction: column;
-
-  gap: 12px;
-}
-
-.friend-card {
-  min-width: 0;
-
-  display: flex;
-  align-items: center;
-  justify-content: space-between;
-
   gap: 15px;
 
   padding: 14px;
 
-  border: 1px solid #e5e5e5;
+  border: 1px solid var(--color-item-border);
   border-radius: 10px;
 
-  background: white;
-}
-
-.friend-card-main {
+  background: var(--color-surface);
+}
+
+.friend-card-main,
+.friend-request-main {
   min-width: 0;
   flex: 1;
 
@@ -147,11 +116,13 @@
   color: inherit;
 }
 
-.friend-card-info {
+.friend-card-info,
+.friend-request-info {
   min-width: 0;
 }
 
-.friend-card-info h3 {
+.friend-card-info h3,
+.friend-request-info h3 {
   margin: 0 0 5px;
 
   font-size: 16px;
@@ -161,10 +132,11 @@
   white-space: nowrap;
 }
 
-.friend-card-info p {
+.friend-card-info p,
+.friend-request-info p {
   margin: 0 0 5px;
 
-  color: #666666;
+  color: var(--color-text-secondary);
 
   white-space: nowrap;
   overflow: hidden;
@@ -173,7 +145,7 @@
 
 .friend-card-status {
   font-size: 13px;
-  color: #777777;
+  color: var(--color-text-subtle);
 }
 
 .friend-remove-button {
@@ -183,11 +155,11 @@
 
   padding: 8px 13px;
 
-  border: 1px solid #cccccc;
+  border: 1px solid var(--color-control-border);
   border-radius: 6px;
 
-  background: white;
-  color: #b3261e;
+  background: var(--color-surface);
+  color: var(--color-danger);
 
   font-weight: 600;
 }
@@ -199,19 +171,6 @@
 .friends-empty {
   padding: 40px 20px;
 
-  text-align: center;
-
-  border: 1px dashed #cccccc;
-  border-radius: 10px;
-}
-
-.friends-empty h2 {
-  margin: 0 0 8px;
-}
-
-.friends-empty p {
-  margin: 0;
-  color: #666666;
 }
 
 /* ==================================================
@@ -251,75 +210,14 @@
 
   border-radius: 12px;
 
-  background: #eeeeee;
+  background: var(--color-border-light);
 
   font-size: 13px;
   font-weight: 600;
 }
 
-.friend-request-list {
-  display: flex;
-  flex-direction: column;
-
-  gap: 12px;
-}
-
-.friend-request-card {
-  min-width: 0;
-
-  display: flex;
-  align-items: center;
-  justify-content: space-between;
-
-  gap: 15px;
-
-  padding: 14px;
-
-  border: 1px solid #e5e5e5;
-  border-radius: 10px;
-
-  background: white;
-}
-
-.friend-request-main {
-  min-width: 0;
-  flex: 1;
-
-  display: flex;
-  align-items: center;
-
-  gap: 14px;
-
-  text-decoration: none;
-  color: inherit;
-}
-
-.friend-request-info {
-  min-width: 0;
-}
-
-.friend-request-info h3 {
-  margin: 0 0 5px;
-
-  font-size: 16px;
-
-  overflow: hidden;
-  text-overflow: ellipsis;
-  white-space: nowrap;
-}
-
-.friend-request-info p {
-  margin: 0 0 5px;
-
-  color: #666666;
-
-  white-space: nowrap;
-  overflow: hidden;
-  text-overflow: ellipsis;
-}
-
 .friend-request-info span {
-  color: #888888;
+  color: var(--color-text-muted);
   font-size: 12px;
 }
 
@@ -334,7 +232,7 @@
 .friend-request-sent-label {
   flex-shrink: 0;
 
-  color: #666666;
+  color: var(--color-text-secondary);
 
   font-size: 14px;
   font-weight: 600;
@@ -345,10 +243,10 @@
 
   padding: 18px;
 
-  border: 1px dashed #cccccc;
+  border: 1px dashed var(--color-control-border);
   border-radius: 8px;
 
-  color: #666666;
+  color: var(--color-text-secondary);
 }
 
 /* ==================================================
@@ -423,3 +321,28 @@
     width: 100%;
   }
 }
+
+/* ==================================================
+   FRIEND CARD MESSAGE BUTTON
+   ================================================== */
+
+.friend-card-actions {
+  flex-shrink: 0;
+
+  display: flex;
+  align-items: center;
+
+  gap: 8px;
+}
+
+.friend-message-button {
+  min-height: 40px;
+
+  padding: 8px 13px;
+
+  border: 1px solid var(--color-primary);
+  border-radius: 6px;
+
+  background: var(--color-primary);
+  color: var(--color-on-primary);
+}
```

## src/styles/notifications.css

Consume shared header, pagination, empty-state styles and colour tokens.

### Full current content

```css
/* ==================================================
   NOTIFICATIONS PAGE
   ================================================== */

.notifications-page {
  max-width: 900px;

}

.notifications-mark-all {
  flex-shrink: 0;

  min-height: 40px;

  padding: 9px 14px;

  border: 1px solid var(--color-control-border);
  border-radius: 7px;

  background: var(--color-surface);
  color: var(--color-text-strong);

  font-weight: 600;
}

.notifications-mark-all:disabled {
  opacity: 0.6;
}

/* ==================================================
   LIST
   ================================================== */

.notification-list {
  display: flex;
  flex-direction: column;

  gap: 10px;
}

.notification-item {
  min-width: 0;

  display: flex;
  align-items: flex-start;

  gap: 12px;

  padding: 16px;

  border: 1px solid var(--color-item-border);
  border-radius: 10px;

  transition: background 0.15s ease;
}

.notification-unread {
  background: #fafafa;
}

.notification-read {
  background: var(--color-surface);
}

.notification-indicator {
  width: 10px;

  flex-shrink: 0;

  padding-top: 6px;
}

.notification-unread-dot {
  display: block;

  width: 8px;
  height: 8px;

  border-radius: 50%;

  background: var(--color-primary);
}

.notification-content {
  min-width: 0;
  flex: 1;
}

.notification-message {
  margin: 0 0 8px;

  line-height: 1.45;

  overflow-wrap: anywhere;
}

.notification-meta {
  display: flex;
  align-items: center;

  gap: 10px;

  flex-wrap: wrap;

  color: var(--color-text-subtle);

  font-size: 13px;
}

.notification-type {
  padding: 2px 7px;

  border-radius: 10px;

  background: var(--color-border-light);
  color: var(--color-outline);

  font-size: 11px;
  font-weight: 600;
}

.notification-read-button {
  flex-shrink: 0;

  min-height: 38px;

  padding: 7px 10px;

  border: 1px solid var(--color-control-border);
  border-radius: 6px;

  background: var(--color-surface);
  color: var(--color-text-strong);

  font-size: 13px;
}

.notification-read-button:disabled {
  opacity: 0.6;
}

/* ==================================================
   EMPTY STATE
   ================================================== */

.notifications-empty {
  padding: 45px 20px;

}

/* ==================================================
   PAGINATION
   ================================================== */

.notification-pagination {
  margin-top: 25px;
}

/* ==================================================
   NAVBAR BADGE
   ================================================== */

.notification-badge {
  display: inline-flex;

  align-items: center;
  justify-content: center;

  min-width: 19px;
  height: 19px;

  margin-left: 6px;
  padding: 0 5px;

  border-radius: 10px;

  background: var(--color-primary);
  color: var(--color-on-primary);

  font-size: 11px;
  font-weight: 700;

  vertical-align: middle;
}

/* ==================================================
   MOBILE
   ================================================== */

@media (max-width: 700px) {
  .notifications-page {
    padding: 20px 12px;
  }

  .notifications-card {
    padding: 18px;
  }

  .notifications-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .notifications-header h1 {
    font-size: 24px;
  }

  .notifications-mark-all {
    width: 100%;
  }

  .notification-item {
    display: grid;

    grid-template-columns: 10px minmax(0, 1fr);
  }

  .notification-read-button {
    grid-column: 2;

    width: 100%;
  }

  .notification-pagination {
    gap: 12px;
  }

  .notification-pagination button {
    min-width: 90px;
  }
}

@media (max-width: 380px) {
  .notifications-card {
    padding: 15px;
  }
}
```

### Changes (+ added / - removed)

```diff
--- before/src/styles/notifications.css
+++ after/src/styles/notifications.css
@@ -3,41 +3,8 @@
    ================================================== */
 
 .notifications-page {
-  width: 100%;
   max-width: 900px;
 
-  margin: 0 auto;
-
-  padding: 35px 20px;
-}
-
-.notifications-card {
-  background: white;
-
-  padding: 30px;
-
-  border-radius: 12px;
-
-  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
-}
-
-.notifications-header {
-  display: flex;
-  align-items: center;
-  justify-content: space-between;
-
-  gap: 20px;
-
-  margin-bottom: 25px;
-}
-
-.notifications-header h1 {
-  margin: 0 0 6px;
-}
-
-.notifications-header p {
-  margin: 0;
-  color: #666666;
 }
 
 .notifications-mark-all {
@@ -47,11 +14,11 @@
 
   padding: 9px 14px;
 
-  border: 1px solid #cccccc;
+  border: 1px solid var(--color-control-border);
   border-radius: 7px;
 
-  background: white;
-  color: #333333;
+  background: var(--color-surface);
+  color: var(--color-text-strong);
 
   font-weight: 600;
 }
@@ -81,7 +48,7 @@
 
   padding: 16px;
 
-  border: 1px solid #e5e5e5;
+  border: 1px solid var(--color-item-border);
   border-radius: 10px;
 
   transition: background 0.15s ease;
@@ -92,7 +59,7 @@
 }
 
 .notification-read {
-  background: white;
+  background: var(--color-surface);
 }
 
 .notification-indicator {
@@ -111,7 +78,7 @@
 
   border-radius: 50%;
 
-  background: #222222;
+  background: var(--color-primary);
 }
 
 .notification-content {
@@ -135,7 +102,7 @@
 
   flex-wrap: wrap;
 
-  color: #777777;
+  color: var(--color-text-subtle);
 
   font-size: 13px;
 }
@@ -145,8 +112,8 @@
 
   border-radius: 10px;
 
-  background: #eeeeee;
-  color: #555555;
+  background: var(--color-border-light);
+  color: var(--color-outline);
 
   font-size: 11px;
   font-weight: 600;
@@ -159,11 +126,11 @@
 
   padding: 7px 10px;
 
-  border: 1px solid #cccccc;
+  border: 1px solid var(--color-control-border);
   border-radius: 6px;
 
-  background: white;
-  color: #333333;
+  background: var(--color-surface);
+  color: var(--color-text-strong);
 
   font-size: 13px;
 }
@@ -179,19 +146,6 @@
 .notifications-empty {
   padding: 45px 20px;
 
-  text-align: center;
-
-  border: 1px dashed #cccccc;
-  border-radius: 10px;
-}
-
-.notifications-empty h2 {
-  margin: 0 0 8px;
-}
-
-.notifications-empty p {
-  margin: 0;
-  color: #666666;
 }
 
 /* ==================================================
@@ -199,40 +153,19 @@
    ================================================== */
 
 .notification-pagination {
-  display: flex;
+  margin-top: 25px;
+}
+
+/* ==================================================
+   NAVBAR BADGE
+   ================================================== */
+
+.notification-badge {
+  display: inline-flex;
+
   align-items: center;
   justify-content: center;
 
-  gap: 20px;
-
-  margin-top: 25px;
-}
-
-.notification-pagination button {
-  min-height: 40px;
-
-  padding: 8px 14px;
-
-  border: 1px solid #cccccc;
-  border-radius: 6px;
-
-  background: white;
-}
-
-.notification-pagination button:disabled {
-  opacity: 0.5;
-}
-
-/* ==================================================
-   NAVBAR BADGE
-   ================================================== */
-
-.notification-badge {
-  display: inline-flex;
-
-  align-items: center;
-  justify-content: center;
-
   min-width: 19px;
   height: 19px;
 
@@ -241,8 +174,8 @@
 
   border-radius: 10px;
 
-  background: #222222;
-  color: white;
+  background: var(--color-primary);
+  color: var(--color-on-primary);
 
   font-size: 11px;
   font-weight: 700;
```

