import { useCallback, useMemo, useState } from 'react'
import {
  activityKind,
  effectiveParams,
  paramLabel,
  resolve,
  validateProject,
  type Activity,
  type Project,
} from '@tricc/core'
import { useCanWrite, useProjectSnapshot } from '../runtime/context.js'
import { ValidationSummary } from '../project/Overview.js'
import { ConfirmActivityDelete } from '../activity/ActivitySettings.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'
import { BinIcon } from '../components/Dialog.js'
import { argSummary } from './ArgumentForm.js'
import { TERMS } from './terms.js'

/** One use of a block: a Use block node, with the values it sets. */
export interface BlockUse {
  activityId: string
  nodeId: string
  args?: Record<string, unknown>
}

/** Every Use block node that uses `blockId`, by calling page. */
export function blockUses(project: Project, blockId: string): BlockUse[] {
  const out: BlockUse[] = []
  for (const id of Object.keys(project.activities).sort()) {
    const activity = project.activities[id]!
    for (const nodeId of activity.nodeOrder) {
      const n = activity.nodes[nodeId]
      if (n?.type === 'block' && n.link === blockId)
        out.push({ activityId: id, nodeId, ...(n.args ? { args: n.args } : {}) })
    }
  }
  return out
}

/** Issues a block list cares about: parameters, values set at calls, blocks themselves. */
const BLOCK_RULES =
  /^(param\.|call\.|block\.|goto\.links-to-block|goto\.instance-values|intervention\.(unknown-param|value-not-allowed))/

/**
 * The Building blocks tab (feature/20261028-snippets-tab-and-params.md §2): every block with its
 * parameters and uses, a search, a filter, and what needs attention.
 */
export function BlocksView({
  onOpenBlock,
  onOpenNode,
  onOpenIntervention,
}: {
  onOpenBlock: (blockId: string) => void
  onOpenNode?: (activityId: string, nodeId: string) => void
  onOpenIntervention?: (interventionId: string) => void
}) {
  const project = useProjectSnapshot()
  const canWrite = useCanWrite()
  const lang = project.languages.default
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'unused'>('all')
  const [deleting, setDeleting] = useState<Activity | undefined>(undefined)
  const cancelDelete = useCallback(() => setDeleting(undefined), [])
  const issues = useMemo(
    () => validateProject(project).filter((i) => BLOCK_RULES.test(i.rule)),
    [project],
  )
  const title = (id: string) => resolve(project.activities[id]?.title, lang, lang) ?? id

  const blocks = Object.keys(project.activities)
    .sort()
    .map((id) => project.activities[id]!)
    .filter((a) => activityKind(a) === 'block')
  const needle = query.trim().toLowerCase()
  const shown = blocks.filter((b) => {
    if (filter === 'unused' && blockUses(project, b.id).length > 0) return false
    if (!needle) return true
    return `${title(b.id)} ${b.name ?? ''} ${b.id}`.toLowerCase().includes(needle)
  })
  const flagged = new Set(
    issues.filter((i) => i.severity === 'error').map((i) => i.location.activityId),
  )

  return (
    <div className="tricc-blocks" data-testid="blocks-view">
      <h1>{TERMS.blocks}</h1>
      <p data-testid="blocks-explain">
        A building block is a reusable piece of clinical logic with settings. Each use puts its own
        copy into the form. {TERMS.blockOrGoto}
      </p>
      <details className="tricc-blocks__naming" data-testid="blocks-naming">
        <summary>Using a block several times</summary>
        <p>
          Each use makes the block's fields again, so the names say what makes each use different:
        </p>
        <ul>
          {TERMS.naming.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
      <div className="tricc-blocks__filters">
        <Input
          size="sm"
          type="search"
          aria-label="Search blocks"
          data-testid="blocks-search"
          placeholder="Search by name or label"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Show"
          data-testid="blocks-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'unused')}
        >
          <option value="all">All blocks</option>
          <option value="unused">Unused</option>
        </select>
      </div>
      {blocks.length === 0 && (
        <p data-testid="blocks-none">
          No building blocks yet. Use + on the {TERMS.blocks} tab to make one.
        </p>
      )}
      <ul className="tricc-blocks__list" data-testid="blocks-list">
        {shown.map((block) => {
          const params = effectiveParams(project, block.id)
          const uses = blockUses(project, block.id)
          const byPage = new Map<string, BlockUse[]>()
          for (const u of uses) byPage.set(u.activityId, [...(byPage.get(u.activityId) ?? []), u])
          return (
            <li key={block.id} className="tricc-blocks__card" data-testid={`block-${block.id}`}>
              <header>
                <button
                  type="button"
                  className="tricc-blocks__title"
                  data-testid={`block-open-${block.id}`}
                  onClick={() => onOpenBlock(block.id)}
                >
                  {title(block.id)}
                </button>
                <code>{block.name ?? block.id}</code>
                {uses.length === 0 && (
                  <span className="tricc-badge" data-testid={`block-${block.id}-unused`}>
                    Unused
                  </span>
                )}
                {flagged.has(block.id) && (
                  <span
                    className="tricc-badge tricc-badge--warning"
                    data-testid={`block-${block.id}-attention`}
                  >
                    Needs attention
                  </span>
                )}
                {canWrite && (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    type="button"
                    aria-label={`Delete ${title(block.id)}`}
                    title={uses.length > 0 ? 'In use: remove its uses first' : 'Delete block'}
                    data-testid={`block-delete-${block.id}`}
                    onClick={() => setDeleting(block)}
                  >
                    <BinIcon />
                  </Button>
                )}
              </header>
              <p data-testid={`block-${block.id}-summary`}>
                {params.length} parameter{params.length === 1 ? '' : 's'}
                {params.length > 0 &&
                  `: ${params.map((p) => paramLabel(project, p.declaredIn, p.param)).join(', ')}`}
                {' · '}used in {uses.length} place{uses.length === 1 ? '' : 's'}
              </p>
              {uses.length > 0 && (
                <details>
                  <summary>Used by</summary>
                  <ul data-testid={`block-${block.id}-uses`}>
                    {[...byPage].map(([pageId, list]) => (
                      <li key={pageId}>
                        {title(pageId)}
                        <ul>
                          {list.map((u) => (
                            <li key={u.nodeId}>
                              <button
                                type="button"
                                className="tricc-issue__link"
                                data-testid={`block-use-${pageId}-${u.nodeId}`}
                                onClick={() => onOpenNode?.(pageId, u.nodeId)}
                              >
                                {argSummary(u.args as never) || 'No values set here'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          )
        })}
      </ul>
      {shown.length === 0 && blocks.length > 0 && (
        <p data-testid="blocks-no-match">No block matches.</p>
      )}

      <section aria-labelledby="needs-attention-heading">
        <h2 id="needs-attention-heading">Needs attention</h2>
        <ValidationSummary
          issues={issues}
          heading={false}
          links={{
            node: onOpenNode,
            activity: onOpenBlock,
            settings: onOpenBlock,
            ...(onOpenIntervention ? { intervention: onOpenIntervention } : {}),
          }}
        />
      </section>

      {deleting && (
        <ConfirmActivityDelete
          activity={deleting}
          project={project}
          onCancel={cancelDelete}
          onDeleted={() => setDeleting(undefined)}
        />
      )}
    </div>
  )
}
