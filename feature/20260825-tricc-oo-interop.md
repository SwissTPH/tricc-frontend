# tricc_oo Interop — reading the frontend project format

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | **`tricc_oo`** (specified here; mirror into `../../tricc_oo/feature/` on approval) |
| **Related** | `20260825-project-format.md`, `20260825-cql-authoring.md`, `../../tricc_oo/tricc_oo/strategies/input/yaml.py`, `../../tricc_oo/feature/careplan-intervention-plandefinition.md` |
| **Approval** | — |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

> **This spec describes work in a different repository.** `tricc_frontend` cannot deliver a
> working authoring tool without it: everything the frontend saves is unreadable by `tricc_oo`
> until these changes land. It is written here because the contract originates here, and it
> should be reviewed and re-filed as `tricc_oo/feature/<date>-frontend-project-input.md` before
> any Python is written, under that repo's own Draft → Approved gate.

---

## Part I — Business description

### What this is

The other half of the bridge. The frontend saves a project; `tricc_oo` has to be able to convert
it into ODK forms, CHT apps, FHIR questionnaires and OpenSRP bundles — the same outputs it produces
from draw.io today.

### What changes for `tricc_oo`

Three things.

**It gains a new input.** Alongside draw.io files, `tricc_oo` learns to read a project folder
written by the editor. draw.io input is untouched — existing guidelines keep converting exactly as
they do now, and nobody is forced to migrate.

**It learns to read CQL.** Logic in the new format is written in CQL rather than TRICC's own
expression syntax. `tricc_oo` translates CQL back into the internal operation model it already
uses, so every existing export target keeps working. This is the substantial piece of work, and
the reason the frontend restricts authors to a portable subset of CQL: the translation only has to
cover a defined, finite set of constructs.

**It learns that a project can hold several interventions.** Today one project produces exactly one
intervention. The editor lets an author package several — a sick-child consultation and an
antenatal visit in one guideline — and `tricc_oo` needs to emit one PlanDefinition per
intervention rather than one per project.

### What does not change

The draw.io path, the transformation engine, and every output strategy. This is a new front door
onto the existing machinery, not a rewrite of it.

---

## Part II — Technical specification

### 1. Scope

| In | Out |
|----|-----|
| New `TriccProjectStrategy` input strategy | Any change to `DrawioStrategy` |
| `YamlStrategy` schema extension | Any change to output strategies beyond §4 |
| CQL → `TriccOperation` translation | Full CQL support (profile only, §3) |
| Multi-intervention export | BPMN input |
| Shared CQL fixture corpus | Migrating existing draw.io guidelines |

### 2. `YamlStrategy` extension

The frontend's activity YAML is a strict superset of today's `YamlActivity`
(`20260825-project-format.md` §3). Required changes to
`../../tricc_oo/tricc_oo/strategies/input/yaml.py`:

#### 2.1 New node types

`NODE_TYPE_MAP` currently covers ~15 types. Add the remaining author-facing types:
`date`, `select_option` (as an explicit node), `link_in`, `link_out`, `count`, `add`, `not`,
`not_available`, `diagnosis`, `proposed_diagnosis`, **`bridge`**, **`wait`**.

`bridge` and `wait` are authorable in draw.io today (both are in `drawio_type_map.py`; `wait` with
mandatory `reference`, `name`, `label`) but absent from `YamlStrategy`'s `NODE_TYPE_MAP`. `wait`
needs both `path` and `reference`, and `reference` must accept a node list, an activity reference,
or an expression — the three forms the frontend can produce
(`20260825-project-format.md` §4.2).

`not_available` needs the same treatment as the draw.io path
(`xml_to_tricc.py:861`): build the single option via `get_select_not_available_options`, blank the
parent label to `NO_LABEL`, and register the option node.

#### 2.2 New fields on `YamlNode`

`concept`, `constraint`, `constraint_message`, `severity`, `priority`, `media`, `not_available`,
`list_name`, `default`, `filter`, `trigger`, `ui`. (`save` is **not** extended — it is deprecated,
§2.2a.)

#### 2.2a Persistence mapping, and `save`

The frontend never writes `save`. Where an answer lands follows from the bound concept, which
requires the `targetResource` / `targetPath` concept properties specified in
`feature/20260826-concept-persistence-mapping.md` (this repo). That spec is **independent of this
one** — it is worth landing on its own merits, since the read direction (`GetPatientValue`
resolving to a real Patient element) is broken today regardless of the frontend.

`save` remains readable here for draw.io compatibility. Nothing this spec adds writes it.

#### 2.2b Deprecated edge spellings

The frontend emits `continue` only. `follow` / `suivre` remain accepted on the `tricc_oo` side for
draw.io compatibility; nothing this spec adds writes them.

#### 2.3 Localized text

`label`, `hint`, `help`, `constraint_message`, `required_message` accept either a string (current
behaviour, unchanged) or a `{lang: text}` mapping. A helper resolves against the project's default
language, with `--lang` selecting another. Existing fixtures keep working untouched — this is a
widening, not a change.

#### 2.4 `ui` is ignored

`ui` blocks are dropped at load. **They must not reach any model.** A regression test asserts that
loading a fixture with and without `ui` produces identical `TriccProject` structures — that
equivalence is what lets the frontend own layout without the Python side caring.

#### 2.5 Activity identity

`YamlActivity.id` is already present and is what `goto.link` resolves against
(`drawio.py:231`: `if node.link in pages`). Add validation: duplicate ids across a project, and
`goto.link` values with no matching activity, are hard errors at load rather than warnings during
linking.

### 3. CQL → `TriccOperation`

The core of the work. New package `tricc_oo/converters/cql/`.

#### 3.1 Approach

ANTLR, using the **same vendored `Cql.g4`** as the frontend, at the same pinned version, generated
with the Python target. `tricc_oo` already depends on `antlr4` (`requirements.txt`), so this adds
a grammar, not a dependency.

```
tricc_oo/converters/cql/
├── grammar/          # Cql.g4 (pinned, shared with frontend) + generated Python parser
├── visitor.py        # parse tree → TriccOperation
├── profile.py        # profile whitelist; raises on anything outside it
├── resolve.py        # quoted identifier → node reference | concept | define
└── errors.py         # diagnostics with source positions
```

#### 3.2 Mapping

The table in `20260825-cql-authoring.md` §2.1 is normative for both sides. Every permitted
construct maps to a `TriccOperator`; declared TRICC helper functions map to their domain
operators (`ZSCORE`, `AGE_MONTH`, `GET_REPEATED_VALUE`, …).

#### 3.3 Resolution

A quoted identifier resolves, in order, to: a node `name` in scope, a declared `code`/`concept`,
or a library `define`. Ambiguity is an error demanding qualification — never a silent
first-match, which would make guideline meaning depend on declaration order.

Node references become `TriccReference`, exactly as `parse_expression` produces from `${name}`
today, so everything downstream of parsing is unchanged.

#### 3.4 Out-of-profile input

Raises with the construct name, source position, and the reason. The frontend prevents authors
from producing it, but hand-edited files and future frontend versions exist, so the Python side
enforces the profile independently rather than trusting its caller.

#### 3.5 Coexistence with TRICC syntax

The `language` of an expression is determined by its origin: activity YAML fields from a project
with `formatVersion >= 1.0.0` are CQL; everything else (draw.io, existing YAML fixtures) is TRICC
syntax through the existing `parse_expression`. Both produce `TriccOperation`. No file mixes the
two, and there is no sniffing heuristic — a guess here would be wrong occasionally and
undebuggable when it was.

### 4. Multi-intervention

`../../tricc_oo/feature/careplan-intervention-plandefinition.md` states the current design assumes
one project equals one intervention, and `OpenSRPStrategy.generate_intervention_plandefinition()`
emits a single PD accordingly.

Required:

- `TriccProject` gains `interventions: List[TriccIntervention]`, each with `id`, `code`, `title`,
  an optional `applicability`, a `trigger`, and its ordered process → activity mapping where each
  activity reference may carry its own `applicability`
  (`20260826-project-and-interventions.md` §2).
- Per-reference applicability most plausibly maps to PlanDefinition `action.condition`. **Check
  against `../../openSRP-fhircore/android` before promising it** — an unevaluated condition would
  silently include an activity that should have been skipped, which is worse than not supporting it.
- Only `trigger.mode = "on-demand"` is in scope. `planned` and `event` require
  `../../tricc_oo/feature/careplan.md`.
- A project with no explicit interventions synthesizes exactly one from all activities, which is
  today's behaviour bit for bit. **No existing export changes.**
- `generate_intervention_plandefinition()` emits one PD per intervention, each keeping the
  `available-care` wrapper action and per-process children with `tricc-process` /
  `tricc-process-order` extensions described in
  `../../tricc_oo/feature/20260812-intervention-order-and-dedup.md` §1–2.
- Composition and package assembly include every PD.

Open question for the `tricc_oo` maintainers, to settle before implementation: whether several
PlanDefinitions carrying the same `available-care` named event is correct for fhircore's
`NamedEventInterventionService`, or whether it reintroduces a variant of the duplicate-entry bug
that removed the catalog PD. That service's behaviour with multiple matching PDs needs checking
against `../../openSRP-fhircore/android` before any of this is built. **Until it is settled, the
frontend blocks export of multi-intervention projects** rather than emitting something
plausible-looking and wrong.

### 5. `TriccProjectStrategy`

New input strategy reading the project directory (or `.tricc` ZIP):

```python
@register_input_strategy("TriccProjectStrategy")
class TriccProjectStrategy(BaseInputStrategy):
    ...
```

- Reads `project.json`, checks `formatVersion` major
- Loads `terminology/*.codesystem.json` into the project's code systems
- Loads each `activities/*.activity.yaml` through the extended YAML loader
- Loads `cql/*.cql` as project libraries
- Builds interventions, then delegates to `execute_linked_process` / `process_pages` — the same
  path `YamlStrategy` already reuses

CLI: `-i <project-dir>` or `-i project.tricc`, auto-detected (a directory containing
`project.json`, or a ZIP containing one), so `-I` need not be passed explicitly.

### 6. Shared fixture corpus

`tricc_frontend/packages/cql/src/__fixtures__/corpus/` holds CQL → expected-`TriccOperation`-JSON pairs.
**Both** test suites consume it: Vitest in the frontend, pytest in `tricc_oo` (via a path or a
vendored copy synced by CI).

This is the only mechanism preventing the two independent mappers from drifting into
disagreement — the failure mode where an expression lints clean in the editor and converts to
something different in Python. Adding a corpus case is part of adding a mapping on either side.

### 7. Code checklist (`tricc_oo`)

| Path | Change |
|------|--------|
| `tricc_oo/strategies/input/yaml.py` | Node types, fields, localized text, `ui` drop, id validation |
| `tricc_oo/strategies/input/tricc_project.py` | New `TriccProjectStrategy` |
| `tricc_oo/strategies/__init__.py` | Register it (eager import — an unregistered strategy reports as "unknown" at runtime) |
| `tricc_oo/converters/cql/` | New CQL package |
| `tricc_oo/models/tricc.py` | `TriccIntervention`; `TriccProject.interventions` |
| `tricc_oo/strategies/output/opensrp.py` | One PD per intervention |
| `tests/build.py` | Directory / ZIP input detection |
| `docs/cli-and-inputs.md`, `docs/pipeline.md` | Document the new input |
| `AGENTS.md` | Add the strategy to the structure overview |

### 8. Tests (`tricc_oo`)

- Every existing test passes unchanged. Non-negotiable — this spec adds a front door.
- Extended YAML: each new node type and field; localized text in both forms; `ui`-stripping
  equivalence (§2.4); duplicate-id and dangling-`goto` errors.
- CQL: the shared corpus; every out-of-profile construct raises with position and reason;
  ambiguous identifiers raise.
- Interventions: no-intervention projects produce byte-identical output to today; two
  interventions produce two PDs with correct process order.
- End-to-end: a frontend-authored fixture project converts under `XLSFormStrategy`,
  `XLSFormCHTStrategy`, `FHIRStrategy` and `OpenSRPStrategy`.
- **Equivalence:** the same guideline expressed as draw.io and as a frontend project produces
  equivalent exports. This is the strongest available evidence that CQL translation preserves
  meaning, and it should be built early rather than last.

### 9. Acceptance criteria

- [ ] `python tests/build.py -i <project-dir> -o out/` converts a frontend project.
- [ ] Every existing `tricc_oo` test passes unchanged.
- [ ] Every draw.io fixture still converts identically.
- [ ] The full CQL profile translates to `TriccOperation`, verified by the shared corpus.
- [ ] Out-of-profile CQL raises with construct, position and reason.
- [ ] `ui` blocks provably reach no model.
- [ ] Single-intervention projects export byte-identically to today.
- [ ] Multi-intervention export is either correct against fhircore, or explicitly unsupported —
      never silently wrong.

### 10. Implementation phases

1. YAML schema extension (no CQL yet; TRICC syntax still). Unblocks frontend round-trip testing
   against a subset immediately.
2. CQL package: grammar, visitor, profile, resolution. Corpus-driven.
3. Wire CQL into the YAML loader behind `formatVersion`.
4. `TriccProjectStrategy` + CLI detection.
5. Interventions model + single-intervention no-op verification.
6. Multi-intervention export — **only after** the fhircore question in §4 is answered.

### 11. Sequencing against the frontend

The frontend can be built to phase 1 without any of this. Its contract tests
(`20260825-local-app.md` §8) start against the `YamlStrategy` subset and widen as phases
land. Full round-trip acceptance for the frontend depends on phases 1–4 here.

Recommended: land phase 1 early, in parallel with frontend foundation work, so the two are never
more than one phase apart. The alternative — building the whole frontend and discovering the
contract at the end — is the failure this spec exists to prevent.
