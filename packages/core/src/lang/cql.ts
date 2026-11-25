/**
 * CQL with tricc's TRICC profile (`cql/tricc_cql.g4`), parsed by the generated parser
 * (feature/20261125-expression-languages.md §1.4).
 */
import {
  CharStream,
  CommonTokenStream,
  ErrorListener,
  ParserRuleContext,
  TerminalNode,
} from 'antlr4'
import type { Recognizer, Token } from 'antlr4'
import tricc_cqlLexer from './generated/tricc_cqlLexer.js'
import tricc_cqlParser, * as P from './generated/tricc_cqlParser.js'
import errors from './errors.json' with { type: 'json' }
import functions from './functions.json' with { type: 'json' }

export interface CqlError {
  /** `E_CQL_SYNTAX`, or `E_CQL_PROFILE` for a construct outside the profile. */
  code: string
  message: string
  /** 1-based. */
  line: number
  /** 0-based, in the expression itself. */
  column: number
  /** The construct outside the profile (`query`, `indexer`, …). */
  construct?: string
}

export interface CatalogueFunction {
  name: string
  params: { name: string; type: string; optional?: boolean; variadic?: boolean }[]
  returns: string
  operator: string | null
  reads: 'none' | 'patient' | 'encounter' | 'history' | 'context'
  foldable: boolean
}

/** The function catalogue (`functions.json`). */
export const FUNCTIONS: readonly CatalogueFunction[] = functions.functions as CatalogueFunction[]
const BY_NAME = new Map(FUNCTIONS.map((f) => [f.name, f]))

interface Construct {
  construct: string
  texts?: string[]
  types?: string[]
  after?: 'operand' | 'number'
  message: string
}

class Collect extends ErrorListener<unknown> {
  errors: { line: number; column: number; message: string }[] = []
  override syntaxError(
    _recognizer: Recognizer<unknown>,
    _offending: unknown,
    line: number,
    column: number,
    message: string,
  ): void {
    this.errors.push({ line, column, message })
  }
}

/** The text as the lexer reads it: the typographic minus `−` becomes `-`. */
export const normaliseCql = (text: string): string => text.replace(/−/g, '-')

const symbolic = (type: number): string | null =>
  (tricc_cqlParser.symbolicNames as (string | null)[])[type] ?? null

/** The first construct of `errors.json` the tokens use, with its token (the shared algorithm). */
export function profileConstruct(
  tokens: Token[],
): { construct: Construct; token: Token } | undefined {
  const operandTypes = new Set(errors.operand_types)
  const operandTexts = new Set(errors.operand_texts)
  let previous: Token | undefined
  for (const token of tokens) {
    const name = symbolic(token.type)
    for (const construct of errors.constructs as Construct[]) {
      if (!construct.texts?.includes(token.text) && !(name && construct.types?.includes(name)))
        continue
      const prevName = previous ? symbolic(previous.type) : null
      if (
        construct.after === 'operand' &&
        !(previous && ((prevName && operandTypes.has(prevName)) || operandTexts.has(previous.text)))
      )
        continue
      if (construct.after === 'number' && prevName !== 'NUMBER') continue
      return { construct, token }
    }
    previous = token
  }
  return undefined
}

export interface ParsedCql {
  ok: boolean
  errors: CqlError[]
  /** The `triccExpression` tree when `ok`. */
  tree?: P.TriccExpressionContext
}

/** Parse one expression (placeholders may stay unrendered). */
export function parseCql(text: string): ParsedCql {
  const lexer = new tricc_cqlLexer(new CharStream(normaliseCql(text)))
  const listener = new Collect()
  lexer.removeErrorListeners()
  lexer.addErrorListener(listener as unknown as ErrorListener<number>)
  const stream = new CommonTokenStream(lexer)
  const parser = new tricc_cqlParser(stream)
  parser.removeErrorListeners()
  parser.addErrorListener(listener as unknown as ErrorListener<Token>)
  const tree = parser.triccExpression()
  if (listener.errors.length === 0) return { ok: true, errors: [], tree }
  stream.fill()
  const tokens = (stream.tokens as Token[]).filter((t) => t.channel === 0 && t.type !== -1)
  const found = profileConstruct(tokens)
  if (found) {
    return {
      ok: false,
      errors: [
        {
          code: errors.codes.profile,
          message: found.construct.message,
          line: found.token.line,
          column: found.token.column,
          construct: found.construct.construct,
        },
      ],
    }
  }
  return {
    ok: false,
    errors: listener.errors.map((e) => ({ code: errors.codes.syntax, ...e })),
  }
}

/** The errors of an expression, empty when it parses. */
export const cqlErrors = (text: string): CqlError[] => parseCql(text).errors

// ---------------------------------------------------------------- operators

export interface CqlUse {
  /** `TriccOperator` names, as tricc_oo parses the expression. */
  operators: Set<string>
  /** Functions called as written (no operator of their own): catalogue, project or unknown. */
  functions: Set<string>
  /** `"#code"` retrievals the expression reads. */
  retrievals: Set<string>
  /** Decision-table calls (`DMN`, `DMNFirst`, `DMNList`, z-scores). */
  tableCalls: number
}

const COMPARE: Record<string, string> = {
  '<': 'LESS',
  '<=': 'LESS_OR_EQUAL',
  '>': 'MORE',
  '>=': 'MORE_OR_EQUAL',
  '=': 'EQUAL',
  '!=': 'NOTEQUAL',
}
const ADD: Record<string, string> = { '+': 'PLUS', '-': 'MINUS', '&': 'CONCATENATE' }
const MULTIPLY: Record<string, string> = {
  '*': 'MULTIPLIED',
  '/': 'DIVIDED',
  div: 'DIVIDED',
  mod: 'MODULO',
}
const TABLE_OPERATORS = new Set(['DMN', 'ZSCORE', 'IZSCORE'])

const childText = (ctx: ParserRuleContext, i: number): string => ctx.getChild(i)?.getText() ?? ''

/** What an expression uses, by tricc_oo's names (for capability checks). Empty when it does not parse. */
export function cqlUses(text: string): CqlUse {
  const use: CqlUse = {
    operators: new Set(),
    functions: new Set(),
    retrievals: new Set(),
    tableCalls: 0,
  }
  const parsed = parseCql(text)
  if (parsed.tree) walk(parsed.tree, use)
  return use
}

function walk(node: ParserRuleContext | TerminalNode, use: CqlUse): void {
  if (node instanceof TerminalNode) {
    const t = node.getText()
    if (/^"#[A-Za-z][A-Za-z0-9_]*"$/.test(t)) use.retrievals.add(t.slice(1, -1))
    return
  }
  const op = operatorOf(node)
  if (op) {
    if (TABLE_OPERATORS.has(op)) use.tableCalls += 1
    else use.operators.add(op)
  }
  if (node instanceof P.FunctionInvocationContext) {
    const name = node.function_().referentialIdentifier().getText()
    const entry = BY_NAME.get(name)
    if (!entry?.operator) use.functions.add(name)
  }
  for (let i = 0; i < node.getChildCount(); i++) {
    walk(node.getChild(i) as ParserRuleContext | TerminalNode, use)
  }
}

function operatorOf(ctx: ParserRuleContext): string | undefined {
  if (ctx instanceof P.AndExpressionContext) return 'AND'
  if (ctx instanceof P.OrExpressionContext) return 'OR'
  if (ctx instanceof P.NotExpressionContext) return 'NOT'
  if (ctx instanceof P.ExistenceExpressionContext) return 'EXISTS'
  if (ctx instanceof P.BetweenExpressionContext) return 'BETWEEN'
  if (ctx instanceof P.BooleanExpressionContext) {
    const words = ctx.getText()
    const last = childText(ctx, ctx.getChildCount() - 1)
    const negated = childText(ctx, 2) === 'not'
    const base = { null: 'NULL', true: 'TRUE', false: 'FALSE' }[last] ?? words
    return `IS${negated ? 'NOT' : ''}${base}`
  }
  if (ctx instanceof P.InequalityExpressionContext || ctx instanceof P.EqualityExpressionContext)
    return COMPARE[childText(ctx, 1)]
  if (ctx instanceof P.MembershipExpressionContext)
    return childText(ctx, 1) === 'in' ? 'SELECTED' : 'CONTAINS'
  if (ctx instanceof P.NegateMembershipExpressionContext)
    return childText(ctx, 2) === 'in' ? 'SELECTED' : 'CONTAINS'
  if (ctx instanceof P.AdditionExpressionTermContext) return ADD[childText(ctx, 1)]
  if (ctx instanceof P.MultiplicationExpressionTermContext) return MULTIPLY[childText(ctx, 1)]
  if (ctx instanceof P.PolarityExpressionTermContext)
    return childText(ctx, 0) === '-' ? 'MINUS' : undefined
  if (ctx instanceof P.ParenthesizedTermContext) return 'PARENTHESIS'
  if (ctx instanceof P.IfThenElseExpressionTermContext) return 'IF'
  if (ctx instanceof P.CaseExpressionTermContext) return 'CASE'
  if (ctx instanceof P.TupleSelectorContext) return 'TUPLE'
  if (ctx instanceof P.TypeExpressionContext || ctx instanceof P.CastExpressionContext) {
    const to = childText(ctx, ctx.getChildCount() - 1).toLowerCase()
    if (to === 'int' || to === 'integer') return 'CAST_INTEGER'
    if (to === 'float' || to === 'number') return 'CAST_NUMBER'
    if (to === 'date') return 'CAST_DATE'
    return undefined
  }
  if (ctx instanceof P.FunctionInvocationContext) {
    const name = ctx.function_().referentialIdentifier().getText()
    return BY_NAME.get(name)?.operator ?? 'NATIVE'
  }
  return undefined
}

// ---------------------------------------------------------------- meaning

/** What a whole expression is, as tricc_oo reads it (meaning.json `parse`). */
export type CqlKind =
  'reference' | 'text' | 'number' | 'boolean' | 'null' | 'operation' | 'other' | 'invalid'

/** The kind of an expression, and the value of a literal. */
export function cqlKind(text: string): { kind: CqlKind; value?: string | number | boolean } {
  const parsed = parseCql(text)
  if (!parsed.tree) return { kind: 'invalid' }
  const expression = parsed.tree.expression()
  if (!(expression instanceof P.TermExpressionContext)) return { kind: 'operation' }
  const term = expression.expressionTerm()
  if (term instanceof P.PolarityExpressionTermContext)
    return childText(term, 0) === '-' ? { kind: 'operation' } : { kind: 'other' }
  if (!(term instanceof P.TermExpressionTermContext)) return { kind: 'operation' }
  const inner = term.term()
  if (inner instanceof P.ParenthesizedTermContext || inner instanceof P.TupleSelectorTermContext)
    return { kind: 'operation' }
  if (inner instanceof P.LiteralTermContext) {
    const literal = inner.literal()
    const raw = literal.getText()
    if (literal instanceof P.BooleanLiteralContext)
      return { kind: 'boolean', value: raw === 'true' }
    if (literal instanceof P.NullLiteralContext) return { kind: 'null' }
    if (literal instanceof P.StringLiteralContext)
      return { kind: 'text', value: unquoteLiteral(raw) }
    if (literal instanceof P.NumberLiteralContext) return { kind: 'number', value: Number(raw) }
    return { kind: 'other' }
  }
  if (inner instanceof P.InvocationTermContext) {
    const invocation = inner.invocation()
    if (invocation instanceof P.FunctionInvocationContext) return { kind: 'operation' }
    if (invocation instanceof P.MemberInvocationContext) {
      const name = invocation.getText()
      if (name.length > 1 && name[0] === '"' && name.endsWith('"'))
        return { kind: 'reference', value: name.slice(1, -1) }
      return { kind: 'text', value: name }
    }
  }
  return { kind: 'other' }
}

const ESCAPES: Record<string, string> = { n: '\n', t: '\t', r: '\r', f: '\f' }

/** The value of a CQL string literal (`'it\'s'` → `it's`), as tricc_oo's `unquote_literal`. */
export function unquoteLiteral(text: string): string {
  let body = text
  if (body.length >= 2 && body[0] === body[body.length - 1] && `'"\``.includes(body[0]!))
    body = body.slice(1, -1)
  let out = ''
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!
    if (ch === '\\' && i + 1 < body.length) {
      const next = body[i + 1]!
      if (next === 'u' && i + 5 < body.length) {
        out += String.fromCharCode(parseInt(body.slice(i + 2, i + 6), 16))
        i += 5
        continue
      }
      out += ESCAPES[next] ?? next
      i += 1
      continue
    }
    out += ch
  }
  return out
}

const PLACEHOLDER = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*(\|\s*raw\s*)?\}\}/g
const REFERENCE = /^\s*\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}\s*$/

/**
 * Whether a block argument, as written, is calculated (an expression) rather than a fixed value
 * (tricc_oo `is_expression_arg`; meaning.json `expression_arg`). A placeholder stands for a
 * value: `{{x}}` as a quoted reference, `{{x | raw}}` as a bare word.
 */
export function isExpressionArg(arg: unknown): boolean {
  if (typeof arg !== 'string' || REFERENCE.test(arg)) return false
  const probe = arg.replace(PLACEHOLDER, (_m, _name: string, raw?: string) =>
    raw ? '__p__' : '"__p__"',
  )
  const { kind } = cqlKind(probe)
  return kind === 'operation' || kind === 'reference'
}

/** The value of a fixed argument: `'axillary'` gives `axillary`; anything else as written. */
export function literalValue(text: string): string {
  if (!text.trim().startsWith("'")) return text
  const parsed = cqlKind(text)
  return parsed.kind === 'text' && typeof parsed.value === 'string' ? parsed.value : text
}
