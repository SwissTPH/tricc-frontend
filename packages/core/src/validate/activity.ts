import type { Activity, Project, TriccNode } from '../model/types.js'
import { INJECTED_ONLY_TYPES, isSelect } from '../format/schema/node-types.js'
import { isOpenHandoff } from '../format/schema/expression.js'
import { activityKind, processOf } from '../model/activity-kind.js'
import { issue, type Issue } from './types.js'

/**
 * Activity-scoped authoring rules.
 *
 * Messages state what is wrong, why it matters clinically, and the next action —
 * never only the first (guided-authoring §8).
 */
export function validateActivity(activity: Activity, project?: Project): Issue[] {
  const issues: Issue[] = []
  const nodes = Object.values(activity.nodes)
  const at = (n: TriccNode) => ({ activityId: activity.id, nodeId: n.id })

  // --- structure ---------------------------------------------------------

  const starts = nodes.filter((n) => n.type === 'start' || n.type === 'activity_start')
  if (starts.length === 0) {
    issues.push(
      issue(
        'activity.no-start',
        'error',
        'This activity has no entry point, so nothing can reach it. Add a start node.',
        { activityId: activity.id },
      ),
    )
  } else if (starts.length > 1) {
    issues.push(
      issue(
        'activity.multiple-starts',
        'error',
        `This activity has ${starts.length} entry points. An activity is entered in exactly one place - remove the extra start nodes.`,
        { activityId: activity.id },
      ),
    )
  }

  // A process activity is rooted by `start` and must say which process it starts;
  // without that, tricc_oo has nothing to chain it into.
  if (activityKind(activity) === 'process' && !processOf(activity)) {
    issues.push(
      issue(
        'process-activity.no-process',
        'error',
        'This activity starts a process but does not say which one. Choose the clinical process it begins.',
        { activityId: activity.id, field: 'process' },
      ),
    )
  }

  const ends = nodes.filter((n) => n.type === 'end' || n.type === 'activity_end')
  if (ends.length === 0) {
    issues.push(
      issue(
        'activity.no-end',
        'warning',
        'This activity never finishes. Add an end node so the flow has somewhere to arrive.',
        { activityId: activity.id },
      ),
    )
  }

  // --- reachability ------------------------------------------------------

  const outgoing = new Map<string, string[]>()
  for (const e of Object.values(activity.edges)) {
    const list = outgoing.get(e.source) ?? []
    list.push(e.target)
    outgoing.set(e.source, list)
  }
  const reachable = new Set<string>()
  const queue = starts.map((s) => s.id)
  while (queue.length > 0) {
    const id = queue.shift() as string
    if (reachable.has(id)) continue
    reachable.add(id)
    for (const next of outgoing.get(id) ?? []) queue.push(next)
  }
  for (const n of nodes) {
    // Dangling calculates are a legitimate authoring pattern - tricc_oo collects them
    // (manage_dangling_calculate), so they are not "unreachable" in the failing sense.
    if (reachable.has(n.id) || n.type === 'calculate' || n.type === 'not_available') continue
    issues.push(
      issue(
        'node.unreachable',
        'warning',
        'Nothing leads here, so this will never be asked. Connect it to the flow, or delete it.',
        at(n),
      ),
    )
  }

  // --- per-node ----------------------------------------------------------

  const namesBySlot = new Map<string, TriccNode[]>()

  for (const n of nodes) {
    if ((INJECTED_ONLY_TYPES as readonly string[]).includes(n.type)) {
      issues.push(
        issue(
          'node.injected-type',
          'error',
          `"${n.type}" is created by TRICC during conversion and cannot be authored. This file looks like a processed graph rather than an authored one.`,
          at(n),
        ),
      )
    }

    if (isSelect(n.type) && n.type !== 'select_yesno' && (!n.options || n.options.length === 0)) {
      issues.push(
        issue(
          'select.no-options',
          'error',
          'This question offers nothing to choose. Add the possible answers.',
          at(n),
        ),
      )
    }

    if (n.type === 'calculate' && !n.calculate?.expression) {
      issues.push(
        issue(
          'calculate.no-expression',
          'error',
          isOpenHandoff(n.calculate)
            ? 'The intent for this calculation is written but the logic is not. Someone needs to express it in CQL before this can be exported.'
            : 'This calculation has no expression, so it will always be empty. Write what it should compute.',
          { ...at(n), field: 'calculate' },
        ),
      )
    }

    if (n.type === 'rhombus' && !n.reference) {
      issues.push(
        issue(
          'rhombus.no-reference',
          'error',
          'This decision needs to know which earlier answer it checks. Pick the question whose answer decides this branch.',
          { ...at(n), field: 'reference' },
        ),
      )
    }

    if (n.type === 'wait' && !n.reference) {
      issues.push(
        issue(
          'wait.no-reference',
          'error',
          'This wait does not say what it is waiting for. Choose the node or activity that must complete first.',
          { ...at(n), field: 'reference' },
        ),
      )
    }

    if (n.type === 'goto' && !n.link) {
      issues.push(
        issue(
          'goto.no-link',
          'error',
          'This jump has no destination. Choose the activity it goes to.',
          { ...at(n), field: 'link' },
        ),
      )
    }

    if (needsName(n) && !n.name) {
      issues.push(
        issue(
          'node.missing-name',
          'error',
          'This node captures a value, so it needs a name - that is how other logic refers to its answer.',
          { ...at(n), field: 'name' },
        ),
      )
    }

    if (n.name) {
      // Uniqueness is per (name, repeat slot): the same concept captured in two slots is
      // a deliberate pattern, not a collision (tricc_oo concept-repeat).
      const key = `${n.name} ${n.repeat ?? 1}`
      const list = namesBySlot.get(key) ?? []
      list.push(n)
      namesBySlot.set(key, list)
    }

    for (const [field, expr] of expressionFields(n)) {
      if (isOpenHandoff(expr)) {
        issues.push(
          issue(
            'expression.open-handoff',
            'error',
            `The intent for "${field}" is written but the logic is not. This cannot be exported until someone expresses it in CQL.`,
            { ...at(n), field },
          ),
        )
      }
    }

    if (n.save !== undefined) {
      issues.push(
        issue(
          'node.deprecated-save',
          'warning',
          'The "save" attribute is deprecated. Where an answer lands now follows from its concept - bind the right concept, or express the derivation in CQL.',
          { ...at(n), field: 'save' },
        ),
      )
    }

    if (n.concept && project) {
      const cs = project.codeSystems[n.concept.system]
      if (!cs) {
        issues.push(
          issue(
            'concept.unknown-system',
            'error',
            `No code system "${n.concept.system}" is part of this project, so this concept cannot be resolved.`,
            { ...at(n), field: 'concept' },
          ),
        )
      } else if (!cs.concepts[n.concept.code]) {
        issues.push(
          issue(
            'concept.unknown-code',
            'error',
            `"${n.concept.code}" is not in the project's terminology. Add the concept, or pick a different one.`,
            { ...at(n), field: 'concept' },
          ),
        )
      }
    }
  }

  for (const [key, list] of namesBySlot) {
    if (list.length < 2) continue
    const [name, slot] = key.split(' ')
    for (const n of list) {
      issues.push(
        issue(
          'node.duplicate-name',
          'error',
          `${list.length} nodes are named "${name}" in repeat slot ${slot}. Expressions referring to that name would be ambiguous - rename, or put them in different repeat slots.`,
          { ...at(n), field: 'name' },
        ),
      )
    }
  }

  issues.push(...validateEdges(activity))
  return issues
}

function needsName(n: TriccNode): boolean {
  return (
    [
      'select_one',
      'select_multiple',
      'select_yesno',
      'integer',
      'decimal',
      'text',
      'date',
      'calculate',
      'count',
      'add',
      'populate',
      'diagnosis',
      'proposed_diagnosis',
      'not_available',
    ] as string[]
  ).includes(n.type)
}

function expressionFields(n: TriccNode): [string, NonNullable<TriccNode['relevance']>][] {
  const out: [string, NonNullable<TriccNode['relevance']>][] = []
  for (const f of ['relevance', 'calculate', 'expression', 'constraint'] as const) {
    const v = n[f]
    if (v) out.push([f, v])
  }
  return out
}

const AFFIRMATIVE = new Set(['yes', 'oui'])
const NEGATIVE = new Set(['no', 'non'])
const DEPRECATED_CONTINUE = new Set(['follow', 'suivre'])

/** The canonical spelling. `follow`/`suivre` are read but never written. */
export const CONTINUE = 'continue'

function validateEdges(activity: Activity): Issue[] {
  const issues: Issue[] = []
  const branchesBySource = new Map<string, { yes: number; no: number }>()

  for (const e of Object.values(activity.edges)) {
    const loc = { activityId: activity.id, edgeId: e.id }

    if (!activity.nodes[e.source]) {
      issues.push(
        issue(
          'edge.dangling-source',
          'error',
          'This connection starts from a node that no longer exists.',
          loc,
        ),
      )
    }
    if (!activity.nodes[e.target]) {
      issues.push(
        issue(
          'edge.dangling-target',
          'error',
          'This connection points at a node that no longer exists.',
          loc,
        ),
      )
    }
    if (e.source === e.target) {
      issues.push(
        issue('edge.self-loop', 'error', 'A connection cannot lead back to its own node.', loc),
      )
    }

    const v = e.value?.trim().toLowerCase()
    if (v && DEPRECATED_CONTINUE.has(v)) {
      issues.push(
        issue(
          'edge.deprecated-continue',
          'warning',
          `"${e.value}" is a deprecated spelling of "continue". It still works; saving this activity will update it.`,
          loc,
          { label: 'Rewrite as "continue"', kind: 'edge.normalize-continue' },
        ),
      )
    }
    if (v && (AFFIRMATIVE.has(v) || NEGATIVE.has(v))) {
      const counts = branchesBySource.get(e.source) ?? { yes: 0, no: 0 }
      if (AFFIRMATIVE.has(v)) counts.yes++
      else counts.no++
      branchesBySource.set(e.source, counts)

      const src = activity.nodes[e.source]
      if (src && !canBranch(src)) {
        // Warning rather than error: the editor prevents creating these at connect time,
        // so anything reaching here came from a hand-edited or imported file. Blocking
        // export on a pattern we have not verified against a real corpus would stop a
        // legitimate author; surfacing it does not.
        issues.push(
          issue(
            'edge.branch-from-non-branching',
            'warning',
            `A "${v}" branch only makes sense from a question or decision that has an answer. "${src.type}" does not, so this branch may never be taken.`,
            loc,
          ),
        )
      }
    }
  }

  for (const [source, counts] of branchesBySource) {
    if (counts.yes > 1 || counts.no > 1) {
      issues.push(
        issue(
          'edge.duplicate-branch',
          'error',
          'This node has more than one branch for the same answer, so which path is taken is undefined. Keep one of each.',
          { activityId: activity.id, nodeId: source },
        ),
      )
    }
  }

  return issues
}

function canBranch(n: TriccNode): boolean {
  return (
    [
      'select_yesno',
      'select_one',
      'select_multiple',
      'rhombus',
      'calculate',
      'count',
      'add',
      'not',
      'not_available',
    ] as string[]
  ).includes(n.type)
}
