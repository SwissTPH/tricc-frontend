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

## The v1 set (2026-08-25)

One coherent piece of work: replacing draw.io as the TRICC authoring surface with a **set of
published libraries** plus a **thin local application**, writing a native project format
`tricc_oo` can consume. Read in dependency order.

| # | Spec | Package | What it covers |
|---|------|---------|----------------|
| 1 | [20260825-library-architecture.md](./20260825-library-architecture.md) | all | Monorepo and package split, ports, identity and capability model, npm publishing. |
| 2 | [20260825-document-model.md](./20260825-document-model.md) | `@tricc/core` | The CRDT project document (Yjs), undo, presence, and how it projects to files. |
| 3 | [20260825-project-format.md](./20260825-project-format.md) | `@tricc/core` | `project.json` + per-activity YAML with positions, interventions, localized text, node types, edge semantics. |
| 4 | [20260825-cql-authoring.md](./20260825-cql-authoring.md) | `@tricc/cql`, `@tricc/editor` | CQL as the expression language: ANTLR parser, the TRICC portable profile, CodeMirror editor, `"` concept picker, inline concept chips. |
| 5 | [20260825-terminology.md](./20260825-terminology.md) | `@tricc/core`, `@tricc/editor` | Concept and FHIR CodeSystem authoring, concept pages, usage tracking. |
| 6 | [20260825-activity-editor.md](./20260825-activity-editor.md) | `@tricc/editor` | The graph editor: palette, properties, node modifiers, branch semantics, live validation. |
| 7 | [20260825-guided-authoring.md](./20260825-guided-authoring.md) | `@tricc/editor`, `@tricc/core` | Roles, explanation in place, narrative intent and the clinician/IT handoff, snippet palette, `.po` translation. |
| 8 | [20260826-project-and-interventions.md](./20260826-project-and-interventions.md) | `@tricc/core`, `@tricc/editor` | The two layers above the flowchart: project bundling, intervention applicability, planning overview. |
| 8b | [20260826-deduced-process-wrapper.md](./20260826-deduced-process-wrapper.md) | `@tricc/core`, `tricc_oo` | **Alternative, not built.** Deduce the process entry page from the intervention link instead of authoring it. |
| 9 | [20260825-preview.md](./20260825-preview.md) | `@tricc/core`, `@tricc/editor` | Running a guideline to see what it does. **Artifact route unresolved — see its §3.** |
| 10 | [20260825-assisted-authoring.md](./20260825-assisted-authoring.md) | `@tricc/core`, `@tricc/cql` | **Post-v1.** LLM help turning narrative `intent` into CQL, gated by the real parser and profile. Optional MCP server. |
| 11 | [20260825-local-app.md](./20260825-local-app.md) | `apps/local` | The local instantiation: Vite app, local adapters, saving and recovery, e2e, CI. |
| 12 | [20260825-tricc-oo-interop.md](./20260825-tricc-oo-interop.md) | — | The round-trip contract and the changes `tricc_oo` must absorb. **Cross-repo** — mirror into `../../tricc_oo/feature/` on approval. |

### Companion spec in `tricc_oo`

[`../../tricc_oo/feature/20260825-snippet-params-and-start-node.md`](../../tricc_oo/feature/20260825-snippet-params-and-start-node.md)
— named parameters on snippets and a dedicated snippet start node replacing `instance = -1`.
The snippet palette (spec 7 §6) depends on it.

[`../../tricc_oo/feature/20260826-concept-persistence-mapping.md`](../../tricc_oo/feature/20260826-concept-persistence-mapping.md)
— concept-level `targetResource` / `targetPath`, and deprecation of `save`. Worth landing on its
own merits: the read direction is broken today independently of this frontend.

Both drafted here from planning conversations; owned and reviewed in that repo.

## Decisions already taken

Recorded here so the specs don't relitigate them. All settled with the maintainer on 2026-08-25.

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
| Interchange format | Native project JSON + per-activity YAML. BPMN is a possible later import/export, never the native format. |
| Node positions | Carried in the activity YAML under a semantics-free `ui:` block, so a bundle redraws faithfully. |
| Activity identity | Every activity YAML carries a stable `id`, so `goto` targets resolve. |
| Expression language | **CQL everywhere.** `tricc_oo` learns to read it, via a portable profile that keeps ODK/CHT/OpenMRS/DHIS2 reachable. |
| Persistence mapping | Where an answer lands is a property of the **concept**, never of the node. `save` is deprecated: read on load, reported as a migration item, never written. Needs the companion `tricc_oo` change. |
| Terminology | Project-local FHIR CodeSystem, authored in-app. On-demand OCL sync is a later adapter. A local copy of every used concept always travels with the project. |
| Process activities | **Authored** (materialised): a page rooted by `start` with a `process`, wrapping calls to normal activities. Interventions list process activities, never normal ones. The wrapper is what keeps a reusable activity from being owned by a process. Deducing it instead is specced in `20260826-deduced-process-wrapper.md` but not built. |
| Activity order in a process | Carried by the **order of the intervention's activity list**, not by a diagram. |
| Interventions | A project holds **many** interventions, each with applicability at both intervention and activity-reference level, ANDed with the activity's intrinsic applicability. |
| Node scope | Author-facing node types, **including `bridge` and `wait`** — both are drawable in draw.io today. `factor` is the only injection-only type; `container_hint_media` is deprecated. |
| Ordering vs relevance | `wait` is drawn as an **order-constraint edge** where it can be, and as a node where it cannot (activity completion, expression reference, multiple successors). It never puts the awaited thing on the relevance path. |
| Edge `continue` | `continue` is the spelling. `follow` / `suivre` are deprecated — read on load, never written. |
| i18n | Data model and UI designed for full localization from day one; only English strings ship in v1. |
| Toolchain | pnpm workspaces + Turborepo; Vite, Vitest, Playwright. The Create React App prototype is replaced. |
| draw.io import | Out of scope. Not now. |

## Superseded during drafting

- `20260825-app-foundation.md` — replaced by `20260825-library-architecture.md`,
  `20260825-document-model.md` and `20260825-local-app.md` when the deliverable became a library
  set rather than an application.
