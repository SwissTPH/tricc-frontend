import { BaseNode } from './BaseNode'
import { getNodeColor } from './utils/getNodeColor'
import { getNodeIcon } from './utils/getNodeIcon'
import type { NodeProps } from 'reactflow'
import type { CustomNodeData } from '../../types'

export default function NoteNode(nodeProps: NodeProps<CustomNodeData>) {
  const { data } = nodeProps
  const color = getNodeColor(data.nodeType)
  const icon = getNodeIcon(data.nodeType)

  return <BaseNode {...nodeProps} color={color} icon={icon} />
}
