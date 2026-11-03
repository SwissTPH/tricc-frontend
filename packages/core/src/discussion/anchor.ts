import { resolve } from '../format/schema/localized.js'
import type { Anchor, Project } from '../model/types.js'

/** Stable key for maps and filters. The same element always produces the same key. */
export function anchorKey(anchor: Anchor): string {
  switch (anchor.kind) {
    case 'project':
      return 'project'
    case 'intervention':
      return `intervention:${anchor.interventionId}`
    case 'activity':
      return `activity:${anchor.activityId}`
    case 'node':
      return `node:${anchor.activityId}/${anchor.nodeId}`
    case 'edge':
      return `edge:${anchor.activityId}/${anchor.edgeId}`
    case 'group':
      return `group:${anchor.activityId}/${anchor.groupId}`
    case 'comment':
      return `comment:${anchor.activityId}/${anchor.commentId}`
    case 'concept':
      return `concept:${anchor.system}/${anchor.code}`
    case 'image':
      return `image:${anchor.imageId}`
  }
}

export function anchorKindName(kind: Anchor['kind']): string {
  switch (kind) {
    case 'project':
      return 'Project'
    case 'intervention':
      return 'Intervention'
    case 'activity':
      return 'Activity'
    case 'node':
      return 'Node'
    case 'edge':
      return 'Connection'
    case 'group':
      return 'Group'
    case 'comment':
      return 'Sticky note'
    case 'concept':
      return 'Concept'
    case 'image':
      return 'Image'
  }
}

/** `node:weight_check/n-weight`. Undefined when the text is not an anchor. */
export function anchorToParam(anchor: Anchor): string {
  return anchorKey(anchor)
}

export function anchorFromParam(param: string): Anchor | undefined {
  if (param === 'project') return { kind: 'project' }
  const split = param.indexOf(':')
  if (split < 0) return undefined
  const kind = param.slice(0, split)
  const rest = param.slice(split + 1)
  if (kind === 'intervention') return { kind: 'intervention', interventionId: rest }
  if (kind === 'activity') return { kind: 'activity', activityId: rest }
  if (kind === 'concept') {
    const slash = rest.indexOf('/')
    if (slash < 0) return undefined
    return { kind: 'concept', system: rest.slice(0, slash), code: rest.slice(slash + 1) }
  }
  if (kind === 'image') return { kind: 'image', imageId: rest }
  const slash = rest.indexOf('/')
  if (slash < 0) return undefined
  const activityId = rest.slice(0, slash)
  const id = rest.slice(slash + 1)
  if (kind === 'node') return { kind: 'node', activityId, nodeId: id }
  if (kind === 'edge') return { kind: 'edge', activityId, edgeId: id }
  if (kind === 'group') return { kind: 'group', activityId, groupId: id }
  if (kind === 'comment') return { kind: 'comment', activityId, commentId: id }
  return undefined
}

/** The element, or undefined when it has been deleted. The project itself is always there. */
export function resolveAnchor(project: Project, anchor: Anchor): unknown {
  switch (anchor.kind) {
    case 'project':
      return project
    case 'intervention':
      return project.interventions.find((item) => item.id === anchor.interventionId)
    case 'activity':
      return project.activities[anchor.activityId]
    case 'node':
      return project.activities[anchor.activityId]?.nodes[anchor.nodeId]
    case 'edge':
      return project.activities[anchor.activityId]?.edges[anchor.edgeId]
    case 'group':
      return project.activities[anchor.activityId]?.groups?.find(
        (group) => group.id === anchor.groupId,
      )
    case 'comment':
      return project.activities[anchor.activityId]?.ui?.comments?.find(
        (comment) => comment.id === anchor.commentId,
      )
    case 'concept': {
      const system = Object.values(project.codeSystems).find((item) => item.url === anchor.system)
      return system?.concepts[anchor.code]
    }
    case 'image':
      return project.images?.[anchor.imageId]
  }
}

/** The name shown on a discussion, taken from the element as it is now. */
export function anchorLabel(project: Project, anchor: Anchor, language: string): string {
  switch (anchor.kind) {
    case 'project':
      return resolve(project.title, language, language) ?? project.id
    case 'intervention': {
      const title = project.interventions.find((item) => item.id === anchor.interventionId)?.title
      return resolve(title, language, language) ?? anchor.interventionId
    }
    case 'activity': {
      const title = project.activities[anchor.activityId]?.title
      return resolve(title, language, language) ?? anchor.activityId
    }
    case 'node': {
      const node = project.activities[anchor.activityId]?.nodes[anchor.nodeId]
      return (node && (resolve(node.label, language, language) ?? node.name)) || anchor.nodeId
    }
    case 'edge':
      return anchor.edgeId
    case 'group': {
      const group = project.activities[anchor.activityId]?.groups?.find(
        (item) => item.id === anchor.groupId,
      )
      return group?.name || (group && resolve(group.label, language, language)) || anchor.groupId
    }
    case 'comment': {
      const note = project.activities[anchor.activityId]?.ui?.comments?.find(
        (item) => item.id === anchor.commentId,
      )
      const text = note?.text?.trim()
      return text || 'Sticky note'
    }
    case 'concept':
      return anchor.code
    case 'image':
      return anchor.imageId
  }
}
