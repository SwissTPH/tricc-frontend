# Answers in CQL: shown by name, and imported from drawings

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_frontend` — `@tricc/core` (draw.io import), `@tricc/editor` (CQL display); `tricc_oo` only if §2 option B is chosen |
| **Source** | Patrick, 2026-10-14: "support options in the CQL rendering; maybe we need to simply write them as double quotes (import update required)" |
| **Related** | `20260825-cql-authoring.md` (unbuilt parser), `20261008-drawio-import-and-sequence-nodes.md`, `20261014-none-answer-repeat-instance.md` |
| **Decisions** | — (§2 is open) |
| **Approval** | — |

## Part I — What the author sees

Today a condition such as `"fever_type" = 'fever_type.2'` shows the question as a chip
("Type of fever") and the answer as raw text (`'fever_type.2'`). After this change the answer is a
chip too, showing the answer's label ("Intermittent"), with the same hover card as a question. An
answer code that the question does not have is a red chip, like an unknown question.

Drawings imported from draw.io keep their conditions. Today the condition (relevance) on every
node except the start is dropped on import, so an imported guideline silently loses when its
questions are asked. Conditions written the old way (`${fever}='yes'`,
`selected(${symptom}, 'fever')`) are rewritten to CQL on import, so they show as chips and
tricc_oo reads them the same way.

## Part II — Technical specification

### 1. Current state (checked 2026-10-14)

- `presentCql` (`packages/editor/src/cql/present.ts:69-100`) chips only double-quoted names. A
  single-quoted string is a `text` token.
- `expressionNames` (`packages/editor/src/cql/names.ts:28-70`) keys nodes by name and concept
  code, then every concept of every CodeSystem by bare code. An answer concept therefore
  **already** chips if written `"etat.r.001.1"`, but with no question context and no "Show
  question".
- The only option reference the editor writes is the edge value `Answer('code')`
  (`activity/canvas/answer.ts`). It has its own caption path (`answerEdgeCaption`).
- draw.io import (`packages/core/src/format/drawio.ts:358-362`) reads `relevance` only on `start` and
  `activity_start`. `reference` and `calculate` are copied verbatim (380-385). Real drawings
  use both `"q" = 'opt'` / `'opt' in "q"` and XPath `${q}='opt'` / `selected(${q}, 'opt')`.
- `tricc_oo` (`converters/cql_to_operation.py`): `"x"` is a node reference, `'x'` a static value,
  and `A in B` is `SELECTED(B, A)`. Its canonical answer form is `'<code>' in "<question>"`
  (`answer_edge_condition`, `xpath_to_cql.py:250`).

### 2. How an answer is written in an expression (open)

**A. Keep single quotes, resolve in context (recommended).** The stored CQL is unchanged. The
display recognises a string literal in these positions and resolves it against that question's
options:

| Pattern | Example |
|---|---|
| `"q" = 'x'`, `"q" != 'x'`, `'x' = "q"` | `"hiv_stat" = '1'` |
| `'x' in "q"`, `"q" contains 'x'` | `'Gliclazide' in "dm_drugs"` |
| `Answer('x')` (edge value) | already labelled; reuse the same lookup |

- Pros: no format change, no `tricc_oo` change, existing drawings and YAML render at once.
  Answers resolve within their question, so generic codes (`yes`, `1`, `other`) are unambiguous.
- Cons: the display needs a small amount of context (the neighbouring tokens), not only the
  tokenizer.

**B. Write answers in double quotes** (`"q" = "x"`, `"x" in "q"`), as suggested.

- Already chips through the concept loop.
- Needs an import rewrite of every option literal, and a `tricc_oo` change: a `TriccReference`
  that is compared with a select must resolve to one of that select's options, not to a node.
- A bare `"yes"` is ambiguous between answer concepts of different questions, and with a node
  named `yes`. Resolution has to use the compared question anyway, so B needs A's context rule as
  well, plus the format change.

The recommendation is A. If B is wanted for consistency ("everything coded is double-quoted"),
build A's resolution first and add B's import rewrite and the `tricc_oo` resolver on top.

### 3. Display (option A)

- `presentCql` gains a token kind `answer` `{ code, question }`, produced by a pass over the token
  list that matches the patterns in §2 (ignoring whitespace tokens).
- `expressionNames` adds, per select node, `options` (code to label, `is_none` flag). Answer
  codes are the option `name`, else the concept code, else the id, the same as `answerCode`
  in `answer.ts`.
- `NameChip` renders `answer` with the answer label. The card shows the answer and its question,
  with "Show question". Unknown code: error style, message "`'x'` is not an answer of
  *question*".
- `renderCqlLabels` (canvas and edge list) uses the same pass, so a canvas condition reads
  `Type of fever = Intermittent`.

### 4. draw.io import

1. Read `relevance` on every node type that has the field (`NODE_FIELDS` `expression`), not only
   on roots. Roots keep the lift to the activity's applicability.
2. Normalise legacy syntax in `relevance`, `calculate`, `reference` and edge labels with a
   port of `tricc_oo`'s `xpath_to_cql.py` (the subset found in drawings):
   `${q}` to `"q"`; `selected(${q}, 'x')` to `'x' in "q"`; `count-selected(${q})` to
   `CountSelected("q")`; `=`/`!=`, `and`/`or`/`not()` unchanged.
   An expression that does not convert is kept verbatim with a validation warning
   `expression.legacy-syntax`, never dropped.
3. Quote escaping: the frontend doubles quotes (`''`); `tricc_oo` `quoted_literal` writes `\'`.
   Its parser accepts both in `Answer(...)`. Confirm that `cql_to_operation` accepts `''` in
   plain literals too, and add a `tricc_oo` test if not.

No migration of existing projects (no production content). The import change applies to new
imports and to `.drawio` files listed in `tricc.yaml`, which are re-read on every open.

### 5. Tests

- core: `drawio.test.ts` relevance on a question, a calculate and a rhombus; each legacy form in
  §4.2 and one that does not convert.
- editor: `present.test.ts` for each §2 pattern, unknown answer, an answer of a different
  question; `names.test.ts` options index.
- e2e: import a drawing with `selected(${symptom}, 'fever')` on a question's relevance; the
  relevance field shows two chips "Symptoms" and "Fever".

### 6. Phases

1. Import keeps non-root `relevance` (data loss today; small, independent).
2. Answer chips (§3).
3. Legacy syntax normalisation (§4.2).
