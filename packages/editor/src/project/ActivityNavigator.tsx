import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  CPG_PROCESSES,
  activityKind,
  createActivity,
  createProcessActivity,
  processOf,
  readActivityFile,
  resolve,
  type ParsedActivity,
  type Project,
} from '@tricc/core'
import { useCanWrite, useMutate, useProjectSnapshot } from '../runtime/context.js'
import { uniqueId } from './Overview.js'

type LibraryTab = 'process' | 'activity'

type LibraryDraft = { kind: 'activity'; name: string } | { kind: 'process'; process: string }

type ImportRow = ParsedActivity & { filename: string }

interface ImportPreview {
  kind: LibraryTab
  rows: ImportRow[]
  skipped: { label: string; filename: string }[]
  errors: { filename: string; message: string }[]
}

/**
 * Processes and activities live on two tabs.
 *
 * A process activity is the entry point for a segment of care. A normal activity is the
 * reusable page it calls. One tab is open at a time. Search narrows that tab. Expand
 * opens the rest of the list downward instead of running off the side of the window.
 */
export function ActivityNavigator({
  selected,
  onSelect,
}: {
  selected: string | undefined
  onSelect: (id: string | undefined) => void
}) {
  const project = useProjectSnapshot()
  const canWrite = useCanWrite()
  const mutate = useMutate()
  const lang = project.languages.default
  const [draft, setDraft] = useState<LibraryDraft | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<LibraryTab>('activity')
  const [expanded, setExpanded] = useState(false)
  const [activityQuery, setActivityQuery] = useState('')
  const [processQuery, setProcessQuery] = useState('')
  const [overflows, setOverflows] = useState(false)

  const ids = Object.keys(project.activities).sort()
  const processActivities = ids.filter((id) => activityKind(project.activities[id]!) === 'process')
  const normalActivities = ids.filter((id) => activityKind(project.activities[id]!) !== 'process')
  const usage = activityUsage(project)
  const selectedActivity = selected ? project.activities[selected] : undefined
  const selectedKind: LibraryTab | undefined = selectedActivity
    ? activityKind(selectedActivity) === 'process'
      ? 'process'
      : 'activity'
    : undefined

  // Opening an entry shows the tab it belongs to. A manual tab click stays until the
  // open entry changes, so looking at the other list does not jump back.
  useEffect(() => {
    if (selectedKind) setTab(selectedKind)
  }, [selected, selectedKind])

  const label = (id: string) => resolve(project.activities[id]?.title, lang, lang) ?? id
  const usedBy = (id: string) => {
    const users = usage.get(id) ?? []
    if (users.length === 0) return null
    return (
      <span className="tricc-nav__used" data-testid={`used-by-${id}`}>
        {users.length > 1 ? 'Shared. ' : ''}Used by {users.join(', ')}
      </span>
    )
  }

  const taken = new Set(ids)

  const openDraft = (kind: LibraryTab) => {
    if (kind === 'activity') setDraft({ kind, name: uniqueId('activity', taken) })
    else setDraft({ kind, process: '' })
  }

  const confirmDraft = () => {
    if (!draft) return
    if (draft.kind === 'activity') {
      const title = draft.name.trim()
      const base = slugId(title)
      if (!base) return
      const id = uniqueId(base, taken)
      mutate((tx) => tx.addActivity(createActivity({ id, title, language: lang })))
      setDraft(null)
      onSelect(id)
      return
    }
    const process = draft.process.trim()
    const base = slugId(process)
    if (!base) return
    const id = uniqueId(`${base}-process`, taken)
    mutate((tx) =>
      tx.addActivity(createProcessActivity({ id, process, title: process, language: lang })),
    )
    setDraft(null)
    onSelect(id)
  }

  const cancelDraft = useCallback(() => setDraft(null), [])
  const cancelImport = useCallback(() => setPreview(null), [])

  useEffect(() => {
    if (!canWrite) {
      setDraft(null)
      setPreview(null)
    }
  }, [canWrite])

  const openImport = () => {
    setDraft(null)
    fileRef.current?.click()
  }

  const onImportFiles = async (list: FileList | null) => {
    const files = list ? [...list] : []
    if (fileRef.current) fileRef.current.value = ''
    if (files.length === 0) return
    const kind = tab
    const reserved = new Set(Object.keys(project.activities))
    const rows: ImportRow[] = []
    const skipped: ImportPreview['skipped'] = []
    const errors: ImportPreview['errors'] = []
    for (const file of files) {
      let text: string
      try {
        text = await readFileText(file)
      } catch (error) {
        errors.push({
          filename: file.name,
          message: error instanceof Error ? error.message : String(error),
        })
        continue
      }
      let parsed: ParsedActivity[]
      try {
        parsed = readActivityFile(file.name, text, new Set(reserved), lang)
      } catch (error) {
        errors.push({ filename: file.name, message: error instanceof Error ? error.message : String(error) })
        continue
      }
      for (const item of parsed) {
        const itemKind: LibraryTab = activityKind(item.activity) === 'process' ? 'process' : 'activity'
        const label = resolve(item.activity.title, lang, lang) ?? item.activity.id
        if (itemKind !== kind) {
          skipped.push({ label, filename: file.name })
          continue
        }
        reserved.add(item.activity.id)
        rows.push({ ...item, filename: file.name })
      }
    }
    setPreview({ kind, rows, skipped, errors })
  }

  const confirmImport = () => {
    if (!preview || preview.rows.length === 0) return
    const rows = preview.rows
    mutate((tx) => {
      for (const row of rows) tx.addActivity(row.activity)
    })
    setPreview(null)
    onSelect(rows[0]!.activity.id)
  }

  const query = tab === 'activity' ? activityQuery : processQuery
  const setQuery = tab === 'activity' ? setActivityQuery : setProcessQuery

  return (
    <nav data-testid="activity-navigator" data-expanded={expanded ? 'true' : 'false'}>
      <div className="tricc-nav__bar">
        <button type="button" data-testid="nav-overview" onClick={() => onSelect(undefined)}>
          Project overview
        </button>
        <div className="tricc-nav__tabs" role="tablist" aria-label="Processes and activities">
          <button
            type="button"
            role="tab"
            id="tab-processes"
            aria-selected={tab === 'process'}
            aria-controls="process-panel"
            data-testid="tab-processes"
            onClick={() => setTab('process')}
          >
            Processes
            <span className="tricc-nav__count">{processActivities.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="tab-activities"
            aria-selected={tab === 'activity'}
            aria-controls="activity-panel"
            data-testid="tab-activities"
            onClick={() => setTab('activity')}
          >
            Activities
            <span className="tricc-nav__count">{normalActivities.length}</span>
          </button>
        </div>
        <input
          type="search"
          data-testid={tab === 'activity' ? 'activity-search' : 'process-search'}
          aria-label={tab === 'activity' ? 'Find an activity' : 'Find a process'}
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          data-testid="nav-expand"
          aria-expanded={expanded}
          aria-controls={tab === 'activity' ? 'activity-panel' : 'process-panel'}
          disabled={!expanded && !overflows}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
        {canWrite && (
          <span className="tricc-nav__create">
            <button
              type="button"
              className="tricc-nav__add"
              data-testid={tab === 'activity' ? 'add-activity' : 'add-process'}
              aria-label={tab === 'activity' ? 'Add an activity' : 'Add a process'}
              title={tab === 'activity' ? 'Add an activity' : 'Add a process'}
              onClick={() => {
                setPreview(null)
                openDraft(tab)
              }}
            >
              +
            </button>
            <button
              type="button"
              className="tricc-nav__import"
              data-testid={tab === 'activity' ? 'import-activity' : 'import-process'}
              aria-label={tab === 'activity' ? 'Import an activity' : 'Import a process'}
              title={tab === 'activity' ? 'Import an activity' : 'Import a process'}
              onClick={openImport}
            >
              Import
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              accept=".yaml,.yml,.drawio,.xml"
              data-testid={tab === 'activity' ? 'import-activity-file' : 'import-process-file'}
              onChange={(event) => void onImportFiles(event.target.files)}
            />
          </span>
        )}
      </div>
      <datalist id="cpg-processes">
        {CPG_PROCESSES.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {tab === 'process' ? (
        <LibraryPanel
          tab="process"
          panelLabel="Process activities"
          listTestId="process-activity-list"
          ids={processActivities}
          selected={selected}
          query={processQuery}
          expanded={expanded}
          itemLabel={(id) => `${label(id)} ${processOf(project.activities[id]!) ?? ''}`}
          onOverflow={setOverflows}
          empty={
            processActivities.length === 0 ? (
              <p data-testid="no-process-activities">
                No processes yet. Use + to add the entry point for a segment of care, or Import to
                bring one in from a file.
              </p>
            ) : null
          }
          renderItem={(id) => (
            <button
              type="button"
              className="tricc-chip"
              data-testid={`nav-activity-${id}`}
              data-kind="process"
              aria-current={selected === id}
              title={`Starts the ${processOf(project.activities[id]!) ?? 'unnamed'} process`}
              onClick={() => onSelect(id)}
            >
              {label(id)}
              <span className="tricc-nav__process">
                {processOf(project.activities[id]!) ?? 'no process'}
              </span>
              {usedBy(id)}
            </button>
          )}
        />
      ) : (
        <LibraryPanel
          tab="activity"
          panelLabel="Activities"
          listTestId="activity-list"
          ids={normalActivities}
          selected={selected}
          query={activityQuery}
          expanded={expanded}
          itemLabel={label}
          onOverflow={setOverflows}
          renderItem={(id) => (
            <button
              type="button"
              className="tricc-chip"
              data-testid={`nav-activity-${id}`}
              data-kind="activity"
              aria-current={selected === id}
              title={label(id)}
              onClick={() => onSelect(id)}
            >
              {label(id)}
              {usedBy(id)}
              {(usage.get(id)?.length ?? 0) > 1 && (
                <span className="tricc-nav__shared" data-testid={`library-shared-${id}`}>
                  One copy in the library
                </span>
              )}
            </button>
          )}
        />
      )}
      {draft && canWrite && (
        <LibraryDraftDialog
          draft={draft}
          taken={taken}
          onChange={setDraft}
          onCancel={cancelDraft}
          onConfirm={confirmDraft}
        />
      )}
      {preview && canWrite && (
        <ImportDialog
          preview={preview}
          lang={lang}
          onCancel={cancelImport}
          onConfirm={confirmImport}
        />
      )}
    </nav>
  )
}

function LibraryPanel({
  tab,
  panelLabel,
  listTestId,
  ids,
  selected,
  query,
  expanded,
  itemLabel,
  onOverflow,
  empty,
  renderItem,
}: {
  tab: LibraryTab
  panelLabel: string
  listTestId: string
  ids: string[]
  selected: string | undefined
  query: string
  expanded: boolean
  itemLabel: (id: string) => string
  onOverflow: (overflows: boolean) => void
  empty?: ReactNode
  renderItem: (id: string) => ReactNode
}) {
  const listRef = useRef<HTMLUListElement>(null)
  const needle = query.trim().toLowerCase()
  const shown = needle
    ? ids.filter((id) => itemLabel(id).toLowerCase().includes(needle) || id.toLowerCase().includes(needle))
    : ids
  const signature = `${shown.join('|')}|${expanded ? 'open' : 'closed'}`

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const update = () => onOverflow(listOverflows(el, expanded))
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(el)
    return () => observer?.disconnect()
  }, [signature, expanded, onOverflow])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    if (typeof el.scrollTo === 'function') el.scrollTo({ left: 0, top: 0 })
    else {
      el.scrollLeft = 0
      el.scrollTop = 0
    }
  }, [query])

  useEffect(() => {
    if (!selected || !shown.includes(selected)) return
    const button = listRef.current?.querySelector<HTMLElement>(
      `[data-testid="nav-activity-${cssEscape(selected)}"]`,
    )
    if (button && typeof button.scrollIntoView === 'function') {
      button.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [selected, signature])

  return (
    <section
      role="tabpanel"
      id={`${tab}-panel`}
      aria-label={panelLabel}
      aria-labelledby={`tab-${tab === 'process' ? 'processes' : 'activities'}`}
    >
      <ul ref={listRef} data-testid={listTestId}>
        {shown.map((id) => (
          <li key={id}>{renderItem(id)}</li>
        ))}
      </ul>
      {shown.length === 0 && needle !== '' && (
        <p className="tricc-nav__empty" data-testid={`${tab}-no-match`}>
          No {tab === 'process' ? 'processes' : 'activities'} match.
        </p>
      )}
      {shown.length === 0 && needle === '' ? empty : null}
    </section>
  )
}

/**
 * The name, or the process this activity starts, is chosen before anything is created.
 * Cancel, Escape, and the backdrop leave the library unchanged.
 */
function LibraryDraftDialog({
  draft,
  taken,
  onChange,
  onCancel,
  onConfirm,
}: {
  draft: LibraryDraft
  taken: Set<string>
  onChange: (draft: LibraryDraft) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  const cardRef = useRef<HTMLFormElement>(null)
  const activityBase = draft.kind === 'activity' ? slugId(draft.name) : ''
  const processBase = draft.kind === 'process' ? slugId(draft.process) : ''
  const savedAs =
    draft.kind === 'activity'
      ? activityBase
        ? uniqueId(activityBase, taken)
        : ''
      : processBase
        ? uniqueId(`${processBase}-process`, taken)
        : ''

  useEffect(() => {
    const card = cardRef.current
    const input = card?.querySelector<HTMLInputElement>('input')
    input?.focus()
    input?.select()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCancel()
        return
      }
      if (event.key !== 'Tab' || !card) return
      const items = [...card.querySelectorAll<HTMLElement>('input, button')]
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) return
      const active = document.activeElement
      if (event.shiftKey && (active === first || !card.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !card.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return createPortal(
    <div
      className="tricc-library-modal"
      data-testid="library-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <form
        ref={cardRef}
        className="tricc-library-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-modal-title"
        data-testid="library-modal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          if (savedAs) onConfirm()
        }}
      >
        <h2 id="library-modal-title">{draft.kind === 'activity' ? 'New activity' : 'New process'}</h2>
        {draft.kind === 'activity' ? (
          <label>
            Name
            <input
              data-testid="new-activity-name"
              value={draft.name}
              autoComplete="off"
              onChange={(event) => onChange({ kind: 'activity', name: event.target.value })}
            />
          </label>
        ) : (
          <label>
            Starts
            <input
              data-testid="new-process-name"
              list="cpg-processes"
              placeholder="e.g. registration"
              value={draft.process}
              autoComplete="off"
              onChange={(event) => onChange({ kind: 'process', process: event.target.value })}
            />
          </label>
        )}
        <p className="tricc-library-modal__id">
          {savedAs ? (
            <>
              Saved as <span data-testid={draft.kind === 'activity' ? 'new-activity-id' : 'new-process-id'}>{savedAs}</span>
            </>
          ) : draft.kind === 'activity' ? (
            'Enter a name to continue.'
          ) : (
            'Name the process this starts.'
          )}
        </p>
        <div className="tricc-library-modal__actions">
          <button
            type="submit"
            data-testid={draft.kind === 'activity' ? 'create-activity' : 'add-process-activity'}
            disabled={!savedAs}
          >
            Create
          </button>
          <button type="button" data-testid="library-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

/**
 * A file is shown before it joins the library.
 * Cancel, Escape, and the backdrop leave the project unchanged.
 */
function ImportDialog({
  preview,
  lang,
  onCancel,
  onConfirm,
}: {
  preview: ImportPreview
  lang: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const cardRef = useRef<HTMLFormElement>(null)
  const title = preview.kind === 'activity' ? 'Import an activity' : 'Import a process'
  const canImport = preview.rows.length > 0

  useEffect(() => {
    const card = cardRef.current
    const preferred = card?.querySelector<HTMLElement>(canImport ? '[type="submit"]' : 'button')
    preferred?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCancel()
        return
      }
      if (event.key !== 'Tab' || !card) return
      const items = [...card.querySelectorAll<HTMLElement>('button')]
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) return
      const active = document.activeElement
      if (event.shiftKey && (active === first || !card.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !card.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [canImport, onCancel])

  return createPortal(
    <div
      className="tricc-library-modal"
      data-testid="import-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <form
        ref={cardRef}
        className="tricc-library-modal__card tricc-library-modal__card--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        data-testid="import-modal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          if (canImport) onConfirm()
        }}
      >
        <h2 id="import-modal-title">{title}</h2>
        {canImport && (
          <p className="tricc-import-note">Nothing is added until you import.</p>
        )}
        {preview.rows.length > 0 && (
          <ul className="tricc-import-list" data-testid="import-preview">
            {preview.rows.map((row) => {
              const label = resolve(row.activity.title, lang, lang) ?? row.activity.id
              return (
                <li key={row.activity.id} data-testid={`import-item-${row.activity.id}`}>
                  {label}
                  <span data-testid={`import-id-${row.activity.id}`}>{importDetail(row)}</span>
                  <span>{row.filename}</span>
                </li>
              )
            })}
          </ul>
        )}
        {preview.skipped.length > 0 && (
          <div data-testid="import-skipped">
            <p className="tricc-import-note">
              {preview.kind === 'activity'
                ? 'These are processes. Import them from the Processes tab.'
                : 'These are activities. Import them from the Activities tab.'}
            </p>
            <ul className="tricc-import-list">
              {preview.skipped.map((item) => (
                <li key={`${item.filename}-${item.label}`}>
                  {item.label}
                  <span>{item.filename}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {preview.errors.map((error) => (
          <p key={`${error.filename}-${error.message}`} className="tricc-import-note" data-testid="import-error">
            {error.filename}: {error.message}
          </p>
        ))}
        <div className="tricc-library-modal__actions">
          {canImport && (
            <button type="submit" data-testid="import-confirm">
              Import
            </button>
          )}
          <button type="button" data-testid="import-cancel" onClick={onCancel}>
            {canImport ? 'Cancel' : 'Close'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result ?? '')))
    reader.addEventListener('error', () =>
      reject(reader.error ?? new Error(`Could not read ${file.name}.`)),
    )
    reader.readAsText(file)
  })
}

function importDetail(row: ImportRow): string {
  if (row.renamedFrom && row.alreadyInProject) {
    return `The library already has ${row.renamedFrom}, so this is saved as ${row.activity.id}.`
  }
  if (row.renamedFrom) return `Saved as ${row.activity.id}.`
  return row.activity.id
}

function slugId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** A collapsed row overflows sideways. An expanded panel overflows downward. */
function listOverflows(el: HTMLElement, expanded: boolean): boolean {
  if (expanded) return el.scrollHeight > el.clientHeight + 4
  const children = [...el.children] as HTMLElement[]
  const need = children.reduce(
    (sum, child, index) => sum + child.getBoundingClientRect().width + (index > 0 ? 4 : 0),
    0,
  )
  return need > el.clientWidth + 4
}

function cssEscape(value: string): string {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : value.replace(/"/g, '\\"')
}

function activityUsage(project: Project): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const iv of project.interventions) {
    for (const ref of iv.activities) {
      map.set(ref.ref, [...(map.get(ref.ref) ?? []), iv.id])
    }
  }
  return map
}
