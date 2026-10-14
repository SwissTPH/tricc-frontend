import type { Project } from '../model/types.js'
import { activityKind, processOf } from '../model/activity-kind.js'
import { resolve } from '../format/schema/localized.js'
import { NODE_TYPE_SPECS } from '../format/schema/node-spec.js'
import { ConceptIndex, type ConceptMatch } from './index-search.js'
import { lookupConcept, nodeConceptKey } from './usage.js'
import { projectDictionaries } from './dictionaries.js'

/**
 * Search the whole project: dictionary concepts, processes, activities and nodes
 * (feature/20261014-project-search-and-dictionaries.md §1). Matching ignores case.
 */
export interface ProjectSearchResult {
  /** Concepts, best match first, each with the id of its dictionary. */
  concepts: (ConceptMatch & { dictionary: string })[]
  processes: { activityId: string; title: string; process?: string }[]
  activities: { activityId: string; title: string }[]
  /** Nodes by activity, then node order. `text` is what matched: label, name or concept display. */
  nodes: { activityId: string; activityTitle: string; nodeId: string; type: string; text: string }[]
}

export function searchProject(project: Project, query: string, opts: { limit?: number } = {}): ProjectSearchResult {
  const q = query.trim().toLowerCase()
  const limit = opts.limit ?? 200
  const empty: ProjectSearchResult = { concepts: [], processes: [], activities: [], nodes: [] }
  if (!q) return empty
  const lang = project.languages.default
  const has = (value: string | undefined) => Boolean(value && value.toLowerCase().includes(q))

  const dictionaryOf = new Map(projectDictionaries(project).map((d) => [d.url, d.id]))
  const concepts = ConceptIndex.fromProject(project)
    .search(q, { limit })
    .map((m) => ({ ...m, dictionary: dictionaryOf.get(m.concept.system) ?? m.concept.system }))

  const out: ProjectSearchResult = { ...empty, concepts }
  for (const activityId of Object.keys(project.activities).sort()) {
    const activity = project.activities[activityId]!
    const title = resolve(activity.title, lang, lang) ?? activityId
    if (activityKind(activity) === 'process') {
      const process = processOf(activity)
      if (has(title) || has(activityId) || has(process)) {
        out.processes.push({ activityId, title, ...(process ? { process } : {}) })
      }
    } else if (has(title) || has(activityId)) {
      out.activities.push({ activityId, title })
    }
    for (const nodeId of activity.nodeOrder) {
      if (out.nodes.length >= limit) break
      const node = activity.nodes[nodeId]
      if (!node) continue
      const label = resolve(node.label, lang, lang)
      const display = lookupConcept(project, nodeConceptKey(project, node))?.display
      const text = [label, display, node.name].find(has)
      if (!text) continue
      out.nodes.push({
        activityId,
        activityTitle: title,
        nodeId,
        type: NODE_TYPE_SPECS[node.type]?.label ?? node.type,
        text: text === node.name ? (display ?? label ?? text) : text,
      })
    }
  }
  return out
}
