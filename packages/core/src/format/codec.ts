import type {
  Activity,
  CodeSystem,
  Concept,
  Intervention,
  Project,
  TriccEdge,
  TriccNode,
} from '../model/types.js'
import {
  activitySchema,
  type ActivityInput,
  type NodeInput,
  type EdgeInput,
} from './schema/activity.js'
import {
  projectSchema,
  refOf,
  type ProjectInput,
  type InterventionInput,
} from './schema/project.js'
import { codeSystemSchema, readProperty, type CodeSystemInput } from './schema/codesystem.js'
import { toLocalized, fromLocalized, sortKeys, type LocalizedText } from './schema/localized.js'
import { toExpression, fromExpression } from './schema/expression.js'

/**
 * Serialized form ⇄ normalized model.
 *
 * This is the single place that knows about the format's shorthands (bare-string
 * localized text, bare-string expressions, bare-string activity refs). Everything
 * upstream sees the normalized shape only.
 */

// ---------------------------------------------------------------- decode

function loc(v: unknown, lang: string): LocalizedText | undefined {
  if (v === undefined) return undefined
  return toLocalized(v as never, lang)
}

function expr(v: unknown, lang: string) {
  if (v === undefined) return undefined
  return toExpression(v as never, lang)
}

export function decodeNode(raw: NodeInput, lang: string): TriccNode {
  const n: TriccNode = { id: raw.id, type: raw.type }
  if (raw.name !== undefined) n.name = raw.name
  const label = loc(raw.label, lang)
  if (label) n.label = label
  const hint = loc(raw.hint, lang)
  if (hint) n.hint = hint
  const help = loc(raw.help, lang)
  if (help) n.help = help
  if (raw.concept) n.concept = { ...raw.concept }

  const rel = expr(raw.relevance, lang)
  if (rel) n.relevance = rel
  const calc = expr(raw.calculate, lang)
  if (calc) n.calculate = calc
  const ex = expr(raw.expression, lang)
  if (ex) n.expression = ex
  const con = expr(raw.constraint, lang)
  if (con) n.constraint = con
  const cm = loc(raw.constraintMessage, lang)
  if (cm) n.constraintMessage = cm

  if (raw.required !== undefined) n.required = raw.required
  if (raw.default !== undefined) n.default = raw.default
  if (raw.min !== undefined) n.min = raw.min
  if (raw.max !== undefined) n.max = raw.max
  if (raw.unit !== undefined) n.unit = raw.unit
  if (raw.unit_system !== undefined) n.unit_system = raw.unit_system
  if (raw.unit_code !== undefined) n.unit_code = raw.unit_code
  if (raw.repeat !== undefined) n.repeat = raw.repeat
  if (raw.instance !== undefined) n.instance = raw.instance
  if (raw.reference !== undefined) n.reference = raw.reference as TriccNode['reference']
  if (raw.link !== undefined) n.link = raw.link
  if (raw.listName !== undefined) n.listName = raw.listName
  if (raw.filter !== undefined) n.filter = raw.filter

  if (raw.options) {
    n.options = raw.options.map((o) => {
      const out: NonNullable<TriccNode['options']>[number] = { id: o.id }
      if (o.name !== undefined) out.name = o.name
      const ol = loc(o.label, lang)
      if (ol) out.label = ol
      if (o.concept) out.concept = { ...o.concept }
      const orel = expr(o.relevance, lang)
      if (orel) out.relevance = orel
      return out
    })
  }

  if (raw.severity !== undefined) n.severity = raw.severity
  if (raw.priority !== undefined) n.priority = raw.priority
  if (raw.context !== undefined) n.context = raw.context
  if (raw.period !== undefined) n.period = raw.period
  if (raw.type === 'start') {
    const formId = raw.form_id ?? raw.formId
    if (formId !== undefined) n.form_id = formId
  }
  if (raw.process !== undefined) n.process = raw.process
  if (raw.intervention !== undefined) n.intervention = raw.intervention
  if (raw.condition !== undefined) n.condition = raw.condition
  if (raw.delay !== undefined) n.delay = raw.delay
  if (raw.media) n.media = { ...raw.media }
  if (raw.notAvailable) {
    const na: NonNullable<TriccNode['notAvailable']> = {}
    if (raw.notAvailable.name !== undefined) na.name = raw.notAvailable.name
    const nl = loc(raw.notAvailable.label, lang)
    if (nl) na.label = nl
    if (raw.notAvailable.concept) na.concept = { ...raw.notAvailable.concept }
    n.notAvailable = na
  }
  if (raw.save !== undefined) n.save = raw.save
  if (raw.ui) n.ui = { ...raw.ui }
  return n
}

export function decodeEdge(raw: EdgeInput): TriccEdge {
  const e: TriccEdge = { id: raw.id, source: raw.source, target: raw.target }
  if (raw.value !== undefined) e.value = raw.value
  if (raw.ui) e.ui = structuredClone(raw.ui)
  return e
}

export function decodeActivity(input: unknown, lang: string): Activity {
  const raw: ActivityInput = activitySchema.parse(input)
  const nodes: Record<string, TriccNode> = {}
  const nodeOrder: string[] = []
  for (const rn of raw.nodes) {
    nodes[rn.id] = decodeNode(rn, lang)
    nodeOrder.push(rn.id)
  }
  const edges: Record<string, TriccEdge> = {}
  const edgeOrder: string[] = []
  for (const re of raw.edges) {
    edges[re.id] = decodeEdge(re)
    edgeOrder.push(re.id)
  }
  const a: Activity = { id: raw.id, nodes, edges, nodeOrder, edgeOrder }
  const title = loc(raw.title, lang)
  if (title) a.title = title
  if (raw.process !== undefined) a.process = raw.process
  const app = expr(raw.applicability, lang)
  if (app) a.applicability = app
  if (raw.ui) a.ui = structuredClone(raw.ui)
  return a
}

function decodeIntervention(raw: InterventionInput, lang: string): Intervention {
  const i: Intervention = {
    id: raw.id,
    activities: raw.activities.map((r) => ({ ref: refOf(r) })),
  }
  if (raw.code !== undefined) i.code = raw.code
  const t = loc(raw.title, lang)
  if (t) i.title = t
  const d = loc(raw.description, lang)
  if (d) i.description = d
  const app = expr(raw.applicability, lang)
  if (app) i.applicability = app
  if (raw.trigger) i.trigger = { ...raw.trigger }
  return i
}

export function decodeCodeSystem(input: unknown): CodeSystem {
  const raw: CodeSystemInput = codeSystemSchema.parse(input)
  const concepts: Record<string, Concept> = {}
  const conceptOrder: string[] = []
  for (const c of raw.concept) {
    const designations: Record<string, string> = {}
    for (const d of c.designation ?? []) designations[d.language] = d.value
    const concept: Concept = { system: raw.url, code: c.code, designations }
    if (c.display !== undefined) concept.display = c.display
    if (c.definition !== undefined) concept.definition = c.definition
    const dt = readProperty(c, 'dataType')
    if (dt !== undefined) concept.dataType = String(dt)
    const ct = readProperty(c, 'conceptType')
    if (ct !== undefined) concept.conceptType = String(ct)
    const unit = readProperty(c, 'unit')
    if (unit !== undefined) concept.unit = String(unit)
    const src = readProperty(c, 'source')
    if (src !== undefined) concept.source = String(src)
    const sv = readProperty(c, 'sourceVersion')
    if (sv !== undefined) concept.sourceVersion = String(sv)
    const tr = readProperty(c, 'targetResource')
    if (tr !== undefined) concept.targetResource = String(tr)
    const tp = readProperty(c, 'targetPath')
    if (tp !== undefined) concept.targetPath = String(tp)
    concepts[c.code] = concept
    conceptOrder.push(c.code)
  }
  const cs: CodeSystem = {
    id: raw.id,
    url: raw.url,
    status: raw.status,
    content: raw.content,
    concepts,
    conceptOrder,
  }
  if (raw.version !== undefined) cs.version = raw.version
  if (raw.name !== undefined) cs.name = raw.name
  if (raw.title !== undefined) cs.title = raw.title
  if (raw.description !== undefined) cs.description = raw.description
  if (raw.caseSensitive !== undefined) cs.caseSensitive = raw.caseSensitive
  return cs
}

/** Decode `project.json` only. Activities, code systems and libraries are attached separately. */
export function decodeProjectMeta(
  input: unknown,
): Omit<Project, 'activities' | 'codeSystems' | 'libraries'> {
  const raw: ProjectInput = projectSchema.parse(input)
  const lang = raw.languages.default
  const p: Omit<Project, 'activities' | 'codeSystems' | 'libraries'> = {
    formatVersion: raw.formatVersion,
    id: raw.id,
    languages: { default: lang, available: [...raw.languages.available] },
    interventions: raw.interventions.map((i) => decodeIntervention(i, lang)),
    contexts: raw.contexts.map((c) => ({ ...c })),
  }
  if (raw.system !== undefined) p.system = raw.system
  if (raw.code !== undefined) p.code = raw.code
  if (raw.version !== undefined) p.version = raw.version
  const t = loc(raw.title, lang)
  if (t) p.title = t
  const d = loc(raw.description, lang)
  if (d) p.description = d
  if (raw.terminology.default !== undefined) p.defaultCodeSystem = raw.terminology.default
  if (raw.mediaPath !== undefined) p.mediaPath = raw.mediaPath
  return p
}

// ---------------------------------------------------------------- encode

/**
 * Encoding drops `undefined` and empty collections, and emits keys in a fixed order.
 * Determinism is a hard requirement: converged CRDT peers must produce byte-identical
 * files (feature/20260825-document-model.md §7.5).
 */

function put(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value === undefined || value === null) return
  if (Array.isArray(value) && value.length === 0) return
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return
  target[key] = value
}

export function encodeNode(n: TriccNode, lang: string): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  put(o, 'id', n.id)
  put(o, 'type', n.type)
  put(o, 'name', n.name)
  put(o, 'label', n.label && fromLocalized(n.label, lang))
  put(o, 'concept', n.concept && { system: n.concept.system, code: n.concept.code })
  put(o, 'required', n.required)
  put(o, 'min', n.min)
  put(o, 'max', n.max)
  put(o, 'unit', n.unit)
  put(o, 'unit_system', n.unit_system)
  put(o, 'unit_code', n.unit_code)
  put(o, 'default', n.default)
  put(o, 'listName', n.listName)
  put(o, 'filter', n.filter)
  put(
    o,
    'options',
    n.options?.map((op) => {
      const oo: Record<string, unknown> = {}
      put(oo, 'id', op.id)
      put(oo, 'name', op.name)
      put(oo, 'label', op.label && fromLocalized(op.label, lang))
      put(oo, 'concept', op.concept && { system: op.concept.system, code: op.concept.code })
      put(oo, 'relevance', op.relevance && fromExpression(op.relevance, lang))
      return oo
    }),
  )
  put(o, 'relevance', n.relevance && fromExpression(n.relevance, lang))
  put(o, 'calculate', n.calculate && fromExpression(n.calculate, lang))
  put(o, 'expression', n.expression && fromExpression(n.expression, lang))
  put(o, 'constraint', n.constraint && fromExpression(n.constraint, lang))
  put(o, 'constraintMessage', n.constraintMessage && fromLocalized(n.constraintMessage, lang))
  put(o, 'reference', n.reference)
  put(o, 'link', n.link)
  put(o, 'repeat', n.repeat)
  put(o, 'instance', n.instance)
  put(o, 'severity', n.severity)
  put(o, 'priority', n.priority)
  put(o, 'context', n.context)
  put(o, 'period', n.period)
  if (n.type === 'start') put(o, 'form_id', n.form_id)
  put(o, 'process', n.process)
  put(o, 'intervention', n.intervention)
  put(o, 'condition', n.condition)
  put(o, 'delay', n.delay)
  put(o, 'hint', n.hint && fromLocalized(n.hint, lang))
  put(o, 'help', n.help && fromLocalized(n.help, lang))
  put(o, 'media', n.media && { ...n.media })
  if (n.notAvailable) {
    const na: Record<string, unknown> = {}
    put(na, 'name', n.notAvailable.name)
    put(na, 'label', n.notAvailable.label && fromLocalized(n.notAvailable.label, lang))
    put(na, 'concept', n.notAvailable.concept && { ...n.notAvailable.concept })
    put(o, 'notAvailable', na)
  }
  put(o, 'save', n.save)
  if (n.ui) {
    const u: Record<string, unknown> = {}
    put(u, 'x', n.ui.x)
    put(u, 'y', n.ui.y)
    put(u, 'width', n.ui.width)
    put(u, 'height', n.ui.height)
    put(u, 'color', n.ui.color)
    put(u, 'collapsed', n.ui.collapsed)
    put(o, 'ui', u)
  }
  return o
}

export function encodeEdge(e: TriccEdge): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  put(o, 'id', e.id)
  put(o, 'source', e.source)
  put(o, 'target', e.target)
  put(o, 'value', e.value)
  if (e.ui) {
    const u: Record<string, unknown> = {}
    put(
      u,
      'waypoints',
      e.ui.waypoints?.map((w) => ({ x: w.x, y: w.y })),
    )
    put(u, 'labelOffset', e.ui.labelOffset && { ...e.ui.labelOffset })
    put(o, 'ui', u)
  }
  return o
}

export function encodeActivity(
  a: Activity,
  lang: string,
  formatVersion: string,
): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  put(o, 'formatVersion', formatVersion)
  put(o, 'id', a.id)
  put(o, 'title', a.title && fromLocalized(a.title, lang))
  put(o, 'process', a.process)
  put(o, 'applicability', a.applicability && fromExpression(a.applicability, lang))
  if (a.ui) put(o, 'ui', { viewport: { ...a.ui.viewport } })
  o['nodes'] = a.nodeOrder
    .filter((id) => a.nodes[id])
    .map((id) => encodeNode(a.nodes[id] as TriccNode, lang))
  const edges = a.edgeOrder
    .filter((id) => a.edges[id])
    .map((id) => encodeEdge(a.edges[id] as TriccEdge))
  if (edges.length > 0) o['edges'] = edges
  return o
}

export function encodeProjectMeta(p: Project): Record<string, unknown> {
  const lang = p.languages.default
  const o: Record<string, unknown> = {}
  put(o, 'formatVersion', p.formatVersion)
  put(o, 'id', p.id)
  put(o, 'system', p.system)
  put(o, 'code', p.code)
  put(o, 'version', p.version)
  put(o, 'title', p.title && fromLocalized(p.title, lang))
  put(o, 'description', p.description && fromLocalized(p.description, lang))
  o['languages'] = { default: lang, available: [...p.languages.available] }
  put(
    o,
    'interventions',
    p.interventions.map((i) => {
      const io: Record<string, unknown> = {}
      put(io, 'id', i.id)
      put(io, 'code', i.code)
      put(io, 'title', i.title && fromLocalized(i.title, lang))
      put(io, 'description', i.description && fromLocalized(i.description, lang))
      put(io, 'applicability', i.applicability && fromExpression(i.applicability, lang))
      put(io, 'trigger', i.trigger && { ...i.trigger })
      io['activities'] = i.activities.map((r) => r.ref)
      return io
    }),
  )
  put(
    o,
    'contexts',
    p.contexts.map((c) => ({ ...c })),
  )
  const term: Record<string, unknown> = {}
  const csPaths = Object.values(p.codeSystems)
    .map((cs) => `terminology/${cs.id}.codesystem.json`)
    .sort()
  put(term, 'codeSystems', csPaths)
  put(term, 'default', p.defaultCodeSystem)
  put(o, 'terminology', term)
  put(
    o,
    'cqlLibraries',
    Object.keys(p.libraries)
      .sort()
      .map((n) => `cql/${n}.cql`),
  )
  put(o, 'mediaPath', p.mediaPath)
  return o
}

export function encodeCodeSystem(cs: CodeSystem): Record<string, unknown> {
  const o: Record<string, unknown> = { resourceType: 'CodeSystem' }
  put(o, 'id', cs.id)
  put(o, 'url', cs.url)
  put(o, 'version', cs.version)
  put(o, 'name', cs.name)
  put(o, 'title', cs.title)
  put(o, 'status', cs.status)
  put(o, 'content', cs.content)
  put(o, 'caseSensitive', cs.caseSensitive)
  put(o, 'description', cs.description)
  o['concept'] = cs.conceptOrder
    .filter((code) => cs.concepts[code])
    .map((code) => {
      const c = cs.concepts[code] as Concept
      const co: Record<string, unknown> = {}
      put(co, 'code', c.code)
      put(co, 'display', c.display)
      put(co, 'definition', c.definition)
      const desig = Object.keys(c.designations)
        .sort()
        .map((l) => ({ language: l, value: c.designations[l] as string }))
      put(co, 'designation', desig)
      const props: Record<string, unknown>[] = []
      const codeProp = (k: string, v: string | undefined) => {
        if (v !== undefined) props.push({ code: k, valueCode: v })
      }
      const strProp = (k: string, v: string | undefined) => {
        if (v !== undefined) props.push({ code: k, valueString: v })
      }
      codeProp('dataType', c.dataType)
      codeProp('conceptType', c.conceptType)
      strProp('unit', c.unit)
      strProp('source', c.source)
      strProp('sourceVersion', c.sourceVersion)
      codeProp('targetResource', c.targetResource)
      strProp('targetPath', c.targetPath)
      put(co, 'property', props)
      return co
    })
  return o
}

export { refOf, sortKeys }
