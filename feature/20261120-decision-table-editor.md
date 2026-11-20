# Decision table editor

| Field             | Value                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | Approved (2026-11-20, RFC #51)                                                                                                                                                                                                                                                                                                                                 |
| **RFC**           | [#51](https://github.com/SwissTPH/tricc-frontend/issues/51)                                                                                                                                                                                                                                                                                                    |
| **Branch target** | `feature/decision-table-editor` → `develop`                                                                                                                                                                                                                                                                                                                    |
| **Scope**         | `@tricc/core` (project format, table model), `@tricc/editor` (table view), `@tricc/cql` (`DMN` completion and checks), `tricc_oo` (cross-repo)                                                                                                                                                                                                                 |
| **Related**       | `tricc/feature/20261118-decision-tables.md` (the format and the export; mirror on approval), `20260825-project-format.md` (new `tables/` folder and `tricc.yaml` keys), `20260825-cql-authoring.md` (function completion), `20261008-data-dictionary-and-concept-texts.md` (concept picker), `20261108-preferences-layout.md` (aliases in project preferences) |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### The problem

Dosing tables are authored in JavaScript outside DrawTRICC (`drugs.js` in the Global
Almanach). Clinicians cannot read or review them, a change needs a developer, and the git diff
of a dose change is a code diff.

### What changes for an author

- A **Tables** section in the project lists the decision tables (`tables/*.yaml`), with search.
- A table opens in a grid:
  - **Input columns**: pick a concept from the data dictionary for each, or give only a name
    and a type (the call then always passes the value); drag to reorder (the order is the
    argument order of `DMN()`); the type comes from the concept when there is one.
  - **Output columns**: a name and a type (text, number, yes/no), or a concept.
  - **Rows**: drag to reorder; the first matching row wins (or "unique", checked). Each cell
    is `-` (any), `null` (empty), a comparison (`>= 20`), a range (`[3..6)`), a value or a
    list; invalid cells are underlined with the reason.
  - A **test panel**: enter input values, see which row matches and the result.
- In any expression field, `DMN('` completes table names, then shows the input columns as
  argument hints; a wrong table name or argument count is an error in place.
- Project preferences list **aliases** (`DrugDosage` → `DMN(table, age, weight)`).
- **Import / export**: CSV and XLSX (one row per rule), DMN XML (decision tables only).

### Out of scope

- zscore tables (they stay built-in; a read-only view can come later).
- Full DMN modelling (decision requirement graphs, FEEL expressions in cells).
- A table as a node in the drawing: tables are used only through expressions; they are not
  flow.

---

## Part II — Technical specification

### 1. Design

- **Format**: the YAML of `tricc/feature/20261118-decision-tables.md` §1, one file per table
  under `tables/`, listed by `decision_tables:` globs in `tricc.yaml`; `aliases:` in
  `tricc.yaml`. The core reads and writes it byte-stable (same key order, one row per line),
  so a dose change is a one-line diff.
- **Model** (`@tricc/core`): `DecisionTable` in the Yjs document (`Y.Map` per table, rows as
  `Y.Array` of `Y.Array<string>`), a cell parser shared with the validator, and the same
  error codes as `tricc_oo` (`E_DMN_CELL`, `E_DMN_TYPE`, `E_DMN_OVERLAP`, `E_DMN_ARITY`).
  Shared test vectors with `tricc_oo` for the cell parser and the row match.
- **Editor** (`@tricc/editor`): grid view with column header concept pickers, row drag
  handles, cell validation, test panel; tables appear in project search and navigation.
- **CQL** (`@tricc/cql`): `DMN` in the TRICC domain functions of the generated helper
  library; completion of table ids and argument hints from the open project; aliases
  declared from preferences.

### 2. Validation and errors

The `tricc_oo` codes, shown on the cell, the column or the call. A concept removed from the
dictionary turns its column into an error. A table no expression calls is a warning.

### 3. Tests

- Core: round trip of the Global tables (generated from `drugs.js`) is byte-identical; cell
  parser and match on the shared vectors.
- Editor: Playwright: create a table, pick concepts, reorder rows, see the test panel result
  change; import a CSV.
- CQL: completion and arity error for `DMN('diazepam', …)`.

### 4. Phases

1. Format, model, parser, validation (core), shared vectors with `tricc_oo`.
2. Grid editor and test panel.
3. `DMN` completion and checks in expression fields; aliases in preferences.
4. CSV / XLSX / DMN XML import and export.

---

## Open questions

None.

## Decisions

- 2026-11-20: an input column may have no concept (name and type only); the concept is a
  default argument, not required (@delcroip)
- 2026-11-20: tables are used only through expressions, never as a drawing node (@delcroip)
