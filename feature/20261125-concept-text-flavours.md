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

- Code and **display name** stay at the top, each with a one-line hint. Under them, **tabs**:
  - **Details**: data type, concept type, unit, definition, and where the value is
    stored (resource and path); for a retrieval, what it reads.
  - **Texts and flavours**: on the left, the flavours as vertical tabs; on the right, the texts
    of the selected one. The dialog opens on this tab, where an author mostly works; a
    retrieval, which has no texts, has no such tab and opens on Details.
  - **Translations**, in the Data dictionary only (below).
- The flavour tabs: **+ New flavour** first, then **Default**, then one per flavour. Each tab
  shows only the flavour's name and its questionnaire text, cut to one line; the selected tab
  is highlighted.
- On the right, under a heading ("Default texts", "Texts of the flavour “second”"), the
  **Questionnaire text**, **Hint** and **Help** of the selected flavour, labels above the
  fields, each with its usual **Format…** popup. An empty field of a flavour shows, greyed out,
  the default text it falls back to.
- For a flavour other than Default, the **Flavour name** comes first, with **Remove flavour**
  and how many questions show it.
- **+ New flavour** adds a flavour, prefilled with the default questionnaire text to reword.
- Save keeps every flavour's changes with the concept; Cancel drops them.
- Translations belong to the **Data dictionary**: the people drawing are usually not the
  ones translating. Opened from the Data dictionary tab, the concept editor has a
  **Translations** tab with a table of texts (language, intervention and, when the concept
  has flavours, flavour of each text). Opened from a node on the canvas, it shows the default
  language only, and keeps the other texts as they are on Save.

**Keyboard**

- **Ctrl+M** with one node selected on the canvas opens its concept in the concept editor (or,
  for a node without a concept, the dialog to create it). The panel opens on the node's
  details if it was collapsed or on another tab. The Ctrl+K palette lists it as "Edit the
  concept of the selected node". Ctrl only, also on a Mac, where Cmd+M minimises the window.

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
  Intervention / Flavour columns of the translations table, and the retrieval fields.
  `apps/local` exempts `select-trigger` from its button font reset (`app.css`) and gives it
  the preflight slice the shadcn button has (`tailwind.css`). `vitest.setup.ts` stubs the
  pointer-capture and `scrollIntoView` methods jsdom lacks.
- `components/ui/tabs.tsx`: shadcn/ui Tabs, on `@radix-ui/react-tabs` (new dependency of
  `@tricc/editor`). `apps/local` treats `tabs-trigger` like `select-trigger` (font reset
  exemption, preflight slice).
- `ConceptDialog.tsx`: Dictionary (new concepts), Code, Display, then `Tabs`
  (`tricc-concept__tabs`, sharing the form's label column through `subgrid`; inactive panels
  hidden). Triggers `concept-tab-basic`, `concept-tab-flavours` (not for a retrieval; it shows
  the number of flavours with Default) and `concept-tab-translations` (with `translations`
  only). Details (`concept-tab-basic`): Data type, Concept type, Unit, Definition, then "Where
  the value is stored" (Resource, Path), or the retrieval fields. It opens on Texts and
  flavours (`concept-tab-flavours`), or on Details for a retrieval. Texts and flavours:
  a two-column pane (`tricc-flavour-pane`) under the tab bar, which has a rule under it
  (`tricc-concept__tabbar`). Left, a shaded sidebar running the panel's full height, holding a
  vertical tab list (`role="tablist"`,
  `aria-orientation="vertical"`, `concept-flavour` with the selected code in `data-value`):
  **+ New flavour** (`concept-flavour-add`), then tabs `concept-flavour-tab-default` and
  `concept-flavour-tab-N` (`aria-selected`), each the name and the questionnaire text on one
  line with an ellipsis (the whole text in its tooltip). Right, the `tabpanel`, a stack with
  the labels above the fields: heading, then for a flavour its name (`concept-flavour-name`; a
  name already taken is not accepted while typing), Remove flavour (`concept-flavour-remove`)
  and the questions showing it (`concept-flavour-uses`). Under 700px the list sits above the
  texts. The node sidebar keeps a Select, where space is short.
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
- `ConceptDialog` takes `translations?: boolean`; only `DictionaryView` sets it. Then the
  dialog has a **Translations** tab with the table (`concept-texts`, rows
  `concept-text-N-*`, **Add a translation, an intervention or a flavour text**
  `concept-text-add`): use, language, intervention, flavour (when the concept has flavours)
  and text per row; texts the fields above show are not repeated in it. Without it (from a
  node's concept card, from an answer), the table is not rendered, and the designations it
  would show stay in the draft untouched and are written back on Save.
- `ConceptCard.tsx`, under the card: a **Flavour** Select (`field-flavour`): _Default_, then each
  flavour as `code — start of text`. Under it, **+ New flavour** (`field-flavour-new`) and
  **Edit texts** (`field-flavour-edit`) both open the concept editor, on a new flavour (suggested `repeat_N` for a node in repeat
  N ≥ 2, else `flavour`; the node is set to it on Save) or on the node's flavour. Shown for
  text nodes with a concept.
- `canvas/elements.ts`: passes `{ flavour: node.flavour }` for the node's q-display, picture,
  hint and help, so the canvas shows the flavour's texts. A small badge on the node shows the
  flavour's code.
- CQL chips and the dictionary list keep using `display`.

**Ctrl+M** (`ActivityEditor.tsx`): with one node selected whose type has a concept card
(`CONCEPT_NODE_TYPES`), a capturing `keydown` listener on Ctrl+M (not Cmd, not with a dialog
open) expands the side panel, selects Details and sets `conceptRequested`; `NodeProperties`
passes it to `ConceptCard` (`openRequested` / `onOpened`), which opens its dialog on the
concept, or on a new concept from the node, and clears the request so a later remount does not
reopen it. Registered as the palette command `node.concept` (group Edit, shortcut Ctrl+M) while
such a node is selected. Tested in `integration.test.tsx` ("Ctrl+M opens the concept of the
selected node") and at the end of the e2e flavour journey.

**`tricc_oo`**

- YAML input reads `flavour` on a node.
- `concept_text` (`converters/datadictionnary.py`) takes the node's flavour and applies the same
  order. Until it does, `tricc_oo` ignores the node field and the unknown extension and shows the
  default text, which is today's output.

**Dialog wording and layout**

- Type scale: 14px text, 13px labels and section headings, 12px hints under their field; fields
  10px apart, labels level with the middle of their field; every text field 36px high.
- Hints: Code (new concept) "The name expressions use for this value. It cannot be changed
  later."; Display name "A short name, shown in the dictionary, in lists and in expressions.";
  empty Hint and Help say what they are for; Unit, Definition, Resource and Path show an
  example.
- "Not set" instead of "—" in Data type and Concept type. Destructive actions next to fields
  (Remove flavour, Remove a text) are outline buttons in red text; Delete concept stays solid.
- Used by and Where the value is stored are sections with a rule above; the actions bar sticks
  to the bottom of the dialog with a rule above it.

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
- `integration.test.tsx`: from the Data dictionary a translation row and an intervention text
  are added and saved; from a node's concept card the table is absent, and a French text and an
  intervention text are kept unchanged when the concept is saved.
- e2e (`e2e/search.spec.ts`, "a repeated question shows a flavour of its concept text"): two
  `temp` questions, the second in repeat 2; **+ New flavour** from the node panel opens the concept
  on it, name it `second`, set its questionnaire text and hint, see both labels, reload, see
  both again.

### 4. Phases

1. Core: flavour extension helpers, `TextScope.flavour`, node field in model, schema and
   codec; tests. **Done.**
2. Editor: Flavour dropdown in the concept editor driving the questionnaire text, hint and
   help; translations table in the Data dictionary only. **Done.**
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
