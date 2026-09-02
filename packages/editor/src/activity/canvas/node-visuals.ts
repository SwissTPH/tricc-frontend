import type { NodeType } from '@tricc/core'

/**
 * How each node type reads on the canvas.
 *
 * Shape carries the structural role and colour carries the group, so a node is
 * identifiable without reading its label — which is what makes a 300-node guideline
 * skimmable. Validation state is a border treatment plus an icon, never colour alone,
 * because colour already encodes the group here.
 */

export type NodeShape = 'terminator' | 'rounded' | 'diamond' | 'box' | 'junction' | 'gate'

export interface NodeVisual {
  shape: NodeShape
  /** CSS custom-property group, defined in styles.css. */
  group: 'flow' | 'question' | 'logic' | 'data' | 'clinical'
  glyph: string
  /** Whether the node accepts an incoming / outgoing connection. */
  targets: boolean
  sources: boolean
}

const V = (
  shape: NodeShape,
  group: NodeVisual['group'],
  glyph: string,
  targets = true,
  sources = true,
): NodeVisual => ({ shape, group, glyph, targets, sources })

export const NODE_VISUALS: Record<NodeType, NodeVisual> = {
  // Flow
  start: V('terminator', 'flow', '▶', false, true),
  activity_start: V('terminator', 'flow', '▶', false, true),
  activity_end: V('terminator', 'flow', '■', true, false),
  end: V('terminator', 'flow', '■', true, false),
  goto: V('rounded', 'flow', '↪'),
  link_in: V('rounded', 'flow', '⇥', false, true),
  link_out: V('rounded', 'flow', '↦', true, false),
  bridge: V('junction', 'flow', '＋'),
  wait: V('gate', 'flow', '⏳'),

  // Questions
  select_one: V('box', 'question', '◉'),
  select_multiple: V('box', 'question', '☑'),
  select_yesno: V('box', 'question', '⊙'),
  select_option: V('box', 'question', '•'),
  integer: V('box', 'question', '#'),
  decimal: V('box', 'question', '#'),
  text: V('box', 'question', 'A'),
  date: V('box', 'question', '▤'),
  note: V('box', 'question', '✎'),

  // Logic
  calculate: V('rounded', 'logic', 'ƒ'),
  rhombus: V('diamond', 'logic', '?'),
  count: V('rounded', 'logic', 'Σ'),
  add: V('rounded', 'logic', '+'),
  not: V('rounded', 'logic', '¬'),

  // Data
  populate: V('rounded', 'data', '↓'),

  // Clinical
  diagnosis: V('box', 'clinical', '✚'),
  proposed_diagnosis: V('box', 'clinical', '✚'),

  // Modifier-generated
  not_available: V('box', 'question', '∅'),
}

export function visualFor(type: NodeType): NodeVisual {
  return NODE_VISUALS[type] ?? V('box', 'question', '?')
}
