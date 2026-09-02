# TRICC Project Format — native JSON project + per-activity YAML

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_frontend` — `@tricc/core` |
| **Related** | `20260825-document-model.md` (the in-memory document this format projects from), `20260825-tricc-oo-interop.md` (the `tricc_oo` side of this contract), `20260825-cql-authoring.md` (expression syntax), `20260825-terminology.md` (CodeSystem), `../../tricc_oo/tricc_oo/strategies/input/yaml.py` (the schema this extends) |
| **Approval** | — |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### What this is

Today a TRICC guideline is a draw.io file. That has served well, but it carries costs the
authoring team lives with daily: the diagram is one opaque XML blob, so two people cannot work on
different parts of a guideline without conflict; the meaning of a node is encoded in shape styles
and free-text attribute boxes, so mistakes are invisible until conversion fails; and there is no
way to review a clinical change as a readable diff.

This spec defines what the new authoring tool saves instead: a **project folder** of small,
readable, git-friendly files.

- **One file per activity.** A reviewer looking at a pull request sees "the malaria triage
  activity changed", not "the diagram changed".
- **Readable text.** Activity files are YAML. A clinician who does not use the editor can still
  read what a node asks and what the branch conditions are.
- **The drawing survives.** Each node records where it sits on the canvas, so opening a project
  redraws the guideline exactly as its author laid it out. Layout is a real authoring artifact —
  clinicians arrange flowcharts to mirror how care actually proceeds — and losing it on save
  would be losing information.
- **Concepts travel with the project.** The medical concepts a guideline uses are stored in the
  project itself, so it converts and reviews without needing a terminology server to be reachable.

### Interventions

A project groups its activities into **interventions**. An intervention is a coherent package of
care that a health worker can be offered — "sick child consultation", "antenatal visit
one" — made up of activities ordered along the standard clinical processes (registration, triage,
history and physical, diagnostic testing, and so on).

This is what the point-of-care application eventually shows as a selectable entry, so it is
the layer authors actually reason about. A project holds as many interventions as the guideline
needs.

> **Known gap.** `tricc_oo` today assumes one project equals exactly one intervention
> (`../../tricc_oo/feature/careplan-intervention-plandefinition.md`: *"Matches today's reality:
> one project = one Intervention"*). Supporting several per project is a change on the Python
> side too — it is specified in `20260825-tricc-oo-interop.md` §4, and until it lands, exporting
> a multi-intervention project will be blocked by validation with a clear message rather than
> silently producing a wrong bundle.

### Languages

Every piece of text an author writes — a question label, a hint, a diagnosis name — is stored per
language from the very first version, even while only English is offered. Retrofitting
translation into a format later means migrating every existing project; designing for it now
costs a few lines of schema.

### What this is not

This is not BPMN. BPMN remains interesting as a future exchange format — for handing a guideline
to a modelling tool, or receiving one — but it is a poor native format for TRICC: its semantics
do not cover typed clinical questions, concept binding, or answer inheritance, so most of what
matters would end up in vendor extension elements anyway. The prototype's BPMN generator is
removed rather than fixed.

---

## Part II — Technical specification

### 1. On-disk layout

A project is a **directory**, not a single file:

```
<project-dir>/
├── project.json                        # project metadata, interventions, settings
├── activities/
│   ├── <activity-id>.activity.yaml     # one per activity
│   └── ...
├── terminology/
│   └── <codesystem-id>.codesystem.json # FHIR R4 CodeSystem
├── cql/
│   └── <LibraryName>.cql               # hand-written shared libraries
└── media/
    └── <file>                          # images referenced by nodes
```

Rationale for a directory over a single bundle file: it is the only shape that gives per-activity
diffs and merges, which is the primary reason for leaving draw.io. Distribution as a single file
is still available — see §7.

#### 1.1 These files are a projection

The editing document is a CRDT (`20260825-document-model.md`); these files are its **serialized
projection**, and they are canonical for storage, review and conversion. Two consequences bind
this spec:

- **Writing is deterministic.** Stable key order, stable formatting, no timestamps or generated
  ids in output. Two collaborators whose documents have converged must produce byte-identical
  files, or they generate spurious diffs against each other forever.
- **Parsing is deterministic.** The same files always build the same document structure, so two
  people opening the same commit start from a compatible base.

Neither is optional, and both are asserted in §11.

### 2. `project.json`

```jsonc
{
  "formatVersion": "1.0.0",
  "id": "smart-imci",
  "system": "http://tricc.org/smart-imci",
  "code": "smart-imci",
  "version": "0.3.0",
  "title":       { "en": "IMCI sick child", "fr": "PCIME enfant malade" },
  "description": { "en": "..." },
  "languages": { "default": "en", "available": ["en", "fr"] },

  "interventions": [
    {
      "id": "sick-child",
      "code": "sick-child",
      "title": { "en": "Sick child consultation" },
      "description": { "en": "..." },
      "applicability": {
        "intent": { "en": "Children from 2 months up to 5 years" },
        "expression": "AgeInMonths() >= 2 and AgeInMonths() < 60"
      },
      "trigger": { "mode": "on-demand" },
      "processes": [
        { "process": "registration",         "activities": ["reg-child"] },
        { "process": "triage",               "activities": ["triage-danger-signs"] },
        { "process": "history-and-physical", "activities": [
            "hp-cough",
            { "ref": "hp-diarrhoea", "applicability": { "expression": "\"Diarrhoea reported\"" } }
        ]},
        { "process": "determine-diagnosis",  "activities": [] }
      ]
    }
  ],

  "contexts": [
    { "system": "http://tricc.org/context", "code": "encounter", "display": "Encounter" }
  ],

  "terminology": {
    "codeSystems": ["terminology/tricc.codesystem.json"],
    "default": "http://tricc.org/CodeSystem/tricc"
  },
  "cqlLibraries": ["cql/Shared.cql"],
  "mediaPath": "media/"
}
```

Notes:

- `processes[].process` is drawn from `PROCESSES` in `../../tricc_oo/tricc_oo/visitors/utils.py`.
  The frontend does **not** hardcode a second copy of the ordering: order is positional in this
  array, and `tricc_oo` applies its own canonical `PROCESS_ORDER` on export. The editor offers
  the known process names in a dropdown and permits free text (`tricc_oo` assigns unknown
  processes the next free order slot).
- An empty `activities` array is meaningful — `determine-diagnosis` above declares the process is
  part of the intervention while leaving `tricc_oo` to synthesize the activity, which it already
  does in `BaseInputStrategy.execute_linked_process`.
- `id` values are stable, human-readable slugs, generated from the title on creation and editable
  once. They are never regenerated, because `goto` links depend on them.
- An activity reference is a **string or an object** — a bare string is shorthand for `{ref: "..."}`.
  The object form carries per-intervention `applicability`, ANDed with the activity's own intrinsic
  `applicability`. Full semantics, plus the `trigger` vocabulary and its reserved modes, in
  `20260826-project-and-interventions.md` §2–3.

### 3. Activity YAML

A **strict superset** of `YamlActivity` in `../../tricc_oo/tricc_oo/strategies/input/yaml.py`. The
existing keys keep their exact meaning; everything new is either an additive key or lives under a
namespaced `ui:` block that a parser may ignore without changing semantics.

```yaml
formatVersion: "1.0.0"
id: triage-danger-signs           # stable; goto targets resolve against this
title:   { en: "Triage — danger signs" }
process: triage
applicability: "AgeInMonths() < 60"     # CQL

ui:
  viewport: { x: 0, y: 0, zoom: 1 }

nodes:
  - id: n-start
    type: activity_start
    name: triage_danger_signs
    label: { en: "Triage — danger signs" }
    ui: { x: 40, y: 40 }

  - id: n-weight
    type: integer
    name: weight
    label: { en: "Weight (kg)", fr: "Poids (kg)" }
    hint:  { en: "Use a calibrated scale" }
    help:  { en: "Remove heavy clothing before weighing." }
    concept: { system: "http://tricc.org/CodeSystem/tricc", code: "weight" }
    required: true
    min: 0
    max: 200
    relevance: "\"Child is present\""     # CQL
    repeat: 1
    notAvailable:                          # modifier — expands on save, see §4
      name: weight_not_available
      label: { en: "Weight not available" }
    media: { image: "media/scale.png" }
    ui: { x: 40, y: 160, width: 200, height: 70 }

  - id: n-severe
    type: proposed_diagnosis
    name: severe_disease
    label: { en: "Very severe disease" }
    severity: severe
    priority: 10
    ui: { x: 40, y: 420 }

edges:
  - id: e1
    source: n-start
    target: n-weight
    ui: { waypoints: [{ x: 140, y: 120 }] }

  - id: e2
    source: n-weight
    target: n-severe
    value: "yes"                           # branch semantics, see §5
    ui: { waypoints: [] }
```

#### 3.1 Field reference

Fields marked **new** do not exist in `YamlNode` today and are covered by
`20260825-tricc-oo-interop.md` §2.

| Field | Applies to | Notes |
|-------|-----------|-------|
| `id` | all | Unique within the activity. Referenced by edges. |
| `type` | all | See §4 for the permitted set. |
| `name` | all addressable | The export name; what CQL expressions reference. **The prototype has no such field at all** — this is the single most important model gap it leaves. |
| `label`, `hint`, `help` | display models | **new:** language maps rather than plain strings (§6). |
| `concept` | capture nodes | **new:** `{system, code}` reference into the project CodeSystem. |
| `relevance` | most | CQL. |
| `calculate` | `calculate` | CQL. |
| `expression`, `reference` | `rhombus`, `calculate` | CQL / node name. |
| `required`, `min`, `max`, `constraint`, `constraintMessage` | inputs | `constraint*` **new** to YAML (exists in draw.io `TYPE_MAP`). |
| ~~`save`~~ | — | **Deprecated.** Read on load, surfaced as a migration warning, **never written**. Superseded by concept-level persistence mapping — see below. |
| `repeat` | capture nodes, `activity_start` | Integer slot. `1` default, `0` force in-form collection, `-1` local-only. |
| `instance` | `goto`, `activity_start` | `0` auto-unique, `-1` snippet injection. |
| `link` | `goto` | Target **activity `id`**. |
| `list_name`, `options` | selects | Options gain `concept` (**new**). |
| `severity`, `priority` | diagnoses | **new** to YAML; `severity` ∈ `light` \| `mild` \| `moderate` \| `severe`. |
| `context`, `period` | `populate` | Unchanged. |
| `form_id`, `process` | `start` | Unchanged. |
| `media` | media-capable | **new:** `{image: <path>}`, relative to `mediaPath`. |
| `notAvailable` | inputs | **new:** modifier, see §4. |
| `ui` | all, activity, edges | **new:** presentation only. |

#### 3.1a Persistence is a property of the concept, not of the node

Where an answer lands in the patient record is **not** authored on the node. It follows from the
bound concept: `conceptType` already drives resource selection
(`../../tricc_oo/feature/20260813-concepttype-structuremap.md`), and concepts that correspond to a
named element of another resource declare it on the concept itself
(`20260825-terminology.md` §1.1).

This supersedes the `save` attribute. `save` predates both `conceptType` extraction and the
expression language: it existed so an author could redirect a value without drawing extra
calculate nodes, and it doubled as an ad-hoc concept-creation mechanism (`xml_to_tricc.py` splits
it on `.` to synthesize a system and code). With concepts authored properly and CQL available for
derivation, it has no remaining job. See
`../../tricc_oo/feature/20260826-concept-persistence-mapping.md`.

The editor therefore never writes `save`. A loaded activity carrying one keeps working — the value
is preserved and passed through — but it is reported as a migration item with the concrete
replacement: bind the right concept, or express the derivation in CQL.

#### 3.2 The `ui` block

`ui` carries **no semantics**. Deleting every `ui` block must leave a project that converts
identically. This is what allows `tricc_oo` to ignore it entirely and lets the format tolerate
hand-editing.

- Node: `{x, y, width?, height?, color?, collapsed?}`
- Edge: `{waypoints?: [{x, y}], labelOffset?}`
- Activity: `{viewport: {x, y, zoom}}`

Nodes without `ui` are auto-laid-out on load (§ `20260825-activity-editor.md`), so a
hand-written or machine-generated activity still opens.

### 4. Node types and modifiers

**Drawable types (v1).** Author-facing only:

| Group | Types |
|-------|-------|
| Flow | `start`, `activity_start`, `activity_end`, `end`, `goto`, `link_in`, `link_out`, `bridge`, `wait` |
| Questions | `select_one`, `select_multiple`, `select_yesno`, `select_option`, `integer`, `decimal`, `text`, `date`, `note` |
| Logic | `calculate`, `rhombus`, `count`, `add`, `not` |
| Data | `populate` |
| Clinical | `diagnosis`, `proposed_diagnosis` |

`bridge` and `wait` are drawable, matching draw.io — both are in
`../../tricc_oo/tricc_oo/converters/drawio_type_map.py` today, `wait` with mandatory `reference`,
`name` and `label`. Both are *also* injected during processing, which is a different thing from
being injection-only. See §4.1 and §4.2.

**Never drawable.** `factor` is created by `tricc_oo` from numeric edge labels
(`20260825-project-format.md` §5) and appears in no `TYPE_MAP`; `container_hint_media` is
deprecated. The editor neither offers them nor accepts them from a loaded file — their presence
means the file came from a processed graph rather than an authored one.

#### 4.1 `bridge` — a hub

A pass-through merge point with no mandatory attributes (`label`, `priority` optional). Its value
to an author is graph legibility: routing N predecessors into M successors through a bridge costs
**N + M** edges instead of **N × M**, and gives the diagram a visible junction rather than a
thicket.

Semantically it is a path merge — a node after a bridge is on the path of *any* of the bridge's
predecessors. `tricc_oo` also injects bridges itself (`get_bridge_path`, named `path_<id>`); those
are a product of processing and never appear in an authored file.

#### 4.2 `wait` — an ordering constraint

`wait` carries two distinct things
(`../../tricc_oo/tricc_oo/models/calculate.py:201`):

| Field | Meaning |
|-------|---------|
| `path` | Where **relevance** comes from — normally the wait's own sequence predecessor |
| `reference` | What must be **complete** before proceeding — one or more nodes, an activity, or an expression |

That split is the whole point: a wait enforces ordering **without** putting the awaited thing on
the relevance path. "Do not ask this until the lab result is back" must not become "only ask this
if a lab was ordered".

The editor offers two representations of the same underlying node:

- **As an order-constraint edge** — the common case. An edge drawn from the awaited node **B** to
  the dependent node **A** means "A waits for B". On save it becomes a `wait` node with
  `reference: [B]` and `path` set to A's existing sequence predecessor. Rendered distinctly from a
  sequence edge (dashed, no branch label), because it carries no relevance.
- **As a node** — when an edge cannot express it: waiting on an **activity** completing, a
  reference that is an expression rather than a node list, or one wait gating several successors.

On load, a `wait` whose `reference` is a plain node list and which gates a single successor is
**collapsed into order-constraint edges**; anything else renders as an explicit node. Same
collapse principle as `notAvailable` (§4 modifiers) — the serialized model is unchanged either way,
and the author sees whichever reads better.

**Modifiers.** Some concepts read naturally as a property of a node but are separate nodes in the
model. The editor renders these on the node itself; the serializer expands them.

| Modifier | Nature | Serialization |
|----------|--------|---------------|
| `hint` | attribute | `hint:` on the node |
| `help` | attribute | `help:` on the node |
| image | attribute | `media.image` on the node |
| **`notAvailable`** | **generates a node** | Expands to a sibling `not_available` node plus an edge from the modified node |

`not_available` is genuinely different from the other three and must not be lumped in with them:
`get_select_not_available_options` (`../../tricc_oo/tricc_oo/visitors/tricc.py:1578`) builds a
`select_one` carrying a single option, and blanks the parent's own label. It therefore **adds a
real output that downstream logic can branch on** ("weight was not measurable"), where hint/help/
image add nothing to the sequence. The editor shows it as a toggle on the parent node, but the
saved YAML contains a distinct node with its own `name`, and CQL may reference that name.

### 5. Edge branch semantics

`value` on an edge carries the branch condition, matching `process_edges` in
`xml_to_tricc.py`:

| `value` | Meaning |
|---------|---------|
| absent | Unconditional flow |
| `yes` / `oui` | Affirmative branch |
| `no` / `non` | Negative / exclusive branch |
| `continue` | Continue without branching |
| `follow` / `suivre` | **Deprecated** aliases of `continue`. Accepted on load, never written. |
| integer (`-1`, `2`, …) | Affirmative branch carrying a score factor. `tricc_oo` injects a `factor` node when the value is not `1`. |
| anything else | A CQL condition |

The editor presents these as a typed choice rather than free text, so the author picks
"Yes"/"No"/"Continue"/"Score"/"Condition" and only the last opens a CQL editor. Free-typing
`yes` into a condition field is the most common draw.io authoring error this removes.

The editor **only ever writes `continue`**. A loaded file containing `follow` or `suivre` is
accepted and normalized on save, so opening and saving an older activity quietly retires the
deprecated spelling.

### 6. Localized text

```yaml
label: { en: "Weight (kg)", fr: "Poids (kg)" }
```

- A **bare string is legal shorthand** for `{<default language>: "..."}`, so hand-written
  fixtures stay terse and `tricc_oo`'s existing YAML fixtures keep parsing unchanged.
- Missing translations fall back to `languages.default`.
- The editor exposes a language switcher affecting authored content only; UI chrome is English in
  v1 but routed through `react-i18next` from the start so adding a locale is a resource file, not
  a refactor.
- **Translation happens elsewhere.** Localized content exports to gettext `.po` and imports back
  (`20260825-guided-authoring.md` §9), matching the `trad.po` / `locales/` the project already
  uses. The format stores translations; it is not where they are produced.

### 7. Single-file distribution

`project.tricc` — a ZIP of the project directory. Used for sharing and for the `tricc_oo`
handoff when a directory is inconvenient. It is a packaging of the directory format, never a
distinct format: unzip and the layout in §1 is exactly what appears.

### 8. Format versioning

`formatVersion` (semver) appears in `project.json` and every activity file. The loader:

- accepts any version with the same major
- refuses a higher major with an actionable message
- runs registered migrations for lower minors, in order, and marks the project dirty so the
  author saves the migrated form

Migrations live in `packages/core/src/format/migrations/` as pure functions, one per version step, each with
its own fixture pair. This machinery goes in at v1 — the cost of adding it later, once real
guidelines exist in the field, is much higher.

### 9. Validation

Two distinct levels, surfaced differently:

- **Schema validity** — does it parse, are references resolvable. Blocks load. Zod schemas are the
  single source of truth for both the file shape and the TypeScript types, with JSON Schema
  generated from them for external tooling. They validate document *snapshots*, never the CRDT
  itself (`20260825-document-model.md` §5).
- **Authoring validity** — is the guideline sound: unreachable nodes, `goto` to a missing
  activity, selects without options, calculates without expressions, capture nodes with no
  `name`, duplicate `name` within a repeat slot, concept codes absent from the CodeSystem,
  CQL outside the TRICC profile. Shown as inline warnings; blocks export, not editing.

Blocking editing on authoring validity would make the tool unusable — a guideline is invalid for
most of the time it is being written.

### 10. Code checklist

| Path | Change |
|------|--------|
| `packages/core/src/format/schema/project.ts` | Zod schema + inferred `Project` type |
| `packages/core/src/format/schema/activity.ts` | Zod schema + inferred `Activity`, `Node`, `Edge` types |
| `packages/core/src/format/schema/localized.ts` | `LocalizedText` codec (string shorthand ↔ language map) |
| `packages/core/src/format/serialize/` | Project/activity read + write, YAML via `yaml` (comment- and order-preserving round-trip) |
| `packages/core/src/format/migrations/` | Version migration registry |
| `packages/core/src/format/validate/` | Authoring-validity rules, each independently testable |
| `src/types/index.ts` | **Deleted.** Superseded by generated types; the prototype's model is not salvageable (no `name`, no `required`, no `repeat`, no `instance`, `relevance` misnamed `applicability`). |
| `src/utils/export-generators.ts` | **Deleted.** Its BPMN output emits `<bpmn:incoming>` refs that match no `sequenceFlow` id, hardcodes every DI waypoint to `0,0 → 100,100`, and its CQL generator returns a library whose only define is `true`. |

### 11. Tests

- **Round-trip property test** — arbitrary valid project → write → read → deep-equal. Run over
  generated projects (`fast-check`) plus every fixture.
- **Golden files** — `packages/core/src/format/__fixtures__/` holds hand-written expected YAML; the serializer
  must match byte for byte, so formatting churn is caught in review.
- **Backward compatibility** — every fixture in `../../tricc_oo/tests/data/yaml/` must load
  without error and re-serialize to something `tricc_oo` still accepts. This is the concrete
  guarantee that "strict superset" is true, and it runs in CI.
- **`ui`-stripping equivalence** — for each fixture, removing all `ui` blocks yields a project
  that validates identically.
- **Migration tests** — one fixture pair per version step.

### 12. Acceptance criteria

- [ ] A project written by the editor loads in `tricc_oo` via the extended `YamlStrategy`
      (`20260825-tricc-oo-interop.md`) and produces an export.
- [ ] Every `tricc_oo` YAML fixture loads in the editor unchanged.
- [ ] Reopening a saved project reproduces node positions, viewport, and edge waypoints exactly.
- [ ] Deleting every `ui` block changes no conversion output.
- [ ] Every authored string is language-addressable; a second language can be added with no
      format change.
- [ ] A project with two interventions saves and loads; exporting it reports the `tricc_oo`
      single-intervention limitation explicitly rather than emitting a wrong bundle.

### 13. Implementation phases

1. Zod schemas, localized-text codec, generated types.
2. Read/write for `project.json` and activity YAML, with `ui` preservation.
3. Authoring validation rules.
4. Migration registry (one no-op migration, to prove the machinery).
5. ZIP packaging.
