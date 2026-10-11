# Canvas display — wrapped node text and removing an activity

| Field | Value |
|-------|-------|
| **Status** | Implemented 2026-10-08, not committed. See "Implementation notes" at the end. |
| **Repo** | `tricc_frontend` |
| **Related** | `20261008-authoring-continuation.md` §4 (Activity editor, Navigator, intervention bin), `20261008-data-dictionary-and-concept-texts.md` (concept card on nodes, Data dictionary tab) |
| **Source** | Review remarks, 2026-10-08 |
| **Approval** | — |

---

## Part I — Business description

**Node text is cut to one line.**

- Clinical questions are long, but every node shows its text on a single line with an ellipsis.
- The full text is not even shown in a tooltip.
- Nodes should grow to fit their text, up to a number of lines. The default is 3.
- Each author sets that number in **Preferences**.
- Tidy layout should then space the taller nodes correctly.

**An activity cannot be removed.**

- Authors can create and import activities, but cannot delete one.
- There should be a bin next to the activity name in the editor header.
- It asks first and says what will be affected: the interventions that list the activity and the
  activities that jump to it.

---

## Part II — Technical specification

### 2.1 Wrapped node text

**CSS** (`packages/editor/styles.css`)

- `.tricc-node__label` (l.619-624) and `.tricc-node__answer-label` (l.673-677): replace
  `white-space: nowrap; text-overflow: ellipsis` with a clamp:

  ```css
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--tricc-label-lines, 3);
  line-clamp: var(--tricc-label-lines, 3);
  overflow: hidden;
  overflow-wrap: anywhere;
  white-space: normal;
  ```

- `.tricc-node__code` stays on one line, because it is an identifier.
- Width stays fixed: 200 px, 220 px for answer nodes, 160 px for terminators. Only the height
  grows (`min-height: 48px` already allows it). Fixed widths keep columns aligned.
- **Tooltip:** `title` = full text on `.tricc-node__label` (`TriccNode.tsx:39`). The node-level
  `title` stays `type — name`. Answer rows already have one (`TriccNode.tsx:99`).

**Preference: lines of text on a node**

The line count is a **user preference**. It lives on the Preferences page and is not a project
setting.

- **Preferences page** (`apps/local/src/App.tsx:411-434`, beside the display name):
  - field "Lines of text on a node", number input 1-6, default 3;
  - test id `pref-label-lines`;
  - it applies immediately, with no save button, like the display name.
- **Storage:** add a `preferences` port beside identity in the local adapters
  (`packages/adapters-local`, `apps/local/src/adapters.ts`):
  - `get(): Preferences`
  - `update(patch)`
  - `subscribe(cb)`

  The local adapter keeps it in browser storage. Every read and write is wrapped in try/catch, and
  a missing value means the default.

  It is **never** written to `tricc.yaml` or the project folder. Two authors on one project can
  differ.
- **Editor:** the runtime context (`packages/editor/src/runtime/context.tsx`) exposes
  `preferences.labelLines`.
  - `ActivityEditor` sets `--tricc-label-lines` on `.tricc-editor`, so nodes re-flow from CSS with
    no node re-render.
  - A host without a preferences port gets 3.
- Later per-viewer display settings go into the same `Preferences` object.

**Layout** (`packages/editor/src/activity/canvas/layout.ts`)

- `NODE_W = 200` and `NODE_H = 64` are hard-coded (l.4-5). `layout()` takes a size lookup
  `(id) => {width, height} | undefined`.
- `Canvas` passes React Flow's measured sizes (`node.measured`, already cached at
  `Canvas.tsx:106-107, 397-425`). The constants remain the fallback.
- For the first open of nodes with no `ui` (`Canvas.tsx:146, 164-166`):
  1. lay out with the constants;
  2. after the first measure (`useNodesInitialized`), lay out once more for those nodes only.
- Changing the preference does not re-run Tidy automatically. The author presses Tidy layout.
- Do not write `node.width` / `node.height` into the document (continuation §4 rule).

### 2.2 Remove an activity

**UI**

- Activity editor header (`ActivityEditor.tsx:140-177`): a bin icon button right after the
  title and the settings gear (`20261008-names-and-activity-settings.md` §2.4), before the kind
  and Tidy layout. The settings dialog has the same bin, which opens the same confirmation.
  - Test id `delete-activity`, `aria-label` "Delete activity".
  - Hidden when `!canWrite`.
- Move `ConfirmDelete` (`InterventionEditor.tsx:471-530`) into
  `packages/editor/src/common/ConfirmDelete.tsx`, with `title`, `body`, and `testId` props. The
  intervention delete keeps its current copy.
- Confirm dialog `delete-activity-dialog`:
  - Title: "Delete this activity?"
  - Body: "This removes {title} from the project."
  - When the activity is used, a list follows:
    - "Listed by: {intervention titles}", from `activityUsage()` (`ActivityNavigator.tsx:752-760`);
    - "Linked from: {activity titles}", from `goto` and `wait` nodes whose `link` is this id.
  - Cancel is focused. Escape and backdrop behave as for interventions.
- After deleting, return to the Project overview (`onSelect(undefined)`).

**Core**

- `tx.deleteActivity(id)` in `packages/core/src/document/mutations.ts`, next to the uncalled,
  non-cascading `removeActivity` (l.49-51). It runs in one transaction, so it is one undo step:
  1. remove `id` from every intervention's `activities`;
  2. delete the activity.
- `goto` nodes elsewhere are **not** changed. They show "Missing activity" (`goto-missing`) and
  raise `goto.dangling-link`. This follows the continuation rule "do not invent target activities"
  and lets Undo restore the link. The dialog warns about it in advance.
- Concepts used only by the deleted activity stay in the dictionary. Their usage count drops to 0.

**Save**

- `writeChanged` (`serialize/index.ts:43-72`) deletes managed paths that are no longer produced.
  But the baseline is `writeProject(project)` on open, which only has *canonical* paths.
- A file read from a non-canonical path (for example `activities/Weight.activity.yaml` or a
  sub-folder) would survive the save and reappear on the next open.
- Fix: keep each activity's `sourcePath`. It is not serialized. Add it to the baseline.
- An activity from a `.drawio` page is never deleted on disk, because `.drawio` is unmanaged.
  - After a save, `tricc.yaml` no longer lists that `.drawio` (continuation §3), so the page does
    not come back.
  - If the project was never saved, the dialog adds: "It is still in {file}.drawio."

### 2.3 Tests

**editor integration**

- the label has the clamp class and `title`
- `labelLines` from preferences sets the CSS variable
- a host without preferences uses 3
- delete hidden when read-only
- the dialog lists interventions and linking activities
- one undo restores the activity and its refs

**apps/local**

- the preference persists across reload
- a storage error falls back to 3

**core**

- `deleteActivity` cascade
- `writeChanged` removes a non-canonical source path

**e2e**

- `canvas.spec.ts`:
  - a long label wraps to 3 lines: node height > 48 and < 100;
  - after setting `pref-label-lines` to 5, the same node grows;
  - after Tidy, two tall nodes do not overlap (bounding boxes).
- `authoring.spec.ts`:
  - delete an activity used by one intervention, then save;
  - the card loses the chip and the file is gone.

### 2.4 Open questions

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Should deleting an activity that other activities `goto` be blocked? | Allow it, with the warning list. Undo covers mistakes, and validation keeps the links visible. |
| 2 | Should a bin also appear on navigator chips? | No. One place, the editor header, as asked. |

## Implementation notes (2026-10-08)

**Wrapping and the preference**

- Node labels and answer labels clamp at `--tricc-label-lines`. The label carries `title` with the
  full text, and the test id `node-<id>-label`.
- The preference is `PreferencesPort` in `@tricc/core`, with `LocalPreferences` in
  `@tricc/adapters-local` (browser storage, try/catch, clamped to 1-6).
- `TriccRuntimeProvider` has an optional `preferences` prop, and `useEditorPreferences()` reads
  it. Without the prop, the editor uses 3.
- The Preferences page has `pref-label-lines`.

**Layout**

- `autoLayout(activity, sizeOf)` takes node sizes. Tidy layout passes `renderedNodeSize`, the DOM
  `offsetWidth`/`offsetHeight`, which zoom does not change.
- **Not done:** the second layout pass after the first measure, for nodes with no stored `ui`.
  Those still use the default 200×64 box on first open.

**Delete**

- `tx.deleteActivity` takes the activity off every intervention. `goto` and `wait` links stay and
  show as missing. One undo restores everything.
- The confirmation is `delete-activity-dialog`. It lists `delete-activity-listed-by` and
  `delete-activity-linked-from`.

**Save**

- An activity read from a path other than `activities/<id>.activity.yaml` now marks the project
  `migratedFrom: 'activity-paths'`. The baseline is then the folder itself, so the next save
  writes the canonical file, removes the old one, and rewrites `tricc.yaml`.
- Before this, an edit wrote a second file with the same id, and the following open failed with
  "Two files declare the activity id".
- The per-activity `sourcePath` from §2.2 was not needed.
- The .drawio caveat stands: a page from a never-saved draw.io project is only removed from the
  document.

