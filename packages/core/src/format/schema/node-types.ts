/**
 * TRICC node types.
 *
 * Values match `TriccNodeType` in tricc_oo/models/base.py exactly — they are written to
 * the activity YAML and read by the Python side.
 */
import { NODE_TYPE_SPECS, PALETTE_GROUPS, type NodeTypeSpec, type PaletteGroup } from './node-spec.js'

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

const where = (test: (spec: NodeTypeSpec) => boolean | undefined): NodeType[] =>
  NODE_TYPES.filter((t) => test(NODE_TYPE_SPECS[t]))

/*
 * The lists below are derived from NODE_TYPE_SPECS (node-spec.ts), in NODE_TYPES order.
 * They keep their names so callers did not change; the table is the one place to edit.
 */

/** Types an authored activity may contain. `not_available` is reached from its question. */
export const DRAWABLE_TYPES = where((s) => s.drawable)

/** Palette sections and their types, in palette order. */
export const NODE_TYPE_GROUPS = Object.fromEntries(
  PALETTE_GROUPS.map((g) => [g, where((s) => s.group === g)]),
) as Record<PaletteGroup, NodeType[]>

export const SELECT_TYPES = where((s) => s.select)
export const SEQUENCE_TYPES = where((s) => s.sequence)
/**
 * Nodes whose value other logic reads by name, so they must carry one. Sequence nodes
 * (start, activity start, ends) have no business name: TRICC may give them an id.
 */
export const NAMED_TYPES = where((s) => s.named)
/**
 * Nodes an edge attaches to a question rather than branches to. An edge into one is never
 * conditional (hint, help and pictures are folded into the question on read).
 */
export const EXTENSION_TARGET_TYPES = where((s) => s.extensionTarget)
export const CAPTURE_TYPES = where((s) => s.capture)
/**
 * Nodes whose text the health worker reads. They stand for a concept, and their texts
 * (label, hint, help) live in the CodeSystem, not in the activity YAML.
 */
export const TEXT_NODE_TYPES = where((s) => s.text)

/**
 * Nodes whose value logic computes (calculations, counts, sums, diagnoses). Their concepts
 * belong in the calculate dictionary; decisions are only nodes.
 */
export const CALCULATED_TYPES = where((s) => s.calculated)

export const isTextNode = (t: NodeType): boolean => Boolean(NODE_TYPE_SPECS[t]?.text)
export const isCalculated = (t: NodeType): boolean => Boolean(NODE_TYPE_SPECS[t]?.calculated)
/**
 * It can carry `repeat` (collect again, in a new slot) and `instance` (the same collection
 * reached at several points). tricc_oo reads them on every node that holds a value, on a goto
 * (the called activity), and on an activity start (every value of the activity).
 */
export const isRepeatable = (t: NodeType): boolean =>
  Boolean(NODE_TYPE_SPECS[t]?.named) || t === 'goto' || t === 'activity_start'
export const isSelect = (t: NodeType): boolean => Boolean(NODE_TYPE_SPECS[t]?.select)
/** Sequence anchors keep their own label; everything else inherits its concept's display. */
export const isSequenceNode = (t: NodeType): boolean => Boolean(NODE_TYPE_SPECS[t]?.sequence)
export const needsName = (t: NodeType): boolean => Boolean(NODE_TYPE_SPECS[t]?.named)
export const isExtensionTarget = (t: NodeType): boolean => Boolean(NODE_TYPE_SPECS[t]?.extensionTarget)
export const isCapture = (t: NodeType): boolean => Boolean(NODE_TYPE_SPECS[t]?.capture)
/** Its name is an internal id: never shown, never edited, never checked. */
export const hasInternalName = (t: NodeType): boolean => Boolean(NODE_TYPE_SPECS[t]?.internalName)
/** Edges out of it may carry a condition. */
export const canBranchFrom = (t: NodeType): boolean => Boolean(NODE_TYPE_SPECS[t]?.branching)
