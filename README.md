# TRICC Frontend

A browser-based authoring tool for TRICC clinical decision support guidelines — and the libraries
it is built from.

TRICC converts clinical decision-support flowcharts into runnable digital forms: XLSForm/ODK, CHT,
OpenMRS, DHIS2, FHIR SDC and OpenSRP/FHIR-Core. Today those flowcharts are authored in draw.io and
converted by [`tricc_oo`](../tricc_oo). This repository replaces the authoring half: a purpose-built
editor that understands TRICC's semantics, and a native project format `tricc_oo` reads directly.

> ## Status: specification
>
> **The v1 described below is specified, not built.** The twelve specs in [`feature/`](./feature)
> are at status `Draft` and await review.
>
> What exists in `src/` today is an **earlier prototype** (Create React App, ~5,900 lines): a
> working React Flow canvas and five pages over `localStorage`, with placeholder export
> generators. It is being kept as a visual reference and will be preserved on a `prototype`
> branch. Its data model and export path are not carried forward — see
> [`feature/20260825-local-app.md`](./feature/20260825-local-app.md) §10.
>
> Do not treat `src/` as an implementation of these specs.

## Why replace draw.io

Today, very few clinicians can author a TRICC guideline, and never without an IT specialist beside
them. There are two separate reasons, and the tool has to address both.

**TRICC's conceptual model is genuinely hard, and nothing explains it in place.** Activities and
processes, a rhombus that fetches a prior answer rather than asking a new question, repeat slots,
version inheritance, the way a concept's class decides whether an answer becomes an Observation or
a Condition, nested activities versus inlined snippets — none of it is guessable from a diagram,
and all of it is documented somewhere other than where the author is working.

**draw.io cannot help even when the author does understand.** It is a drawing tool taught by
convention to carry guideline semantics in shape styles and free-text attribute boxes:

- A misspelled attribute is accepted silently and ignored at conversion.
- Which attributes a node type accepts is knowable only by reading the Python source.
- An arrow labelled `Yes` and one labelled `yes ` behave differently.
- A `goto` pointing at a renamed page fails only when someone runs a conversion, often days later.
- The whole guideline is one XML blob, so two people cannot edit different parts without
  conflicting, and no clinical change can be reviewed as a readable diff.

### Five layers, not three

The WHO authoring material TRICC follows describes three layers — segment, activity, node. That is
right for drawing a guideline and stops one level too low. Two more sit above it that authors
reason about constantly and no tool shows them:

| Layer | What it answers |
|-------|-----------------|
| **-1 Project** | Which interventions are carried together, and when each one starts |
| **0 Intervention** | Which activities make up this package, and which suit this patient |
| 1 Segment / process | What should happen, and in what order |
| 2 Activity | How a segment executes |
| 3 Node | The specific action or logic |

The navigator, the overview screen and every explanation use these five words. Planning — deciding
*when* an intervention starts — is designed in
[`tricc_oo/feature/careplan.md`](../tricc_oo/feature/careplan.md) and reserved here rather than
redesigned.

### The goal, stated realistically

Not that any clinician will author a guideline unaided — that will not happen, and designing as if
it will produces a tool that is condescending to experts and still unusable by everyone else.

The goal is that **an open-minded clinician can do the clinical authoring, and needs an IT
specialist for the genuinely technical parts rather than for all of it.**

So the editor knows what a node is — a weight question offers minimum, maximum, unit and concept
binding and nothing else; branch conditions are chosen, not typed; `goto` targets are picked from
activities that exist. And it explains what a node is *for*, in clinical language, where the
decision is being made. Roles let a clinician and an IT specialist see the parts they each care
about without either being locked out of the other's. Every expression carries a plain-language
**intent** beside it, so a clinician can say what logic should do and an IT specialist can write
it — with the sentence surviving as the permanent explanation of why the logic looks that way.

Guidelines are stored as one small file per activity, so review works the way code review works.

## Shape of the deliverable

Not an application — a **library set**, with the application as one thin instantiation.

```
packages/
├── core/            @tricc/core           model, CRDT document, file format, validation, terminology, ports
├── cql/             @tricc/cql            CQL grammar, parser, portable profile, TriccOperation mapping
├── editor/          @tricc/editor         React: canvas, property panels, CQL editor, concept picker
└── adapters-local/  @tricc/adapters-local local file persistence, local identity, IndexedDB
apps/
└── local/           the desktop-shaped instantiation — no server, no accounts
```

`core` and `cql` contain no React. Every environmental difference — where projects are stored, who
you are and what you may do, whether others are editing, where concepts come from — sits behind a
port with a local adapter. A hosted service later replaces four adapters and the surrounding
chrome; the editor, the model, the validation and the language tooling are shared.

The project document is a **CRDT** (Yjs) from the start. That is the one decision that cannot be
deferred: retrofitting live collaboration onto a snapshot-based editor means replacing the
document, the undo system and everything that touches state.

## What it produces

A project is a directory, reviewable in git:

```
my-guideline/
├── project.json                        # metadata, interventions, settings
├── activities/*.activity.yaml          # one file per activity, positions included
├── terminology/*.codesystem.json       # FHIR R4 CodeSystem — the concepts, stored locally
├── cql/*.cql                           # shared libraries
└── media/
```

`tricc_oo` consumes this directly via a new input strategy, alongside its existing draw.io path —
which is untouched, so no existing guideline is forced to migrate. The `tricc_oo` side of the
contract is specified in
[`feature/20260825-tricc-oo-interop.md`](./feature/20260825-tricc-oo-interop.md).

## Logic is CQL

Every expression — when a question appears, what a score sums to, which branch a decision
takes — is written in [CQL](https://cql.hl7.org/), the HL7 standard for clinical logic. TRICC's
own expression syntax is retired as an authoring surface.

Concepts are referenced by code and displayed by name. Typing `"` opens a picker over the project's
concept dictionary; the reference is inserted coded and rendered as an inline chip showing the
concept's display, with a summary card on hover and a link to its full page.

The editor accepts a defined **portable subset** of CQL. TRICC exports to ODK, CHT, OpenMRS and
DHIS2 as well as FHIR, and those targets have no CQL engine — their logic is arithmetic and
booleans evaluated on a phone, offline. CQL that can be mechanically rewritten for them is safe;
CQL that cannot (database retrieves, temporal joins, list comprehensions) would produce a guideline
that works in FHIR and silently breaks everywhere else. The linter says so as you type, and names
the targets at risk.

## Specifications

Read in dependency order. Each has a plain-language Part I and a technical Part II, following
`tricc_oo`'s [feature workflow](../tricc_oo/AGENTS.md).

| # | Spec | Covers |
|---|------|--------|
| 1 | [library-architecture](./feature/20260825-library-architecture.md) | Packages, ports, capabilities, publishing |
| 2 | [document-model](./feature/20260825-document-model.md) | CRDT document, undo, presence, file projection |
| 3 | [project-format](./feature/20260825-project-format.md) | `project.json`, activity YAML, node types, edge semantics |
| 4 | [cql-authoring](./feature/20260825-cql-authoring.md) | Parser, portable profile, editor, concept picker |
| 5 | [terminology](./feature/20260825-terminology.md) | CodeSystem authoring, concept pages, usage tracking |
| 6 | [activity-editor](./feature/20260825-activity-editor.md) | Palette, properties, modifiers, validation |
| 7 | [guided-authoring](./feature/20260825-guided-authoring.md) | Roles, explanation in place, narrative intent, snippet palette, `.po` translation |
| 8 | [project-and-interventions](./feature/20260826-project-and-interventions.md) | Project bundling, intervention applicability, planning overview |
| 9 | [preview](./feature/20260825-preview.md) | Running a guideline to see what it does |
| 10 | [assisted-authoring](./feature/20260825-assisted-authoring.md) | Post-v1: LLM help turning narrative into CQL |
| 11 | [local-app](./feature/20260825-local-app.md) | Vite app, local adapters, saving, e2e, CI |
| 12 | [tricc-oo-interop](./feature/20260825-tricc-oo-interop.md) | What `tricc_oo` must absorb |

One companion spec lives in the other repository:
[`tricc_oo/feature/20260825-snippet-params-and-start-node.md`](../tricc_oo/feature/20260825-snippet-params-and-start-node.md)
— parameterized snippets and a dedicated snippet start node, which the snippet palette depends on.

[`feature/README.md`](./feature/README.md) records the decisions these specs rest on, so they are
not relitigated in review.

## Contributing

Follow the `feature/` gate: specify, get approval, then implement. New capabilities get a dated
spec at `Draft`; corrections get one under `fix/`. Nothing lands ahead of its spec being
`Approved`.

## Related

- [`tricc_oo`](../tricc_oo) — the conversion engine, and the consumer of this format
- [TRICC documentation](https://swisstph.github.io/tricc/)
- [Repository](https://github.com/SwissTPH/tricc) · [Issues](https://github.com/SwissTPH/tricc/issues)

## License

Part of the TRICC system; same licensing terms.
