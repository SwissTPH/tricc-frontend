/**
 * TRICC node types.
 *
 * Values match `TriccNodeType` in tricc_oo/models/base.py exactly — they are written to
 * the activity YAML and read by the Python side.
 */
export const NODE_TYPES = [
  // Flow
  'start',
  'activity_start',
  'activity_end',
  'end',
  'goto',
  'link_in',
  'link_out',
  'bridge',
  'wait',
  'continue_with',
  // Questions
  'select_one',
  'select_multiple',
  'select_yesno',
  'select_option',
  'integer',
  'decimal',
  'quantity',
  'text',
  'date',
  'note',
  // Logic
  'calculate',
  'rhombus',
  'count',
  'add',
  'not',
  // Data
  'populate',
  // Clinical
  'diagnosis',
  'proposed_diagnosis',
  // Modifier-generated (serialized as a node, shown as a badge)
  'not_available',
] as const

export type NodeType = (typeof NODE_TYPES)[number]

/**
 * Types created by tricc_oo during graph processing. Their presence in an authored file
 * means it came from a processed graph. `container_hint_media` is deprecated.
 * See feature/20260825-project-format.md §4.
 */
export const INJECTED_ONLY_TYPES = ['factor', 'container_hint_media'] as const

/** Types the palette offers. `not_available` is reached through its modifier, not the palette. */
export const DRAWABLE_TYPES = NODE_TYPES.filter((t) => t !== 'not_available')

export const NODE_TYPE_GROUPS = {
  flow: [
    'start',
    'activity_start',
    'activity_end',
    'end',
    'goto',
    'link_in',
    'link_out',
    'bridge',
    'wait',
    'continue_with',
  ],
  questions: [
    'select_one',
    'select_multiple',
    'select_yesno',
    'select_option',
    'integer',
    'decimal',
    'quantity',
    'text',
    'date',
    'note',
  ],
  logic: ['calculate', 'rhombus', 'count', 'add', 'not'],
  data: ['populate'],
  clinical: ['diagnosis', 'proposed_diagnosis'],
} as const satisfies Record<string, readonly NodeType[]>

export const SELECT_TYPES = ['select_one', 'select_multiple', 'select_yesno'] as const
export const SEQUENCE_TYPES = ['start', 'activity_start', 'activity_end', 'end'] as const
export const CAPTURE_TYPES = [
  'select_one',
  'select_multiple',
  'select_yesno',
  'integer',
  'decimal',
  'quantity',
  'text',
  'date',
] as const

export function isSelect(t: NodeType): boolean {
  return (SELECT_TYPES as readonly string[]).includes(t)
}
/** Sequence anchors keep their own label; everything else inherits its concept's display. */
export function isSequenceNode(t: NodeType): boolean {
  return (SEQUENCE_TYPES as readonly string[]).includes(t)
}
export function isCapture(t: NodeType): boolean {
  return (CAPTURE_TYPES as readonly string[]).includes(t)
}
