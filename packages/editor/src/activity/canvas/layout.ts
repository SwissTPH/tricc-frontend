import dagre from '@dagrejs/dagre'
import { DEFAULT_PREFERENCES, type Activity } from '@tricc/core'

const NODE_W = 200
const NODE_H = 64
/**
 * Default horizontal gap between sibling nodes and branches: half a node plus 8px, room for
 * an edge label. The viewer's `nodeGap` preference overrides it.
 */
export const H_GAP = NODE_W / 2 + 8
/** Vertical gap between ranks. */
export const V_GAP = 64
/** Space around the laid-out graph. */
const MARGIN = 24

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
 * know, such as ones not drawn yet, use the default box. `hGap` is the horizontal space
 * between side-by-side nodes (the `nodeGap` preference).
 */
export function autoLayout(
  activity: Activity,
  sizeOf: (id: string) => NodeSize | undefined = () => undefined,
  hGap: number = DEFAULT_PREFERENCES.nodeGap,
): Map<string, { x: number; y: number }> {
  const graph = new dagre.graphlib.Graph()
  graph.setGraph({ rankdir: 'TB', nodesep: hGap, ranksep: V_GAP, marginx: MARGIN, marginy: MARGIN })
  graph.setDefaultEdgeLabel(() => ({}))

  const sizes = new Map<string, NodeSize>()
  for (const id of activity.nodeOrder) {
    if (!activity.nodes[id] || sizes.has(id)) continue
    sizes.set(id, sizeOf(id) ?? { width: NODE_W, height: NODE_H })
  }
  const connected = new Set<string>()
  const edges: [string, string][] = []
  for (const id of activity.edgeOrder) {
    const e = activity.edges[id]
    if (!e || !sizes.has(e.source) || !sizes.has(e.target)) continue
    connected.add(e.source).add(e.target)
    edges.push([e.source, e.target])
  }

  // Only connected nodes go through dagre: it would put every node without an edge on the
  // top rank, one long row (#27). Those are packed in a grid to the right of the flow instead,
  // its first row on the start node's line.
  for (const id of connected) graph.setNode(id, { ...sizes.get(id)! })
  for (const [source, target] of edges) graph.setEdge(source, target)
  dagre.layout(graph)

  const out = new Map<string, { x: number; y: number }>()
  let flowRight: number | undefined
  for (const id of graph.nodes()) {
    const n = graph.node(id)
    if (!n) continue
    // dagre centres nodes; the canvas positions by top-left.
    const size = sizes.get(id)!
    const y = Math.round(n.y - size.height / 2)
    out.set(id, { x: Math.round(n.x - size.width / 2), y })
    const right = Math.round(n.x + size.width / 2)
    flowRight = Math.max(flowRight ?? right, right)
  }

  const dangling = [...sizes.keys()].filter((id) => !connected.has(id))
  const start = activity.nodeOrder.find(
    (id) => connected.has(id) && activity.nodes[id]?.type === 'activity_start',
  )
  const left = flowRight === undefined ? MARGIN : flowRight + hGap
  const top = start ? out.get(start)!.y : MARGIN
  for (const [id, pos] of danglingGrid(dangling, sizes, hGap, left, top)) out.set(id, pos)
  return out
}

/**
 * Unconnected nodes in node order, row by row from (`left`, `top`), `ceil(sqrt(n))` per row: a block about as
 * many rows as columns, wider than tall since nodes are. Columns are as wide as the widest
 * of these nodes plus `hGap`; each row as tall as its tallest node plus `V_GAP`.
 */
function danglingGrid(
  ids: string[],
  sizes: Map<string, NodeSize>,
  hGap: number,
  left: number,
  top: number,
): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>()
  if (ids.length === 0) return out
  const cols = Math.ceil(Math.sqrt(ids.length))
  const pitch = Math.max(...ids.map((id) => sizes.get(id)!.width)) + hGap
  let y = top
  for (let start = 0; start < ids.length; start += cols) {
    const row = ids.slice(start, start + cols)
    row.forEach((id, i) => out.set(id, { x: left + i * pitch, y }))
    y += Math.max(...row.map((id) => sizes.get(id)!.height)) + V_GAP
  }
  return out
}
