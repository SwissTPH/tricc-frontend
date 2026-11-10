import type { Anchor, Discussion, DiscussionLabel } from '../model/types.js'
import { discussionFileSchema, discussionLabelsFileSchema } from '../format/schema/discussion.js'

/** The `about` value as it is written in a discussion file. */
export function aboutToFile(anchor: Anchor): string | Record<string, string> {
  switch (anchor.kind) {
    case 'project':
      return 'project'
    case 'intervention':
      return { intervention: anchor.interventionId }
    case 'activity':
      return { activity: anchor.activityId }
    case 'node':
      return { activity: anchor.activityId, node: anchor.nodeId }
    case 'edge':
      return { activity: anchor.activityId, edge: anchor.edgeId }
    case 'group':
      return { activity: anchor.activityId, group: anchor.groupId }
    case 'comment':
      return { activity: anchor.activityId, comment: anchor.commentId }
    case 'concept':
      return { system: anchor.system, concept: anchor.code }
    case 'image':
      return { image: anchor.imageId }
  }
}

export function aboutFromFile(value: unknown): Anchor | undefined {
  const parsed = discussionFileSchema.shape.about.safeParse(value)
  if (!parsed.success) return undefined
  const about = parsed.data
  if (about === 'project') return { kind: 'project' }
  if ('node' in about) return { kind: 'node', activityId: about.activity, nodeId: about.node }
  if ('edge' in about) return { kind: 'edge', activityId: about.activity, edgeId: about.edge }
  if ('group' in about) return { kind: 'group', activityId: about.activity, groupId: about.group }
  if ('comment' in about)
    return { kind: 'comment', activityId: about.activity, commentId: about.comment }
  if ('intervention' in about) return { kind: 'intervention', interventionId: about.intervention }
  if ('concept' in about) return { kind: 'concept', system: about.system, code: about.concept }
  if ('image' in about) return { kind: 'image', imageId: about.image }
  return { kind: 'activity', activityId: about.activity }
}

/** A discussion as a plain object, keys in file order. */
export function discussionToFile(discussion: Discussion): Record<string, unknown> {
  const file: Record<string, unknown> = {
    id: discussion.id,
    about: aboutToFile(discussion.about),
    label: discussion.label,
    status: discussion.status,
    labels: [...discussion.labels],
  }
  if (discussion.assignee) file.assignee = { ...discussion.assignee }
  file.comments = discussion.comments.map((comment) => {
    const row: Record<string, unknown> = {
      id: comment.id,
      author: { ...comment.author },
      at: comment.at,
    }
    if (!comment.deleted && comment.text !== undefined) row.text = comment.text
    if (comment.edited) row.edited = comment.edited
    if (comment.deleted) row.deleted = true
    return row
  })
  file.events = discussion.events.map((event) => {
    const row: Record<string, unknown> = { at: event.at, by: { ...event.by } }
    if (event.status) row.status = event.status
    if (event.labels) row.labels = [...event.labels]
    if ('assignee' in event) row.assignee = event.assignee ? { ...event.assignee } : null
    return row
  })
  if (discussion.resolution) {
    const resolution: Record<string, unknown> = {
      by: { ...discussion.resolution.by },
      at: discussion.resolution.at,
    }
    if (discussion.resolution.note) resolution.note = discussion.resolution.note
    if (discussion.resolution.version) resolution.version = discussion.resolution.version
    file.resolution = resolution
  }
  return file
}

export function discussionFromFile(value: unknown): Discussion | undefined {
  const parsed = discussionFileSchema.safeParse(value)
  if (!parsed.success) return undefined
  const about = aboutFromFile(parsed.data.about)
  if (!about) return undefined
  const file = parsed.data
  return {
    id: file.id,
    about,
    label: file.label,
    status: file.status,
    labels: file.labels,
    ...(file.assignee ? { assignee: file.assignee } : {}),
    comments: file.comments.map((comment) => ({
      id: comment.id,
      author: comment.author,
      at: comment.at,
      ...(comment.text !== undefined ? { text: comment.text } : {}),
      ...(comment.edited ? { edited: comment.edited } : {}),
      ...(comment.deleted ? { deleted: true } : {}),
    })),
    events: file.events.map((event) => ({
      at: event.at,
      by: event.by,
      ...(event.status ? { status: event.status } : {}),
      ...(event.labels ? { labels: event.labels } : {}),
      ...('assignee' in event ? { assignee: event.assignee ?? null } : {}),
    })),
    ...(file.resolution ? { resolution: file.resolution } : {}),
  }
}

export function labelsToFile(labels: DiscussionLabel[]): { labels: DiscussionLabel[] } {
  return { labels: labels.map((label) => ({ id: label.id, name: label.name, color: label.color })) }
}

export function labelsFromFile(value: unknown): DiscussionLabel[] | undefined {
  const parsed = discussionLabelsFileSchema.safeParse(value)
  if (!parsed.success) return undefined
  return parsed.data.labels
}
