# Terminology — concept and CodeSystem authoring

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_frontend` — `@tricc/core` (model, index, usages), `@tricc/editor` (UI) |
| **Related** | `20260825-project-format.md` (§2 terminology block), `20260825-cql-authoring.md` (concept picker and chips), `../../tricc_oo/tricc_oo/models/ocl.py` |
| **Approval** | — |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### What this is

The project's dictionary of clinical concepts: fever, weight, severe dehydration, amoxicillin.
Every question, calculation and diagnosis in a guideline points at one, which is what lets the
same guideline export to a FHIR CodeSystem, an ODK form and a DHIS2 dataset and still mean the
same thing.

### The dictionary lives in the project

Concepts are stored in the project folder as a FHIR **CodeSystem** — a standard, tool-neutral
format that `tricc_oo` already reads. It is a normal file in your project, versioned in git
alongside the activities.

This is a deliberate choice over resolving concepts from a terminology server at conversion time:

- A guideline converts identically today and in five years, whether or not a server is up.
- The exact concepts a guideline was authored against are recorded, not merely referenced. A
  server-side edit cannot silently change what your guideline means.
- Workshops happen without connectivity.
- Reviewers see concept changes in the diff.

### Pulling from OpenConceptLab, later

Authoring every concept by hand is not the goal — most should come from an established
dictionary. On-demand OpenConceptLab search and import is planned, and the design keeps room for
it: an imported concept records where it came from and at what version, so it can be refreshed
deliberately later.

For v1, concepts are created and edited in the tool, and the local copy is always what travels
with the project.

### Concept pages

Every concept has a page: what it is, its code and system, its data type, and — most usefully —
everywhere in the guideline it is used. Before changing or removing a concept you can see what
depends on it. This is what the **(i)** button in the CQL editor opens.

---

## Part II — Technical specification

### 1. Storage

FHIR R4 `CodeSystem` at `terminology/<id>.codesystem.json`. Standard resource, no private
extensions to the resource shape; TRICC-specific attributes go in `concept.property`, which is
the mechanism FHIR provides.

```jsonc
{
  "resourceType": "CodeSystem",
  "id": "tricc",
  "url": "http://tricc.org/CodeSystem/tricc",
  "version": "0.3.0",
  "name": "TriccConcepts",
  "status": "draft",
  "content": "complete",
  "caseSensitive": true,
  "property": [
    { "code": "dataType",    "type": "code",   "description": "boolean|integer|decimal|string|date|coded|quantity" },
    { "code": "conceptType", "type": "code",   "description": "TRICC concept type (drives FHIR resource mapping)" },
    { "code": "unit",        "type": "string" },
    { "code": "source",      "type": "string", "description": "Provenance, e.g. ocl:/orgs/WHO/sources/ICD-11/" },
    { "code": "sourceVersion", "type": "string" }
  ],
  "concept": [
    {
      "code": "weight",
      "display": "Weight",
      "definition": "Body weight measured at this encounter",
      "designation": [
        { "language": "fr", "value": "Poids" }
      ],
      "property": [
        { "code": "dataType",    "valueCode": "decimal" },
        { "code": "conceptType", "valueCode": "Observation" },
        { "code": "unit",        "valueString": "kg" }
      ]
    }
  ]
}
```

- **Multilingual displays** use FHIR `designation`, not a private field. `display` carries the
  project default language.
- **`conceptType`** drives FHIR resource mapping downstream
  (`../../tricc_oo/feature/20260813-concepttype-structuremap.md`): `Observation`, `Condition`,
  `MedicationRequest`, and so on. The permitted set is read from `tricc_oo`'s mapper rather than
  duplicated as a literal list, so the two cannot drift.
- **`targetResource` / `targetPath`** (§1.1) locate concepts that correspond to a named element of
  another resource.
- **`source`/`sourceVersion`** are populated by import and left empty for locally authored
  concepts. They exist from v1 so OCL sync has somewhere to land without a format migration.

A project may hold several CodeSystems (a local one plus imported subsets of SNOMED CT, LOINC,
ICD-11). All are listed in `project.json`.

#### 1.1 Where an answer lands

Persistence is a property of the **concept**, never of the node that captures it.

For most concepts nothing needs saying: `conceptType` already decides that a vital becomes an
Observation and a classification becomes a Condition. The exception is a concept that corresponds
to a **named element of another resource** — a date of birth is not an observation about a patient,
it is `Patient.birthDate`. Two optional properties cover that case:

```jsonc
{
  "code": "date_of_birth",
  "display": "Date of birth",
  "property": [
    { "code": "conceptType",    "valueCode":   "patient" },
    { "code": "targetResource", "valueCode":   "Patient" },
    { "code": "targetPath",     "valueString": "birthDate" }
  ]
}
```

- `targetPath` uses **FHIR element names**, not TRICC names — `birthDate`, not `date_of_birth`.
  The concept keeps whatever code the project uses; the path is the FHIR contract.
- Both or neither: a path without a resource is a validation error.
- Absent means the `conceptType` default, which is the case for the overwhelming majority.

The same declaration serves reading and writing: `tricc_oo` generates `GetPatientValue('<code>')`
for `populate` nodes with a master context, and that helper currently has nothing to resolve the
code against (`populate_helper.py:125`). One property fixes both directions and stops them
drifting apart.

**This supersedes the `save` node attribute**, which predates both `conceptType` extraction and
CQL. Full design, including the unresolved update policy for writing to existing patient records,
is in `../../tricc_oo/feature/20260826-concept-persistence-mapping.md`. That spec's property naming
is a proposal — if it changes, this section follows it rather than the reverse.

### 2. Value sets

Answer lists for `select_one` / `select_multiple` are the options on the node, each bound to a
concept. `ValueSet` resources are **generated on export**, not authored — authoring both a node's
options and a matching ValueSet by hand guarantees they drift.

### 3. Terminology service

Framework-free, in `@tricc/core` under `src/terminology/`:

```ts
interface TerminologyService {
  search(query: string, opts?: { codeSystem?: string; dataType?: string; limit?: number }): ConceptMatch[]
  lookup(system: string, code: string): Concept | undefined
  usages(system: string, code: string): Usage[]
  create(codeSystem: string, concept: ConceptInput): Concept
  update(system: string, code: string, patch: Partial<ConceptInput>): Concept
  remove(system: string, code: string): RemoveResult   // refuses while usages exist
}
```

Search is the hot path — it backs the CQL picker on every `"` — so it runs against a prebuilt
index (code, display, all designations, definition), rebuilt incrementally on change. Target: under
20 ms at 50 000 concepts, which imported SNOMED subsets reach.

`usages()` is computed by walking every activity: concept bindings on nodes and options, plus
concept references inside parsed CQL. The CQL half is only possible because the frontend parses CQL
(`20260825-cql-authoring.md`) — a string search would miss a reference in a comment or match one
inside a string literal.

### 4. UI

Replaces the prototype's `TerminologyServer.tsx`, whose two independent search boxes and duplicated
state are documented in `REQUIREMENTS_ARCHITECTURE.md` (that file and `USER_DOCUMENTATION.md` are
superseded by this spec and should be removed on implementation).

**Browser** (`/concepts`) — CodeSystem selector, search, filters by data type and concept type,
virtualized results, create/edit/delete.

**Concept page** (`/concepts/:system/:code`) — code, system, version, display (all languages),
definition, data type, concept type, unit, provenance, and **where answers land** (derived from
`conceptType`, or the explicit `targetResource`/`targetPath`, stated in plain terms: "stored as an
Observation", "stored on the patient record as `birthDate`"); and a **usage list** grouped by activity,
each entry linking to the node or expression. Editing display or definition is inline; changing
`code` requires confirmation and rewrites references (or is refused if any reference is
unresolvable).

**Picker** — the shared component used by node properties and the CQL editor. Search-as-you-type,
grouped by CodeSystem, keyboard-navigable, with "create concept" inline for when the concept simply
does not exist yet. Blocking an author mid-thought to go create a concept elsewhere is the main
friction this removes.

### 5. Creation and validation

Required: `code`, `display`, `dataType`. Optional: definition, unit, `conceptType`, designations.

- `code` unique within its CodeSystem, matching FHIR's code regex
- default `code` suggested from the display as a slug, editable
- `dataType` compatible with the node types it is bound to — binding a `boolean` concept to an
  `integer` node is a warning, not silently accepted
- `targetPath` requires `targetResource`; the path is checked against a known element list for that
  resource, so a typo is caught at authoring time rather than as a runtime StructureMap failure
- deletion refused while usages exist, listing them

### 5.1 Capability

`create`, `update` and `remove` require `terminology.write`
(`20260825-library-architecture.md` §4). A read-only session browses concepts and follows usage
links with every editing affordance absent.

### 6. OCL import — design now, build later

Not implemented in v1. The following are fixed now so it needs no format change:

- `source` / `sourceVersion` properties (§1)
- `TerminologySourcePort` (`20260825-library-architecture.md` §3) already exists, so an
  `OclTerminologySource` is an added adapter rather than a refactor
- import copies concepts into the project CodeSystem — **never** references OCL at conversion time,
  preserving the offline guarantee
- refresh is an explicit action showing a diff of what would change

### 7. Code checklist

| Path | Purpose |
|------|---------|
| `packages/core/src/terminology/service.ts` | `TerminologyService` implementation |
| `packages/core/src/terminology/index.ts` | Search index |
| `packages/core/src/terminology/usages.ts` | Usage walker (bindings + parsed CQL) |
| `packages/core/src/terminology/codesystem.ts` | FHIR CodeSystem read/write + Zod schema |
| `packages/editor/src/concepts/Browser.tsx` | Browser |
| `packages/editor/src/concepts/ConceptPage.tsx` | Concept page |
| `packages/editor/src/concepts/ConceptPicker.tsx` | Shared picker (reworked from `ConceptSelector.tsx`) |
| `src/pages/TerminologyServer.tsx` | **Deleted** |
| `REQUIREMENTS_ARCHITECTURE.md`, `USER_DOCUMENTATION.md`, `.cline` | **Deleted** — superseded; docs move to `docs/` |

### 8. Tests

**Unit** — CodeSystem round-trip against a FHIR validator fixture; search ranking (exact code >
exact display > prefix > substring > designation); index performance at 50 000 concepts; usage
walker finds bindings *and* CQL references, and does not match inside string literals or comments;
delete refusal; code rename rewriting references.

**Component** — picker keyboard navigation; inline creation returns to the calling field with the
new concept selected; concept page usage list links resolve.

**E2E** — create a concept, bind it to a node, reference it in CQL, open its page from the (i)
button, see both usages, attempt deletion and be refused.

### 9. Acceptance criteria

- [ ] Concepts are stored as a valid FHIR R4 CodeSystem `tricc_oo` can read.
- [ ] Multilingual displays use `designation`.
- [ ] Search backs the CQL picker within budget at realistic dictionary sizes.
- [ ] Usage tracking covers node bindings and parsed CQL references.
- [ ] A concept in use cannot be deleted silently.
- [ ] A concept's page states where its answers land, derived rather than authored per node.
- [ ] `targetPath` without `targetResource` is rejected.
- [ ] The (i) button in the CQL editor reaches the concept page with editor state intact.
- [ ] No conversion path requires a terminology server to be reachable.
- [ ] `source`/`sourceVersion` exist and are populated by any future import without a migration.

### 10. Implementation phases

1. CodeSystem schema, read/write, service, index.
2. Browser and creation/editing.
3. Shared picker with inline creation.
4. Usage walker and concept page.
5. Rename/delete safety.
