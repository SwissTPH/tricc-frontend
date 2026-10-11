# Data dictionary tab and concept texts (codes-only YAML, display, q-display, rich text)

| Field | Value |
|-------|-------|
| **Status** | Frontend implemented (phases 0–5), 2026-10-08, not committed. `tricc_oo` side specified in `../../tricc_oo/feature/20261008-concept-texts-q-display-and-message-tree.md` (Draft). See "Implementation notes" at the end. |
| **Repo** | `tricc_frontend` + **`tricc_oo`** (§2.5, §2.6) |
| **Related** | `20260825-terminology.md` (spec 5, not built; this is its first slice), `20260825-cql-authoring.md` (chips), `20261008-not-available-node.md` (depends on this), `../../tricc_oo/feature/20260909-display-message-ast.md` and `display-text-injection.md` (Implemented in `tricc_oo`), `../../tricc_oo/tricc_oo/converters/datadictionnary.py` (`DESIGNATION_USES`) |
| **Source** | Review remarks, 2026-10-08, and Patrick's ruling on the same day: the frontend YAML holds codes only |
| **Approval** | — |

This plan comes **before** any feature that adds texted nodes. `20261008-not-available-node.md`
is one of them.

---

## Part I — Business description

### One home for every text

Every question and every answer should point to a **concept** in the project's data dictionary
(a FHIR CodeSystem). Its texts live **only** in the dictionary, in every language. The activity
file holds the structure and the concept codes, nothing else. Translations then live in one
place. A wording fix made once applies everywhere the concept is used.

Today the opposite happens:

- every node and answer carries its own label, hint, and help in the activity file;
- the dictionary is invisible;
- there is nowhere to edit it.

This plan adds:

- **A Data dictionary tab** next to Overview, Processes, and Activities. It lists the concepts.
  Each one opens a page with its code, texts, data type, and where it is used.
- **A concept card on the node.** In the node's Details, a small inset shows the concept's code
  and texts, lets you edit the questionnaire text in place, and has an **Edit in dictionary** link
  to the full concept page.

### Two kinds of text for one concept

A concept's **display** is its name in the dictionary, for example "Weight (kg)". The text a
health worker reads on the form is often longer, for example "Weigh the child on the scale and
enter the weight in kilograms".

Today both are mixed, which causes two problems:

- CQL chips and canvas nodes show long sentences;
- the dictionary name changes when someone rewords the form.

The plan separates them:

- **display** is the short dictionary name. CQL chips, the dictionary, and lists use it.
- **q-display** (questionnaire display) is the text shown on the questionnaire. Each concept has a
  default q-display. It can be overridden for a specific intervention, for example a shorter
  wording in the community intervention than in the facility one.

The questionnaire uses this order:

1. the intervention's q-display
2. the default q-display
3. the display

### Rich text with data

- Questionnaire text needs bold, italics, lists, line breaks, and values from earlier answers,
  for example "Give **${dose} mg**".
- `tricc_oo` already has a message tree for this. The app needs an editor that writes it, so
  authors do not type HTML or `${}` by hand.
- The editor writes `tricc_oo`'s own message tree. `tricc_oo` reads it as is, with no HTML or
  Markdown re-parsing, so formatting and injected data come out the same in every language (§2.7).

---

## Part II — Technical specification

### 2.0 Rule: activity YAML holds codes, not texts

This applies to any node that shows text to the health worker:

- every question type;
- display nodes (`note` as exported text, `hint`/`help` messages, `diagnosis`,
  `proposed_diagnosis`, and similar);
- **every select option**, including `not_available` reasons.

These carry **no** `label`, `hint`, or `help` maps. Their **`name` is the concept code** in the
project's `default_code_system`. Historically that is what a TRICC `name` is (Patrick, 2026-10-08),
and it avoids a large change to the files and to `tricc_oo`. `code` would fit better, but `name`
stays.

```yaml
- id: weight
  type: decimal
  name: CHE.B6.DE07                 # = concept code in default_code_system
- id: q-cough
  type: select_one
  name: cough
  options:
    - { id: q-cough-yes, name: "yes" }   # option name = answer concept code
    - { id: q-cough-no,  name: "no" }
- id: q-temp
  type: decimal
  name: temp
  concept: { system: https://who.int/CodeSystem/dak, code: DE.123 }   # exception only
```

- **`concept:` is the exception.** It is written only when the concept is in another CodeSystem
  than `default_code_system`, or when its code cannot be the node name. `tricc_oo` resolves texts
  and `concept_code` from `concept`, else `name` (commit 9676af2, and commit 991b3b6 for selects).
  `concept:` accepts `str | {code, system?}`.
- `tricc_oo` YamlStrategy already fills a missing label, hint, or help from that concept
  (`TEXT_FIELD_USES`), and an option's label is optional there. So codes-only YAML loads today.
  No `tricc_oo` change is needed for this rule.
- `calculate` and `rhombus` have no questionnaire text (`NO_CONCEPT_TEXT_TYPES`). Their `name` is
  only a variable name. The dictionary does not require a concept for them.
- **Name uniqueness.** Two nodes in one activity with the same `name` are the same variable. That
  is the existing (name, repeat) rule in `validate/activity.ts:180-187, 236-249`. Reusing a concept
  on a second node therefore means either the same variable, as TRICC intends, or a `concept:`
  override on a differently named node.

**Outside this rule** (open question 3):

- sequence nodes: the root node shows the activity title
  (`20261008-drawio-import-and-sequence-nodes.md` §2.2)
- `goto` labels
- free canvas notes that are not exported
- the activity `title` and the intervention `title`

**Migration on read** (`packages/core/src/format/codec.ts` decode, and the draw.io import):

1. The concept code of a node is its `concept.code` when the node has a concept. Otherwise it is
   its `name`. For an option, it is the option `name`.
2. A node or option with inline `label`/`hint`/`help`:
   - Make sure the concept exists in `defaultCodeSystem`, creating it if needed.
   - If that code already exists with *different* text, keep the existing text and emit warning
     `concept.migrated-collision` with the dropped text. Do not invent a suffixed code, because
     the name is the variable.
3. Move the inline texts onto the concept:
   - `label` becomes the default **q-display**;
   - `display` is set from the label only if it is empty, and the author shortens it later in the
     dictionary;
   - `hint` and `help` become the matching designations, in each language present.
4. If the concept already has a q-display that differs from the inline text, keep the concept's
   text and emit info `concept.inline-text-dropped` with the dropped text.
5. Never write `label`/`hint`/`help` on these nodes again (encode, `codec.ts` around l.301).

The migration runs in the document load as its own undoable step, so it is never merged into a
later undo.

**Draw.io** follows the same path. The shape label becomes the concept's default q-display. This
matches what `tricc_oo` d76bf11 does on its side.

**Select `filter` is dropped.**

- `filter` is not used (Patrick, 2026-10-08). Select choices are compiled from the relevance of
  the options, not from a choice filter.
- `tricc_oo` no longer reads it on YAML (commit 991b3b6, branch `feature/sync-fe`, local only).
- The continuation file's 2026-10-07 reading, "a non-empty filter is the concept code", is
  withdrawn.
- **Read**, from draw.io (`drawio.ts:266-269`) and older YAML (`codec.ts:80`): ignore `filter`.
  - No rename, and no `concept:` is derived from it.
  - A non-empty value emits info `select.filter-ignored` once per node, so the author sees it went.
- **Write**: never write `filter`. Remove it from the schema (`activity.ts:100-103`), from
  `TriccNode`, and from the encoder (`codec.ts:266`).
- **Editor**: remove the select's Code field, which was shown only when `filter` was non-empty.
- **CQL chips**: drop the `node.filter` key from `cql/names.ts:107-110`.
- This can ship ahead of phase 1 (§2.8 phase 0).

**Model** (`model/types.ts:45-113`):

- Remove `label`, `hint`, `help`, and `filter` from `TriccNode`. Remove `label` from
  `SelectOption`.
- `concept` stays optional, as the override.
- A text-bearing node whose code resolves to no concept in the project is a validation **error**
  `node.missing-concept`, with a quick fix "Create concept {name}".

### 2.1 Fix first: designations lose their `use`

This blocks everything else in this plan.

**What is wrong today**

- `packages/core/src/format/codec.ts:173-174` decodes `designations[d.language] = d.value` and
  drops `use`. Encode (l.431-434) writes no `use`.
- `tricc_oo` reads a missing `use` as display. So today a hint or help designation round-trips
  into a **display** designation. That is data loss on save.
- `csConceptSchema` (`format/schema/codesystem.ts:28-36`) is `.strict()` with no `id`.
  Concepts exported by `tricc_oo` carry `id` and would be rejected.
- Terminology files are found by filename regex (`serialize/index.ts:75`,
  `^terminology/(.+)\.codesystem\.json$`), not from the `tricc.yaml` `terminology` list.
  `tricc_oo` writes `<name>_codesystem.json`.

**Change**

- Model (`model/types.ts:167-180`): replace `designations: Record<string,string>` with
  `designations: Designation[]`:

  ```ts
  // Designation = { language: string; use: DesignationUse; value: string; interventions?: string[] }
  // DesignationUse = 'display' | 'q-display' | 'hint' | 'help' | { system: string; code: string }
  ```

  - Known uses map to the `tricc_oo` `DESIGNATION_USES` URIs.
  - Unknown uses round-trip as `{system, code}`.
- Add helper `conceptText(concept, use, lang, interventionId?)` in
  `packages/core/src/terminology/`, mirroring `tricc_oo` `concept_text`. Order of preference:
  1. the intervention-specific value
  2. the default for that use
  3. for `q-display` only, `display`
  4. `concept.display` in the default language
- Accept and keep `id` on concepts. Relax `.strict()` to `.passthrough()` for unknown keys, and
  write them back unchanged.
- Read terminology from the `tricc.yaml` `terminology` list first, then fall back to the regex.
  Write back to the path the file was read from.
- Tests: round-trip byte-stable
  - the sample concept in `tricc_oo/tests/test_yaml_concept_texts.py`;
  - `tests/output/demo/demo_codesystem.json`.

### 2.2 Data dictionary tab

**List and search**

- Add `tab-dictionary` ("Data dictionary") to the `ActivityNavigator.tsx:184-275` tablist, after
  Activities.
- Search (`concept-search`) covers code, display, and designations, using `ConceptIndex`
  (`terminology/index-search.ts:44`, currently unused).
- The list shows code, display, data type, and usage count.
- `+` (`concept-add`) creates a concept in `defaultCodeSystem`. Code is required and unique.
  Display is required.

**Concept page**

- Selecting a concept opens `ConceptEditor` in the main area, where `ActivityEditor` would be.
- URL state `?concept=<system>|<code>`, so links and Back work.
- Fields:
  - code (read-only once used)
  - display
  - definition
  - data type
  - concept type
  - unit
  - `targetResource` / `targetPath`
  - **Texts**: a table with one row per (use, language, interventions)
  - **Answers**: for select concepts, the answer concepts in order (see the note below)
- **Used by**: activities and nodes, each a link that opens the activity with the node selected.
  Built from `node.concept`, option concepts, and CQL references (the `cql/names.ts` keys).
- Delete only when the concept is unused. Otherwise the bin is disabled, with a tooltip giving
  the usage count.

**Plumbing**

- Mutations already exist (`mutations.ts:163-200`: `addCodeSystem`, `upsertConcept`,
  `removeConcept`). Add `setDesignation` and `removeDesignation`.
- When a project has more than one CodeSystem, show a system selector above the list.

**Select answers.** The node's `options` list still holds the order and the stored `name`. Each
option carries a concept. The concept page lists which select nodes use the concept as an answer.

### 2.3 Concept card on the node

**Concept section**

`NodeProperties` (`ActivityEditor.tsx:372-910`) gets a **Concept** section, replacing today's
Label, Hint, and Help fields for text-bearing types.

- **Picker** (`field-concept`): a typeahead over `ConceptIndex`. It replaces the separate Name
  field for text-bearing types, because the name *is* the code.
  - Picking a concept in `default_code_system` sets the node `name` to its code.
  - Picking a concept from another CodeSystem keeps the name and writes the `concept:` override.
  - The last option is "Create concept {typed text}". It creates the concept and sets the name in
    one `mutate`.
  - When the name changes, expressions in the activity that reference the old name are rewritten
    in the same `mutate`.
- **Inset card** (`concept-card`):
  - the code and display, read-only here;
  - an editable **Questionnaire text** field, which is the default q-display in the current UI
    language (rich text once §2.7 lands);
  - editable **Hint** and **Help**, which are concept designations;
  - a note "Shared by N nodes" when the concept is used elsewhere, because edits apply to all
    of them;
  - **Edit in dictionary** (`concept-edit-link`), which switches to the Data dictionary tab with
    that concept open;
  - **Change concept**.

**Select answers**

- Each answer row in the properties panel gets the same compact picker, plus an editable
  q-display. That replaces today's answer label field.
- The answer `name` is both the stored ODK value and the answer concept code. Picking an answer
  concept sets it.

**Canvas** (`TriccNode.tsx:121-126`)

- Shows the resolved q-display in the current UI language, falling back to display.
- Today it uses the concept display without a language. Fix that.
- In v1 there is no intervention context on the canvas: it always shows the default q-display.

**CQL chips** (`cql/names.ts:44-60, 91-98`) use **display** only, which is the short text,
never q-display. Drop the `node.label` fallback (l.91-98), because nodes no longer carry labels.

### 2.4 q-display per intervention

- New designation use code `q-display`, system `https://tricc.org/CodeSystem/designation-use`
  (the same system as hint and help).
- Per-intervention scope is an extension on the designation:

  ```json
  { "language": "en",
    "use": { "system": "https://tricc.org/CodeSystem/designation-use", "code": "q-display" },
    "value": "Weigh the child and enter the weight",
    "extension": [{ "url": "https://tricc.org/StructureDefinition/designation-intervention",
                    "valueCode": "community" }] }
  ```

  - One extension per intervention id. Several extensions on one designation mean it applies to
    each listed intervention.
  - A designation with no extension is the default.
- The same scoping applies to `hint` and `help`. It is cheap, and the same need will come up.
- Validation:
  - `concept.unknown-intervention` (warning): an extension names an intervention that is not in
    the project.
  - `concept.duplicate-designation` (error): two designations have the same use, language, and
    intervention.

### 2.5 `tricc_oo` changes for q-display

Mirror these into `../../tricc_oo/feature/` on approval.

- `DESIGNATION_USES` (`datadictionnary.py:19-38`): add `q-display`.
- `concept_text(concept, use, lang, default_lang, intervention=None)`:
  - honour the intervention extension;
  - questionnaire labels ask for `q-display`, which falls back to display.
- YamlStrategy `TEXT_FIELD_USES` (`yaml.py`): map `label` to `q-display` instead of `display`.
  Pass the intervention in scope down to `_concept_texts` (`yaml.py:666`).
  - Each intervention is converted separately, and shared files are read once per intervention
    (`docs/tricc.yaml.template`, interventions). So an activity listed by two interventions
    already becomes two node sets. No node copy is needed.
  - Fixture: one activity in two interventions, with different q-displays, gives two different
    labels.
- Translation export (commit a3ad036): `label::<lang>` takes q-display before display.

### 2.6 `tricc_oo` check for codes-only YAML

This is not expected to need code, but each case must be confirmed with a fixture.

- A node with `concept` and no `label` gets its label from the concept. The fixture also covers
  hint and help.
- An option with `concept` and no `label` gets the concept's text. Its `name` defaults to the
  concept code.
- `concept.system` omitted resolves through `default_code_system`.

### 2.7 Rich text: the `tricc_oo` message AST end to end

`tricc_oo` already models display text as a tree, `TriccMessage` (`tricc_oo/models/message.py`,
`20260909-display-message-ast.md` §2.2). The tree has these node types:

- `TriccMessageText`
- interpolation (`TriccReference`)
- `TriccMessageBreak`
- `TriccMessageMark` (`strong` | `em` | `u`, wrapping children)
- `TriccMessageParagraph`
- `TriccMessageList` / `TriccMessageListItem`

Today the tree is only built *inside* `tricc_oo`, by parsing an HTML string
(`visitors/text_injection.py:195` `parse_html_to_message`). Its exports render from the tree:
Markdown for ODK/CHT, and a concatenate at serialize time for FHIR.

The app should hand `tricc_oo` that tree directly, so no HTML or Markdown string is re-parsed.
That is the purpose of the AST:

- marks wrap whole phrases (`**Give ${dose} mg**`);
- interpolations are real references, resolved and renamed by `process_reference`;
- translations get the same treatment as the default language. Today translated designation text
  is used as is, and `${}` in it is not remapped (commit a3ad036).

**Interchange JSON (canonical).** This is the `tricc_oo` wrapper shape with a `type`
discriminator. It is *not* ProseMirror's marks-on-leaves shape, which stays inside the editor.

```json
{ "type": "message", "children": [
  { "type": "text", "value": "Give " },
  { "type": "mark", "kind": "strong", "children": [
      { "type": "interp", "name": "dose" }, { "type": "text", "value": " mg" } ] },
  { "type": "break" },
  { "type": "list", "ordered": false, "items": [
      { "type": "item", "children": [ { "type": "text", "value": "with food" } ] } ] } ] }
```

The JSON holds unresolved names only (`interp.name`), as `20260909-display-message-ast.md` §2.9
requires.

**Where it lives in the CodeSystem.** A designation `value` must stay a FHIR string, and the
resource should not grow for nothing.

- `value` holds the Markdown rendering of the tree, by the `tricc_oo` §2.6 rules (`**strong**`,
  `_em_`, `- ` lists, `${name}`).
  - FHIR readers, translators, and diffs see readable text.
  - A plain string needs nothing else.
- Only when the tree has a mark, an interpolation, a break, or a list, add one extension:

  ```json
  { "url": "https://tricc.org/StructureDefinition/designation-message",
    "valueString": "<compact JSON of the tree>" }
  ```

  - This mirrors `_simplify_message`, which keeps `str` when there is no structure. Plain texts,
    which are most of them, pay nothing.
  - The extension is the source of truth. `value` is derived and is rewritten on every save.
  - If `value` was edited outside the app and no longer matches the tree, the app warns
    `text.value-out-of-sync`. It keeps the tree and offers to re-derive `value` from it.

**`tricc_oo` changes (input side).** Mirror these into `../../tricc_oo/feature/` as an addendum to
`20260909-display-message-ast.md`.

1. `message_from_json` / `message_to_json` in `visitors/text_injection.py`:
   - map `type` to the existing classes;
   - `interp` becomes `TriccReference(name)`;
   - give the models a `type` literal, or keep the discriminator in the codec only.
2. `concept_text` (`datadictionnary.py`): when the designation has the `designation-message`
   extension, return the `TriccMessage` instead of `value`.
   - `load_display_text` already passes message trees through untouched (`text_injection.py`,
     `_is_message_tree`), so the rest of the pipeline works unchanged.
   - Without the extension, behave as today: the string goes through the HTML/plain path.
3. Translation export (`serializers/xls_form_translations.py`): render other-language
   designations through the tree as well, so their `${name}` become export names.
4. Tests: a concept with a structured q-display in `en` and `fr` gives the same Markdown shape
   in `label::en` and `label::fr`, with renamed interpolations.

**Frontend.**

- `@tricc/core` `text/message.ts`, with no React:
  - the types;
  - `fromJson` / `toJson`;
  - `toMarkdown`, with the same rules as `tricc_oo` §2.6;
  - `fromHtml`, with the same subset as `tricc_oo` §2.5, so draw.io labels become trees on import
    (data-dictionary §2.0 migration);
  - `references()`, for validation and usage.
- **Shared fixtures.** `tricc_oo/tests/fixtures/messages/*.json` are triples of `{html, tree,
  markdown}`. vitest runs `fromHtml`/`toMarkdown` against them and pytest runs
  `parse_html_to_message`/`message_to_markdown`. The frontend keeps a copy under
  `packages/core/test/fixtures/messages/`, with a check script that diffs the two copies.
  Parity is tested, not assumed.
- **Editor**: TipTap (ProseMirror) in `@tricc/editor`.
  - Allowed: bold, italic, underline, hard break, bullet and ordered lists, and an inline atom
    `interp {name}` shown as a chip.
  - The mapper does wrapper ↔ marks-on-leaves conversion, grouping consecutive leaves with the
    same mark set (§2.9 of the `tricc_oo` spec).
  - Typing `${` or clicking "Insert data" opens the CQL-chip typeahead (`cql/names.ts`): questions
    in the open activity first, then the rest of the project.
  - Paste is sanitised through `fromHtml`.
  - Lazy-load TipTap when a text field gets focus. It is about 100 kB gzipped.

**Where it is used.** q-display, hint, and help, in the Texts table and the concept card.
`display` stays plain text: it is a dictionary name, the chips show it, and it never carries the
extension.

**Validation** (mirrors `tricc_oo` `display-text-injection.md`)

- `text.unknown-reference` (error): an `interp` names no node reachable in the activity or the
  project.
- `text.injection-not-allowed` (error): structure or `interp` on a concept used by a calculate or
  a rhombus.
- `text.value-out-of-sync` (warning): see above.

### 2.8 Phasing

| Phase | Content | Ships alone? |
|-------|---------|--------------|
| 0 | Select `filter` is ignored on read and never written (§2.0) | **Done 2026-10-08, uncommitted.** The `select.filter-ignored` info is not added yet. |
| 1 | §2.1 designation `use` fix | Yes. It stops data loss now. |
| 2 | §2.2 Data dictionary tab + §2.3 concept card (plain-text fields) | Yes |
| 3 | §2.0 codes-only YAML, with the migration on read + §2.6 check | Needs phase 2, so authors can still edit texts |
| 4 | §2.4 q-display + §2.5 `tricc_oo` | Both repos |
| 5 | §2.7 rich text (AST) + its `tricc_oo` input change | Both repos |

`20261008-not-available-node.md` can start after phase 3.

### 2.9 Tests

**core**

- designation round-trip with `use` and the extension
- `conceptText` order of preference
- terminology read from the `tricc.yaml` list
- concept usage index
- migration on read:
  - inline label → concept q-display
  - code collision gets a suffix
  - inline text dropped when the concept differs, with the info issue
- encode never writes `label`/`hint`/`help` on text-bearing nodes or options

**editor integration**

- dictionary tab: search, add, and edit
- the concept card: editing the questionnaire text updates the canvas
- "Shared by N nodes"
- the concept card link opens the dictionary on that concept
- the answer row picker
- the CQL chip shows display while the canvas shows q-display

**e2e**

- `dictionary.spec.ts` (new):
  - create a concept, link it from a node, edit its text, save;
  - the YAML holds only the code;
  - the CodeSystem JSON holds the text.
- e2e: open a project with inline labels from a purpose-built fixture, save, and assert that no
  node in the YAML has `label:`. (2026-10-08) `examples/` and the tests that read it were removed, because the examples were structurally wrong. New fixtures must be content that makes sense, and should be built inline or under `e2e/fixtures/`.

**`tricc_oo`**

- codes-only YAML fixture (§2.6)
- q-display label in the XLSForm
- intervention-scoped label in two forms
- translation column from q-display

### 2.10 Open questions

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Should select answers share global concepts (one `yes` for the project) or be per question? | Shared by default. The picker offers existing answer concepts first. |
| 2 | Should the canvas follow the intervention context for q-display? | Not in v1. It always shows the default. |
| 3 | Do activity and intervention `title`, and canvas `note` text, also move out of the YAML? | Not in this plan. They are not form texts. Revisit together with `.po` export (spec 7). |
| 4 | Should the interchange JSON keep the `type` discriminator in the `tricc_oo` Pydantic models, or only in the JSON codec? | Codec only. The models stay as they are. |

### 2.11 Settled on 2026-10-08

| Question | Answer |
|----------|--------|
| Use code for questionnaire text | `q-display`, kept short so FHIR resources stay small. The UI label is "Questionnaire text". |
| Rich text format | The `tricc_oo` `TriccMessage` AST, carried as JSON in a designation extension, with Markdown in `value`. The `tricc_oo` input strategy reads the tree directly (§2.7). |
| Concept reference in YAML | The node or option `name` is the concept code in `default_code_system`. `concept:` is written only as an override. `filter` is unused and dropped (§2.0). |
| Shared activity per intervention | `tricc_oo` converts each intervention separately, so per-intervention q-display needs no node copy (§2.5). |

## Implementation notes (2026-10-08)

### Phase 1: designations keep their use

**Model and codec**

- `Concept.designations` is now `Designation[]` (`{language, value, use?, extension?}`) in file
  order. Several designations may share a language when their uses differ.
- FHIR concept keys TRICC does not model, such as `id`, are kept in `Concept.extra` and written
  first, as `tricc_oo` does.
- `stringProperties` remembers which properties were `valueString`, so they are written back the
  same way.
- The CodeSystem key order matches `tricc_oo`: `description` comes before `content`.
- `tricc_oo/tests/output/demo/demo_codesystem.json` and `tricc_codesystem.json` decode, and
  re-encode to the same JSON.

**Helpers** (`terminology/designation.ts`)

- `DESIGNATION_USES`: display, hint, help, q-display. The URIs are `tricc_oo`'s, plus
  `q-display`.
- `designationUse()` reads a designation's use.
- `conceptText()` resolves a text in the same order as `tricc_oo` `concept_text`. q-display falls
  back to display.
- `withConceptText()` sets or clears one text.

**Terminology listed in `tricc.yaml`**

- Entries under `tricc.yaml` `terminology`, paths or globs, are read wherever the file is. The
  file is kept at its path (`CodeSystem.path`) and written back there.
- The older Y document form, text by language, is still read.

**Not done:** relaxing the CodeSystem top level to accept unknown keys. Only concepts pass
unknown keys through.

### Phase 2: Data dictionary tab and concept card

**Core** (`terminology/usage.ts`)

- `findCodeSystem` (by url, name, or id) and `defaultCodeSystem`.
- `nodeConceptKey` / `optionConceptKey`: an explicit `concept`, else the `name` in the default
  CodeSystem.
- `conceptUsage`.

**Navigator**

- The Data dictionary tab (`tab-dictionary`) appears when the host passes `onSelectConcept`.
- It has search (`concept-search`, over `ConceptIndex`) and `+` (`concept-add`) with a code and
  display draft. The first concept creates the default CodeSystem and sets `defaultCodeSystem`.
- The list rows are `nav-concept-<code>`, showing usage.

**Concept page** (`ConceptEditor`)

- Fields: code (read-only), display, definition, data type, concept type, unit, and storage
  resource and path.
- A Texts table with one row per designation (use, language, text) and an add button.
- Used by, with links to each node.
- Delete is disabled while the concept is used.

**Concept card** (`ConceptCard`)

- Shown in node properties for capture types, note, diagnosis, proposed diagnosis, and
  not_available.
- With a concept: code, display, editable Questionnaire text (q-display, with display as the
  placeholder), Hint, Help, "Shared by N nodes", and Edit in dictionary.
- Without one: a picker and "Create concept “<name>”".
- Picking a concept in the default CodeSystem sets the node name to its code. Picking one from
  another CodeSystem writes the `concept` override.

**App**

- The workspace shows `ConceptEditor` when a concept is open.
- "Edit in dictionary" opens the concept and switches the navigator to the dictionary tab.

**Not done in phase 2**

- The answer-row concept picker.
- The system selector for projects with several CodeSystems.
- `?concept=` URL state.

**Tests:** core 159, editor 95, e2e 136 (both browsers), including a new dictionary journey.

### Phase 3: activity YAML holds codes, not texts

**Rule and migration**

- `TEXT_NODE_TYPES` (capture types, note, diagnosis, proposed diagnosis, not_available) and
  `isTextNode` live in `node-types.ts`.
- `moveTextsToConcepts(project, activityIds?)` (`terminology/texts-to-concepts.ts`) moves the
  label, hint, and help of every text node and its answers into the concept the item stands
  for: its `concept`, else its `name` in the default CodeSystem.
  - The concept is created if missing. The default CodeSystem is
    `https://tricc.org/CodeSystem/<project id>`, set as `default_code_system`, and is created if
    missing.
  - A label becomes the display when the concept has none. Otherwise, if it differs, it becomes
    the q-display. Other languages work the same way through display designations.
  - When the concept already has a different text, the concept wins and the inline text is
    reported in `dropped`.
  - An item with no code (no name and no concept) keeps its inline text until it gets one, so
    nothing is lost.
  - `calculate` and `rhombus` are untouched.
- `readProject` runs the migration and marks the project
  `migratedFrom: 'concept-texts'`, so the first save writes both the activity files and the
  CodeSystem.
- The Navigator import runs the same migration on the imported pages.
- The encoder still writes inline texts that remain (items with no code). Migration is what
  removes them, so nothing is silently dropped on save.

**Editor**

- Node properties hide Label, Hint, and Help once the node has a concept. The concept card edits
  those texts.
- "Create concept" moves the node's label, hint, and help into the new concept.
- An answer row with a concept edits that concept's q-display, shared by every question that uses
  it. The display is the placeholder.

**Display**

- Canvas nodes and answer rows show the concept's q-display, falling back to display. They find
  the concept by name.
- CQL chips also find the concept by name.

**Validation**

- `node.missing-concept` (error): a named text node whose code matches no concept. Its fix kind
  is `concept.create`.

**Not done**

- The intervention context on the canvas; the canvas uses the default q-display.
- The `concept.migrated-collision` and `concept.inline-text-dropped` notices. `dropped` is
  returned, but there is no load-notice channel yet.
- The §2.6 `tricc_oo` fixture check (codes-only YAML through YamlStrategy). It will be sent with
  phase 4.

**Tests:** core 164, editor 97, e2e 136.

### Phase 4, frontend half: q-display per intervention

**Core** (`terminology/designation.ts`)

- `INTERVENTION_SCOPE_URL`, `designationInterventions()`, `scopeExtension()`.
- `conceptText(..., interventionId?)` prefers the designation scoped to that intervention, then
  the unscoped one. A scoped text never answers for another intervention, or for no intervention.

**Validation**

- `concept.unknown-intervention` (warning).
- `concept.duplicate-designation` (error): same use, language, and scope.

**Migration**

- A concept created by the migration takes its data type from the first node that uses it:
  select_one/select_multiple/not_available → coded, select_yesno → boolean, then integer,
  decimal, quantity, string, date. Answers are coded. This keeps `concept.no-datatype` quiet on
  migrated projects.

**Concept page**

- The Texts table has a "For" column: All interventions, or one intervention.
- A text the file scopes to several interventions shows read-only.
- Other extensions on a designation are kept.

**Not done**

- The canvas still shows the default q-display. There is no intervention context, as open
  question 3 allows.
- The `tricc_oo` half (§2.5, §2.6) was sent to the `tricc_oo` session on 2026-10-08.

**Tests:** core 167, editor 98, e2e 136.

### Phase 5, frontend: rich text as the `tricc_oo` message tree

**Core** (`text/message.ts`)

- The tree types, in the JSON interchange form: `message`, `text`, `interp`, `break`,
  `mark (strong|em|u)`, and `list` / `item`.
- `fromHtml` follows `tricc_oo` `text_injection.py` rule for rule. It needs no DOM.
- `fromPlain` handles `${}` tokens.
- `simplify` keeps a plain string when there is no structure.
- `toMarkdown` follows `tricc_oo` `serialize_injection_for_js_text`.
- Also: `toPlain`, `references`, and `messageFromJson`, which rejects malformed input.

**Storage**

- `withDesignationText` writes `value` as the Markdown. The tree goes in the
  `https://tricc.org/StructureDefinition/designation-message` extension (a JSON string), and
  only when the text has structure.
- `designationText` reads it back.
- `conceptRichText` returns the tree.
- `conceptText` now returns plain text, for the canvas, lists, and chips.
- `withConceptText` accepts a tree.
- The scope checks use `isUnscoped` (no intervention scope), so the message extension does not
  count as a scope.

**Draw.io**

- A structured shape label is kept as a transient `labelMessage`, never saved.
- The text migration makes its plain text the display, and the formatted tree the q-display.

**Parity**

- `text/__fixtures__/messages.json` was generated by `tricc_oo` itself: 18 HTML inputs, each with
  its tree and Markdown.
- `message.test.ts` checks the frontend against every entry. All pass.

**Validation**

- `text.unknown-reference` (error): a `${name}` that matches no node name and no CQL library
  define.

**Editor**

- `text/prosemirror.ts` converts between the tree and TipTap JSON, grouping leaf marks into
  wrappers. `**Give ${dose} mg**` stays one span.
- `RichTextField` is a plain input with a "Format" button. A text that already has structure
  opens straight in the formatted editor.
- `RichTextEditor` (TipTap 3 StarterKit) is reduced to bold, italic, underline, hard break, and
  both list kinds. It adds an `interp` atom (a chip) and "Insert data…" over question and
  calculation names.
- The editor is lazy-loaded, as its own chunk of about 128 kB gzipped.
- It is used for q-display, hint, and help on the concept card and on the concept page. Display
  stays plain.

**Not done**

- `text.injection-not-allowed`. A concept is never bound to calculate or rhombus by the
  migration, so there is nothing to check yet.

**Tests:** core 191, editor 107, adapters 73, e2e 138, including formatting with bold and an
inserted `${dose}` in both browsers.

### Revision 2026-10-09 (Patrick's review of the dictionary)

This replaces the phase 2 concept page and the inline concept card described above.

**Dictionary**

- The Data dictionary is a **table in the main area** (`DictionaryView`), not navigator rows and
  not a concept page.
- Columns: Code, Display, Questionnaire text (shown only when it differs from the display), and
  Used.
- Search (`concept-search`) and `+ Concept` (`concept-add`) sit in its header.
- The navigator's Data dictionary tab opens the view.

**Editing**

- All editing happens in **one modal**, `ConceptDialog`, from the dictionary or from a node.
- It works on a draft: Save (`concept-dialog-save`) stores it, Cancel (`concept-dialog-cancel`)
  or Escape discards it.
- Fields:
  - code (only when new), display (plain);
  - questionnaire text, hint, help (rich);
  - definition, data type, concept type, unit, storage;
  - a table for other languages and intervention-scoped texts;
  - Used by, with links;
  - Delete, only when unused.

**Node card**

- The card on a node is a short summary: code, display, questionnaire text, and "Shared by N".
- "Edit concept" (`concept-edit`) opens the dialog.
- "Create concept" opens the dialog prefilled from the node. On Save, the node's inline texts
  move to the concept.

**Rich text and concept types**

- Rich text is limited to questionnaire text, hint, and help. Display and definition are plain.
- **Concept type** is a list. It is the viewer preference `conceptTypes`, edited on the
  Preferences page as one type per line. The default list is the `tricc_oo` types:
  - the defaults `get_concept_type` assigns: Symptom-Finding, Question, Value, InteractSet,
    Diagnosis, Calculation, Misc;
  - the FHIR `concept_mapper` keys: Observation, Finding, Symptom, Sign, Vital, Test, Lab, LabSet,
    Drug, Medication, Treatment, Procedure, Intervention, Referral, Service, Encounter, Patient.
- A value outside the list is kept and shown.
- Concepts created by the text migration get the type `tricc_oo` would assign the node.

**Tests:** core 191, editor 107, adapters 73, e2e 140.

### Fixes and additions, 2026-10-09

- **Add a translation or intervention text.** In a project with one language and no
  interventions, the new row got the default language and no scope, counted as the main
  questionnaire text, and was hidden. The button seemed to do nothing.
  - The new row now takes the next unused project language, or an empty language the author
    types (with a datalist of project languages).
  - Save is disabled until every text has a language.
  - Rows added in the dialog always stay in the table.
- **Answers are concepts.** The answer list's "Add answer" is now `AnswerPicker`:
  - a concept search (`add-option-search`), excluding answers already on the question;
  - and "New answer" (`add-option-new`), which opens the concept dialog.
  - The option is added with `name` = concept code, plus a `concept:` override only when the
    concept is outside the default CodeSystem.
- **Default concept types** (`defaultConceptType` in core), used by the migration, by "Create
  concept" on a node, and by new answers:
  - questions: Observation;
  - select_one, select_yesno, and not_available answers: Value;
  - select_multiple answers: Observation;
  - diagnosis and proposed_diagnosis: Condition;
  - note: InteractSet.
- Condition was added to the default list, which now starts Observation, Value, Condition.

**Tests:** core 192, editor 108, adapters 73, e2e 140.

### Formatting in a modal, and font colour (2026-10-09)

**The Format modal**

- A plain text stays an input with a "Format…" button.
- A formatted text shows as a formatted preview (`MessageView`) with "Edit…".
- Either button opens the editor in its own large modal (`<testId>-modal`), with Save
  (`<testId>-modal-save`) and Cancel. Nothing changes until Save.
- Escape closes the modal only, never the concept dialog underneath.

**Font colour**

- A new mark: `{type:'mark', kind:'color', color:'#d32f2f', children}`. `color` must be a hex
  colour or a colour name; anything else is rejected when the JSON is read.
- Markdown renders it as `<span style="color:…">…</span>`, which ODK and CHT render.
- The editor uses TipTap `TextStyle` + `Color` (`@tiptap/extension-text-style`), mapped to and
  from the colour mark.
- The toolbar has a colour menu (Default, Red, Orange, Green, Blue, Grey) and a picker for any
  other colour.

**Not done**

- `fromHtml` still unwraps `font color` and `span style=color`, as `tricc_oo` does today. The
  `tricc_oo` spec §3.1 adds colour parsing on both sides, together with a regenerated parity
  fixture.

**Full width.** The app now uses the full browser width.

**Tests:** core 194, editor 109, adapters 73, e2e 140. One Firefox intervention test flaked once
under full parallel load; that spec passes 30/30 on its own.

### Insert data list (2026-10-09)

- Entries read `<code>: <display>`. The display is the concept's (else the node label), cut to
  the viewer preference **`labelChars`** with an ellipsis.
- `labelChars` is "Characters of a label in short lists" on the Preferences page: default 20,
  range 5–80.
- The answer-link caption on the canvas uses the same preference; it was the hard-coded 20
  before.

