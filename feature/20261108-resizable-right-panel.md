# Resizable and collapsible right panel

| Field             | Value                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| **Status**        | Approved (2026-11-08, RFC #9)                                                                                |
| **RFC**           | [#9](https://github.com/SwissTPH/tricc-frontend/issues/9)                                                    |
| **Branch target** | `feature/resizable-right-panel` → `develop`                                                                  |
| **Packages**      | `@tricc/editor`                                                                                              |
| **Related**       | `20261103-drawtricc-ui.md` (the project page side panel), `20260825-activity-editor.md` (the flow inspector) |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### The problem

The panel on the right of the screen has a fixed width: about 320 pixels next to a flow, 340 next
to the project table.

- On a large screen it stays narrow. Long questions, CQL expressions, answer lists and discussion
  threads wrap or scroll inside it, while most of the screen is left to the canvas.
- When the author needs the whole canvas, they cannot put the panel away.
- Its tabs do not always fit. With several tabs, their names are squeezed and cut off, and some
  cannot be read.

### What changes for an author

- **The panel is wider on large screens.** By default it takes 20% of the window width. It is
  never narrower than 340 pixels, today's width on the project page.
- **The author can resize it** by dragging its left edge, up to the point where the canvas or
  table still keeps enough room.
- **The author can collapse it.**
  - Dragging it narrower than today's width collapses it.
  - So does the close button at the top of the panel.
  - A collapsed panel does not disappear. It shrinks to a thin strip on the right with an open
    button.
  - The open button, or dragging the strip back out, opens it again.
- **Resizing the window resets the width.** Any change to the window's size puts an open panel
  back to its default width: 20% of the window, or today's width if that is larger.
- **Shrinking the window can collapse it.** Shrinking the window past 1200px or past 900px
  collapses the panel. Otherwise the open or collapsed state is kept: growing the window never
  reopens it.
- **One panel everywhere.** The width and the open or collapsed state are shared by the project
  page and every activity, block and segment for the session. Moving between them keeps both.
- **Smaller windows.**
  - Under 1200px wide, the first page opens with the panel collapsed, leaving the room to the
    canvas or table.
  - Under 900px wide, an open panel takes the full width, over the canvas or table, like on a
    phone. Its close button brings the canvas or table back.
  - This replaces today's behaviour on the project page, where the panel moves below the table.
- **The tabs stay readable.** Each tab keeps its full name. When they do not all fit, the row of
  tabs scrolls sideways.
- This applies to both right panels: the inspector beside a flow (Details, Validation…) and the
  Info / Discussion / Validation panel beside the project table.

### Out of scope

- Remembering the width or the collapsed state between sessions, or per project.
- Resizing or collapsing the left-hand navigator.
- The rest of the layout on phones: only the right panel's behaviour under 900px is covered.

---

## Part II — Technical specification

### 1. Width rule

| Name      | Value                                                                       |
| --------- | --------------------------------------------------------------------------- |
| `min`     | `340px` on every page (the flow inspector was 320px, the project panel 340) |
| `default` | `max(20vw, min)`                                                            |
| `max`     | the panel's container width minus a floor for the main area (`360px`, open) |
| `rail`    | collapsed width: `32px`, enough for the open button                         |

- Open: `width = clamp(min, dragged ?? default, max)`.
- Collapsed: `width = rail`.

| Window width | Initial state | Open panel                                                         |
| ------------ | ------------- | ------------------------------------------------------------------ |
| ≥ 1200px     | open          | beside the main area, resizable, `default` = `max(20vw, min)`      |
| 900–1199px   | collapsed     | beside the main area, resizable (20vw < `min`, so `default` = min) |
| < 900px      | collapsed     | full width, over the main area; no resize handle                   |

The initial state is taken from the window width when the page opens. After that, the open or
collapsed state only changes when the author changes it (§5).

### 2. Layout (`packages/editor/styles.css`)

- Both grids change their panel column to
  `minmax(0, 1fr) var(--tricc-panel-width, max(20vw, <min>))`:
  - `.tricc-editor__body`, today `minmax(0, 1fr) 320px`;
  - `.tricc-overview`, today `minmax(0, 1fr) 340px`.
- With no drag, the default is pure CSS and follows the window without JavaScript.
- A drag sets `--tricc-panel-width` in pixels on the grid container.
- Collapsed sets `data-collapsed` on the container and `--tricc-panel-width: 32px`.
  - The panel shows only the rail and its open button.
  - The tabs and content are not rendered, so they do not take focus.
- **Under 900px** (`@media (max-width: 899px)`), for both containers:
  - the main area takes the whole grid;
  - the collapsed rail stays on the right, over the main area's edge;
  - an open panel covers the main area at the full container width, with the close button in
    its tab row (`position: absolute; inset: 0`);
  - the resize handle is hidden and the dragged width is ignored.
- Today's `.tricc-overview` rule under `@media (max-width: 900px)`, which stacks the panel below
  the table, is removed.

### 3. Tabs (`.tricc-inspector__tabs`)

- Today each tab button has `flex: 1 1 0; min-width: 0`, which squeezes and cuts off its label.
- Change the buttons to `flex: 1 0 auto; white-space: nowrap`. Tabs still share the row when
  there is room; otherwise each keeps its natural width.
- Change the row to `overflow-x: auto`, with a thin scrollbar (`scrollbar-width: thin`).
- The selected tab is scrolled into view (`scrollIntoView({ inline: 'nearest' })`) when it
  changes or the panel opens.

### 4. Resize handle and collapse (`packages/editor/src/components/`)

- New `useResizablePanel(containerRef, { min })` hook, returning `{ width, collapsed, … }` and
  handlers, plus a `PanelResizer` handle on the panel's left edge. `collapsed` starts as
  `window.innerWidth < 1200` when the page mounts.
- Used by `InspectorPanel` (project page) and by the `<aside className="tricc-inspector">` in
  `ActivityEditor.tsx`. A follow-up could move the latter onto `InspectorPanel`.
- Pointer drag uses `setPointerCapture`. Width = container right edge − pointer x.
  - Above `min`: clamp to `max`.
  - Below `min − 48px`: the panel shows as collapsed while dragging.
  - Between those two points it stays at `min`.
  - Releasing keeps what is shown.
  - Dragging the rail outward opens the panel again.
- While dragging: `cursor: col-resize` on the body, no text selection, and React Flow does not
  pan.
- **Toggle button**:
  - placement: at the left end of the tab row when the panel is open; in the rail when it is
    collapsed;
  - icons: chevron-right (close) and chevron-left (open);
  - `aria-expanded`, `aria-controls` the panel, and the label "Hide panel" / "Show panel".
- **Keyboard**: the handle has `role="separator"`, `aria-orientation="vertical"` and
  `aria-valuemin`/`aria-valuemax`/`aria-valuenow`, and is focusable.
  - ← and → change the width by 16px (with Shift: 64px).
  - → at `min` collapses the panel.
  - Home sets `min`; End sets `max`.
  - Double click or Enter restores the default.
- **Visual**: a 6px hit area over the panel's left border. The border takes the accent colour on
  hover, focus and drag.
- Selecting a node or edge on the canvas while the panel is collapsed does not reopen it. The
  rail shows a dot when the selection changes, so the author knows there are details to see.

### 5. Window resize and shared state

- The state (`collapsed`, dragged width) lives in one session store shared by every page. It is
  not saved to preferences, the project or `localStorage`.
- On `window` `resize`, every dragged width is dropped, so the CSS default applies again.
- If the window shrank past 1200px or 900px, every panel collapses. Growing never opens one.
- Resize events during a drag are ignored. Zoom changes count as a window resize.

### 6. Tests

- **Unit** (`packages/editor`):
  - the clamp and collapse thresholds;
  - keyboard steps, including → at `min` collapsing the panel;
  - a `resize` event clearing the dragged width but keeping `collapsed`;
  - the toggle's `aria-expanded`;
  - a collapsed panel rendering no tab content.
- **e2e** (Playwright):
  - at 1600px the panel is 340px wide; at 1920px it is 384px (20%);
  - dragging widens it; dragging just below 340px stops at 340px;
  - dragging well below 340px collapses it to the 32px rail, and the open button restores it;
  - the close button collapses it;
  - resizing the window brings back 20% when open, and keeps a collapsed panel collapsed;
  - with all tabs of the flow inspector at 340px, every tab label is fully visible after
    scrolling the tab row;
  - a page opened at 1100px starts collapsed; opened at 1300px it starts open;
  - at 800px, opening the panel covers the full width and closing it shows the canvas again;
  - shrinking an open panel's window from 1300px to 800px makes it full width, without closing it;
  - the project page shares the same state and width.

### 7. Phases

1. Tabs scroll sideways, and the CSS default (`max(20vw, min)`) applies on both pages. These are
   small, self-contained changes.
2. The toggle button, the collapsed rail, collapsed by default under 1200px, and the full-width
   panel under 900px.
3. The drag handle with keyboard support, collapse by dragging, and the reset on window resize.

---

## Open questions

None.

## Decisions

- 2026-11-04: resizing the window resets the width only when the panel is open; the open or
  collapsed state is kept (@delcroip).
- 2026-11-04: under 1200px the panel starts collapsed; under 900px an open panel takes the full
  width, replacing the project page's panel-below-the-table layout (@delcroip).
- 2026-11-04: width and open or collapsed state are shared by every flow (activity, block,
  segment) for the session (@delcroip).
- 2026-11-04: shrinking the window past 1200px or 900px collapses the panel; the
  keep-the-state rule applies otherwise (@delcroip).
- 2026-11-04: the project page shares the same panel: one state and a 340px minimum everywhere
  (@delcroip).
- 2026-11-05: maximum width leaves at least 360px to the canvas or table, rather than a 50% cap
  (implemented in #10).
- 2026-11-05: selecting a node while the panel is collapsed does not reopen it; the rail shows a
  dot instead (implemented in #10).
