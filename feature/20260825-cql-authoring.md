# CQL Authoring — expression language, parser, editor, concept picker

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_frontend` — `@tricc/cql` (language tooling), `@tricc/editor` (components) |
| **Related** | `20260825-document-model.md` (expressions are `Y.Text`), `20260825-project-format.md` (where expressions live), `20260825-terminology.md` (concept source), `20260825-tricc-oo-interop.md` (§3 — the Python side must read this) |
| **Approval** | — |
| **Reference** | Spark Editor (docs.thespark.dev) — syntax highlighting, real-time error checking, terminology-backed autocomplete, split-screen data dictionary |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### What this is

Every place a guideline expresses logic — when a question appears, what a score adds up to, which
branch a decision takes — is written in **CQL** (Clinical Quality Language), the HL7 standard for
clinical logic. TRICC's own expression syntax is retired as an authoring surface.

The gain is that guideline logic becomes something reviewable by people outside this project.
CQL is what quality measures and clinical decision support are written in worldwide; a
ministry reviewer, an implementer, or a tool other than ours can read it.

### Writing with concepts, not codes

Clinical logic refers to concepts — "fever", "weight", "child is dehydrated". Precision demands
these be coded; readability demands they be named. The editor gives both.

Type a **double quote** and a picker opens, searching your project's concepts. Choose one and it is
inserted as a proper coded reference. From then on it displays as a small inline **chip** showing
the concept's name rather than its code. Hover it and a card summarizes the concept — its code,
system, data type, and where else the guideline uses it. Click the **(i)** and the concept's full
page opens in the terminology section.

So an author writes and reads:

> if **⟨Weight for age Z-score⟩** < -3 then **⟨Severe acute malnutrition⟩**

while the file on disk carries exact codes. Nothing is guessed by string matching, and nothing is
unreadable.

The double quote is not an arbitrary trigger: in CQL, a double-quoted name *is* how you refer to a
declared concept or a named expression. Typing `"` already means "I am about to name something",
so the picker appears precisely where the language expects a name.

### Real error checking

The editor parses CQL as you type using the official HL7 grammar. Errors are underlined where they
occur, with a real message — not "invalid expression" after a failed conversion an hour later.

### A deliberate restriction

The editor accepts a defined **subset** of CQL, called the TRICC profile.

The reason is concrete. TRICC exports to ODK/XLSForm, CHT, OpenMRS and DHIS2 as well as FHIR.
Those targets have no CQL engine — their logic is arithmetic and boolean expressions evaluated on a
phone, offline. CQL that can be mechanically rewritten into those forms is safe; CQL that cannot
(database queries, temporal joins, list comprehensions) would produce a guideline that works in
FHIR and silently breaks everywhere else.

So the editor tells you, as you type, when an expression has left the portable subset, and which
targets it would break. This keeps "CQL everywhere" from quietly becoming "FHIR only".

---

## Part II — Technical specification

### 1. Where CQL appears

| Location | Field |
|----------|-------|
| Node | `relevance`, `calculate`, `expression`, `constraint` |
| Node | `default` (constant expressions only) |
| Edge | `value`, when the branch type is Condition |
| Activity | `applicability` |
| Project | `cql/*.cql` — hand-written shared libraries |

Fields hold **expression fragments**, not whole libraries. The tooling wraps a fragment in a
synthesized library for parsing (§4.2); the author never sees the wrapper.

### 2. The TRICC CQL profile

A whitelist. Everything permitted maps onto a `TriccOperator`
(`../../tricc_oo/tricc_oo/models/base.py:402`), which is what keeps every export target reachable.

#### 2.1 Permitted

| CQL | `TriccOperator` |
|-----|-----------------|
| `and`, `or`, `not` | `AND`, `OR`, `NOT` |
| `=`, `!=`, `>`, `>=`, `<`, `<=` | `EQUAL`, `NOTEQUAL`, `MORE`, `MORE_OR_EQUAL`, `LESS`, `LESS_OR_EQUAL` |
| `between X and Y` | `BETWEEN` |
| `+`, `-`, `*`, `/`, `mod` | `PLUS`, `MINUS`, `MULTIPLIED`, `DIVIDED`, `MODULO` |
| `is null`, `is not null` | `ISNULL`, `ISNOTNULL` |
| `exists`, `not exists` | `EXISTS`, `NOTEXISTS` |
| `is true`, `is false` | `ISTRUE`, `ISFALSE` |
| `if c then a else b` | `IF` |
| `case … when … then … else … end` | `CASE` / `IFS` |
| `in`, `contains` | `SELECTED`, `CONTAINS` |
| `( … )` | `PARENTHESIS` |
| `Coalesce`, `Round`, `Abs`, `Min`, `Max`, `Sum`, `Count`, `Length` | matching operators |
| `Today`, `Now` | `TODAY`, `NOW` |
| `Matches`, `NormalizeSpace`, `FormatDate` | `MATCHES`, `NORMALIZE_SPACE`, `FORMAT_DATE` |
| `ToInteger`, `ToDecimal`, `ToDate`, `ToString`, `ToBoolean` | the `CAST_*` family |
| `&` / `+` on strings | `CONCATENATE` |

**TRICC domain functions**, declared in a generated helper library so they are ordinary,
well-formed CQL:

```cql
define function Zscore(table String, sex String, x Decimal, y Decimal) returns Decimal
define function Izscore(table String, sex String, x Decimal, z Decimal) returns Decimal
define function AgeInDays() returns Integer
define function AgeInMonths() returns Integer
define function AgeInYears() returns Integer
define function DrugDosage(drug String, params List<Decimal>) returns Decimal
define function GetRepeatedValue(concept String, slot Integer) returns Any
define function GetInheritedValue(concept String) returns Any
define function HasQualifier(concept Concept, qualifier Concept) returns Boolean
define function Selected(question Any, options List<Concept>) returns Boolean
define function CountSelected(question Any) returns Integer
define function DiagnosisList() returns List<Concept>
```

`GetRepeatedValue`'s `slot` must be an integer literal — the value is resolved while the graph is
built, before any answer exists (`../../tricc_oo/docs/tricc-elements.md`). The linter enforces
this, since a variable slot parses fine and fails much later.

#### 2.2 Rejected in v1

Retrieves (`[Observation: "Weight"]`), queries (`from … where … return`), `let`, list
comprehensions and aggregates, intervals beyond `between`, timing phrases (`during`, `overlaps`),
`Message`, and any user-defined function outside project libraries.

Retrieves are the notable one: they are how CQL normally reads clinical data, and TRICC's
equivalent is the `populate` node, which is declarative and works on every target. The linter
says so by name when it sees a retrieve, and offers to create the `populate` node.

#### 2.3 Diagnostics

| Level | Meaning |
|-------|---------|
| Error | Not valid CQL, or an unresolvable reference. Blocks export. |
| Profile violation | Valid CQL, outside the profile. Blocks export; message names the construct and the targets that would break. |
| Warning | Valid and in-profile but suspect — comparing a select to a number, unused declaration, integer division where decimal was likely meant. |

### 3. Editor: CodeMirror 6

Chosen over Monaco because the core requirement is **inline replaced widgets** — concept
references rendering as chips inside the text. CodeMirror's `Decoration.replace` with a widget is
a first-class, documented mechanism; Monaco's equivalent needs view zones and overlay positioning
that fights the layout. CodeMirror is also roughly a fifth of Monaco's bundle and needs no worker
plumbing under Vite, which matters for an offline-capable app.

Cost of the choice, stated plainly: Monaco has a richer out-of-the-box language-service surface. We
are writing the language service ourselves regardless, so that advantage does not apply here.

Every expression field is backed by a `Y.Text` (`20260825-document-model.md` §3), bound to
CodeMirror through `y-codemirror.next`. Two authors editing one expression therefore merge
character by character rather than one silently overwriting the other — the case where
last-write-wins is least acceptable, because a partially-overwritten expression can still parse.
Locally this is inert; the binding costs nothing and removes a later retrofit.

Extensions:

- Syntax highlighting via a `StreamLanguage` tokenizer (§4.1)
- Concept and reference completion (§5)
- Inline concept chips (§6)
- Diagnostics as `lint` markers, debounced 250 ms
- Hover cards (§6.2)
- Bracket matching, auto-indent, single- and multi-line modes

### 4. Parsing

#### 4.1 Two-tier

| Tier | Tool | Purpose | Budget |
|------|------|---------|--------|
| Tokens | CodeMirror `StreamLanguage` | Highlighting, bracket matching, completion context | every keystroke |
| Full parse | ANTLR-generated CQL parser | Diagnostics, reference resolution, profile check, `TriccOperation` mapping | debounced 250 ms |

A single ANTLR parse on every keystroke is affordable for short fragments but not for a 400-line
project library, and highlighting must never lag. Hence the split.

#### 4.2 ANTLR

The grammar is the official `Cql.g4` from `cqframework/clinical_quality_language`, vendored at a
pinned version under `packages/cql/src/grammar/` with its provenance and version recorded. Generated to
TypeScript with **`antlr4ng`** at build time via a `pregenerate` script; generated output is
committed so a clean `npm ci` needs no Java.

Using the official grammar rather than hand-writing a parser matters here: `tricc_oo` already
depends on ANTLR (`requirements.txt`), so both sides can be driven by the same grammar file, and
the frontend cannot drift into accepting a dialect the Python side rejects.

Fragments are parsed by synthesizing a library:

```cql
library __fragment version '1.0.0'
using FHIR version '4.0.1'
include TriccHelpers version '1.0.0' called Tricc
<generated codesystem / code / concept declarations>
<generated node-value defines>
define __expr: <the author's fragment>
```

Positions in diagnostics are mapped back to fragment coordinates before display. Off-by-one here
is the classic defect, so §9 tests it directly.

#### 4.3 Mapping to `TriccOperation`

`packages/cql/src/tricc/` walks the parse tree and produces a `TriccOperation` tree in the shape
`../../tricc_oo/tricc_oo/models/base.py` defines. It exists in the frontend for two reasons: it
*is* the profile check (anything unmappable is a violation), and it lets the editor show the
author what their CQL becomes.

The frontend does **not** serialize `TriccOperation` into the project file — the file carries CQL,
and `tricc_oo` does its own mapping (`20260825-tricc-oo-interop.md` §3). Both implementations are
validated against a **shared fixture corpus** of CQL-to-`TriccOperation` pairs, checked into this
repo and consumed by both test suites. Two independent implementations of the same mapping
diverge unless something forces them not to; the corpus is that thing.

### 5. Completion

Triggered by `"`, by Ctrl+Space, and after `.`.

Four kinds, visually distinguished:

| Kind | Source | Inserted |
|------|--------|----------|
| **Concept** | project CodeSystem | `"<concept name>"` + declaration if new |
| **Node** | nodes in scope | `"<node name>"` |
| **Function** | TRICC helpers + profile functions | `Name(…)` with signature |
| **Define** | project libraries | `"<define name>"` |

"In scope" for nodes means: reachable predecessors in this activity, plus nodes in earlier
activities of the same intervention, plus `populate` nodes. Offering an unreachable node produces
logic that never evaluates.

Each entry shows kind, display text, code, and data type. Selecting a concept not yet declared in
the fragment's header adds the `code`/`concept` declaration automatically — the author never
hand-writes a declaration block.

### 6. Concept chips

#### 6.1 Rendering

A resolved concept reference is replaced by a widget:

- the concept's display, **truncated to 50 characters** with an ellipsis
- a subtle background and a leading terminology glyph
- an **(i)** affordance on hover
- an unresolved code renders as an error-styled chip showing the raw code

The underlying document text is unchanged — chips are a view decoration. Placing the cursor inside
one reveals the raw `"Name"` text for editing, so nothing is trapped behind the widget and
copy/paste yields plain CQL.

A toggle switches all chips to raw text for the whole editor, because someone reviewing a diff or
pasting into another tool needs the literal source.

#### 6.2 Hover card

Display (full, untruncated), code, system, version, data type, concept type, definition, and
"used in *N* places" with links.

#### 6.3 (i) navigation

Opens the concept page at `/concepts/:system/:code`
(`20260825-terminology.md` §4) in a side panel, or in a new tab on modified click. Editor state is
preserved — navigation must never discard a half-written expression.

### 7. Library generation

The project keeps hand-written libraries under `cql/`. On export, the frontend emits, per activity:
a library header with `codesystem`/`code`/`concept` declarations for every referenced concept, a
`define` per node value, and the author's fragments as defines.

This generated output is a **rendering of the project, never a source of truth** — it is
regenerated wholesale and never hand-edited. The authoritative logic is the fragments in the
activity YAML. (`tricc_oo` also generates CQL for FHIR/OpenSRP from its own pipeline; the
frontend's generation is for review and for tools that want a library without running the Python.)

### 8. Code checklist

| Path | Purpose |
|------|---------|
| `packages/cql/src/grammar/` | Vendored `Cql.g4` + generated parser |
| `packages/cql/src/parse/` | Fragment wrapping, parse, position mapping |
| `packages/cql/src/resolve/` | Reference resolution (concepts, nodes, defines, functions) |
| `packages/cql/src/profile/` | Profile whitelist + violation diagnostics |
| `packages/cql/src/tricc/` | `TriccOperation` mapping |
| `packages/cql/src/helpers/` | TRICC helper function declarations |
| `packages/cql/src/editor/` | CodeMirror extensions: highlight, complete, lint, chips, hover |
| `packages/cql/src/generate/` | Library emission |
| `packages/editor/src/cql/EdgeLogicEditor.tsx` | **Deleted.** Prototype's plain textarea. |

### 9. Tests

**Unit**

- Parse: every profile construct in §2.1 parses; every §2.2 construct is detected as a violation
  with the right message.
- **Position mapping** — a syntax error at fragment offset *n* reports offset *n*, verified across
  multi-line fragments and fragments whose generated header length varies. Explicit, because this
  is where such tooling usually breaks.
- Resolution: concepts, node names, defines, ambiguity, unresolvable references.
- Scope: unreachable nodes are not offered; predecessors and earlier-activity nodes are.
- `GetRepeatedValue` with a non-literal slot is an error.
- **Shared corpus** — every CQL/`TriccOperation` pair in `packages/cql/src/__fixtures__/corpus/` maps
  correctly. The same corpus is consumed by `tricc_oo`'s tests.

**Component**

- Typing `"` opens the picker; selecting inserts the reference and adds the declaration.
- Chips render truncated display; cursor entry reveals raw text; toggle switches globally.
- Hover card content; (i) navigates and preserves editor state.
- Diagnostics appear at the right offsets with the right severities.

**E2E**

- Author a relevance expression entirely through the picker, save, reopen, confirm chips.
- Type an out-of-profile retrieve; confirm the diagnostic names the affected targets and offers
  the `populate` alternative.
- Confirm export is blocked while an error or violation is present.

**Collaboration** — two documents editing one expression concurrently converge with no lost
characters; chip decorations survive remote edits; undo reverses only local changes.

**Performance** — a 400-line library keeps highlighting under 16 ms per keystroke and full
diagnostics under 250 ms.

### 10. Acceptance criteria

- [ ] All expression fields are CQL; the TRICC expression syntax is gone from the authoring UI.
- [ ] Parsing uses the official HL7 grammar at a pinned, recorded version.
- [ ] Errors and profile violations appear inline with accurate positions and actionable text.
- [ ] `"` opens a picker over concepts, nodes, functions and defines.
- [ ] Concept references render as chips (50-char display, hover card, (i) to the concept page)
      and can be toggled to raw text.
- [ ] Choosing a concept auto-adds its declaration.
- [ ] Every profile construct maps to a `TriccOperation`, verified by the shared corpus.
- [ ] Out-of-profile CQL blocks export and names the targets it would break.

### 11. Implementation phases

1. Vendor grammar, generate parser, fragment wrapping, position mapping.
2. Tokenizer + highlighting.
3. Resolution + diagnostics.
4. Profile check + `TriccOperation` mapping + corpus.
5. Completion including the `"` trigger.
6. Chips, hover cards, (i) navigation.
7. Library generation.
8. Performance pass.

### 12. Open risk

**Two implementations of one mapping.** The frontend maps CQL → `TriccOperation` in TypeScript;
`tricc_oo` will map the same CQL in Python. Divergence produces the worst possible failure — an
expression that lints clean and converts wrong. The shared fixture corpus is the mitigation, and it
is only a mitigation while both suites actually run it. `20260825-tricc-oo-interop.md` §6 makes
consuming the corpus a condition of that spec's acceptance.

A single implementation would be better. The realistic options are compiling the Python mapper to
WASM, or having the frontend emit `TriccOperation` JSON alongside the CQL and letting `tricc_oo`
trust it. Both were considered and rejected for v1 — the first is heavy and awkward to debug, the
second reintroduces a second source of truth in the file format, which is exactly what choosing
"CQL everywhere" was meant to eliminate. Worth revisiting if the corpus starts catching real
divergences.
