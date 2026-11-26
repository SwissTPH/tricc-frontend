import { NodeResizer, type Node, type NodeProps } from '@xyflow/react'
import { SHOW_AS_LABEL, showAsOf, type CanvasGroup } from '@tricc/core'
import { ElementMark } from '../../discussion/ElementMark.js'

export type GroupFlowNode = Node<
  { group: CanvasGroup; title: string; canWrite: boolean },
  'group-frame'
>

export const GROUP_PREFIX = 'group:'
export const groupFlowId = (id: string) => `${GROUP_PREFIX}${id}`
export const groupIdOf = (flowId: string | undefined) =>
  flowId?.startsWith(GROUP_PREFIX) ? flowId.slice(GROUP_PREFIX.length) : undefined

/**
 * A page group on the diagram: a titled frame its nodes are drawn in, and a section of the
 * form once converted. Drag a node into it to add it, out of it to take it out.
 */
export function GroupNodeView({ data, selected }: NodeProps<GroupFlowNode>) {
  const { group, title, canWrite } = data
  // Show as: a badge when it is not Default; an Inline group is only a frame (dotted, no fill).
  const showAs = showAsOf(group)
  return (
    <div
      className={`tricc-group tricc-group--${group.color}${showAs === 'inline' ? ' tricc-group--inline' : ''}${selected ? ' is-selected' : ''}`}
      data-testid={`group-${group.id}`}
      data-color={group.color}
      data-show-as={showAs}
    >
      {canWrite && <NodeResizer isVisible={selected} minWidth={120} minHeight={80} />}
      <div className="tricc-group__title" data-testid={`group-${group.id}-title`}>
        {title || 'Group'}
        {showAs && (
          <span
            className="tricc-badge tricc-group__badge"
            data-testid={`group-${group.id}-show-as`}
          >
            {SHOW_AS_LABEL[showAs]}
          </span>
        )}
      </div>
      <ElementMark kind="group" id={group.id} />
    </div>
  )
}
