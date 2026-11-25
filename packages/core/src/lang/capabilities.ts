/**
 * The project checked against its active capability statements while drawing
 * (feature/20261125-output-capabilities.md §1.5): the same rules as tricc_oo's load-time check,
 * on the shared parser's reading of each expression.
 */
import type { Project, TriccNode } from '../model/types.js'
import { issue, type Issue } from '../validate/types.js'
import { projectStatements } from '../capabilities/project.js'
import {
  statementLabel,
  statementWrites,
  type ResolvedStatement,
} from '../capabilities/statement.js'
import { retrieveCodeSystem } from '../terminology/dictionaries.js'
import { FUNCTIONS, cqlUses, isExpressionArg, type CqlUse } from './cql.js'
import { nodeExpressions } from './validate.js'
import lock from './lang.lock.json' with { type: 'json' }

/** The outputs the editor writes into `tricc.yaml` `output_strategies`. */
export const BUILT_OUTPUTS = ['XLSFormCHTStrategy']

const CATALOGUE = new Set(FUNCTIONS.map((f) => f.name))

/** `MAX` → `Max`, as an author reads it. */
const operatorLabel = (op: string) =>
  op
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')

/** The context a node's expression is written in: `form`, or FHIR's `inline` (FHIRPath). */
const contextOf = (s: ResolvedStatement) => (s.contexts.size === 1 ? [...s.contexts][0]! : 'inline')

interface Use {
  node: TriccNode
  activityId: string
  field: string
  use: CqlUse
}

function uses(project: Project): Use[] {
  const out: Use[] = []
  for (const activityId of Object.keys(project.activities).sort()) {
    const activity = project.activities[activityId]
    if (!activity) continue
    for (const node of Object.values(activity.nodes)) {
      for (const [field, text] of nodeExpressions(node))
        out.push({ node, activityId, field, use: cqlUses(text) })
      for (const value of Object.values(node.args ?? {}))
        if (typeof value === 'string' && isExpressionArg(value))
          out.push({ node, activityId, field: 'args', use: cqlUses(value) })
    }
  }
  return out
}

const nodeName = (node: TriccNode, activityId: string) =>
  `'${node.name ?? node.id}' (${activityId})`

/** `output.unsupported`, `output.limit`, `output.no-statement` and the statements' own issues. */
export function checkCapabilities(project: Project): Issue[] {
  const { active, issues } = projectStatements(project, lock.version)
  if (active.length === 0) return issues
  const covered = new Set(active.map((s) => s.strategy))
  for (const output of BUILT_OUTPUTS)
    if (!covered.has(output))
      issues.push(
        issue(
          'output.no-statement',
          'info',
          `${output} has no active capability statement: it is built unchecked.`,
          { field: 'capabilities' },
        ),
      )
  const all = uses(project)
  const retrievals = retrieveCodeSystem(project)
  for (const statement of active) {
    const label = statementLabel(statement)
    const context = contextOf(statement)
    const seen = new Set<string>()
    const report = (key: string, message: string, location: Issue['location']) => {
      if (seen.has(key)) return
      seen.add(key)
      issues.push(issue('output.unsupported', 'error', message, location))
    }
    for (const { node, activityId, field, use } of all) {
      const at = { activityId, nodeId: node.id, field }
      const who = nodeName(node, activityId)
      for (const op of use.operators) {
        if (op === 'NATIVE' || statementWrites(statement, op, context)) continue
        const where = statement.contexts.size > 1 ? ` ${context}` : ''
        report(
          `${node.id}:${op}`,
          `${who} uses ${operatorLabel(op)}, which the ${statement.strategy} output cannot write${where} (${label}).`,
          at,
        )
      }
      for (const fn of use.functions) {
        if (!CATALOGUE.has(fn) || statement.functions.has(fn)) continue
        report(
          `${node.id}:${fn}`,
          `${who} uses ${fn}(), which the ${statement.strategy} output cannot write (${label}).`,
          at,
        )
      }
      if (use.tableCalls > 0 && !statement.features.has('decision_table_calls')) {
        const limit = statement.limits.inline_decision_table_rows
        if (limit !== undefined)
          issues.push(
            issue(
              'output.limit',
              'warning',
              `${who} calls a decision table: the ${statement.strategy} output writes it inline, ${limit} rows at most without a warning (${label}).`,
              at,
            ),
          )
      }
      for (const code of use.retrievals) {
        const ctx = retrievals?.concepts[code]?.retrieval?.context
        if (!ctx || statement.retrieval_contexts.has(ctx)) continue
        report(
          `${node.id}:${code}`,
          `${who} reads ${code}, a retrieval from the ${ctx} context, which the ${statement.strategy} output cannot write (${label}).`,
          at,
        )
      }
    }
    for (const activityId of Object.keys(project.activities).sort()) {
      for (const node of Object.values(project.activities[activityId]?.nodes ?? {})) {
        if (node.type !== 'populate') continue
        const ctx = node.context ?? 'patient'
        if (statement.populate_contexts.has(ctx)) continue
        report(
          `${node.id}:populate`,
          `${nodeName(node, activityId)} is a prefilled value from the ${ctx} context, which the ${statement.strategy} output cannot write (${label}).`,
          { activityId, nodeId: node.id, field: 'context' },
        )
      }
    }
  }
  return issues
}
