# Shared expression languages in the editor (CQL and FEEL from tricc)

| Field             | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**        | Approved (2026-11-25, mirror of SwissTPH/tricc#98)                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Branch target** | `feature/lang-and-capabilities` → `develop`                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Scope**         | `@tricc/core` (pinned `lang/` copy, generated parsers, `@tricc/core/lang` entry, validation), `@tricc/editor` (CQL field lint), `tricc_oo` (cross-repo: the package's home)                                                                                                                                                                                                                                                                                                                                        |
| **Related**       | Mirror of `tricc/feature/20261125-expression-languages.md` (SwissTPH/tricc#98, phase 4). tricc-frontend#52 (block arguments as CQL text: its token rule is replaced by the parser). `20260825-cql-authoring.md` (the CQL profile; `presentCql` stays for highlighting). `20261120-decision-table-editor.md` (cells on the FEEL grammar). `20261014-answer-options-in-cql.md` (answer codes in conditions, unchanged). `20261125-output-capabilities.md` (statements name the catalogue's operators and functions). |
| **RFC**           | SwissTPH/tricc#98                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### The problem

The editor splits CQL into words and guesses; the build parses it with a full grammar. So the
editor accepts expressions the build refuses, and cannot tell reliably whether a block argument
is calculated or a fixed text. Decision-table cells are parsed by hand on each side.

### What changes for an author

- An expression is checked with the build's own grammar while it is typed. One that will not
  build is flagged with a message naming the construct ("A query is not supported in a form;
  read that data with a prefilled value.").
- Constructs the build now refuses (queries, retrieves, `union`, indexers, member access, units,
  plural precisions) are refused in new edits from the start.
- Whether a block argument is calculated (`AgeInDays()`, `"weight"`) or a fixed value
  (`axillary`, `'axillary'`, `38`) is decided by a real parse, the same as the build.
- Decision-table cells are read by the same FEEL grammar as the build.
- Highlighting does not change: the fast tokenizer still draws the chips.

### Out of scope

- New CQL or FEEL features. Running CQL. FEEL beyond cells.
- The decision-table editor itself (`20261120-decision-table-editor.md`): its `cell.ts` is on
  `feature/decision-table-editor`, not on `develop` (see §1.5).

---

## Part II — Technical specification

### 1. Design

**1.1 Pinned copy.** `packages/core/src/lang/` is a copy of tricc's `tricc_oo/lang/` (grammars,
`functions.json`, `meaning.json`, `errors.json`, `feel/cells.json`, `VERSION`, READMEs),
never edited here. `packages/core/src/lang/lang.lock.json` records it:

```json
{ "version": "1.0.0", "tricc_commit": "<sha>", "sha256": "<hex>" }
```

`sha256` is the hash of the folder: for each file (lock and `generated/` excluded), sorted by
path, the line `<path> <sha256 of its bytes>\n`, hashed as one text.

**1.2 Sync script.** `scripts/sync-lang.mjs` copies the folder from a tricc clone (`--from
../tricc`, its `HEAD`) or a commit of a tricc repository (`--ref <commit> --repo <path>`,
read with `git archive`), rewrites the lock, then regenerates the parsers. `--check` fails when
the folder does not match the lock (run by `pnpm lang:check` and a test).

**1.3 Generated TypeScript.** `scripts/generate-lang-parsers.mjs` runs the ANTLR 4.13.2 tool
(`-Dlanguage=TypeScript -visitor -no-listener`, Java; the jar from `ANTLR_JAR` or the antlr4-tools
cache) on `cql/tricc_cql.g4`, `feel/tricc_feel.g4` (lexer kept) and `feel/TriccFeelParser.g4`,
into `packages/core/src/lang/generated/`, committed. Each file starts with `// @ts-nocheck`
(generated code; the repository's strict options do not apply) and
`// tricc-lang <VERSION>`. The `antlr4@4.13.2` runtime declares a few names the generated code
imports (`DecisionState`, `TokenStream`) only as types, so the script moves them to an
`import type` (an ES module import of a missing name fails). `--check` regenerates into a temp
folder and fails on drift.
`@tricc/core` pins `antlr4` to exactly `4.13.2`.

**1.4 The `@tricc/core/lang` entry.** A package subpath (`exports["./lang"]`), so the main
entry does not load ANTLR; the editor imports it lazily (`import('@tricc/core/lang')`). It
exports:

- `parseCql(text)` → `{ ok, errors: CqlError[] }`; a `CqlError` has `code` (`E_CQL_SYNTAX` /
  `E_CQL_PROFILE`), `message`, `line`, `column`, `construct`. A construct outside the profile
  is named by the first token matching `errors.json` (the algorithm in its `description`).
- `isExpressionArg(arg)` and `literalValue(text)`: tricc_oo's rules, replacing #52's token rule.
- `cqlOperators(text)`: the `TriccOperator` names and catalogue functions an expression uses
  (for `20261125-output-capabilities.md`).
- `parseCell(cell, type)` / `cellMatches(test, value)`: decision-table cells on the FEEL
  grammar, with `E_DMN_CELL` / `E_DMN_TYPE`.
- `FUNCTIONS` (the catalogue), `LANG_VERSION`, `validateExpressions(project)`.

**1.5 Decision-table cells.** `parseCell` is the FEEL-grammar cell parser. When
`feature/decision-table-editor` lands, its `decision-table/cell.ts` delegates to it and its
tests read `lang/feel/cells.json` (the `__vectors__/cells.json` copy is deleted then). Until
then the vector is run here, on `parseCell`.

**1.6 Validation.** `validateProject(project, { lang })` takes the loaded `@tricc/core/lang`
module as an option. With it: every CQL field (`relevance`, `calculate`, `expression`,
`constraint`) and every expression argument of a call is parsed (`expression.cql`, error,
the message from `errors.json`), and a call argument that is an expression skips the value
check of its parameter type. Without it the rules are as before. The editor passes it once
loaded. `CqlExpressionField` shows the parser's errors under the field (the tokenizer's
wording for a plain syntax error it already names, such as a missing closing quote; the
tokenizer's messages until the parser is loaded); `presentCql` keeps the tokens and chips.

### 2. Validation and errors

| Rule             | Severity | When                                                                                                |
| ---------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `expression.cql` | error    | an expression does not parse with the TRICC profile; the message names the construct and the column |

### 3. Tests

- `lang.lock.json` matches the folder; `package.json` pins `antlr4` to `4.13.2`; the generated
  files carry the lock's version and "by ANTLR 4.13.2"; a fresh generation equals the committed
  files (skipped without Java).
- `meaning.json` through `isExpressionArg` and `literalValue`; `feel/cells.json` through
  `parseCell` / `cellMatches`; the profile's accepted and rejected constructs with their
  messages.
- `validateProject` with `lang`: an outside-profile expression and an expression argument.
- Editor: the CQL field shows the parser's message.

### 4. Phases

1. Copy, lock, sync script, generated TypeScript on `antlr4@4.13.2`.
2. `@tricc/core/lang`: parser API, meaning and cells vectors.
3. Validation option and the editor's lint.

---

## Open questions

None.

## Decisions

- 2026-11-25: Mirror of SwissTPH/tricc#98, approved there for implementation with #102 on one
  branch, frontend included (@delcroip).
