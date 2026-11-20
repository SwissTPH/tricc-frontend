import { useMemo, useState } from 'react'
import {
  HIT_POLICIES,
  TABLE_COLUMN_TYPES,
  evaluateTable,
  tableProblems,
  tableUsage,
  validateTables,
  type CellValue,
  type DecisionTable,
  type HitPolicy,
  type InputValue,
  type Project,
  type TableColumn,
  type TableColumnType,
  type TableProblem,
} from '@tricc/core'
import { useCanWrite, useMutate, useProjectSnapshot } from '../runtime/context.js'
import { ConfirmDelete } from '../components/Dialog.js'
import { Typeahead, type TypeaheadOption } from '../components/Typeahead.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'

/** How each hit policy reads to an author. */
export const POLICY_TEXT: Record<HitPolicy, { label: string; help: string }> = {
  first: {
    label: 'First',
    help: 'The first matching row, from the top. Row order matters.',
  },
  unique: {
    label: 'Unique',
    help: 'At most one row may match; rows that can both match are flagged. Row order does not matter.',
  },
  rule_order: {
    label: 'List',
    help: 'Every matching row, in row order (DMN "rule order"). Count, exists or Sum the list in the expression.',
  },
}

const TYPE_TEXT: Record<TableColumnType, string> = {
  string: 'Text',
  integer: 'Whole number',
  decimal: 'Number',
  boolean: 'Yes/no',
}

/**
 * Decision tables (feature/20261120-decision-table-editor.md): the list, and one table in a
 * grid with its test panel. Expressions call a table with `DMN('<id>', …)`.
 */
export function TablesView({
  open,
  onOpen,
  onOpenNode,
}: {
  /** The table on screen; undefined shows the list. */
  open?: string
  onOpen: (id: string | undefined) => void
  onOpenNode?: (activityId: string, nodeId: string) => void
}) {
  const project = useProjectSnapshot()
  const table = open ? project.decisionTables?.[open] : undefined
  if (table) {
    return <TableEditor table={table} onOpen={onOpen} {...(onOpenNode ? { onOpenNode } : {})} />
  }
  return <TableList onOpen={onOpen} />
}

function TableList({ onOpen }: { onOpen: (id: string) => void }) {
  const project = useProjectSnapshot()
  const canWrite = useCanWrite()
  const mutate = useMutate()
  const [query, setQuery] = useState('')
  const issues = useMemo(() => validateTables(project), [project])
  const tables = useMemo(() => {
    const q = query.trim().toLowerCase()
    return Object.values(project.decisionTables ?? {})
      .filter((t) => !q || t.id.toLowerCase().includes(q) || t.title?.toLowerCase().includes(q))
      .sort((a, b) => a.id.localeCompare(b.id))
  }, [project.decisionTables, query])

  const add = () => {
    const id = freeId(project, 'table')
    mutate((tx) => tx.addDecisionTable(newTable(id)))
    onOpen(id)
  }

  return (
    <section
      className="tricc-dictionary tricc-tables"
      data-testid="tables-view"
      aria-labelledby="tables-heading"
    >
      <header className="tricc-editor__header">
        <h1 id="tables-heading">Decision tables</h1>
        <Input
          size="sm"
          type="search"
          data-testid="tables-search"
          aria-label="Find a table"
          placeholder="Search tables"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {canWrite && (
          <Button variant="outline" size="sm" type="button" data-testid="table-add" onClick={add}>
            + Table
          </Button>
        )}
      </header>
      <div className="tricc-dictionary__scroll">
        {tables.length === 0 ? (
          <p className="tricc-dictionary__empty" data-testid="no-tables">
            {query
              ? 'No table matches.'
              : "No decision tables yet. A table gives a value (a dose, a text) from the values of its inputs; an expression calls it with DMN('name', …). Use + Table."}
          </p>
        ) : (
          <table className="tricc-dictionary__table" data-testid="tables-list">
            <thead>
              <tr>
                <th>Name</th>
                <th>Title</th>
                <th>Hit policy</th>
                <th>Inputs</th>
                <th>Rows</th>
                <th>Problems</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => {
                const errors = issues.filter(
                  (i) => i.location.tableId === t.id && i.severity === 'error',
                ).length
                return (
                  <tr
                    key={t.id}
                    tabIndex={0}
                    data-testid={`table-row-${t.id}`}
                    onClick={() => onOpen(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onOpen(t.id)
                    }}
                  >
                    <td>
                      <code>{t.id}</code>
                    </td>
                    <td>{t.title}</td>
                    <td>{POLICY_TEXT[t.hitPolicy].label}</td>
                    <td>{t.inputs.map((c) => c.name).join(', ')}</td>
                    <td>{t.rules.length}</td>
                    <td className={errors ? 'tricc-tables__errors' : undefined}>{errors || ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

function newTable(id: string): DecisionTable {
  return {
    id,
    hitPolicy: 'first',
    inputs: [{ name: 'input', type: 'decimal' }],
    outputs: [{ name: 'result', type: 'string' }],
    rules: [['-', '']],
  }
}

function freeId(project: Project, base: string): string {
  const taken = project.decisionTables ?? {}
  if (!(base in taken)) return base
  let n = 2
  while (`${base}_${n}` in taken) n++
  return `${base}_${n}`
}

const ID = /^[A-Za-z][A-Za-z0-9_]*$/

function TableEditor({
  table,
  onOpen,
  onOpenNode,
}: {
  table: DecisionTable
  onOpen: (id: string | undefined) => void
  onOpenNode?: (activityId: string, nodeId: string) => void
}) {
  const project = useProjectSnapshot()
  const canWrite = useCanWrite()
  const mutate = useMutate()
  const [deleting, setDeleting] = useState(false)
  const [renameError, setRenameError] = useState<string | undefined>(undefined)
  const [dragged, setDragged] = useState<number | undefined>(undefined)
  const [testValues, setTestValues] = useState<Record<string, string>>({})
  const usage = useMemo(() => tableUsage(project, table.id), [project, table.id])
  const problems = useMemo(
    () =>
      tableProblems(table, {
        listValues:
          table.hitPolicy === 'rule_order' || usage.some((s) => /DMNList\s*\(/.test(s.text)),
      }),
    [table, usage],
  )
  const callIssues = useMemo(
    () =>
      validateTables(project).filter(
        (i) =>
          i.location.tableId === table.id &&
          i.location.row === undefined &&
          i.rule !== 'dmn.unused',
      ),
    [project, table.id],
  )
  const conceptOptions = useMemo(() => conceptChoices(project), [project])
  const inputs = table.inputs.length
  const set = (next: DecisionTable) => mutate((tx) => tx.setDecisionTable(next))

  const inputValues: InputValue[] = table.inputs.map((col) =>
    parseTestValue(testValues[col.name] ?? '', col.type),
  )
  const tested = Object.values(testValues).some((v) => v !== '')
  const result = tested ? evaluateTable(table, inputValues) : undefined

  const rename = (to: string) => {
    if (to === table.id) return
    if (!ID.test(to)) {
      setRenameError('A name starts with a letter, then letters, digits or _.')
      return
    }
    if (project.decisionTables?.[to]) {
      setRenameError(`There is already a table "${to}".`)
      return
    }
    setRenameError(undefined)
    mutate((tx) => tx.renameDecisionTable(table.id, to))
    onOpen(to)
  }

  const updateColumn = (index: number, next: TableColumn) => {
    const isInput = index < inputs
    const columns = isInput ? [...table.inputs] : [...table.outputs]
    columns[isInput ? index : index - inputs] = next
    set(isInput ? { ...table, inputs: columns } : { ...table, outputs: columns })
  }

  const addColumn = (kind: 'input' | 'output') => {
    const names = new Set([...table.inputs, ...table.outputs].map((c) => c.name))
    let name: string = kind
    for (let n = 2; names.has(name); n++) name = `${kind}_${n}`
    if (kind === 'input') {
      set({
        ...table,
        inputs: [...table.inputs, { name, type: 'decimal' }],
        rules: table.rules.map((r) => [...r.slice(0, inputs), '-', ...r.slice(inputs)]),
      })
    } else {
      set({
        ...table,
        outputs: [...table.outputs, { name, type: 'string' }],
        rules: table.rules.map((r) => [...r, '']),
      })
    }
  }

  const removeColumn = (index: number) => {
    const isInput = index < inputs
    set({
      ...table,
      inputs: isInput ? table.inputs.filter((_, i) => i !== index) : table.inputs,
      outputs: isInput ? table.outputs : table.outputs.filter((_, i) => i !== index - inputs),
      rules: table.rules.map((r) => r.filter((_, i) => i !== index)),
    })
  }

  /** Inputs only: their order is the argument order of DMN(). */
  const moveInput = (index: number, by: -1 | 1) => {
    const to = index + by
    if (to < 0 || to >= inputs) return
    const swap = <T,>(list: T[]): T[] => {
      const out = [...list]
      ;[out[index], out[to]] = [out[to]!, out[index]!]
      return out
    }
    set({ ...table, inputs: swap(table.inputs), rules: table.rules.map(swap) })
  }

  const emptyRule = () => [...table.inputs.map(() => '-'), ...table.outputs.map(() => '')]
  const problemAt = (row: number, column: number) =>
    problems.find((p) => p.row === row && p.column === column)
  const rowProblem = (row: number) => problems.find((p) => p.row === row && p.column === undefined)

  return (
    <section
      className="tricc-tables tricc-table-editor"
      data-testid="table-editor"
      aria-labelledby="table-heading"
    >
      <header className="tricc-editor__header">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          data-testid="table-back"
          onClick={() => onOpen(undefined)}
        >
          ← Tables
        </Button>
        <h1 id="table-heading">
          <code>
            DMN('{table.id}', {table.inputs.map((c) => c.name).join(', ')})
          </code>
        </h1>
        {canWrite && (
          <Button
            variant="outline"
            size="sm"
            type="button"
            data-testid="table-delete"
            onClick={() => setDeleting(true)}
          >
            Delete
          </Button>
        )}
      </header>

      <div className="tricc-table-editor__scroll">
        <div className="tricc-table-editor__fields">
          <label>
            Name
            <Input
              key={table.id}
              size="sm"
              data-testid="table-id"
              defaultValue={table.id}
              disabled={!canWrite}
              aria-invalid={renameError ? true : undefined}
              onBlur={(e) => rename(e.target.value.trim())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') rename((e.target as HTMLInputElement).value.trim())
              }}
            />
          </label>
          <label>
            Title
            <CommitInput
              testId="table-title"
              value={table.title ?? ''}
              disabled={!canWrite}
              onCommit={(title) => set(title ? { ...table, title } : withoutTitle(table))}
            />
          </label>
          <label>
            Hit policy
            <select
              data-testid="table-policy"
              value={table.hitPolicy}
              disabled={!canWrite}
              onChange={(e) => set({ ...table, hitPolicy: e.target.value as HitPolicy })}
            >
              {HIT_POLICIES.map((p) => (
                <option key={p} value={p}>
                  {POLICY_TEXT[p].label}
                </option>
              ))}
            </select>
          </label>
          <p className="tricc-nav__note" data-testid="table-policy-help">
            {POLICY_TEXT[table.hitPolicy].help}
          </p>
        </div>
        {renameError && (
          <p role="alert" className="tricc-tables__error">
            {renameError}
          </p>
        )}
        {usage.length > 0 && renameError === undefined && (
          <p className="tricc-nav__note">
            Renaming does not change the {usage.length} expression{usage.length === 1 ? '' : 's'}{' '}
            that call this table; they are flagged until updated.
          </p>
        )}

        <div className="tricc-table-editor__grid-wrap">
          <table className="tricc-table-grid" data-testid="table-grid">
            <thead>
              <tr>
                <th aria-label="Row" />
                {table.inputs.map((col, i) => (
                  <th
                    key={`in-${i}`}
                    className="tricc-table-grid__input"
                    data-testid={`table-input-${i}`}
                  >
                    <ColumnHeader
                      column={col}
                      kind="input"
                      disabled={!canWrite}
                      conceptOptions={conceptOptions}
                      project={project}
                      onChange={(next) => updateColumn(i, next)}
                      onRemove={() => removeColumn(i)}
                      {...(i > 0 ? { onLeft: () => moveInput(i, -1) } : {})}
                      {...(i < inputs - 1 ? { onRight: () => moveInput(i, 1) } : {})}
                      testId={`table-input-${i}`}
                    />
                  </th>
                ))}
                {table.outputs.map((col, j) => (
                  <th
                    key={`out-${j}`}
                    className="tricc-table-grid__output"
                    data-testid={`table-output-${j}`}
                  >
                    <ColumnHeader
                      column={col}
                      kind="output"
                      disabled={!canWrite}
                      conceptOptions={conceptOptions}
                      project={project}
                      onChange={(next) => updateColumn(inputs + j, next)}
                      onRemove={() => removeColumn(inputs + j)}
                      testId={`table-output-${j}`}
                    />
                  </th>
                ))}
                <th aria-label="Row actions" />
              </tr>
            </thead>
            <tbody>
              {table.rules.map((rule, r) => {
                const shape = rowProblem(r)
                return (
                  <tr
                    key={r}
                    data-testid={`table-rule-${r}`}
                    data-match={result?.matches.includes(r) ? 'true' : undefined}
                    data-kept={result?.kept.includes(r) ? 'true' : undefined}
                    draggable={canWrite}
                    onDragStart={(e) => {
                      setDragged(r)
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', String(r))
                    }}
                    onDragOver={(e) => {
                      if (dragged !== undefined) e.preventDefault()
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (dragged !== undefined)
                        mutate((tx) => tx.moveTableRow(table.id, dragged, r))
                      setDragged(undefined)
                    }}
                    onDragEnd={() => setDragged(undefined)}
                  >
                    <th
                      scope="row"
                      className="tricc-table-grid__handle"
                      title={shape?.message ?? 'Drag to reorder'}
                    >
                      {canWrite && <span aria-hidden="true">⠿</span>}
                      {r + 1}
                    </th>
                    {[...table.inputs, ...table.outputs].map((col, c) => {
                      const problem = problemAt(r, c)
                      return (
                        <td key={c} className={c < inputs ? undefined : 'tricc-table-grid__output'}>
                          <CommitInput
                            testId={`table-cell-${r}-${c}`}
                            value={rule[c] ?? ''}
                            disabled={!canWrite}
                            problem={problem}
                            label={`Row ${r + 1}, ${col.name}`}
                            onCommit={(value) =>
                              mutate((tx) => tx.setTableCell(table.id, r, c, value))
                            }
                          />
                        </td>
                      )
                    })}
                    <td className="tricc-table-grid__actions">
                      {canWrite && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            title="Move up"
                            aria-label={`Move row ${r + 1} up`}
                            disabled={r === 0}
                            data-testid={`table-rule-up-${r}`}
                            onClick={() => mutate((tx) => tx.moveTableRow(table.id, r, r - 1))}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            title="Move down"
                            aria-label={`Move row ${r + 1} down`}
                            disabled={r === table.rules.length - 1}
                            data-testid={`table-rule-down-${r}`}
                            onClick={() => mutate((tx) => tx.moveTableRow(table.id, r, r + 1))}
                          >
                            ↓
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            title="Remove the row"
                            aria-label={`Remove row ${r + 1}`}
                            data-testid={`table-rule-remove-${r}`}
                            onClick={() => mutate((tx) => tx.removeTableRow(table.id, r))}
                          >
                            ×
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {canWrite && (
          <div className="tricc-table-editor__add">
            <Button
              variant="outline"
              size="sm"
              type="button"
              data-testid="table-add-rule"
              onClick={() =>
                mutate((tx) => tx.insertTableRow(table.id, table.rules.length, emptyRule()))
              }
            >
              + Row
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              data-testid="table-add-input"
              onClick={() => addColumn('input')}
            >
              + Input
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              data-testid="table-add-output"
              onClick={() => addColumn('output')}
            >
              + Output
            </Button>
          </div>
        )}
        <p className="tricc-nav__note">
          Input cells: <code>-</code> any value, <code>null</code> not entered,{' '}
          <code>{'>= 20'}</code>, a range <code>[3..6)</code> (a square bracket includes the bound),
          a value (a number, <code>'text'</code>, <code>true</code>) or a list{' '}
          <code>1, 2, [5..7)</code>.
        </p>
        {problems.length > 0 && (
          <ul className="tricc-tables__problems" data-testid="table-problems">
            {problems.map((p, i) => (
              <li key={i}>
                {p.row !== undefined ? `Row ${p.row + 1}: ` : ''}
                {p.message}
              </li>
            ))}
          </ul>
        )}

        <section
          className="tricc-table-editor__test"
          data-testid="table-test"
          aria-labelledby="table-test-heading"
        >
          <h2 id="table-test-heading">Test</h2>
          <div className="tricc-table-editor__fields">
            {table.inputs.map((col) => (
              <label key={col.name}>
                {col.name}
                {col.type === 'boolean' ? (
                  <select
                    data-testid={`table-test-${col.name}`}
                    value={testValues[col.name] ?? ''}
                    onChange={(e) => setTestValues({ ...testValues, [col.name]: e.target.value })}
                  >
                    <option value="">not entered</option>
                    <option value="true">yes</option>
                    <option value="false">no</option>
                  </select>
                ) : (
                  <Input
                    size="sm"
                    data-testid={`table-test-${col.name}`}
                    placeholder="not entered"
                    inputMode={col.type === 'string' ? undefined : 'decimal'}
                    value={testValues[col.name] ?? ''}
                    onChange={(e) => setTestValues({ ...testValues, [col.name]: e.target.value })}
                  />
                )}
              </label>
            ))}
          </div>
          <p data-testid="table-test-result" aria-live="polite">
            {result ? describeResult(table, result) : 'Enter input values to see which rows match.'}
          </p>
        </section>

        <section aria-labelledby="table-usage-heading">
          <h2 id="table-usage-heading">Called from</h2>
          {usage.length === 0 ? (
            <p className="tricc-nav__note" data-testid="table-unused">
              No expression calls this table yet. Use <code>DMN('{table.id}', …)</code> in a
              calculation.
            </p>
          ) : (
            <ul data-testid="table-usage">
              {usage.map((site, i) => (
                <li key={i}>
                  {site.activityId && site.nodeId && onOpenNode ? (
                    <button
                      type="button"
                      className="tricc-chip"
                      onClick={() => onOpenNode(site.activityId!, site.nodeId!)}
                    >
                      {siteName(project, site)}
                    </button>
                  ) : (
                    <span>{siteName(project, site)}</span>
                  )}{' '}
                  <code>{site.text}</code>
                </li>
              ))}
            </ul>
          )}
          {callIssues.length > 0 && (
            <ul className="tricc-tables__problems">
              {callIssues.map((i, n) => (
                <li key={n}>{i.message}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {deleting && (
        <ConfirmDelete
          testId="table-delete-confirm"
          heading={`Delete the table "${table.id}"?`}
          onCancel={() => setDeleting(false)}
          onConfirm={() => {
            mutate((tx) => tx.removeDecisionTable(table.id))
            setDeleting(false)
            onOpen(undefined)
          }}
        >
          {usage.length > 0
            ? `${usage.length} expression${usage.length === 1 ? ' calls' : 's call'} it; they will show an error.`
            : 'No expression calls it.'}
        </ConfirmDelete>
      )}
    </section>
  )
}

/** A node by its name, else where the expression is. */
function siteName(
  project: Project,
  site: { activityId?: string; nodeId?: string; interventionId?: string },
): string {
  if (site.activityId && site.nodeId)
    return project.activities[site.activityId]?.nodes[site.nodeId]?.name ?? site.nodeId
  return site.interventionId ?? site.activityId ?? ''
}

function withoutTitle(table: DecisionTable): DecisionTable {
  const { title: _title, ...rest } = table
  return rest
}

function ColumnHeader({
  column,
  kind,
  disabled,
  conceptOptions,
  project,
  onChange,
  onRemove,
  onLeft,
  onRight,
  testId,
}: {
  column: TableColumn
  kind: 'input' | 'output'
  disabled: boolean
  conceptOptions: TypeaheadOption[]
  project: Project
  onChange: (next: TableColumn) => void
  onRemove: () => void
  onLeft?: () => void
  onRight?: () => void
  testId: string
}) {
  const concept = column.concept ? findConcept(project, column.concept) : undefined
  return (
    <div className="tricc-table-grid__column">
      <span className="tricc-table-grid__kind">{kind === 'input' ? 'Input' : 'Output'}</span>
      <CommitInput
        testId={`${testId}-name`}
        value={column.name}
        disabled={disabled}
        label={`${kind} name`}
        onCommit={(name) => name && onChange({ ...column, name })}
      />
      <select
        data-testid={`${testId}-type`}
        aria-label={`${column.name} type`}
        value={column.type}
        disabled={disabled}
        onChange={(e) => onChange({ ...column, type: e.target.value as TableColumnType })}
      >
        {TABLE_COLUMN_TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_TEXT[t]}
          </option>
        ))}
      </select>
      {kind === 'input' &&
        (column.concept ? (
          <span className="tricc-table-grid__concept" data-testid={`${testId}-concept`}>
            <code
              title={concept?.display ?? 'Not in any dictionary'}
              data-missing={concept ? undefined : 'true'}
            >
              {column.concept}
            </code>
            {!disabled && (
              <button
                type="button"
                className="tricc-table-grid__clear"
                aria-label={`Clear the concept of ${column.name}`}
                onClick={() => {
                  const { concept: _c, ...rest } = column
                  onChange(rest)
                }}
              >
                ×
              </button>
            )}
          </span>
        ) : (
          !disabled && (
            <Typeahead
              label={`Concept of ${column.name}`}
              testId={`${testId}-concept-search`}
              options={conceptOptions}
              placeholder="Concept (optional)"
              emptyMessage="No concept matches."
              initialSuggestions={0}
              onSelect={(code) => {
                const picked = findConcept(project, code)
                onChange({
                  ...column,
                  concept: code,
                  type: columnTypeOf(picked?.dataType) ?? column.type,
                })
              }}
            />
          )
        ))}
      {!disabled && (
        <span className="tricc-table-grid__column-actions">
          {onLeft && (
            <button
              type="button"
              aria-label={`Move ${column.name} left`}
              title="Move left (argument order)"
              onClick={onLeft}
            >
              ←
            </button>
          )}
          {onRight && (
            <button
              type="button"
              aria-label={`Move ${column.name} right`}
              title="Move right (argument order)"
              onClick={onRight}
            >
              →
            </button>
          )}
          <button
            type="button"
            aria-label={`Remove the column ${column.name}`}
            title="Remove the column"
            data-testid={`${testId}-remove`}
            onClick={onRemove}
          >
            ×
          </button>
        </span>
      )}
    </div>
  )
}

/** A text box that commits on blur or Enter, so typing is one undo step and one sync. */
function CommitInput({
  value,
  onCommit,
  disabled,
  testId,
  problem,
  label,
}: {
  value: string
  onCommit: (value: string) => void
  disabled?: boolean
  testId: string
  problem?: TableProblem | undefined
  label?: string
}) {
  const [draft, setDraft] = useState<string | undefined>(undefined)
  const commit = () => {
    if (draft !== undefined && draft !== value) onCommit(draft)
    setDraft(undefined)
  }
  return (
    <Input
      size="sm"
      data-testid={testId}
      aria-label={label}
      aria-invalid={problem ? true : undefined}
      title={problem?.message}
      className={problem ? 'tricc-table-grid__invalid' : undefined}
      value={draft ?? value}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setDraft(undefined)
      }}
    />
  )
}

function conceptChoices(project: Project): TypeaheadOption[] {
  const out: TypeaheadOption[] = []
  const seen = new Set<string>()
  for (const cs of Object.values(project.codeSystems)) {
    for (const code of cs.conceptOrder) {
      const c = cs.concepts[code]
      if (!c || seen.has(code)) continue
      seen.add(code)
      out.push({
        id: code,
        label: c.display ?? code,
        hint: c.dataType ? `${code} · ${c.dataType}` : code,
      })
    }
  }
  return out
}

function findConcept(project: Project, code: string) {
  for (const cs of Object.values(project.codeSystems)) {
    const c = cs.concepts[code]
    if (c) return c
  }
  return undefined
}

/** The column type a concept's data type gives; undefined keeps the column's. */
export function columnTypeOf(dataType: string | undefined): TableColumnType | undefined {
  if (
    dataType === 'integer' ||
    dataType === 'decimal' ||
    dataType === 'boolean' ||
    dataType === 'string'
  )
    return dataType
  return undefined
}

function parseTestValue(text: string, type: TableColumnType): InputValue {
  const t = text.trim()
  if (t === '') return null
  if (type === 'boolean') return t === 'true'
  if (type === 'string') return text
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function show(values: (CellValue | undefined)[], table: DecisionTable): string {
  return values
    .map(
      (v, i) =>
        (table.outputs.length > 1 ? `${table.outputs[i]?.name} = ` : '') +
        (v === undefined ? '?' : String(v) === '' ? '(empty)' : String(v)),
    )
    .join(', ')
}

function describeResult(table: DecisionTable, result: ReturnType<typeof evaluateTable>): string {
  const rows = (list: number[]) => list.map((r) => r + 1).join(', ')
  if (result.matches.length === 0) return 'No row matches: the result is empty.'
  const matched = `Matching rows: ${rows(result.matches)}.`
  if (result.policy === 'rule_order') {
    const list = result.value as (CellValue | undefined)[][]
    return `${matched} List: ${list.map((v) => `[${show(v, table)}]`).join(', ')}.`
  }
  const first = result.value as (CellValue | undefined)[]
  return `${matched} Row ${rows(result.kept)} gives ${show(first, table)}.`
}
