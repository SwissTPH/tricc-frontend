import type { Project } from '../model/types.js'
import { retrieveCodeSystem } from '../terminology/dictionaries.js'
import {
  RETRIEVAL_CODE,
  contextUsesPeriod,
  effectiveFunction,
  isIsoPeriod,
  projectExpressions,
  retrievalFunction,
  retrievalRefs,
} from '../terminology/retrieval.js'
import { lookupConcept } from '../terminology/usage.js'
import { issue, type Issue } from './types.js'

/** The retrieval dictionary and its references (feature/20261109-project-retrievals.md §7). */
export function validateRetrievals(project: Project): Issue[] {
  const issues: Issue[] = []
  const cs = retrieveCodeSystem(project)
  const codes = new Set(cs?.conceptOrder ?? [])

  for (const site of projectExpressions(project)) {
    for (const code of retrievalRefs(site.text)) {
      if (codes.has(code)) continue
      issues.push(
        issue(
          'retrieval.unknown',
          'error',
          `"${code}" is not in the retrieval dictionary, so the form has no value for it. Add it to the retrieval dictionary or correct the reference.`,
          {
            ...(site.activityId ? { activityId: site.activityId } : {}),
            ...(site.nodeId ? { nodeId: site.nodeId } : {}),
            ...(site.edgeId ? { edgeId: site.edgeId } : {}),
            ...(site.interventionId ? { interventionId: site.interventionId } : {}),
            field: site.field,
          },
        ),
      )
    }
  }

  for (const other of Object.values(project.codeSystems)) {
    if (other === cs) continue
    for (const code of other.conceptOrder) {
      if (!code.startsWith('#')) continue
      issues.push(
        issue(
          'retrieval.code-outside',
          'error',
          `"${code}" starts with #, which is kept for retrievals. Rename the concept, or move it to the retrieval dictionary.`,
          { conceptCode: code, codeSystem: other.url, field: 'code' },
        ),
      )
    }
  }
  if (!cs) return issues

  const used = new Set(projectExpressions(project).flatMap((s) => retrievalRefs(s.text)))
  for (const code of cs.conceptOrder) {
    const concept = cs.concepts[code]
    if (!concept) continue
    const at = { conceptCode: code, codeSystem: cs.url }
    const r = concept.retrieval
    if (!RETRIEVAL_CODE.test(code)) {
      issues.push(
        issue(
          'retrieval.code',
          'error',
          `"${code}" is not a retrieval code. A retrieval code is # followed by lowercase letters, digits and _, like #age_months.`,
          { ...at, field: 'code' },
        ),
      )
    }
    if (!r) {
      issues.push(
        issue(
          'retrieval.missing-definition',
          'error',
          `"${code}" does not say what it reads. Choose where it reads from.`,
          { ...at, field: 'context' },
        ),
      )
      continue
    }
    if (r.context === 'custom') {
      if (!r.expressions?.some((e) => e.expression.trim())) {
        issues.push(
          issue(
            'retrieval.custom-expression',
            'error',
            `"${code}" is a custom retrieval with no expression, so no export can read it. Write at least one expression.`,
            { ...at, field: 'expressions' },
          ),
        )
      }
    } else {
      const f = effectiveFunction(r)
      if (r.function !== undefined && (!f || !f.contexts.includes(r.context))) {
        issues.push(
          issue(
            'retrieval.function',
            'error',
            `"${retrievalFunction(r.function)?.label ?? r.function}" cannot read from ${r.context}. Choose a function for this context.`,
            { ...at, field: 'function' },
          ),
        )
      } else if (f?.needsSource && !r.reads) {
        issues.push(
          issue(
            'retrieval.reads-missing',
            'error',
            `"${code}" reads a recorded value but does not say which concept. Choose the concept it reads.`,
            { ...at, field: 'reads' },
          ),
        )
      }
    }
    if (r.reads && !lookupConcept(project, r.reads)) {
      issues.push(
        issue(
          'retrieval.reads-unknown',
          'error',
          `"${code}" reads "${r.reads.code}", which is not in the project's dictionaries. Choose an existing concept.`,
          { ...at, field: 'reads' },
        ),
      )
    }
    if (r.period !== undefined) {
      if (!isIsoPeriod(r.period)) {
        issues.push(
          issue(
            'retrieval.period',
            'warning',
            `The period "${r.period}" is not an ISO-8601 period. Write it like P30D (30 days) or P6M (6 months).`,
            { ...at, field: 'period' },
          ),
        )
      } else if (!contextUsesPeriod(r.context)) {
        issues.push(
          issue(
            'retrieval.period-ignored',
            'warning',
            `A period has no effect when reading from ${r.context}; it is ignored. Remove it.`,
            { ...at, field: 'period' },
          ),
        )
      }
    }
    if (!used.has(code)) {
      issues.push(
        issue(
          'retrieval.unused',
          'info',
          `"${code}" is not used by any expression, so no form loads it.`,
          at,
        ),
      )
    }
  }
  return issues
}
