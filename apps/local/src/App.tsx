import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
  ARCHIVE_EXTENSION,
  createProject,
  fromArchive,
  normalizeImport,
  readProject,
  toArchive,
  writeProject,
  type OpenProject,
  type ProjectFiles,
  type ProjectSummary,
} from '@tricc/core'
import {
  ActivityEditor,
  ActivityNavigator,
  HistoryButtons,
  OpenProjectProvider,
  ProjectOverview,
  TriccRuntimeProvider,
  useSave,
} from '@tricc/editor'
import type { LocalRuntime } from './adapters.js'

export function App({ local }: { local: LocalRuntime }) {
  const [storageLabel, setStorageLabel] = useState(defaultStorageLabel(local))
  return (
    <TriccRuntimeProvider runtime={local.runtime}>
      <Routes>
        <Route
          path="/"
          element={
            <Shell local={local} storageLabel={storageLabel}>
              <ProjectList local={local} />
            </Shell>
          }
        />
        <Route
          path="/project/:id/*"
          element={
            <ProjectWorkspace
              local={local}
              storageLabel={storageLabel}
              onStorageLabel={setStorageLabel}
            />
          }
        />
        <Route
          path="/preferences"
          element={
            <Shell local={local} storageLabel={storageLabel}>
              <Preferences local={local} />
            </Shell>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TriccRuntimeProvider>
  )
}

function Shell({
  local,
  storageLabel,
  tools,
  children,
}: {
  local: LocalRuntime
  storageLabel: string
  tools?: ReactNode
  children: ReactNode
}) {
  const [readOnly, setReadOnly] = useState(local.identity.isReadOnly())
  return (
    <>
      <header>
        <a href="/">TRICC Authoring</a>
        {/* Which store backs the open project. A user must know before they close the
            tab, not after. */}
        <span data-testid="storage-mode">{storageLabel}</span>
        <div className="tricc-topbar__project">{tools}</div>
        <label>
          <input
            type="checkbox"
            data-testid="read-only-toggle"
            checked={readOnly}
            onChange={(e) => {
              local.identity.setReadOnly(e.target.checked)
              setReadOnly(e.target.checked)
            }}
          />
          Read-only
        </label>
        <a href="/preferences" data-testid="nav-preferences">
          Preferences
        </a>
      </header>
      <main>{children}</main>
    </>
  )
}

function ProjectList({ local }: { local: LocalRuntime }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const navigate = useNavigate()

  const refresh = useCallback(async () => setProjects(await local.catalog.list()), [local])
  useEffect(() => void refresh(), [refresh])

  /** Adopt an imported file set as a new browser-backed project. */
  const importFiles = async (files: ProjectFiles, fallbackName: string) => {
    setError(undefined)
    const normalized = normalizeImport(files)
    try {
      // Parse before adopting: importing something unreadable and only discovering it on
      // open would leave a broken entry in the project list.
      const { project } = readProject(normalized)
      const label = resolveName(project.title, project.languages.default) ?? fallbackName
      const ref = await local.catalog.create(label)
      await local.persistence.write(ref, {
        files: normalized,
        changed: Object.keys(normalized),
        removed: [],
      })
      await refresh()
      navigate(`/project/${ref.id}`)
    } catch (e) {
      setError(
        e instanceof Error ? `That does not look like a TRICC project: ${e.message}` : String(e),
      )
    }
  }

  return (
    <div data-testid="project-list">
      <h1>Projects</h1>

      {error && <p data-testid="import-error">{error}</p>}

      <ul>
        {projects.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              data-testid={`open-${p.id}`}
              onClick={() => navigate(`/project/${p.id}`)}
            >
              {p.name}
            </button>
          </li>
        ))}
      </ul>
      {projects.length === 0 && (
        <p data-testid="no-projects">
          No projects yet. Create one below, or import a project folder.
        </p>
      )}

      <section aria-labelledby="open-heading">
        <h2 id="open-heading">Open an existing project</h2>

        {local.canUseFolders && (
          <button
            type="button"
            data-testid="open-folder"
            onClick={async () => {
              setError(undefined)
              const ref = await local.catalog.open()
              // Undefined means the user cancelled the picker, which is not an error.
              if (!ref) return
              await refresh()
              navigate(`/project/${ref.id}`)
            }}
          >
            Open a project folder…
          </button>
        )}

        <label htmlFor="import-archive">Import a {ARCHIVE_EXTENSION} file</label>
        <input
          id="import-archive"
          type="file"
          accept={`${ARCHIVE_EXTENSION},.zip`}
          data-testid="import-archive"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const bytes = new Uint8Array(await file.arrayBuffer())
            try {
              await importFiles(fromArchive(bytes), stripExtension(file.name))
            } catch {
              setError('That file could not be read as an archive.')
            }
            e.target.value = ''
          }}
        />

        <label htmlFor="import-files">Import a project folder</label>
        <input
          id="import-files"
          type="file"
          multiple
          data-testid="import-files"
          // Reading a directory works in every current browser; only writing back to one
          // is Chromium-only, so this is the import path that always exists.
          {...({ webkitdirectory: '' } as Record<string, string>)}
          onChange={async (e) => {
            const list = Array.from(e.target.files ?? [])
            if (list.length === 0) return
            const files: ProjectFiles = {}
            for (const f of list) {
              const path =
                (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name
              files[path] = await f.text()
            }
            await importFiles(files, 'Imported project')
            e.target.value = ''
          }}
        />
      </section>

      <section aria-labelledby="create-heading">
        <h2 id="create-heading">Start a new project</h2>
        <label htmlFor="new-project-name">New project name</label>
        <input
          id="new-project-name"
          data-testid="new-project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          data-testid="create-project"
          disabled={name.trim() === ''}
          onClick={async () => {
            const id = slug(name)
            const open = await local.runtime.create(name, createProject({ id, title: name }))
            await refresh()
            navigate(`/project/${open.ref.id}`)
          }}
        >
          Create project
        </button>
      </section>
    </div>
  )
}

function resolveName(title: Record<string, string> | undefined, lang: string): string | undefined {
  if (!title) return undefined
  return title[lang] ?? Object.values(title)[0]
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}

/** Download the open project as a single file. */
function ExportButton({ open }: { open: OpenProject }) {
  return (
    <button
      type="button"
      data-testid="export-archive"
      onClick={() => {
        const bytes = toArchive(writeProject(open.document.snapshot()))
        // Copy into a plain ArrayBuffer: a Uint8Array may be backed by a SharedArrayBuffer,
        // which Blob does not accept.
        const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${open.ref.name || 'project'}${ARCHIVE_EXTENSION}`
        a.click()
        URL.revokeObjectURL(url)
      }}
    >
      Export {ARCHIVE_EXTENSION}
    </button>
  )
}

function defaultStorageLabel(local: LocalRuntime): string {
  return local.canUseFolders
    ? 'New projects are kept in this browser until you save them to a folder'
    : 'This browser cannot write to a folder, so projects are kept in browser storage'
}

function ProjectWorkspace({
  local,
  storageLabel,
  onStorageLabel,
}: {
  local: LocalRuntime
  storageLabel: string
  onStorageLabel: (label: string) => void
}) {
  const { id } = useParams()
  const [open, setOpen] = useState<OpenProject | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [activityId, setActivityId] = useState<string | undefined>(undefined)
  const [focus, setFocus] = useState<{ activityId: string; nodeId: string } | null>(null)
  const openNode = useCallback((nextActivity: string, nodeId: string) => {
    setFocus({ activityId: nextActivity, nodeId })
    setActivityId(nextActivity)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const summaries = await local.catalog.list()
        const summary = summaries.find((s) => s.id === id)
        if (!summary) {
          if (!cancelled) setError('That project is not in this browser.')
          return
        }
        const handle = await local.catalog.handleFor(summary)
        const ref = handle ? { ...summary, handle } : summary
        const result = await local.runtime.open(ref)
        if (!cancelled) {
          setOpen(result)
          onStorageLabel(
            local.storeFor(ref) === 'folder'
              ? 'Saving to your project folder'
              : 'Saved in this browser',
          )
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, local, onStorageLabel])

  if (error) {
    return (
      <Shell local={local} storageLabel={storageLabel}>
        <p data-testid="project-error">{error}</p>
      </Shell>
    )
  }
  if (!open) {
    return (
      <Shell local={local} storageLabel={storageLabel}>
        <p data-testid="project-loading">Opening…</p>
      </Shell>
    )
  }

  return (
    <OpenProjectProvider project={open}>
      <Shell
        local={local}
        storageLabel={storageLabel}
        tools={
          <>
            <SaveIndicator />
            <HistoryButtons />
            <ExportButton open={open} />
          </>
        }
      >
        <ActivityNavigator
          onSelect={(id) => {
            setFocus(null)
            setActivityId(id)
          }}
          selected={activityId}
        />
        {activityId ? (
          <ActivityEditor
            activityId={activityId}
            focusNodeId={focus?.activityId === activityId ? focus.nodeId : undefined}
            onOpen={openNode}
          />
        ) : (
          <ProjectOverview
            onOpen={openNode}
            onSelect={(id) => {
              setFocus(null)
              setActivityId(id)
            }}
          />
        )}
      </Shell>
    </OpenProjectProvider>
  )
}

function SaveIndicator() {
  const status = useSave()
  return (
    <p data-testid="save-status" data-state={status.state}>
      {saveLabel(status.state, status.error)}
    </p>
  )
}

function saveLabel(state: string, error?: string): string {
  if (state === 'saved') return 'Saved'
  if (state === 'saving') return 'Saving…'
  if (state === 'unsaved') return 'Unsaved changes. They will be saved automatically.'
  return `Could not save${error ? `: ${error}` : ''}. Export a copy so the work is not only in this browser.`
}

function Preferences({ local }: { local: LocalRuntime }) {
  const [name, setName] = useState(local.identity.current().displayName)
  return (
    <div data-testid="preferences">
      <h1>Preferences</h1>
      {/* No accounts and no authentication - a display name, used for authorship. */}
      <label htmlFor="display-name">Display name</label>
      <input
        id="display-name"
        data-testid="display-name"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          local.identity.update({ displayName: e.target.value })
        }}
      />
      <p data-testid="storage-explanation">
        {local.canUseFolders
          ? 'A project can be bound to a folder on disk; until then it is kept in this browser.'
          : 'This browser cannot write to a folder, so projects are kept in browser storage.'}
      </p>
    </div>
  )
}

function slug(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'project'
  )
}
