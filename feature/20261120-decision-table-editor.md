# Decision table editor

| Field             | Value                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | Implemented (2026-11-20, RFC #51, issue #54)                                                                                                                                                                                                                                                                                                                   |
| **RFC**           | [#51](https://github.com/SwissTPH/tricc-frontend/issues/51)                                                                                                                                                                                                                                                                                                    |
| **Branch target** | `feature/decision-table-editor` → `develop`                                                                                                                                                                                                                                                                                                                    |
| **Scope**         | `@tricc/core` (project format, table model), `@tricc/editor` (table view), `@tricc/editor` `cql/` (`DMN` completion and checks), `tricc_oo` (cross-repo)                                                                                                                                                                                                       |
| **Related**       | `tricc/feature/20261118-decision-tables.md` (the format and the export; mirror on approval), `20260825-project-format.md` (new `tables/` folder and `tricc.yaml` keys), `20260825-cql-authoring.md` (function completion), `20261008-data-dictionary-and-concept-texts.md` (concept picker), `20261108-preferences-layout.md` (aliases in project preferences) |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### The problem

Dosing tables are authored in JavaScript outside DrawTRICC (`drugs.js` in the Global
Almanach, 31 drugs called through `DrugDosage(...)`). Clinicians cannot read or review them, a
change needs a developer, and the git diff of a dose change is a code diff. Only CHT can run
them, so other exports have no dose.

### What changes for an author

- A **Tables** section in the project lists the decision tables (`tables/*.yaml`), with search.
- A table opens in a grid:
  - **Input columns**: pick a concept from the data dictionary for each, or give only a name
    and a type (the call then always passes the value); drag to reorder (the order is the
    argument order of `DMN()`); the type comes from the concept when there is one.
  - **Output columns**: a name and a type (text, number, yes/no), or a concept.
  - **Hit policy** (how matching rows give the result), chosen in the table header:
    - **First**: the first matching row, from the top; row order matters (the default).
    - **Unique**: at most one row may match; order does not matter, and rows that can both
      match are flagged.
    - **List** (DMN "rule order"): every matching row, in row order. Counting rows, "does any
      row match" or adding scores are done on the list in the expression (`Count`, `exists`,
      `Sum`).
  - **Rows**: drag to reorder. Input
    cells use the DMN (FEEL) notation for simple tests, the same as in the `tricc` spec (see
    Part II): `-` (any), `null` (empty), a comparison (`>= 20`), a range (`[3..6)`), a value
    or a list. Invalid cells are underlined with the reason.
  - A **test panel**: enter input values, see every matching row, which one the hit policy
    keeps, and the result.
- In any expression field, `DMN('` completes table names, then shows the input columns as
  argument hints; a wrong table name or argument count is an error in place. `DMN` uses the
  table's hit policy; `DMNFirst` and `DMNList` override it for one call (for example the
  list of all matching rows of a table that is "first" by default).
- Project preferences list **aliases** (`DrugDosage` → `DMN(table, age, weight)`), so
  existing `DrugDosage('diazepam', age, weight)` calls keep working.
- **Migrating `drugs.js`**: the `tricc` migration tool writes one table per drug (weight rows,
  then age rows); DrawTRICC opens them, and saving an unchanged table leaves the file
  unchanged.
- **Import / export**: CSV and XLSX (one row per rule), DMN XML (decision tables only).

Example: diazepam, rectal (ml), weight in kg, age in months, first matching row wins:

| weight     | age        | dose |
| ---------- | ---------- | ---- |
| `>= 20`    | `-`        | 2.5  |
| `[15..20)` | `-`        | 1.7  |
| `[10..15)` | `-`        | 1.2  |
| `[6..10)`  | `-`        | 0.75 |
| `[3..6)`   | `-`        | 0.4  |
| `-`        | `>= 36`    | 1.7  |
| `-`        | `[12..36)` | 1.2  |
| `-`        | `[5..12)`  | 0.75 |
| `-`        | `[2..5)`   | 0.4  |

The age rows apply when no weight row matches: no weight entered, or a weight below 3 kg, as in
`drugs.js`. A weight cell `null` instead limits a row to "no weight entered".

### Out of scope

- zscore tables (they stay built-in; a read-only view can come later).
- Full DMN modelling: decision requirement graphs, FEEL beyond the simple tests above (no
  arithmetic, functions or references in cells), hit policies other than first, unique and rule order (no `last`, DMN `any`, `priority`,
  `output order` or `collect` aggregations: those are built from the list).
- A table as a node in the drawing: tables are used only through expressions; they are not
  flow.

---

## Part II — Technical specification

### 1. Design

- **Format**: the YAML of `tricc/feature/20261118-decision-tables.md` §1, one file per table
  under `tables/`, listed by `decision_tables:` globs in `tricc.yaml`; `aliases:` in
  `tricc.yaml` (`DrugDosage: {function: DMN, args: [table, age, weight]}`). The core reads and
  writes it byte-stable (same key order, one rule per line as a flow sequence, columns
  aligned), so a dose change is a one-line diff:

  ```yaml
  id: diazepam
  title: Diazepam, rectal (ml)
  hit_policy: first
  inputs:
    - name: weight
      concept: CHE.B6.DE07 # kg
      type: decimal
    - name: age
      concept: age_in_months
      type: integer # rounded down before the tests
  outputs:
    - name: dose
      type: string
  rules: # one cell per input, then the outputs
    - ['>= 20', '-', '2.5']
    - ['[15..20)', '-', '1.7']
    - ['[10..15)', '-', '1.2']
    - ['[6..10)', '-', '0.75']
    - ['[3..6)', '-', '0.4']
    - ['-', '>= 36', '1.7']
    - ['-', '[12..36)', '1.2']
    - ['-', '[5..12)', '0.75']
    - ['-', '[2..5)', '0.4']
  ```

- **Cells** (FEEL unary-test subset, identical to `tricc_oo`; `parseCell` in
  `packages/core/src/decision-table/cell.ts` returns a test tree or an `E_DMN_CELL` /
  `E_DMN_TYPE` error):

  | Cell                                     | Test                                                         |
  | ---------------------------------------- | ------------------------------------------------------------ |
  | `-`                                      | any value (no test)                                          |
  | `null` / `not(null)`                     | empty / not empty                                            |
  | `< v`, `<= v`, `> v`, `>= v`, `= v`, `v` | comparison / equality (`v` number, `'text'`, `true`/`false`) |
  | `[a..b)`, `(a..b]`, `[a..b]`, `(a..b)`   | range, square bracket = inclusive                            |
  | `a, b, c`                                | any of                                                       |

  Output cells are literals of the column type; non-numeric doses from `drugs.js` (`"-"`,
  `"--"`, `""`) stay text. An `integer` input is floored before the tests. `matchRow` and
  `evaluateTable` give the test panel result with the same semantics as the `tricc_oo`
  expansion to `IFS`.

- **Hit policy**: `hit_policy: first | unique | rule_order` in the table YAML, default
  `first` (DMN XML `FIRST`, `UNIQUE`, `RULE ORDER`). The call decides the policy actually
  used: `DMN` takes the table's, `DMNFirst` forces `first`, `DMNList` forces `rule_order`
  (`unique` is a table check, not a call option). The result type follows: one value of the
  output column type for `first` / `unique`, `List<T>` for `rule_order`. `evaluateTable`
  takes the policy as a parameter so the test panel and the call checks share it.
- **Model** (`@tricc/core`): `DecisionTable` in the Yjs document (`Y.Map` per table, rows as
  `Y.Array` of `Y.Array<string>`), a cell parser shared with the validator, and the same
  error codes as `tricc_oo` (`E_DMN_CELL`, `E_DMN_TYPE`, `E_DMN_OVERLAP`, `E_DMN_ARITY`).
  Shared test vectors with `tricc_oo` for the cell parser and the row match.
- **Editor** (`@tricc/editor`): grid view with column header concept pickers, row drag
  handles, cell validation, test panel; tables appear in project search and navigation.
- **CQL** (`@tricc/cql`): `DMN`, `DMNFirst` and `DMNList` in the TRICC domain functions of
  the generated helper library; completion of table ids and argument hints from the open
  project; the result type from the policy, so `DMN('t', …) > 1` on a `rule_order` table
  is a type error in place; aliases declared from preferences.

### 2. Validation and errors

The `tricc_oo` codes, shown on the cell, the column or the call. A concept removed from the
dictionary turns its column into an error. A table no expression calls is a warning.
Changing a table's hit policy re-checks every call to it (the result type may change).

### 3. Tests

- Core: round trip of the 31 Global tables (generated from `drugs.js` by
  `tricc_oo/tools/drugs_js_to_tables.py`) is byte-identical; cell parser (every form above,
  and errors) and match on the shared vectors, including the diazepam cases: 11.5 kg → 1.2,
  no weight and 24 months → 1.2, 2 kg and 24 months → 1.2, no weight and 1 month → empty.
- Editor: Playwright: create a table, pick concepts, reorder rows, see the test panel result
  change; import a CSV.
- Core: `evaluateTable` on the same inputs under each policy (diazepam, 2 kg and 24 months:
  `first` → 1.2, `rule_order` → [1.2]; 25 kg and 40 months: `first` → 2.5, `rule_order` →
  [2.5, 1.7]); `unique` flags the diazepam table (weight and age rows overlap).
- CQL: completion and arity error for `DMN('diazepam', …)`; `DMNList` typed as a list.

### 4. Phases

1. Format, model, parser, validation (core), shared vectors with `tricc_oo`.
2. Grid editor and test panel.
3. `DMN` completion and checks in expression fields; aliases in preferences.
4. CSV / XLSX / DMN XML import and export.

### 5. Implementation notes (2026-11-20)

- Code: `packages/core/src/decision-table/` (cells, evaluation, file, calls, interchange),
  `validate/tables.ts`; `packages/editor/src/tables/` (list, grid, test panel, aliases, files),
  `cql/TableAssist.tsx`. There is no separate `@tricc/cql` package; the expression field lives
  in the editor.
- Shared vectors for `tricc_oo`: `packages/core/src/decision-table/__vectors__/cells.json` and
  `tables.json` (copy them unchanged).
- Codes added beside the `tricc_oo` ones: `E_DMN_SHAPE` (row width, missing input or output,
  duplicate column names), `E_DMN_CONCEPT` (a column concept that is neither in a dictionary nor the name of a
  question or calculation, such as `age_in_months`),
  `dmn.unused` (warning). `E_DMN_TYPE` also covers a result used against its hit policy (a list
  compared as one value, one value given to `Count`…).
- Table files list explicit paths under `decision_tables`; globs are read. Comments in a table
  file are not kept on save.
- CSV / XLSX: row 1 names the columns, row 2 gives `input|output <type> [concept]`; a sheet
  without row 2 is read with the last column as the output and the types guessed.
- Global `drugs.js` has 33 drugs (not 31). The generated tables give the same dose as `drugs.js`
  on a grid of weights and ages, except two `drugs.js` quirks the tables do not copy: age 0 gives no dose there, even with a weight, and neither age nor weight gives the last age class (diazepam: 1.7).

---

## Open questions

None.

## Decisions

- 2026-11-20: an input column may have no concept (name and type only); the concept is a
  default argument, not required (@delcroip)
- 2026-11-20: tables are used only through expressions, never as a drawing node (@delcroip)
- 2026-11-20: hit policies `first` (default), `unique` and `rule_order` (list); `DMNFirst` /
  `DMNList` override at the call; no `last` or boolean "any": built from the list (@delcroip)
- 2026-11-20: implemented in four phases (#54); CSV/XLSX carry the column kinds in row 2 (@delcroip)
