# Guided Authoring — roles, explanation in place, narrative intent, snippet palette

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_frontend` — `@tricc/editor`, `@tricc/core` |
| **Related** | `20260825-activity-editor.md` (the surface this shapes), `20260825-cql-authoring.md` (expression intent), `20260825-preview.md` (learning by running), `../../tricc_oo/docs/visual-authoring-concepts.md` (the WHO layered model and roles this adopts), `../../tricc_oo/feature/20260825-snippet-params-and-start-node.md` (parameterized snippets) |
| **Approval** | — |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### The actual problem

Authors do make mistakes because they misunderstand TRICC. That is the honest starting point, and
it is a different problem from "the tool is unhelpful".

TRICC has real conceptual depth: activities and processes, a rhombus that fetches a prior answer
rather than asking a new question, repeat slots, version inheritance, the way a concept's class
decides whether an answer becomes an Observation or a Condition, the difference between a nested
activity and an inlined snippet. None of that is obvious, and none of it is guessable from a
diagram.

The consequence today is that **very few clinicians can author, and never without an IT specialist
beside them**. That is not a failure of the clinicians. It is what happens when the conceptual
model is documented only outside the tool, and the tool itself is a general-purpose drawing
program that cannot explain anything.

### What this is trying to change — and what it is not

We are not claiming any clinician will author a guideline unaided. That will not happen, and
designing as if it will produces a tool that is condescending to experts and still unusable by
everyone else.

The realistic goal: **an open-minded clinician should be able to do the clinical authoring, and
need an IT specialist for the genuinely technical parts rather than for all of it.** Move the line,
substantially, in a direction it has never moved.

Two things follow.

**The tool has to teach.** Not with a manual behind a link — in place, at the moment a decision is
being made. When someone adds a decision node, the tool should say what a decision node is for and
what it needs, in clinical language, with an example. When a node shows "stored as an Observation",
it should explain that this follows from the concept's class, and where to change it. This is the
point of the whole exercise: an easier way to configure nodes — concepts, logic, links — with the concepts explained
rather than assumed.

**The tool has to support two people working together**, not pretend one person does everything.
Clinical authoring and technical authoring are different jobs done by different people, and the
handoff between them is where guidelines currently get stuck.

### Roles as focus, never as a fence

A clinician, an IT specialist and a terminologist care about different parts of the same guideline.
The tool lets you say which you are, and adjusts what it puts in front of you — fewer fields, more
explanation, or the reverse.

Three things this deliberately is not:

- **Not a permission system.** A clinician who wants to write the logic writes the logic. The role
  adds one step to get there — it never refuses. The purpose is a calmer interface the rest of the
  time, not a locked door.
- **Not exclusive.** Someone who is both clinician and IT specialist selects both and sees
  everything.
- **Not stored in the guideline.** It is your preference, changeable at any moment.

### Saying what the logic is *for*

Every expression can carry a **narrative** beside it: a plain sentence saying what it is meant to
do, written by whoever understands the clinical intent.

This is the concrete form of the handoff. A clinician writes *"only ask about convulsions if the
child is under five and has had a fever for more than three days"* and leaves the expression
empty. An IT specialist writes the CQL. The narrative stays, permanently, as the explanation of
why the logic looks the way it does — which is what makes the guideline reviewable by the clinician
who did not write the code, and maintainable two years later.

Expressions still lacking their logic form a visible work list, and they block export. Nothing gets
silently forgotten.

### Reusable building blocks

Common clinical constructs — screening for danger signs, scoring a set of symptoms, measuring a
vital with its plausible range — should be picked from a list, not redrawn.

TRICC already has the mechanism: a snippet is a module copied into the flow. What it lacks is the
ability to vary — every copy is identical. A companion change to `tricc_oo`
([`20260825-snippet-params-and-start-node.md`](../../tricc_oo/feature/20260825-snippet-params-and-start-node.md))
gives snippets **named parameters**, so one temperature module serves every measurement site.

The editor then shows available snippets **beside the node palette, as though they were node
types**. Dropping one asks for its parameters in a small form, using the descriptions their author
wrote. An author does not need to understand how the block is wired to use it correctly — which is
exactly the barrier this is trying to lower.

---

## Part II — Technical specification

### 1. Conceptual model: adopt, don't invent

The explanatory scaffolding is the WHO layered model already documented in
`../../tricc_oo/docs/visual-authoring-concepts.md`, not a vocabulary of our own:

| Layer | Question it answers | TRICC realization |
|-------|--------------------|-------------------|
| 0 — Project | Which interventions are carried **together**, and **when** each one starts | The project bundle; planning (`../../tricc_oo/feature/careplan.md`) |
| 1 — Intervention | Which activities make up this **package**, and which suit **this patient** | `interventions[]` with applicability and trigger |
| 2 — Segment / process | **What** should happen, and in what order | `start` with `process`; process ordering within an intervention |
| 3 — Activity | **How** a segment executes | `activity_start` / `activity_end`, `goto`, snippets |
| 4 — Node | The specific action or logic | Typed nodes |

Layers 1–3 are the WHO material's own. Layers -1 and 0 are added because authors reason about them
constantly and no tool currently shows them — the bundling and clinical-tailoring decisions above
the flowchart. `20260826-project-and-interventions.md` specifies both, including how they reconcile
with `careplan.md`'s `Project → CarePlan → Intervention → Process` hierarchy.

The navigator, onboarding and explanatory copy all use these five layers and these words. Authors
trained on WHO material meet the vocabulary they were taught; authors who were not get a model
documented outside this tool. A second vocabulary for the same ideas is itself a barrier.

The same document supplies the roles (§2).

### 2. Roles

```ts
type AuthoringRole = 'clinical' | 'technical' | 'terminology'
```

- **Multi-select.** Selecting all is equivalent to no filtering.
- **A local preference**, not project data. Never serialized into the project format — it describes
  the person, not the guideline.
- **Distinct from capabilities.** `20260825-library-architecture.md` §4 defines capabilities, which
  are permissions and *can* refuse. Roles never refuse. Conflating them would turn a UI preference
  into an access-control surface.
- Default: all roles enabled. A new user sees everything until they choose to narrow.

#### 2.1 What a role changes

| Aspect | `clinical` | `technical` | `terminology` |
|--------|-----------|-------------|---------------|
| Field prominence | Label, hint, help, concept, options, narrative | Expressions, `repeat`, `instance`, constraints | Concept binding, data type, concept class, persistence mapping, code systems |
| Explanation density | High — every field explained by default | Low — explanations on demand | Medium |
| Advanced fields | Collapsed behind one step | Expanded | Collapsed |
| Validation emphasis | Clinical completeness, unreachable paths | Expression and profile issues | Unbound concepts, type mismatches |

#### 2.2 The one-step rule

Nothing a role hides is unreachable. Every collapsed group is one click away, labelled with what it
contains, and the click is remembered per node type for the session — an author who opens "Logic"
on one node gets it open on the next.

This is the difference between progressive disclosure and a restricted mode, and it is a hard
requirement: a component that renders a field as *absent* rather than *collapsed* for a role is a
bug.

### 3. Explanation in place — non-intrusive by default

#### 3.1 Delivery: flyover first

The failure mode of in-tool explanation is clutter. An interface that annotates every field inline
is harder to use than one that annotates none, and it trains authors to stop reading. So
explanation is **layered, and nothing beyond the first layer is shown unless asked for**:

| Layer | Surface | Cost to the author |
|-------|---------|--------------------|
| 0 | Nothing. The field is well-named and typed. | — |
| 1 | **Flyover** — hover or focus a field, a node type in the palette, a validation badge | Free; no click, no layout shift |
| 2 | **Training card** — click the flyover, or the `?` on a node type | One click, opens beside the work, not over it |
| 3 | **Deep link** into the docs site / workshop material | Deliberate departure |

Layer 1 is the default and the one that must be excellent. Layer 2 is where the real teaching
happens. Nothing is modal, nothing blocks, nothing appears uninvited — except a node type's first
use, which opens its card once (§7) and never again.

An earlier draft had explanations expanded inline for the `clinical` role. That is withdrawn: dense
annotation is not the same as being helpful, and role should change *prominence*, not add noise.

#### 3.2 Training cards

A training card is a self-contained explanation of one TRICC concept — a node type, a field, a
branch semantic, a glossary term:

```ts
interface TrainingCard {
  id: string                    // 'node.rhombus', 'field.repeat', 'edge.continue'
  title: LocalizedText
  short: LocalizedText          // layer 1: one line, in the flyover
  purpose: LocalizedText        // what it is FOR — the question authors actually have
  whenToUse: LocalizedText
  example: { narrative: LocalizedText; figure?: DiagramFixture }
  pitfalls?: LocalizedText[]    // what authors get wrong, from real experience
  media?: { video?: string; poster?: string }   // slot exists now, unfilled in v1
  seeAlso?: string[]            // other card ids
  docs?: string                 // deep link
}
```

Design consequences worth stating:

- **Cards are content, not code.** Authored as data in `@tricc/core`, reviewable by a clinician in
  a pull request without reading TypeScript, and translatable through the same `.po` pipeline as
  guideline content (§9).
- **`example.figure` is a real diagram fixture**, rendered by the actual canvas in miniature —
  not a screenshot. It cannot go stale against the editor, and it is testable.
- **`pitfalls` is the highest-value field and the hardest to write.** It cannot be derived from the
  model; it comes from having watched people author. It is optional in the schema precisely so a
  card can ship without it and gain it later, rather than being blocked on it.
- **`media.video` is a slot, deliberately unfilled.** Video is the right layer-2 medium for
  concepts like snippet injection or repeat slots, and it is a separate production effort. The
  schema reserves it so adding video later is content work, not a format change.

#### 3.3 Cards are training material, not just tooltips

The same corpus renders in three places:

1. In the editor, as layers 1–2 above.
2. As a **printable/exportable deck** — the workshop material for teaching TRICC authoring.
3. Into the `tricc_oo` docs site, so `docs/tricc-elements.md` and the cards cannot drift.

This matters for §14: the content is not a new cost invented by this tool. It is the training
material TRICC authoring already requires, written once and delivered in three places instead of
being re-improvised per workshop.

#### 3.4 Writing rules

- **Explain the purpose, never restate the name.** "Minimum value" is not an explanation of `min`.
  "Readings below this are rejected as implausible — a temperature below 30 °C is a broken
  thermometer, not a patient" is.
- **Examples are clinical**, drawn from real guideline constructs. Never `foo`.
- **Node-type cards answer "when would I use this?"** — not "what is this?".
- **Second person, present tense, no jargon that is not itself carded.** Any TRICC term used inside
  a card must have its own card, linked. This is what makes the corpus navigable rather than a
  glossary of circular definitions.

#### 3.5 Coverage

Every drawable node type, every field descriptor (`20260825-activity-editor.md` §4), every edge
branch semantic and every modifier must have a card with at least `short` and `purpose`, asserted
by a test. A missing card is a build failure.

The test guarantees existence, not quality — §14.

### 4. Narrative intent on expressions

Every expression field becomes a pair:

```yaml
relevance:
  intent: { en: "Only ask about convulsions for children under five with fever lasting over three days" }
  expression: "AgeInMonths() < 60 and \"Fever duration\" > 3"
```

A bare string remains valid shorthand for `{expression: "..."}`, so nothing in
`20260825-project-format.md` §3 breaks and hand-written fixtures stay terse.

- `intent` is **localized** — it is clinical prose, and a French guideline's intent belongs in
  French.
- `intent` is stored as `Y.Text` (`20260825-document-model.md` §3), so a clinician and an IT
  specialist can edit intent and expression simultaneously.
- Either half may exist without the other. An `intent` with no `expression` is an **open handoff**.
- `intent` never affects conversion. It travels into generated CQL as a comment above the define,
  so it survives into the artifact a reviewer reads.

#### 4.1 The handoff work list

Open handoffs are collected per project: node, field, intent text, author, timestamp.

- Surfaced as a panel, prominent in the `technical` role.
- **Blocks export**, as a validation error. An intent with no logic is a guideline that does not do
  what someone wrote down that it should — the most dangerous state to export in.
- A `technical` author jumps from the list into the expression editor with the intent pinned above
  it.

### 5. Plain-language rendering

Because expressions are parsed (`20260825-cql-authoring.md`), logic renders back as readable text
with concept codes resolved to displays:

> **Appears when** the child is under 5 months **and** *Fever duration* is more than 3

- Shown on nodes (truncated), on conditional edges, and in full in the properties panel.
- Generated from the parse tree via a template per operator; concept and node references render as
  their display text.
- Falls back to the raw expression when the parse fails or an operator has no template — the
  fallback is **total, never partial**, because a half-rendered sentence is worse than none.
- Where an `intent` exists, both are shown, labelled distinctly: intent is what a person meant, the
  rendering is what the machine will do. Showing only one hides precisely the disagreement worth
  catching.

This is the cheapest teaching mechanism in the set: the sentence changes as the logic is edited, so
the mapping is learned by observation rather than instruction.

### 6. Snippet palette

Depends on `../../tricc_oo/feature/20260825-snippet-params-and-start-node.md`.

- Project snippets appear as a **second palette section**, below the node types, as insertable
  blocks with their authored description.
- Dropping one creates a `snippet` node and opens an argument form built from the declared
  `params` — each field labelled and explained from the parameter's own `description`, and typed by
  its declared `type` (a `concept` parameter gets the concept picker; an `expression` parameter gets
  the CQL editor).
- The node renders with its resolved arguments — `Measure temperature (axillary)` — not as an
  opaque call.
- **Extract to snippet**: select nodes, name the module, and the editor proposes parameters for
  values that look variable (literals in expressions, name fragments). Proposals are suggestions
  only; each is one click to reject.
- **Template linting:** a snippet template's expressions are parsed only when instantiated
  (`snippet-params` §5). The editor lints templates by binding each placeholder to a synthetic value
  of its declared type, so an author editing a module gets diagnostics without instantiating it.

Authors can save selections as project snippets. Sharing snippets *across* projects is out of scope
for v1 — it needs a distribution story, and the first question is whether snippets belong to a
project or to an organization, which nobody has answered.

### 7. Onboarding

- **First project**: a five-panel introduction to the layered model (§1), skippable, re-openable
  from Help. Not a click-through tour — the vocabulary is what people lack, not knowledge of where
  the buttons are.
- **First encounter with a node type**: its `Explanation.detail` shown expanded, collapsing to
  `short` afterwards. Per node type, remembered locally.
- **A glossary** of TRICC vocabulary — activity, process, intervention, repeat slot, snippet,
  concept class — reachable from anywhere and linked from every explanation.

No blocking modals, no forced tour. Every explanatory surface is dismissible and re-findable.

### 8. Validation messages that teach

Rewriting `20260825-activity-editor.md` §8 output to say what to do:

| Instead of | Say |
|-----------|-----|
| "Rhombus missing reference" | "This decision needs to know which earlier answer it checks. Pick the question whose answer decides this branch." |
| "Invalid expression" | The parse error, positioned, plus what was expected at that point. |
| "Select node has no options" | "This question offers nothing to choose. Add the possible answers." |
| "Unreachable node" | "Nothing leads here, so this will never be asked. Connect it, or delete it." |

Every message: what is wrong, why it matters clinically, and the next action. Where a fix is
mechanical, offer it as a button.

### 9. Translation via `.po`

Content localization exports to **gettext `.po`**, for translation on a dedicated platform rather
than in this tool.

- Export produces one `.po` per target language covering all localized content — labels, hints,
  help, option labels, intents — with `msgctxt` carrying activity and node identity, so translators
  have context and entries survive reordering.
- Import merges translations back, marking entries whose source changed since export
  (`#, fuzzy`).
- `tricc_oo` already carries `trad.po` and `locales/`, so this is the format the project uses.

A `linguist` role is deliberately **not** added: translation happens elsewhere, by people who will
never open this tool.

### 10. Code checklist

| Path | Purpose |
|------|---------|
| `packages/core/src/cards/` | Training-card corpus, keyed and translatable |
| `packages/core/src/cards/export.ts` | Deck + docs-site rendering (§3.3) |
| `packages/core/src/roles/` | Role model, field-visibility resolution |
| `packages/core/src/narrative/` | `intent` + `expression` codec, handoff collection |
| `packages/core/src/render/plain-language.ts` | Parse tree → readable sentence |
| `packages/core/src/i18n/po.ts` | `.po` export/import |
| `packages/editor/src/guidance/` | Explanation popovers, glossary, onboarding |
| `packages/editor/src/roles/` | Role selector, disclosure groups |
| `packages/editor/src/narrative/` | Intent editor, handoff work list |
| `packages/editor/src/snippets/` | Snippet palette, argument form, extract-to-snippet |

### 11. Tests

**Unit** — every node type, field descriptor, branch semantic and modifier has a card with `short`
and `purpose` (coverage assertion); the restated-name lint (§14.4) rejects a card whose `purpose`
merely echoes its label; card `seeAlso` ids all resolve; example fixtures render on the real canvas;
role→visibility resolution, including that no role makes a field unreachable; `intent`/`expression`
codec round-trip with string shorthand; handoff detection; plain-language rendering per operator,
with total fallback on parse failure; `.po` round-trip including `msgctxt` stability and fuzzy
marking; snippet argument-form generation from `params`.

**Component** — collapsed groups open in one step and persist per node type; intent and rendering
shown together and distinguishably; handoff list navigates with intent pinned; snippet drop
produces a typed argument form.

**E2E** — a `clinical` author builds an activity, writes intents without expressions, and is blocked
from export with the handoff list explaining why; a `technical` author resolves them and exports; a
snippet is inserted with parameters and appears correctly in the export; extract-to-snippet
proposes parameters and one is rejected.

### 12. Acceptance criteria

- [ ] Layer vocabulary throughout matches `../../tricc_oo/docs/visual-authoring-concepts.md`.
- [ ] Every drawable node type, field, branch semantic and modifier has a training card whose
      `purpose` states what it is for, not what it is named.
- [ ] Layer 1 is flyover-only; nothing beyond it appears uninvited.
- [ ] The card corpus renders as an exportable deck and into the `tricc_oo` docs site.
- [ ] Roles are multi-select, local, and never prevent an action — one step at most.
- [ ] Expressions carry a localized `intent`; either half may exist alone.
- [ ] Open handoffs are listed, navigable, and block export.
- [ ] Logic renders as plain language with concepts resolved, falling back wholly on parse failure.
- [ ] `intent` survives into generated CQL as a comment.
- [ ] Snippets appear beside the node palette with typed, explained argument forms.
- [ ] Snippet templates lint without instantiation.
- [ ] Content exports to and imports from `.po`.
- [ ] No validation message states only what is wrong.

### 13. Implementation phases

1. Training-card model, coverage test, flyover + card UI, glossary. **Content authoring runs in
   parallel and is on the critical path — see §14.5.**
2. Roles and progressive disclosure.
3. `intent` codec, editor, handoff list, export gate.
4. Plain-language rendering.
5. `.po` export/import.
6. Snippet palette and argument forms — **gated on `tricc_oo` snippet params landing**.
7. Extract-to-snippet.
8. Onboarding.

### 14. Open risk — the content is the project

This risk is about **writing the training cards**, not about building anything. The machinery to
show a card is a day's work. Filling the corpus is not, and it is the difference between a tool
that teaches and a tool that merely has a help system.

It is also unrelated to turning narrative into CQL — that is a separate capability with a separate
answer, specified in `20260825-assisted-authoring.md`.

#### 14.1 The inventory

Concretely, what has to be written:

| Category | Count | Source |
|----------|-------|--------|
| Node types | ~24 | `20260825-project-format.md` §4 drawable set |
| Snippet types | 2 | `snippet`, `snippet_start` |
| Field descriptors | ~38 | `20260825-activity-editor.md` §4, across all types |
| Edge branch semantics | 6 | `20260825-project-format.md` §5 |
| Node modifiers | 4 | hint, help, image, not-available |
| Glossary terms | ~18 | project, intervention, applicability, trigger, activity, process, repeat slot, version inheritance, concept class, snippet, … |
| **Total cards** | **~90** | |

At `short` + `purpose` + `whenToUse` + `example` — the minimum for a card to be worth opening —
that is roughly **270 pieces of clinical prose**, plus example diagram fixtures for the node types
that need one. This is a two-to-four week writing effort for someone who knows the domain, plus
review. It is not a task that fits alongside implementation.

#### 14.2 Why it cannot be delegated to developers

The failure is specific and predictable. A developer writing a card for `repeat` under time pressure
produces "Repeat: the repeat slot." That is worse than an empty card, because:

- it satisfies the coverage test, so nothing flags it;
- it costs the author a hover to learn nothing;
- after three of those, authors stop hovering — and the layer-1 surface, which is the whole
  strategy, is dead.

Useless help is not a neutral outcome. It actively destroys the mechanism.

The `pitfalls` field is the sharpest case: it can only be written by someone who has watched people
get it wrong. Nobody can derive from the model that authors routinely confuse a `rhombus` with a
question, or that they reach for a nested activity when they want a snippet.

#### 14.3 Why the cost is smaller than it looks

The reframing that matters: **this content has to exist anyway.**

TRICC authoring is currently taught in workshops, by people, repeatedly, from material that is
re-improvised or lives in slide decks outside the repository. §3.3 makes the card corpus render as
that workshop material, and into the `tricc_oo` docs site. So the choice is not "write 90 cards or
don't" — it is "write the training material once, in a form that is version-controlled, translated
through the existing `.po` pipeline, and delivered at the moment of need — or keep re-improvising
it per workshop and additionally have no in-tool help."

Framed that way it is a consolidation, not a new budget line.

#### 14.4 Mitigations

- **Land it in tiers.** `short` + `purpose` for every card is the coverage gate and is achievable
  quickly. `whenToUse`, `example`, `pitfalls` land per card, tracked, without blocking release.
- **Seed from what exists.** `../../tricc_oo/docs/tricc-elements.md` and
  `docs/visual-authoring-concepts.md` already carry much of the substance. It is written for
  developers and needs rewriting for authors, but it is not a blank page.
- **Harvest pitfalls from support.** Every question asked by an author, and every `fix/` spec whose
  root cause was authoring rather than a bug, is a `pitfalls` entry. Make that an explicit habit
  rather than hoping.
- **Review by someone who has taught it.** The one quality gate that works. A card nobody who has
  taught TRICC has read is a draft.
- **A lint for the obvious failure.** Reject a card whose `purpose` is the field name restated —
  crude (token overlap against the label, stop-worded) and it catches the laziest cases. It is a
  smoke alarm, not a quality measure.

#### 14.5 What is genuinely unresolved

Who writes it, and when. This spec cannot answer that, and implementation should not start on the
guidance features until it has an answer — building the delivery mechanism for content that never
arrives produces an interface full of empty popovers, which is worse than having shipped neither.

The specific ask: a named clinical author with TRICC teaching experience, and time budgeted in the
plan rather than assumed to be absorbed.
