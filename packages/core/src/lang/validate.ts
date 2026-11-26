/**
 * Project validation with the shared parser (feature/20261125-expression-languages.md §1.6).
 * Passed to `validateProject(project, { lang })` once `@tricc/core/lang` is loaded.
 */
import type { Project, TriccNode } from '../model/types.js'
import { issue, type Issue } from '../validate/types.js'
import { parseCql } from './cql.js'

const FIELDS = ['relevance', 'calculate', 'expression', 'constraint'] as const

/** The CQL text of every expression field of a node. */
export function nodeExpressions(node: TriccNode): [string, string][] {
  const out: [string, string][] = []
  for (const field of FIELDS) {
    const text = node[field]?.expression
    if (typeof text === 'string' && text.trim() !== '') out.push([field, text])
  }
  return out
}

/** `expression.cql`: every expression field must parse with the TRICC profile. */
export function validateExpressions(project: Project): Issue[] {
  const issues: Issue[] = []
  for (const activityId of Object.keys(project.activities).sort()) {
    const activity = project.activities[activityId]
    if (!activity) continue
    for (const node of Object.values(activity.nodes)) {
      for (const [field, text] of nodeExpressions(node)) {
        const { errors } = parseCql(text)
        const first = errors[0]
        if (!first) continue
        const where = text.includes('\n')
          ? `line ${first.line}, column ${first.column + 1}`
          : `column ${first.column + 1}`
        issues.push(
          issue('expression.cql', 'error', `${first.message} (${where})`, {
            activityId,
            nodeId: node.id,
            field,
          }),
        )
      }
    }
  }
  return issues
}
