import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { CanvasComment } from '@tricc/core'
import { ElementMark } from '../../discussion/ElementMark.js'

export type CommentFlowNode = Node<{ comment: CanvasComment }, 'comment'>

/** Flow ids of comments, so they never collide with node ids. */
export const COMMENT_PREFIX = 'comment:'
export const commentFlowId = (id: string) => `${COMMENT_PREFIX}${id}`
export const commentIdOf = (flowId: string | undefined) =>
  flowId?.startsWith(COMMENT_PREFIX) ? flowId.slice(COMMENT_PREFIX.length) : undefined

/**
 * A comment on the diagram: a sticky note for authors. It is not part of the guideline and
 * never reaches tricc_oo. Drag from its handle onto a node to say what it is about; that
 * draws a dashed line, not an edge.
 */
export function CommentNodeView({ data, selected }: NodeProps<CommentFlowNode>) {
  const { comment } = data
  return (
    <div
      className={`tricc-comment tricc-comment--${comment.color}${selected ? ' is-selected' : ''}`}
      data-testid={`comment-${comment.id}`}
      data-color={comment.color}
      style={{
        ...(comment.width ? { width: comment.width } : {}),
        ...(comment.height ? { minHeight: comment.height } : {}),
      }}
      title="Sticky note — only on the drawing, not in the guideline"
    >
      <span className="tricc-comment__text">{comment.text || 'Sticky note'}</span>
      <ElementMark kind="comment" id={comment.id} />
      <Handle
        type="source"
        position={Position.Right}
        id="about"
        title="Drag onto the node this is about"
      />
    </div>
  )
}
