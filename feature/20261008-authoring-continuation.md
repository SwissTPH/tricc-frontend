# Authoring continuation — resume outside this session

| Field | Value |
|-------|-------|
| **Status** | Session record, 2026-10-08. The local authoring slice below is in the uncommitted working tree on `develop`. |
| **Repo** | `tricc_frontend` (`/mnt/data/Development/tricc_frontend`) |
| **Related** | August drafts in this folder. Patrick's answers are also in `~/.grok/long-running-background-tasks/tricc-authoring/questions.md` under "Answers from Patrick, 2026-10-07". |
| **Approval** | The August specs stay `Draft`. This file does not approve them. Specs 4, 5, 7, 8b, 9, and 10 are not built. |

The folder rule "nothing is implemented until Approved" was set aside for the local app while it was being tried. Do not flip the unbuilt drafts to `Implemented`. Do not `git mv` them until a later revision actually rewrites their unbuilt parts.

---

## Part I — Where the work stands

The tool is a browser authoring app for TRICC flowcharts. Clinicians draw activities and processes, group them into interventions, and save a folder `tricc_oo` can read.

A thin Vite app in `apps/local` is the surface. Rules live in `@tricc/core`. React components live in `@tricc/editor`. The example project was `examples/migrated` (Global, ETAT, Combacal slices). **2026-10-08:** it and the tests reading it were removed, because the examples were structurally wrong. The `examples/…` references below are historical. New test content must make clinical sense. Nothing in this slice has been committed.

Another session continues from this file, then from the code. The August drafts still describe the longer product (CQL parser, terminology browser, guided roles, preview, assisted authoring). Where a draft and this file disagree, this file is the one to follow.

## Part II — How to continue

### 1. Workspace

- Branch `develop`. Do not commit or push unless asked.
- The shell may start in `/mnt/data/Development/combacal-L2`. `pnpm --filter` from that directory prints "No projects found." Run package commands from `/mnt/data/Development/tricc_frontend`.
- `feature.zip` at the repo root is untracked. Leave it.
- Do not edit the UNICEF deck or `docs/howto-data-dictionary.md` in combacal-L2.
- Do not download Google Drive material.
- A 12-hour scheduler still reports conceptual questions from `~/.grok/long-running-background-tasks/tricc-authoring/questions.md`. Leave its prompt alone. Q21 already has a `Submitted:` line from that scheduler. The decision is still pending. The questions file header contains the word "Submitted", so a substring search is the wrong completeness check.

### 2. Run and rebuild

```bash
cd /mnt/data/Development/tricc_frontend
pnpm --filter @tricc/core build
pnpm --filter @tricc/editor build
pnpm --filter @tricc/app-local dev
```

- Editor `tsc` reads `@tricc/core` from `packages/core/dist` (the `.d.ts`), not from source. A node-type or `TriccNode` change is invisible to the editor build until core is rebuilt. Vitest uses source, so unit tests can pass before `dist` exists.
- Vite dev resolves `@tricc/editor` JavaScript from `packages/editor/dist`. Restart the dev server after an editor rebuild. It binds `[::1]:5173`.
- `packages/editor/styles.css` is imported as source from `apps/local/src/main.tsx`. Playwright preview serves `apps/local/dist`, so a CSS change needs `pnpm --filter @tricc/app-local build` before a preview run.
- Preview base URL is `http://localhost:4173`. `reuseExistingServer` is on outside CI. Kill a stale preview (`fuser -k 4173/tcp`) when the build changed. Playwright `testDir` is `e2e`, workers 3, projects chromium and firefox, viewport 1280×720. A second `-g` on the CLI replaces the first.
- The dev server was stopped when the last session ended. Start it only when the next task needs the UI.
- Python for `tricc_oo` is 3.13 (`/usr/bin/python3.13`). A throwaway venv may live at `/tmp/tricc-py313`. Do not use 3.14. Do not replace `tricc_oo/.venv` (3.12.14).

### 3. Decisions that override the August drafts

Patrick, 2026-10-07. The "Decision" paragraphs higher in `questions.md` are the assumptions written before those answers.

| Topic | Follow this |
|-------|-------------|
| Project file | Save `tricc.yaml` plus `activities/<id>.activity.yaml`. Ignore `project.json` when `tricc.yaml` is present. Never write `project.json`. `writeProject` in `packages/core/src/format/serialize/index.ts`. |
| Draw.io | There is no general importer product. Opening a project whose `tricc.yaml` lists `.drawio` files is in, including the usual embedded compressed diagram. Do not rewrite the source `.drawio`. On save, write activity YAML and point `tricc.yaml` at those paths. The drawing stays in the folder. |
| Pages and processes | Do not invent a process for a page. Process pages call activities. Page refs stay in the intervention's activity list in the YAML. The overview card shows process activities only (root type `start`). Reorder swaps neighbouring process indexes and leaves page refs in place. One activity can belong to several processes, so there is no preferred process. |
| Shared activities | The same activity file may be listed on two interventions, including across two projects. The intervention `start` (on, condition) is the condition. There is no per-reference applicability. |
| Dangling goto | Keep a readable slug (`temperature-measurement`, `ventilation`, `oxygen-therapy`). The canvas shows an icon and "Missing activity" (`data-testid` `goto-missing`). Do not invent target activities. |
| Select `filter` | During conversion a non-empty `filter` is the concept code. An empty filter is ignored. The drawing `name` stays the local name (often `select_`). The editor shows a Code field only when the select's filter is non-empty. Known non-empty values in the scanned drawings: `demo.reason`, `length_height_pref`, `etat.coma.004` (two ETAT files). About 78 filters are empty strings. **2026-10-08:** `tricc_oo` no longer reads `filter` on YAML (commit 991b3b6, `feature/sync-fe`, local). Patrick: `filter` is not used, because select choices compile from the option relevance. The reading above is withdrawn. The frontend should ignore `filter` on read and never write it; see `20261008-data-dictionary-and-concept-texts.md` §2.0. |
| `continue_with` | A node with a target intervention, a start condition, and a delay as an ISO-8601 period (`P3D`). Intervention `start.due` stays UCUM (`3 d`). The editor must not pretend the trigger has a due or a window. `YamlStrategy` in `tricc_oo` still skips `continue_with` and `bridge`. |
| `form_id` | Spell the field `form_id`. Keep values already on drawings (ETAT; source spelling `questionaire` on Combacal). Do not generate one from the intervention. It lives only on the process `start` (`TriccNodeMainStart`). An `activity_start` does not carry it. The intervention has no `form_id`. Export names the XLSForm from the process start's `form_id`. Moving it onto the intervention is open (Q21). **2026-10-08:** Patrick retires `form_id` in favour of the intervention `name`. `form_id` is read only for legacy projects without interventions. `tricc_oo` implements this, uncommitted. The frontend half is planned in `20261008-names-and-activity-settings.md` (Draft); the frontend code is unchanged until that plan is approved. |
| `proposed_diagnosis` | Used. The spoken name "proposed_diagnostic" means `proposed_diagnosis`. `YamlStrategy` must not drop it. `diagnosis` is the same gap and is kept as well. |
| Quoting | Parked (Q15). Do not change yes/no/on/off quoting unless a real load fails, and then only the failing value. |
| Edge value `continue` | The stored value is `continue`. The canvas label and the properties menu say Follow. Writing `follow` or `suivre` warns `edge.deprecated-continue`. |
| Several activity ends | `activity_end` stays on the palette and may appear more than once (`n-activity_end`, then `n-activity_end-2`). Start and `activity_start` remain exactly one root. The editor does not assign a name to `activity_end`. Do not change `tricc_oo` `TriccNodeActivityEnd.set_name` unless asked. |
| Quantity | Question node `quantity`, next to decimal. Stores `min`, `max`, `unit`, `unit_system`, `unit_code`. Unit may be empty in the editor. Palette label Quantity, button `add-quantity`. Do not invent unit values. This is separate from concept `dataType` `quantity`. |

`plain.drawio` still has `odk_type=activity_start` and `form_id=visitform`. Do not rewrite that drawing. `examples/migrated` `combacal-simplify.activity.yaml` keeps `form_id: questionaire` on a type `start` node. The ETAT airway `activity_start` no longer has `form_id` ETAT.

### 4. What the working tree already does

#### App chrome

- **2026-10-09:** the app uses the full browser width (Patrick). `#root` in `apps/local/src/app.css` is `width: 100%` with no `max-width`. It was a centered 72rem column before. The e2e test is "overview, processes, and activities use the full browser width".
- Header tools (save status, undo, redo, export) sit in `.tricc-topbar__project`. The old `.tricc-project-bar` is gone. The activity editor header (title, kind, Tidy layout) is still a second header.
- Undo and redo buttons: `data-testid` `undo` and `redo`, `aria-label` Undo / Redo. They follow `canWrite`.
- Keyboard undo is `UndoKeys` inside `OpenProjectProvider`, window `keydown` capture. Ctrl/Cmd+Z undo. Ctrl/Cmd+Shift+Z and Ctrl+Cmd+Y redo. Inside `UndoKeys`, `const { document } = useOpenProject()` is the Y.Doc. Dialog checks use `window.document.querySelector('[role="dialog"]')`. Skipped when `!canWrite`. Search inputs, file inputs, and fields inside `[role=dialog]` keep native undo. While any `[role=dialog]` is open, Ctrl+Z does nothing. `Y.UndoManager` `captureTimeout` is 500 ms (`packages/core/src/document/undo.ts`). Fast e2e that creates a project, an activity, and a node in one burst groups them. Wait 600 ms between the activity and the node, and again before Ctrl+Z.
- Read-only hides write controls. The inspector stays 320 px. Hiding the palette does not widen the canvas.
- Delete and Backspace remove the selected node or edge when the project is writable: `deleteKeyCode={canWrite ? ['Backspace','Delete'] : null}`. Inside a text field, Delete still edits text. `tx.removeNode` also removes edges that use that node.

#### Project overview: settings and delete (2026-10-09)

- **Gear and bin.** Next to the project title are the gear `configure-project` and the bin
  `delete-project`.
  - The bin is shown only when the host passes `onDelete` and the project is writable.
- **Settings dialog** (`project-settings`): Name (`project-title`), as a draft. Save writes the
  `tricc.yaml` title and calls `onRename`. Cancel or Escape discards.
- **Delete confirmation** (`delete-project-dialog`) shows the host's `deleteNote`:
  - Folder projects: "the folder and its files stay on your disk".
  - Browser projects: "its files are deleted; export a copy first".
- **In `apps/local`, delete:**
  1. removes the catalog entry;
  2. navigates to the project list, so autosave stops;
  3. then calls `LocalPersistence.forget`, which clears browser-stored files only and never
     touches a folder;
  4. then `IndexedDbCollaboration.forget`, which deletes the `tricc-doc-<id>` log.
- **Rename in the list.** `ProjectCatalogPort.rename(ref, name)` is new, implemented in the local
  and memory catalogs and covered by the conformance suite.

#### Node fields (2026-10-09)

- **Repeat** (`field-repeat`) is on goto and on every question type. Empty means none.
- **Rhombus and goto** have no Name field, like sequence nodes.
  - A name they carry, from a drawing or generated, stays in the file. It is never shown: not in
    Details, not under the node on the canvas.
  - A new goto from the palette gets a generated name (`goto`, `goto-2`, …), because draw.io-style
    exports want one. `tricc_oo` YAML does not require it.
- **Goto:** "Open activity" (`goto-open`) sits under "Goes to". Ctrl/Cmd+click on a goto node on
  the diagram does the same. Both go through the `onOpenActivity` prop of `ActivityEditor`.

#### Per-type tables (2026-10-11)

Per-type and per-field knowledge lives in typed tables. The compiler forces each table to be
complete, so a new type or field cannot be handled in one place and missed in another.

| Table | File | What it holds |
|-------|------|---------------|
| `NODE_TYPE_SPECS: Record<NodeType, NodeTypeSpec>` | `packages/core/src/format/schema/node-spec.ts` | Per node type: palette label and group; roles (`root`, `sequence`, `named`, `internalName`, `capture`, `text`, `select`, `branching`, `extensionTarget`, `unreachableOk`, `cqlReference`, `offered`); default concept `dataType` and `conceptType`. `node-types.ts` derives `NAMED_TYPES`, `TEXT_NODE_TYPES`, `SELECT_TYPES`, `NODE_TYPE_GROUPS`, `needsName`, `hasInternalName`, `canBranchFrom`, and the other lists from it. Validation, draw.io, the text migration, the palette, `canOffer`, the properties panel, and the canvas read it. |
| `NODE_FIELDS` (`satisfies Record<keyof TriccNode, FieldKind>`) | `packages/core/src/format/node-fields.ts` | Per node field: `key`, `scalar`, `localized`, `expression`, `json`, `custom`, or `transient`. The key order is the YAML key order. `decodeNode`/`encodeNode` and `nodeToY`/`nodeFromY`/`updateNodeY` walk it. Custom fields are implemented in `YAML_CUSTOM` (format/codec.ts) and `DOC_CUSTOM` (document/codec.ts), both typed by `CustomField`. |
| `CANVAS_KINDS: Record<'group' \| 'tricc' \| 'comment', CanvasKind>` | `packages/editor/src/activity/canvas/elements.ts` | Per canvas element kind: `project`, `commitMove`, `commitResize`, `remove`, `connectFrom`, `create`, `handleSignature`. The canvas projects and caches every kind the same way (generic `sameFlowNode`) and calls `updateNodeInternals` when a handle signature changes. |

**How to add a node type**

1. Add it to `NODE_TYPES`.
2. Add an entry to `NODE_TYPE_SPECS`.
3. Add an entry to the editor's `NODE_VISUALS`.

Steps 2 and 3 are compiler-checked.

If it has new fields:

1. Add them to `TriccNode` and to the Zod `nodeSchema`.
2. Add them to `NODE_FIELDS` (compiler-checked), and to `YAML_CUSTOM` and `DOC_CUSTOM` if they
   are `custom` (also compiler-checked).
3. Add a value to the `FULL` sample in `core/src/format/node-fields.test.ts`. The test fails
   until you do.

Its properties-panel block is still written by hand in `NodeProperties`. Turning that into
descriptors is the next step, if wanted.

**Fixed with this change**

- Comments, group frames, and the "about" line were hidden for a frame on every drag tick: they
  were re-created without `measured`.
- Answer-link handles kept stale positions after answers changed: `updateNodeInternals` was
  never called.
- Comment and Group can now be dragged from the palette.

Each has an e2e test in `e2e/canvas.spec.ts`. The drag test records hiding with a
MutationObserver.

#### Navigator

`packages/editor/src/project/ActivityNavigator.tsx`.

- Two tabs, Processes and Activities, each with search. Expand wraps chips, `max-height: min(40vh, 280px)`. Horizontal strips and pagers are gone.
- One `+` on the open tab. Activity dialog: Name prefilled with the next unique id; the id is the slug of the name. Process dialog: "Starts" (CPG datalist). The stored process is the trimmed typed string; the id is `${slug}-process`. `uniqueId` skips `-1`. `+` is hidden when read-only. Nothing is created until Create.
- Import sits beside `+`. Activities tab: activity YAML or draw.io (every page). Processes tab: a process file. Nothing joins the library until Import. The other kind stays out and the dialog names the right tab. A taken id is saved as the next free id. `File.text()` when present, otherwise `FileReader.readAsText` (jsdom `File` has no `text()`). Title "Import an activity". Tests use `waitFor`.
- Test ids: `tab-processes`, `tab-activities`, `process-search`, `activity-search`, `nav-expand`, `add-activity`, `add-process`, `import-activity`, `import-process`, `import-modal`, `import-confirm`.

`apps/local/src/app.css` keeps the navigator at `flex: 0 0 auto`. Overview, project list, and preferences are `flex: 1 1 auto`, `min-height: 0`, `overflow-y: auto`. An earlier bug let the overview paint over the navigator because the navigator's `min-height` collapsed to 0.

#### Project overview

`packages/editor/src/project/Overview.tsx` and `InterventionEditor.tsx`.

- Responsive card grid: `ul.tricc-intervention-grid`, `repeat(auto-fill, minmax(17rem, 1fr))`. Card `data-testid` `intervention-${id}`. The first generated id is `intervention`, the second `intervention-2`.
- Each card lists process chips only (`tricc-chip`, `data-kind="process"`). Clicking a chip opens that activity. Row test id `intervention-${iv.id}-activity-${ref}`. List `iv-activities-${id}`.
- Writable rows have move earlier / later (`move-up-${iv}-${ref}`, `move-down-${iv}-${ref}`) and a bin (`remove-activity-${iv}-${ref}`) that removes that process ref only.
- A shared process shows `shared-${ref}` with the text "shared". Page activities do not show that marker on the card. Library `library-shared` and `used-by` stay.
- Gear `configure-intervention-${id}` opens `intervention-settings-${id}` (`role=dialog`): title, code, Starts/trigger, applicability intent and CQL (`iv-title`, `iv-code`, `iv-trigger`, `iv-intent`, `iv-cql`). The card still shows trigger and applicability without opening the gear. Fields apply as they are edited. There is no draft to revert. The dialog does not call `useSave`; the top bar still autosaves.
- Header order: Save (`intervention-settings-${id}-save`), bin (`delete-intervention-${id}`), Close (`…-close`). Save and X close the dialog. The bin opens `ConfirmDelete` (`role=alertdialog`, `delete-intervention-${id}-dialog`). Copy: "Delete this intervention?" and "This removes {title}. Its activities stay in the library." Cancel is focused. Escape on the confirm uses capture `stopImmediatePropagation` so the settings dialog stays open. Read-only hides Save and the bin and keeps X.
- `+` on the card (`add-process-to-${id}`, dialog `add-process-dialog-${id}`) adds an existing process or creates one. The typeahead test id is still `add-activity-to-${id}`; options are processes only. Selecting or creating closes the dialog. The "New process" fields (`process-name-${id}`, `create-process-activity-${id}`) live inside that dialog. Empty copy when the project has no processes: "This project has no processes yet. Create one below, or add one with + on the Processes tab." Otherwise: "Every process in this project is already listed."
- Unassigned section is unchanged. Usage counts are intervention refs only. `validateProject` does not emit `intervention.not-a-process-activity`. A page ref in the data is valid and simply hidden on the card.
- In `examples/migrated`, young-infant shows Tests (`yi-tests`) and combacal-flow shows Simplify_flow (`combacal-simplify`). Over 2 months, ETAT, hypertension, and diabetes cards have no process chip because only page activities were copied (weight-measurement, urine-test, etat-airway, symptom-screening). Weight measurement stays one library activity used by two interventions. Do not invent processes for those pages unless asked. Larger drawings (treatment algorithms, ETAT flow, hypertension and diabetes flows) were left unmigrated because of size.

#### Activity editor

`packages/editor/src/activity/ActivityEditor.tsx`. Body is two columns: flexible canvas and a 320 px inspector. There is no left palette column.

- `.tricc-editor` is `flex: 1 1 auto; min-height: 0; overflow: hidden`. It must not use `height: 100%`. With the navigator as a sibling, `height: 100%` overflowed the viewport and hid the select node's bottom handle (Playwright `elementFromPoint` returned null around y=771 in a 720 px viewport).
- Inspector tabs: Details, Nodes, Connection, Validation (`tab-details`, `tab-nodes`, `tab-connection`, `tab-validation`). Details appears only while a node or a connection is selected, and selecting one opens Details. Nodes lists nodes. Connection lists edges. Empty connection copy: "This activity has no connections." An empty edge-list `ul` has no box, so Playwright `toBeVisible` fails on it; assert the panel and the sentence.
- Validation lists issues for the selected edge (`location.edgeId`), else the selected node (`location.nodeId`), else the whole activity. Scope line `validation-scope`: "This connection", "This node", or "Whole activity". The tab badge is the whole-activity non-info count. Activity-only issues (`activity.no-end`) show on Whole activity. `edge.duplicate-branch` is located on the node. Selecting does not auto-open Validation. `ValidationSummary` in the tab uses `heading={false}`.
- `chooseNode` / `chooseEdge` set the panel to Details only when an id is set. The undefined call must not clear the other selection (the canvas calls both in one batch). `commitEdge` calls `onSelect(undefined)` then `onSelectEdge(id)`.
- Add a node sits at the top of the Nodes tab, before the node list, only when writable. The element is `div.tricc-palette`. Adding a node calls `chooseNode`, which opens Details and unmounts the palette. A later add returns to the Nodes tab first. The e2e helper `placeNode` does this when the add-button count is 0.
- Palette drag: pointer drag (threshold 4 px), not HTML5 drag. The node is created where the pointer is released, snapped with `screenToFlowPosition({ snapToGrid: true })` on an 8 px grid. Ghost `palette-drag-ghost`. Canvas `data-dropping="true"`. Release outside the diagram adds nothing. Escape cancels. A click still stacks the node below the lowest one at x 80, y lowest+96. Hint: "Drag onto the diagram to choose where it lands." After a drop, a second drop clicks `tab-nodes` first. `dropAt` uses `scrollIntoViewIfNeeded` because the palette can sit below the fold.
- Dragging an existing node keeps positions in a ref and writes the document once on pointer release. Do not write on every `dragging: true` event. Do not set `node.width` / `node.height`. Firefox synthetic drags of existing nodes move up (−80 y).
- Branch modal: an edge from `select_yesno` or a rhombus opens a dialog and is not created until Yes, No, or Follow. Stored values are `yes`, `no`, and `continue`. Other sources, including `activity_start`, connect immediately and stay unconditional. Score and Condition stay in the properties panel. Do not extend the modal to `select_one`, `select_multiple`, or calculate unless asked.
- `select_one` and `select_multiple` show one row per answer with a right source handle `answer-${option.id}`. The stored edge is `Answer('code')` (option name, else concept code, else id; single quotes doubled). The edge label is the first 20 characters of the answer label plus an ellipsis; hover is the full label. `sourceHandle` is derived on render and is not persisted in YAML. The bottom handle id is `out` (`NODE_OUT_HANDLE` in `packages/editor/src/activity/canvas/answer.ts`) and is unconditional. xyflow uses the first source handle when `sourceHandle` is missing, and answer handles render first, so a missing id draws the unconditional edge from the first answer. The canvas edge projection always sets `sourceHandle`. `select_yesno` still uses Yes / No / Follow and has no answer rows. `.tricc-node > .react-flow__handle` is `z-index: 2; flex: none` so the output stays a circle.
- Quantity properties reuse min/max (`field-min`, `field-max`) plus Unit, Unit system, Unit code (`field-unit`, `field-unit-system`, `field-unit-code`). Placeholders `kg`, `http://unitsofmeasure.org`, `kg`. Empty string is stored as `undefined`. Visual glyph `㎏`. `needsName` includes `quantity`. Unit is not required in the editor. Drawings in `tricc_oo` require `unit`; do not block save on that.

#### CQL display (a slice of spec 4)

The expression field keeps the stored string. `presentCql` in `packages/editor/src/cql/names.ts` is a tokenizer. Chips show a concept or question label, truncated at 50 characters. An unresolved name is an error-styled chip of the raw code. `(i)` opens an in-place `role=note` card (the about-card is `role="note"`, so it does not block Ctrl+Z). Show question selects the node. Lookup prefers the open activity. Keys are `node.name`, a non-empty `node.filter`, and `node.concept.code`. Example: `examples/migrated/activities/weight-measurement.activity.yaml` references `"age_in_days" < 60 and "CHE.B6.DE07" > 9`. Node `Gu58oViyXPmqma7RcGfT-21` is decimal, name `CHE.B6.DE07`, label "Weight (kilograms)". `age_in_days` has no node and stays raw. Do not build `packages/cql`, ANTLR, or CodeMirror unless asked.

#### Draw.io and `tricc_oo`

- Read path: `packages/core/src/format/import-activity.ts` (`readActivityFile`) and `packages/core/src/format/drawio.ts`. A `form_id` on an `activity_start` shape is dropped on read. A `form_id` on a process `start` is kept. `formId` is accepted as an alias of the attribute name.
- `tricc_oo` branch `feature/frontend-project-inputs`. The form_id placement edit is the `activity_start` path in `calculate.py` and `yaml.py`. Other dirty files in that repo were already dirty and stay untouched. `continue_with` and `bridge` are still skipped by `YamlStrategy`. Multiple `activity_end` names are still overwritten to `aend_{activity.id}` on load. Do not edit `tricc_oo` unless asked.
- Symptom-screening "Stashed node list was unchanged" is an unresolved-dependence failure in the migrated example, not a dropped node type.
- Example `output_strategies` is `XLSFormCHTStrategy`. Global's launch config uses `XLSFormCHTHFStrategy`.

### 5. Still the August draft

Leave these as proposals. Do not mark them implemented.

| Spec | State |
|------|--------|
| 1 Library architecture | Packages and ports exist for the local app. npm publishing, a second consumer, and presence are not done. |
| 2 Document model | Yjs document and local undo exist. Presence and live collaboration are not done. |
| 3 Project format | On-disk shape is `tricc.yaml` plus activity YAML, terminology JSON, and `cql/` libraries. §1's `project.json` tree and §2 are overridden. Node catalogue in §4 is still the reference, plus `quantity` and `continue_with`. |
| 4 CQL authoring | Label chips and a tokenizer only. No `@tricc/cql`, ANTLR, CodeMirror, or `"` concept picker. |
| 5 Terminology | Not built. |
| 6 Activity editor | Canvas, palette-in-Nodes, properties, branches, answer rows, and live validation exist as in §4 of this file. The draft's left palette, single `activity_end`, double-click quick-add, copy/paste, and per-type `FieldDescriptor` table are not what the code does. |
| 7 Guided authoring | Not built. Roles, training cards, snippets, `.po` export. |
| 8 Project and interventions | Overview cards, gear, and the two navigator tabs exist as in §4. §2's per-reference applicability and the five-level tree are overridden. |
| 8b Deduced process wrapper | Alternative. Not built. Do not start it. |
| 9 Preview | Not built. |
| 10 Assisted authoring | Post-v1. Not built. |
| 11 Local app | `apps/local` is the running shell: open a folder, save, read-only, e2e. The rest of that draft (recovery edge cases, CI completeness) is still open. |
| 12 tricc_oo interop | The save shape is YAML. The Python contract is not finished. `proposed_diagnosis` and process `form_id` were aligned. `continue_with` and `bridge` are still skipped on load. |

### 6. Open — do not reopen unless asked

- Q21. `form_id` stays on the process start. Whether it later moves to the intervention is unanswered. Do not invent an intervention field and do not generate a new id. **Answered 2026-10-08:** it is replaced by the intervention `name`. See `20261008-names-and-activity-settings.md`.
- Q15 quoting, parked.
- Empty process cards on over-2-months, ETAT, hypertension, and diabetes. Bring the real process pages in only when asked.
- `YamlStrategy` still skips `continue_with` and `bridge`.
- `start.due` is UCUM. `continue_with` delay is an ISO-8601 period. Keep both spellings.
- Adding a node switches to Details and hides the palette until the author returns to Nodes.

### 7. Code map

| Area | Path |
|------|------|
| Project read/write | `packages/core/src/format/serialize/index.ts`, `tricc-yaml.ts`, `codec.ts` |
| Node schema | `packages/core/src/format/schema/node-types.ts`, `activity.ts`, `packages/core/src/model/types.ts` |
| Activity kind | `packages/core/src/model/activity-kind.ts` |
| Validation | `packages/core/src/validate/activity.ts` |
| Draw.io | `packages/core/src/format/drawio.ts`, `import-activity.ts` |
| Editor shell | `packages/editor/src/activity/ActivityEditor.tsx`, `packages/editor/styles.css` |
| Canvas, answers, branches | `packages/editor/src/activity/canvas/Canvas.tsx`, `TriccNode.tsx`, `answer.ts`, `BranchChoice` |
| Overview | `packages/editor/src/project/Overview.tsx`, `InterventionEditor.tsx` |
| Navigator | `packages/editor/src/project/ActivityNavigator.tsx` |
| Undo keys and buttons | `OpenProjectProvider` / `UndoKeys`, `packages/editor` `HistoryButtons.tsx`, `packages/core/src/document/undo.ts` |
| App column and navigator flex | `apps/local/src/app.css`, `apps/local/src/App.tsx` |
| CQL chips | `packages/editor/src/cql/names.ts`, `CqlExpressionField.tsx` |
| Example | `examples/migrated/tricc.yaml` and `examples/migrated/activities/` |
| e2e | `e2e/canvas.spec.ts`, `e2e/authoring.spec.ts`, `e2e/intervention.spec.ts`, `e2e/migrated.spec.ts` |

### 8. Checks last reported

These passed in the session that landed the palette move, the quantity node, the intervention bin confirmation, and the bottom handle id `out`. They were not re-run while writing this file.

- `@tricc/core` vitest: 143 passed (7 files), including a quantity round-trip.
- `@tricc/editor` vitest: 85 passed (5 files; `integration.test.tsx` 58).
- `e2e/canvas.spec.ts`: 42 passed on chromium and firefox.
- A targeted run (node-out geometry, Ctrl+Z, intervention delete confirmation, intervention read-only, several ends, authoring read-only): 8 passed on both browsers.

The last preview bundles named in that session were `dist/assets/index-DSmbZ4kb.css` and `index-B8R795S7.js`. A later build will hash different names.
