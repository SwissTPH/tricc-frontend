import {
  HIT_POLICIES,
  TABLE_COLUMN_TYPES,
  type DecisionTable,
  type FunctionAlias,
  type HitPolicy,
  type TableColumn,
  type TableColumnType,
} from '../model/types.js'
import { fromYaml, toYaml } from '../format/serialize/yaml.js'

/**
 * `tables/<id>.yaml`: one decision table. The writer is byte-stable — same key order, one rule
 * per line as a flow sequence, columns aligned — so a dose change is a one-line diff:
 *
 * ```yaml
 * rules:
 *   - [">= 20",    "-",        "2.5"]
 *   - ["[15..20)", "-",        "1.7"]
 * ```
 */
export function encodeTableFile(table: DecisionTable): string {
  const head: Record<string, unknown> = { id: table.id }
  if (table.title) head['title'] = table.title
  head['hit_policy'] = table.hitPolicy
  head['inputs'] = table.inputs.map(encodeColumn)
  head['outputs'] = table.outputs.map(encodeColumn)
  let text = toYaml(head)
  if (table.rules.length === 0) return `${text}rules: []\n`
  text += 'rules:\n'
  const quoted = table.rules.map((rule) => rule.map((cell) => JSON.stringify(cell)))
  const widths: number[] = []
  for (const row of quoted) row.forEach((q, i) => (widths[i] = Math.max(widths[i] ?? 0, q.length)))
  for (const row of quoted) {
    const last = row.length - 1
    const cells = row.map((q, i) => (i < last ? `${q},`.padEnd((widths[i] ?? 0) + 2) : q))
    text += `  - [${cells.join('')}]\n`
  }
  return text
}

function encodeColumn(column: TableColumn): Record<string, unknown> {
  const o: Record<string, unknown> = { name: column.name }
  if (column.concept) o['concept'] = column.concept
  o['type'] = column.type
  return o
}

/** Read a table file. Throws with a message an author can act on. */
export function decodeTableFile(text: string, path: string): DecisionTable {
  let raw: unknown
  try {
    raw = fromYaml(text)
  } catch (e) {
    throw new Error(`${path} is not valid YAML (${e instanceof Error ? e.message : String(e)}).`)
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${path} must be a mapping with id, inputs, outputs and rules.`)
  }
  const doc = raw as Record<string, unknown>
  const id = typeof doc['id'] === 'string' && doc['id'].trim() ? doc['id'].trim() : undefined
  if (!id) throw new Error(`${path} has no id. Add "id: <name>" — the name DMN('<name>', …) uses.`)
  const policy = doc['hit_policy'] ?? 'first'
  if (typeof policy !== 'string' || !(HIT_POLICIES as readonly string[]).includes(policy)) {
    throw new Error(
      `${path}: hit_policy "${String(policy)}" is not one of ${HIT_POLICIES.join(', ')}.`,
    )
  }
  const table: DecisionTable = {
    id,
    hitPolicy: policy as HitPolicy,
    inputs: decodeColumns(doc['inputs'], path, 'inputs'),
    outputs: decodeColumns(doc['outputs'], path, 'outputs'),
    rules: decodeRules(doc['rules'], path),
  }
  if (typeof doc['title'] === 'string' && doc['title']) table.title = doc['title']
  return table
}

function decodeColumns(value: unknown, path: string, key: string): TableColumn[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new Error(`${path}: ${key} must be a list of columns.`)
  return value.map((entry, i) => {
    const rec = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>
    const name = typeof rec['name'] === 'string' ? rec['name'] : undefined
    if (!name) throw new Error(`${path}: ${key} column ${i + 1} has no name.`)
    const type = rec['type'] ?? 'string'
    if (typeof type !== 'string' || !(TABLE_COLUMN_TYPES as readonly string[]).includes(type)) {
      throw new Error(
        `${path}: column "${name}" has type "${String(type)}"; use one of ${TABLE_COLUMN_TYPES.join(', ')}.`,
      )
    }
    const column: TableColumn = { name, type: type as TableColumnType }
    if (typeof rec['concept'] === 'string' && rec['concept']) column.concept = rec['concept']
    return column
  })
}

function decodeRules(value: unknown, path: string): string[][] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new Error(`${path}: rules must be a list of rows.`)
  return value.map((row, i) => {
    if (!Array.isArray(row)) throw new Error(`${path}: rule ${i + 1} must be a list of cells.`)
    // An unquoted cell reads as a number or a boolean; the table keeps what was written.
    return row.map((cell) => (cell === null ? 'null' : String(cell)))
  })
}

// ---------------------------------------------------------------- aliases

/** `DrugDosage` keeps working when a project declares no alias of that name. */
export const BUILTIN_ALIASES: Record<string, FunctionAlias> = {
  DrugDosage: { function: 'DMN', args: ['table', 'age', 'weight'] },
}

/** The aliases in effect: the project's, over the built-in ones. */
export function effectiveAliases(aliases: Record<string, FunctionAlias> | undefined) {
  return { ...BUILTIN_ALIASES, ...(aliases ?? {}) }
}

export function decodeAliases(value: unknown): Record<string, FunctionAlias> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const out: Record<string, FunctionAlias> = {}
  for (const [name, raw] of Object.entries(value as Record<string, unknown>)) {
    const rec = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const fn = rec['function'] ?? 'DMN'
    if (fn !== 'DMN' && fn !== 'DMNFirst' && fn !== 'DMNList') continue
    const args = Array.isArray(rec['args'])
      ? rec['args'].filter((a): a is string => typeof a === 'string')
      : []
    out[name] = { function: fn, args }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function encodeAliases(
  aliases: Record<string, FunctionAlias>,
): Record<string, { function: string; args: string[] }> {
  const out: Record<string, { function: string; args: string[] }> = {}
  for (const name of Object.keys(aliases).sort()) {
    const a = aliases[name]!
    out[name] = { function: a.function, args: [...a.args] }
  }
  return out
}
