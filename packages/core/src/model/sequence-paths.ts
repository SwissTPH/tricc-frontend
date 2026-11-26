import type { Activity } from './types.js'

/** One node on a path, with the condition on the link it leaves by (`TriccEdge.value`). */
export interface PathStep {
  nodeId: string
  /** The value of the link to the next step; undefined for an unconditional link. */
  value?: string
}

export interface SequencePaths {
  /** Each path runs from a node nothing leads to (the activity start, or a calculation that
   * starts on its own) up to, not including, the node asked about. */
  paths: PathStep[][]
  /** True when there are more paths than `limit`, or the search gave up on a large graph. */
  more: boolean
}

/** How many nodes the search may visit before it stops, so a dense graph cannot hang the UI. */
const VISIT_BUDGET = 5000

/**
 * The paths that lead to a node. A calculation with no expression of its own is worked out by
 * `tricc_oo` from the nodes before it (`get_prev_node_expression`): it is true when one of these
 * paths was followed. Paths through a loop are left out.
 */
export function sequencePaths(activity: Activity, nodeId: string, limit = 10): SequencePaths {
  const incoming = new Map<string, { source: string; value?: string }[]>()
  for (const id of activity.edgeOrder) {
    const e = activity.edges[id]
    if (!e || !activity.nodes[e.source]) continue
    const list = incoming.get(e.target) ?? []
    list.push(e.value === undefined ? { source: e.source } : { source: e.source, value: e.value })
    incoming.set(e.target, list)
  }

  const paths: PathStep[][] = []
  let visits = 0
  let more = false
  // Walk back from the node; `tail` holds the steps found so far, nearest the node last.
  const walk = (id: string, tail: PathStep[], onPath: Set<string>): void => {
    if (++visits > VISIT_BUDGET) more = true
    if (more) return
    for (const { source, value } of incoming.get(id) ?? []) {
      if (onPath.has(source)) continue
      const step: PathStep = value === undefined ? { nodeId: source } : { nodeId: source, value }
      const next = [step, ...tail]
      if ((incoming.get(source) ?? []).length === 0) {
        if (paths.length === limit) {
          more = true
          return
        }
        paths.push(next)
        continue
      }
      onPath.add(source)
      walk(source, next, onPath)
      onPath.delete(source)
      if (more) return
    }
  }
  walk(nodeId, [], new Set([nodeId]))
  return { paths, more }
}
