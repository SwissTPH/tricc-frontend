import { useCallback, useState, type ReactNode } from 'react'
import type { ConceptKey, OpenProject } from '@tricc/core'
import { ActivityEditor } from '../activity/ActivityEditor.js'
import { MediaView } from '../media/MediaView.js'
import { OpenProjectProvider } from '../runtime/context.js'
import { DictionaryView } from '../terminology/DictionaryView.js'
import { ActivityNavigator } from './ActivityNavigator.js'
import { Breadcrumbs, nextTrail } from './Breadcrumbs.js'
import { ProjectOverview } from './Overview.js'

/** What the host places in its own top bar and main area. */
export interface ProjectWorkspaceFrame {
  /** Breadcrumbs. Null while no project is open, so the host can show its own home link. */
  crumbs: ReactNode
  /**
   * The navigator and the open view, as a fragment. The host puts this straight into `main`,
   * so the activity editor stays a direct child and the local layout still applies.
   */
  body: ReactNode
}

/**
 * The project screen shared by every shell: which activity is open, the dictionary, and media.
 *
 * The host opens the project and draws its own top bar (accounts, save, export). This component
 * stays mounted when `project` is absent, so the trail survives the host's opening state.
 */
export function ProjectWorkspace({
  project,
  initialSettingsOpen = false,
  onHome,
  onRename,
  onDelete,
  deleteNote,
  frame,
}: {
  project?: OpenProject
  /** Open the project settings as soon as the overview shows. The host reads this once. */
  initialSettingsOpen?: boolean
  onHome: () => void
  /** The project was renamed. The host updates its project list. */
  onRename?: (name: string) => void
  /** The author confirmed deleting the project. The host removes it and leaves. */
  onDelete?: () => void
  /** What deleting does to the files, said in the confirmation. The host knows where they live. */
  deleteNote?: string
  frame: (parts: ProjectWorkspaceFrame) => ReactNode
}) {
  /** Activities reached, outermost first; the last one is open. Empty: the overview. */
  const [trail, setTrail] = useState<string[]>([])
  const activityId = trail[trail.length - 1]
  const [focus, setFocus] = useState<{ activityId: string; nodeId?: string; edgeId?: string } | null>(null)
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

  const crumbs = project ? (
    <Breadcrumbs
      trail={dictionary || media ? [] : trail}
      extra={dictionary ? 'Data dictionary' : media ? 'Media' : undefined}
      onHome={onHome}
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
  ) : null

  const body = project ? (
    <>
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
          onRename={onRename}
          initialSettingsOpen={initialSettingsOpen}
          deleteNote={deleteNote}
          onDelete={onDelete}
        />
      )}
    </>
  ) : null

  const framed = frame({ crumbs, body })
  if (!project) return framed
  return <OpenProjectProvider project={project}>{framed}</OpenProjectProvider>
}
