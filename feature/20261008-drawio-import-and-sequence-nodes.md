# Draw.io import fixes and nameless sequence nodes

| Field | Value |
|-------|-------|
| **Status** | Frontend implemented 2026-10-08, not committed. `tricc_oo` part sent to that session. See "Implementation notes" at the end. |
| **Repo** | `tricc_frontend` + **`tricc_oo`** (§2.1 and §2.3, Python side) |
| **Related** | `20261008-authoring-continuation.md` (§3 Draw.io, §4 Navigator), `20261008-not-available-node.md` (edges into `not_available`), `20260825-tricc-oo-interop.md` |
| **Source** | Review remarks, 2026-10-08 |
| **Approval** | — |

---

## Part I — Business description

Four problems were found when using the app with real drawings.

1. **An activity start does not need a name.** Start, activity start, and activity end are
   sequence nodes. TRICC may give them an internal id, but that is not a business name and the
   author should not be asked for one. Today the editor fills one in, and `tricc_oo` stops when a
   draw.io `activity_start` has no `name`.
2. **Importing a draw.io file puts pages in the wrong place.** A page with a main start (`start`)
   is a process. A page with an activity start is an activity. The import currently skips pages
   or treats every page as an activity.
3. **The activity's name should be the start node's label, because the start node is the activity.** In a drawing, the author writes
   the activity's name on the activity start shape. Today the importer uses the draw.io page tab
   name as the title and keeps the shape label only on the node.
4. **Edges into "extension" nodes are not branches.** An edge into `not_available`, a hint, a help
   text, or a picture attaches that thing to the question. It never has a Yes/No/answer condition.
   The importer keeps whatever label the drawing had on that edge.

After this work, a multi-page draw.io file can be imported once. Each page lands as a process or
an activity based on its start node. Activities are named by their start shape, and no sequence
node asks for a name.

---

## Part II — Technical specification

### 2.1 Sequence nodes carry no business name

**Frontend**

- `packages/editor/src/activity/ActivityEditor.tsx:1027-1048`: remove `activity_start` and
  `continue_with` from the editor's `needsName` list, so adding them from the palette does not
  call `uniqueId`.
  - This brings the editor list in line with the validator (`packages/core/src/validate/activity.ts:256-276`).
  - The validator list adds `not_available`. Keep that.
- Move both lists into one exported `NAMED_TYPES` in `packages/core/src/format/schema/node-types.ts`
  beside `SEQUENCE_TYPES`. The editor and the validator both import it, so they cannot drift again.
- `packages/core/src/format/serialize/index.ts:193-212` `createActivity`: stop writing
  `name: toName(opts.id)` on the root `activity_start`.
- Properties panel (`ActivityEditor.tsx:402-410`): hide the Name field for `SEQUENCE_TYPES`.
  - If a loaded node already has a name, show it read-only, labelled "Internal id".
  - The name is kept on save. Existing YAML stays byte-stable.
- Validation: no new rule. A sequence node with no name is valid.

**`tricc_oo`** (branch `feature/frontend-project-inputs`, change only once this spec is approved)

- `converters/drawio_type_map.py:45-50`: change the `activity_start` mandatory attributes from
  `["label","name"]` to `["label"]`.
  - `xml_to_tricc.py:616` already falls back to `act_` + id through `_get_name`. Confirm that
    path, and that the generated name is stable between runs (`make exports deterministic`, commit 4912635).
- YAML path: already fine. `TriccNodeActivityStart.__init__` (`models/tricc.py:58-61`) generates
  a name. Add a regression test for an `activity_start` with no name, next to
  `tests/test_yaml_concept_texts.py`.
- Do not touch `TriccNodeActivityEnd.set_name` (continuation §3).

### 2.2 The start node is the activity

**Principle (Patrick, 2026-10-08).** The root node of a page is the activity. That holds for
`activity_start` and for the process `start`. The root carries no attributes of its own that
repeat the activity's. It *shares* the activity attributes from the YAML.

**YAML shape.** Activity-level keys are the single copy. The root node keeps only `id`, `type`
and `ui`, plus its edges.

```yaml
id: weight-measurement
name: weight_measurement            # see 20261008-names-and-activity-settings.md
title: { en: Weight measurement }   # shown on the root node
process: registration               # process pages only (was on the start node)
applicability: "AgeInMonths() < 60" # was the root node's relevance
nodes:
  - { id: root, type: start, ui: { x: 80, y: 40 } }
```

- **Read.** A `label`, `name`, `process`, or `relevance` found on the root node is lifted to the
  activity, unless the activity already has a value:
  - `label` becomes `title`;
  - `name` stays the activity `name`;
  - `relevance` becomes `applicability`.

  If both exist and differ, keep the activity value and emit info
  `activity.root-attribute-dropped`.
  - `activity-kind.ts:43-47` `processOf` becomes `activity.process`.
- **Write.** Never write these keys on the root node.
- **`form_id`** is retired. It is read only to set the intervention `name`
  (`20261008-names-and-activity-settings.md` §2.2).

**Editor**

- Selecting the root node shows a read-only summary of the activity in Details: title, code,
  process, and applicability.
  - An **Activity settings** button opens the activity dialog
    (`20261008-names-and-activity-settings.md` §2.4), so the fields live in one place only.
- The canvas shows the activity title on the root node.
- The root has no Name field (§2.1).

**Draw.io read**

- The title of **both** kinds of page is the root shape's label. Strip the HTML with the importer's
  label helper, and fall back to the page name when the label is empty.
  - `packages/core/src/format/drawio.ts:208` currently sets `title = {[lang]: page.name || id}`.
- `process`, `relevance`, and a valid `name` on the root shape (`drawio.ts:214-236`) are written to
  the activity, not the node. `form_id` follows the migration in the names plan.
- Other shapes on the page: question and answer labels do not stay on the nodes. They go through
  the concept migration in `20261008-data-dictionary-and-concept-texts.md` §2.0.

**Id.** Keep the id derived from the page name (`drawio.ts:44`).

- The id is the file name and the `goto` target. Changing it on every relabel breaks links
  (`resolveLink`, `ActivityNavigator.tsx:281-286`).
- `import-activity.ts:45-62` `renamedFrom` detection compares against a slug of the title.
  Switch it to compare against the id.

**`tricc_oo`.**

- **YAML:** `_build_activity` (`yaml.py:450-492`) already names the activity from `title`.
  - Add: copy activity-level `process` onto the root `TriccNodeMainStart`.
  - `applicability` is already read (`yaml.py:516`).
  - `name` and `form_id` are covered in the names plan §2.3 (implemented).
  - Add: set the root node's label to the title.
  - Keep reading them from the root node, for files written before this change.
  - `_assign_start_page` (`yaml.py:725-749`) already falls back to `activity.process`.
- **Draw.io:** `create_root_node` (`xml_to_tricc.py:600-608`) sets the root label to the page
  name. Make it prefer the shape label, then the page name, and set `activity.label` the same way.

### 2.3 Process or activity per page on import

**First reproduce the bug.** The code as read classifies pages by root type
(`activity-kind.ts:19-31`), and a `start` root counts as a process. The reported behaviour does
not follow from that alone. Reproduce it with `combacal-L2/bp_int/bp_int.drawio`, which has
`odk_type="start"` shapes, through each of these:

1. Navigator import from the Activities tab.
2. Navigator import from the Processes tab.
3. Opening a project whose `tricc.yaml` lists the `.drawio` file.

Suspects, in order:

- `rootNode` takes the *first* `start` or `activity_start` in `nodeOrder`. A process page that
  also holds an `activity_start`, or a `start` that is not first, is read as an activity.
  - Fix: a page with any `start` node is a process.
  - Two `start` nodes on one page is a validation error. That rule already exists for roots.
- `start` shapes nested in a container cell, so `classify` (`drawio.ts:302-312`) never sees the type.
- The open-project path assigns pages to interventions without calling `activityKind`.

**Import UX change.** One import handles every page.

- `ActivityNavigator.tsx:130-169`: stop putting pages of the other kind in `skipped`. Each page
  is added as what its root says.
- The confirm dialog lists two groups, "Processes (n)" and "Activities (n)". After Import, the
  navigator switches to the tab of the first group that is not empty.
- Keep both Import buttons so the entry point stays where authors look. Both open the same dialog.
- Remove the copy "These are processes. Import them from the Processes tab."
- Process default: a `start` with no `process` attribute keeps `process` unset in the frontend.
  - Do not copy `tricc_oo`'s `"registration"` (draw.io) or `"main"` (YAML) default into the file.
  - Show a validation **info** `process.default-process` that names the default `tricc_oo` will apply.

### 2.4 Edges into extension nodes are unconditional

**Extension targets** are:

- `not_available`
- a hint or help message shape
- an image shape linked by an edge

Add `isExtensionTarget(type)` in `node-types.ts`, next to `isSequenceNode`.

- **Draw.io read** (`drawio.ts:199-201`): when the target is an extension, drop the edge `value`.
  - If a value was dropped, record an import note: "Edge into Not available had a label; it was
    removed."
  - Hint, help, and image shapes are already folded or turned into notes (`drawio.ts:159-168`, 196).
    Only `not_available` keeps a real edge.
- **Canvas**: connecting into an extension node never opens the branch modal, even from a
  `select_yesno` or a rhombus. A `select_one` / `select_multiple` source uses the bottom `out`
  handle, not an answer handle.
- **Validation**: new warning `edge.extension-conditional` when an edge into an extension carries
  a value or condition. It is located on the edge. The quick fix clears the value.
- **YAML**: no format change.

### 2.5 Tests

- core vitest:
  - page kind for a page with both `start` and `activity_start`
  - title from the `activity_start` label, with page-name fallback
  - edge value dropped into `not_available`
  - `createActivity` root has no name
  - a named root round-trips unchanged
- editor integration:
  - no Name field on sequence nodes
  - the activity header title shows on the `activity_start` node
- e2e `navigator.spec.ts`: a multi-page draw.io import lands pages on both tabs.
  - Use a small, clinically sensible multi-page drawing built for the test, inline or under
    `e2e/fixtures/`. (2026-10-08) `examples/` and the tests that read it were removed, because the examples were structurally wrong. New fixtures must be content that makes sense, and should be built inline or under `e2e/fixtures/`.
- `tricc_oo`: a draw.io `activity_start` with label and no name loads, and gets a deterministic name.

### 2.6 Open questions

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Should the activity **id** also follow the start label, or stay on the page name? | Stay on the page name. Ids are file names and `goto` targets. |

### 2.7 Settled on 2026-10-08

| Question | Answer |
|----------|--------|
| Do the root node and the activity share attributes? | Yes. The start node is the activity, and both kinds of root read the activity attributes from the YAML (§2.2). |
| Process page title | Taken from the `start` label like any root, falling back to the page name. |
| Existing `name` on a draw.io root | Lifted to the activity as its `name`. It is not shown as the title. |
| `form_id` | Retired. Replaced by the intervention `name`. It is read only for legacy projects without interventions (`20261008-names-and-activity-settings.md`). |

## Implementation notes (frontend, 2026-10-08)

**Reproduction (§2.3).** `combacal-L2/bp_int/bp_int.drawio` was classified correctly:
`navigation` is a process and the 17 other pages are activities. The reported bug was the import
dialog. Importing from the Activities tab put the process page on a "skipped" list, which said to
import it from the Processes tab.

**Names and the root node**

- `NAMED_TYPES` and `needsName()` live in `node-types.ts`, and the validator and the editor both
  use them.
- `createActivity` and `createProcessActivity` write roots with no name and no process.
- Sequence nodes show no Name field. A name already on one shows read-only as "Internal id".
- `liftRootAttributes()` in `activity-kind.ts` moves the root's label, name, process, and
  relevance to the activity's title, name, process, and applicability.
  - It runs on YAML decode and on draw.io read.
  - The encoder never writes those four keys on the root.
  - When the activity already has a different value, the activity wins, and the root's value is
    dropped without a notice. There is no channel for load notices yet.
- `rootNode()` prefers any main `start` on the page.
- `processOf()` reads the activity first.
- The canvas shows the activity title on the root (`activityTitle` in node data).
- Selecting the root shows only the activity summary and its settings button.

**Draw.io read**

- The title of both page kinds comes from the root shape's label, with the page name as fallback.
- The id still comes from the page name.
- Root `relevance` is read and becomes `applicability`.
- `renamedFrom` is worked out from the id suffix.

**Import dialog**

- Every page is imported as its kind. The dialog groups them as `import-group-process` and
  `import-group-activity`.
- After Import, the navigator switches to the first group's tab and opens its first entry.

**Edges into Not available**

- `EXTENSION_TARGET_TYPES = ['not_available']` with `isExtensionTarget()`.
- On draw.io read, an edge value into Not available is dropped.
- On the canvas, a link into Not available is unconditional: no branch dialog and no answer
  condition.
- `edge.extension-conditional` (warning) carries the fix kind `edge.clear-value`. The editor does
  not apply fix kinds yet.
- The canvas path can't be tested end to end until Not available is on the palette (the
  Not available plan).

**Not done**

- The `process.default-process` info. The existing `process-activity.no-process` error already
  flags a process page without a process, which is stricter.
- `activity.root-attribute-dropped` and the import note for a dropped edge label. No notice channel
  exists yet.

**Tests**

- core: 154 passed, including kind, title fallback, the lift, the edge drop, and nameless roots.
- editor: 91 passed.
- e2e, chromium and firefox: all pass, including a new two-page Registration → Weight measurement
  drawing built inline.

## Fix 2026-10-09: edges leaving an answer

- In draw.io, a select's answers are child cells of the question, and links leave from the
  answer cell. The reader folded the answers into `options` but dropped every edge whose source
  was an answer cell. Edges from select_multiple (and select_one) answers were lost.
- Such an edge is now imported as an edge from the question, with the value
  `Answer('<answer name, else cell id>')`. That is the form the editor writes when an author
  links from an answer row, so the canvas draws it from that answer's handle.
- A label the drawing had on that edge is replaced by the answer condition.
- Checked on `combacal-L2/bp_int/*.drawio`: select_multiple answer edges such as
  `Answer('other')` and `Answer('Amlodipin_HCTz')` now come through.
- Test: core `drawio.test.ts`, "imports an edge leaving an answer as an edge from its question".

## Fix 2026-10-09: hint and help linked by an edge

- `tricc_oo` attaches a `hint-message` / `help-message` shape to its question through an edge
  (message → question, `xml_to_tricc.py` `process_edges` → `enrich_node`). The frontend only
  handled the shape placed inside the question, so linked hints and helps became comments.
- Now a linked message becomes the question's `hint` / `help`, and the edge is dropped. The text
  migration then moves it to the question's concept. Only a message no edge attaches becomes a
  grey comment.
- On 60 drawings from `ETAT-Malawi`, `global-almanach`, and `combacal`: 17 hints and 89 helps
  attach (12 files); 3 unattached messages stay as comments.
- The canvas shows a yellow **(!)** for a hint and a blue **(?)** for help at the bottom right of
  the node, with the text on hover (`node-<id>-hint`, `node-<id>-help`). They are read from the
  concept, or from the node while it has no concept. They replace the "Hint" and "Help" text
  badges.

