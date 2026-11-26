import type { Activity, Project, TriccNode } from './types.js'
import type { NodeType } from '../format/schema/node-types.js'
import { isCalculated } from '../format/schema/node-types.js'

/**
 * Calculations that stand on their own: a node `tricc_oo` calculates (calculation, count,
 * add, diagnosis, decision, populate) with no link into it, and something to work it out
 * from: an expression, a
 * reference, or another node of the same name in the project, whose value it takes
 * (`tricc_oo` version inheritance: a diagnosis takes the value of its proposed diagnosis).
 *
 * `tricc_oo` collects them (`manage_dangling_calculate`): each one is worked out from its
 * expression whatever the path, and what follows it is reached only when it is true. So it is
 * a start of its own, not an unreachable node. Linking it to the activity start would make it
 * true as soon as the activity starts, which is a different meaning.
 */
export function danglingCalculates(activity: Activity, project?: Project): Set<string> {
  const targeted = new Set(Object.values(activity.edges).map((e) => e.target))
  const names = project ? nameCounts(project) : undefined
  const out = new Set<string>()
  for (const node of Object.values(activity.nodes)) {
    if (targeted.has(node.id) || !calculatedByTricc(node.type as NodeType)) continue
    // A populate is read from the record: it always has something to work from.
    if (node.type === 'populate') {
      out.add(node.id)
      continue
    }
    const peers = node.name && names ? (names.get(node.name) ?? 0) > 1 : false
    if (peers || hasLogic(node)) out.add(node.id)
  }
  return out
}

/** `TriccNodeCalculateBase` in `tricc_oo`: the calculated types, the decision and populate. */
function calculatedByTricc(type: NodeType): boolean {
  return isCalculated(type) || type === 'rhombus' || type === 'populate'
}

const NAME_COUNTS = new WeakMap<Project, Map<string, number>>()

/** How many nodes carry each name, across the project. Cached per project snapshot. */
function nameCounts(project: Project): Map<string, number> {
  let counts = NAME_COUNTS.get(project)
  if (counts) return counts
  counts = new Map()
  for (const activity of Object.values(project.activities)) {
    for (const node of Object.values(activity.nodes)) {
      if (node.name) counts.set(node.name, (counts.get(node.name) ?? 0) + 1)
    }
  }
  NAME_COUNTS.set(project, counts)
  return counts
}

function hasLogic(node: TriccNode): boolean {
  if (node.calculate?.expression?.trim() || node.expression?.expression?.trim()) return true
  return typeof node.reference === 'string' && node.reference.trim() !== ''
}
