import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ARCHIVE_EXTENSION,
  LABEL_CHARS_MAX,
  LABEL_CHARS_MIN,
  IMAGE_WIDTH_MAX,
  IMAGE_WIDTH_MIN,
  LABEL_LINES_MAX,
  LABEL_LINES_MIN,
  toArchive,
  writeProject,
  type OpenProject,
  type ProjectRef,
  type ConceptKey,
  type Anchor,
  type DiagramStyle,
} from '@tricc/core'
import {
  ActivityEditor,
  ActivityNavigator,
  BlocksView,
  Breadcrumbs,
  Button,
  DictionaryView,
  DiscussionsButton,
  Input,
  MediaView,
  NotificationBell,
  HistoryButtons,
  OpenProjectProvider,
  ProjectOverview,
  Textarea,
  TERMS,
  TriccRuntimeProvider,
  nextTrail,
  useSave,
  useThemeMode,
  Icon,
  type ThemeMode,
} from '@tricc/editor'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import type { LocalRuntime } from './adapters.js'
import { TopBar } from './shell/TopBar.js'
import { HomePage } from './home/HomePage.js'
import { deleteNote, deleteProject } from './projects.js'
import {
  ChooseCopyDialog,
  RepoTools,
  checkCopy,
  fetchBranch,
  needsChoice,
  repositoryOfFiles,
  writeBranch,
  type CopyCheck,
  type FetchedBranch,
} from './git/ui.js'

export function App({ local }: { local: LocalRuntime }) {
  const [storageLabel, setStorageLabel] = useState(defaultStorageLabel(local))
  return (
    <TriccRuntimeProvider runtime={local.runtime} preferences={local.preferences}>
      <Routes>
        <Route
          path="/"
          element={
            <Shell local={local} storageLabel={storageLabel}>
              <HomePage local={local} />
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
  bell,
  children,
}: {
  local: LocalRuntime
  storageLabel: string
  tools?: ReactNode
  /** Where the author is, in place of the app name: inside a project. */
  crumbs?: ReactNode
  /** The project's own bell; without one, the bell gathers every project. */
  bell?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <TopBar
        local={local}
        storageLabel={storageLabel}
        tools={tools}
        crumbs={crumbs}
        bell={bell ?? <AllProjectsBell />}
      />
      <main>{children}</main>
    </>
  )
}

/** Home: notifications from every project; one opens its project. */
function AllProjectsBell() {
  const navigate = useNavigate()
  return (
    <NotificationBell onOpen={(n) => navigate(`/project/${encodeURIComponent(n.projectId)}`)} />
  )
}

/** Download the open project as a single file. */
function ExportButton({ open }: { open: OpenProject }) {
  return (
    <Button
      variant="outline"
      size="sm"
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
    </Button>
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
  /** A copy from a repository whose branch has something to decide before it opens. */
  const [choice, setChoice] = useState<{ ref: ProjectRef; check: CopyCheck } | undefined>(undefined)
  /** Bumped to open the project again, after its files were replaced by a branch. */
  const [generation, setGeneration] = useState(0)
  /** The project whose copy-or-branch choice is made: open it without asking again. */
  const [chosenFor, setChosenFor] = useState<string | undefined>(undefined)
  /** Activities reached, outermost first; the last one is open. Empty: the overview. */
  const [trail, setTrail] = useState<string[]>([])
  const activityId = trail[trail.length - 1]
  const [focus, setFocus] = useState<{
    activityId: string
    nodeId?: string
    edgeId?: string
  } | null>(null)
  const [discussJump, setDiscussJump] = useState<{
    seq: number
    kind: 'node' | 'edge' | 'group' | 'comment' | 'activity'
    id: string
    discussionId: string
  } | null>(null)
  const navigate = useNavigate()
  const [dictionary, setDictionary] = useState(false)
  const [media, setMedia] = useState(false)
  const [blocks, setBlocks] = useState(false)
  const [concept, setConcept] = useState<ConceptKey | undefined>(undefined)
  /** The dictionary on screen (canonical url); undefined until one is chosen. */
  const [dictionarySystem, setDictionarySystem] = useState<string | undefined>(undefined)
  const openNode = useCallback((nextActivity: string, nodeId: string) => {
    setDictionary(false)
    setMedia(false)
    setBlocks(false)
    setConcept(undefined)
    setFocus({ activityId: nextActivity, nodeId })
    setTrail((t) => nextTrail(t, nextActivity, 'reset'))
  }, [])
  const openEdge = useCallback((nextActivity: string, edgeId: string) => {
    setDictionary(false)
    setMedia(false)
    setBlocks(false)
    setConcept(undefined)
    setFocus({ activityId: nextActivity, edgeId })
    setTrail((t) => nextTrail(t, nextActivity, 'reset'))
  }, [])
  const openConcept = useCallback((key: ConceptKey) => {
    setConcept(key)
    setDictionarySystem(key.system)
    setMedia(false)
    setBlocks(false)
    setDictionary(true)
  }, [])
  const openActivity = useCallback((id: string | undefined) => {
    setDictionary(false)
    setMedia(false)
    setBlocks(false)
    setConcept(undefined)
    setFocus(null)
    setTrail(id ? [id] : [])
  }, [])
  const showDiscussion = useCallback(
    (anchor: Anchor, discussionId: string) => {
      const seq = Date.now()
      if (anchor.kind === 'node') {
        openNode(anchor.activityId, anchor.nodeId)
        setDiscussJump({ seq, kind: 'node', id: anchor.nodeId, discussionId })
      } else if (anchor.kind === 'edge') {
        openEdge(anchor.activityId, anchor.edgeId)
        setDiscussJump({ seq, kind: 'edge', id: anchor.edgeId, discussionId })
      } else if (anchor.kind === 'group') {
        openActivity(anchor.activityId)
        setDiscussJump({ seq, kind: 'group', id: anchor.groupId, discussionId })
      } else if (anchor.kind === 'comment') {
        openActivity(anchor.activityId)
        setDiscussJump({ seq, kind: 'comment', id: anchor.commentId, discussionId })
      } else if (anchor.kind === 'activity') {
        openActivity(anchor.activityId)
        setDiscussJump({ seq, kind: 'activity', id: anchor.activityId, discussionId })
      }
    },
    [openActivity, openEdge, openNode],
  )
  /** Through a goto: the activity is added to the breadcrumb. */
  const followActivity = useCallback((next: string) => {
    setDictionary(false)
    setMedia(false)
    setBlocks(false)
    setFocus(null)
    setTrail((t) => nextTrail(t, next, 'follow'))
  }, [])
  /** Back to a goto that leads here: on the breadcrumb if it came from there. */
  const openCaller = useCallback((caller: string, nodeId: string) => {
    setFocus({ activityId: caller, nodeId })
    setTrail((t) => nextTrail(t, caller, 'return'))
  }, [])
  const showView = useCallback((view: 'dictionary' | 'media' | 'blocks' | null) => {
    setDictionary(view === 'dictionary')
    setMedia(view === 'media')
    setBlocks(view === 'blocks')
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
        if (chosenFor !== id && local.storeFor(ref) === 'browser') {
          const files = await local.persistence.read(ref)
          const repository = repositoryOfFiles(files)
          const check = repository ? await checkCopy(ref.id, files, repository) : undefined
          if (check && needsChoice(check)) {
            if (!cancelled) setChoice({ ref, check })
            return
          }
        }
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
  }, [id, local, onStorageLabel, generation, chosenFor])

  const reopen = useCallback(() => {
    setOpen(undefined)
    setChoice(undefined)
    setChosenFor(id)
    setGeneration((g) => g + 1)
  }, [id])

  /** Close the project, so its autosave stops, then write the branch over it and open it again. */
  const replaceWith = useCallback(
    async (ref: ProjectRef, fetched: FetchedBranch) => {
      setOpen(undefined)
      // A save already under way when the editor closed finishes first.
      await new Promise((resolve) => setTimeout(resolve, 100))
      try {
        await writeBranch(local, ref, fetched)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        return
      }
      reopen()
    },
    [local, reopen],
  )

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
        {choice && (
          <ChooseCopyDialog
            check={choice.check}
            onContinue={reopen}
            onClose={() => (choice.check.state ? reopen() : navigate('/'))}
            onLoad={async (branch) => {
              const fetched = await fetchBranch(choice.check.repository, branch)
              await replaceWith(choice.ref, fetched)
            }}
          />
        )}
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
            trail={dictionary || media || blocks ? [] : trail}
            extra={
              dictionary ? 'Data dictionary' : media ? 'Media' : blocks ? TERMS.blocks : undefined
            }
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
        bell={
          <NotificationBell
            projectId={open.ref.id}
            onOpen={(n) => n.anchor && n.discussionId && showDiscussion(n.anchor, n.discussionId)}
          />
        }
        tools={
          <>
            <SaveIndicator />
            <HistoryButtons />
            <DiscussionsButton onShow={showDiscussion} />
            <ExportButton open={open} />
            <RepoTools
              local={local}
              open={open}
              onReplace={(fetched) => void replaceWith(open.ref, fetched)}
            />
          </>
        }
      >
        <ActivityNavigator
          onSelect={openActivity}
          selected={dictionary || media || blocks ? undefined : activityId}
          dictionaryOpen={dictionary}
          dictionarySystem={dictionary ? dictionarySystem : undefined}
          onOpenDictionary={(system) => {
            setMedia(false)
            setBlocks(false)
            setConcept(undefined)
            setDictionarySystem(system)
            setDictionary(true)
          }}
          onOpenConcept={openConcept}
          onOpenNode={openNode}
          mediaOpen={media}
          onOpenMedia={() => {
            setDictionary(false)
            setBlocks(false)
            setMedia(true)
          }}
          blocksOpen={blocks}
          onOpenBlocks={() => showView('blocks')}
        />
        {blocks ? (
          <BlocksView onOpenBlock={openActivity} onOpenNode={openNode} />
        ) : media ? (
          <MediaView onOpenConcept={openConcept} />
        ) : dictionary ? (
          <DictionaryView
            system={dictionarySystem}
            open={concept}
            onOpen={setConcept}
            onOpenNode={openNode}
            onOpenActivity={openActivity}
          />
        ) : activityId ? (
          <ActivityEditor
            activityId={activityId}
            focusNodeId={focus?.activityId === activityId ? focus.nodeId : undefined}
            focusEdgeId={focus?.activityId === activityId ? focus.edgeId : undefined}
            onOpen={openNode}
            onOpenEdge={openEdge}
            onOpenActivity={followActivity}
            onOpenCaller={openCaller}
            focusDiscussion={discussJump ?? undefined}
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
            onShowView={showView}
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
    <p
      data-testid="save-status"
      data-state={status.state}
      title={saveLabel(status.state, status.error)}
    >
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
  const [diagramStyle, setDiagramStyle] = useState(local.preferences.current().diagramStyle)
  return (
    <div data-testid="preferences">
      <h1>Preferences</h1>
      <ThemeChoice />
      {/* No accounts and no authentication - a display name, used for authorship. */}
      <label htmlFor="display-name">Display name</label>
      <Input
        id="display-name"
        data-testid="display-name"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          local.identity.update({ displayName: e.target.value })
        }}
      />
      <label htmlFor="pref-label-lines">Lines of text on a node</label>
      <Input
        id="pref-label-lines"
        data-testid="pref-label-lines"
        type="number"
        min={LABEL_LINES_MIN}
        max={LABEL_LINES_MAX}
        value={lines}
        onChange={(e) => {
          setLines(e.target.value)
          if (e.target.value !== '')
            local.preferences.update({ labelLines: Number(e.target.value) })
        }}
      />
      <p>
        Longer text is cut after this many lines. The full text shows when you hover the node. This
        is your setting; it is not saved in the project.
      </p>
      <label id="pref-diagram-style-label">Diagram style</label>
      <div
        role="radiogroup"
        aria-labelledby="pref-diagram-style-label"
        className="pref-diagram-style"
        data-testid="pref-diagram-style"
      >
        {(
          [
            ['flowchart', 'Flowchart'],
            ['bpmn', 'BPMN'],
          ] as [DiagramStyle, string][]
        ).map(([value, text]) => (
          <label key={value}>
            <input
              type="radio"
              name="pref-diagram-style"
              value={value}
              data-testid={`pref-diagram-style-${value}`}
              checked={diagramStyle === value}
              onChange={() => {
                setDiagramStyle(value)
                local.preferences.update({ diagramStyle: value })
              }}
            />
            {text}
          </label>
        ))}
      </div>
      <p>
        Flowchart draws a Decision as a rhombus; BPMN draws it as a rectangle. This is your setting;
        it is not saved in the project.
      </p>
      <label htmlFor="pref-label-chars">Characters of a label in short lists</label>
      <Input
        id="pref-label-chars"
        data-testid="pref-label-chars"
        type="number"
        min={LABEL_CHARS_MIN}
        max={LABEL_CHARS_MAX}
        value={chars}
        onChange={(e) => {
          setChars(e.target.value)
          if (e.target.value !== '')
            local.preferences.update({ labelChars: Number(e.target.value) })
        }}
      />
      <p>
        How much of a label shows on an answer link and in the Insert data list. The full text is on
        hover.
      </p>
      <label htmlFor="pref-concept-types">Concept types</label>
      <Textarea
        id="pref-concept-types"
        data-testid="pref-concept-types"
        rows={8}
        value={types}
        onChange={(e) => {
          setTypes(e.target.value)
          local.preferences.update({ conceptTypes: e.target.value.split('\n') })
        }}
      />
      <p>
        One per line. The data dictionary offers these as a concept's type; tricc_oo maps them to a
        FHIR resource.
      </p>
      <label htmlFor="pref-image-width">Maximum image width (pixels)</label>
      <Input
        id="pref-image-width"
        data-testid="pref-image-width"
        type="number"
        min={IMAGE_WIDTH_MIN}
        max={IMAGE_WIDTH_MAX}
        step={50}
        value={imageWidth}
        onChange={(e) => {
          setImageWidth(e.target.value)
          if (e.target.value !== '')
            local.preferences.update({ imageMaxWidth: Number(e.target.value) })
        }}
      />
      <p>
        A wider picture is made smaller when it is added, so forms stay light on a health worker's
        device. Drawings (SVG) are kept as they are.
      </p>
      <p data-testid="storage-explanation">
        {local.canUseFolders
          ? 'A project can be bound to a folder on disk; until then it is kept in this browser.'
          : 'This browser cannot write to a folder, so projects are kept in browser storage.'}
      </p>
    </div>
  )
}

/** System / Light / Dark. A per-browser setting, like the others on this page. */
function ThemeChoice() {
  const { mode, setMode } = useThemeMode()
  return (
    <>
      <label id="pref-theme-label">Theme</label>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={mode}
        aria-labelledby="pref-theme-label"
        data-testid="pref-theme"
        onChange={(_, value: ThemeMode | null) => value && setMode(value)}
      >
        {(
          [
            ['system', 'contrast', 'System'],
            ['light', 'light_mode', 'Light'],
            ['dark', 'dark_mode', 'Dark'],
          ] as const
        ).map(([value, icon, text]) => (
          <ToggleButton key={value} value={value} data-testid={`pref-theme-${value}`}>
            <Icon name={icon} size={18} style={{ marginRight: 6 }} />
            {text}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <p>System follows your computer's light or dark setting.</p>
    </>
  )
}
