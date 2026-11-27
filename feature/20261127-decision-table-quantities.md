# Quantities and units in decision tables

| Field             | Value                                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**        | Approved (2026-11-27, RFC #70)                                                                                                                                                                                                                                           |
| **RFC**           | [#70](https://github.com/SwissTPH/tricc-frontend/issues/70)                                                                                                                                                                                                              |
| **Branch target** | `feature/decision-table-quantities` → `develop`                                                                                                                                                                                                                          |
| **Scope**         | `@tricc/core` (table model, evaluation, interchange, UCUM units), `@tricc/editor` (grid, test panel, concept unit field, `cql/TableAssist.tsx`), `tricc_oo` (cross-repo)                                                                                                 |
| **Related**       | `20261120-decision-table-editor.md` (the table format this extends), `tricc/feature/20261123-decision-tables.md` (format and export; mirror into `tricc/feature/` on approval), `20260825-cql-authoring.md` (quantity typing), `20260825-terminology.md` (concept units) |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### The problem

A dosing table compares a weight, an age or a temperature, and returns a dose, but its columns
are only text, whole number, decimal or yes/no. The unit is not written anywhere:

- A reviewer reading `>= 20` on a weight column must guess whether it is kg or g, and whether
  the `2.5` dose is ml or mg. Today the unit lives only in the table title ("Diazepam, rectal
  (ml)") or in a comment.
- A weight question asked in grams, or an age in days, can be passed to a table written in kg
  or months without any warning: the dose is silently wrong.
- A quantity question (value + unit) cannot be used as a table input, and a dose cannot come out
  as a quantity that the rest of the form can show with its unit.

### What changes for an author

- An input or output column can have the type **quantity**, with a **unit** (UCUM, such as
  `kg`, `g`, `mo`, `a`, `Cel`, `mL`, `mg`). A column linked to a quantity concept takes the
  unit from it.
- The unit is shown in the column header (`weight (kg)`, `dose (mL)`). Cells keep the numbers
  as today (`>= 20`, `[3..6)`), read in the column unit: cells stay DMN (FEEL) notation.
- A call that passes a value in another unit of the same kind (grams to a kg column, days to a
  months column) is converted; a value of another kind (a temperature to a weight column) is an
  error in place.
- A quantity output gives a dose with its unit, which the form can display or compare.
- The test panel shows and takes values with their unit.
- The unit of a quantity concept is checked against UCUM the same way, with suggestions.
- The Global project's dosing tables get their units once (a one-time update, not an editor
  feature).

Example: the diazepam table with units on the columns.

| weight (kg) | age (mo) | dose (mL) |
| ----------- | -------- | --------- |
| `>= 20`     | `-`      | 2.5       |
| `[15..20)`  | `-`      | 1.7       |
| `-`         | `>= 36`  | 1.7       |

### Out of scope

- Units written inside cells, CQL style (`>= 20 'kg'`): cells stay FEEL.
- Mixed units in one column.
- An editor action that converts existing columns to quantity.
- Quantity arithmetic in general expressions (beyond what the shared unit library makes easy;
  see Phases).

---

## Part II — Technical specification

### 1. Design

- **Format** (`tables/*.yaml`): a new column type `quantity` with a required `unit` (UCUM
  code). Existing tables are unchanged (no unit = today's numeric types):

  ```yaml
  inputs:
    - name: weight
      concept: CHE.B6.DE07
      type: quantity
      unit: kg
  outputs:
    - name: dose
      type: quantity
      unit: mL
  ```

- **Model**: add `'quantity'` to `TABLE_COLUMN_TYPES` and `unit?: string` to `TableColumn` in
  `packages/core/src/model/types.ts`; `decision-table/file.ts` reads and writes the key
  byte-stable (after `type`).
- **Cells** (`decision-table/cell.ts`): a `quantity` column is numeric for `parseCell`
  (comparisons, ranges, lists); the numbers are in the column unit. No unit syntax in cells, so
  cells stay the FEEL unary-test subset shared with `tricc_oo` and the DMN XML export is
  unaffected.
- **Units library**: one UCUM library (`@lhncbc/ucum-lhc`, the NLM reference implementation)
  behind a small `@tricc/core` module (`units/ucum.ts`: `validateUnit`, `convert`,
  `sameKind`, `suggestUnits`), so the rest of the code does not depend on the library's API.
  Used by:
  - decision tables: column unit validation, argument conversion, the test panel;
  - concept quantity units (`unit` / `unit_system` / `unit_code` on quantity concepts and
    questions): validation and completion in the concept editor;
  - the CQL checker, later: typing and comparing quantity literals (`5 'mL'`).
    `tricc_oo` uses the Python UCUM equivalent with the same shared vectors.
- **Evaluation** (`decision-table/evaluate.ts`): `InputValue` gains
  `{ value: number; unit: string }`; it is converted to the column unit before the tests. An
  `integer` floor applies after conversion.
- **Calls** (`decision-table/calls.ts`, `validate/tables.ts`, `cql/TableAssist.tsx`): an
  argument whose concept or question is a quantity is checked against the column unit: same
  unit → OK, convertible → OK (the generated call converts), not convertible → `E_DMN_UNIT`. A
  plain number to a quantity column is a warning (`dmn.unit_assumed`: read in the column unit).
  A quantity output types the call as `Quantity` (`List<Quantity>` for `rule_order`).
- **Interchange** (`decision-table/interchange.ts`): CSV/XLSX row 2 becomes
  `input quantity[kg] [concept]`; DMN XML writes the column as `typeRef="number"` with the unit
  in a TRICC extension element, so a plain DMN tool still reads the table.
- **`tricc_oo`**: reads `type: quantity` / `unit`, converts the argument before the `IFS`
  expansion, and returns a quantity output with its unit. Its CQL visitor does not handle
  quantity literals yet (`visitQuantity` raises `NotImplementedError` in
  `tricc_oo/converters/cql_to_operation.py`); needed for comparing a quantity result.

### 2. Validation and errors

- `E_DMN_UNIT`: a column `unit` that is not a UCUM code; an argument whose unit cannot be
  converted to the column unit; a column concept whose unit differs in kind from the column.
- `dmn.unit_assumed` (warning): a plain number passed to a quantity column.
- Concept units: a quantity concept whose `unit_code` is not valid UCUM is a warning with
  suggestions.
- `E_DMN_TYPE` as today for a range or comparison on a non-numeric column.

### 3. Tests

- Core: round trip of a table with quantity columns is byte-identical; tables without units are
  unchanged.
- Core: diazepam with `weight` in kg: 11500 g → 1.2 mL; 11.5 kg → 1.2 mL; 1 a and no weight →
  as 12 mo → 1.2 mL; a `Cel` argument to the weight column → `E_DMN_UNIT`.
- Core: `units/ucum.ts` validation and conversion vectors, shared with `tricc_oo`
  (`__vectors__/units.json`); `tables.json` extended with quantity cases.
- Editor: Playwright: set a column to quantity with a unit, see it in the header; the test
  panel takes `11500 g` and gives `1.2 mL`.
- CSV/XLSX and DMN XML round trips with units.

### 4. Phases

1. `units/ucum.ts` on the UCUM library; format, model and evaluation (core); shared vectors.
2. Grid header, column settings and test panel.
3. Call checks and `Quantity` result types in expression fields; concept unit validation.
4. Interchange; `tricc_oo` mirror.
5. One-time update of the Global project tables (`tables/*.yaml`): set `type: quantity` and the
   unit on the weight, age and dose columns, done by an agent run and reviewed as one PR in the
   project repo; check it with `scripts/check-tricc-project.mjs`. No editor migration feature.

---

## Open questions

None.

## Decisions

- 2026-11-26: no CQL-style units in cells; cells stay FEEL, the unit is on the column
  (@delcroip)
- 2026-11-26: use a UCUM library, shared with concept quantity units and later the CQL parser
  (@delcroip)
- 2026-11-26: no editor action to migrate columns; the Global tables are updated once by an
  agent run (@delcroip)
