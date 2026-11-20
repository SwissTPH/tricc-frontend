import type { TableColumnType } from '../model/types.js'

/**
 * Decision table cells: a subset of FEEL unary tests, identical to `tricc_oo`
 * (tricc/feature/*-decision-tables.md §1, feature/20261120-decision-table-editor.md).
 *
 * | Cell                                     | Test                                   |
 * | ---------------------------------------- | -------------------------------------- |
 * | `-`                                      | any value (no test)                    |
 * | `null` / `not(null)`                     | empty / not empty                      |
 * | `< v`, `<= v`, `> v`, `>= v`, `= v`, `v` | comparison / equality                  |
 * | `[a..b)`, `(a..b]`, `[a..b]`, `(a..b)`   | range, square bracket = inclusive      |
 * | `a, b, c`                                | any of                                 |
 *
 * `v` is a number, `'text'` or `true` / `false`. Output cells are literals of the column type.
 */

export type CellValue = number | string | boolean
/** An input value; `null` is "not entered". */
export type InputValue = CellValue | null

export type CellTest =
  | { kind: 'any' }
  | { kind: 'null'; not: boolean }
  | { kind: 'compare'; op: '<' | '<=' | '>' | '>=' | '='; value: CellValue }
  | { kind: 'range'; low: number; high: number; lowIn: boolean; highIn: boolean }
  | { kind: 'list'; items: CellTest[] }

export type CellErrorCode = 'E_DMN_CELL' | 'E_DMN_TYPE'

export interface CellError {
  code: CellErrorCode
  message: string
}

export type ParsedCell = { ok: true; test: CellTest } | { ok: false; error: CellError }

const NUMBER = /^-?\d+(?:\.\d+)?$/
const COMPARE = /^(<=|>=|<|>|=)\s*(.+)$/
const RANGE = /^([[(])\s*(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)\s*([\])])$/

const cellError = (message: string): ParsedCell => ({
  ok: false,
  error: { code: 'E_DMN_CELL', message },
})
const typeError = (message: string): ParsedCell => ({
  ok: false,
  error: { code: 'E_DMN_TYPE', message },
})

/** Parse an input cell against its column type. */
export function parseCell(text: string, type: TableColumnType): ParsedCell {
  const cell = text.trim()
  if (cell === '-') return { ok: true, test: { kind: 'any' } }
  if (cell === '') {
    return cellError('The cell is empty. Write - for "any value", or null for "not entered".')
  }
  const parts = splitList(cell)
  if (parts === undefined) return cellError(`"${cell}" has an unclosed quote or bracket.`)
  if (parts.length > 1) {
    const items: CellTest[] = []
    for (const part of parts) {
      if (part === '-') return cellError('- cannot be one value of a list: it already means "any".')
      const one = parseSingle(part, type)
      if (!one.ok) return one
      items.push(one.test)
    }
    return { ok: true, test: { kind: 'list', items } }
  }
  return parseSingle(cell, type)
}

function parseSingle(cell: string, type: TableColumnType): ParsedCell {
  if (cell === '') return cellError('A list has an empty value between two commas.')
  if (cell === 'null') return { ok: true, test: { kind: 'null', not: false } }
  if (/^not\s*\(\s*null\s*\)$/.test(cell)) return { ok: true, test: { kind: 'null', not: true } }
  const range = RANGE.exec(cell)
  if (range) {
    if (!isNumeric(type)) {
      return typeError(`A range needs a number column; this column is ${type}.`)
    }
    const low = Number(range[2])
    const high = Number(range[3])
    if (low > high) return cellError(`The range ${cell} is empty: ${low} is above ${high}.`)
    return {
      ok: true,
      test: { kind: 'range', low, high, lowIn: range[1] === '[', highIn: range[4] === ']' },
    }
  }
  if (/^[[(]/.test(cell)) {
    return cellError(
      `"${cell}" is not a range. Write it as [3..6) — a square bracket includes the bound.`,
    )
  }
  const cmp = COMPARE.exec(cell)
  const op = (cmp?.[1] ?? '=') as '<' | '<=' | '>' | '>=' | '='
  const literal = parseLiteral(cmp ? cmp[2]!.trim() : cell)
  if (literal === undefined) {
    return cellError(
      `"${cell}" is not a test. Use -, null, a comparison (>= 20), a range ([3..6)), a value (a number, 'text', true or false) or a list of them.`,
    )
  }
  const mismatch = typeMismatch(literal, type)
  if (mismatch) return typeError(mismatch)
  if (op !== '=' && !isNumeric(type)) {
    return typeError(`${op} compares numbers; this column is ${type}.`)
  }
  return { ok: true, test: { kind: 'compare', op, value: literal } }
}

/** A number, `'text'` or a boolean; undefined when it is none of them. */
export function parseLiteral(text: string): CellValue | undefined {
  if (NUMBER.test(text)) return Number(text)
  if (text === 'true') return true
  if (text === 'false') return false
  const quoted = /^'((?:[^'\\]|\\.)*)'$/.exec(text) ?? /^"((?:[^"\\]|\\.)*)"$/.exec(text)
  if (quoted) return quoted[1]!.replace(/\\(.)/g, '$1')
  return undefined
}

function isNumeric(type: TableColumnType): boolean {
  return type === 'integer' || type === 'decimal'
}

function typeMismatch(value: CellValue, type: TableColumnType): string | undefined {
  if (isNumeric(type)) {
    if (typeof value !== 'number') return `This column is ${type}; ${show(value)} is not a number.`
    return undefined
  }
  if (type === 'boolean' && typeof value !== 'boolean') {
    return `This column is yes/no; write true or false, not ${show(value)}.`
  }
  if (type === 'string' && typeof value !== 'string') {
    return `This column is text; write '${String(value)}' with quotes.`
  }
  return undefined
}

function show(value: CellValue): string {
  return typeof value === 'string' ? `'${value}'` : String(value)
}

/** Split `a, b, c` at top-level commas, outside quotes and brackets. Undefined when unbalanced. */
export function splitList(text: string): string[] | undefined {
  const parts: string[] = []
  let depth = 0
  let quote: string | undefined
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (quote) {
      if (ch === '\\') i++
      else if (ch === quote) quote = undefined
      continue
    }
    if (ch === "'" || ch === '"') quote = ch
    else if (ch === '[' || ch === '(') depth++
    else if (ch === ']' || ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim())
      start = i + 1
    }
  }
  if (quote || depth !== 0) return undefined
  parts.push(text.slice(start).trim())
  return parts
}

/** Whether a value passes a test. `null` passes only `-`, `null` and lists holding `null`. */
export function testCell(test: CellTest, value: InputValue): boolean {
  switch (test.kind) {
    case 'any':
      return true
    case 'null':
      return test.not ? value !== null : value === null
    case 'list':
      return test.items.some((t) => testCell(t, value))
    case 'range':
      if (typeof value !== 'number') return false
      return (
        (test.lowIn ? value >= test.low : value > test.low) &&
        (test.highIn ? value <= test.high : value < test.high)
      )
    case 'compare': {
      if (value === null) return false
      if (test.op === '=') return value === test.value
      if (typeof value !== 'number' || typeof test.value !== 'number') return false
      if (test.op === '<') return value < test.value
      if (test.op === '<=') return value <= test.value
      if (test.op === '>') return value > test.value
      return value >= test.value
    }
  }
}

/** An output cell as a value of the column type. Text is kept as written. */
export function parseOutput(
  text: string,
  type: TableColumnType,
): { ok: true; value: CellValue } | { ok: false; error: CellError } {
  if (type === 'string') return { ok: true, value: text }
  const cell = text.trim()
  if (isNumeric(type)) {
    if (!NUMBER.test(cell)) {
      return {
        ok: false,
        error: {
          code: 'E_DMN_TYPE',
          message: `This output is ${type}; "${text}" is not a number.`,
        },
      }
    }
    const n = Number(cell)
    if (type === 'integer' && !Number.isInteger(n)) {
      return {
        ok: false,
        error: { code: 'E_DMN_TYPE', message: `This output is a whole number; ${cell} is not.` },
      }
    }
    return { ok: true, value: n }
  }
  if (cell === 'true' || cell === 'false') return { ok: true, value: cell === 'true' }
  return {
    ok: false,
    error: {
      code: 'E_DMN_TYPE',
      message: `This output is yes/no; write true or false, not "${text}".`,
    },
  }
}

// ---------------------------------------------------------------- overlap (hit policy unique)

interface Interval {
  low: number
  high: number
  lowIn: boolean
  highIn: boolean
}

/** The values a test accepts, in a form two tests can be intersected on. */
interface ValueSet {
  null: boolean
  /** Every value that is not null. */
  all: boolean
  intervals: Interval[]
  /** Text and yes/no values, as `typeof:value`. */
  points: Set<string>
}

function valueSet(test: CellTest): ValueSet {
  const set: ValueSet = { null: false, all: false, intervals: [], points: new Set() }
  const add = (t: CellTest): void => {
    switch (t.kind) {
      case 'any':
        set.null = true
        set.all = true
        return
      case 'null':
        if (t.not) set.all = true
        else set.null = true
        return
      case 'list':
        t.items.forEach(add)
        return
      case 'range':
        set.intervals.push({ low: t.low, high: t.high, lowIn: t.lowIn, highIn: t.highIn })
        return
      case 'compare': {
        if (typeof t.value !== 'number') {
          set.points.add(`${typeof t.value}:${String(t.value)}`)
          return
        }
        const v = t.value
        const inf = Number.POSITIVE_INFINITY
        if (t.op === '=') set.intervals.push({ low: v, high: v, lowIn: true, highIn: true })
        else if (t.op === '<')
          set.intervals.push({ low: -inf, high: v, lowIn: false, highIn: false })
        else if (t.op === '<=')
          set.intervals.push({ low: -inf, high: v, lowIn: false, highIn: true })
        else if (t.op === '>')
          set.intervals.push({ low: v, high: inf, lowIn: false, highIn: false })
        else set.intervals.push({ low: v, high: inf, lowIn: true, highIn: false })
      }
    }
  }
  add(test)
  return set
}

function intervalsMeet(a: Interval, b: Interval): boolean {
  if (a.high < b.low || b.high < a.low) return false
  if (a.high === b.low) return a.highIn && b.lowIn
  if (b.high === a.low) return b.highIn && a.lowIn
  return true
}

function nonEmpty(s: ValueSet): boolean {
  return s.all || s.intervals.length > 0 || s.points.size > 0
}

/** Whether some value passes both tests. */
export function testsOverlap(a: CellTest, b: CellTest): boolean {
  const x = valueSet(a)
  const y = valueSet(b)
  if (x.null && y.null) return true
  if (x.all && nonEmpty(y)) return true
  if (y.all && nonEmpty(x)) return true
  for (const i of x.intervals) for (const j of y.intervals) if (intervalsMeet(i, j)) return true
  for (const p of x.points) if (y.points.has(p)) return true
  return false
}
