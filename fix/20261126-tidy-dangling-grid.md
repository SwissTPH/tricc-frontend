# Tidy puts every unconnected node on one very long line

| Field             | Value                                                   |
| ----------------- | ------------------------------------------------------- |
| **Status**        | Implemented (approved 2026-11-26, issue #27)            |
| **Issue**         | #27                                                     |
| **Branch target** | `fix/27-tidy-dangling-grid` → `develop`                 |
| **Scope**         | `@tricc/editor`                                         |
| **Related**       | `feature/20260825-activity-editor.md` §7 (tidy up), #17 |

---

## Part I — Issue analysis

### Symptoms

On an activity that has nodes with no connection (dangling nodes: not yet wired, or left over
after edits), **Tidy up** places all of them side by side in a single row. With a few dozen such
nodes the row is many screens wide: the flowchart becomes a thin strip and the author has to
zoom far out or scroll sideways to find anything.

### Who is affected

Every author using Tidy up on a work-in-progress activity, and imported activities (draw.io)
that carry many unlinked nodes.

### Expected vs actual

| Expected                                                                                                                                                                    | Actual                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Unconnected nodes are packed in a block of several rows, at most `ceil(sqrt(n))` nodes per row, to the right of the connected flow, the first row on the start node's line. | All unconnected nodes sit in one row, as wide as the number of nodes allows. |

### How to reproduce

1. Open an activity in the local app (`pnpm --filter @tricc/app-local dev`).
2. Add about 20 nodes and leave them unconnected (or keep a small connected flow plus the 20).
3. Click **Tidy up** (`tidy-layout`).
4. The 20 nodes end up on one horizontal line.

Commit: `6150807`.

### Out of scope

- The layout of the connected flow itself (spacing was handled in #17).
- Tidy being applied automatically: it stays an explicit action.

---

## Part II — Fix approach

### 1. Root cause

`packages/editor/src/activity/canvas/layout.ts`, `autoLayout()`: every node in `nodeOrder` goes
into one dagre graph. A node with no edge has no rank constraint, so dagre puts all of them on
rank 0 and spreads them side by side with `nodesep` between them. With _n_ dangling nodes the top
row is about _n_ × (node width + gap) wide, whatever the size of the connected flow.

### 2. Fix

A node is **dangling** when no valid edge (both ends present in `activity.nodes`) has it as source
or target.

1. Only the connected nodes go into the dagre graph; it lays them out as today.
2. The _n_ dangling nodes are placed in a grid, in `nodeOrder` order, row by row:
   - columns `cols = ceil(sqrt(n))`, rows `ceil(n / cols)` (a simpler stand-in for the golden
     ratio: the block is about square in node count, so wider than tall because nodes are wider
     than they are high);
   - column pitch: widest dangling node + `hGap`; row pitch: tallest node in that row + `V_GAP`;
   - the grid's left edge is the flow's right edge + `hGap`; its top is the top of the first
     connected `activity_start` node, so the first row sits on the start node's line (the top
     margin 24 when there is no connected start; left margin 24 when no node is connected).
3. Positions stay top-left, rounded, as today.

### 3. Code checklist

- [x] `layout.ts`: split nodes into connected / dangling; dagre on connected only.
- [x] `layout.ts`: grid placement of dangling nodes with `cols = ceil(sqrt(n))`, right of the flow on the start line.
- [x] `layout.test.ts`: regression and edge-case tests below.
- [x] `e2e/canvas.spec.ts`: the node-gap test now reads the gap between grid columns (start and
      integer share the first row, decimal goes under start), not between nodes on one row.

### 4. Tests

- Regression (fails today): 20 dangling nodes + a 2-node flow → dangling nodes span 5 columns ×
  4 rows, every one of them right of the flow, one node gap away.
- 10 dangling nodes → 4 columns, 3 rows (4 + 4 + 2).
- First row on the start node's line, first cell `hGap` right of the flow.
- Only dangling nodes (no edges) → grid starts at the top margin.
- One dangling node → a single cell beside the start node.
- No dangling nodes → positions unchanged from today (existing gap tests still pass).
- Cells never overlap with mixed node sizes.

### 5. Acceptance criteria

- With 20 unconnected nodes, Tidy up gives a 5 × 4 block to the right of the flow,
  its first row level with the start node, not a 20-wide row.
- The connected flow's layout is unchanged.
- The `nodeGap` preference still sets the horizontal gap, in the grid too.

---

## Open questions

None.

## Decisions

- 2026-11-09: the grid of unconnected nodes goes below the connected flow (superseded 2026-11-26).
- 2026-11-26: the grid goes to the right of the connected flow, its first row on the start
  node's line, so the dangling nodes are visible next to where the flow begins.
- 2026-11-26: columns per row = `ceil(sqrt(n))` instead of the golden-ratio formula, to keep it simple.
