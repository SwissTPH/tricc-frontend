import type { TriccNode } from '../model/types.js'

/**
 * How each field of a node is stored. One table for the YAML codec (format/codec.ts) and the
 * document codec (document/codec.ts): both walk it, so a field cannot be saved by one and
 * dropped by the other. `satisfies Record<keyof TriccNode, …>` makes a new model field a
 * compile error until it is declared here; a `custom` field must be implemented by both
 * codecs (their tables are typed by `CustomField`).
 *
 * The key order is the order fields are written to the activity YAML.
 */
export const NODE_FIELDS = {
  id: 'key',
  type: 'key',
  name: 'scalar',
  label: 'localized',
  concept: 'json',
  required: 'scalar',
  min: 'scalar',
  max: 'scalar',
  unit: 'scalar',
  unit_system: 'scalar',
  unit_code: 'scalar',
  default: 'scalar',
  listName: 'scalar',
  group: 'scalar',
  options: 'custom',
  relevance: 'expression',
  calculate: 'expression',
  expression: 'expression',
  constraint: 'expression',
  constraintMessage: 'localized',
  reference: 'scalar',
  link: 'scalar',
  repeat: 'scalar',
  instance: 'scalar',
  severity: 'scalar',
  priority: 'scalar',
  context: 'scalar',
  period: 'scalar',
  process: 'scalar',
  intervention: 'scalar',
  condition: 'scalar',
  delay: 'scalar',
  hint: 'localized',
  help: 'localized',
  media: 'json',
  notAvailable: 'custom',
  save: 'scalar',
  ui: 'custom',
  /** Legacy: read on a process start, moved to the intervention name, never written. */
  form_id: 'custom',
  /** Transient formatted label from a drawing; the text migration moves it to the concept. */
  labelMessage: 'transient',
} as const satisfies Record<keyof TriccNode, FieldKind>

export type FieldKind = 'key' | 'scalar' | 'localized' | 'expression' | 'json' | 'custom' | 'transient'
export type NodeField = keyof typeof NODE_FIELDS
export type FieldsOf<K extends FieldKind> = {
  [F in NodeField]: (typeof NODE_FIELDS)[F] extends K ? F : never
}[NodeField]
export type CustomField = FieldsOf<'custom'>

/** The fields of one kind, in table order. */
export function fieldsOf<K extends FieldKind>(kind: K): FieldsOf<K>[] {
  return (Object.keys(NODE_FIELDS) as NodeField[]).filter((f) => NODE_FIELDS[f] === kind) as FieldsOf<K>[]
}
