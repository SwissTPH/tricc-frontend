/**
 * Decision-table cells on the shared FEEL grammar (`feel/TriccFeelParser.g4` over the upstream KIE
 * lexer; feature/20261125-expression-languages.md §1.5). Same rules and codes as tricc_oo's
 * `parse_cell`: `E_DMN_CELL` (syntax), `E_DMN_TYPE` (value vs column type).
 */
import { CharStream, CommonTokenStream, ErrorListener, type Recognizer, type Token } from 'antlr4'
import tricc_feelLexer from './generated/tricc_feelLexer.js'
import TriccFeelParser, * as F from './generated/TriccFeelParser.js'

export type CellColumnType = 'integer' | 'decimal' | 'string' | 'boolean'
export type CellValue = number | string | boolean
export type CellTest =
  | { kind: 'any' }
  | { kind: 'null'; negated: boolean }
  | { kind: 'compare'; op: '<' | '<=' | '>' | '>=' | '='; value: CellValue }
  | { kind: 'range'; low: number; high: number; lowIn: boolean; highIn: boolean }
  | { kind: 'list'; items: CellTest[] }

export class CellError extends Error {
  constructor(
    readonly code: 'E_DMN_CELL' | 'E_DMN_TYPE',
    message: string,
  ) {
    super(message)
  }
}

class Collect extends ErrorListener<unknown> {
  count = 0
  lexer = false
  override syntaxError(recognizer: Recognizer<unknown>): void {
    this.count += 1
    if (recognizer instanceof tricc_feelLexer) this.lexer = true
  }
}

const NOT_A_TEST = (cell: string) =>
  `"${cell}" is not a test. Use -, null, a comparison (>= 20), a range ([3..6)), a value (a number, 'text', true or false) or a list of them.`

function problem(tokens: Token[], lexerError: boolean): string {
  const kinds = tokens.map((t) => t.type)
  const T = TriccFeelParser
  const opens = kinds.filter((k) => k === T.LBRACK || k === T.LPAREN).length
  const closes = kinds.filter((k) => k === T.RBRACK || k === T.RPAREN).length
  if (lexerError || opens !== closes || kinds.includes(T.QUOTE)) return 'unclosed'
  if (kinds.includes(T.COMMA)) {
    for (let i = 0; i < kinds.length; i++) {
      const next = kinds[i + 1]
      if (kinds[i] === T.COMMA && (next === T.COMMA || next === undefined)) return 'empty_item'
      if (kinds[i] === T.SUB && (next === T.COMMA || next === undefined)) return 'any_in_list'
    }
  }
  if (kinds[0] === T.LBRACK || kinds[0] === T.LPAREN || kinds[0] === T.RBRACK) return 'range'
  return 'syntax'
}

function syntaxMessage(cell: string, kind: string): string {
  if (kind === 'unclosed') return `"${cell}" has an unclosed quote or bracket.`
  if (kind === 'any_in_list') return '- cannot be one value of a list: it already means "any".'
  if (kind === 'empty_item') return 'A list has an empty value between two commas.'
  if (kind === 'range')
    return `"${cell}" is not a range. Write it as [3..6) — a square bracket includes the bound.`
  return NOT_A_TEST(cell)
}

/** The value of a `cellValue`: a number, `'text'` / `"text"` or a boolean; undefined otherwise. */
export function cellValue(text: string): CellValue | undefined {
  if (text === 'true' || text === 'false') return text === 'true'
  if (text.startsWith("'")) return text.slice(1, -1).replace(/''/g, "'").replace(/\\(.)/g, '$1')
  if (text.startsWith('"')) return text.slice(1, -1).replace(/\\(.)/g, '$1')
  return /^-?\d+(?:\.\d+)?$/.test(text) ? Number(text) : undefined
}

const isNumeric = (t: CellColumnType) => t === 'integer' || t === 'decimal'
const show = (v: CellValue) =>
  typeof v === 'boolean' ? String(v) : typeof v === 'string' ? `'${v}'` : String(v)

function mismatch(value: CellValue, type: CellColumnType): string | undefined {
  if (isNumeric(type))
    return typeof value === 'number'
      ? undefined
      : `This column is ${type}; ${show(value)} is not a number.`
  if (type === 'boolean' && typeof value !== 'boolean')
    return `This column is yes/no; write true or false, not ${show(value)}.`
  if (type === 'string' && typeof value !== 'string')
    return `This column is text; write '${show(value)}' with quotes.`
  return undefined
}

/** Parse an input cell against its column type. Throws a `CellError`. */
export function parseCell(text: string, type: CellColumnType): CellTest {
  const cell = text.trim()
  if (cell === '')
    throw new CellError(
      'E_DMN_CELL',
      'The cell is empty. Write - for "any value", or null for "not entered".',
    )
  const lexer = new tricc_feelLexer(new CharStream(cell))
  const listener = new Collect()
  lexer.removeErrorListeners()
  lexer.addErrorListener(listener as unknown as ErrorListener<number>)
  const stream = new CommonTokenStream(lexer)
  const parser = new TriccFeelParser(stream)
  parser.removeErrorListeners()
  parser.addErrorListener(listener as unknown as ErrorListener<Token>)
  const root = parser.cellRoot()
  if (listener.count > 0) {
    stream.fill()
    const tokens = (stream.tokens as Token[]).filter((t) => t.type !== -1)
    throw new CellError('E_DMN_CELL', syntaxMessage(cell, problem(tokens, listener.lexer)))
  }
  const tests = root.cellTests()
  if (tests instanceof F.CellAnyContext) return { kind: 'any' }
  if (tests instanceof F.CellNotNullContext) return { kind: 'null', negated: true }
  const items = (tests as F.CellListContext).cellTest_list().map((t) => one(t, cell, type))
  return items.length === 1 ? items[0]! : { kind: 'list', items }
}

function value(ctx: F.CellValueContext, cell: string): CellValue {
  const v = cellValue(ctx.getText())
  if (v === undefined) throw new CellError('E_DMN_CELL', NOT_A_TEST(cell))
  return v
}

function one(ctx: F.CellTestContext, cell: string, type: CellColumnType): CellTest {
  if (ctx instanceof F.CellNullContext) return { kind: 'null', negated: false }
  if (ctx instanceof F.CellRangeContext) {
    if (!isNumeric(type))
      throw new CellError('E_DMN_TYPE', `A range needs a number column; this column is ${type}.`)
    const [lowCtx, highCtx] = ctx.cellValue_list()
    const low = value(lowCtx!, cell)
    const high = value(highCtx!, cell)
    for (const bound of [low, high]) {
      const m = mismatch(bound, type)
      if (m) throw new CellError('E_DMN_TYPE', m)
    }
    if ((low as number) > (high as number))
      throw new CellError('E_DMN_CELL', `The range ${cell} is empty: ${low} is above ${high}.`)
    return {
      kind: 'range',
      low: low as number,
      high: high as number,
      lowIn: ctx._low.text === '[',
      highIn: ctx._up.text === ']',
    }
  }
  const op = (ctx instanceof F.CellCompareContext ? ctx._op.text : '=') as
    '<' | '<=' | '>' | '>=' | '='
  const v = value((ctx as F.CellEqualsContext | F.CellCompareContext).cellValue(), cell)
  const m = mismatch(v, type)
  if (m) throw new CellError('E_DMN_TYPE', m)
  if (op !== '=' && !isNumeric(type))
    throw new CellError('E_DMN_TYPE', `${op} compares numbers; this column is ${type}.`)
  return { kind: 'compare', op, value: v }
}

/** Whether a value passes a test; `null` (not entered) passes only `-`, `null` and lists holding it. */
export function cellMatches(test: CellTest, input: CellValue | null): boolean {
  switch (test.kind) {
    case 'any':
      return true
    case 'null':
      return test.negated ? input !== null : input === null
    case 'list':
      return test.items.some((t) => cellMatches(t, input))
    case 'range':
      if (typeof input !== 'number') return false
      return (
        (test.lowIn ? input >= test.low : input > test.low) &&
        (test.highIn ? input <= test.high : input < test.high)
      )
    case 'compare': {
      if (input === null) return false
      if (test.op === '=') return input === test.value
      if (typeof input !== 'number' || typeof test.value !== 'number') return false
      const v = test.value
      return test.op === '<'
        ? input < v
        : test.op === '<='
          ? input <= v
          : test.op === '>'
            ? input > v
            : input >= v
    }
  }
}
