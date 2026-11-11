import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  activityKind,
  collectLabels,
  hasInternalName,
  NODE_TYPE_SPECS,
  resolve,
  validateProject,
  type Anchor,
  type ConceptKey,
  type Issue,
  type IssueLocation,
  type Project,
} from '@tricc/core'
import { useCanWrite, useCapability, useMutate, useProjectSnapshot } from '../runtime/context.js'
import { InterventionTable } from './InterventionTable.js'
import { BinIcon, ConfirmDelete, GearIcon } from '../components/Dialog.js'
import { LabelSettings } from '../discussion/LabelSettings.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'
import { DiscussionSection } from '../discussion/Discussion.js'
import { InspectorPanel, type InspectorTab } from '../components/InspectorPanel.js'
import { PANEL_MIN, usePanelLayout } from '../components/SidePanel.js'
import { LabelsField } from '../components/LabelsField.js'
import { Icon } from '../theme/Icon.js'

/**
 * The layer -1 surface: which interventions are carried together, which activities make
 * up each, and which suit this patient
 * (feature/20260826-project-and-interventions.md §4).
 *
 * Deliberately not a canvas. The project layer is a structured list — until planning
 * exists there is nothing spatial to draw.
 */
export function ProjectOverview({
  onOpen,
  onOpenEdge,
  onOpenConcept,
  onSelect,
  onRename,
  onDelete,
  onShowView,
  deleteNote,
  initialSettingsOpen = false,
}: {
  /** Open the question named by an expression. */
  onOpen?: (activityId: string, nodeId: string) => void
  /** Open an activity with one connection selected. */
  onOpenEdge?: (activityId: string, edgeId: string) => void
  /** Open a concept in the dictionary. */
  onOpenConcept?: (key: ConceptKey) => void
  /** Open an activity (a segment, or an unassigned one). */
  onSelect?: (activityId: string) => void
  /** The project was renamed: the host updates its project list. */
  onRename?: (name: string) => void
  /** Shows the bin; called once the author confirms the delete. */
  onDelete?: () => void
  /** Open a project-wide view from the Info panel. Views the host lacks show as plain counts. */
  onShowView?: (view: OverviewView) => void
  /** What deleting does to the files, said in the confirmation (host-specific). */
  deleteNote?: string
  /** Show the project settings as the overview opens (the gear on the project list). */
  initialSettingsOpen?: boolean
} = {}) {
  const project = useProjectSnapshot()
  const canWrite = useCanWrite()
  const canDiscuss = useCapability('comment.read')
  const [settingsOpen, setSettingsOpen] = useState(initialSettingsOpen)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [panel, setPanel] = useState('info')
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const layout = usePanelLayout({ id: 'project-side-panel', min: PANEL_MIN })
  const closeSettings = useCallback(() => setSettingsOpen(false), [])
  const cancelDelete = useCallback(() => setConfirmingDelete(false), [])
  const mutate = useMutate()
  const issues = useMemo(() => validateProject(project), [project])
  const lang = project.languages.default
  const title = resolve(project.title, lang, lang) ?? project.id

  const usage = useMemo(() => activityUsage(project), [project])
  const reveal = useCallback((id: string) => {
    setSelected(id)
    revealIntervention(id)
  }, [])
  const links = useMemo<IssueLinks>(
    () => ({
      node: onOpen,
      edge: onOpenEdge,
      activity: onSelect,
      concept: onOpenConcept,
      intervention: reveal,
    }),
    [onOpen, onOpenEdge, onSelect, onOpenConcept, reveal],
  )
  const selectedIv = project.interventions.find((iv) => iv.id === selected)
  const anchor: Anchor = selectedIv
    ? { kind: 'intervention', interventionId: selectedIv.id }
    : { kind: 'project' }
  const discussionCount = Object.values(project.discussions ?? {}).filter(
    (d) => d.status === 'open' && (d.about.kind === 'project' || d.about.kind === 'intervention'),
  ).length
  const problemCount = issues.filter((i) => i.severity !== 'info').length

  const tabs: InspectorTab[] = [
    {
      id: 'info',
      label: 'Info',
      content: <ProjectInfo project={project} usage={usage} onShowView={onShowView} />,
    },
    ...(canDiscuss
      ? [
          {
            id: 'discussion',
            label: 'Discussion',
            count: discussionCount,
            content: (
              <>
                <p className="tricc-overview__about" data-testid="discussion-about">
                  {selectedIv ? (
                    <>
                      About the intervention{' '}
                      <strong>{resolve(selectedIv.title, lang, lang) ?? selectedIv.id}</strong>.{' '}
                      <button
                        type="button"
                        className="tricc-issue__link"
                        onClick={() => setSelected(undefined)}
                      >
                        The project instead
                      </button>
                    </>
                  ) : (
                    'About the whole project. Select an intervention to discuss it.'
                  )}
                </p>
                <DiscussionSection anchor={anchor} />
              </>
            ),
          },
        ]
      : []),
    {
      id: 'validation',
      label: 'Validation',
      count: problemCount,
      countTitle: 'Errors and warnings in this project',
      content: <ValidationSummary issues={issues} links={links} heading={false} />,
    },
  ]

  return (
    <div data-testid="project-overview" className="tricc-overview" {...layout.containerProps}>
      <div className="tricc-overview__main">
        <div className="tricc-overview__title">
          <h1>{title}</h1>
          <Button
            variant="outline"
            size="icon-sm"
            type="button"
            data-testid="configure-project"
            aria-label="Project settings"
            title="Project settings"
            onClick={() => setSettingsOpen(true)}
          >
            <GearIcon />
          </Button>
          {canWrite && onDelete && (
            <Button
              variant="outline"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              type="button"
              data-testid="delete-project"
              aria-label="Delete project"
              title="Delete project"
              onClick={() => setConfirmingDelete(true)}
            >
              <BinIcon />
            </Button>
          )}
        </div>
        {(project.code || project.owner || project.labels?.length) && (
          <p className="tricc-overview__meta" data-testid="project-meta">
            {project.code && <code>{project.code}</code>}
            {project.owner && <span>Owner: {project.owner.name}</span>}
            {project.labels?.map((label) => (
              <span key={label} className="tricc-overview__label">
                {label}
              </span>
            ))}
          </p>
        )}

        <InterventionTable
          project={project}
          readOnly={!canWrite}
          usage={usage}
          selected={selected}
          onSelectIntervention={(id) => {
            setSelected(id)
          }}
          onOpenActivity={onSelect}
          onReveal={onOpen}
          onAdd={() => {
            const id = uniqueId('intervention', new Set(project.interventions.map((i) => i.id)))
            mutate((tx) =>
              tx.addIntervention({
                id,
                title: { [lang]: 'New intervention' },
                trigger: { mode: 'on-demand' },
                activities: [],
              }),
            )
          }}
        />
      </div>

      <InspectorPanel
        tabs={tabs}
        active={panel}
        onSelect={setPanel}
        layout={layout}
        label="Project panel"
        className="tricc-overview__panel"
      />

      {settingsOpen && (
        <ProjectSettings
          readOnly={!canWrite}
          onClose={closeSettings}
          onSave={(draft) => {
            mutate((tx) => {
              tx.setProjectTitle({ ...project.title, [lang]: draft.title })
              tx.setMeta('code', draft.code || undefined)
              tx.setProjectLabels(draft.labels)
              const ownerName = draft.owner.trim()
              tx.setProjectOwner(
                ownerName
                  ? {
                      id:
                        project.owner && project.owner.name === ownerName
                          ? project.owner.id
                          : ownerName,
                      name: ownerName,
                    }
                  : undefined,
              )
            })
            onRename?.(draft.title)
            setSettingsOpen(false)
          }}
        />
      )}
      {confirmingDelete && onDelete && (
        <ConfirmDelete
          testId="delete-project"
          heading="Delete this project?"
          onCancel={cancelDelete}
          onConfirm={() => {
            setConfirmingDelete(false)
            onDelete()
          }}
        >
          <p>This removes {title} from your projects.</p>
          {deleteNote && <p data-testid="delete-project-note">{deleteNote}</p>}
        </ConfirmDelete>
      )}
    </div>
  )
}

/** The project-wide views the Info panel can open. */
export type OverviewView = 'segments' | 'activities' | 'blocks' | 'dictionary' | 'media'

/** What the project holds, at a glance; each count opens its view when the host has one. */
function ProjectInfo({
  project,
  usage,
  onShowView,
}: {
  project: Project
  usage: Map<string, string[]>
  onShowView?: (view: OverviewView) => void
}) {
  const activities = Object.values(project.activities)
  const segments = activities.filter((a) => activityKind(a) === 'process').length
  const blocks = activities.filter((a) => activityKind(a) === 'block').length
  const plain = activities.length - segments - blocks
  const concepts = Object.values(project.codeSystems).reduce(
    (n, cs) => n + Object.keys(cs.concepts).length,
    0,
  )
  const images = Object.keys(project.images ?? {}).length
  const unassigned = activities.filter((a) => !usage.has(a.id)).length
  const row = (icon: string, label: string, count: number, testId: string, view?: OverviewView) => (
    <li key={testId} data-testid={`info-${testId}`}>
      <Icon name={icon} size={18} />
      {view && onShowView ? (
        <button
          type="button"
          className="tricc-overview__info-link"
          onClick={() => onShowView(view)}
        >
          {label}
        </button>
      ) : (
        <span>{label}</span>
      )}
      <span className="tricc-overview__info-count">{count}</span>
    </li>
  )
  return (
    <div className="tricc-overview__info" data-testid="project-info">
      <h3>Contents</h3>
      <ul>
        {row('account_tree', 'Interventions', project.interventions.length, 'interventions')}
        {row('linear_scale', 'Segments', segments, 'segments', 'segments')}
        {row('description', 'Activities', plain, 'activities', 'activities')}
        {row('extension', 'Building blocks', blocks, 'blocks', 'blocks')}
        {row('menu_book', 'Data dictionary concepts', concepts, 'dictionary', 'dictionary')}
        {row('image', 'Media', images, 'media', 'media')}
        {unassigned > 0 && row('help_center', 'Not on any intervention', unassigned, 'unassigned')}
      </ul>
      <h3>Project</h3>
      <dl>
        <dt>Languages</dt>
        <dd>
          {project.languages.available.join(', ')} (default {project.languages.default})
        </dd>
        <dt>Code systems</dt>
        <dd>
          {Object.values(project.codeSystems)
            .map((cs) => cs.id)
            .join(', ') || 'None'}
        </dd>
        {project.repository && (
          <>
            <dt>Repository</dt>
            <dd>
              {project.repository.url.replace(/^https?:\/\//, '')} · {project.repository.branch}
            </dd>
          </>
        )}
        {project.version && (
          <>
            <dt>Version</dt>
            <dd>{project.version}</dd>
          </>
        )}
      </dl>
    </div>
  )
}

/** Where a validation issue can take the author. Only the kinds a host passes become links. */
export interface IssueLinks {
  node?: (activityId: string, nodeId: string) => void
  edge?: (activityId: string, edgeId: string) => void
  activity?: (activityId: string) => void
  /** An activity's own field (name, applicability, process): its settings. */
  settings?: (activityId: string) => void
  intervention?: (interventionId: string) => void
  concept?: (key: ConceptKey) => void
}

export function ValidationSummary({
  issues,
  heading = true,
  links,
}: {
  issues: Issue[]
  /** The inspector tab already names this panel. The project overview keeps the heading. */
  heading?: boolean
  links?: IssueLinks
}) {
  const project = useProjectSnapshot()
  const errors = issues.filter((i) => i.severity === 'error')
  const warnings = issues.filter((i) => i.severity === 'warning')
  return (
    <section
      aria-labelledby={heading ? 'validation-heading' : undefined}
      aria-label={heading ? undefined : 'Validation'}
      data-testid="validation-summary"
    >
      {heading && <h2 id="validation-heading">Validation</h2>}
      <p data-testid="validation-counts">
        {errors.length} error{errors.length === 1 ? '' : 's'}, {warnings.length} warning
        {warnings.length === 1 ? '' : 's'}
      </p>
      <ul className="tricc-issues">
        {issues
          .filter((i) => i.severity !== 'info')
          .map((i, idx) => {
            const target = links ? issueTarget(project, i.location, links) : undefined
            return (
              <li
                key={`${i.rule}-${idx}`}
                data-testid={`issue-${i.rule}`}
                data-severity={i.severity}
              >
                {i.message}
                {target && (
                  <button
                    type="button"
                    className="tricc-issue__link"
                    data-testid="issue-link"
                    data-target={target.kind}
                    title={target.title}
                    onClick={target.go}
                  >
                    {target.label}
                  </button>
                )}
              </li>
            )
          })}
      </ul>
    </section>
  )
}

interface IssueTarget {
  kind: 'edge' | 'node' | 'concept' | 'intervention' | 'settings' | 'activity'
  label: string
  title: string
  go: () => void
}

/** The most specific element an issue is about that the host can show, named for the author. */
function issueTarget(
  project: Project,
  at: IssueLocation,
  links: IssueLinks,
): IssueTarget | undefined {
  const lang = project.languages.default
  const activity = at.activityId ? project.activities[at.activityId] : undefined
  const nodeName = (id: string): string => {
    const node = activity?.nodes[id]
    if (!node) return id
    return node.name && !hasInternalName(node.type)
      ? node.name
      : (resolve(node.label, lang, lang) ?? NODE_TYPE_SPECS[node.type].label)
  }
  if (activity && at.edgeId && links.edge) {
    const edge = activity.edges[at.edgeId]
    const edgeId = at.edgeId
    const activityId = activity.id
    return {
      kind: 'edge',
      label: edge ? `${nodeName(edge.source)} → ${nodeName(edge.target)}` : 'Connection',
      title: 'Show this connection',
      go: () => links.edge?.(activityId, edgeId),
    }
  }
  if (activity && at.nodeId && links.node && activity.nodes[at.nodeId]) {
    const nodeId = at.nodeId
    const activityId = activity.id
    return {
      kind: 'node',
      label: nodeName(nodeId),
      title: 'Show this node',
      go: () => links.node?.(activityId, nodeId),
    }
  }
  if (at.conceptCode && at.codeSystem && links.concept) {
    const key = { system: at.codeSystem, code: at.conceptCode }
    return {
      kind: 'concept',
      label: at.conceptCode,
      title: 'Open this concept in the dictionary',
      go: () => links.concept?.(key),
    }
  }
  const iv = at.interventionId
    ? project.interventions.find((i) => i.id === at.interventionId)
    : undefined
  if (iv && links.intervention) {
    return {
      kind: 'intervention',
      label: resolve(iv.title, lang, lang) ?? iv.id,
      title: 'Show this intervention',
      go: () => links.intervention?.(iv.id),
    }
  }
  if (activity && at.field && !at.nodeId && !at.edgeId && links.settings) {
    const activityId = activity.id
    return {
      kind: 'settings',
      label: 'Activity settings',
      title: 'Open the settings of this activity',
      go: () => links.settings?.(activityId),
    }
  }
  if (activity && links.activity) {
    const activityId = activity.id
    return {
      kind: 'activity',
      label: resolve(activity.title, lang, lang) ?? activity.id,
      title: 'Open this activity',
      go: () => links.activity?.(activityId),
    }
  }
  return undefined
}

/** Scroll an intervention card into view and flash it: it is already on this page. */
function revealIntervention(id: string) {
  const card = document.querySelector<HTMLElement>(`[data-testid="intervention-${CSS.escape(id)}"]`)
  if (!card) return
  card.scrollIntoView({ block: 'center', behavior: 'smooth' })
  card.classList.remove('tricc-flash')
  void card.offsetWidth
  card.classList.add('tricc-flash')
}

/** activity id -> intervention ids that reference it. */
function activityUsage(project: Project): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const iv of project.interventions) {
    for (const ref of iv.activities) {
      map.set(ref.ref, [...(map.get(ref.ref) ?? []), iv.id])
    }
  }
  return map
}

/** `base`, or `base-2`, `base-3`… when taken. Node names pass `_`, the separator exports keep. */
export function uniqueId(base: string, taken: Set<string>, sep = '-'): string {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}${sep}${n}`)) n++
  return `${base}${sep}${n}`
}

/** Project settings: name, code, labels and owner. A draft until Save; Cancel or Escape discards it. */
interface SettingsDraft {
  title: string
  code: string
  labels: string[]
  owner: string
}

function ProjectSettings({
  readOnly,
  onClose,
  onSave,
}: {
  readOnly: boolean
  onClose: () => void
  onSave: (draft: SettingsDraft) => void
}) {
  const project = useProjectSnapshot()
  const lang = project.languages.default
  const [title, setTitle] = useState(resolve(project.title, lang, lang) ?? project.id)
  const [code, setCode] = useState(project.code ?? '')
  const [labels, setLabels] = useState<string[]>(project.labels ?? [])
  const [owner, setOwner] = useState(project.owner?.name ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const name = title.trim()
  const suggestions = useMemo(
    () => collectLabels(project.interventions.map((iv) => iv.labels)),
    [project.interventions],
  )

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="tricc-library-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        className="tricc-library-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-settings-title"
        data-testid="project-settings"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          if (name && !readOnly) onSave({ title: name, code: code.trim(), labels, owner })
        }}
      >
        <h2 id="project-settings-title">Project settings</h2>
        <label htmlFor="project-title">Name</label>
        <Input
          ref={inputRef}
          id="project-title"
          data-testid="project-title"
          value={title}
          disabled={readOnly}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p>Shown in your project list and saved as the project title in tricc.yaml.</p>
        <label htmlFor="project-code">Code</label>
        <Input
          id="project-code"
          data-testid="project-code"
          value={code}
          disabled={readOnly}
          placeholder="e.g. IMCI-2026"
          onChange={(e) => setCode(e.target.value)}
        />
        <div className="tricc-project-settings__labels">
          <LabelsField
            size="small"
            value={labels}
            onChange={setLabels}
            suggestions={suggestions}
            disabled={readOnly}
            testId="project-labels"
          />
        </div>
        <label htmlFor="project-owner">Owner</label>
        <Input
          id="project-owner"
          data-testid="project-owner"
          value={owner}
          disabled={readOnly}
          onChange={(e) => setOwner(e.target.value)}
        />
        <p>Labels and owner help find the project while authoring; tricc_oo ignores them.</p>
        <LabelSettings />
        <div className="tricc-library-modal__actions">
          {!readOnly && (
            <Button size="sm" type="submit" data-testid="project-settings-save" disabled={!name}>
              Save
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            type="button"
            data-testid="project-settings-cancel"
            onClick={onClose}
          >
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
