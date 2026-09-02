# Assisted Authoring — LLM help turning narrative into CQL

| Field | Value |
|-------|-------|
| **Status** | Draft — **post-v1; data-egress decision unresolved, see §8** |
| **Repo** | `tricc_frontend` — `@tricc/core` (port), `@tricc/cql`, `@tricc/editor` |
| **Related** | `20260825-guided-authoring.md` (`intent`, the handoff work list), `20260825-cql-authoring.md` (profile, parser, resolution), `20260825-terminology.md` (the concept dictionary), `20260825-library-architecture.md` (ports) |
| **Approval** | — |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### What this is

The clinician writes what a piece of logic should do:

> *Only ask about convulsions for children under five who have had fever for more than three days.*

An assistant proposes the CQL:

```cql
AgeInMonths() < 60 and "Fever duration in days" > 3
```

The author reviews it, edits it, accepts or discards it. Nothing is applied without that.

### Why this is worth doing

`20260825-guided-authoring.md` establishes the clinician/IT handoff: intent in words from one
person, expression in CQL from another. That is a genuine improvement on today, and it still leaves
a clinician blocked whenever an IT specialist is not available.

This is the narrow, high-value case for assistance. Not "generate a guideline" — a guideline is a
clinical artefact and generating one would be reckless. Just: *this author has already stated
precisely what they want, in their own words, and translating that specific sentence into a formal
expression is a mechanical skill they lack and a machine has.*

The scope is deliberately confined to **expression fields**. Nothing else.

### Why it is safe enough to attempt

Three properties of this particular problem make it far less risky than LLM assistance usually is:

- **The output is checkable.** A proposal is parsed against the official CQL grammar, resolved
  against the project's real concepts and node names, and validated against the portable TRICC
  profile before an author ever sees it. A proposal that does not survive that is discarded
  silently, not shown. The assistant cannot make the tool accept something it would otherwise
  reject.
- **The input is grounded.** The assistant is given the project's actual concept dictionary and the
  actual nodes in scope. It is not guessing at what a concept might be called; wrong references
  fail resolution and the proposal is dropped.
- **The author is a domain expert with the intent in front of them.** They wrote the sentence. They
  are the right reviewer for whether the expression matches it, and the plain-language rendering
  (`guided-authoring` §5) shows them what the proposal actually does, independently of what the
  assistant claims.

### What it will not do

- Not auto-apply. Ever. A proposal is a suggestion in a review surface.
- Not author clinical content — no questions, no diagnoses, no thresholds it invented.
- Not required. The tool is fully usable with assistance disabled, and it is disabled by default.
- Not a substitute for the IT specialist on anything the profile check cannot verify.

### Your guideline content, and where it goes

Using a hosted assistant means sending the intent sentence and the relevant concept names to a
third party. Guidelines are frequently unpublished ministry content, and that is a decision for the
guideline's owner — not a default.

So: **off unless switched on, per project**, with a plain statement of exactly what would be sent
and to whom, and support for a model running on your own machine so the question does not arise.

---

## Part II — Technical specification

### 1. Scope

| In | Out |
|----|-----|
| `intent` → CQL proposal for one expression field | Generating nodes, activities or guidelines |
| CQL → draft `intent` (the reverse) | Editing the project directly |
| Explaining why a proposal was rejected | Anything outside expression fields |
| Local and hosted model backends | Bundling or hosting a model |

### 2. `AssistancePort`

```ts
interface AssistancePort {
  readonly available: boolean
  readonly describe: () => { provider: string; local: boolean; sends: string[] }
  proposeExpression(req: ExpressionRequest): Promise<Proposal[]>
  proposeIntent(req: IntentRequest): Promise<LocalizedText | undefined>
}

interface ExpressionRequest {
  intent: string
  field: 'relevance' | 'calculate' | 'expression' | 'constraint' | 'edgeCondition'
  scope: {
    concepts: ConceptSummary[]      // only concepts plausibly relevant, see §4
    nodes: NodeSummary[]            // nodes in scope, with names and data types
    functions: FunctionSignature[]  // the TRICC helper functions
  }
  language: string
}

interface Proposal {
  cql: string
  confidence?: number
  notes?: string                    // shown, never trusted
  rendering: string                 // plain-language, computed locally from the parse tree
}
```

Adapters: `LocalModelAssistance` (Ollama or similar, via a configured URL),
`HostedModelAssistance`, `McpAssistance` (§5). `NoAssistance` is the default and is not a stub —
it is the shipped behaviour.

### 3. The validation gate

**Every proposal passes through the full local pipeline before it is shown**, using the same code
as hand-typed CQL — never a relaxed variant:

```
proposal → parse (Cql.g4)  → resolve (concepts, nodes, defines)
         → profile check   → TriccOperation mapping
         → plain-language rendering
```

- Fails parse → discarded, not shown.
- Fails resolution → discarded, with the unresolved name recorded for §7.
- Outside the TRICC profile → discarded. The assistant cannot introduce a retrieve or a query that
  would break the ODK/CHT/OpenMRS/DHIS2 targets.
- Survives → shown **with its plain-language rendering**, computed locally from the parse tree.

That last point is the crux of the review surface. The author compares three things: the intent
they wrote, the CQL proposed, and what the tool says the CQL actually does — where the third is
derived by our parser, not asserted by the model. A proposal that renders as something other than
the intent is visibly wrong without the author needing to read CQL.

Up to three surviving proposals are offered, deduplicated by their `TriccOperation` tree so
cosmetic variants do not fill the list.

### 4. Grounding

Quality here is mostly a function of context, not of model:

- **Concepts** — a shortlist from the terminology search index (`20260825-terminology.md` §3) run
  over the intent text, not the whole dictionary. Sending 50 000 concepts is neither affordable nor
  effective; sending the 20 that match the intent's terms is both.
- **Nodes in scope** — reachable predecessors, earlier activities in the intervention, and
  `populate` nodes, with names and data types. Identical to the completion scope
  (`20260825-cql-authoring.md` §5), so a proposal cannot reference something the author could not.
- **Functions** — the TRICC helper signatures, which is how `AgeInMonths()` gets proposed rather
  than invented date arithmetic.
- **Profile** — the permitted construct list, stated as a constraint.
- **Few-shot examples** — drawn from the shared CQL corpus (`20260825-cql-authoring.md` §9), so the
  examples are the same pairs both implementations are tested against.

### 5. MCP

Exposing the project's terminology and node scope through an **MCP server** is the more flexible
shape, and it is what makes the feature useful beyond this tool: any MCP-capable assistant — an
IDE, a chat client, an agent — can then reason about the guideline with correct concept codes.

`@tricc/mcp` (a fifth package, private until the surface settles) would expose read-only tools:

| Tool | Returns |
|------|---------|
| `search_concepts(query, dataType?)` | Concept matches from the project dictionary |
| `lookup_concept(system, code)` | Full concept detail |
| `nodes_in_scope(activityId, nodeId)` | Referenceable nodes with names and types |
| `cql_profile()` | Permitted constructs and helper signatures |
| `validate_cql(fragment, scope)` | Parse + resolve + profile result — the §3 gate, callable |
| `explain_cql(fragment, scope)` | Plain-language rendering |

`validate_cql` is the valuable one: it lets an external assistant check its own work against the
real grammar and the real dictionary before proposing anything, rather than guessing.

**Read-only, deliberately.** No `write_node`, no `set_expression`. An assistant proposes; a human
applies. Making the MCP surface mutable would move the accept decision out of the review UI, which
is the one place it belongs.

Open question: whether the MCP server runs in the browser (unusual, needs a transport shim) or as
part of the same local companion helper proposed for preview (`20260825-preview.md` §2). The
companion is the more natural host, and sharing it would mean one optional local process rather
than two.

### 6. Review surface

In the expression editor, beside the intent:

- "Suggest expression" — explicit, never automatic, never on typing.
- Proposals listed with CQL, its local plain-language rendering, and a diff against whatever is
  currently in the field.
- Accept inserts it into the editor **for editing** — accepting is not committing, and the author
  lands with a cursor in the expression, not with a closed dialog.
- Discarding records nothing about the author and does not retry.
- Every accepted proposal is marked in the document as assisted (`assisted: true` on that
  expression's metadata) — so a reviewer can find every expression that came from a model, and so
  the honest question "which of these did a machine write?" has an answer. Cleared when the
  expression is subsequently hand-edited.

### 7. The reverse direction

`proposeIntent` drafts an `intent` from an existing expression, for the substantial body of
guidelines that will arrive with logic and no narrative.

Lower risk — it cannot change semantics — and genuinely useful for migration. It is also clearly
distinguished in the UI as a draft for the clinician to correct, never presented as the clinical
intent of record. The deterministic plain-language rendering already exists
(`guided-authoring` §5); this is the readable-prose version of the same thing, and where they
disagree the deterministic one is authoritative.

### 8. Unresolved — data egress

**Not for this spec to decide.** The questions, stated so they are decided rather than defaulted:

1. Is sending intent text and concept names to a hosted model ever acceptable for this content, or
   is local-model-only the standing policy?
2. If hosted is permitted, whose decision is it per project — the tool's operator, or the
   guideline's owner?
3. Does an accepted proposal need recording beyond the `assisted` flag — a provenance entry naming
   the model and version?

Until these are answered, only `LocalModelAssistance` should be implemented. It sidesteps all three
and is sufficient to prove whether the feature is any good.

### 9. Code checklist

| Path | Purpose |
|------|---------|
| `packages/core/src/ports/assistance.ts` | `AssistancePort`, request/proposal types |
| `packages/core/src/assist/scope.ts` | Grounding: concept shortlist, node scope, few-shot selection |
| `packages/core/src/assist/gate.ts` | The §3 validation pipeline |
| `packages/cql/src/render/` | Plain-language rendering (shared with `guided-authoring` §5) |
| `packages/editor/src/assist/` | Suggest control, proposal list, diff, accept-into-editor |
| `packages/adapters-local/src/assist/local-model.ts` | `LocalModelAssistance` |
| `packages/mcp/` | `@tricc/mcp`, if §5 proceeds |

### 10. Tests

**Unit** — the gate discards unparseable, unresolvable and out-of-profile proposals, using the same
code path as hand-typed CQL (asserted by shared fixtures, not a parallel implementation);
deduplication by `TriccOperation` tree; concept shortlisting returns relevant concepts for a set of
intent sentences; node scope matches completion scope exactly.

**Component** — proposals show CQL, local rendering and diff; accept inserts for editing and does
not commit; `assisted` is set on accept and cleared on hand-edit; with `NoAssistance` the entire
surface is absent, not disabled.

**Contract** — a recorded-fixture backend replays model responses, including deliberately bad ones
(invalid syntax, hallucinated concept, a retrieve), asserting each is discarded and never reaches
the author.

**No test asserts proposal quality.** It is not deterministic and a test that pretends otherwise
would be noise. Quality is measured out-of-band against a held-out set of intent/expression pairs
harvested from real guidelines, reported rather than gated.

### 11. Acceptance criteria

- [ ] Assistance is off by default and its absence removes the surface entirely.
- [ ] Every proposal passes the same parse/resolve/profile pipeline as hand-typed CQL.
- [ ] Proposals failing any stage are never shown.
- [ ] Every proposal is shown with a locally-computed plain-language rendering.
- [ ] Nothing is applied without explicit acceptance; accepting opens for editing.
- [ ] Accepted proposals are marked `assisted` and the mark clears on hand-edit.
- [ ] `describe()` states exactly what would be sent and to whom, before anything is sent.
- [ ] A local model backend works with no network egress.
- [ ] Scope offered to the model never exceeds what completion offers the author.

### 12. Phasing

Post-v1. Nothing here is on the critical path, and the feature is worth attempting only once
`intent` (`guided-authoring` §4) is real and guidelines exist that use it — the training signal for
whether this works at all is a corpus of intent/expression pairs, which does not exist yet.

1. `AssistancePort`, grounding, the validation gate — testable with a recorded backend, no model.
2. Review surface.
3. `LocalModelAssistance`.
4. Quality measurement against harvested pairs.
5. `proposeIntent`.
6. `@tricc/mcp`, if §5's hosting question resolves.
7. Hosted backends — **blocked on §8**.

### 13. Open risk

**Plausible-but-wrong expressions are the whole danger.** The gate catches invalid, unresolvable
and unportable CQL. It cannot catch CQL that is valid, resolvable, portable and clinically wrong —
`< 60` where the intent meant `<= 60`, or the right comparison against the wrong concept where both
concepts exist.

The mitigations are the plain-language rendering shown beside the intent, and the author being a
domain expert reviewing their own sentence. Neither is a guarantee. The honest position is that this
shifts some review burden onto the clinician, and it is worth doing only because the alternative
today is that the expression does not get written at all until an IT specialist is free.

If the harvested-pairs measurement (§10) shows a meaningful rate of plausible-but-wrong proposals
surviving to acceptance, this feature should be withdrawn rather than tuned. That threshold should
be agreed before it ships, not after.
