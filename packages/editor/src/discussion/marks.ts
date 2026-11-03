import type { Anchor, Discussion, Project } from '@tricc/core'
import { anchorKey } from '@tricc/core'

/** Open and pending counts for the mark on an element. Settled discussions leave no mark. */
export interface DiscussCounts {
  open: number
  pending: number
  /** The latest line, for the hover. */
  latest?: string
}

export function discussionsAbout(project: Project, anchor: Anchor): Discussion[] {
  const key = anchorKey(anchor)
  return Object.values(project.discussions ?? {})
    .filter((discussion) => anchorKey(discussion.about) === key)
    .sort((a, b) => latestAt(b).localeCompare(latestAt(a)))
}

export function discussCounts(project: Project, anchor: Anchor): DiscussCounts | undefined {
  const list = discussionsAbout(project, anchor)
  const open = list.filter((discussion) => discussion.status === 'open').length
  const pending = list.filter((discussion) => discussion.status === 'pending').length
  if (open === 0 && pending === 0) return undefined
  const latest = list
    .flatMap((discussion) => discussion.comments)
    .filter((comment) => !comment.deleted && comment.text)
    .sort((a, b) => b.at.localeCompare(a.at))[0]?.text
  return { open, pending, ...(latest ? { latest: latest.replace(/\s+/g, ' ').trim() } : {}) }
}

/** Open and pending discussions on one activity, including its nodes, connections, groups and sticky notes. */
export function countsOnActivity(project: Project, activityId: string): DiscussCounts | undefined {
  const list = Object.values(project.discussions ?? {}).filter((discussion) =>
    onActivity(discussion.about, activityId),
  )
  const open = list.filter((discussion) => discussion.status === 'open').length
  const pending = list.filter((discussion) => discussion.status === 'pending').length
  if (open === 0 && pending === 0) return undefined
  return { open, pending }
}

function onActivity(anchor: Anchor, activityId: string): boolean {
  return 'activityId' in anchor && anchor.activityId === activityId
}

function latestAt(discussion: Discussion): string {
  const times = [
    discussion.resolution?.at,
    ...discussion.comments.map((comment) => comment.at),
    ...discussion.events.map((event) => event.at),
  ]
  return (
    times
      .filter((time): time is string => Boolean(time))
      .sort()
      .at(-1) ?? ''
  )
}
