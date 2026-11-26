import type { DecisionTable, HitPolicy, TableColumn } from '../model/types.js'
import {
  parseCell,
  parseOutput,
  testCell,
  testsOverlap,
  type CellError,
  type CellTest,
  type CellValue,
  type InputValue,
} from './cell.js'

/** One problem in a table, located on a cell or a column. */
export interface TableProblem {
  code: 'E_DMN_CELL' | 'E_DMN_TYPE' | 'E_DMN_OVERLAP' | 'E_DMN_SHAPE' | 'E_DMN_LIST_VALUE'
  message: string
  /** Row index in `rules`. */
  row?: number
  /** Column index: inputs first, then outputs. */
  column?: number
}

/** A row's parsed tests (one per input) and output values; `undefined` where a cell is invalid. */
export interface CompiledRow {
  tests: (CellTest | undefined)[]
  outputs: (CellValue | undefined)[]
}

export interface CompiledTable {
  table: DecisionTable
  rows: CompiledRow[]
  problems: TableProblem[]
}

/** Parse every cell once. Problems are returned, never thrown: a table is mostly half-written. */
export function compileTable(table: DecisionTable): CompiledTable {
  const problems: TableProblem[] = []
  const width = table.inputs.length + table.outputs.length
  const rows = table.rules.map((rule, row): CompiledRow => {
    if (rule.length !== width) {
      problems.push({
        code: 'E_DMN_SHAPE',
        message: `Row ${row + 1} has ${rule.length} cells; the table has ${table.inputs.length} inputs and ${table.outputs.length} outputs (${width} cells).`,
        row,
      })
    }
    const tests = table.inputs.map((col, i) => {
      const parsed = parseCell(rule[i] ?? '', col.type)
      if (parsed.ok) return parsed.test
      problems.push(located(parsed.error, row, i))
      return undefined
    })
    const outputs = table.outputs.map((col, j) => {
      const column = table.inputs.length + j
      const parsed = parseOutput(rule[column] ?? '', col.type)
      if (parsed.ok) return parsed.value
      problems.push(located(parsed.error, row, column))
      return undefined
    })
    return { tests, outputs }
  })
  return { table, rows, problems }
}

function located(error: CellError, row: number, column: number): TableProblem {
  return { code: error.code, message: error.message, row, column }
}

/**
 * Problems of the table alone: cell syntax and types, and for `unique`, rows that can both
 * match. `listValues` adds the check of a list result read by XPath (`rule_order`, or a
 * `DMNList` call): a value with a space would read as two.
 */
export function tableProblems(
  table: DecisionTable,
  opts: { listValues?: boolean } = {},
): TableProblem[] {
  const compiled = compileTable(table)
  const problems = [...compiled.problems]
  if (table.hitPolicy === 'unique') problems.push(...overlaps(compiled))
  if (opts.listValues ?? table.hitPolicy === 'rule_order') {
    compiled.rows.forEach((r, row) =>
      r.outputs.forEach((v, j) => {
        if (typeof v === 'string' && /\s/.test(v.trim())) {
          problems.push({
            code: 'E_DMN_LIST_VALUE',
            message: `"${v}" has a space. A list result is a space-separated list in CHT and ODK, so it would read as several values. Use a code without spaces.`,
            row,
            column: table.inputs.length + j,
          })
        }
      }),
    )
  }
  return problems
}

function overlaps(compiled: CompiledTable): TableProblem[] {
  const problems: TableProblem[] = []
  const { rows } = compiled
  for (let a = 0; a < rows.length; a++) {
    for (let b = a + 1; b < rows.length; b++) {
      const x = rows[a]!.tests
      const y = rows[b]!.tests
      if (x.some((t) => !t) || y.some((t) => !t)) continue
      if (x.every((t, i) => testsOverlap(t!, y[i]!))) {
        problems.push({
          code: 'E_DMN_OVERLAP',
          message: `Rows ${a + 1} and ${b + 1} can both match, so the table is not unique. Narrow one of them, or make the hit policy "first".`,
          row: b,
        })
      }
    }
  }
  return problems
}

/** An input as the table tests it: a whole-number column rounds down first. */
export function normalizeInput(value: InputValue, column: TableColumn): InputValue {
  if (column.type === 'integer' && typeof value === 'number') return Math.floor(value)
  return value
}

/** The rows whose every input test passes, in row order. Invalid rows never match. */
export function matchingRows(table: DecisionTable | CompiledTable, inputs: InputValue[]): number[] {
  const compiled = 'rows' in table ? table : compileTable(table)
  const columns = compiled.table.inputs
  const values = columns.map((col, i) => normalizeInput(inputs[i] ?? null, col))
  const out: number[] = []
  compiled.rows.forEach((row, index) => {
    if (row.tests.every((t, i) => t !== undefined && testCell(t, values[i] ?? null)))
      out.push(index)
  })
  return out
}

export interface TableResult {
  policy: HitPolicy
  /** Every row that matches. */
  matches: number[]
  /** The rows the policy keeps: the first one, or all of them for `rule_order`. */
  kept: number[]
  /**
   * `first` / `unique`: the output values of the kept row (empty when none matches);
   * `rule_order`: the values of each kept row, in row order.
   */
  value: (CellValue | undefined)[] | (CellValue | undefined)[][]
}

/**
 * The table's result for these inputs (in input order). `policy` overrides the table's, as
 * `DMNFirst` / `DMNList` do at a call. The same semantics as the `tricc_oo` expansion.
 */
export function evaluateTable(
  table: DecisionTable,
  inputs: InputValue[],
  policy: HitPolicy = table.hitPolicy,
): TableResult {
  const compiled = compileTable(table)
  const matches = matchingRows(compiled, inputs)
  if (policy === 'rule_order') {
    return { policy, matches, kept: matches, value: matches.map((r) => compiled.rows[r]!.outputs) }
  }
  const first = matches[0]
  return {
    policy,
    matches,
    kept: first === undefined ? [] : [first],
    value: first === undefined ? [] : compiled.rows[first]!.outputs,
  }
}
