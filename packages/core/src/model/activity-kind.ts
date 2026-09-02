import type { Activity, TriccNode } from './types.js'

/**
 * Activities come in two kinds, and the difference is structural rather than a flag.
 *
 * A **process activity** is rooted by `start` carrying a `process`. It is the entry point
 * for a cpg-common-process segment, and in practice it wraps calls to normal activities.
 *
 * A **normal activity** is rooted by `activity_start`. It is reusable: it can be called
 * from a process activity, and `goto`-called from inside another activity, without those
 * uses interfering.
 *
 * The wrapper exists precisely so those two roles stay separate. The same activity object
 * cannot be both a process entry and a nested instance — which is why assigning a process
 * directly to a normal activity would break the moment anything else called it.
 */
export type ActivityKind = 'process' | 'activity'

export function rootNode(activity: Activity): TriccNode | undefined {
  for (const id of activity.nodeOrder) {
    const node = activity.nodes[id]
    if (node && (node.type === 'start' || node.type === 'activity_start')) return node
  }
  return Object.values(activity.nodes).find(
    (n) => n.type === 'start' || n.type === 'activity_start',
  )
}

export function activityKind(activity: Activity): ActivityKind {
  return rootNode(activity)?.type === 'start' ? 'process' : 'activity'
}

export function isProcessActivity(activity: Activity): boolean {
  return activityKind(activity) === 'process'
}

/**
 * The process this activity is the entry point for.
 *
 * Read from the root node first, then the activity-level field, matching what
 * `tricc_oo`'s `_assign_start_page` does: `root.process or activity.process`.
 */
export function processOf(activity: Activity): string | undefined {
  const root = rootNode(activity)
  if (root?.type !== 'start') return undefined
  return root.process ?? activity.process
}

/** The activities a process activity calls, in flow order where that can be determined. */
export function calledActivities(activity: Activity): string[] {
  const out: string[] = []
  for (const id of activity.nodeOrder) {
    const node = activity.nodes[id]
    if (node?.type === 'goto' && node.link) out.push(node.link)
  }
  return out
}
