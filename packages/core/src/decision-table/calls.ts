import type { DecisionTable, FunctionAlias, HitPolicy, Project } from '../model/types.js'
import { effectiveAliases } from './file.js'
import { projectExpressions, type ExpressionSite } from '../terminology/retrieval.js'

/** The table functions. `DMN` uses the table's hit policy; the others force one. */
export const TABLE_FUNCTIONS = ['DMN', 'DMNFirst', 'DMNList'] as const
export type TableFunction = (typeof TABLE_FUNCTIONS)[number]

/** One call to a table in an expression. */
export interface TableCall {
  /** The name as written: `DMN`, `DMNList`, or an alias. */
  name: string
  function: TableFunction
  /** Set when the call goes through an alias. */
  alias?: FunctionAlias
  /** Offsets of the name and of the closing parenthesis (exclusive end). */
  start: number
  end: number
  /** Argument texts, trimmed. The first is the table (a string literal for a static call). */
  args: string[]
  /** The table id from a string literal first argument; `t.output` names an output. */
  table?: string
  output?: string
}

/** The policy a call uses. */
export function callPolicy(call: Pick<TableCall, 'function'>, table: DecisionTable): HitPolicy {
  if (call.function === 'DMNFirst') return 'first'
  if (call.function === 'DMNList') return 'rule_order'
  return table.hitPolicy
}

/** Every table call in an expression, outermost first. Calls inside arguments are found too. */
export function tableCalls(
  text: string | undefined,
  aliases?: Record<string, FunctionAlias>,
): TableCall[] {
  if (!text) return []
  const known = effectiveAliases(aliases)
  const names = [...TABLE_FUNCTIONS, ...Object.keys(known)]
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(?<![\\w."'])(${names.join('|')})\\s*\\(`, 'g')
  const masked = maskStrings(text)
  const calls: TableCall[] = []
  for (let m = re.exec(masked); m; m = re.exec(masked)) {
    const name = m[1]!
    const open = m.index + m[0].length - 1
    const close = matchingParen(masked, open)
    if (close < 0) continue
    const args = splitArgs(text, masked, open + 1, close)
    const alias = (TABLE_FUNCTIONS as readonly string[]).includes(name) ? undefined : known[name]
    const call: TableCall = {
      name,
      function: alias ? alias.function : (name as TableFunction),
      start: m.index,
      end: close + 1,
      args,
    }
    if (alias) call.alias = alias
    const tableIndex = alias ? Math.max(alias.args.indexOf('table'), 0) : 0
    const literal = /^'([^']*)'$/.exec(args[tableIndex] ?? '')
    if (literal) {
      const [id, output] = literal[1]!.split('.', 2)
      if (id) call.table = id
      if (output) call.output = output
    }
    calls.push(call)
  }
  return calls
}

/** The arguments bound to each input column, in column order; `undefined` where left out. */
export function boundArguments(call: TableCall, table: DecisionTable): (string | undefined)[] {
  if (call.alias) {
    return table.inputs.map((col) => {
      const at = call.alias!.args.indexOf(col.name)
      return at >= 0 ? call.args[at] : undefined
    })
  }
  return table.inputs.map((_, i) => call.args[i + 1])
}

/** Replace the inside of quoted strings by spaces, so parentheses in them are not counted. */
function maskStrings(text: string): string {
  let out = ''
  let quote: string | undefined
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (quote) {
      if (ch === '\\') {
        out += '  '
        i++
        continue
      }
      if (ch === quote) {
        quote = undefined
        out += ch
      } else out += ' '
      continue
    }
    if (ch === "'" || ch === '"') quote = ch
    out += ch
  }
  return out
}

function matchingParen(masked: string, open: number): number {
  let depth = 0
  for (let i = open; i < masked.length; i++) {
    const ch = masked[i]
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') {
      depth--
      if (depth === 0) return ch === ')' ? i : -1
    }
  }
  return -1
}

function splitArgs(text: string, masked: string, from: number, to: number): string[] {
  if (masked.slice(from, to).trim() === '') return []
  const args: string[] = []
  let depth = 0
  let start = from
  for (let i = from; i < to; i++) {
    const ch = masked[i]
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') depth--
    else if (ch === ',' && depth === 0) {
      args.push(text.slice(start, i).trim())
      start = i + 1
    }
  }
  args.push(text.slice(start, to).trim())
  return args
}

/** The expressions that call a table, with where they are. */
export function tableUsage(project: Project, tableId: string): ExpressionSite[] {
  return projectExpressions(project).filter((s) =>
    tableCalls(s.text, project.aliases).some((c) => c.table === tableId),
  )
}
