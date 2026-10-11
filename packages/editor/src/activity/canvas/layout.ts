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
export type NodeSize = { width: number; height: number }

/** The rendered size of every node the canvas shows, read from the DOM, unscaled by zoom. */
export function renderedNodeSize(id: string): NodeSize | undefined {
  if (typeof document === 'undefined') return undefined
  const el = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(id)}"]`)
  if (!el || !el.offsetWidth || !el.offsetHeight) return undefined
  return { width: el.offsetWidth, height: el.offsetHeight }
}

/**
 * `sizeOf` gives a node's real size (wrapped text makes nodes taller). Nodes it does not
 * know, such as ones not drawn yet, use the default box.
 */
export function autoLayout(
  activity: Activity,
  sizeOf: (id: string) => NodeSize | undefined = () => undefined,
): Map<string, { x: number; y: number }> {
  const graph = new dagre.graphlib.Graph()
  graph.setGraph({ rankdir: 'TB', nodesep: 48, ranksep: 64, marginx: 24, marginy: 24 })
  graph.setDefaultEdgeLabel(() => ({}))

  const sizes = new Map<string, NodeSize>()
  for (const id of activity.nodeOrder) {
    if (!activity.nodes[id]) continue
    const size = sizeOf(id) ?? { width: NODE_W, height: NODE_H }
    sizes.set(id, size)
    graph.setNode(id, { ...size })
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
    const size = sizes.get(id) ?? { width: NODE_W, height: NODE_H }
    out.set(id, { x: Math.round(n.x - size.width / 2), y: Math.round(n.y - size.height / 2) })
  }
  return out
}
