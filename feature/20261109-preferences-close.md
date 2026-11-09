# Preferences: a Close that returns to where you were

| Field             | Value                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| **Status**        | Implemented (2026-11-09; approved in conversation, option 1: overlay)    |
| **Branch target** | `feature/22-preferences-close` → `develop`                               |
| **Scope**         | `apps/local`                                                             |
| **Related**       | [20261108-preferences-layout.md](./20261108-preferences-layout.md) (#23) |
| **RFC**           | [#22](https://github.com/SwissTPH/tricc-frontend/issues/22)              |

---

## Part I — Business description

### Problem

Preferences opens as a separate page. It has no Close button, the preferences icon does not
close it again, and going back reopens the project at its default view: the open activity, the
breadcrumb, the selected node and an open side view (data dictionary, media, building blocks)
are lost. Preferences are often changed while looking at a diagram, so the author loses their
place every time.

### What changes for an author

- Preferences opens **over** the current page, under the top bar. Nothing behind it closes.
- A **Close** button closes it; **Escape** does too (when no dialog is open on top of it).
- Clicking the **preferences icon** again closes it: the icon toggles.
- After closing, the author is exactly where they were, with the changed preferences already
  applied to the diagram, without a reload.
- A direct link to `/preferences` still works: it opens Preferences over the home page, and
  Close goes home.

### Out of scope

- The Preferences layout itself (#23).
- Keeping the open activity in the URL.

---

## Part II — Technical specification

### Design

- `apps/local/src/App.tsx`: a `PreferencesContext` (`open`, `toggle`, `close`) provided by
  `App`. `open` starts true on `/preferences`; `close` on that route navigates to `/`.
  The `/preferences` route renders the home page; the overlay is drawn on top of it.
- `Shell` renders `<main>` as before and, while open, a `.tricc-preferences-overlay` absolutely
  covering `main` with `<Preferences>` in it. The page under it stays mounted, so
  `ProjectWorkspace` keeps its trail, focus and view state.
- `apps/local/src/shell/TopBar.tsx`: the preferences icon is a button calling `toggle`, with
  `aria-pressed` while open; same `data-testid="nav-preferences"`.
- `Preferences` gets a Close button (`preferences-close`) and an Escape handler that is
  skipped while the concept-types dialog is open.
- Preferences are already live (`local.preferences` is subscribed by the editor), so no reload
  is needed after a change.

### Tests

- e2e (`e2e/authoring.spec.ts`): open an activity, select a node, open Preferences, change lines
  per node, close with the button, reopen and close with the icon, then with Escape; the
  activity, breadcrumb and selection are still there and the label shows the new number of
  lines.
- e2e: a direct `/preferences` link opens the overlay; Close goes home.
- The e2e tests that did `page.goto('/')` after changing a preference close Preferences instead.

---

## Open questions

None.

## Decisions

- 2026-11-09: option 1, Preferences as an overlay over the current page (@delcroip).
