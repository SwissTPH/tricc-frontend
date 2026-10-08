import type { LocalizedText } from '../format/schema/localized.js'
import type { Expression } from '../format/schema/expression.js'
import type { ConceptRef } from '../format/schema/concept.js'
import type { NodeType } from '../format/schema/node-types.js'

/**
 * The normalized in-memory model. Plain, immutable data — this is what `snapshot()`
 * returns and what validation, serialization and pure logic consume. No Yjs types
 * appear here by design (feature/20260825-document-model.md §12).
 *
 * Collections are keyed by id rather than arrays: it mirrors the CRDT shape and makes
 * lookup O(1). Order, where it matters, is carried explicitly.
 */

export interface NodeUi {
  x: number
  y: number
  width?: number
  height?: number
  color?: string
  collapsed?: boolean
}

export interface EdgeUi {
  waypoints?: { x: number; y: number }[]
  labelOffset?: { x: number; y: number }
}

export interface SelectOption {
  id: string
  name?: string
  label?: LocalizedText
  concept?: ConceptRef
  relevance?: Expression
}

export interface NotAvailable {
  name?: string
  label?: LocalizedText
  concept?: ConceptRef
}

export type WaitReference = string[] | { activity: string } | { expression: string }

export interface TriccNode {
  id: string
  type: NodeType
  name?: string
  label?: LocalizedText
  hint?: LocalizedText
  help?: LocalizedText
  concept?: ConceptRef

  relevance?: Expression
  calculate?: Expression
  expression?: Expression
  constraint?: Expression
  constraintMessage?: LocalizedText

  required?: boolean
  default?: string
  min?: number
  max?: number
  /** Quantity: the human-readable unit, for example `C` or `kg`. */
  unit?: string
  /** Quantity: unit system. UCUM when the author sets one. */
  unit_system?: string
  /** Quantity: code inside `unit_system`, for example `Cel` or `kg`. */
  unit_code?: string
  repeat?: number
  instance?: number

  reference?: string | WaitReference
  link?: string

  listName?: string
  /**
   * Draw.io `filter` on a select. When set, conversion uses it as the concept
   * code (the name on the drawing is often only a local placeholder).
   */
  filter?: string
  options?: SelectOption[]

  severity?: 'light' | 'mild' | 'moderate' | 'severe'
  priority?: number

  context?: 'patient' | 'facility' | 'practitioner' | 'location' | 'encounter' | 'history'
  period?: string

  /**
   * Process-start form id, spelled `form_id` to match `tricc_oo`.
   * Export names the form from the process `start`. An activity start does not carry it.
   */
  form_id?: string
  process?: string

  /**
   * `continue_with`: the intervention this follow-up starts, an expression string,
   * and a delay as an ISO-8601 period (`P3D`). An intervention `start.due` stays
   * a UCUM duration (`3 d`); this field does not reuse that spelling.
   */
  intervention?: string
  condition?: string
  delay?: string

  media?: { image: string }
  notAvailable?: NotAvailable

  /** Deprecated; preserved on round-trip, never authored. */
  save?: string

  ui?: NodeUi
}

export interface TriccEdge {
  id: string
  source: string
  target: string
  value?: string
  ui?: EdgeUi
}

export interface Activity {
  id: string
  title?: LocalizedText
  process?: string
  applicability?: Expression
  ui?: { viewport: { x: number; y: number; zoom: number } }
  /** Keyed by node id. */
  nodes: Record<string, TriccNode>
  /** Keyed by edge id. */
  edges: Record<string, TriccEdge>
  /** Authored order, so serialization is stable and reviewable. */
  nodeOrder: string[]
  edgeOrder: string[]
}

/** A path to one activity file. The same ref may appear on more than one intervention. */
export interface ActivityRef {
  ref: string
}

export interface Trigger {
  mode: 'on-demand' | 'planned' | 'event'
  event?: string
}

export interface Intervention {
  id: string
  code?: string
  title?: LocalizedText
  description?: LocalizedText
  /** Who this intervention is for. Saved as `start.condition` (and the intent text beside it). */
  applicability?: Expression
  trigger?: Trigger
  /** Flat list. A process page is itself an activity in this list, not a group of pages. */
  activities: ActivityRef[]
}

export interface TriccContext {
  system: string
  code: string
  display?: string
  version?: string
}

export interface Concept {
  system: string
  code: string
  display?: string
  definition?: string
  designations: Record<string, string>
  dataType?: string
  conceptType?: string
  unit?: string
  source?: string
  sourceVersion?: string
  targetResource?: string
  targetPath?: string
}

export interface CodeSystem {
  id: string
  url: string
  version?: string
  name?: string
  title?: string
  description?: string
  status: 'draft' | 'active' | 'retired' | 'unknown'
  content: 'not-present' | 'example' | 'fragment' | 'complete' | 'supplement'
  caseSensitive?: boolean
  /** Keyed by concept code. */
  concepts: Record<string, Concept>
  conceptOrder: string[]
}

export interface Project {
  formatVersion: string
  id: string
  system?: string
  code?: string
  version?: string
  title?: LocalizedText
  description?: LocalizedText
  languages: { default: string; available: string[] }
  interventions: Intervention[]
  contexts: TriccContext[]
  /** Keyed by canonical url. */
  codeSystems: Record<string, CodeSystem>
  defaultCodeSystem?: string
  /** Keyed by library name; value is the CQL source. */
  libraries: Record<string, string>
  /** Keyed by activity id. */
  activities: Record<string, Activity>
  mediaPath?: string
}

/** Where a project's files live, relative to the project root. */
export const PATHS = {
  /** Legacy editor file. Ignored on open and never written. */
  project: 'project.json',
  /** The project file. Activity bodies live beside it under `activities/`. */
  tricc: 'tricc.yaml',
  activities: 'activities',
  terminology: 'terminology',
  cql: 'cql',
  media: 'media',
} as const

export function activityPath(id: string): string {
  return `${PATHS.activities}/${id}.activity.yaml`
}
export function codeSystemPath(id: string): string {
  return `${PATHS.terminology}/${id}.codesystem.json`
}
export function libraryPath(name: string): string {
  return `${PATHS.cql}/${name}.cql`
}
