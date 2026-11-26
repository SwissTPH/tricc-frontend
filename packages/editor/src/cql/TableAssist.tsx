import {
  TABLE_FUNCTIONS,
  boundArguments,
  callPolicy,
  effectiveAliases,
  tableCalls,
  type DecisionTable,
  type Project,
} from '@tricc/core'

/** The call text `Insert a table…` adds: each input's concept as its argument. */
export function tableCallText(table: DecisionTable): string {
  const args = table.inputs.map((c) => `, "${c.concept ?? c.name}"`).join('')
  return `DMN('${table.id}'${args})`
}

/** A table name being typed: `DMN('dia|` → the prefix and where it starts. */
export function tableNamePrefix(
  text: string,
  cursor: number,
  project: Pick<Project, 'aliases'>,
): { from: number; prefix: string } | undefined {
  const names = [...TABLE_FUNCTIONS, ...Object.keys(effectiveAliases(project.aliases))]
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  const m = new RegExp(`(?:^|[^\\w."'])(?:${names})\\s*\\(\\s*'([\\w.]*)$`).exec(
    text.slice(0, cursor),
  )
  if (!m) return undefined
  return { from: cursor - m[1]!.length, prefix: m[1]! }
}

/**
 * Under an expression field: the tables matching a name being typed after `DMN('`, and the
 * signature of the call the cursor is in, the current argument in bold.
 */
export function TableAssist({
  project,
  text,
  cursor,
  testId,
  onComplete,
}: {
  project: Project
  text: string
  cursor: number | null
  testId: string
  /** Replace `[from, cursor)` by `insert`. */
  onComplete: (from: number, insert: string) => void
}) {
  const tables = project.decisionTables ?? {}
  if (cursor === null || Object.keys(tables).length === 0) return null

  const typing = tableNamePrefix(text, cursor, project)
  if (typing) {
    const matches = Object.values(tables)
      .filter((t) => t.id.toLowerCase().startsWith(typing.prefix.toLowerCase()))
      .sort((a, b) => a.id.localeCompare(b.id))
    if (matches.length === 0) return null
    return (
      <ul
        className="tricc-cql__complete"
        role="listbox"
        aria-label="Tables"
        data-testid={`${testId}-tables`}
      >
        {matches.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              role="option"
              aria-selected={false}
              data-testid={`${testId}-table-${t.id}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const closed = text.slice(cursor).startsWith("'")
                onComplete(typing.from, closed ? t.id : `${t.id}'`)
              }}
            >
              <code>{t.id}</code>
              {t.title ? ` — ${t.title}` : ''}
            </button>
          </li>
        ))}
      </ul>
    )
  }

  const call = tableCalls(text, project.aliases)
    .filter((c) => c.start <= cursor && cursor < c.end)
    .sort((a, b) => b.start - a.start)[0]
  const table = call?.table ? tables[call.table] : undefined
  if (!call || !table) return null
  const argIndex = argumentAt(text, call.start, cursor)
  const bound = boundArguments(call, table)
  const current = call.alias
    ? table.inputs.findIndex((c) => c.name === call.alias!.args[argIndex])
    : argIndex - 1
  const list = callPolicy(call, table) === 'rule_order'
  const outputs = call.output ? [call.output] : table.outputs.slice(0, 1).map((o) => o.name)
  return (
    <p className="tricc-cql__signature" data-testid={`${testId}-signature`}>
      <code>
        {call.name}('{table.id}'
        {table.inputs.map((col, i) => (
          <span key={col.name}>
            , {i === current ? <strong>{col.name}</strong> : col.name}
            {bound[i] === undefined && col.concept ? `=${col.concept}` : ''}
          </span>
        ))}
        )
      </code>{' '}
      → {list ? 'a list of ' : ''}
      {outputs.join(', ')}
      {list ? ' (every matching row)' : ' (first matching row)'}
    </p>
  )
}

/** Which argument (0 = the table) the cursor is in, counting top-level commas. */
function argumentAt(text: string, start: number, cursor: number): number {
  let depth = 0
  let quote: string | undefined
  let index = 0
  for (let i = start; i < cursor; i++) {
    const ch = text[i]!
    if (quote) {
      if (ch === quote) quote = undefined
      continue
    }
    if (ch === "'" || ch === '"') quote = ch
    else if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') depth--
    else if (ch === ',' && depth === 1) index++
  }
  return index
}
