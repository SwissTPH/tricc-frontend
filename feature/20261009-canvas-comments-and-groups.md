# Canvas comments and node groups

| Field | Value |
|-------|-------|
| **Status** | Comments and page groups implemented 2026-10-09, not committed. Groups need the `tricc_oo` YAML change in `../../tricc_oo/feature/20261009-yaml-page-groups.md` (Draft) to reach the form. |
| **Repo** | `tricc_frontend`. Comments never reach `tricc_oo`; groups do, as `container_page` groups. |
| **Related** | `20261008-authoring-continuation.md`, `20260825-project-format.md` (the semantics-free `ui:` block), `20261008-drawio-import-and-sequence-nodes.md` |
| **Source** | Patrick, 2026-10-09: "comments that live only on the drawing and are not managed by tricc_oo; ideally colour coded; may relate to a node but not with a normal edge, because that would mess up the conversion. Also a way to group nodes; propose a way that works with this lib." |
| **Approval** | — |

---

## Part I — Business description

### Comments

Authors leave notes on the diagram for each other. Examples:

- "check the 9 kg threshold with the clinician";
- "copied from the 2014 chart";
- "TODO: French wording".

A comment is a coloured sticky note. It can point at the node it is about with a dashed line.

A comment is **not** part of the guideline:

- conversion never sees it;
- it never becomes a form note;
- the line is not a link in the flow.

### Groups (proposal)

Authors want to frame a set of nodes, such as "danger signs", "weight and height", or
"treatment", so a large activity reads in sections. They also want to move a section at once.

---

## Part II — Technical specification

### 1. Comments (implemented)

**Storage.** Comments are kept in the activity's `ui` block, which is presentation only.
`tricc_oo` `YamlModel` uses `extra="ignore"` and explicitly drops `ui` (yaml.py:78-81).

```yaml
ui:
  viewport: { x: 0, y: 0, zoom: 1 }
  comments:
    - id: comment
      text: Check the 9 kg threshold with the clinician
      color: blue          # yellow | blue | green | pink | grey
      x: 420
      y: 140
      node: n-weight       # optional: what the comment is about
```

**Model**

- `CanvasComment` and `ActivityUi` (`model/types.ts`). `COMMENT_COLORS`.
- The schema accepts `ui.comments`. `color` defaults to yellow.

**Mutations**

- `setComment` (add or replace) and `removeComment`.
- `setActivityViewport` now merges into `ui` instead of overwriting it.
- `removeNode` detaches comments about the deleted node. The comment stays.

**Canvas**

- A comment is its own React Flow node type (`comment`, flow id `comment:<id>`). It is not in
  `activity.nodes`, so the node list, validation, and export ignore it.
- Dragging a comment saves its position.
- Delete removes it.
- Dragging from its handle onto a node sets `node`. The canvas draws a dashed
  `.tricc-edge--about` line, which cannot be selected or deleted, and is never an edge.

**Editor**

- The Nodes palette has an "On the drawing only" group with **Comment** (`add-comment`).
- Comment details (`comment-properties`): text, colour, "About" (a node picker, or "Nothing in
  particular"), and Delete.

**Draw.io read**

- A labelled shape with no `odk_type` becomes a yellow comment, not a TRICC note node. It is an
  author note, and `tricc_oo` ignores it too. Before this, the frontend turned it into a note that
  conversion would show on the form.
- A shape with an unknown `odk_type` becomes a pink comment: "Unmapped type: <type> — <label>".
- An orphan hint or help shape becomes a grey comment.
- An edge between such a shape and a node becomes the comment's `node`, not an edge.

**Tests:** core 198, editor 118, e2e 148. The e2e test drags from the handle to a node, checks
the dashed line and that there are no connections, then moves the comment and reloads.

### 2. Groups: three ways that work with React Flow

#### A. Frames listed in `ui` (recommended)

```yaml
ui:
  groups:
    - id: danger-signs
      title: Danger signs
      color: pink
      nodes: [n-convulsions, n-lethargic, n-vomits]
```

**How it works**

- A frame is drawn behind its member nodes, as a React Flow node type `group` at `zIndex: -1`.
  Its rectangle is **computed** from the members' bounds plus padding, so it always fits and is
  never stored.
- Node positions stay absolute, exactly as today. Grouping changes no node and no edge.
- Dragging the frame's title bar moves every member: one `moveNode` per member, as one undo step.
- Making a group:
  1. select nodes (React Flow's Shift+drag box, or Ctrl+click);
  2. press **Group** in the toolbar;
  3. name it and pick a colour in a small dialog.
- Ungroup removes the frame only.
- A node belongs to at most one group. Adding it to a second group moves it there.
- Validation: `group.empty` (info, the frame is dropped on save) and `group.unknown-node`
  (removed silently on load).
- Draw.io read: a container shape (swimlane, or a group with child cells) whose children are TRICC
  nodes becomes a group, titled with the container label. That is how authors group in draw.io
  today.

**Why A:**

- No coordinate changes.
- No effect on validation, layout, or conversion.
- Simple to undo.
- It matches how draw.io authors already work.

**Limits**

- No nested groups in v1.
- Tidy layout ignores groups; it may scatter a group. A later pass can lay out per group.

#### B. React Flow sub-flows (`parentId`)

- React Flow's built-in grouping: members' positions are **relative** to the parent, and
  `extent: 'parent'` can keep them inside.
- It allows nesting and collapse.
- The cost: every member's `ui.x/y` changes meaning (relative instead of absolute), so the codec
  and import must convert both ways. Moving a node out of a group must re-base its coordinates.
  Layout and "fit view" code must handle both.
- More power than needed now, and much more to get wrong.

#### C. Lanes or swimlanes

- Fixed horizontal bands across the activity, each with a title, that nodes are placed into.
- They read well for long linear flows, but impose a layout the clinical author did not choose.
- Not recommended as the main grouping.

**Recommendation:** A now. B only if nesting or collapsing groups becomes a real need.

### 3. Groups as built (2026-10-09): option B, as TRICC page groups

Patrick chose B and said: "container_page from drawio is the group concept". So a group is not
only a drawing. In `tricc_oo` a `container_page` is a `TriccGroup`, and the XLSForm turns it into
a group, a section of the form.

**Format**

```yaml
groups:                       # activity level, read by tricc_oo once 20261009-yaml-page-groups lands
  - id: group
    name: danger_signs        # concept code; the title is that concept's display
    parent: outer             # optional, nested groups
    ui: { x: 300, y: 100, width: 400, height: 300, color: pink }   # frontend only
nodes:
  - id: q
    group: group              # membership, read by tricc_oo
    ui: { x: 20, y: 40 }      # relative to the group: React Flow's model, frontend only
```

**Model and mutations**

- `Activity.groups: CanvasGroup[]` and `TriccNode.group`.
- `setGroup`, `setNodeGroup`.
- `removeGroup` (Ungroup) moves the members and inner groups to the group's parent, keeping
  their place on screen.
- The text migration moves an inline group `label` to the concept named by the group, as it does
  for nodes. New group concepts get the type Misc.

**Canvas: React Flow sub-flows**

- A group is a `group-frame` node (`group:<id>`). Members get `parentId`, so they move with it.
- Parents are projected before children.
- `NodeResizer` shows on the selected frame. A resize is shown live and stored when it ends.
- **Re-parenting on drop.** When a drag ends, the node (or group) goes into the innermost group
  whose frame contains its centre, or out of its group. Its position is converted to the new
  group. A group cannot be dropped into itself or into a group inside it.
- No positions are converted anywhere else. They are frontend-only, and `tricc_oo` ignores them.
- Groups cannot be deleted with the Delete key, which would delete their nodes in React Flow.
  Ungroup is in the group's details.
- Tidy layout leaves grouped nodes in place.

**Editor**

- The palette section "Organise" has **Group** (`add-group`) and **Comment**.
- Group details (`group-properties`):
  - Name, the concept code;
  - Title, which writes that concept's display and creates the concept if needed;
  - Colour;
  - member count;
  - Ungroup.

**Draw.io**

- Only `odk_type="container_page"` shapes become groups (name, label, nesting).
- Their children get `group`. Draw.io positions inside a container are already relative, which
  also fixes an older bug where those nodes were placed as if absolute.
- A plain untyped container stays a drawing: its text becomes a comment.

**Tests:** core 202, editor 119, e2e 150. The e2e test drops a question into a frame, moves the
frame by its title (the question follows), then drags the question out.

