# TRICC Frontend — Feature Specifications

This folder follows the same convention as `../../tricc_oo/feature/`:

- One dated file per capability: `YYYYMMDD-<feature-name>.md`
- Two parts: **Part I — Business description** (plain language, for clinical authors and
  implementers) and **Part II — Technical specification** (for developers)
- Status gate: `Draft` → `Approved` → `Implemented` → `Superseded`
- **Nothing is implemented until the status reads `Approved`**
- Rename (`git mv`) with a bumped date prefix on every substantive revision, until the spec
  reaches `Implemented` or `Superseded`

`fix/` is reserved for issue analysis (bugs, output correctness) once the code exists.

## Continue from here (2026-10-08)

The local authoring app is in the uncommitted working tree on `develop`. Read
[20261008-authoring-continuation.md](./20261008-authoring-continuation.md) before the August drafts.
That file records Patrick's 2026-10-07 answers and the UI already in the tree.

The status gate above still applies to work that is not in the tree. Specs 4, 5, 7, 8b, 9, and 10
stay `Draft`. The August files were not renamed: their unbuilt parts are still the proposal, and
the continuation file is the override record.

Where the decisions table below and the continuation file disagree, follow the continuation file.

## The v1 set (2026-08-25)

One coherent piece of work: replacing draw.io as the TRICC authoring surface with a **set of
published libraries** plus a **thin local application**, writing a native project format
`tricc_oo` can consume. Read in dependency order.

| # | Spec | Package | What it covers |
|---|------|---------|----------------|
| 1 | [20260825-library-architecture.md](./20260825-library-architecture.md) | all | Monorepo and package split, ports, identity and capability model, npm publishing. |
| 2 | [20260825-document-model.md](./20260825-document-model.md) | `@tricc/core` | The CRDT project document (Yjs), undo, presence, and how it projects to files. |
| 3 | [20260825-project-format.md](./20260825-project-format.md) | `@tricc/core` | `tricc.yaml` + per-activity YAML. The `project.json` layout in that file is the earlier proposal. |
| 4 | [20260825-cql-authoring.md](./20260825-cql-authoring.md) | `@tricc/cql`, `@tricc/editor` | CQL chips on the stored expression string are in the app. ANTLR, CodeMirror, and `@tricc/cql` remain this draft. |
| 5 | [20260825-terminology.md](./20260825-terminology.md) | `@tricc/core`, `@tricc/editor` | Concept and FHIR CodeSystem authoring, concept pages, usage tracking. |
| 6 | [20260825-activity-editor.md](./20260825-activity-editor.md) | `@tricc/editor` | Graph editor as built: Nodes-tab palette, inspector tabs, answer rows, several activity ends. See the continuation record. |
| 7 | [20260825-guided-authoring.md](./20260825-guided-authoring.md) | `@tricc/editor`, `@tricc/core` | Roles, explanation in place, narrative intent and the clinician/IT handoff, snippet palette, `.po` translation. |
| 8 | [20260826-project-and-interventions.md](./20260826-project-and-interventions.md) | `@tricc/core`, `@tricc/editor` | Overview cards show process chips only. Per-reference applicability in that file is the earlier proposal. |
| 8b | [20260826-deduced-process-wrapper.md](./20260826-deduced-process-wrapper.md) | `@tricc/core`, `tricc_oo` | **Alternative, not built.** Deduce the process entry page from the intervention link instead of authoring it. |
| 9 | [20260825-preview.md](./20260825-preview.md) | `@tricc/core`, `@tricc/editor` | Running a guideline to see what it does. **Artifact route unresolved — see its §3.** |
| 10 | [20260825-assisted-authoring.md](./20260825-assisted-authoring.md) | `@tricc/core`, `@tricc/cql` | **Post-v1.** LLM help turning narrative `intent` into CQL, gated by the real parser and profile. Optional MCP server. |
| 11 | [20260825-local-app.md](./20260825-local-app.md) | `apps/local` | `apps/local` is the running shell. See the continuation record for what it already does. |
| 12 | [20260825-tricc-oo-interop.md](./20260825-tricc-oo-interop.md) | — | The round-trip contract and the changes `tricc_oo` must absorb. **Cross-repo** — mirror into `../../tricc_oo/feature/` on approval. |
| — | [20261008-authoring-continuation.md](./20261008-authoring-continuation.md) | `apps/local`, `@tricc/core`, `@tricc/editor` | **Resume here.** Session record of the working tree. Overrides rows in the decisions table. |

### Next plans (2026-10-08 review)

Drafts written from the 2026-10-08 review remarks. Suggested order:

1. Concepts first
2. Then draw.io and Not available
3. Canvas display and project-level activities can run in parallel

| Spec | Package | What it covers |
|------|---------|----------------|
| [20261008-data-dictionary-and-concept-texts.md](./20261008-data-dictionary-and-concept-texts.md) | `@tricc/core`, `@tricc/editor`, `tricc_oo` | Activity YAML holds concept codes only. Adds the Data dictionary tab, a concept card on nodes, display vs q-display (per intervention), and a rich text editor. Also fixes designations losing `use`. **Frontend implemented (phases 0–5), not committed; `tricc_oo` side specified in `../../tricc_oo/feature/20261008-concept-texts-q-display-and-message-tree.md`.** |
| [20261008-drawio-import-and-sequence-nodes.md](./20261008-drawio-import-and-sequence-nodes.md) | `@tricc/core`, `@tricc/editor`, `tricc_oo` | Nameless sequence nodes; on import, the process or activity kind is set per page; the activity title is taken from the activity start label; edges into extension nodes are unconditional. **Frontend implemented, not committed.** |
| [20261008-not-available-node.md](./20261008-not-available-node.md) | `@tricc/core`, `@tricc/editor`, `tricc_oo` | A `not_available` node with reasons. It replaces the `notAvailable` modifier and depends on the concept plan. |
| [20261008-canvas-display-and-activity-removal.md](./20261008-canvas-display-and-activity-removal.md) | `@tricc/editor`, `apps/local` | Node text wraps up to N lines, with N set in Preferences. Adds layout from measured sizes and a delete-activity bin. **Implemented, not committed.** |
| [20261008-project-level-activities.md](./20261008-project-level-activities.md) | `@tricc/core`, `@tricc/editor`, `tricc_oo` | Activities are defined at project level in `tricc.yaml`, and interventions refer to them by id. An optional external `source` keeps a read-only snapshot. |
| [20261008-names-and-activity-settings.md](./20261008-names-and-activity-settings.md) | `@tricc/core`, `@tricc/editor`, `tricc_oo` | `form_id` is retired in favour of the activity `name`, the process, and the intervention `name`. The `tricc_oo` half is implemented, not committed. Adds an activity settings gear and dialog (title, name, process, applicability). **Implemented, not committed.** |
| [20261009-canvas-comments-and-groups.md](./20261009-canvas-comments-and-groups.md) | `@tricc/core`, `@tricc/editor` | Comments that live only on the drawing (colour-coded, optionally about a node via a dashed line, kept in `ui`, ignored by `tricc_oo`): **implemented, not committed**. Page groups (draw.io `container_page`, sections of the form) as React Flow sub-flows: **implemented, not committed**; `tricc_oo` YAML side in `../../tricc_oo/feature/20261009-yaml-page-groups.md`. |

### Companion spec in `tricc_oo`

[`../../tricc_oo/feature/20260825-snippet-params-and-start-node.md`](../../tricc_oo/feature/20260825-snippet-params-and-start-node.md)
— named parameters on snippets and a dedicated snippet start node replacing `instance = -1`.
The snippet palette (spec 7 §6) depends on it.

[`../../tricc_oo/feature/20260826-concept-persistence-mapping.md`](../../tricc_oo/feature/20260826-concept-persistence-mapping.md)
— concept-level `targetResource` / `targetPath`, and deprecation of `save`. Worth landing on its
own merits: the read direction is broken today independently of this frontend.

Both drafted here from planning conversations; owned and reviewed in that repo.

## Decisions already taken

Recorded here so the specs don't relitigate them. Settled with the maintainer on 2026-08-25.
Rows marked **overridden** follow [20261008-authoring-continuation.md](./20261008-authoring-continuation.md).

### Shape of the deliverable

| Decision | Choice |
|----------|--------|
| Deliverable | A library set, not an application. `apps/local` is the first instantiation; a hosted service is a later one. |
| Library boundary | Headless `@tricc/core` and `@tricc/cql` (no React) + `@tricc/editor` React components. |
| Environment seams | Every difference behind a port, with local adapters. Identity and capabilities threaded through the UI from day one. |
| Concurrency | The project document is a **CRDT (Yjs)** from the start, so live collaboration is not a later rewrite. |
| Distribution | Published to npm from the start; pre-1.0 until the API is proven against a second consumer. |
| User management | **None.** No accounts, no authentication in the local shell — a display name in Preferences, used for authorship and presence. The prototype's `UserAccount.tsx` is deleted. |
| Persistence | Local files only. No backend, no server. |

### Who this is for

| Decision | Choice |
|----------|--------|
| Target author | An **open-minded clinician doing the clinical authoring**, with an IT specialist for the genuinely technical parts. Explicitly *not* "any clinician, unaided" — that is not achievable and designing for it helps nobody. |
| Teaching | The tool explains TRICC's conceptual model **in place**, using the WHO layered vocabulary already in `../../tricc_oo/docs/visual-authoring-concepts.md` rather than a vocabulary of our own. |
| Layer model | **Five layers**: Project (-1), Intervention (0), Segment/process (1), Activity (2), Node (3). WHO supplies 1–3; -1 and 0 are added because authors reason about them and no tool shows them. |
| Planning | Designed in `../../tricc_oo/feature/careplan.md` (Draft, unimplemented). Reserved in the format, **not redesigned here**. |
| Explanation delivery | **Non-intrusive and layered**: flyover by default, training card on click, video slot reserved. Nothing appears uninvited. The card corpus doubles as workshop material and feeds the `tricc_oo` docs site. |
| Narrative → CQL assistance | Specified, **post-v1, off by default**. Every proposal passes the real parser, resolver and portable-profile check before an author sees it; nothing is ever auto-applied. Local models first; hosted egress is an unresolved policy question. |
| Roles | `clinical` / `technical` / `terminology`, multi-select, a local preference. **Focus, never permission** — a role adds at most one step, and never refuses an action. Distinct from capabilities. |
| Clinician/IT handoff | First-class. Every expression carries a localized plain-language `intent` beside the CQL. Intent without logic is an open handoff: listed, navigable, and blocks export. |
| Reuse | Parameterized snippets, offered beside the node palette as insertable blocks. Requires the companion `tricc_oo` change. |
| Translation | Exported as gettext `.po` for a dedicated translation platform. No `linguist` role — translators will never open this tool. |
| Preview | Rendered from a `tricc_oo`-built artifact, not a JavaScript TRICC engine. A second implementation of guideline semantics is a worse failure than no preview. |

### Format and semantics

| Decision | Choice |
|----------|--------|
| Interchange format | **Overridden.** Save `tricc.yaml` plus per-activity YAML. `project.json` is ignored when `tricc.yaml` is present and is never written. BPMN is a possible later import/export, never the native format. |
| Node positions | Carried in the activity YAML under a semantics-free `ui:` block, so a bundle redraws faithfully. |
| Activity identity | Every activity YAML carries a stable `id`, so `goto` targets resolve. |
| Expression language | **CQL everywhere.** `tricc_oo` learns to read it, via a portable profile that keeps ODK/CHT/OpenMRS/DHIS2 reachable. |
| Node texts | **2026-10-08.** Activity YAML holds codes only. A node or select answer that shows text carries a `concept` (CodeSystem plus code). Its label, hint, help, and translations live in the CodeSystem as designations. See `20261008-data-dictionary-and-concept-texts.md` §2.0. |
| Activities at project level | **2026-10-08.** Activities are defined once, at project level. Interventions refer to them by id and never define them. Sharing is a must. An activity may carry a `source` URI when another project defines it. See `20261008-project-level-activities.md`. |
| Root node | **2026-10-08.** The start node (`start` or `activity_start`) is the activity. It shares the activity attributes from the YAML and has no business name. See `20261008-drawio-import-and-sequence-nodes.md` §2.2. |
| `form_id` | **2026-10-08.** A remnant of earlier approaches. It is replaced by the activity `name`, the `process`, and the intervention `name`, which names the form. `name` is TRICC's machine identifier. `form_id` should have been removed when interventions were added to `tricc_oo`. With an `interventions:` list it is ignored. It is still read only for legacy projects without interventions, and the app converts it once into the intervention `name`. This answers Q21. See `20261008-names-and-activity-settings.md`. |
| Persistence mapping | Where an answer lands is a property of the **concept**, never of the node. `save` is deprecated: read on load, reported as a migration item, never written. Needs the companion `tricc_oo` change. |
| Terminology | Project-local FHIR CodeSystem, authored in-app. On-demand OCL sync is a later adapter. A local copy of every used concept always travels with the project. |
| Process activities | **Overridden on the overview.** Process pages (root `start`) are still authored. Page activities stay in the intervention's saved activity list. The card shows process chips only and does not invent a process for a page. Deducing a wrapper instead is specced in `20260826-deduced-process-wrapper.md` and is not built. |
| Activity order in a process | Carried by the **order of the intervention's activity list**, not by a diagram. |
| Interventions | **Overridden.** A project holds many interventions. The intervention `start` (on, condition) is the condition for the activities it lists. The same activity file may be listed twice, including across two projects. There is no per-reference applicability. |
| Node scope | Author-facing node types, **including `bridge` and `wait`** — both are drawable in draw.io today. `quantity` is a question node beside decimal. `activity_end` may appear more than once. `factor` is the only injection-only type; `container_hint_media` is deprecated. `YamlStrategy` still skips `continue_with` and `bridge` on load. |
| Ordering vs relevance | `wait` is drawn as an **order-constraint edge** where it can be, and as a node where it cannot (activity completion, expression reference, multiple successors). It never puts the awaited thing on the relevance path. |
| Edge `continue` | The stored value is `continue`. The canvas label and the branch menu say Follow. `follow` / `suivre` are deprecated — read on load, never written. |
| i18n | Data model and UI designed for full localization from day one; only English strings ship in v1. |
| Toolchain | pnpm workspaces + Turborepo; Vite, Vitest, Playwright. The Create React App prototype is replaced. |
| draw.io import | **Overridden.** No general importer. A project whose `tricc.yaml` lists `.drawio` files opens, including an embedded compressed diagram. Save writes activity YAML and points `tricc.yaml` at those paths. The source `.drawio` stays. |

## Superseded during drafting

- `20260825-app-foundation.md` — replaced by `20260825-library-architecture.md`,
  `20260825-document-model.md` and `20260825-local-app.md` when the deliverable became a library
  set rather than an application.
