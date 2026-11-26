import { useEffect, useMemo, useState } from 'react'
import {
  diffStatements,
  projectStatements,
  resolveStatement,
  statementProblem,
  statementSet,
  withActive,
  withStatement,
  withoutStatement,
  type CapabilityPackageInfo,
  type CapabilityRegistry,
  type Project,
  type Statement,
  type StatementChanges,
  type StatementSet,
} from '@tricc/core'
import { useCanWrite, useMutate, useProjectSnapshot, useRuntime } from '../runtime/context.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'

type Source = 'npm' | 'github'

interface PendingUpdate {
  pkg: string
  statement: Statement
  changes: StatementChanges
}

/**
 * The project's output capability statements (feature/20261125-output-capabilities.md §1.6):
 * the loaded ones (activate, update, remove) and where to add one from: npm, GitHub Packages
 * (with a token, kept only while the tab is open) or a file. A project without any lists the
 * latest published statements.
 */
export function CapabilitiesPanel() {
  const project = useProjectSnapshot()
  const runtime = useRuntime()
  const canWrite = useCanWrite()
  const mutate = useMutate()
  const factory = runtime.capabilityRegistry
  const [source, setSource] = useState<Source>('npm')
  const [token, setToken] = useState('')
  const [published, setPublished] = useState<CapabilityPackageInfo[] | undefined>()
  const [message, setMessage] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<PendingUpdate | undefined>()
  const entries = project.capabilities ?? []
  const loaded = useMemo(() => projectStatements(project).loaded, [project])

  const registry = (): CapabilityRegistry | undefined =>
    factory ? factory(source, source === 'github' ? token || undefined : undefined) : undefined

  const save = (set: StatementSet) => mutate((tx) => tx.setCapabilities(set.entries, set.files))

  const run = async (what: () => Promise<void>) => {
    setBusy(true)
    setMessage(undefined)
    try {
      await what()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const list = () =>
    run(async () => {
      const r = registry()
      if (r) setPublished(await r.list())
    })

  // A new project opens on the latest published statements.
  useEffect(() => {
    if (factory && entries.length === 0 && published === undefined) void list()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factory])

  /** Add a statement, and the parents it extends that the source can give (inactive). */
  const add = (pkg: string, version: string) =>
    run(async () => {
      const r = registry()
      if (!r) return
      let set = statementSet(project)
      const chain: Statement[] = []
      let next: { pkg: string; version: string } | undefined = { pkg, version }
      while (next) {
        const data = await r.fetchStatement(next.pkg, next.version)
        const problem = statementProblem(data)
        if (problem)
          throw new Error(`${next.pkg}@${next.version} is not a capability statement (${problem}).`)
        const statement = data as Statement
        chain.push(statement)
        const parent: Statement['extends'] = statement.extends
        if (!parent || loaded.has(parent.package) || chain.some((c) => c.id === parent.package))
          break
        const versions = await r.versions(parent.package)
        const latest = [...versions].reverse()[0]
        if (!latest)
          throw new Error(
            `${statement.id} extends ${parent.package}, which ${r.url} does not have.`,
          )
        next = { pkg: parent.package, version: latest }
      }
      chain.forEach((statement, i) => {
        set = withStatement(set, statement, { source: r.source, registry: r.url }, i === 0)
      })
      save(set)
    })

  const upload = (file: File) =>
    run(async () => {
      let data: unknown
      try {
        data = JSON.parse(await readText(file))
      } catch {
        throw new Error(`${file.name} is not JSON.`)
      }
      const problem = statementProblem(data)
      if (problem) throw new Error(`${file.name} is not a capability statement (${problem}).`)
      const statement = data as Statement
      const existing = loaded.get(statement.id)
      if (existing) return preview(statement.id, statement)
      save(withStatement(statementSet(project), statement, { source: 'file' }))
      if (statement.extends && !loaded.has(statement.extends.package))
        setMessage(`${statement.id} extends ${statement.extends.package}: load it too.`)
    })

  /** Compare the loaded statement with another version before replacing it. */
  const preview = async (pkg: string, statement: Statement) => {
    const before = new Map(loaded)
    const after = new Map(loaded)
    after.set(pkg, statement)
    try {
      const changes = diffStatements(resolveStatement(pkg, before), resolveStatement(pkg, after))
      setPending({ pkg, statement, changes })
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e))
    }
  }

  const update = (pkg: string) =>
    run(async () => {
      const entry = entries.find((e) => e.package === pkg)
      const r =
        entry && entry.source !== 'file' && factory
          ? factory(entry.source, token || undefined)
          : undefined
      if (!entry || !r) return
      const versions = await r.versions(pkg)
      const latest = [...versions].reverse()[0]
      if (!latest || latest === entry.version) {
        setMessage(`${pkg} ${entry.version} is the latest version.`)
        return
      }
      const data = await r.fetchStatement(pkg, latest)
      const problem = statementProblem(data)
      if (problem) throw new Error(`${pkg}@${latest} is not a capability statement (${problem}).`)
      await preview(pkg, data as Statement)
    })

  const apply = () => {
    if (!pending) return
    const entry = entries.find((e) => e.package === pending.pkg)
    const src = entry?.source === 'file' || !entry ? 'file' : entry.source
    const r = src !== 'file' && factory ? factory(src) : undefined
    save(
      withStatement(statementSet(project), pending.statement, {
        source: src,
        ...(r ? { registry: entry?.registry ?? r.url } : {}),
      }),
    )
    setPending(undefined)
  }

  return (
    <section className="tricc-capabilities" data-testid="capabilities">
      <p className="tricc-overview__about">
        What each output can write. The build and the problems list check the drawing against the
        active statements; a copy of each is kept in the project.
      </p>
      {entries.length === 0 ? (
        <p data-testid="capabilities-empty">No statement is loaded: nothing is checked.</p>
      ) : (
        <ul className="tricc-capabilities__list">
          {entries.map((e) => (
            <li key={e.package} data-testid={`capability-${e.package}`}>
              <label>
                <input
                  type="checkbox"
                  checked={e.active}
                  disabled={!canWrite}
                  data-testid={`capability-active-${e.package}`}
                  onChange={(ev) =>
                    save(withActive(statementSet(project), e.package, ev.target.checked))
                  }
                />{' '}
                <code>{e.package}</code> {e.version}
              </label>{' '}
              <span className="tricc-capabilities__source">
                {e.source === 'file' ? 'file' : e.source === 'github' ? 'GitHub Packages' : 'npm'}
                {loaded.get(e.package)?.strategy ? ` · ${loaded.get(e.package)!.strategy}` : ''}
              </span>
              {canWrite && (
                <>
                  {e.source !== 'file' && factory && (
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled={busy}
                      data-testid={`capability-update-${e.package}`}
                      onClick={() => void update(e.package)}
                    >
                      Update
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    data-testid={`capability-remove-${e.package}`}
                    onClick={() => save(withoutStatement(statementSet(project), e.package))}
                  >
                    Remove
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {pending && (
        <div className="tricc-capabilities__update" data-testid="capability-changes">
          <p>
            Update <code>{pending.pkg}</code> to {pending.statement.version}:
          </p>
          <Changes changes={pending.changes} />
          <Button type="button" size="sm" data-testid="capability-apply" onClick={apply}>
            Apply
          </Button>{' '}
          <Button type="button" size="sm" variant="outline" onClick={() => setPending(undefined)}>
            Cancel
          </Button>
        </div>
      )}

      {canWrite && (
        <div className="tricc-capabilities__add">
          <h3>Add a statement</h3>
          {factory && (
            <>
              <label>
                From{' '}
                <select
                  value={source}
                  data-testid="capability-source"
                  onChange={(e) => {
                    setSource(e.target.value as Source)
                    setPublished(undefined)
                  }}
                >
                  <option value="npm">npm</option>
                  <option value="github">GitHub Packages</option>
                </select>
              </label>
              {source === 'github' && (
                <Input
                  size="sm"
                  type="password"
                  placeholder="GitHub token (read:packages), not saved"
                  value={token}
                  data-testid="capability-token"
                  onChange={(e) => setToken(e.target.value)}
                />
              )}
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={busy}
                data-testid="capability-list"
                onClick={() => void list()}
              >
                List published statements
              </Button>
              {published && (
                <ul className="tricc-capabilities__published" data-testid="capability-published">
                  {published.map((p) => (
                    <li key={p.package}>
                      <code>{p.package}</code> {p.version}
                      {p.description ? ` — ${p.description}` : ''}{' '}
                      {loaded.has(p.package) ? (
                        <em>loaded</em>
                      ) : (
                        <Button
                          size="sm"
                          type="button"
                          disabled={busy}
                          data-testid={`capability-add-${p.package}`}
                          onClick={() => void add(p.package, p.version)}
                        >
                          Add
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <label>
            Upload a statement.json{' '}
            <input
              type="file"
              accept=".json,application/json"
              data-testid="capability-file"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void upload(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      )}
      {message && (
        <p role="alert" data-testid="capability-message">
          {message}
        </p>
      )}
    </section>
  )
}

/** A file's text (FileReader: `Blob.text` is missing in some runtimes). */
function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error(`${file.name} could not be read.`))
    reader.readAsText(file)
  })
}

function Changes({ changes }: { changes: StatementChanges }) {
  const fields = Object.entries(changes)
  if (fields.length === 0) return <p>Nothing the check uses changes.</p>
  return (
    <ul>
      {fields.map(([field, { added, removed }]) => (
        <li key={field}>
          <strong>{field.replace('_', ' ')}</strong>
          {added.length > 0 && <> — added: {added.join(', ')}</>}
          {removed.length > 0 && <> — removed: {removed.join(', ')}</>}
        </li>
      ))}
    </ul>
  )
}

/** How many active statements, for the tab badge. */
export const activeStatements = (project: Project) =>
  (project.capabilities ?? []).filter((c) => c.active).length
