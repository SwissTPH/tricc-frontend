# Prefilled data defined once per project (retrieval dictionary)

| Field             | Value                                                                                                                                                                                                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | Approved (2026-11-09, in conversation)                                                                                                                                                                                                                                                                                  |
| **Branch target** | `feature/project-retrievals` → `develop`                                                                                                                                                                                                                                                                                |
| **Scope**         | `@tricc/core` (project format, terminology, validation, migration), `@tricc/editor` (retrieval dictionary, CQL insertion, used by), `tricc_oo` (cross-repo)                                                                                                                                                             |
| **RFC**           | #31                                                                                                                                                                                                                                                                                                                     |
| **Related**       | Supersedes #16. Absorbs #26. Built with `../fix/20261109-populate-source-period.md` (#34), whose node `source` and `period` feed the migration. `20261014-calculate-dictionary-on-import.md` (the calculate dictionary this mirrors). #33 (Derived CodeSystem). Mirror: `tricc/feature/20261109-project-retrievals.md`. |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### The problem

Data that already exists before the consultation (the patient's age or sex, the weight measured
last week, a known condition, the facility) is drawn today as a "Prefilled value" node in each
activity. That has several problems:

- The node does not say exactly what it reads. Export guesses from the node name, so `age`, `dob`
  and `sex` work and anything else stays empty.
- The same retrieval ("weight in the last 30 days") is drawn again in every activity that needs it.
- Where the node sits in the flow means nothing: every export loads these values at the start of
  the form.
- An author who needs something the helpers do not cover has no clean way to write it.

### What changes for an author

- A project has a **retrieval dictionary**, next to the data dictionary and the calculate
  dictionary. Each entry has a code, a label and a definition of what to read:
  - **where**: patient, facility, practitioner, location, encounter, history, or custom
  - **what**: either a ready-made function (Age in months, Date of birth, Sex, Date of death,
    names, Photo, Phone…) or a concept from the data dictionary, read the way that concept is
    recorded
  - **how far back**, for encounter and history: a period such as 30 days
- Codes start with `#` (`#age_months`, `#prev_weight_30d`), so they never collide with a concept
  code.
- Logic uses them like any concept: `"#age_months" < 2` in a relevance or calculation. Nothing is
  drawn on the canvas.
- A retrieval is loaded only by forms that use it.
- Each entry shows where it is used, and expression fields offer the retrievals to insert.
- **Custom** retrievals hold one expression per export language (CQL, XLSForm). The expression
  can use `{{code}}` and `{{period}}`, filled from the entry's concept and period. An export with
  no expression for its language stops with a clear error instead of guessing.
- Existing "Prefilled value" nodes keep working. The inspector offers **Move to the retrieval
  dictionary** on each one, which creates the entry and rewrites references.

### Out of scope

- Questions prefilled from a retrieval but still shown and editable (a question's default).
- Labels for retrievals over a dictionary managed outside the project (#33).
- Repeat and flavour texts (#32).
- A calculate turned into a "derived retrieval" (decision 3).

---

## Part II — Technical specification

### 1. Storage

A project-local CodeSystem, found like the calculate dictionary
(`packages/core/src/terminology/dictionaries.ts`): the CodeSystem tagged with role `retrieve`
(`meta.tag` system `http://tricc.org/fhir/CodeSystem/codesystem-role`), then the one
`tricc.yaml` names in `retrieve_code_system` (url, id or name), then `<default id>-retrieve`. A new
one is `terminology/<default id>-retrieve.codesystem.json`, title "Retrievals". `Project` gains
`retrieveCodeSystem?: string`; `project.json` keeps `terminology.retrieve` for parity.

Each concept is one retrieval:

| CodeSystem element                           | Model (`Concept.retrieval`) | Meaning                                                                                                                      |
| -------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `code`                                       | —                           | `#` + a name (`#age_months`), `^#[a-z][a-z0-9_]*$`.                                                                          |
| `display` / designations                     | —                           | The label, translated like any concept.                                                                                      |
| property `context` (valueCode)               | `context`                   | `patient` \| `facility` \| `practitioner` \| `location` \| `encounter` \| `history` \| `custom`                              |
| property `function` (valueCode)              | `function`                  | Catalogue entry (§2). Missing: the context's default.                                                                        |
| property `reads` (valueCoding)               | `reads`                     | The concept read. Its `conceptType`, `dataType`, `targetResource`, `targetPath` decide the resource and value type.          |
| property `period` (valueString)              | `period`                    | ISO-8601 (`P30D`). `encounter`, `history` and `custom` only.                                                                 |
| `extension` `retrieve-expression` (repeated) | `expressions`               | `custom` only. `valueExpression` `{language, expression}`; `language` is `text/cql` or `text/x-xlsform`. Placeholders in §4. |

`reads`, not `source`: a concept already has a `source` property (provenance,
`ocl:/orgs/WHO/…`). The extension url is `http://tricc.org/fhir/StructureDefinition/retrieve-expression`.

### 2. Function catalogue

`packages/core/src/terminology/retrieval.ts`: `RETRIEVAL_FUNCTIONS`, entries
`{ code, contexts, needsSource, usesPeriod, valueType, label }`, shared by the editor, validation
and the mirror in tricc_oo.

- patient, no source: `AgeInDays`, `AgeInWeeks`, `AgeInMonths`, `AgeInYears` (integer),
  `DateOfBirth` (date), `Sex` (coded), `DeceasedDateTime` (dateTime), `FullName`, `FirstName`,
  `MiddleName`, `LastName`, `Telecom`, `Photo` (string; a photo is its attachment url)
- patient, with source: `PatientValue` (the source's `targetPath` on `Patient`). Default for
  `patient`.
- facility / practitioner / location: `FacilityValue` / `PractitionerValue` / `LocationValue`
  (source). Default.
- encounter / history: `Latest` (default, source's type), `Exists` (boolean), `Count` (integer),
  source and period.
- custom: no function; `expressions`, optional `reads` and `period`.

`Sex`, not `Gender`, as #16 decided.

### 3. References and use

- A `#code` is a quoted CQL identifier: `"#age_months"`. `expressionNames`
  (`packages/editor/src/cql/names.ts`) already lists every CodeSystem's concepts, so chips show the
  retrieval's label; the name gets `source: 'retrieval'`.
- `retrievalRefs(text)` finds `"#name"` tokens. `retrievalUsage(project, code)` lists the places an
  expression uses it: node `relevance`, `calculate`, `expression`, `constraint`, `default`, block
  `args`, edge conditions, intervention applicability. `retrievalsForIntervention(project, id)`
  lists the retrievals its activities (and the blocks they use) reach.
- Expression fields get **Insert a retrieval…** beside **Insert a setting…**.

### 4. Custom expressions

`{{code}}` is the `reads` concept code and `{{period}}` the entry's period. The export fills them
for its language: CQL writes the code as a quoted identifier and the period as a CQL quantity
(`P30D` → `30 days`); XLSForm writes the code as the field name and the period in days.

### 5. Populate nodes (legacy) and migration

`type: populate` stays readable and writable, with `source` and `period` (#34).
`tx.moveToRetrieval(activityId, nodeId)` (`packages/core/src/document/mutations.ts`):

1. Code `#<node name>`; an existing entry with the same definition is reused, a different one gets
   `#<name>_2`.
2. Entry from the node: `context`, `function` = the context default, `reads` = the node `source`
   (or, without one, the concept named like the node, as tricc_oo reads it today), `period`, and
   the node's label as display.
3. Every quoted `"<name>"` reference to the node, in every activity, becomes `"#<code>"`. Edges
   into and out of the node are joined, and the node is deleted.

### 6. Export (tricc_oo, mirror spec)

tricc_oo reads `retrieve_code_system` and emits one input per retrieval that is used:

- CQL / FHIR: one `define "#…"` per retrieval, from the catalogue mapping in `populate_helper.py`
- XLSForm / CHT / OpenSRP: a hidden calculate named `r_<name>`; `"#name"` references become
  `${r_<name>}`.

A strategy with no mapping for a function, or no expression for `custom`, fails with the
retrieval code and the strategy name.

### 7. Validation and errors

`packages/core/src/validate/project.ts`:

| Rule                                                                           | Severity |
| ------------------------------------------------------------------------------ | -------- |
| An expression uses `"#x"` and no retrieval has code `#x`                       | error    |
| A retrieval code without `#`, or a concept code with `#` in another dictionary | error    |
| `function` not allowed in the context, or `reads` missing when it needs one    | error    |
| `reads` names a concept the project does not have                              | error    |
| `period` not ISO-8601, or set on a context that ignores it                     | warning  |
| `custom` with no expression                                                    | error    |
| An unused retrieval                                                            | info     |

### 8. Tests

- Core: CodeSystem round trip of every property and the extension; dictionary lookup;
  `retrievalRefs`, `retrievalUsage`, `retrievalsForIntervention`; validation; migration (references
  rewritten, edges joined, entry reused).
- Editor: retrieval dictionary and entry editing, Insert a retrieval, Move to the retrieval
  dictionary (Vitest + one Playwright spec).
- tricc_oo: a YAML fixture with a retrieve CodeSystem; CQL and XLSForm output for one function of
  each kind and one `custom`.

### 9. Phases

1. Core: catalogue, `retrieveCodeSystem`, codec, usage, validation.
2. Editor: retrieval dictionary UI, entry editing, insertion, used by.
3. Migration of populate nodes.
4. tricc_oo: read the CodeSystem, export each strategy (mirror spec, separate PR).

---

## Open questions

None.

## Decisions

- 2026-11-09: Approved in conversation; #16 superseded, #26 folded in. (@delcroip)
- 2026-11-09: Custom expressions use the FHIR `Expression` shape (an extension with
  `valueExpression`), with `{{code}}` and `{{period}}` placeholders. (@delcroip)
- 2026-11-09: No derived retrievals; a calculate stays a calculate that references `#codes`.
  (@delcroip)
- 2026-11-09: The concept read is property `reads`, because `source` is already provenance.
- 2026-11-09: References stay quoted in CQL (`"#age_months"`), like every other name.
- 2026-11-09: The retrieval dictionary is offered only from itself in the concept dialog, and a
  dictionary with a role (calculate, retrieve) is never taken as the default one.

## Implementation notes

- Phases 1–3 (frontend): `terminology/retrieval.ts`, `retrieval-migration.ts`,
  `validate/retrievals.ts`, `Mutations.moveToRetrieval`; editor `RetrievalFields.tsx`,
  `PopulateFields.tsx`, `DictionaryView`, `CqlExpressionField`. Tests:
  `core/src/terminology/retrieval.test.ts`, `editor/src/terminology/retrievals.test.tsx`,
  `e2e/retrievals.spec.ts`.
- Phase 4 (tricc_oo): `tricc/feature/20261109-project-retrievals.md`, separate PR.
