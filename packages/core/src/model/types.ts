import type { LocalizedText } from '../format/schema/localized.js'
import type { Expression } from '../format/schema/expression.js'
import type { Message } from '../text/message.js'
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
  /** The page group (section) the node is in. Its `ui` position is then relative to the group. */
  group?: string
  name?: string
  label?: LocalizedText
  /**
   * The default-language label as a formatted tree, when the source (a draw.io shape) had
   * bold, breaks, lists or `${}`. Read-only and transient: the text migration moves it to
   * the concept; it is never written to a file or kept in the document.
   */
  labelMessage?: Message
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
  options?: SelectOption[]

  severity?: 'light' | 'mild' | 'moderate' | 'severe'
  priority?: number

  context?: 'patient' | 'facility' | 'practitioner' | 'location' | 'encounter' | 'history'
  period?: string

  /**
   * Legacy process-start form id. Read only: `readProject` moves it to the name of the
   * interventions that list the process, then drops it. It is never written.
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

/** Colours a comment can take, as sticky notes. */
export const COMMENT_COLORS = ['yellow', 'blue', 'green', 'pink', 'grey'] as const
export type CommentColor = (typeof COMMENT_COLORS)[number]

/**
 * A comment on the diagram: a note for authors, never part of the guideline. It lives in the
 * activity's `ui` block, which `tricc_oo` ignores, and it may be *about* a node: the canvas
 * draws that as a dashed line, never as an edge, so conversion never sees it.
 */
export interface CanvasComment {
  id: string
  text: string
  color: CommentColor
  x: number
  y: number
  width?: number
  height?: number
  /** The node this comment is about, if any. */
  node?: string
}

/**
 * A group of nodes: a TRICC page group (draw.io `container_page`, `tricc_oo` `TriccGroup`),
 * which exports as a section of the form. `name` is a concept code, so its title comes from
 * the dictionary like any text; `label` is only read from older files and moved there.
 *
 * On the canvas it is a frame. `x`/`y` are relative to the `parent` group when it has one, as
 * the positions of the nodes in a group are relative to it. Layout is frontend-only.
 */
export interface CanvasGroup {
  id: string
  name?: string
  label?: LocalizedText
  parent?: string
  color: CommentColor
  x: number
  y: number
  width: number
  height: number
}

/** Presentation only: how the activity is drawn. No semantics; `tricc_oo` ignores it. */
export interface ActivityUi {
  viewport?: { x: number; y: number; zoom: number }
  comments?: CanvasComment[]
}

export interface Activity {
  id: string
  /** Page groups (sections of the form), in order. Nodes join one through `group`. */
  groups?: CanvasGroup[]
  /** Machine name. `tricc_oo` uses it as the activity name, else the title slug. */
  name?: string
  title?: LocalizedText
  process?: string
  applicability?: Expression
  ui?: ActivityUi
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
  /** Machine name. `tricc_oo` names the intervention's form from it, else from `id`. */
  name?: string
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

/** A FHIR concept designation, kept as written so its use and extensions survive a save. */
export interface Designation {
  language: string
  value: string
  /** FHIR `designation.use`. Absent means display. See `terminology/designation.ts`. */
  use?: { system?: string; code?: string }
  /** FHIR extensions as written, e.g. an intervention scope. */
  extension?: unknown[]
}

export interface Concept {
  system: string
  code: string
  display?: string
  definition?: string
  /** In file order. Several may share a language when their uses differ. */
  designations: Designation[]
  /** Keys of the FHIR concept that TRICC does not model (e.g. `id`), written back unchanged. */
  extra?: Record<string, unknown>
  /** Property codes read as `valueString` rather than `valueCode`, so a save writes them back the same way. */
  stringProperties?: string[]
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
  /**
   * Where the file lives when it is not `terminology/<id>.codesystem.json`, e.g. a
   * `tricc_oo` export listed in `tricc.yaml`. Saving writes it back there.
   */
  path?: string
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
