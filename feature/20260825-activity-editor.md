# Activity Editor — graph authoring, node modifiers, branch semantics

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_frontend` — `@tricc/editor` |
| **Related** | `20260825-guided-authoring.md` (roles, explanation, disclosure — shapes this surface), `20260825-document-model.md` (state, undo, subscriptions), `20260825-library-architecture.md` (capabilities), `20260825-project-format.md` (§4 node types, §5 edge semantics), `20260825-cql-authoring.md` (expression fields), `20260825-terminology.md` (concept binding) |
| **Approval** | — |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### What this is

The screen where a clinical author actually draws a guideline: a canvas of questions, decisions
and diagnoses connected by arrows, replacing the draw.io page.

### What it fixes about drawing in draw.io

Authors make mistakes for two distinct reasons, and this spec addresses only the second. They
misunderstand TRICC's conceptual model — which is real, and is the subject of
`20260825-guided-authoring.md`. And, separately, draw.io cannot tell them anything even when they
do understand it. The meaning of a box lives in its shape style and in an attribute panel of free
text, so:

- A misspelled attribute name is accepted silently and ignored at conversion.
- Whether a node type accepts a given attribute is knowable only by reading the Python source.
- An arrow labelled `Yes` and one labelled `yes ` behave differently.
- A `goto` pointing at a renamed page fails only when someone runs a conversion, often days later.

The editor knows what a node is. A weight question offers minimum, maximum, unit and concept
binding, and nothing else. An arrow out of a yes/no question offers Yes, No and Continue as
choices rather than a text box. A `goto` offers the list of activities that exist. Mistakes that
are currently found by a failed conversion are prevented at the point of drawing.

That is a necessary foundation and not, on its own, sufficient: knowing that a rhombus needs a
`reference` does not tell an author what a rhombus is *for*. Explaining the model — and supporting
the clinician/IT collaboration that authoring actually requires — is
`20260825-guided-authoring.md`. This spec builds the surface that one shapes.

### Modifiers on a node

Some things authors think of as properties of a question really are properties: a hint, a help
message, an illustration. The editor shows them on the node.

One looks the same but is not: **"not available"**. Marking a measurement as possibly
unavailable — a scale is broken, a test is out of stock — creates a real, separate answer that the
rest of the guideline can branch on. It is offered in the same place as hint and help because that
is where authors look for it, but it is labelled as adding a branchable output, and it appears in
the saved file as its own node with its own name.

### Layout

The canvas remembers exactly where you put things. Auto-layout is offered as an explicit action
you can undo, never applied silently on open. Clinical authors arrange flowcharts to mirror how
care actually proceeds — rearranging that on their behalf destroys meaning they put there on
purpose.

---

## Part II — Technical specification

### 1. Canvas

React Flow 12. Nodes and edges are **projections of the project document**
(`20260825-document-model.md`), not React Flow's internal state: `onNodesChange` handlers call
`transact`, and the document is the single source of truth. Letting React Flow own state is what
makes undo, collaboration and external-change reconciliation intractable later.

Subscriptions are per-node (`useNode(activityId, nodeId)`), so editing one node re-renders one
node. A whole-document snapshot per keystroke does not hold at 500 nodes.

Every mutating interaction is gated on `project.write` (`20260825-library-architecture.md` §4).
Components take a derived `readOnly`: handles disappear, drag is disabled, the palette hides, and
the properties panel renders as fields rather than inputs. The document rejects mutation
independently, so a component that forgets to gate cannot corrupt a read-only session.

- Pan, zoom, fit-view, minimap, selection box, multi-select
- Snap-to-grid (8 px), alignment guides
- Copy/paste within and across activities, with `id` regeneration and `name` collision resolution
- Keyboard: Delete, Ctrl+Z/Y, Ctrl+C/V/D, arrow-key nudge, Tab through nodes (accessibility)

### 2. Palette

Grouped exactly as `20260825-project-format.md` §4: Flow, Questions, Logic, Data, Clinical.
Drag onto the canvas, or double-click empty canvas for a searchable quick-add.

`factor` never appears — it is created from numeric edge labels during processing and is in no
`TYPE_MAP`. `container_hint_media` is deprecated and not offered.

`bridge` and `wait` **are** offered (`20260825-project-format.md` §4.1–4.2). Both are drawable in
draw.io today and both serve authoring purposes the editor should keep: a bridge is a hub that
keeps a dense graph readable, and a wait is how an author says "not until this is done" without
making it a condition.

Palette entries are **context-aware**: `start` is offered only when the activity has none;
`select_option` only via its parent select; `activity_end` only once. Offering a node that will
immediately fail validation is a worse experience than not offering it.

### 3. Node rendering

One `BaseNode` with per-type bodies, carrying forward the prototype's `flow-nodes/` design.

Each node shows: type icon and colour, display text, bound concept code (subdued), and modifier
badges. Validation state is a border treatment plus an icon, never colour alone — colour already
encodes node type, and `proposed_diagnosis` severity is itself colour-derived in draw.io
(`severity_from_color`, `xml_to_tricc.py`).

**Display text** follows the rule in the existing `USER_DOCUMENTATION.md`: non-sequence nodes show
their bound concept's display; sequence nodes (`start`, `end`, `activity_start`, `activity_end`)
keep their own label. Selects show the main concept as the question and option concepts as the
answers.

### 4. Properties panel

Driven by a per-type field descriptor rather than one branching component — the prototype's
484-line `NodePropertiesPanel.tsx` with growing conditionals is the shape to avoid:

```ts
interface FieldDescriptor {
  key: string
  kind: 'text' | 'localized' | 'number' | 'boolean' | 'select' | 'cql' | 'concept'
       | 'activityRef' | 'nodeRef'
  label: string
  help?: string
  visibleWhen?: (node: Node, project: Project) => boolean
  validate?: (value: unknown, node: Node, project: Project) => Issue[]
}
```

The descriptor table is derived from the same Zod schemas as the format, so a field added to the
schema and not to the panel is a type error rather than a silent omission.

Notable field kinds:

- **`cql`** — opens the CQL editor (`20260825-cql-authoring.md`). Used for `relevance`,
  `calculate`, `expression`, `constraint`, and conditional edge values.
- **`concept`** — concept picker (`20260825-terminology.md`).
- **`activityRef`** — for `goto.link`, a picker over existing activity ids. Never free text; this
  is what makes broken `goto` links impossible to create rather than merely detectable.
- **`nodeRef`** — for `rhombus.reference`, a picker over reachable nodes.

There is deliberately no `save` field. Where an answer is persisted follows from its concept
(`20260825-project-format.md` §3.1a), so the properties panel shows it as **derived, read-only
information** beside the concept binding — "stored as an Observation", "stored on the patient
record as `birthDate`" — with a link to the concept page to change it. Showing it is worth doing;
making it editable per node is what created the problem.

### 5. Node modifiers

Rendered in a "Modifiers" section of the properties panel and as badges on the node.

| Modifier | Effect |
|----------|--------|
| Hint | `hint` attribute; localized |
| Help | `help` attribute; localized |
| Image | `media.image`; file picked into `media/` |
| **Not available** | Generates a `not_available` node (§5.1) |

#### 5.1 Not-available

Enabling it on a capture node:

- creates a `not_available` node with its own `id` and `name` (default `<parent name>_not_available`)
- creates an edge from the parent to it
- positions it adjacent to the parent, and keeps it adjacent when the parent moves
- exposes its `name` to CQL autocomplete like any other node

The panel states plainly that this adds a branchable output. Disabling it deletes the generated
node and its edges, with the usual confirmation if downstream logic references its name — which
the editor can determine, because it parses the CQL.

On load, a `not_available` node whose only inbound edge comes from a capture node is displayed as
a modifier badge on that node rather than as a free-standing node, so files written by hand or by
`tricc_oo` fixtures render the way an author expects. It remains selectable on the canvas via the
badge, since its `name` and concept are addressable.

### 6. Edges

Creation by dragging between handles. On connect, the branch type is chosen from a typed control:

| Choice | Serialized `value` |
|--------|--------------------|
| Unconditional (default) | absent |
| Yes | `yes` |
| No | `no` |
| Continue | `continue` |
| Score | the integer |
| Condition | the CQL text |

"Unconditional" and "Continue" are distinct and both are offered: an absent value is plain flow,
while `continue` is an explicit "proceed regardless of the answer" on a node that branches. The
deprecated `follow` / `suivre` spellings are read but never written.

Only Condition opens a CQL editor. The label on the canvas shows the chosen branch; conditions
show a truncated rendering with concept names resolved to displays.

Validity is enforced at connect time: `yes`/`no` only from nodes that branch
(`select_yesno`, `rhombus`, calculate-capable); at most one `yes` and one `no` per source; no
self-loops; `select_option` connects only from its parent select.

Waypoints are draggable and persisted in `ui.waypoints`.

#### 6.1 Order-constraint edges

A second edge kind, alongside sequence edges, expressing `wait` (`20260825-project-format.md` §4.2).

- Drawn from the **awaited** node to the **dependent** node — "A waits for B" is drawn B → A, which
  matches the direction of the constraint rather than the direction of reading.
- Rendered distinctly: dashed, muted, no branch-type control, no condition. It carries no relevance
  and must not look like anything that does.
- Created from a dedicated connection mode (or by drawing a connection and switching its kind),
  never by accident — an author reaching for a sequence edge must not produce an ordering
  constraint.
- Toggling to the node form is available on any order-constraint edge, and is required
  automatically when the author adds a second successor or an expression reference.

**Validation:** the awaited node must be reachable and must not be downstream of the dependent node
(that is a deadlock, not a constraint); self-reference is refused; constraint cycles across several
waits are detected and reported with the cycle named.

The plain-language rendering (`20260825-guided-authoring.md` §5) states the semantics explicitly —
"waits for *Malaria test result*, but does not depend on it" — because the distinction between
ordering and relevance is exactly the thing authors get wrong, and the whole reason `wait` has
both `path` and `reference`.

#### 6.2 Bridges

A bridge is created from the palette, or by selecting several edges that share endpoints and
choosing "route through a bridge", which is the operation an author actually wants when a diagram
has become unreadable.

- Rendered as a small junction (BPMN gateway-like), not as a node with a body — it holds no
  clinical content.
- Dragging it moves the junction; edges re-route.
- "Dissolve bridge" restores direct edges, as one undoable command.
- **Validation:** a bridge with no predecessors or no successors is dead and reported; bridge cycles
  are refused.

Auto-injected bridges (`path_<id>`) never appear in authored files, so a bridge on the canvas is
always one the author made.

### 7. Layout

- Positions always come from `ui`; nodes lacking it are placed by auto-layout on load.
- **Auto-layout** (`dagre`, top-to-bottom) is an explicit toolbar action, applies to the selection
  or the whole activity, and is a single undoable command.
- Align/distribute actions for selections.
- Never re-lays out silently — the format spec's position round-trip guarantee depends on it.

### 8. Live validation

Rules from `20260825-project-format.md` §9 run against document snapshots, incrementally on change
(debounced 300 ms), in a Web Worker past a few hundred nodes so typing never stutters. Results are
held outside the document — validation output is derived state and storing it would make peers
replicate stale conclusions (`20260825-document-model.md` §3).

Presentation: badge on the node, list in a collapsible panel, click to focus. Errors block export;
warnings do not. Editing is never blocked.

Activity-scoped rules: unreachable nodes, missing start, missing end, selects without options,
calculates without expressions, capture nodes without `name`, duplicate `name` in the same repeat
slot, unresolvable `rhombus.reference`, concept codes absent from the CodeSystem, CQL outside the
TRICC profile.

Project-scoped rules (`goto` targets, `link_in`/`link_out` pairing, cross-activity name
collisions) run on save and on export.

### 9. Performance

Real guidelines reach several hundred nodes per activity.

- React Flow `onlyRenderVisibleElements` past 150 nodes
- Node components memoized on their slice of store state, not on the whole node
- Validation off the main thread past 200 nodes
- Budget: interaction stays under 16 ms at 500 nodes, asserted by a Playwright performance test

### 10. Code checklist

| Path | Change |
|------|--------|
| `packages/editor/src/activity/Canvas.tsx` | React Flow surface, store-projected |
| `packages/editor/src/activity/nodes/` | Per-type node components (ported from `flow-nodes/`) |
| `packages/editor/src/activity/edges/` | Sequence + order-constraint edge components, branch-type control |
| `packages/editor/src/activity/bridge/` | Bridge junction, route-through, dissolve |
| `packages/editor/src/activity/wait/` | Wait node, edge⇄node collapse/expand |
| `packages/editor/src/activity/palette/` | Context-aware palette |
| `packages/editor/src/activity/properties/` | Descriptor-driven panel + field kinds |
| `packages/editor/src/activity/modifiers/` | Modifier UI + not-available expansion/collapse |
| `packages/editor/src/activity/layout/` | dagre auto-layout, align/distribute |
| `packages/editor/src/activity/validation/` | Incremental runner + worker |
| `src/pages/ActivityEditor.tsx` | **Deleted.** Replaced; the 739-line prototype mixes canvas, palette, properties and persistence in one component. |

### 11. Tests

**Unit** — descriptor visibility/validation per node type; not-available expansion and collapse
(including the load-time collapse heuristic); **wait edge⇄node collapse, including the cases that
must stay a node — activity reference, expression reference, multiple successors**; deadlock and
constraint-cycle detection; bridge dissolve/route-through round-trip; edge branch validity; auto-layout determinism;
copy/paste id regeneration and name deduplication.

**Component** — properties panel renders exactly the descriptors for a type; changing a
descriptor field dispatches one command; validation badges reflect issues.

**Component** (continued) — read-only mode removes every mutating affordance and the underlying
`transact` is never called.

**E2E** — draw a branching activity end to end; drag a node and confirm the position persists
across save/reload; toggle not-available and confirm the YAML gains a node; create a `goto` and
confirm the target list is constrained to real activities; auto-layout is undoable in one step;
500-node performance budget.

### 12. Acceptance criteria

- [ ] Every drawable type in `20260825-project-format.md` §4 can be created, configured and saved.
- [ ] `factor` cannot be created, and loading a file containing one is a validation error.
- [ ] `bridge` and `wait` can be created; a wait renders as an order-constraint edge where it can
      and as a node where it cannot, round-tripping to the same serialized model either way.
- [ ] An order-constraint edge is visually and interactionally distinct from a sequence edge, and
      cannot be created by accident.
- [ ] Deadlocks and constraint cycles are detected and named.
- [ ] Branch semantics are chosen from a typed control; `yes`/`no` are never free text.
- [ ] `goto` targets are picked from existing activities and cannot dangle.
- [ ] Not-available round-trips as a distinct node and displays as a modifier badge.
- [ ] Node positions and edge waypoints survive save/reload exactly.
- [ ] Auto-layout only ever runs when asked, and undoes in one step.
- [ ] Validation issues are visible inline and never block editing.
- [ ] Read-only sessions expose no mutating affordance, and mutation is refused at the document
      layer regardless.
- [ ] Editing one node re-renders one node at 500 nodes.

### 13. Implementation phases

1. Canvas + store projection + basic node/edge rendering.
2. Palette with context awareness.
3. Descriptor-driven properties panel; simple field kinds.
4. Reference field kinds (`activityRef`, `nodeRef`, `concept`) + derived persistence display.
5. Edge branch control; order-constraint edges; bridges.
6. Modifiers, including not-available expansion/collapse.
7. Layout tools.
8. Incremental validation + worker.
9. Performance pass.
