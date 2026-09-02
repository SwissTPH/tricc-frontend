// Import all components
import StartNode from './StartNode'
import EndNode from './EndNode'
import CalculateNode from './CalculateNode'
import TextNode from './TextNode'
import SelectNode from './SelectNode'
import NumberNode from './NumberNode'
import NoteNode from './NoteNode'

import { TriccNodeType } from '../../types'
import type { ComponentType } from 'react'
import type { NodeProps } from 'reactflow'
import type { CustomNodeData } from '../../types'

// Export all node components
export { default as StartNode } from './StartNode'
export { default as EndNode } from './EndNode'
export { default as CalculateNode } from './CalculateNode'
export { default as TextNode } from './TextNode'
export { default as SelectNode } from './SelectNode'
export { default as NumberNode } from './NumberNode'
export { default as NoteNode } from './NoteNode'

export const nodeTypes: Record<string, ComponentType<NodeProps<CustomNodeData>>> = {
  [TriccNodeType.START]: StartNode,
  [TriccNodeType.ACTIVITY_START]: StartNode, // same component
  [TriccNodeType.END]: EndNode,
  [TriccNodeType.ACTIVITY_END]: EndNode,
  [TriccNodeType.CALCULATE]: CalculateNode,
  [TriccNodeType.TEXT]: TextNode,
  [TriccNodeType.SELECT_ONE]: SelectNode,
  [TriccNodeType.SELECT_MULTIPLE]: SelectNode, // same component, checks inside
  [TriccNodeType.DECIMAL]: NumberNode,
  [TriccNodeType.INTEGER]: NumberNode,
  // fallback
  default: NoteNode,
}

// Optional: helper to get component safely
export function getNodeComponent(type: TriccNodeType) {
  return nodeTypes[type] ?? nodeTypes.default
}
