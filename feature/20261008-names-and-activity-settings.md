# Names instead of `form_id`, and an activity settings dialog

| Field | Value |
|-------|-------|
| **Status** | Implemented on both sides, 2026-10-08, not committed. `tricc_oo`: see §2.3. Frontend: see "Implementation notes" at the end. |
| **Repo** | `tricc_frontend` + `tricc_oo` |
| **Related** | `20261008-authoring-continuation.md` §3 (`form_id` row, Q21), `20261008-drawio-import-and-sequence-nodes.md` §2.2 (the start node is the activity), `20261008-canvas-display-and-activity-removal.md` §2.2 (activity delete), `20261008-project-level-activities.md`, `../../tricc_oo/feature/20261008-intervention-name-replaces-form-id.md` (Implemented) |
| **Source** | Patrick, 2026-10-08:<br>"`form_id` is a remnant of previous approaches. I would rather have an activity code, a process, and an intervention code."<br>"The notion of intervention is new in `tricc_oo`; `form_id` should have been removed when it was added."<br>"The name in tricc is what I meant by code."<br>"There is no config for an activity to set display, condition/applicability, and code. A gear icon and a dialog, like the intervention one, are needed, beside the delete already specified." |
| **Replaces** | `20261008-codes-and-activity-settings.md` (same day; the key is `name`, not `code`) |
| **Approval** | — |

This plan answers Q21 from the continuation file. `form_id` does not move to the intervention:
it is **replaced** by the intervention `name`.

Interventions are new in `tricc_oo`, and `form_id` should have been removed when they were added.
`tricc_oo` now builds one `TriccIntervention` per `tricc.yaml` intervention. That class was
`TriccProject`, and the old name is kept as a deprecated alias. The form name is resolved per
intervention.

---

## Part I — Business description

### Three identifiers, each at its own level

| Level | Key | Example | Used for |
|-------|-----|---------|----------|
| Intervention | `name` | `pediatrics` | The form: XLSForm file and `form_id` setting, CHT form, DHIS2 program, FHIR Questionnaire and StructureMap ids |
| Process | `process` (already exists) | `registration` | Which part of the encounter (CPG process) a process page starts |
| Activity | `name` | `weight_measurement` | The activity's stable machine name in outputs (groups, PlanDefinition actions) |

`name` is the machine identifier, which is what TRICC has always called a name. `title` stays the
human-readable display.

### What happens to `form_id`

- `form_id` is never written again.
- A project that declares interventions ignores it.
- Older projects:
  - **Legacy projects with no `interventions:` list.** `tricc_oo` treats the project as a single
    implicit intervention. The drawings' `form_id` names that intervention's form.
  - **Old drawings opened in the app.** They become a project with interventions. The app copies
    their `form_id` into the intervention `name` once, so form names do not change, then drops it.

### Activity settings

An intervention has a gear that opens its settings. An activity has none, so there is nowhere to
set these:

- the **title**, which is its display text;
- its **name**;
- its **applicability**, the condition under which the activity applies, written both as a plain
  intent and as CQL;
- for a process page, its **process**.

The activity editor header gets a **gear** next to the **bin** that the canvas plan already
specifies. The gear opens a settings dialog shaped like the intervention one.

---

## Part II — Technical specification

### 2.1 Data

**Activity YAML.** These keys sit at activity level, per the "start node is the activity" rule:

```yaml
id: weight-measurement
name: weight_measurement            # optional; tricc_oo falls back to the title slug
title: { en: Weight measurement }
process: registration               # process pages only
applicability: "AgeInMonths() < 60" # read by tricc_oo YamlStrategy (yaml.py:516)
intent: { en: Children under five } # plain-language twin of applicability (spec 7 handoff)
nodes: [...]
```

**`tricc.yaml` intervention.** Write `name`. **Done 2026-10-08, uncommitted:** the model, the Y document (it still reads `code`), the codec, `tricc.yaml` read and write, the dialog field `iv-name` (placeholder = id), the `intervention.duplicate-name` rule, and new interventions no longer prefilling the name.

- Today the frontend writes `code` (`tricc-yaml.ts:94`, `put(item, 'code', iv.code)`).
- `TriccInterventionConfig` ignores unknown keys, so `tricc_oo` silently drops `code`.
- Change the writer to `put(item, 'name', iv.name)`.
- On read, accept `code` as an alias of `name` for files written before this change.
- Never write `code` again.

**Frontend model** (`packages/core/src/model/types.ts`)

- `Intervention.code` (l.150) is renamed `name`. The codec migrates it.
- `Activity` (l.123-136) gains `name?: string` and `intent?: LocalizedText`.
- `applicability?: Expression` already exists. It is written at activity level.
- `formId` is removed from nodes and activities.

The intervention dialog field `iv-code` becomes `iv-name`, labelled "Name".

**Rules for `name`**

- Pattern `^[A-Za-z][A-Za-z0-9_.-]*$`.
- Unique per level: activity names across the project, intervention names across the project.
  The errors are `activity.duplicate-name` and `intervention.duplicate-name`.
- An empty name is valid. The dialog's placeholder shows the fallback `tricc_oo` will use:
  - the title slug for an activity;
  - the id for an intervention.

  The fallback is visible and is never written.

### 2.2 Retire `form_id` in the frontend

**Read.** This covers YAML, draw.io (`drawio.ts:232-235`), the `import-activity.ts` path, and the
codec.

1. Collect `form_id` / `formId` from process `start` nodes and from activity-level `form_id`.
2. For each intervention that has no `name` and lists such a process, set `name` to that
   `form_id`. Use the first process in the intervention's activity order.
   - If processes in one intervention carry different values, emit warning
     `intervention.form-id-conflict`, naming all of the values.
   - In either case, emit info `form-id.migrated` on the intervention.
3. An intervention that already has a `name` keeps it. A different `form_id` emits info
   `form-id.dropped`.
4. Drop `form_id` from the document.

**Examples**

- `combacal-simplify` has `form_id: questionaire` (the source spelling, kept). It gives the
  intervention `combacal-flow` the name `questionaire`.
- `plain.drawio` has `visitform`. That drawing is not rewritten (continuation §3). The value is only
  read and migrated into the document.

**Write.** No `form_id` anywhere.

**Root shape `name` in draw.io.** It stays the activity's `name`, as in `tricc_oo`. It is lifted
to the activity level (draw.io plan §2.2).

### 2.3 `tricc_oo` (Implemented 2026-10-08, not committed)

The work is on branch `feature/frontend-project-inputs`. The spec is
`../../tricc_oo/feature/20261008-intervention-name-replaces-form-id.md`, which Patrick approved in
that session.

**Classes and form name**

- `TriccProject` is now `TriccIntervention`, one per `tricc.yaml` intervention. `TriccProject` is
  kept as a deprecated alias. `TriccProjectConfig`, the whole `tricc.yaml`, keeps its name.
- `TriccInterventionConfig.name`. `TriccIntervention.intervention_name()` is the only reader of
  `form_id`:
  - with an `interventions:` list, it returns the intervention `name`, else its `id`;
  - without one, it returns the `form_id` of the main process start, else the project title slug
    (`my_project` by default) instead of `exit(1)`.
- The warning is "form_id is ignored when interventions are declared; set interventions[].name".
  It is logged once per distinct value per intervention build.

**Outputs.** Every output strategy names its files from `intervention_name()`. Each keeps its old
final default for an empty name.

**Activities**

- `YamlActivity` has `name` and `intent`. `activity.name` is the activity-level `name`, else the
  title slug.
- draw.io keeps the root shape's `name`. No `code` is read anywhere.
- An activity with no `name` keeps its previous generated name, so the regression baselines are
  unchanged.

**Legacy `form_id`**

- The `YamlActivity._defaults` copy of `form_id` was removed. The loader still sets an
  activity-level `form_id` on the main start, for implicit mode only.
- `form_id` was removed from the `drawio_type_map.py` start attributes. `create_root_node` reads
  it directly from the shape.
- The docs (`tricc.yaml.template`, `cli-and-inputs.md`, `tricc-elements.md`) mark it deprecated.
- The 20260907 and 20260915 specs carry a "superseded in part" note.

**Tests**

- Unit: 797 passed, 134 skipped.
- Regression: 133/133.
- Intervention fixtures moved `form_id` to `interventions[].name`. Their outputs are identical:
  58 files compared, timestamps masked.
- Four baselines of `yaml__concept_repeat_activity_inherit__*` were refreshed. That fixture has no
  main start; its exports used to crash and now build as `my_project.*`.
- A new test shows two interventions in one run producing `infants.xlsx` and `pediatrics.xlsx`.

The other session reported that the working tree changed under it. `drawio.py` and `yaml.py` are
staged, and earlier `filter` edits in `structuremap.py`, `tricc_to_xls_form.py`, `xml_to_tricc.py`
and `visitors/tricc.py` were reverted. Also, the staged `yaml.py` builds each activity container
twice in `_build_activity`. Check all of this before committing.

### 2.4 Activity settings dialog

**Header** (`ActivityEditor.tsx:140-177`)

- After the title come the gear (`configure-activity`, `aria-label` "Activity settings") and the
  bin (`delete-activity`, canvas plan §2.2).
- When read-only, the bin is hidden. The gear stays visible, so the settings can still be viewed.

**Dialog** `activity-settings` (`role=dialog`)

- It reuses the intervention settings shell from `InterventionEditor.tsx`.
- The header buttons match the intervention one, in this order:
  - Save (`activity-settings-save`);
  - bin (`activity-settings-delete`), which opens the same `delete-activity-dialog`;
  - Close (`activity-settings-close`).
- Fields apply as they are edited, and there is no draft to revert. The top bar still autosaves.
- Read-only shows the fields disabled and keeps Close.

| Field | Test id | Notes |
|-------|---------|-------|
| Title | `act-title` | Localized, in the current UI language. The root node shows it. |
| Name | `act-name` | Placeholder = title slug. Validated live for pattern and uniqueness. |
| Process | `act-process` | Process pages only. The CPG datalist, as in the Processes-tab create dialog. |
| Applicability — intent | `act-intent` | Localized plain text. |
| Applicability — CQL | `act-cql` | `CqlExpressionField` with chips, as on the intervention (`iv-cql`). |

**Root node.** Selecting the root node shows, in Details:

- a read-only summary of the title, name, process, and applicability chips;
- an **Activity settings** button that opens the same dialog.

The fields therefore live in one place only.

**Applicability and draw.io.** `tricc_oo` takes a drawn activity's applicability from the root
node's relevance (`xml_to_tricc.py:327`). The frontend's draw.io read does the same.

**Applicability and the intervention start.**

- Activity applicability belongs to the activity, so it applies in every intervention that lists
  the activity. It is not per-reference applicability, which stays out (continuation §3).
- On a process page, the intervention `start` condition and the activity applicability combine
  with AND. `xls_form.py:494` already does this with `and_join`.
- The dialog says so under the CQL field: "Applies on top of the intervention's start condition."

**Validation**

| Rule | Severity |
|------|----------|
| `activity.duplicate-name` | error |
| `activity.name-pattern` | error |
| `activity.intent-without-cql` (intent set, no CQL; the spec 7 handoff rule) | warning |
| CQL issues on `applicability` | as for `iv-cql` |

### 2.5 Tests (frontend)

**core**

- `form_id` → intervention `name` migration:
  - a single process;
  - conflicting processes;
  - an existing name wins;
  - a shared process listed by two unnamed interventions gives both of them the name.
- `tricc.yaml` writes `name` and never `code` or `form_id`. It reads `code` as an alias.
- Activity `name`, `intent` and `applicability` round-trip.
- draw.io root `relevance` becomes `applicability`, and the root `name` becomes the activity
  `name`.

**editor integration**

- The gear and the bin in the header, including read-only behaviour.
- Dialog fields apply live and undo.
- The placeholder shows the fallback.
- The duplicate-name error.
- The root node summary and its button.

**e2e** `authoring.spec.ts`

- Set an activity name and applicability, save, and reopen.
- The YAML has the activity-level keys and no `form_id`.
- `tricc.yaml` has `interventions[].name`.

### 2.6 Effect on other plans

- **Draw.io plan §2.2.** The root `name` is lifted to the activity `name`. `form_id` follows §2.2
  of this plan.
- **Canvas plan §2.2.** The header bin sits after the gear.
- **Continuation file.** Once this plan is approved, its §3 `form_id` row is superseded and Q21 in
  §6 is answered.

### 2.7 Open questions

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | When an intervention exports one form per process, is the XLSForm `form_id` setting the intervention name alone, or `<name>_<process>`? | The name alone for one form. `<name>_<process>` when the strategy splits forms by process, as the StructureMap ids already do. Confirm with `tricc_oo`. |
| 2 | Should the intervention `id` and `name` be merged, now that both are machine identifiers? | Keep both for now. The `id` is the app's stable key and the output folder; `name` names the form and may follow a country convention. |

## Implementation notes (frontend, 2026-10-08)

**Data and migration**

- `Activity.name`. Activity YAML writes `name`, `applicability` as a CQL string, and `intent` as
  its own key, which is what `tricc_oo` reads. The older `{intent, expression}` form is still read.
- `Intervention.name`. The older `code` is still read from `tricc.yaml`, `project.json`, and the
  Y document.
- `form_id`:
  - `readProject` → `migrateFormIds` gives each unnamed intervention the `form_id` of the first
    process it lists, then drops `form_id` everywhere.
  - Importing a page drops it, because the page is not on an intervention yet.
  - It is never written.
  - An activity-level `form_id` is read onto the root `start` first.
- The `intervention.form-id-conflict`, `form-id.migrated` and `form-id.dropped` notices are not
  emitted. `readProject` has no channel for them yet.

**Validation**

- `activity.name-pattern`, `activity.duplicate-name`, `intervention.name-pattern`.
- `expression.open-handoff` on activity applicability. This replaces the planned
  `activity.intent-without-cql`, so the same handoff rule applies everywhere.

**Editor**

- The header has the gear (`configure-activity`) and the bin (`delete-activity`) right after the
  title.
- The activity settings dialog (`activity-settings`) has the fields `act-title`, `act-name`,
  `act-process`, `act-intent` and `act-cql`, and a bin.
- The root node's Details shows `activity-summary` with `root-activity-settings`.
- The Form id field is gone.
- `Dialog` and `ConfirmDelete` moved to `components/Dialog.tsx` and are shared with interventions.
- `ActivityEditor` kept two hooks below its early return. That crashed the editor when the open
  activity disappeared, on delete and also on undo of its creation. It was the cause of the
  failing e2e "undo and redo arrows sit in the single top bar". Fixed.

