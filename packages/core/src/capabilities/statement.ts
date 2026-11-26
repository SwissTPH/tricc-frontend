/**
 * Output capability statements (feature/20261125-output-capabilities.md): validation against the
 * rules of `statement.schema.json` (copied from tricc), `extends` resolution, semver ranges and
 * the change summary of an update. The same rules as tricc_oo's `converters/capabilities.py`.
 */
import schema from './statement.schema.json' with { type: 'json' }

export type StatementPart = {
  contexts?: string[]
  operators?: Record<string, string[]>
  functions?: string[]
  retrieval_contexts?: string[]
  populate_contexts?: string[]
  data_types?: string[]
  features?: string[]
}

export interface Statement extends StatementPart {
  $schema?: string
  id: string
  version: string
  strategy: string
  description?: string
  extends?: { package: string; version: string }
  lang: string
  limits?: { inline_decision_table_rows?: number }
  add?: StatementPart
  remove?: StatementPart
}

export interface ResolvedStatement {
  id: string
  version: string
  strategy: string
  lang: string
  /** `id@version` from the statement up to its root. */
  chain: string[]
  contexts: Set<string>
  operators: Map<string, Set<string>>
  functions: Set<string>
  retrieval_contexts: Set<string>
  populate_contexts: Set<string>
  data_types: Set<string>
  features: Set<string>
  limits: { inline_decision_table_rows?: number }
}

/** `id@version`. */
export const statementLabel = (s: { id: string; version: string }) => `${s.id}@${s.version}`

export const SET_FIELDS = [
  'contexts',
  'functions',
  'retrieval_contexts',
  'populate_contexts',
  'data_types',
  'features',
] as const

const defs = schema.$defs
/** The enums of the schema (kept equal to the copied file by reading it). */
export const STATEMENT_CONTEXTS: readonly string[] = defs.contexts.items.enum
export const FEATURES: readonly string[] = defs.features.items.enum
const ID = new RegExp(schema.properties.id.pattern)
const VERSION = new RegExp(schema.properties.version.pattern)
const OPERATOR = new RegExp(defs.operators.propertyNames.pattern)
const TOP = new Set(Object.keys(schema.properties))
const PART = new Set(Object.keys(defs.part.properties))

/** The first problem of a statement against `statement.schema.json`, else undefined. */
export function statementProblem(data: unknown): string | undefined {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'not a JSON object'
  const s = data as Record<string, unknown>
  for (const key of schema.required) if (s[key] === undefined) return `${key}: required`
  for (const key of Object.keys(s)) if (!TOP.has(key)) return `${key}: not allowed`
  if (typeof s['id'] !== 'string' || !ID.test(s['id'])) return 'id: not a package name'
  if (typeof s['version'] !== 'string' || !VERSION.test(s['version']))
    return 'version: not a semver version'
  for (const key of ['strategy', 'lang', 'description', '$schema'])
    if (s[key] !== undefined && (typeof s[key] !== 'string' || s[key] === ''))
      return `${key}: not a text`
  if (s['extends'] !== undefined) {
    const e = s['extends'] as Record<string, unknown>
    if (
      !e ||
      typeof e !== 'object' ||
      typeof e['package'] !== 'string' ||
      typeof e['version'] !== 'string'
    )
      return 'extends: needs package and version'
    if (Object.keys(e).some((k) => k !== 'package' && k !== 'version'))
      return 'extends: unknown key'
    for (const key of [...SET_FIELDS, 'operators'])
      if (s[key] !== undefined) return `${key}: a child statement lists it under add / remove`
  } else {
    for (const key of ['contexts', 'operators', 'functions'])
      if (s[key] === undefined) return `${key}: required`
    if (s['add'] !== undefined || s['remove'] !== undefined)
      return 'add / remove: only with extends'
  }
  const part = partProblem(s, '')
  if (part) return part
  for (const key of ['add', 'remove']) {
    const p = s[key]
    if (p === undefined) continue
    if (!p || typeof p !== 'object' || Array.isArray(p)) return `${key}: not an object`
    for (const k of Object.keys(p)) if (!PART.has(k)) return `${key}/${k}: not allowed`
    const problem = partProblem(p as Record<string, unknown>, `${key}/`)
    if (problem) return problem
  }
  const limits = s['limits'] as Record<string, unknown> | undefined
  if (limits !== undefined) {
    if (!limits || typeof limits !== 'object') return 'limits: not an object'
    for (const [k, v] of Object.entries(limits)) {
      if (k !== 'inline_decision_table_rows') return `limits/${k}: not allowed`
      if (!Number.isInteger(v) || (v as number) < 0) return `limits/${k}: not a whole number`
    }
  }
  return undefined
}

function names(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every((v) => typeof v === 'string' && v !== '') &&
    new Set(value).size === value.length
  )
}

function partProblem(p: Record<string, unknown>, at: string): string | undefined {
  for (const key of ['contexts', 'functions', 'data_types'])
    if (p[key] !== undefined && !names(p[key])) return `${at}${key}: not a list of names`
  for (const key of ['retrieval_contexts', 'populate_contexts'])
    if (
      p[key] !== undefined &&
      !(names(p[key]) && (p[key] as string[]).every((c) => STATEMENT_CONTEXTS.includes(c)))
    )
      return `${at}${key}: not a list of contexts`
  if (
    p['features'] !== undefined &&
    !(names(p['features']) && (p['features'] as string[]).every((f) => FEATURES.includes(f)))
  )
    return `${at}features: unknown feature`
  const ops = p['operators']
  if (ops !== undefined) {
    if (!ops || typeof ops !== 'object' || Array.isArray(ops))
      return `${at}operators: not an object`
    for (const [k, v] of Object.entries(ops)) {
      if (!OPERATOR.test(k)) return `${at}operators/${k}: not an operator name`
      if (!names(v)) return `${at}operators/${k}: not a list of contexts`
    }
  }
  return undefined
}

// ---------------------------------------------------------------- semver

const SEMVER = /^\s*v?(\d+)(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(?:-[0-9A-Za-z.-]+)?\s*$/
type V = [number, number, number]

export function parseVersion(text: string): V {
  const m = SEMVER.exec(text)
  if (!m) throw new Error(`not a version: ${text}`)
  return [1, 2, 3].map((i) => (m[i] && /^\d+$/.test(m[i]!) ? Number(m[i]) : 0)) as V
}

const cmp = (a: V, b: V) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]

function comparator(v: V, text: string): boolean {
  const t = text.trim()
  if (t === '' || t === '*' || t === 'x' || t === 'X') return true
  for (const op of ['>=', '<=', '>', '<', '=']) {
    if (!t.startsWith(op)) continue
    const c = cmp(v, parseVersion(t.slice(op.length)))
    return op === '>='
      ? c >= 0
      : op === '<='
        ? c <= 0
        : op === '>'
          ? c > 0
          : op === '<'
            ? c < 0
            : c === 0
  }
  if (t[0] === '^' || t[0] === '~') {
    const low = parseVersion(t.slice(1))
    const high: V =
      t[0] === '~'
        ? [low[0], low[1] + 1, 0]
        : low[0]
          ? [low[0] + 1, 0, 0]
          : low[1]
            ? [0, low[1] + 1, 0]
            : [0, 0, low[2] + 1]
    return cmp(v, low) >= 0 && cmp(v, high) < 0
  }
  const m = SEMVER.exec(t)
  if (m && [m[2], m[3]].some((p) => p === undefined || !/^\d+$/.test(p))) {
    if (m[2] === undefined || !/^\d+$/.test(m[2])) return v[0] === Number(m[1])
    return v[0] === Number(m[1]) && v[1] === Number(m[2])
  }
  return cmp(v, parseVersion(t)) === 0
}

/** Whether `version` is in an npm-style range (`^1.0.0`, `~1.2.0`, `1.x`, `>=1 <2`, `a || b`). */
export function versionSatisfies(version: string, range: string): boolean {
  const v = parseVersion(version)
  return (range || '*').split('||').some((alt) =>
    alt
      .trim()
      .split(/\s+/)
      .every((part) => comparator(v, part)),
  )
}

// ---------------------------------------------------------------- resolution

export class StatementError extends Error {
  constructor(
    readonly code: 'E_CAPABILITY_FILE' | 'E_CAPABILITY_EXTENDS',
    message: string,
  ) {
    super(message)
  }
}

function apply(target: ResolvedStatement, part: StatementPart, remove: boolean): void {
  for (const field of SET_FIELDS) {
    for (const v of part[field] ?? []) {
      if (remove) target[field].delete(v)
      else target[field].add(v)
    }
  }
  for (const [op, contexts] of Object.entries(part.operators ?? {})) {
    const current = new Set(target.operators.get(op) ?? [])
    if (remove && contexts.length === 0) current.clear()
    for (const c of contexts) {
      if (remove) current.delete(c)
      else current.add(c)
    }
    if (current.size) target.operators.set(op, current)
    else target.operators.delete(op)
  }
}

/** Apply the `extends` chain. Throws `E_CAPABILITY_EXTENDS`. */
export function resolveStatement(
  id: string,
  statements: ReadonlyMap<string, Statement>,
): ResolvedStatement {
  const chain: Statement[] = []
  let current = statements.get(id)
  if (!current) throw new StatementError('E_CAPABILITY_EXTENDS', `${id} is not loaded`)
  for (;;) {
    chain.push(current)
    const parent = current.extends
    if (!parent) break
    if (chain.some((c) => c.id === parent.package))
      throw new StatementError('E_CAPABILITY_EXTENDS', `${id}: extends loops at ${parent.package}`)
    const loaded = statements.get(parent.package)
    if (!loaded)
      throw new StatementError(
        'E_CAPABILITY_EXTENDS',
        `${statementLabel(current)} extends ${parent.package} ${parent.version}, which is not loaded in this project`,
      )
    if (!versionSatisfies(loaded.version, parent.version))
      throw new StatementError(
        'E_CAPABILITY_EXTENDS',
        `${statementLabel(current)} extends ${parent.package} ${parent.version}; the project has ${loaded.version}`,
      )
    current = loaded
  }
  const top = chain[0]!
  const resolved: ResolvedStatement = {
    id: top.id,
    version: top.version,
    strategy: top.strategy,
    lang: top.lang,
    chain: chain.map(statementLabel),
    contexts: new Set(),
    operators: new Map(),
    functions: new Set(),
    retrieval_contexts: new Set(),
    populate_contexts: new Set(),
    data_types: new Set(),
    features: new Set(),
    limits: {},
  }
  for (const s of [...chain].reverse()) {
    if (s.extends) {
      apply(resolved, s.add ?? {}, false)
      apply(resolved, s.remove ?? {}, true)
    } else apply(resolved, s, false)
    Object.assign(resolved.limits, s.limits ?? {})
  }
  return resolved
}

export interface StatementChanges {
  [field: string]: { added: string[]; removed: string[] }
}

function flat(s: ResolvedStatement, field: string): Set<string> {
  if (field === 'operators')
    return new Set(
      [...s.operators].flatMap(([op, contexts]) => [...contexts].map((c) => `${op}:${c}`)),
    )
  return s[field as (typeof SET_FIELDS)[number]]
}

/** What an update changes: per field, the values added and removed. */
export function diffStatements(
  before: ResolvedStatement,
  after: ResolvedStatement,
): StatementChanges {
  const out: StatementChanges = {}
  for (const field of ['operators', ...SET_FIELDS]) {
    const a = flat(before, field)
    const b = flat(after, field)
    const added = [...b].filter((x) => !a.has(x)).sort()
    const removed = [...a].filter((x) => !b.has(x)).sort()
    if (added.length || removed.length) out[field] = { added, removed }
  }
  return out
}

/** Whether a resolved statement writes `operator` (in `context` when given). */
export function statementWrites(s: ResolvedStatement, operator: string, context?: string): boolean {
  const contexts = s.operators.get(operator)
  return Boolean(contexts?.size) && (context === undefined || contexts!.has(context))
}
