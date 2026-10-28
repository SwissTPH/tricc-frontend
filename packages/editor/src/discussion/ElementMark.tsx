import type { Anchor } from '@tricc/core'
import { useCapability, useProjectSnapshot } from '../runtime/context.js'
import { useDiagramDiscuss } from './context.js'
import { DiscussionMark } from './DiscussionMark.js'
import { discussCounts } from './marks.js'

/** The open dot and pending ring on a diagram element. */
export function ElementMark({
  kind,
  id,
}: {
  kind: 'node' | 'edge' | 'group' | 'comment'
  id: string
}) {
  const diagram = useDiagramDiscuss()
  const project = useProjectSnapshot()
  const canRead = useCapability('comment.read')
  if (!diagram || !canRead) return null
  const counts = discussCounts(project, elementAnchor(diagram.activityId, kind, id))
  if (!counts) return null
  return <DiscussionMark counts={counts} onOpen={() => diagram.open(kind, id)} />
}

function elementAnchor(
  activityId: string,
  kind: 'node' | 'edge' | 'group' | 'comment',
  id: string,
): Anchor {
  switch (kind) {
    case 'node':
      return { kind: 'node', activityId, nodeId: id }
    case 'edge':
      return { kind: 'edge', activityId, edgeId: id }
    case 'group':
      return { kind: 'group', activityId, groupId: id }
    case 'comment':
      return { kind: 'comment', activityId, commentId: id }
  }
}
