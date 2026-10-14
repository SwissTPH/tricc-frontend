import type {
  Activity,
  CodeSystem,
  Concept,
  Intervention,
  Project,
  TriccEdge,
  TriccNode,
  Designation,
  CanvasGroup,
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
import { toExpression, fromExpression, type Expression } from './schema/expression.js'
import { liftRootAttributes, rootNode } from '../model/activity-kind.js'
import { NODE_FIELDS, type CustomField, type FieldKind, type NodeField } from './node-fields.js'

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

/** The YAML side of the fields NODE_FIELDS marks `custom`. Typed by it, so none is forgotten. */
const YAML_CUSTOM: {
  [F in CustomField]: {
    decode(raw: NodeInput, n: TriccNode, lang: string): void
    encode(n: TriccNode, lang: string): unknown
  }
} = {
  options: {
    decode(raw, n, lang) {
      if (!raw.options) return
      n.options = raw.options.map((o) => {
        const out: NonNullable<TriccNode['options']>[number] = { id: o.id }
        if (o.name !== undefined) out.name = o.name
        const ol = loc(o.label, lang)
        if (ol) out.label = ol
        if (o.concept) out.concept = { ...o.concept }
        const orel = expr(o.relevance, lang)
        if (orel) out.relevance = orel
        if (o.is_none) out.is_none = true
        return out
      })
    },
    encode: (n, lang) =>
      n.options?.map((op) => {
        const oo: Record<string, unknown> = {}
        put(oo, 'id', op.id)
        put(oo, 'name', op.name)
        put(oo, 'label', op.label && fromLocalized(op.label, lang))
        put(oo, 'concept', op.concept && { system: op.concept.system, code: op.concept.code })
        put(oo, 'relevance', op.relevance && fromExpression(op.relevance, lang))
        put(oo, 'is_none', op.is_none || undefined)
        return oo
      }),
  },
  notAvailable: {
    decode(raw, n, lang) {
      if (!raw.notAvailable) return
      const na: NonNullable<TriccNode['notAvailable']> = {}
      if (raw.notAvailable.name !== undefined) na.name = raw.notAvailable.name
      const nl = loc(raw.notAvailable.label, lang)
      if (nl) na.label = nl
      if (raw.notAvailable.concept) na.concept = { ...raw.notAvailable.concept }
      n.notAvailable = na
    },
    encode(n, lang) {
      if (!n.notAvailable) return undefined
      const na: Record<string, unknown> = {}
      put(na, 'name', n.notAvailable.name)
      put(na, 'label', n.notAvailable.label && fromLocalized(n.notAvailable.label, lang))
      put(na, 'concept', n.notAvailable.concept && { ...n.notAvailable.concept })
      return na
    },
  },
  ui: {
    decode(raw, n) {
      if (raw.ui) n.ui = { ...raw.ui }
    },
    encode(n) {
      if (!n.ui) return undefined
      const u: Record<string, unknown> = {}
      put(u, 'x', n.ui.x)
      put(u, 'y', n.ui.y)
      put(u, 'width', n.ui.width)
      put(u, 'height', n.ui.height)
      put(u, 'color', n.ui.color)
      put(u, 'collapsed', n.ui.collapsed)
      return u
    },
  },
  form_id: {
    // Legacy, process start only; `formId` is the old spelling. Never written.
    decode(raw, n) {
      if (raw.type !== 'start') return
      const formId = raw.form_id ?? raw.formId
      if (formId !== undefined) n.form_id = formId
    },
    encode: () => undefined,
  },
}

export function decodeNode(raw: NodeInput, lang: string): TriccNode {
  const n: TriccNode = { id: raw.id, type: raw.type }
  const from = raw as unknown as Record<string, unknown>
  const to = n as unknown as Record<string, unknown>
  for (const [field, kind] of Object.entries(NODE_FIELDS) as [NodeField, FieldKind][]) {
    const value = from[field]
    switch (kind) {
      case 'scalar':
        if (value !== undefined) to[field] = value
        break
      case 'localized': {
        const text = loc(value, lang)
        if (text) to[field] = text
        break
      }
      case 'expression': {
        const e = expr(value, lang)
        if (e) to[field] = e
        break
      }
      case 'json':
        if (value) to[field] = structuredClone(value)
        break
      case 'custom':
        YAML_CUSTOM[field as CustomField].decode(raw, n, lang)
        break
    }
  }
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
  if (raw.name !== undefined) a.name = raw.name
  const title = loc(raw.title, lang)
  if (title) a.title = title
  if (raw.process !== undefined) a.process = raw.process
  const app = expr(raw.applicability, lang) ?? {}
  const intent = loc(raw.intent, lang)
  if (intent) app.intent = { ...app.intent, ...intent }
  if (app.intent || app.expression) a.applicability = app
  if (raw.form_id) {
    const start = nodeOrder.map((id) => nodes[id]).find((n) => n?.type === 'start')
    if (start && start.form_id === undefined) start.form_id = raw.form_id
  }
  liftRootAttributes(a)
  if (raw.ui) a.ui = structuredClone(raw.ui)
  if (raw.groups?.length) {
    a.groups = raw.groups.map((g) => {
      const group: CanvasGroup = {
        id: g.id,
        color: g.ui?.color ?? 'grey',
        x: g.ui?.x ?? 0,
        y: g.ui?.y ?? 0,
        width: g.ui?.width ?? 320,
        height: g.ui?.height ?? 220,
      }
      if (g.name !== undefined) group.name = g.name
      const label = loc(g.label, lang)
      if (label) group.label = label
      if (g.parent !== undefined) group.parent = g.parent
      return group
    })
  }
  return a
}

function decodeIntervention(raw: InterventionInput, lang: string): Intervention {
  const i: Intervention = {
    id: raw.id,
    activities: raw.activities.map((r) => ({ ref: refOf(r) })),
  }
  const name = raw.name ?? raw.code
  if (name !== undefined) i.name = name
  const t = loc(raw.title, lang)
  if (t) i.title = t
  const d = loc(raw.description, lang)
  if (d) i.description = d
  const app = expr(raw.applicability, lang)
  if (app) i.applicability = app
  if (raw.trigger) i.trigger = { ...raw.trigger }
  return i
}

const CONCEPT_KEYS = new Set(['code', 'display', 'definition', 'designation', 'property'])
/** TRICC properties written as `valueCode` unless the file had `valueString`. */
const CODE_PROPERTIES = new Set(['dataType', 'conceptType', 'targetResource'])

export function decodeCodeSystem(input: unknown): CodeSystem {
  const raw: CodeSystemInput = codeSystemSchema.parse(input)
  const concepts: Record<string, Concept> = {}
  const conceptOrder: string[] = []
  for (const c of raw.concept) {
    const designations: Designation[] = (c.designation ?? []).map((d) => {
      const out: Designation = { language: d.language, value: d.value }
      if (d.use) out.use = { ...d.use }
      if (d.extension) out.extension = structuredClone(d.extension)
      return out
    })
    const concept: Concept = { system: raw.url, code: c.code, designations }
    const extra = Object.fromEntries(
      Object.entries(c).filter(([key]) => !CONCEPT_KEYS.has(key)),
    )
    if (Object.keys(extra).length > 0) concept.extra = structuredClone(extra)
    const asString = (c.property ?? [])
      .filter((p) => p.valueString !== undefined && CODE_PROPERTIES.has(p.code))
      .map((p) => p.code)
    if (asString.length > 0) concept.stringProperties = asString
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
  if (raw.terminology.calculate !== undefined) p.calculateCodeSystem = raw.terminology.calculate
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
  const from = n as unknown as Record<string, unknown>
  for (const [field, kind] of Object.entries(NODE_FIELDS) as [NodeField, FieldKind][]) {
    const value = from[field]
    switch (kind) {
      case 'key':
      case 'scalar':
        put(o, field, value)
        break
      case 'localized':
        put(o, field, value ? fromLocalized(value as LocalizedText, lang) : undefined)
        break
      case 'expression':
        put(o, field, value ? fromExpression(value as Expression, lang) : undefined)
        break
      case 'json':
        put(o, field, value ? structuredClone(value) : undefined)
        break
      case 'custom':
        put(o, field, YAML_CUSTOM[field as CustomField].encode(n, lang))
        break
    }
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

const ROOT_KEYS = ['label', 'name', 'process', 'relevance'] as const

export function encodeActivity(
  a: Activity,
  lang: string,
  formatVersion: string,
): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  put(o, 'formatVersion', formatVersion)
  put(o, 'id', a.id)
  put(o, 'name', a.name)
  put(o, 'title', a.title && fromLocalized(a.title, lang))
  put(o, 'process', a.process)
  // tricc_oo reads `applicability` as a CQL string, so the intent is its own key.
  if (a.applicability?.expression) put(o, 'applicability', a.applicability.expression)
  const intent = a.applicability?.intent
  if (intent && Object.keys(intent).length > 0) put(o, 'intent', fromLocalized(intent, lang))
  if (a.ui) {
    const ui: Record<string, unknown> = {}
    if (a.ui.viewport) ui['viewport'] = { ...a.ui.viewport }
    if (a.ui.comments?.length) ui['comments'] = a.ui.comments.map((c) => ({ ...c }))
    if (Object.keys(ui).length) put(o, 'ui', ui)
  }
  if (a.groups?.length) {
    o['groups'] = a.groups.map((g) => {
      const go: Record<string, unknown> = { id: g.id }
      put(go, 'name', g.name)
      put(go, 'label', g.label && fromLocalized(g.label, lang))
      put(go, 'parent', g.parent)
      go['ui'] = { x: g.x, y: g.y, width: g.width, height: g.height, color: g.color }
      return go
    })
  }
  // The start node is the activity: what it would carry is written above, at activity level.
  const rootId = rootNode(a)?.id
  o['nodes'] = a.nodeOrder
    .filter((id) => a.nodes[id])
    .map((id) => {
      const encoded = encodeNode(a.nodes[id] as TriccNode, lang)
      if (id === rootId) for (const key of ROOT_KEYS) delete encoded[key]
      return encoded
    })
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
      put(io, 'name', i.name)
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
  put(term, 'calculate', p.calculateCodeSystem)
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
  put(o, 'description', cs.description)
  put(o, 'content', cs.content)
  put(o, 'caseSensitive', cs.caseSensitive)
  o['concept'] = cs.conceptOrder
    .filter((code) => cs.concepts[code])
    .map((code) => {
      const c = cs.concepts[code] as Concept
      // FHIR keys TRICC does not model come first, as tricc_oo writes `id` before `code`.
      const co: Record<string, unknown> = { ...structuredClone(c.extra ?? {}) }
      put(co, 'code', c.code)
      put(co, 'display', c.display)
      put(co, 'definition', c.definition)
      const desig = c.designations.map((d) => {
        const out: Record<string, unknown> = { language: d.language }
        if (d.use) out['use'] = { ...d.use }
        out['value'] = d.value
        if (d.extension) out['extension'] = structuredClone(d.extension)
        return out
      })
      put(co, 'designation', desig)
      const props: Record<string, unknown>[] = []
      const codeProp = (k: string, v: string | undefined) => {
        if (v === undefined) return
        props.push(c.stringProperties?.includes(k) ? { code: k, valueString: v } : { code: k, valueCode: v })
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
