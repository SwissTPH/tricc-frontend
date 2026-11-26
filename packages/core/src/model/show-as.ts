import type { Activity, Project, TriccNode } from './types.js'

/**
 * Show as (feature/20261126-questionnaire-pages.md): how a container (activity, block, group of
 * questions) or a call (goto, Use block) appears in the exported form. The file holds the two
 * attributes tricc_oo reads, `page` and `asGroup`; the editor writes them as a pair.
 */
export type ShowAs = 'page' | 'section' | 'inline'

export const SHOW_AS: readonly ShowAs[] = ['page', 'section', 'inline']

export const SHOW_AS_LABEL: Readonly<Record<ShowAs, string>> = {
  page: 'Page',
  section: 'Section',
  inline: 'Inline',
}

export interface ShowAsPair {
  page?: boolean | undefined
  asGroup?: boolean | undefined
}

/**
 * The choice a pair reads as; `undefined` is Default (neither set). `page: true` wins over
 * `asGroup: false`, as in tricc_oo: a page is always a section.
 */
export function showAsOf(pair: ShowAsPair): ShowAs | undefined {
  if (pair.page === true) return 'page'
  if (pair.asGroup === false) return 'inline'
  if (pair.asGroup === true || pair.page === false) return 'section'
  return undefined
}

/** The pair a choice writes. Default (`undefined`) removes both. */
export function showAsPatch(choice: ShowAs | undefined): {
  page: boolean | undefined
  asGroup: boolean | undefined
} {
  switch (choice) {
    case 'page':
      return { page: true, asGroup: true }
    case 'section':
      return { page: false, asGroup: true }
    case 'inline':
      return { page: false, asGroup: false }
    default:
      return { page: undefined, asGroup: undefined }
  }
}

/** The start node an activity or block opens with, when it is one that carries Show as. */
function startOf(activity: Activity | undefined): TriccNode | undefined {
  if (!activity) return undefined
  for (const id of activity.nodeOrder) {
    const n = activity.nodes[id]
    if (n && (n.type === 'activity_start' || n.type === 'block_start')) return n
  }
  return undefined
}

/** The default of a container that sets nothing: an activity and a group are sections, a block is inline. */
export function containerDefault(kind: 'activity_start' | 'block_start' | 'group'): ShowAs {
  return kind === 'block_start' ? 'inline' : 'section'
}

/**
 * What Default means on a node: on a start node its container's default; on a goto or Use block
 * the called activity's or block's choice (its own default when it sets nothing). `undefined`
 * when the node carries no Show as, or the call's target is not in the project.
 */
export function defaultShowAs(node: TriccNode, project: Project): ShowAs | undefined {
  if (node.type === 'activity_start' || node.type === 'block_start') {
    return containerDefault(node.type)
  }
  if (node.type !== 'goto' && node.type !== 'block') return undefined
  const start = startOf(node.link ? project.activities[node.link] : undefined)
  if (!start) return undefined
  return effectiveShowAs(start)
}

/** What a start node resolves to: its own choice, else its container's default. */
export function effectiveShowAs(start: TriccNode): ShowAs {
  return (
    showAsOf(start) ??
    containerDefault(start.type === 'block_start' ? 'block_start' : 'activity_start')
  )
}

/** The start node of the activity a goto opens, if any. */
export function calledStart(node: TriccNode, project: Project): TriccNode | undefined {
  return startOf(node.link ? project.activities[node.link] : undefined)
}
