import type { NodeType } from './node-types.js'
import type { DataType } from './concept.js'

/** Palette sections, in palette order. */
export const PALETTE_GROUPS = ['flow', 'questions', 'logic', 'data', 'clinical'] as const
export type PaletteGroup = (typeof PALETTE_GROUPS)[number]

export const PALETTE_GROUP_LABELS: Record<PaletteGroup, string> = {
  flow: 'Flow',
  questions: 'Questions',
  logic: 'Logic',
  data: 'Data',
  clinical: 'Clinical',
}

/**
 * Everything the libraries need to know about one node type, in one place.
 *
 * Adding a node type means adding one entry here (the compiler refuses an incomplete
 * table), one in the editor's `NODE_VISUALS`, and its fields in the model and schema if it has
 * new ones. Every list and check that used to be written out by hand (`NAMED_TYPES`,
 * `canBranch`, which names are internal, which data type a new concept gets, the palette
 * labels) is derived from this table.
 */
export interface NodeTypeSpec {
  /** What the author sees on the palette and in lists. */
  label: string
  /** Its palette section. Absent: never on the palette (reached another way). */
  group?: PaletteGroup
  /** May appear in an authored activity (not injected by tricc_oo processing). */
  drawable: boolean
  /** The palette offers it directly. False for answers, which belong to their select. */
  offered?: boolean
  /** An activity's root: its kind (process or activity) depends on which. Exactly one per activity. */
  root?: boolean
  /** Start, activity start and ends: anchors of the flow, with no business name. */
  sequence?: boolean
  /** Other logic reads its value by name, so it must have one. */
  named?: boolean
  /** Its name is an internal id: never shown, never edited, never checked. */
  internalName?: boolean
  /** A question: it captures a value from the health worker. */
  capture?: boolean
  /** Its text is read by the health worker: it stands for a concept in the dictionary. */
  text?: boolean
  /** A select: it has answers. */
  select?: boolean
  /** Edges out of it may carry a condition (yes/no, an answer, a score). */
  branching?: boolean
  /** An edge into it attaches it to a question; that edge never carries a condition. */
  extensionTarget?: boolean
  /** Not reached by an edge on purpose, so "nothing leads here" does not apply. */
  unreachableOk?: boolean
  /** It takes a CQL `reference` (a decision, a diagnosis rule). */
  cqlReference?: boolean
  /** The data type a concept created for it gets. */
  dataType?: DataType
  /** The concept type a concept created for it gets (default Observation). */
  conceptType?: string
}

export const NODE_TYPE_SPECS: Record<NodeType, NodeTypeSpec> = {
  // Flow
  start: { label: 'Start', group: 'flow', drawable: true, root: true, sequence: true, internalName: true },
  activity_start: {
    label: 'Activity start',
    group: 'flow',
    drawable: true,
    root: true,
    sequence: true,
    internalName: true,
  },
  activity_end: { label: 'Activity end', group: 'flow', drawable: true, sequence: true, internalName: true },
  end: { label: 'End', group: 'flow', drawable: true, sequence: true, internalName: true },
  goto: { label: 'Go to activity', group: 'flow', drawable: true, internalName: true },
  link_in: { label: 'Link in', group: 'flow', drawable: true },
  link_out: { label: 'Link out', group: 'flow', drawable: true },
  bridge: { label: 'Bridge', group: 'flow', drawable: true },
  wait: { label: 'Wait', group: 'flow', drawable: true },
  continue_with: { label: 'Continue with', group: 'flow', drawable: true },
  // Questions
  select_one: {
    label: 'Single choice',
    group: 'questions',
    drawable: true,
    named: true,
    capture: true,
    text: true,
    select: true,
    branching: true,
    dataType: 'coded',
  },
  select_multiple: {
    label: 'Multiple choice',
    group: 'questions',
    drawable: true,
    named: true,
    capture: true,
    text: true,
    select: true,
    branching: true,
    dataType: 'coded',
  },
  select_yesno: {
    label: 'Yes or no',
    group: 'questions',
    drawable: true,
    named: true,
    capture: true,
    text: true,
    select: true,
    branching: true,
    dataType: 'boolean',
  },
  select_option: { label: 'Choice', group: 'questions', drawable: true, offered: false },
  integer: { label: 'Whole number', group: 'questions', drawable: true, named: true, capture: true, text: true, dataType: 'integer' },
  decimal: { label: 'Decimal number', group: 'questions', drawable: true, named: true, capture: true, text: true, dataType: 'decimal' },
  quantity: { label: 'Quantity', group: 'questions', drawable: true, named: true, capture: true, text: true, dataType: 'quantity' },
  text: { label: 'Text', group: 'questions', drawable: true, named: true, capture: true, text: true, dataType: 'string' },
  date: { label: 'Date', group: 'questions', drawable: true, named: true, capture: true, text: true, dataType: 'date' },
  note: { label: 'Note', group: 'questions', drawable: true, text: true, conceptType: 'InteractSet' },
  // Logic
  calculate: { label: 'Calculation', group: 'logic', drawable: true, named: true, branching: true, unreachableOk: true },
  rhombus: { label: 'Decision', group: 'logic', drawable: true, internalName: true, branching: true, cqlReference: true },
  count: { label: 'Count', group: 'logic', drawable: true, named: true, branching: true },
  add: { label: 'Add', group: 'logic', drawable: true, named: true, branching: true },
  not: { label: 'Not', group: 'logic', drawable: true, branching: true },
  // Data
  populate: { label: 'Prefilled value', group: 'data', drawable: true, named: true },
  // Clinical
  diagnosis: {
    label: 'Diagnosis',
    group: 'clinical',
    drawable: true,
    named: true,
    text: true,
    cqlReference: true,
    conceptType: 'Condition',
  },
  proposed_diagnosis: {
    label: 'Proposed diagnosis',
    group: 'clinical',
    drawable: true,
    named: true,
    text: true,
    cqlReference: true,
    conceptType: 'Condition',
  },
  // Reached from its question, not the palette.
  not_available: {
    label: 'Not available',
    drawable: false,
    named: true,
    text: true,
    branching: true,
    extensionTarget: true,
    unreachableOk: true,
    dataType: 'coded',
  },
}

export function nodeSpec(type: NodeType): NodeTypeSpec {
  return NODE_TYPE_SPECS[type]
}
