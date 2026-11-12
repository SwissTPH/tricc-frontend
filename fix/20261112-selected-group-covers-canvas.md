# Selecting hides what is under it: the right-drag rectangle and a selected group

| Field             | Value                                                                                |
| ----------------- | ------------------------------------------------------------------------------------ |
| **Status**        | Implemented (approved 2026-11-12, in conversation)                                   |
| **Branch target** | `fix/35-selected-group-covers-canvas` → `develop`                                    |
| **Scope**         | `@tricc/editor`                                                                      |
| **Issue**         | #35                                                                                  |
| **Related**       | `../feature/20261009-canvas-comments-and-groups.md`, right-click selection (6650ab7) |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Issue analysis

### Symptoms

Two ways selecting on the canvas hides what the author is selecting:

1. **The right-drag rectangle.** While the right button is held and dragged, the rectangle is
   filled with solid light pink. Every node, comment and link under it disappears until the button
   is released, so the author cannot see what they are about to select.
2. **A selected group.** When a group is selected, its frame is drawn on top of everything on the
   canvas that does not belong to it. With a coloured group the comments, nodes and links lying on
   the frame fade behind its tint and can no longer be clicked: a click lands on the group instead.
   Nodes inside the group stay visible.

### Who is affected

Every author in the activity editor, in every browser: the first for anyone using right-drag
selection, the second for anyone using groups. Display only: nothing is saved wrongly and the
export is unchanged.

### Expected vs actual

| Expected                                                                     | Actual                                                            |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| The right-drag rectangle is see-through: what is under it stays visible.     | The rectangle is opaque pink and hides what is under it.          |
| Selecting a group outlines it; what is drawn on it stays visible and usable. | The frame jumps above comments, non-member nodes and their links. |

### How to reproduce

1. New project, new activity. Hold the right button on the canvas and drag across the start node:
   the node disappears under the pink rectangle until the button is released.
2. Add a group and drag it so the start node lies inside its frame without joining it ("0
   nodes"). Add a comment and drop it inside the frame.
3. Select the group (click its title, or right-drag a box around it): the start node and the
   comment are now drawn under the frame's tint, and clicking the comment selects the group.

Reproduced on `develop` at `7dcc612` and `ac42782` (Chromium, Playwright): the rectangle's fill has
no transparency; a selected group's `z-index` is 1000 against 1 for the comment.

### Out of scope

- Nodes that are members of the group: they already stay above their frame.
- Changing how right-drag selection chooses what it selects.

---

## Part II — Fix approach

### Root cause

1. `.tricc-marquee` in `packages/editor/styles.css` is filled with
   `var(--tricc-primary-soft-strong)`, an opaque colour (pink 100 in the light theme), and sits at
   `z-index: 5`, above the nodes.
2. `<ReactFlow>` in `packages/editor/src/activity/canvas/Canvas.tsx` keeps React Flow's default
   `elevateNodesOnSelect: true`. In `@xyflow/system` (`calculateZ`), a selected node's z-index
   becomes `node.zIndex + 1000`. A group frame has no `zIndex` (0), so selected it gets 1000,
   above comments (`zIndex: 1` in `packages/editor/src/activity/canvas/elements.ts`, never group
   members), nodes lying on the frame without being members, and the edges between them. Members
   are not affected: `calculateChildXYZ` gives a child at least `parentZ + 1`.

### Fix

Rule: **selecting never hides anything.** The right-drag rectangle is see-through, and a selected
element is shown by its outline only: selection never changes the drawing order.

- The rectangle keeps its solid primary border and is filled with the primary colour at 12%
  (`color-mix(in srgb, var(--tricc-primary) 12%, transparent)`), in both themes.
- `elevateNodesOnSelect={false}` on `<ReactFlow>`: the stored `zIndex` values decide the order
  alone. Side effect: a selected node dragged over another no longer comes to the front; nodes are
  not meant to overlap, so this is accepted.

### Code checklist

- [x] `styles.css`: see-through fill for `.tricc-marquee`.
- [x] `Canvas.tsx`: `elevateNodesOnSelect={false}` on `<ReactFlow>`, with the reason.
- [x] `e2e/canvas.spec.ts`: the two regression tests below.

### Tests

In `e2e/canvas.spec.ts`, both failing on `develop` before the fix:

- "the right-drag rectangle lets the elements under it show through": the rectangle's computed
  fill has an alpha below 0.5 (Chromium; Firefox skipped, `RIGHT_RELEASE_LOST`).
- "a selected group stays under the comments and nodes drawn on it": with a comment on a group's
  frame and the group selected, the comment's `z-index` is above the group's, and clicking the
  comment selects it, not the group.

### Acceptance criteria

- Elements under the right-drag rectangle stay visible while dragging.
- With a selected group, comments, non-member nodes and their edges on the frame are drawn above
  it and can be clicked.
- Group members still sit above their frame; the existing canvas e2e tests pass.

---

## Open questions

None.

## Decisions

- 2026-11-12: fix both the rectangle and the group elevation in one PR; the rectangle was the
  author's complaint (in conversation).
