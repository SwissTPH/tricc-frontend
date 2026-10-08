import { resolve, type Project, type TriccNode } from '@tricc/core'
import { presentCql } from './present.js'

/**
 * A quoted CQL name resolved to something an author can read.
 *
 * The file keeps the code. The chip shows `label` when it differs from `code`.
 */
export interface ExpressionName {
  code: string
  label: string
  source: 'concept' | 'question'
  system?: string
  definition?: string
  activityId?: string
  activityTitle?: string
  nodeId?: string
}

/** Names a fragment can refer to, preferring the activity that is open. */
export function expressionNames(
  project: Project,
  lang: string,
  preferActivityId?: string,
): Map<string, ExpressionName> {
  const map = new Map<string, ExpressionName>()
  const activities = Object.values(project.activities)
  const ordered = [
    ...activities.filter((activity) => activity.id !== preferActivityId),
    ...activities.filter((activity) => activity.id === preferActivityId),
  ]

  for (const activity of ordered) {
    const activityTitle = resolve(activity.title, lang, lang) ?? activity.id
    for (const nodeId of activity.nodeOrder) {
      const node = activity.nodes[nodeId]
      if (!node) continue
      const info = nameForNode(node, project, lang, activity.id, activityTitle)
      if (!info) continue
      for (const code of nameKeys(node)) put(map, code, { ...info, code })
    }
  }

  for (const system of Object.values(project.codeSystems)) {
    for (const concept of Object.values(system.concepts)) {
      const label = concept.designations?.[lang] || concept.display
      if (!label) continue
      const existing = map.get(concept.code)
      map.set(concept.code, {
        code: concept.code,
        label,
        source: 'concept',
        system: system.title || system.name || concept.system,
        definition: concept.definition,
        activityId: existing?.activityId,
        activityTitle: existing?.activityTitle,
        nodeId: existing?.nodeId,
      })
    }
  }

  return map
}

/** The fragment with quoted names shown as labels. The source string is not changed. */
export function renderCqlLabels(source: string, names: Map<string, ExpressionName>): string {
  const { tokens } = presentCql(source)
  return tokens
    .map((token) => {
      if (token.kind !== 'name' || !token.label) return token.text
      const info = names.get(token.label)
      if (!info || info.label === info.code) return token.label
      return truncateLabel(info.label)
    })
    .join('')
}

export function truncateLabel(label: string, max = 50): string {
  if (label.length <= max) return label
  return `${label.slice(0, max - 1)}…`
}

function nameForNode(
  node: TriccNode,
  project: Project,
  lang: string,
  activityId: string,
  activityTitle: string,
): Omit<ExpressionName, 'code'> | undefined {
  if (nameKeys(node).length === 0) return undefined
  const concept = node.concept
    ? project.codeSystems[node.concept.system]?.concepts[node.concept.code]
    : undefined
  const fromConcept = concept?.designations?.[lang] || concept?.display
  const fromNode = resolve(node.label, lang, lang)
  return {
    label: fromConcept || fromNode || '',
    source: fromConcept ? 'concept' : 'question',
    system: node.concept?.system,
    definition: concept?.definition,
    activityId,
    activityTitle,
    nodeId: node.id,
  }
}

function nameKeys(node: TriccNode): string[] {
  const keys = [node.name, node.filter, node.concept?.code].filter((key): key is string => !!key)
  return [...new Set(keys)]
}

function put(map: Map<string, ExpressionName>, code: string, next: ExpressionName): void {
  const label = next.label || code
  const stored = { ...next, label }
  const previous = map.get(code)
  if (!previous) {
    map.set(code, stored)
    return
  }
  const nextNamed = label !== code
  const previousNamed = previous.label !== code
  if (nextNamed || !previousNamed) map.set(code, stored)
}
