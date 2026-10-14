import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  ARCHIVE_EXTENSION,
  isBinaryPath,
  LABEL_CHARS_MAX,
  LABEL_CHARS_MIN,
  IMAGE_WIDTH_MAX,
  IMAGE_WIDTH_MIN,
  LABEL_LINES_MAX,
  LABEL_LINES_MIN,
  createProject,
  fromArchive,
  normalizeImport,
  readProject,
  toArchive,
  writeProject,
  type OpenProject,
  type ProjectFiles,
  type ProjectRef,
  type ConceptKey,
  type ProjectSummary,
} from '@tricc/core'
import {
  ActivityEditor,
  ActivityNavigator,
  BinIcon,
  Breadcrumbs,
  ConfirmDelete,
  DictionaryView,
  GearIcon,
  HomeIcon,
  MediaView,
  HistoryButtons,
  OpenProjectProvider,
  ProjectOverview,
  TriccRuntimeProvider,
  nextTrail,
  useSave,
} from '@tricc/editor'
import type { LocalRuntime } from './adapters.js'

export function App({ local }: { local: LocalRuntime }) {
  const [storageLabel, setStorageLabel] = useState(defaultStorageLabel(local))
  return (
    <TriccRuntimeProvider runtime={local.runtime} preferences={local.preferences}>
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
  crumbs,
  children,
}: {
  local: LocalRuntime
  storageLabel: string
  tools?: ReactNode
  /** Where the author is, in place of the app name: inside a project. */
  crumbs?: ReactNode
  children: ReactNode
}) {
  const [readOnly, setReadOnly] = useState(local.identity.isReadOnly())
  return (
    <>
      <header>
        {crumbs ?? (
          <Link to="/" className="tricc-home-link" data-testid="nav-home">
            <HomeIcon />
            TRICC Authoring
          </Link>
        )}
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
        <Link to="/preferences" data-testid="nav-preferences">
          Preferences
        </Link>
      </header>
      <main>{children}</main>
    </>
  )
}

function ProjectList({ local }: { local: LocalRuntime }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [deleting, setDeleting] = useState<ProjectRef | undefined>(undefined)
  const cancelDelete = useCallback(() => setDeleting(undefined), [])
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
          <li key={p.id} className="tricc-project-row">
            <button
              type="button"
              data-testid={`open-${p.id}`}
              onClick={() => navigate(`/project/${p.id}`)}
            >
              {p.name}
            </button>
            <button
              type="button"
              className="tricc-icon-button"
              data-testid={`configure-${p.id}`}
              aria-label={`Settings of ${p.name}`}
              title="Project settings"
              onClick={() => navigate(`/project/${p.id}?settings=1`)}
            >
              <GearIcon />
            </button>
            {!local.identity.isReadOnly() && (
              <button
                type="button"
                className="tricc-icon-button tricc-icon-button--danger"
                data-testid={`delete-${p.id}`}
                aria-label={`Delete ${p.name}`}
                title="Delete project"
                onClick={async () => setDeleting(await refFor(local, p))}
              >
                <BinIcon />
              </button>
            )}
          </li>
        ))}
      </ul>
      {deleting && (
        <ConfirmDelete
          testId="delete-project"
          heading="Delete this project?"
          onCancel={cancelDelete}
          onConfirm={() => {
            const ref = deleting
            setDeleting(undefined)
            void deleteProject(local, ref).then(refresh)
          }}
        >
          <p>This removes {deleting.name} from your projects.</p>
          <p data-testid="delete-project-note">{deleteNote(local, deleting)}</p>
        </ConfirmDelete>
      )}
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
              // Pictures stay bytes; everything else in a project is text.
              files[path] = isBinaryPath(path) ? new Uint8Array(await f.arrayBuffer()) : await f.text()
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

/** The catalog entry with its folder handle, if it has one: that decides what a delete does. */
async function refFor(local: LocalRuntime, summary: ProjectRef): Promise<ProjectRef> {
  const handle = await local.catalog.handleFor(summary)
  return handle ? { ...summary, handle } : summary
}

function deleteNote(local: LocalRuntime, ref: ProjectRef): string {
  return local.storeFor(ref) === 'folder'
    ? 'The folder and its files stay on your disk; only this list forgets the project.'
    : 'Its files are kept only in this browser and are deleted. Export a copy first to keep it.'
}

/**
 * Off the list first, so a list shown next no longer has it; then `removed` (leave the
 * project, so no autosave writes it back); then delete what the browser kept.
 */
async function deleteProject(local: LocalRuntime, ref: ProjectRef, removed?: () => void): Promise<void> {
  await local.catalog.remove(ref)
  removed?.()
  await local.persistence.forget(ref)
  await local.collaboration.forget(ref)
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
  const [search, setSearch] = useSearchParams()
  // Read once: the gear on the project list asks for the settings as the project opens.
  const [settingsOnOpen] = useState(() => search.get('settings') === '1')
  const [open, setOpen] = useState<OpenProject | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  /** Activities reached, outermost first; the last one is open. Empty: the overview. */
  const [trail, setTrail] = useState<string[]>([])
  const activityId = trail[trail.length - 1]
  const [focus, setFocus] = useState<{ activityId: string; nodeId?: string; edgeId?: string } | null>(null)
  const navigate = useNavigate()
  const [dictionary, setDictionary] = useState(false)
  const [media, setMedia] = useState(false)
  const [concept, setConcept] = useState<ConceptKey | undefined>(undefined)
  /** The dictionary on screen (canonical url); undefined until one is chosen. */
  const [dictionarySystem, setDictionarySystem] = useState<string | undefined>(undefined)
  const openNode = useCallback((nextActivity: string, nodeId: string) => {
    setDictionary(false)
    setMedia(false)
    setConcept(undefined)
    setFocus({ activityId: nextActivity, nodeId })
    setTrail((t) => nextTrail(t, nextActivity, 'reset'))
  }, [])
  const openEdge = useCallback((nextActivity: string, edgeId: string) => {
    setDictionary(false)
    setMedia(false)
    setConcept(undefined)
    setFocus({ activityId: nextActivity, edgeId })
    setTrail((t) => nextTrail(t, nextActivity, 'reset'))
  }, [])
  const openConcept = useCallback((key: ConceptKey) => {
    setConcept(key)
    setDictionarySystem(key.system)
    setMedia(false)
    setDictionary(true)
  }, [])
  const openActivity = useCallback((id: string | undefined) => {
    setDictionary(false)
    setMedia(false)
    setConcept(undefined)
    setFocus(null)
    setTrail(id ? [id] : [])
  }, [])
  /** Through a goto: the activity is added to the breadcrumb. */
  const followActivity = useCallback((next: string) => {
    setFocus(null)
    setTrail((t) => nextTrail(t, next, 'follow'))
  }, [])
  /** Back to a goto that leads here: on the breadcrumb if it came from there. */
  const openCaller = useCallback((caller: string, nodeId: string) => {
    setFocus({ activityId: caller, nodeId })
    setTrail((t) => nextTrail(t, caller, 'return'))
  }, [])
  const showView = useCallback((view: 'dictionary' | 'media' | null) => {
    setDictionary(view === 'dictionary')
    setMedia(view === 'media')
    setConcept(undefined)
  }, [])

  useEffect(() => {
    if (settingsOnOpen) setSearch({}, { replace: true })
  }, [settingsOnOpen, setSearch])

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
        crumbs={
          <Breadcrumbs
            trail={dictionary || media ? [] : trail}
            extra={dictionary ? 'Data dictionary' : media ? 'Media' : undefined}
            onHome={() => navigate('/')}
            onProject={() => {
              showView(null)
              setFocus(null)
              setTrail([])
            }}
            onCrumb={(index) => {
              showView(null)
              setFocus(null)
              setTrail((t) => t.slice(0, index + 1))
            }}
          />
        }
        tools={
          <>
            <SaveIndicator />
            <HistoryButtons />
            <ExportButton open={open} />
          </>
        }
      >
        <ActivityNavigator
          onSelect={openActivity}
          selected={dictionary || media ? undefined : activityId}
          dictionaryOpen={dictionary}
          dictionarySystem={dictionary ? dictionarySystem : undefined}
          onOpenDictionary={(system) => {
            setMedia(false)
            setConcept(undefined)
            setDictionarySystem(system)
            setDictionary(true)
          }}
          onOpenConcept={openConcept}
          onOpenNode={openNode}
          mediaOpen={media}
          onOpenMedia={() => {
            setDictionary(false)
            setMedia(true)
          }}
        />
        {media ? (
          <MediaView onOpenConcept={openConcept} />
        ) : dictionary ? (
          <DictionaryView system={dictionarySystem} open={concept} onOpen={setConcept} onOpenNode={openNode} />
        ) : activityId ? (
          <ActivityEditor
            activityId={activityId}
            focusNodeId={focus?.activityId === activityId ? focus.nodeId : undefined}
            focusEdgeId={focus?.activityId === activityId ? focus.edgeId : undefined}
            onOpen={openNode}
            onOpenEdge={openEdge}
            onOpenActivity={followActivity}
            onOpenCaller={openCaller}
            onDeleted={() => {
              const gone = activityId
              setFocus(null)
              setTrail((t) => t.filter((a) => a !== gone))
            }}
          />
        ) : (
          <ProjectOverview
            onOpen={openNode}
            onOpenEdge={openEdge}
            onOpenConcept={openConcept}
            onSelect={openActivity}
            onRename={(name) => void local.catalog.rename(open.ref, name)}
            initialSettingsOpen={settingsOnOpen}
            deleteNote={deleteNote(local, open.ref)}
            onDelete={() => void deleteProject(local, open.ref, () => navigate('/'))}
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
  const [lines, setLines] = useState(String(local.preferences.current().labelLines))
  const [chars, setChars] = useState(String(local.preferences.current().labelChars))
  const [imageWidth, setImageWidth] = useState(String(local.preferences.current().imageMaxWidth))
  const [types, setTypes] = useState(local.preferences.current().conceptTypes.join('\n'))
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
      <label htmlFor="pref-label-lines">Lines of text on a node</label>
      <input
        id="pref-label-lines"
        data-testid="pref-label-lines"
        type="number"
        min={LABEL_LINES_MIN}
        max={LABEL_LINES_MAX}
        value={lines}
        onChange={(e) => {
          setLines(e.target.value)
          if (e.target.value !== '') local.preferences.update({ labelLines: Number(e.target.value) })
        }}
      />
      <p>Longer text is cut after this many lines. The full text shows when you hover the node. This is your setting; it is not saved in the project.</p>
      <label htmlFor="pref-label-chars">Characters of a label in short lists</label>
      <input
        id="pref-label-chars"
        data-testid="pref-label-chars"
        type="number"
        min={LABEL_CHARS_MIN}
        max={LABEL_CHARS_MAX}
        value={chars}
        onChange={(e) => {
          setChars(e.target.value)
          if (e.target.value !== '') local.preferences.update({ labelChars: Number(e.target.value) })
        }}
      />
      <p>How much of a label shows on an answer link and in the Insert data list. The full text is on hover.</p>
      <label htmlFor="pref-concept-types">Concept types</label>
      <textarea
        id="pref-concept-types"
        data-testid="pref-concept-types"
        rows={8}
        value={types}
        onChange={(e) => {
          setTypes(e.target.value)
          local.preferences.update({ conceptTypes: e.target.value.split('\n') })
        }}
      />
      <p>One per line. The data dictionary offers these as a concept's type; tricc_oo maps them to a FHIR resource.</p>
      <label htmlFor="pref-image-width">Maximum image width (pixels)</label>
      <input
        id="pref-image-width"
        data-testid="pref-image-width"
        type="number"
        min={IMAGE_WIDTH_MIN}
        max={IMAGE_WIDTH_MAX}
        step={50}
        value={imageWidth}
        onChange={(e) => {
          setImageWidth(e.target.value)
          if (e.target.value !== '') local.preferences.update({ imageMaxWidth: Number(e.target.value) })
        }}
      />
      <p>A wider picture is made smaller when it is added, so forms stay light on a health worker's device. Drawings (SVG) are kept as they are.</p>
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
