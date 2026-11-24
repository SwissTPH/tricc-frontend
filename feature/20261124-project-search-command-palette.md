# Project search as a command palette

| Field             | Value                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | Implemented (2026-11-24)                                                                                                                 |
| **Branch target** | `develop` (commits `87bdc45`, `9c84540`, `b3654fd`)                                                                                      |
| **Scope**         | `@tricc/editor`, `apps/local`                                                                                                            |
| **Related**       | [20261014-project-search-and-dictionaries.md](./20261014-project-search-and-dictionaries.md) §1 (the search this replaces the window of) |

---

## Part I — Business description

### Problem

The **Search the project** box in the navigator bar only searched when the author pressed
**Enter**. The results then opened in a window that could not be edited: to change the search,
the author closed the window, changed the word in the bar and pressed Enter again. Data
dictionary hits were listed first, so on a project with many concepts the segment or activity
the author was looking for was below the fold. There was no keyboard shortcut.

### What changes for an author

- Clicking or tabbing into **Search the project** opens a search palette straight away, with the
  cursor in its search field. The bar itself is no longer typed into.
- **Ctrl+K** (**Cmd+K** on a Mac) opens the same palette from anywhere in the project. **Ctrl+F**
  stays the browser's own find.
- Results update **as the author types**, grouped by source in this order:
  1. **Segments**
  2. **Activities** (building blocks are listed here too)
  3. **Data dictionary**
  4. **Nodes**

  Each group shows how many hits it has. Matching is unchanged: it ignores case and finds the
  same things as before.

- The first hit is highlighted. **Up** and **Down** move through the hits (wrapping round), and
  **Enter** or a click opens the highlighted one: the segment or activity, the concept in its
  dictionary, or the node selected on its canvas. The palette then closes.
- With nothing typed, the palette says what can be searched; with no match, it says so.
- **Escape**, the **✕** button or a click outside closes the palette and clears the search.

### Out of scope

- What the search matches (`searchProject` in `@tricc/core` is unchanged).
- Recent searches, or commands other than opening a search hit.
- Searching text the search does not index (use the browser's find, Ctrl+F).

---

## Part II — Technical specification

### Design

- **shadcn/ui primitives** in `packages/editor/src/components/ui/`, in the forwardRef form the
  other components there use (React 18):
  - `dialog.tsx`: shadcn's Dialog on `@radix-ui/react-dialog`. The close icon is the Material
    Symbols `close` glyph (`Icon`), not lucide. Overlay and content use `z-[1300]` to sit with
    MUI's modals.
  - `command.tsx`: shadcn's Command on `cmdk`. `CommandDialog` takes three additions over
    shadcn: `commandProps` (passed to the `Command` root, with `data-testid`),
    `onOpenAutoFocus` and `onCloseAutoFocus` (passed to `DialogContent`). The sr-only title and
    description sit inside the content so Radix names the dialog.
- New dependencies of `@tricc/editor`: `cmdk` `^1.1.1`, `@radix-ui/react-dialog` `^1.1.15`.
- `packages/editor/src/project/ProjectSearch.tsx`: `ProjectSearchCommand` replaces
  `ProjectSearchDialog`.
  - Controlled: `open`, `query`, `onQueryChange`, `onClose`, plus the existing `onOpenConcept`,
    `onOpenActivity`, `onOpenNode`.
  - Hits come from `searchProject(project, useDeferredValue(query))`, computed only while open.
    `shouldFilter: false`, so cmdk neither filters nor re-sorts them; `loop: true`.
  - Item values are unique per source (`process|<id>`, `activity|<id>`,
    `concept|<system>|<code>`, `node|<activity>|<node>`). Concept and node hits are disabled
    when their open callback is missing, as before.
  - `onOpenAutoFocus` focuses the query with the caret at the end. `onCloseAutoFocus` prevents
    Radix from returning focus to the bar, which would reopen the palette.
- `packages/editor/src/project/ActivityNavigator.tsx`:
  - The bar `Input` (`data-testid="project-search"`) is `readOnly` and opens the palette on
    focus and on click. Its title mentions Ctrl+K.
  - `searching` is a boolean; `closeSearch` also clears `projectQuery`.
  - A capture-phase `keydown` listener on `document` opens the palette on Ctrl+K / Cmd+K
    (not with Shift or Alt) and calls `preventDefault`, so the browser does not move focus to
    its address bar. It is mounted with the navigator, so it works anywhere in the project
    workspace, inputs and canvas included.
- Styles:
  - `apps/local/src/tailwind.css`: the app leaves out Tailwind's preflight, so a scoped reset
    for `dialog-content`, `dialog-overlay`, `dialog-close` and `command-input` is added to
    `@layer base`, next to the existing button, input and hover-card rules.
  - `packages/editor/styles.css`: the `.tricc-search*` rules of the old window are removed.

### Tests

- e2e (`e2e/search.spec.ts`): clicking the bar focuses the palette's query; typing `WEIGHT`
  shows the Data dictionary, Activities and Nodes groups; clicking a node hit closes the palette
  and selects the node. A query with no match shows `project-search-none`; Escape closes the
  palette. Ctrl+K opens it with the query focused, and Escape closes it again.
- e2e (`e2e/canvas.spec.ts`, undo test): the bar opens the palette, Ctrl+Z in its query does not
  undo a document change, and Escape closes it before the test goes on.
- Test ids kept from the old window: `project-search`, `project-search-results`,
  `project-search-<source>`, `search-hit-<source>-…`, `project-search-none`. New:
  `project-search-input`. `project-search-close` is gone (the ✕ replaces Close).

---

## Open questions

None.

## Decisions

- 2026-11-23: shadcn/ui's React Command (`cmdk`), since the app is React; the request named
  shadcn-svelte.
- 2026-11-23: Segments and Activities are listed before Data dictionary and Nodes.
- 2026-11-23: the palette opens when the bar is selected, not on the first keystroke.
- 2026-11-24: the shortcut is Ctrl+K / Cmd+K, the usual command-palette key; Ctrl+F is left to
  the browser's find.
