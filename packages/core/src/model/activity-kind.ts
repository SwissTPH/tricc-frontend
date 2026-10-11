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

/**
 * The page's entry node. A main `start` anywhere on the page wins, so a process page that
 * also holds an activity start is still a process.
 */
export function rootNode(activity: Activity): TriccNode | undefined {
  const ordered = [
    ...activity.nodeOrder.map((id) => activity.nodes[id]),
    ...Object.values(activity.nodes),
  ].filter((n): n is TriccNode => n !== undefined)
  return (
    ordered.find((n) => n.type === 'start') ?? ordered.find((n) => n.type === 'activity_start')
  )
}

export function activityKind(activity: Activity): ActivityKind {
  return rootNode(activity)?.type === 'start' ? 'process' : 'activity'
}

export function isProcessActivity(activity: Activity): boolean {
  return activityKind(activity) === 'process'
}

/**
 * The process this activity is the entry point for. The start node is the activity, so the
 * process lives on the activity; a root-level value is only read from older documents.
 */
export function processOf(activity: Activity): string | undefined {
  const root = rootNode(activity)
  if (root?.type !== 'start') return undefined
  return activity.process ?? root.process
}

/**
 * The start node is the activity: its label, name, process, and relevance are the
 * activity's title, name, process, and applicability. Move them there, keeping a value the
 * activity already has, so the root carries nothing of its own. Returns the keys dropped
 * because the activity already had a different value.
 */
export function liftRootAttributes(activity: Activity): string[] {
  const root = rootNode(activity)
  if (!root) return []
  const dropped: string[] = []
  if (root.label) {
    const label = Object.fromEntries(
      Object.entries(root.label).filter(([, text]) => text.trim() !== ''),
    )
    if (Object.keys(label).length > 0) {
      if (!activity.title) activity.title = label
      else if (JSON.stringify(activity.title) !== JSON.stringify(label)) dropped.push('label')
    }
    delete root.label
  }
  if (root.name !== undefined) {
    if (activity.name === undefined) activity.name = root.name
    else if (activity.name !== root.name) dropped.push('name')
    delete root.name
  }
  if (root.process !== undefined) {
    if (activity.process === undefined) activity.process = root.process
    else if (activity.process !== root.process) dropped.push('process')
    delete root.process
  }
  if (root.relevance?.expression || root.relevance?.intent) {
    if (!activity.applicability) activity.applicability = { ...root.relevance }
    else if (JSON.stringify(activity.applicability) !== JSON.stringify(root.relevance))
      dropped.push('relevance')
  }
  delete root.relevance
  return dropped
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
