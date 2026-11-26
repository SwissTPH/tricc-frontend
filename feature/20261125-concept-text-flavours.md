# Texts per repeat slot for a repeated concept

| Field             | Value                                                                                                                                                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | Draft (frontend implemented on `feature/repeat-slot-texts`, not committed; `tricc_oo` to follow)                                                                                                                                                                                                |
| **Branch target** | `feature/repeat-slot-texts` → `develop`                                                                                                                                                                                                                                                         |
| **Packages**      | `@tricc/core`, `@tricc/editor`, `tricc_oo`                                                                                                                                                                                                                                                      |
| **Related**       | `20261008-data-dictionary-and-concept-texts.md` (texts live on the concept; intervention-scoped q-display, which this mirrors), `20261014-none-answer-repeat-instance.md` (`repeat` on every node). **`tricc_oo`** must resolve the same texts: mirror into `../tricc_oo/feature/` on approval. |

---

## Part I — Business description

### The problem

A guideline often asks for the same thing more than once: a second temperature reading after
an antipyretic, or a repeat respiratory rate count. The author repeats the concept and puts
the second question in repeat slot 2. The data is right: both values are "temperature", kept
apart by slot.

The text is wrong. A question's text belongs to its concept in the data dictionary, and both
questions use the same concept, so the health worker reads "Temperature" twice. The author
cannot write "Second temperature measurement" without one of these workarounds:

- making a new concept (`temp_2`), so the second value no longer counts as temperature;
- giving up on keeping all texts and translations in the dictionary.

### What changes for an author

- On a question in repeat slot 2 or higher, the concept card shows **Repeat N:** with the text
  that slot shows, or "same text as the first time" when it has none of its own. A button
  **Add text for repeat N** (or **Edit text for repeat N**) opens the concept with a row for
  that repeat, prefilled with the current text to reword. Cancel discards the row.
- In the concept editor, every text has a **Repeat** field next to the intervention. Empty
  means every repeat.
- In the data dictionary, a concept page lists its repeat texts next to its intervention
  texts, in every language. They are translated like any other text.
- A text can also be for one repeat in one intervention only, for example a shorter wording
  for the second reading in the community intervention.
- Slot 1, and every question that is not repeated, keep the text they have today. Existing
  projects show the same texts as before.
- When two slots of a concept show the same text, the app says so, as information only, so
  authors can find the questions that still need their own wording.

### Out of scope

- Generated wording such as "{ordinal} measurement of …". Ordinals do not translate well, and
  authors usually want their own wording per slot.
- A shortcut for hints and help per slot on the concept card. They resolve per slot already
  and can be set in the concept editor's Repeat field; the card offers the questionnaire text
  only (see open question 3).
- Changing what `repeat` and `instance` mean.

---

## Part II — Technical specification

### 1. Design

**File format.** A concept designation can already carry the extension
`https://tricc.org/StructureDefinition/designation-intervention` (`INTERVENTION_SCOPE_URL`). A
second extension scopes it to repeat slots:

```json
{
  "language": "en",
  "use": { "system": "https://tricc.org/CodeSystem/designation-use", "code": "q-display" },
  "value": "Second temperature measurement",
  "extension": [
    { "url": "https://tricc.org/StructureDefinition/designation-repeat", "valueInteger": 2 }
  ]
}
```

- Several `designation-repeat` extensions on one designation scope it to several slots.
- It combines with `designation-intervention`: a designation with both matches only that slot
  in that intervention.
- Activity YAML is unchanged. It still holds codes only. The slot of a node is
  `node.repeat ?? 1`.
- `Designation.extension` already round-trips as written (`model/types.ts`), so the codec needs
  no change. A test pins it.

**Resolution order** for a node in slot `s` in intervention `i`, per use and language. The
first match wins:

1. scoped to slot `s` and intervention `i`;
2. scoped to slot `s`, no intervention;
3. scoped to intervention `i`, no slot;
4. unscoped;
5. for `q-display`: the display, by the same order (as today).

Slot 1 has no slot-scoped designation by default, so it resolves as today.

**Core: `packages/core/src/terminology/designation.ts`**

- `REPEAT_SCOPE_URL` and `designationRepeats(d): number[]`, like `designationInterventions`.
- `repeatScopeExtension(slots)`: writes the repeat scope, as `scopeExtension(interventionIds)`
  writes the intervention one.
- `TextScope = { interventionId?, repeat? }`. `conceptText` / `conceptRichText` take it as
  their fifth argument in place of the positional `interventionId` (only a test used that).
  Without `repeat`, slot-scoped texts are never picked, so callers that show the concept
  itself (dictionary, CQL chips, media) are unchanged. A slot below 1 has no texts of its own.
  An empty designation value is skipped, so an empty slot text falls back.
- `withConceptText(concept, use, lang, value, defaultLang, scope?)`: edits the designation with
  exactly that scope (`hasScope`), adding it with the scope extensions or removing it.
- `isUnscoped` now also excludes slot-scoped designations, so `texts-to-concepts.ts`,
  `media/attach.ts` and the dialog's main fields keep working on unscoped texts only.

**Editor**

- `canvas/elements.ts`: passes `{ repeat: node.repeat ?? 1 }` for the node's q-display, picture,
  hint and help, so slot 2 shows its own text on the canvas.
- `ConceptCard.tsx`: when `node.repeat >= 2`, shows the slot's text and a button opening the
  dialog with `{ key, repeat }`.
- `ConceptDialog.tsx`: `ConceptTarget` gains `repeat?`; `withRepeatRow` appends a q-display row
  for that slot in the default language when it has none, prefilled with the text the slot
  shows today. The texts table gets a **Repeat** number input per row (`concept-text-N-repeat`,
  empty = every repeat; a row with several slots shows them read-only). Heading and add button
  now say "repeats".
- CQL chips and the dictionary list keep using `display`, which has no slot. A repeat changes
  the questionnaire text only.

**`tricc_oo`**

- `concept_text` (`converters/datadictionnary.py`) takes the node's repeat slot and applies the
  same order. Until it does, `tricc_oo` ignores the unknown extension and uses the default text,
  which is today's output.

### 2. Validation and errors

All in `validate/project.ts` (`validateRepeatTexts`), since a concept's slots span activities:

- `concept.repeat-text-same` (info): a text node (`TEXT_NODE_TYPES`) in slot N ≥ 2 resolves to
  the same q-display, in the default language, as the lowest slot of the same concept. Located
  on the first node in slot N. Message: "Repeat 2 of "temp" shows the same text as repeat 1.
  Give it its own wording in the concept, for example "Second measurement"."
- `concept.repeat-text-unused` (info): a slot-scoped designation for a slot no node of that
  concept uses. It is kept, not deleted.
- `concept.duplicate-designation` (existing error): its key now includes the repeat slots, so a
  slot-2 text and an unscoped text of the same use and language are not duplicates.
- No errors: a missing slot text always has a fallback.

### 3. Tests

- `terminology.test.ts` ("questionnaire text per repeat slot"): the five-step order, with and without intervention; several slots on
  one designation; `isUnscoped` ignores slot-scoped designations; `withConceptText` adds,
  replaces and removes a slot-scoped designation without touching the unscoped one.
- Codec round-trip (same file): a CodeSystem with `designation-repeat` and `designation-intervention`
  extensions is written back unchanged.
- Same file: `concept.repeat-text-same` fires for two slots with one text and not once slot 2
  has its own; `concept.repeat-text-unused` and the slot-aware `concept.duplicate-designation`.
- `integration.test.tsx` ("questionnaire text per repeat slot"): the slot-1 and slot-2 nodes
  show their own canvas labels and card text; the card button adds a slot-2 row that saves
  with the `designation-repeat` extension.
- e2e (`e2e/search.spec.ts`, "a repeated question shows its own text for its repeat"): repeat
  a question, add slot 2's text from the concept card, see both labels, reload, see both again.

### 4. Phases

1. Core: extension helpers, resolution order, `withConceptText` scope, tests. **Done.**
2. Editor: canvas label, concept card, dialog repeat field. **Done.**
3. Validation messages. **Done.**
4. e2e test. **Done.**
5. `tricc_oo` `concept_text` (in that repo).

### 5. Known limits

- Saving the prefilled row unchanged stores a slot text equal to the default; the
  `concept.repeat-text-same` message then stays. Dropping an unchanged prefilled row on save
  is a possible follow-up.
- The dictionary page does not group texts by scope; the scope shows in the texts table.

---

## Open questions

Points 2 and 3 are built as recommended, provisionally.

1. **Scope by slot number, or by activity and slot?** A slot number means the same thing
   wherever the concept is used. If slot 2 of `temp` means "after antipyretic" in one activity
   and "on day 3" in another, the scope must also name the activity. Recommendation: slot only,
   until a guideline needs more; the extension can gain an activity later without breaking files.
2. **`repeat: -1` ("collect it here only")**: does it get its own text? Recommendation: no, it
   uses the default text; it is not a numbered slot.
3. **Hint and help per slot**: same scope, same order. Recommendation: allow it in core from
   the start (the order is per use) but show only the questionnaire text field in the card
   until authors ask.
4. **Goto and block repeats**: a whole activity run again (goto, activity start, block with
   `repeat`) puts all its questions in slot N. Should their slot texts apply there too?
   Recommendation: yes, the slot is the slot whatever repeated it; confirm with `tricc_oo` that
   it knows the slot of each node in that case.
