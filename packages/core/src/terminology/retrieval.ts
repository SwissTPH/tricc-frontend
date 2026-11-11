import type {
  Activity,
  Concept,
  Project,
  Retrieval,
  RetrievalContext,
  TriccNode,
} from '../model/types.js'
import type { DataType } from '../format/schema/concept.js'

/**
 * The retrieval dictionary: data that exists before the consultation, defined once per
 * project and referenced in expressions as `"#code"` (feature/20261109-project-retrievals.md).
 */

export const RETRIEVAL_CONTEXTS: readonly RetrievalContext[] = [
  'patient',
  'facility',
  'practitioner',
  'location',
  'encounter',
  'history',
  'custom',
]

export const RETRIEVAL_CONTEXT_LABELS: Record<RetrievalContext, string> = {
  patient: 'Patient',
  facility: 'Facility',
  practitioner: 'Practitioner',
  location: 'Location',
  encounter: 'Encounter',
  history: 'History',
  custom: 'Custom',
}

export interface RetrievalFunction {
  code: string
  label: string
  contexts: readonly RetrievalContext[]
  /** Reads a concept (`reads`). */
  needsSource: boolean
  /** Takes a period. */
  usesPeriod: boolean
  /** The value type, or `source` for the type of the concept read. */
  valueType: DataType | 'source'
}

const fn = (
  code: string,
  label: string,
  contexts: readonly RetrievalContext[],
  needsSource: boolean,
  usesPeriod: boolean,
  valueType: DataType | 'source',
): RetrievalFunction => ({ code, label, contexts, needsSource, usesPeriod, valueType })

const PATIENT = ['patient'] as const
const TIMED = ['encounter', 'history'] as const

/** The function catalogue, shared by the editor, validation and tricc_oo (§2). */
export const RETRIEVAL_FUNCTIONS: readonly RetrievalFunction[] = [
  fn('PatientValue', 'Patient value (concept)', PATIENT, true, false, 'source'),
  fn('AgeInDays', 'Age in days', PATIENT, false, false, 'integer'),
  fn('AgeInWeeks', 'Age in weeks', PATIENT, false, false, 'integer'),
  fn('AgeInMonths', 'Age in months', PATIENT, false, false, 'integer'),
  fn('AgeInYears', 'Age in years', PATIENT, false, false, 'integer'),
  fn('DateOfBirth', 'Date of birth', PATIENT, false, false, 'date'),
  fn('Sex', 'Sex', PATIENT, false, false, 'coded'),
  fn('DeceasedDateTime', 'Date of death', PATIENT, false, false, 'dateTime'),
  fn('FullName', 'Full name', PATIENT, false, false, 'string'),
  fn('FirstName', 'First name', PATIENT, false, false, 'string'),
  fn('MiddleName', 'Middle name', PATIENT, false, false, 'string'),
  fn('LastName', 'Last name', PATIENT, false, false, 'string'),
  fn('Telecom', 'Phone', PATIENT, false, false, 'string'),
  fn('Photo', 'Photo', PATIENT, false, false, 'string'),
  fn('FacilityValue', 'Facility value (concept)', ['facility'], true, false, 'source'),
  fn('PractitionerValue', 'Practitioner value (concept)', ['practitioner'], true, false, 'source'),
  fn('LocationValue', 'Location value (concept)', ['location'], true, false, 'source'),
  fn('Latest', 'Latest value', TIMED, true, true, 'source'),
  fn('Exists', 'Was recorded', TIMED, true, true, 'boolean'),
  fn('Count', 'Number of records', TIMED, true, true, 'integer'),
]

const DEFAULT_FUNCTION: Partial<Record<RetrievalContext, string>> = {
  patient: 'PatientValue',
  facility: 'FacilityValue',
  practitioner: 'PractitionerValue',
  location: 'LocationValue',
  encounter: 'Latest',
  history: 'Latest',
}

export function retrievalFunction(code: string | undefined): RetrievalFunction | undefined {
  return RETRIEVAL_FUNCTIONS.find((f) => f.code === code)
}

export function functionsFor(context: RetrievalContext): RetrievalFunction[] {
  return RETRIEVAL_FUNCTIONS.filter((f) => f.contexts.includes(context))
}

/** The function a retrieval runs: its own, else the context's default. `custom` has none. */
export function effectiveFunction(r: Retrieval): RetrievalFunction | undefined {
  return retrievalFunction(r.function ?? DEFAULT_FUNCTION[r.context])
}

/** A period applies to these contexts; elsewhere it is ignored. */
export function contextUsesPeriod(context: RetrievalContext | undefined): boolean {
  return context === 'encounter' || context === 'history' || context === 'custom'
}

/** Expression languages of a custom retrieval (FHIR `Expression.language`). */
export const RETRIEVAL_LANGUAGES = [
  { code: 'text/cql', label: 'CQL' },
  { code: 'text/x-xlsform', label: 'XLSForm' },
] as const

const ISO_PERIOD = /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?$/

/** An ISO-8601 duration such as `P30D`, `P6M` or `PT12H`. */
export function isIsoPeriod(value: string): boolean {
  return ISO_PERIOD.test(value)
}

// --- codes and references ------------------------------------------------

/** A retrieval code: `#` and a lowercase name. */
export const RETRIEVAL_CODE = /^#[a-z][a-z0-9_]*$/

export function isRetrievalCode(code: string): boolean {
  return code.startsWith('#')
}

/** The retrieval code for a node or concept name: `#` and the name in lower snake case. */
export function retrievalCodeFor(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `#${/^[a-z]/.test(base) ? base : `r_${base}`}`
}

const REF = /"(#[^"\s]+)"/g

/** The `"#code"` references in an expression, in order, without duplicates. */
export function retrievalRefs(text: string | undefined): string[] {
  if (!text) return []
  return [...new Set([...text.matchAll(REF)].map((m) => m[1]!))]
}

/** Where an expression of the project is. */
export interface ExpressionSite {
  activityId?: string
  nodeId?: string
  edgeId?: string
  interventionId?: string
  field: string
  text: string
}

/** Every expression of a node, with the field it is in. */
export function nodeExpressions(node: TriccNode): [string, string][] {
  const out: [string, string][] = []
  const add = (field: string, text: string | undefined) => {
    if (text) out.push([field, text])
  }
  add('relevance', node.relevance?.expression)
  add('calculate', node.calculate?.expression)
  add('expression', node.expression?.expression)
  add('constraint', node.constraint?.expression)
  add('default', node.default)
  add('condition', node.condition)
  if (typeof node.reference === 'string') add('reference', node.reference)
  else if (node.reference && 'expression' in node.reference)
    add('reference', node.reference.expression)
  for (const [name, value] of Object.entries(node.args ?? {})) {
    if (typeof value === 'string') add(`args.${name}`, value)
  }
  for (const option of node.options ?? []) add(`options.${option.id}`, option.relevance?.expression)
  return out
}

/** Every expression of an activity: its applicability, its nodes, its edges. */
export function activityExpressions(activity: Activity): ExpressionSite[] {
  const out: ExpressionSite[] = []
  const activityId = activity.id
  if (activity.applicability?.expression)
    out.push({ activityId, field: 'applicability', text: activity.applicability.expression })
  for (const nodeId of activity.nodeOrder) {
    const node = activity.nodes[nodeId]
    if (!node) continue
    for (const [field, text] of nodeExpressions(node)) out.push({ activityId, nodeId, field, text })
  }
  for (const edge of Object.values(activity.edges)) {
    if (edge.value) out.push({ activityId, edgeId: edge.id, field: 'value', text: edge.value })
  }
  return out
}

/** Every expression of the project, activities first, then intervention conditions. */
export function projectExpressions(project: Project): ExpressionSite[] {
  const out: ExpressionSite[] = []
  for (const id of Object.keys(project.activities).sort())
    out.push(...activityExpressions(project.activities[id]!))
  for (const iv of project.interventions) {
    if (iv.applicability?.expression)
      out.push({ interventionId: iv.id, field: 'applicability', text: iv.applicability.expression })
  }
  return out
}

/** Where a retrieval is used. */
export function retrievalUsage(project: Project, code: string): ExpressionSite[] {
  return projectExpressions(project).filter((site) => retrievalRefs(site.text).includes(code))
}

/**
 * The retrievals an intervention's forms load: those referenced from its condition, its
 * activities, and the blocks and activities they reach (Use block, Go to).
 */
export function retrievalsForIntervention(project: Project, interventionId: string): string[] {
  const iv = project.interventions.find((i) => i.id === interventionId)
  if (!iv) return []
  const codes = new Set(retrievalRefs(iv.applicability?.expression))
  const seen = new Set<string>()
  const queue = iv.activities.map((r) => r.ref)
  while (queue.length > 0) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    const activity = project.activities[id]
    if (!activity) continue
    for (const site of activityExpressions(activity))
      for (const code of retrievalRefs(site.text)) codes.add(code)
    for (const node of Object.values(activity.nodes)) {
      if ((node.type === 'block' || node.type === 'goto') && node.link) queue.push(node.link)
    }
  }
  return [...codes].sort()
}
