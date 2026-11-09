import type {
  CodeSystem,
  Concept,
  Intervention,
  Project,
  Retrieval,
  TriccEdge,
  TriccNode,
} from '../model/types.js'
import type { Expression } from '../format/schema/expression.js'
import { emptyCodeSystem, projectDictionaries } from './dictionaries.js'
import { contextUsesPeriod, retrievalCodeFor } from './retrieval.js'
import { lookupConcept, nodeConceptKey, populateSourceKey } from './usage.js'
import { resolve } from '../format/schema/localized.js'

/**
 * Move a prefilled value (populate node) to the retrieval dictionary
 * (feature/20261109-project-retrievals.md §5). Planned here, applied by
 * `Mutations.moveToRetrieval`.
 */
export interface RetrievalMove {
  /** The retrieval dictionary, when it must be created first. */
  createCodeSystem?: CodeSystem
  system: string
  code: string
  /** The entry to write; absent when an identical one is reused. */
  concept?: Concept
  /** Nodes whose expressions now say `"#code"`, by activity. */
  nodes: { activityId: string; node: TriccNode }[]
  edges: { activityId: string; edge: TriccEdge }[]
  applicability: { activityId: string; expression: Expression }[]
  interventions: Intervention[]
  /** Edges that bridge the removed node: each predecessor to each successor. */
  bridges: TriccEdge[]
}

/** The retrieval a populate node stands for. */
export function retrievalFromNode(project: Project, node: TriccNode): Retrieval {
  const r: Retrieval = { context: node.context ?? 'encounter' }
  const reads = populateSourceKey(project, node)
  if (reads && lookupConcept(project, reads)) r.reads = reads
  if (node.period && contextUsesPeriod(r.context)) r.period = node.period
  return r
}

function sameRetrieval(a: Retrieval | undefined, b: Retrieval): boolean {
  return (
    !!a &&
    a.context === b.context &&
    (a.function ?? '') === (b.function ?? '') &&
    a.reads?.system === b.reads?.system &&
    a.reads?.code === b.reads?.code &&
    (a.period ?? '') === (b.period ?? '')
  )
}

/** `"name"` → `"#code"` in one expression text. */
export function renameReference(text: string, name: string, code: string): string {
  return text.split(`"${name}"`).join(`"${code}"`)
}

function renameExpr(e: Expression | undefined, name: string, code: string): Expression | undefined {
  if (!e?.expression) return e
  const expression = renameReference(e.expression, name, code)
  return expression === e.expression ? e : { ...e, expression }
}

/** The node with its references renamed, or undefined when it has none. */
export function renameInNode(node: TriccNode, name: string, code: string): TriccNode | undefined {
  const r = (t: string | undefined) => (t === undefined ? t : renameReference(t, name, code))
  const next: TriccNode = { ...node }
  for (const field of ['relevance', 'calculate', 'expression', 'constraint'] as const) {
    const e = renameExpr(node[field], name, code)
    if (e) next[field] = e
  }
  if (node.default !== undefined) next.default = r(node.default)!
  if (node.condition !== undefined) next.condition = r(node.condition)!
  if (typeof node.reference === 'string') next.reference = r(node.reference)!
  else if (node.reference && 'expression' in node.reference)
    next.reference = { expression: r(node.reference.expression)! }
  if (node.args) {
    next.args = Object.fromEntries(
      Object.entries(node.args).map(([k, v]) => [k, typeof v === 'string' ? r(v)! : v]),
    )
  }
  if (node.options) {
    next.options = node.options.map((o) => {
      const relevance = renameExpr(o.relevance, name, code)
      return relevance === o.relevance ? o : { ...o, relevance: relevance! }
    })
  }
  return JSON.stringify(next) === JSON.stringify(node) ? undefined : next
}

export function planMoveToRetrieval(
  project: Project,
  activityId: string,
  nodeId: string,
): RetrievalMove {
  const activity = project.activities[activityId]
  const node = activity?.nodes[nodeId]
  if (!activity || !node) throw new Error(`no such node: ${activityId}/${nodeId}`)
  if (node.type !== 'populate') throw new Error(`not a prefilled value: ${nodeId}`)
  if (!node.name) throw new Error('a prefilled value needs a name to be moved')
  const name = node.name

  const dictionary = projectDictionaries(project).find((d) => d.kind === 'retrieve')!
  const cs = dictionary.codeSystem ?? emptyCodeSystem(dictionary)
  const retrieval = retrievalFromNode(project, node)

  // Reuse an entry with the same definition; otherwise the first free code.
  const base = retrievalCodeFor(name)
  let code = base
  let reuse = false
  for (let i = 2; cs.concepts[code]; i++) {
    if (sameRetrieval(cs.concepts[code]!.retrieval, retrieval)) {
      reuse = true
      break
    }
    code = `${base}_${i}`
  }

  const move: RetrievalMove = {
    system: cs.url,
    code,
    nodes: [],
    edges: [],
    applicability: [],
    interventions: [],
    bridges: [],
  }
  if (!dictionary.codeSystem) move.createCodeSystem = cs
  if (!reuse) {
    const lang = project.languages.default
    const label =
      resolve(node.label, lang, lang) ??
      lookupConcept(project, nodeConceptKey(project, node))?.display
    const concept: Concept = { system: cs.url, code, designations: [], retrieval }
    if (label) concept.display = label
    move.concept = concept
  }

  for (const a of Object.values(project.activities)) {
    // Another node with the same name in an activity is what its references mean there.
    const ownNode = Object.values(a.nodes).some(
      (n) => n.name === name && !(a.id === activityId && n.id === nodeId),
    )
    if (ownNode) continue
    for (const id of a.nodeOrder) {
      if (a.id === activityId && id === nodeId) continue
      const n = a.nodes[id]
      const renamed = n && renameInNode(n, name, code)
      if (renamed) move.nodes.push({ activityId: a.id, node: renamed })
    }
    for (const edge of Object.values(a.edges)) {
      if (a.id === activityId && (edge.source === nodeId || edge.target === nodeId)) continue
      if (!edge.value) continue
      const value = renameReference(edge.value, name, code)
      if (value !== edge.value) move.edges.push({ activityId: a.id, edge: { ...edge, value } })
    }
    const app = renameExpr(a.applicability, name, code)
    if (app && app !== a.applicability)
      move.applicability.push({ activityId: a.id, expression: app })
  }
  for (const iv of project.interventions) {
    const app = renameExpr(iv.applicability, name, code)
    if (app && app !== iv.applicability) move.interventions.push({ ...iv, applicability: app })
  }

  const edges = Object.values(activity.edges)
  const incoming = edges.filter((e) => e.target === nodeId)
  const outgoing = edges.filter((e) => e.source === nodeId)
  const exists = (s: string, t: string) => edges.some((e) => e.source === s && e.target === t)
  const taken = new Set(edges.map((e) => e.id))
  for (const inc of incoming) {
    for (const out of outgoing) {
      if (inc.source === out.target || exists(inc.source, out.target)) continue
      let id = `${inc.id}-${out.target}`
      for (let i = 2; taken.has(id); i++) id = `${inc.id}-${out.target}-${i}`
      taken.add(id)
      const bridge: TriccEdge = { id, source: inc.source, target: out.target }
      if (inc.value) bridge.value = renameReference(inc.value, name, code)
      move.bridges.push(bridge)
    }
  }
  return move
}
