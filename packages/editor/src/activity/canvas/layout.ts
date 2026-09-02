import dagre from '@dagrejs/dagre'
import type { Activity } from '@tricc/core'

const NODE_W = 200
const NODE_H = 64

/**
 * Top-to-bottom auto-layout.
 *
 * Used for two things only: placing nodes that carry no stored position, and the explicit
 * "tidy up" action. It is never applied silently to an activity that already has
 * positions — clinical authors arrange flowcharts to mirror how care actually proceeds,
 * and rearranging that on their behalf destroys meaning they put there on purpose
 * (feature/20260825-activity-editor.md §7).
 */
export function autoLayout(activity: Activity): Map<string, { x: number; y: number }> {
  const graph = new dagre.graphlib.Graph()
  graph.setGraph({ rankdir: 'TB', nodesep: 48, ranksep: 64, marginx: 24, marginy: 24 })
  graph.setDefaultEdgeLabel(() => ({}))

  for (const id of activity.nodeOrder) {
    if (!activity.nodes[id]) continue
    graph.setNode(id, { width: NODE_W, height: NODE_H })
  }
  for (const id of activity.edgeOrder) {
    const e = activity.edges[id]
    if (!e || !activity.nodes[e.source] || !activity.nodes[e.target]) continue
    graph.setEdge(e.source, e.target)
  }

  dagre.layout(graph)

  const out = new Map<string, { x: number; y: number }>()
  for (const id of graph.nodes()) {
    const n = graph.node(id)
    if (!n) continue
    // dagre centres nodes; the canvas positions by top-left.
    out.set(id, { x: Math.round(n.x - NODE_W / 2), y: Math.round(n.y - NODE_H / 2) })
  }
  return out
}
