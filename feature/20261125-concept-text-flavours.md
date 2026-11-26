# Flavours: several sets of texts for one concept

| Field             | Value                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**        | Draft. Frontend implemented on `feature/repeat-slot-texts`, not committed; `tricc_oo` to follow. Revises an earlier "texts per repeat slot" draft that was never published.                                                                                                                                                                                              |
| **Branch target** | `feature/repeat-slot-texts` → `develop`                                                                                                                                                                                                                                                                                                                                  |
| **Packages**      | `@tricc/core`, `@tricc/editor`, `tricc_oo`                                                                                                                                                                                                                                                                                                                               |
| **Related**       | `20261008-data-dictionary-and-concept-texts.md` (texts live on the concept; intervention-scoped q-display, which a flavour sits beside), `20261014-none-answer-repeat-instance.md` (`repeat` on every node, the main reason to need a flavour). **`tricc_oo`** must read `flavour` on a node and resolve the same texts: mirror into `../tricc_oo/feature/` on approval. |

---

## Part I — Business description

### The problem

A guideline often asks for the same thing more than once: a second temperature reading after
an antipyretic, or a repeat respiratory rate count. The author uses the same concept twice, so
both values mean "temperature". But a question's text belongs to its concept, so the health
worker reads "Temperature" both times.

The same need appears without a repeat. One concept can be asked in different ways in
different places: "Does the child have a fever?" at triage, "Has the fever come back?" at a
follow-up. Today the author has two poor choices:

- make a new concept (`temp_2`), so the value no longer counts as temperature;
- give up on keeping all texts and translations in the dictionary.

### The idea: flavours

A **flavour** is another set of texts for the same concept, with a short name: its own
questionnaire text, hint and help. Every concept has a **Default** flavour (the texts it has
today) and any number of other flavours, for example:

| Flavour      | Questionnaire text                     | Hint                 |
| ------------ | -------------------------------------- | -------------------- |
| _Default_    | Measure the temperature                | Axillary, in degrees |
| `second`     | Measure the temperature again          | _(the default one)_  |
| `after_dose` | Temperature one hour after paracetamol | Wait the full hour   |

A text a flavour leaves empty is the default flavour's. Each question says which flavour it
shows. The value, the concept and the data stay the same; only the words the health worker
reads change.

### What changes for an author

**In the concept editor**

- Right under the display ("The short name in the dictionary and in CQL"), a **Flavour**
  dropdown lists **Default** and the concept's other flavours, with a **+ New flavour** button
  beside it.
- The **Questionnaire text**, **Hint** and **Help** fields below it show and edit the texts of
  the selected flavour, each with its usual **Format…** popup. An empty field of a flavour shows,
  greyed out, the default text it falls back to.
- With a flavour other than Default selected, its name can be changed next to the dropdown,
  with how many questions show it and **Remove**.
- **+ New flavour** adds a flavour, prefilled with the default questionnaire text to reword.
- Save keeps every flavour's changes with the concept; Cancel drops them.
- Translations of a flavour are added like any other translation, in the table of other
  languages, with the flavour chosen in a **Flavour** column.

**In the node sidebar**

- Under the concept card, a **Flavour** dropdown lists _Default_ and the concept's flavours,
  each with the start of its questionnaire text. Picking one changes what the node shows on the
  canvas and in the form. Two buttons sit under it.
- **+ New flavour** opens the concept editor on a new flavour, prefilled with the text the node
  shows today, so the author only rewords it. On Save the node shows the new flavour.
- **Edit texts** opens the concept editor on the node's current flavour.

**Existing projects** keep their texts: a node with no flavour shows the default text, as
today.

**Checks, as information only**

- Two questions of the same concept, in different repeats, show the same text: pick a flavour
  for one of them.
- A flavour that no question uses.

**A warning**

- A question names a flavour its concept no longer has (removed in another copy, or by hand).
  It shows the default text until the author picks another.

### Out of scope

- Picking a flavour automatically from the repeat. The author picks it; a check points out
  repeats that still show the same text.
- Generated wording such as "{ordinal} measurement of …".

---

## Part II — Technical specification

### 1. Design

**Concept (CodeSystem file).** A flavour's text (questionnaire text, hint or help) is a
designation with a scope extension, like the intervention scope (`INTERVENTION_SCOPE_URL`). The
Default flavour is the designations without one, as today:

```json
{
  "language": "en",
  "use": { "system": "https://tricc.org/CodeSystem/designation-use", "code": "q-display" },
  "value": "Measure the temperature again",
  "extension": [
    { "url": "https://tricc.org/StructureDefinition/designation-flavour", "valueCode": "second" }
  ]
}
```

- One flavour per designation. A flavour exists when at least one designation names it; its
  name is its code (`[a-z0-9_]+`, unique within the concept).
- It combines with `designation-intervention`: a designation with both applies to that flavour
  in that intervention only.
- `Designation.extension` already round-trips as written (`model/types.ts`), so the
  CodeSystem codec needs no change.

**Node (activity YAML).** A new optional field, a code like `name`, so the activity file still
holds codes only:

```yaml
- id: t2
  type: decimal
  name: temp
  repeat: 2
  flavour: second
```

- `TriccNode.flavour?: string` (`model/types.ts`), `flavour: z.string().optional()` in the node
  schema (`format/schema/activity.ts`), `flavour: 'scalar'` in `format/node-fields.ts`.
- Allowed on nodes with a concept text (`TEXT_NODE_TYPES`). Not on options: an answer's text
  stays one per concept (open question 2).

**Resolution order** for a node with flavour `f` in intervention `i`, per use and language. The
first match wins:

1. flavour `f` and intervention `i`;
2. flavour `f`, no intervention;
3. intervention `i`, no flavour;
4. unscoped (the default);
5. for `q-display`: the display, by the same order without the flavour (as today).

A node without a flavour, or with a flavour its concept lacks, resolves from step 3.

**Core: `packages/core/src/terminology/designation.ts`**

- `FLAVOUR_SCOPE_URL`, `designationFlavour(d): string | undefined`,
  `flavourScopeExtension(code)`.
- `conceptFlavours(concept): string[]`: the flavour codes, in first-designation order.
- `TextScope = { interventionId?, flavour? }`, taken by `conceptText` / `conceptRichText` as
  their fifth argument (replacing the positional `interventionId`; only a test used it).
  Without `flavour`, flavour texts are never picked, so the dictionary, CQL chips and media
  are unchanged. Empty values are skipped, so an empty flavour text falls back.
- `withConceptText(concept, use, lang, value, defaultLang, scope?)`: edits the designation with
  exactly that scope. `withFlavour(d, code?)` sets or clears one designation's flavour.
- `isUnscoped(d)`: also false for a flavour designation, so `texts-to-concepts.ts`,
  `media/attach.ts` and the dialog's default fields only ever touch default texts.
- `renameFlavour(concept, from, to)` and `removeFlavour(concept, code)`: every language at once.

**Rename carried to nodes.** The concept editor tracks renames (current code → code when
opened) and, in the Save transaction, rewrites `flavour` on the nodes showing the old code
(`conceptUsage` gives the nodes). Removing a flavour leaves the nodes as they are; the warning
below finds them.

**Editor**

- `components/ui/select.tsx`: the shadcn/ui Select, on `@radix-ui/react-select` (new
  dependency of `@tricc/editor`). Its menu sits above the editor's modals (`z-[1400]`). Radix
  gives no item an empty value, so _Default_ is the value `:default`. The concept dialog's
  Escape handler leaves an open select menu to close itself. `SimpleSelect` wraps it for a
  list of `{ value, label }` options (option test ids `<id>-option-<value or none>`). Every
  select of the concept dialog uses it: Dictionary, Data type, Concept type, the Use /
  Intervention / Flavour columns of the texts table, and the retrieval fields.
  `apps/local` exempts `select-trigger` from its button font reset (`app.css`) and gives it
  the preflight slice the shadcn button has (`tailwind.css`). `vitest.setup.ts` stubs the
  pointer-capture and `scrollIntoView` methods jsdom lacks.
- `ConceptDialog.tsx`, right under the display's hint: a **Flavour** row. A Select
  (`concept-flavour`, its value also in `data-value`): _Default_, then each flavour. With a
  flavour selected: its name (`concept-flavour-name`; a name already taken is not
  accepted while typing), the questions showing it (`concept-flavour-uses`), Remove
  (`concept-flavour-remove`). Last, **+ New flavour** (`concept-flavour-add`).
- The Questionnaire text, Hint and Help fields (`concept-q-display`, `concept-hint`,
  `concept-help`, each a `RichTextField` with its Format… popup) edit the selected flavour's
  designation in the default language; their placeholder is the Default flavour's text. A
  flavour's emptied field keeps its row while editing; empty flavour rows are dropped on Save.
  Save is disabled for a bad flavour name or a flavour with no text at all
  (`concept-dialog-error`).
- `ConceptTarget` `{ key }` gains `flavour?` (open on it) and `newFlavour?: { code, text }`
  (add it, code made unique, questionnaire text prefilled). `onSaved(key, { flavour })`
  reports the code that added flavour ended with.
- Renames are tracked (code now → code when opened) and carried to the nodes in the Save
  transaction: `terminology/flavours.ts` (`carryFlavourRenames`, `flavourUses`,
  `uniqueFlavour`).
- The texts table ("Other languages, interventions and flavours") gets a **Flavour** column: a
  select of the concept's flavours, _Default text_ for none. The selected-language texts of every
  flavour are not repeated there; the fields show them.
- `ConceptCard.tsx`, under the card: a **Flavour** Select (`field-flavour`): _Default_, then each
  flavour as `code — start of text`. Under it, **+ New flavour** (`field-flavour-new`) and
  **Edit texts** (`field-flavour-edit`) both open the concept editor, on a new flavour (suggested `repeat_N` for a node in repeat
  N ≥ 2, else `flavour`; the node is set to it on Save) or on the node's flavour. Shown for
  text nodes with a concept.
- `canvas/elements.ts`: passes `{ flavour: node.flavour }` for the node's q-display, picture,
  hint and help, so the canvas shows the flavour's texts. A small badge on the node shows the
  flavour's code.
- CQL chips and the dictionary list keep using `display`.

**`tricc_oo`**

- YAML input reads `flavour` on a node.
- `concept_text` (`converters/datadictionnary.py`) takes the node's flavour and applies the same
  order. Until it does, `tricc_oo` ignores the node field and the unknown extension and shows the
  default text, which is today's output.

### 2. Validation and errors

- `node.unknown-flavour` (warning, `validate/activity.ts`): the node's flavour is not in its
  concept. Message: "This question shows the flavour "second", which "temp" does not have, so it
  shows the default text. Pick another flavour." The node's picker lists the missing flavour as
  "not in the concept", so picking Default or another flavour fixes it.
- `concept.repeat-text-same` (info, `validate/project.ts`, `validateFlavours`): two text nodes of one concept in
  different repeat slots resolve to the same questionnaire text in the default language. On the
  node in the higher slot. Message: "Repeat 2 of "temp" shows the same text as repeat 1. Pick or
  add a flavour for it."
- `concept.flavour-unused` (info): a flavour no node uses.
- `concept.flavour-code` (error): a flavour code that is not `[a-z0-9_]+` (`FLAVOUR_CODE`).
- `concept.duplicate-designation` (existing error): its key includes the flavour.

### 3. Tests

- `terminology.test.ts`: the resolution order with and without intervention; a missing flavour
  falls back; `withConceptText` adds, replaces and removes a flavour text without touching the
  default; `renameFlavour` / `removeFlavour` across languages; a CodeSystem with flavour and
  intervention extensions round-trips unchanged.
- Codec: a node with `flavour` round-trips through activity YAML; the schema rejects a
  non-string.
- `terminology.test.ts` ("flavours: other questionnaire texts of a concept"): each rule above
  fires and clears; `node-fields.test.ts` samples `flavour`.
- `integration.test.tsx` ("flavours: …"): picking a flavour in the node panel changes the canvas
  label and badge; **+ New flavour** opens the concept editor on a prefilled flavour whose
  questionnaire text and hint save, and sets the node; **Edit texts** opens it on the node's
  flavour and a rename carries the node; the dropdown switches the fields between flavours, Escape
  closes its menu and not the dialog, an
  empty flavour or a bad name blocks Save, Remove goes back to Default.
- e2e (`e2e/search.spec.ts`, "a repeated question shows a flavour of its concept text"): two
  `temp` questions, the second in repeat 2; **+ New flavour** from the node panel opens the concept
  on it, name it `second`, set its questionnaire text and hint, see both labels, reload, see
  both again.

### 4. Phases

1. Core: flavour extension helpers, `TextScope.flavour`, node field in model, schema and
   codec; tests. **Done.**
2. Editor: Flavour dropdown in the concept editor driving the questionnaire text, hint and
   help; Flavour column in the texts table. **Done.**
3. Editor: flavour picker under the concept card, canvas text and badge. **Done.**
4. Validation rules; rename carried to nodes. **Done.**
5. e2e test. **Done.**
6. `tricc_oo`: read `flavour`, resolve it in `concept_text` (in that repo).

---

## Open questions

1. **Flavour name: code only, or code and a label?** A code (`second`) is enough to pick from,
   since the picker also shows the start of the text. Recommendation: code only; add a label
   later if lists get long.
2. **Flavours on answers.** An answer may need another wording in one place too.
   Recommendation: not now; answers keep one text per concept.
3. **Suggest a flavour from the repeat.** When a node is set to repeat 2, preselect a flavour?
   Recommendation: no automatic link; the `concept.repeat-text-same` check is enough.
4. **Removing a flavour that nodes use.** Block it, or allow it and warn on the nodes?
   Recommendation: allow, after the editor shows how many questions use it; the nodes then get
   `node.unknown-flavour`.
