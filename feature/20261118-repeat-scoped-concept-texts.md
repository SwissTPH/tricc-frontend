# Repeat-scoped concept texts

| Field             | Value                                                                                                                                                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | Draft                                                                                                                                                                                                                                                                              |
| **Branch target** | `feature/repeat-scoped-concept-texts` → `develop`                                                                                                                                                                                                                                  |
| **Packages**      | `@tricc/core`, `@tricc/editor`, `tricc_oo`                                                                                                                                                                                                                                         |
| **Related**       | `20261008-data-dictionary-and-concept-texts.md` (texts live on the concept; intervention-scoped q-display, which this extends), `20261014-none-answer-repeat-instance.md` (repeat and instance fields), `tricc_oo` `concept_text` and "Concept repeat" in `docs/tricc-elements.md` |
| **tricc_oo**      | `concept_text` must resolve repeat-scoped designations the same way: mirror into `../tricc_oo/feature/` on approval                                                                                                                                                                |

---

## Part I — Business description

### The problem

A guideline sometimes measures the same thing twice. For example, systolic blood pressure is
taken, the patient rests, and it is taken again. Both readings are the same concept (same code,
same meaning in the data). TRICC handles this with **Repeat**: the second question is repeat 2,
stored in its own slot.

The text a health worker reads comes from the concept in the data dictionary. A concept has one
questionnaire text per language (optionally one per intervention). So both questions show
"Systolic blood pressure". The health worker cannot tell which reading they are entering, and
may enter the first value twice or swap them.

Today the author can only:

- live with identical texts, or
- create a second concept (`sbp_2`), which breaks the "same concept" meaning for data, reports
  and expressions.

### What changes for an author

- A concept can have a questionnaire text **for a specific repeat**: "Systolic blood pressure –
  first measurement" for repeat 1, "Systolic blood pressure – second measurement" for repeat 2.
  It is still one concept with one code.
- In the node's Details, the concept card shows a **Text for repeat n** field when the node's
  repeat is not 1, or when the same concept is asked in more than one repeat in the activity.
  Empty means "use the concept's normal questionnaire text".
- In the data dictionary, a concept's Texts table gets a **Repeat** column next to
  **Interventions**, so the per-repeat texts can be written and translated like any other text.
- The canvas shows each node with its own text, so the drawing reads correctly.
- A **warning** appears when the same concept is asked in two repeats of one activity with the
  same text: "give each repeat its own text so the health worker can tell them apart".
- The exported forms (via `tricc_oo`) show the per-repeat texts.

Nothing changes for concepts that have no per-repeat text. The activity files do not change:
a node still says only which concept and which repeat.

### Out of scope

- **Instance.** An instance is the same collection reached at several points: it is asked once,
  so only one text is ever shown.
- Generating "first"/"second" automatically. Ordinals differ by language and grammar; authors
  write each text, as they do for translations.
- Per-repeat hint, help and display. Only the questionnaire text is scoped (see Open question 2).
- Per-node text overrides in the activity file. The codes-only rule
  (`20261008-data-dictionary-and-concept-texts.md` §2.0) stays.

---

## Part II — Technical specification

### 1. Design

**Format.** A designation can carry a repeat scope as a FHIR extension, next to the existing
intervention scope (`INTERVENTION_SCOPE_URL`):

```yaml
# CodeSystem concept sbp
display: Systolic BP
designation:
  - use: { system: https://tricc.org/CodeSystem/designation-use, code: q-display }
    language: en
    value: Systolic blood pressure
  - use: { system: https://tricc.org/CodeSystem/designation-use, code: q-display }
    language: en
    value: Systolic blood pressure – first measurement
    extension:
      - { url: https://tricc.org/StructureDefinition/designation-repeat, valueInteger: 1 }
  - use: { system: https://tricc.org/CodeSystem/designation-use, code: q-display }
    language: en
    value: Systolic blood pressure – second measurement
    extension:
      - { url: https://tricc.org/StructureDefinition/designation-repeat, valueInteger: 2 }
```

A designation may carry both scopes (intervention + repeat). At most one repeat extension per
designation. No codec change: `Designation.extension` already round-trips as written.

**Core — `packages/core/src/terminology/designation.ts`**

- `REPEAT_SCOPE_URL = 'https://tricc.org/StructureDefinition/designation-repeat'`.
- `designationRepeat(d): number | undefined`.
- `isUnscoped(d)` becomes "no intervention scope **and** no repeat scope", so a repeat text never
  replaces the default text. Add `isInterventionUnscoped` where the current meaning is needed.
- `scopeExtension(interventionIds, repeat?)` builds both; callers that rewrite a designation's
  scope (`ConceptDialog.tsx` ~l.507) keep the other scope and any unknown extensions instead of
  replacing `extension` wholesale.
- `conceptText` / `conceptRichText` take an options object for the scope
  (`{ interventionId?, repeat? }`), replacing the positional `interventionId`. Lookup for
  `q-display`, per language:
  1. intervention + repeat
  2. repeat
  3. intervention
  4. unscoped q-display
  5. display (existing fallback)

  `repeat` undefined or 1 looks up repeat 1 first, then falls through, so a concept with a repeat-1
  text but a node with no repeat set still gets it.

- `withConceptText(concept, use, lang, value, defaultLang, scope?)` sets or clears the scoped
  designation.

**Editor**

- `activity/canvas/elements.ts` (~l.197–209), `ActivityEditor.tsx` (~l.1106),
  `terminology/ConceptCard.tsx` (~l.111): pass `{ repeat: node.repeat }`.
- `ConceptCard.tsx`: a **Text for repeat n** rich-text field under the questionnaire text, shown
  when `node.repeat` is not 1 or the concept appears in more than one repeat slot in the activity
  (from `conceptUsage`). Placeholder: the resolved fallback text.
- `ConceptDialog.tsx` Texts table: a **Repeat** column (number, empty = all repeats) beside
  Interventions; the row key becomes (use, language, interventions, repeat).
- `DictionaryView.tsx`: unchanged (shows the unscoped text).
- `ConceptUse` (`terminology/usage.ts`) gains `repeat`, so "Used by" lists "repeat 2".

### 2. Validation and errors

In `validate/activity.ts`, next to `node.duplicate-name` (which already groups by
`(name, repeat slot)`):

- `concept.repeat-same-text` (warning): two or more nodes of one activity resolve to the same
  concept in different repeat slots, and their resolved q-display (default language, no
  intervention) is identical. Message: _"`sbp` is asked in repeat 1 and 2 with the same text.
  Give each repeat its own text so the health worker can tell them apart."_ Attached to each
  node, field `concept`.
- `concept.repeat-text-unused` (info): a concept has a text for repeat n but no node uses the
  concept with repeat n. Dictionary-level, so it does not block anything.

### 3. Tests

- `designation.ts`: lookup order for every combination of scopes; `isUnscoped` with a repeat
  extension; `withConceptText` adds, updates and clears a repeat text without touching the
  unscoped one or unknown extensions; round-trip of a CodeSystem with repeat extensions.
- `validate.test.ts`: `concept.repeat-same-text` raised for same text, not raised once one slot
  has its own text, not raised for instance-only reuse.
- Editor integration: setting a repeat text on a repeat-2 node changes its canvas text and leaves
  the repeat-1 node's text alone.
- `tricc_oo`: conformance fixture with a concept asked in repeats 1 and 2, checking the two
  exported labels.

### 4. Phases

1. Core: scope helpers, resolver, setter, tests.
2. Editor: call sites, concept card field, Texts table column, usage.
3. Validation rules.
4. `tricc_oo`: `concept_text` reads the repeat scope; conformance fixture.

---

## Open questions

1. **Repeat `-1`** ("collect here only, inherit nothing"). Recommendation: treat `-1` as its own
   scope key (`valueInteger: -1`), falling back to the unscoped text like any other repeat.
2. **Hint and help per repeat.** Recommendation: allow the same scope on hint and help in the
   resolver (it costs nothing), but show only the questionnaire-text field in the concept card for
   now.
3. **Repeat on an activity or goto.** When a whole activity is repeated, its nodes' slots come
   from the activity, not the node. Recommendation: the resolver uses the node's own repeat only
   in this RFC; inheriting the activity's repeat follows if authors ask for it, together with
   `tricc_oo`.
4. **Extension URL.** Recommendation: `https://tricc.org/StructureDefinition/designation-repeat`,
   alongside `designation-intervention`. To confirm with the `tricc_oo` side.
