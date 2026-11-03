# Building blocks tab, parameters and configuration choices

| Field             | Value                                                                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | Implemented, phases 1–5 (frontend, not committed, 2026-10-29); phases 6–8 Draft                                                                                                          |
| **Branch target** | TBD                                                                                                                                                                                      |
| **Related**       | `tricc/feature/20261102-block-params-and-start-node.md` (rev 2, the library contract this surface consumes), `feature/20260825-guided-authoring.md` (the authoring surface this extends) |
| **Origin**        | Written 2026-10-28 as the frontend counterpart of rev 2 of the library spec.                                                                                                             |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

Section references like "lib §7" point to the library spec. Vocabulary and layout follow the published concepts pages and the project specs: an **intervention** (implementation vehicle, with `name`, `start` and an ordered `activities` list of ids) lists activities; a **process** is an activity whose root is `start` with a `process` key; activities are defined once at project level (`tricc.yaml` `activities:`) and reached with **Go to activity**; each has a gear dialog (title, name, applicability, process). Activity YAML holds codes only, labels and translations live in the CodeSystem, expressions are CQL, and every expression carries a plain-language `intent`. In this spec _Go to_ means the Go to activity node. `20260825-guided-authoring.md` §7 already reserves "parameterized snippets, offered beside the node palette as insertable blocks"; this spec refines that into a separate tab plus palette insertion.

---

## Part I — Business description

### The problem

The library can now reuse a module with different values, drop the paths a deployment does not need, and recover when a removed path leaves a gap. None of that helps a clinician who has to hand-edit draw.io attributes called `param.site`. The authoring tool has to make three things plain:

1. **What can I reuse?** A browsable list of reusable pieces, not a page buried among activities.
2. **What can I vary?** Every reusable piece says what it needs, in clinical terms, and refuses to be used incompletely.
3. **What will my questionnaire actually contain?** When paths can be removed at export, the author must be able to see which ones, and why, before exporting.

### The proposal

**A new tab, "Building blocks"**, next to Activities, Processes and Data dictionary. A building block is a reusable, parameterized piece of clinical logic (`block` in the files and the library).

Why not "Snippet" or "Artifact": _snippet_ is a programmer's word, and _artifact_ means different things in different tools and would confuse anyone who has used one. "Building blocks" says what it is for and pairs naturally with the action "Use a block". Alternatives considered: _Modules_, _Templates_ (suggests a copy you then edit, which blocks are not), _Library_ (better as the name of the whole shared collection later). Since 2026-11-02 the library, the files and the UI all say _block_ (`block_start`, `block`); `snippet_start` and `snippet` are still read as aliases and never written.

**Parameters** work like function parameters. They are edited in the settings dialog of a block or an activity, in the same style as the options of a select question, and each primitive parameter also appears in the data dictionary as a typed concept. Most of an activity's list is **computed** from the blocks and activities it calls.

**"Use block" nodes** let an author drop a block into an activity or process; the node shows a form built from the block's parameters. Values are set on the call (_Use block_, _Go to activity_) or, at the top, in the **intervention** settings. Anything not set at a call is inherited from the caller, and a value set at a call applies only below it.

**"Configuration choice" nodes** are decisions that are resolved when the questionnaire is built, based on parameters. They let one drawing hold several variants.

**A prerequisites panel** shows concepts that will be asked for because the part that used to produce them is not in this export.

**Placeholder blocks** are blocks with no content, filled at export by the export strategy.

### What it looks like for an author

A clinician opens _Building blocks_ and sees "Measure temperature" with its three parameters, used in 4 places. She opens a danger-sign activity, adds a _Use block_ node, picks "Measure temperature", and a small form appears: _Site_ (a dropdown: axillary / rectal / oral), _Fever threshold_ (a number, prefilled 37.5). Later she builds a facility-profile process with a Yes/No parameter _Lab available_, and a _Configuration choice_ titled "Lab available?" that routes to either an RDT path or a referral path. On the intervention card she sets Lab available = No, and the preview greys out the RDT path and lists "malaria_rdt_result: will be asked at the start (its producer is not in this intervention)".

### Limitations

- Parameter values are fixed when the questionnaire is built, not during the consultation.
- A configuration choice can only use parameters and literal values, never patient data. The editor enforces this rather than explaining it after the fact.
- Changing a block's parameters does not rewrite forms already exported; it affects the next export.
- Pruning previews show what the library will do; the library remains the authority.
- The intervention `start` condition is not parameterized. Interventions are an implementation vehicle; keeping `start` coherent with the content stays the author's job.

---

## Part II — Technical specification

### 1. Navigation and naming

Top-level tabs become: **Activities · Processes · Building blocks · Data dictionary**.

| Concept         | UI term                                    | Library / file term                                       |
| --------------- | ------------------------------------------ | --------------------------------------------------------- |
| block           | block, building block                      | `block`, `block_start` (read: `snippet`, `snippet_start`) |
| using a block   | "Use block"                                | `block` node                                              |
| parameter       | parameter ("setting" in short helper text) | `params`, `param.*`                                       |
| static decision | "Configuration choice"                     | decision with `static: true`                              |
| dead concept    | "Prerequisite"                             | generated input, `requires`                               |
| empty block     | "Placeholder block"                        | `extension`                                               |

**Block or activity?** The app already reuses an activity from anywhere with _Go to activity_: one shared definition, no variation. A block is for reuse **with variation**: each use is an independent copy built from the values it passes. The block list and the _Use block_ picker say this in one line ("Use a block when the same steps need different settings; use Go to activity when they are identical"). Blocks have their own tab because they have their own meaning, and the activity views are already crowded.

All labels live in the existing i18n files so the tab and terms can be renamed without code changes.

### 2. The Building blocks tab

**List view.** One card/row per block: label and name, short description, number of parameters, "used in N places", badges for _Placeholder_ and for blocks with _Prerequisites_, and a warning badge when a call site is out of sync (§5.3). Search by name/label; filter: all / unused / placeholders.

**Create.** "New block" asks for label, name (validated and unique across blocks), and an optional description, then opens the editor. A _Convert to block_ action on an existing activity is out of scope for v1.

**Editor.** The same canvas as the activity editor, with these differences:

- the page is a block page (`block_start` at its root; the user does not manage it as a node);
- the palette adds **Parameters** (draw.io surface only, §4), **Configuration choice** and **Use block**;
- it has no process-level nodes (start/end are implicit);
- a right-hand **Block settings** panel holds label, description, parameters (§3), prerequisites (§8), and the placeholder toggle (§9).

**Detail / usage.** Each block shows a "Used by" list (call sites grouped by activity/process, with the arguments each passes). Clicking a use opens that node on its canvas.

**Delete.** Blocked while used, with the list of call sites. Deletion of an unused block removes its parameter concepts (§3.3) after confirmation.

### 3. Parameters

#### 3.1 Where they are edited

A **Parameters** section in the settings dialog of a block and of an activity (the gear next to the bin; processes included). It reuses the option-list component used for select questions: a reorderable list of rows with an inline editor, an _Add parameter_ button, and per-row delete.

Each row:

| Field       | Control                           | Notes                                                                                                                      |
| ----------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Label       | text (per language)               | clinician-facing text shown on call sites; stored as the concept's designation in the CodeSystem, not in the activity YAML |
| Name        | text, auto-slugged from the label | `[a-z][a-z0-9_]*`, unique within the page, editable until the first call site uses it                                      |
| Type        | segmented control                 | **Yes/No** (`boolean`), **Number**, **Text** (`string`), **Choice**                                                        |
| Options     | option-list editor                | only for Choice; the same editor as select options                                                                         |
| Default     | control matching the type         | optional                                                                                                                   |
| Required    | toggle                            | a required parameter without default must get a value up the chain or from the intervention (§6)                           |
| Description | text                              | helper text on call sites                                                                                                  |

Advanced types `name`, `concept` and `expression` are available from an "Advanced types" disclosure, off by default. They create no dictionary concept.

Validation is live: duplicate name, empty choice list, default not in options, the same name already used downstream with another type (§3.4).

#### 3.2 Parameter values in expressions

Within the block, parameters are available wherever the editor offers a value picker (labels, conditions, relevance): they appear under a **Parameters** group and insert `{{name}}`. The editor shows them as a chip with the parameter label, not the raw braces. The mapping to text vs expression rendering is the library's (lib §4); the frontend does not quote.

#### 3.3 Data dictionary side effect

Creating, renaming or deleting a primitive parameter (Yes/No, Number, Text, Choice) creates, updates or removes a concept in the **calculate** section of the data dictionary (in the project folder, the calculate CodeSystem under `terminology/`; its name and a `kind = parameter` concept property are to be confirmed):

| UI type | Concept type          | Code                   | Kind        |
| ------- | --------------------- | ---------------------- | ----------- |
| Yes/No  | boolean               | `param_<owner>_<name>` | `parameter` |
| Number  | number                | same                   | `parameter` |
| Text    | string                | same                   | `parameter` |
| Choice  | choice (with options) | same                   | `parameter` |

The entry describes the parameter (label, type, options, default); it holds no value. These rows are shown in the dictionary with a _Parameter_ badge, read-only apart from the label, and link back to the block or process that owns them. Editing happens only in the owner's modal, so there is one source of truth. If a code already exists with a different kind, saving the parameter is blocked with an explanation (no silent overwrite).

#### 3.4 Computed (inherited) parameters

An activity's parameter list is mostly **computed** from what it calls (lib §3.3): a parameter its callee needs and that is not set at the call bubbles up to the caller. The settings dialog of an activity, process or block lists both kinds:

- **Declared** rows are edited as in §3.1.
- **Computed** rows are read-only and carry a badge _From <activity or block>_ (a click opens it). Type, options and default come from the deepest declaration. They link to the call nodes where a value can be set.

Both kinds are **saved the same way** in the activity's `params`, so the file is self-describing; the badge is not stored, it is recomputed from the call graph every time (the library does the same, and treats its own computation as authoritative).

Consistency rules, all recomputed in the same transaction as the change that triggers them:

- **Orphans.** A saved entry that nothing below uses and that no placeholder or static condition in the page references shows _Not used_, with a one-click remove. It is never deleted automatically, since it may have been declared on purpose.
- **Conflicts.** The same name with a different type or choice options along a chain is an error shown on both declarations (`E_PARAM_CONFLICT`).
- **Binding by reference.** An argument can use "a setting of this activity" instead of a literal (lib `{{ref}}`); if the activity has no parameter of that name, one is added as a computed row.

### 4. Palette additions

| Node                             | Available in                                       | Behaviour                                                                                                                                                                                                                                      |
| -------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Parameters** (draw.io surface) | process and block pages only; at most one per page | In the draw.io view it is a shape listing the page's parameters. In the guided editor it is generated from the modal and read-only (edit via the modal). Round trip: a draw.io file containing a `parameters` shape fills the modal on import. |
| **Use block**                    | activities, processes, blocks                      | Picks a block, then shows its argument form (§5).                                                                                                                                                                                              |
| **Configuration choice**         | process and block pages                            | A decision whose condition is built from parameters and literals only (§7). Drawn as a decision with a dashed outline and a small settings badge, with the label shown in the author's language.                                               |
| **Go to** (existing)             | as today                                           | When the target process declares parameters, shows the same argument form (§6).                                                                                                                                                                |

Block/process pages are the only ones that can _declare_ parameters, so activities never show the Parameters node and never offer parameter pickers.

### 5. Using a block

#### 5.1 Argument form

After the link to a block is made, the node's property panel is generated from the block's parameters:

| Parameter type | Control                                             |
| -------------- | --------------------------------------------------- |
| Yes/No         | toggle                                              |
| Number         | number input                                        |
| Text           | text input                                          |
| Choice         | dropdown from the options                           |
| `concept`      | concept picker restricted to the project dictionary |
| `name`         | text input with identifier validation               |
| `expression`   | expression editor                                   |

Rules: required parameters are marked and block saving of the activity until filled; parameters with a default show it greyed and are saved only when changed; each parameter's description is the helper text.

**Inherited or set.** Each row has two states. _Inherited_: nothing is stored, the row shows where the value will come from (the calling activity, the intervention) and, when only one intervention reaches it, the resolved value. _Set for this call_: the value is stored in `args`; clearing it returns the row to _Inherited_. Setting a value where one is already inherited shows "overrides the value inherited from …" (edge case, allowed). A row can also be bound to "a setting of this activity" instead of a literal.

**Node face.** The node shows the block label and a one-line summary of the arguments ("Axillary · 37.5"). Missing required values show a warning icon.

#### 5.2 Serialization

Values are stored on the node as `args`; see §10 for YAML and draw.io.

#### 5.3 Refresh when a block's parameters change

The call site stores values keyed by parameter name. When a block is saved, the frontend reconciles every call site (in the same transaction, so the project never sits half-updated), and re-reconciles when a project is opened (this also covers edits made outside the tool):

| Change in the block                         | Effect on call sites                                                                                                                                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parameter added                             | appears with its default; if required without default, flagged _needs a value_                                                                                                                                   |
| Parameter removed                           | value kept but flagged _no longer used by the block_ until the author clears it; the library errors on it at export, so it is surfaced, not silently dropped                                                     |
| Parameter **renamed in the editor**         | values moved to the new name in the same transaction (the frontend knows it is a rename, not a delete + add)                                                                                                     |
| Parameter renamed or removed **downstream** | callers' computed and saved entries and any "setting of this activity" bindings follow a rename through the whole call chain in the same transaction; a removal leaves the callers' entries as _Not used_ (§3.4) |
| Type changed                                | value coerced when lossless (number → text); otherwise cleared and flagged                                                                                                                                       |
| Choice options changed                      | values no longer in the list are flagged                                                                                                                                                                         |
| Default changed                             | call sites that did not override it follow the new default                                                                                                                                                       |

An externally edited file that renames a parameter looks like remove + add; the flags above are what the author sees. Flagged call sites show in the block list badge and in a project-level **Needs attention** list.

#### 5.4 Naming when a block is used several times

Each use makes the block's fields again, so the names say whether the uses collect different things or the same one (tricc_oo `docs/tricc-elements.md`, "A block used several times"). Two uses that build the same name are not an error; the name says which case it is:

1. **Different things, both kept**: the names must differ, so put a parameter in them. An existing one can do it (`temp_{{site}}` gives `temp_axillary` / `temp_rectal`). When none does, add a parameter of type `name`, e.g. `prefix`, name the field `{{prefix}}_temp`, and use the block with `prefix: admission` and `prefix: discharge`.
2. **The same concept, collected once** (the block is reached from several places): keep the same names, same repeat. This is an instance: tricc_oo keeps each copy as a version of one concept, and a later copy is not asked again once the value is captured. A Use block has no `instance` field (instances are ignored at node level). A Go to activity covers the same case by reuse instead: one activity instance, wrapped between a bridge and a wait for each call site.
3. **The same concept, collected again**: same names, plus `repeat` on each Use block node (1, 2), giving `temp_axillary` and `temp_axillary_Rr_2`. Caveat for now: the concept-repeat skip rule keys on the slot drawn on the node, not on a repeat set on the call, so the second slot is only asked when the first is empty. Whether a block's repeat should count as the drawn slot is open (§14).

### 6. Intervention settings, inheritance and Go to activity

Parameters behave like function parameters (lib §3): a value set at a call applies to what is called below; a parameter not set at a call is **inherited** from the calling activity; at the top of the chain, the **intervention** supplies the values. The intervention is an implementation vehicle, so it is where a configuration is chosen; it is not itself parameterized.

**Intervention gear dialog.** The dialog gains two sections:

- **Settings.** Lists, grouped by name, every parameter that the intervention's activities have or inherit (the union of their computed lists, §3.4), rendered with the argument form of §5.1. A parameter shared by several activities is asked once. Values are saved as the intervention's `args`. Required parameters with no default and no value are flagged with the chain that needs them. A **Preview with values** link opens the intervention's activities with pruned paths dimmed (§7).
- **Scope.** The `requires` list (§8): which other interventions (and optionally concepts) are in scope for this one.

**Go to activity and Use block.** The node's form shows every effective parameter of the target (§5.1). Each row is _Inherited_ by default; setting a value stores it in `args` for that call and applies only to the target and what it calls. Overriding a value that is already inherited is an edge case: it is allowed and shown with an "overrides the value inherited from …" hint.

**Resolution order** is the library's: call-site value, then inherited value, then default.

Rules:

- The same activity reached through two interventions with different settings is built twice (lib §3.3). The activity's page shows a one-line info ("built 2 times with different settings") so the extra copies are not a surprise.
- A required parameter with no default and no value anywhere up the chain is flagged on the intervention dialog and blocks the export, naming the chain.
- Intervention `start` is not parameterized and is not derived from parameters. Keeping it consistent with the content is the author's job (ideally it will be derived from the content later, with manual extra conditions preserved).

### 7. Configuration choice

**Editor.** Opening the node shows a condition builder with a restricted vocabulary: parameters (grouped under _Parameters_), literals, and the operators allowed in lib §7.2. Patient and context items (questions, concepts, `today()`, age…) are not offered. If an expression is pasted or imported that uses them, the node shows an inline error ("This choice is decided when the questionnaire is built, so it can only use parameters"), matching the library's `E_STATIC_UNRESOLVED`.

**Outgoing paths.** Labelled automatically from the parameter type: Yes/No for booleans, one path per option for Choice, plus an optional _Otherwise_ path. The author can add several choice values to one path.

**Preview.** The block/process editor has a **Preview with values** panel: the author picks values for the page's parameters (from an intervention card, the intervention's own settings are used), and the canvas dims the paths that would be removed and shows, per configuration choice, the value it resolved to. It also lists nodes removed and concepts that become prerequisites. Dimming is advisory and read-only.

_Implementation note (decision needed, §14):_ the preview can either call a backend endpoint that runs the library's evaluator, or reimplement the evaluator in the frontend. The first avoids divergence; the second works offline. If reimplemented, it must run the shared test vectors from lib §14.

**Ordinary decisions.** Nothing changes for them. The library also folds parameters it finds in normal conditions (opportunistic folding, lib §7.3); the preview reflects that and marks those decisions with an "also resolved at build time" hint, so authors are not surprised.

### 8. Prerequisites

**Declaring.** On the intervention gear dialog, **Scope** lists the other interventions this one works with (`requires`); concepts those interventions produce are in scope, and only concepts outside that scope can become prerequisites by accident of omission. In Block settings and in activity settings, a **Requires** list of concepts: a multi-picker over the data dictionary ("this assumes these were recorded earlier", e.g. the result of an earlier test), with an optional note per entry. Serialized as `requires` (§10).

**Seeing the consequences.** The export dialog and the preview panel show a **Prerequisites** table, matching the library's dead-concept report:

| Column           | Content                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Concept          | label and code                                                                                                                   |
| Why              | _Producer removed in this configuration_, _Not produced by this intervention or the ones it requires_, or _Declared as required_ |
| Used by          | the nodes/processes that read it                                                                                                 |
| What will happen | _Ask at the start_ (default), _Use default value_, _Fail the export_                                                             |

The last column is editable per concept and writes the concept's `on_missing` override; a global default sits above the table. Concepts that have _Use default value_ but no dictionary default show an inline error.

### 9. Placeholder blocks

A toggle **Placeholder (filled at export)** in Block settings. When on:

- the canvas is empty apart from entry and exit, and the Parameters section stays available;
- two lists appear: **Needs** (concepts the placeholder reads) and **Provides** (concepts it produces), both from the dictionary; these are the `extension.requires` and `extension.provides` contract;
- a **Handler** field names the export behaviour (free text with autocomplete from handlers the backend reports, when available);
- **If nothing fills it**: _Skip it_ (default) or _Fail the export_.

Call sites of a placeholder block look like any other _Use block_ node, with a _Placeholder_ badge. The export dialog lists, per placeholder call, whether a handler will fill it, the authored fallback will be used, or it will be skipped. If a placeholder has authored content and a handler, the content is the fallback (lib §9); the editor says so when both exist.

### 10. Serialization

**YAML.** Intervention `args` and `requires` go in `tricc.yaml`, beside `name`, `activities` and `start`. A `params` section sits at activity level in the activity file, beside `applicability`, and holds declared and computed entries alike. `args` go on call nodes; `static` on a configuration choice (with the plain-language `intent` every expression carries); `requires` and `extension` on the page. Blocks are listed in a project-level `blocks:` list in `tricc.yaml`, like activities (`id`, `path`, and an optional `source` so a block can be shared across projects and stay read-only in the consuming one), and stored as `blocks/<id>.block.yaml` (new folder, to confirm). Node type names below follow the library; align them with the frontend's own names.

```yaml
# tricc.yaml
blocks:
  - id: measure-temperature
    path: blocks/measure-temperature.block.yaml
interventions:
  - id: young-infant
    name: young_infant
    activities: [facility-profile, vital-signs, weight-measurement]
    start: { on: demand, condition: 'AgeInDays() < 60' }
    args:
      lab_available: true
    requires: [triage]
```

```yaml
# activities/facility-profile.activity.yaml
id: facility-profile
process: registration
params:
  - name: lab_available # label and translations live on the concept in the CodeSystem
    type: boolean
    default: false
requires:
  - { system: 'http://tricc.org/CodeSystem/tricc', code: 'malaria_rdt_result' }
nodes:
  - id: d-lab
    type: rhombus
    static: true
    label: { en: 'Lab available?' }
    expression: '{{lab_available}}'
  - id: u-temp
    type: block
    link: measure_temperature
    args:
      site: axillary
      threshold: 37.5
edges:
  - { from: d-lab, to: n-rdt, value: 'yes' }
  - { from: d-lab, to: n-referral, value: 'no' }
```

**draw.io.**

| Element                    | Encoding                                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Declaration                | one `parameters` shape per process/block page, attributes `param.<name>`, value JSON or shorthand (`choice(axillary\|rectal\|oral)!`, `number=37.5`, `boolean=false`) |
| Value on a call            | attributes `param.<name>` on the `block` or `goto` shape                                                                                                              |
| Configuration choice       | decision shape with attribute `static = true` and the dashed style                                                                                                    |
| Prerequisites, placeholder | page properties `requires`, `extension`                                                                                                                               |

The separator is a dot, not a colon (changed 2026-11-03): in XML, `param:site` makes `param` an undeclared namespace prefix, and lxml refuses to parse the drawing.

The shorthand grammar and JSON form are defined in lib §2. The frontend writes JSON when a label or description is present, shorthand otherwise. On import the two are equivalent.

### 11. Validation messages

Shown inline on the node and collected under **Needs attention**:

| Condition                       | Message (author-facing)                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| Missing required value          | "_Site_ needs a value."                                                                  |
| Value not allowed               | "_Rectal2_ is not one of the options for _Site_."                                        |
| Parameter no longer exists      | "The block no longer has a setting called _old_name_."                                   |
| Same instance, different values | "Two calls use process instance 2 with different settings."                              |
| Choice uses patient data        | "This choice is decided when the questionnaire is built, so it can only use parameters." |
| Block cycle                     | "Block A uses itself through Block B."                                                   |
| Unused block                    | "Nothing uses this block yet."                                                           |

Library errors (lib §3, §6, §7) are mapped to the same messages when they come back from a build; the frontend never hides a library error behind a friendlier one without keeping the original available under "Details".

### 12. What the frontend needs from the library

- A schema (or generated types) for `params`, `args`, `requires`, `extension`, `static`, kept in step with lib §2–§9, including `TriccInterventionConfig` reading `args` and `requires`.
- The library's computation of effective parameters (lib §3.3), or a shared implementation of it, so the badges and orphan flags of §3.4 match the build.
- The data-dictionary contract for `kind: parameter` concepts (lib §5), including who writes them.
- Optionally: a prune/prerequisite preview endpoint (lib §7, §8), and a list of registered extension handlers.
- The shared test vectors for static evaluation (lib §14), if the preview is reimplemented.

### 13. Acceptance criteria

- A _Building blocks_ tab lists blocks with usage, badges and search; blocks can be created, edited and (when unused) deleted.
- Parameters are edited in the block and activity settings dialogs with Yes/No, Number, Text, Choice; computed parameters appear read-only with a _From …_ badge and are saved like declared ones; primitive ones appear in the calculate dictionary as read-only _Parameter_ concepts and stay in sync with renames and deletes.
- _Use block_ and parameterized _Go to activity_ nodes show an argument form generated from the target, enforce required values, and summarize the values on the node.
- The intervention gear dialog has Settings (values reach the library as `args`) and Scope (`requires`). Unset values are inherited down the call chain, and a value set at a _Go to activity_ or _Use block_ node applies only below it.
- Changing a block's parameters reconciles call sites per §5.3, and flags what it cannot fix.
- A _Configuration choice_ node only accepts parameters and literals, and the preview shows which paths a chosen set of values removes.
- The export dialog lists generated prerequisites with reason and consumers, and lets the author pick the per-concept behaviour.
- Placeholder blocks declare their contract and show what will fill them at export.
- The YAML and draw.io encodings round-trip: import → edit → export preserves parameters, arguments, static flags, `requires` and `extension`.

### 14. Open questions

1. **Preview evaluator.** Backend endpoint or frontend reimplementation (§7)? **Decided 2026-10-28: frontend reimplementation**, running the lib §14 shared test vectors (phase 6).
2. **Parameter identity.** Names are the only key and inheritance is by name. Renames are propagated by transaction through the call chain (§5.3); is that enough, or do parameters need a stable `id`? **Decided 2026-10-28: names only.**
3. **Implicit inheritance.** Same name along a chain means same parameter. Is the type-conflict error enough, or should inheritance be opt-in per parameter (lib open question 8)?
4. **Concept ownership.** Parameter concepts are written by the frontend and also synthesized by the library (lib §5). Which wins on conflict? **Decided 2026-10-28: the project data dictionary wins.** Not because the frontend wrote it, but because the frontend feeds the data dictionary to the library (`tricc_oo`), which does not come with one of its own; the library only synthesizes entries the dictionary lacks (draw.io-only projects).
5. **Shared activities from other projects.** An activity with a `source` is read-only here. Its declared parameters come with it; computed ones depend on what it calls. Are bindings on the caller side enough?
6. **Handlers list.** Is there a backend to ask for registered extension handlers, or is the handler field free text in v1?
7. **Convert activity to block.** Worth a v1 action, since authors will want to promote an existing activity to a block?
8. **Repeat on a Use block.** Should a `repeat` set on the Use block node count as the drawn slot for the concept-repeat skip rule (§5.4, case 3)? Today it changes the export name only. Owner: Patrick, library side.

### 15. Implementation phases

1. Navigation, tab shell, block list/create/delete, block editor on existing canvas.
2. Parameters editor in block and activity settings dialogs; dictionary concepts; YAML `params`.
3. _Use block_ node, argument form, `args`; call-site reconciliation; _Needs attention_ list.
4. Computed and inherited parameters (§3.4), override at call sites, intervention Settings and Scope (§6).
5. draw.io encodings (`parameters` shape, `param.*`).
6. _Configuration choice_ node and restricted editor; preview.
7. Prerequisites declaration and export-dialog table.
8. Placeholder blocks.

Phases 1 to 5 depend only on lib phases 1 to 5; 6 to 8 follow lib phases 6 to 8.

### 16. Implementation notes (phases 1–5, 2026-10-29)

Where the build differs from the text above, or settles something it left open:

- **Blocks are activities rooted by `block_start`** (`activityKind() === 'block'`), so the canvas, undo, clipboard and discussions apply unchanged. Saved as `blocks/<id>.block.yaml`, listed in `tricc.yaml` `blocks: [{id, path}]`. Every `blocks/*.yaml` file is read; a `blocks:` entry pointing elsewhere, and its `source`, are not read yet.
- **Block settings** are the gear dialog (titled "Block settings — …"), not a right-hand panel. The canvas has no Parameters node: the editor header shows a parameters chip that opens the dialog. The draw.io `parameters` shape is folded into `params` on import.
- **No block description** yet: the activity model has none.
- **Parameter names** stay editable after the first use: a rename follows through the call chain (`planParamRename`), so locking it is not needed.
- **Orphans.** A row the author declared is never removed. A row that was only _computed_ and becomes unused through a change (a value is now set at the call) is removed in the same transaction; after an outside edit it shows _Not used_.
- **Parameter pickers** (`{{name}}` chips and _Insert a setting…_ in CQL fields) are offered on any page with parameters, since the library lets any activity have them.
- **Dictionary concepts**: `param_<owner>_<name>` in the calculate dictionary, properties `kind = parameter` (code), `option` (code, repeated), `default` (string), `dataType` boolean/decimal/string/coded. Created with a default dictionary when the project has none. The project dictionary wins over the library (§14 Q4). The calculate CodeSystem carries `meta.tag` `{system: http://tricc.org/fhir/CodeSystem/codesystem-role, code: calculate}`: added when the frontend creates it or saves it, kept as read. `calculateCodeSystem()` looks it up as tricc_oo does (lib §5): the tagged CodeSystem, then `tricc.yaml` `calculate_code_system`, then one called `<default>-calculate` or `calculate`.
- **Not checked by the frontend**: name collisions from placeholders (needs instantiation; the library reports it).
- **Missing required values** are flagged on the intervention (naming the chain) and on a call's node when every intervention reaching it leaves the value unset; a page no intervention reaches is not flagged.
