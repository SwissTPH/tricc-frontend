import { useCallback, useState, type ReactNode } from 'react'
import type { Anchor, ConceptKey, OpenProject } from '@tricc/core'
import { ActivityEditor } from '../activity/ActivityEditor.js'
import { BlocksView } from '../blocks/BlocksView.js'
import { TERMS } from '../blocks/terms.js'
import { MediaView } from '../media/MediaView.js'
import { OpenProjectProvider } from '../runtime/context.js'
import { DictionaryView } from '../terminology/DictionaryView.js'
import { ActivityNavigator } from './ActivityNavigator.js'
import { Breadcrumbs, nextTrail } from './Breadcrumbs.js'
import { ProjectOverview, type OverviewView } from './Overview.js'

/** What the host places in its own top bar and main area. */
export interface ProjectWorkspaceFrame {
  /** Breadcrumbs. Null while no project is open, so the host can show its own home link. */
  crumbs: ReactNode
  /**
   * The navigator and the open view, as a fragment. The host puts this straight into `main`,
   * so the activity editor stays a direct child and the local layout still applies.
   */
  body: ReactNode
  /**
   * Open the place a discussion is about and show the discussion there. The host passes it to
   * its notification bell and discussions button.
   */
  showDiscussion: (anchor: Anchor, discussionId: string) => void
}

type DiscussionJump = {
  seq: number
  kind: 'node' | 'edge' | 'group' | 'comment' | 'activity'
  id: string
  discussionId: string
}

/**
 * The project screen shared by every shell: which activity is open, the dictionary, media and
 * building blocks.
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
  /** A home link at the start of the breadcrumbs. Without it the host shows its own. */
  onHome?: () => void
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
  const [focus, setFocus] = useState<{
    activityId: string
    nodeId?: string
    edgeId?: string
  } | null>(null)
  const [discussJump, setDiscussJump] = useState<DiscussionJump | null>(null)
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
  const showView = useCallback((view: OverviewView | null) => {
    setDictionary(view === 'dictionary')
    setMedia(view === 'media')
    setBlocks(view === 'blocks')
    setConcept(undefined)
  }, [])

  const sideView = dictionary || media || blocks
  const crumbs = project ? (
    <Breadcrumbs
      trail={sideView ? [] : trail}
      extra={dictionary ? 'Data dictionary' : media ? 'Media' : blocks ? TERMS.blocks : undefined}
      {...(onHome ? { onHome } : {})}
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
        selected={sideView ? undefined : activityId}
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
          onRename={onRename}
          onShowView={showView}
          initialSettingsOpen={initialSettingsOpen}
          deleteNote={deleteNote}
          onDelete={onDelete}
        />
      )}
    </>
  ) : null

  const framed = frame({ crumbs, body, showDiscussion })
  if (!project) return framed
  return <OpenProjectProvider project={project}>{framed}</OpenProjectProvider>
}
