import type { Project } from '../model/types.js'
import { activityKind, calledActivities } from '../model/activity-kind.js'
import { IMPLEMENTED_TRIGGER_MODES } from '../format/schema/project.js'
import { isOpenHandoff } from '../format/schema/expression.js'
import { validateActivity } from './activity.js'
import { issue, type Issue } from './types.js'

/**
 * Project-scoped rules: everything that cannot be decided from one activity alone.
 * Runs on save and on export (feature/20260825-activity-editor.md §8).
 */
export function validateProject(project: Project): Issue[] {
  const issues: Issue[] = []

  for (const id of Object.keys(project.activities).sort()) {
    const a = project.activities[id]
    if (a) issues.push(...validateActivity(a, project))
  }

  issues.push(...validateCrossActivity(project))
  issues.push(...validateInterventions(project))
  issues.push(...validateTerminology(project))
  return issues
}

function validateCrossActivity(project: Project): Issue[] {
  const issues: Issue[] = []
  const activityIds = new Set(Object.keys(project.activities))

  for (const [activityId, activity] of Object.entries(project.activities)) {
    for (const node of Object.values(activity.nodes)) {
      if (node.type === 'goto' && node.link) {
        const target = project.activities[node.link]
        // A process activity is chained into the form by the process mechanism; jumping
        // into one gives it two entry paths. tricc_oo states the same rule in
        // feature/goto-snippet-injection.md but resolves any page, so nothing catches it.
        if (target && activityKind(target) === 'process') {
          issues.push(
            issue(
              'goto.links-to-process-activity',
              'error',
              `"${node.link}" starts a process, so it cannot also be jumped to. Point this at the activity that process calls.`,
              { activityId, nodeId: node.id, field: 'link' },
            ),
          )
        }
        if (node.link === activityId) {
          issues.push(
            issue(
              'goto.self-reference',
              'error',
              'This jump points at the activity it is in, which would never terminate. Choose a different activity.',
              { activityId, nodeId: node.id, field: 'link' },
            ),
          )
        }
      }
      if (node.type === 'goto' && node.link && !activityIds.has(node.link)) {
        issues.push(
          issue(
            'goto.dangling-link',
            'error',
            `This jump points at "${node.link}", which is not an activity in this project. Choose an existing activity, or restore the deleted one.`,
            { activityId, nodeId: node.id, field: 'link' },
          ),
        )
      }
      if (node.type === 'continue_with') {
        if (node.intervention && !project.interventions.some((iv) => iv.id === node.intervention)) {
          issues.push(
            issue(
              'continue_with.missing-intervention',
              'error',
              `This follow-up points at "${node.intervention}", which is not an intervention in this project. Choose one from the list.`,
              { activityId, nodeId: node.id, field: 'intervention' },
            ),
          )
        }
        if (node.delay && !ISO_PERIOD.test(node.delay)) {
          issues.push(
            issue(
              'continue_with.delay',
              'warning',
              `The delay "${node.delay}" is not an ISO-8601 period such as P3D. An intervention start.due stays a UCUM duration and is a different field.`,
              { activityId, nodeId: node.id, field: 'delay' },
            ),
          )
        }
      }
      if (node.type === 'wait' && isActivityReference(node.reference)) {
        const target = (node.reference as { activity: string }).activity
        if (!activityIds.has(target)) {
          issues.push(
            issue(
              'wait.dangling-activity',
              'error',
              `This wait is waiting for "${target}", which is not an activity in this project.`,
              { activityId, nodeId: node.id, field: 'reference' },
            ),
          )
        }
      }
    }
  }

  // link_out must have a matching link_in somewhere, and vice versa.
  const linkOuts = new Map<string, { activityId: string; nodeId: string }[]>()
  const linkIns = new Map<string, { activityId: string; nodeId: string }[]>()
  for (const [activityId, activity] of Object.entries(project.activities)) {
    for (const node of Object.values(activity.nodes)) {
      const key = node.name ?? node.link
      if (!key) continue
      const entry = { activityId, nodeId: node.id }
      if (node.type === 'link_out') linkOuts.set(key, [...(linkOuts.get(key) ?? []), entry])
      if (node.type === 'link_in') linkIns.set(key, [...(linkIns.get(key) ?? []), entry])
    }
  }
  for (const [key, entries] of linkOuts) {
    if (linkIns.has(key)) continue
    for (const e of entries) {
      issues.push(
        issue(
          'link.unmatched-out',
          'error',
          `Nothing receives this link. Add a matching link-in named "${key}", or remove this link-out.`,
          { activityId: e.activityId, nodeId: e.nodeId },
        ),
      )
    }
  }
  for (const [key, entries] of linkIns) {
    if (linkOuts.has(key)) continue
    for (const e of entries) {
      issues.push(
        issue(
          'link.unmatched-in',
          'warning',
          `Nothing sends to this link, so it will never be entered. Add a matching link-out named "${key}".`,
          { activityId: e.activityId, nodeId: e.nodeId },
        ),
      )
    }
  }

  return issues
}

/** ISO-8601 duration with at least one component. Not the UCUM spelling `3 d`. */
const ISO_PERIOD = /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?$/

function isActivityReference(ref: unknown): boolean {
  return typeof ref === 'object' && ref !== null && 'activity' in ref
}

function validateInterventions(project: Project): Issue[] {
  const issues: Issue[] = []
  const activityIds = new Set(Object.keys(project.activities))
  const seenCodes = new Map<string, string[]>()
  const usedActivities = new Set<string>()

  for (const iv of project.interventions) {
    const loc = { interventionId: iv.id }

    const code = iv.code ?? iv.id
    seenCodes.set(code, [...(seenCodes.get(code) ?? []), iv.id])

    if (iv.activities.length === 0) {
      issues.push(
        issue(
          'intervention.empty',
          'warning',
          'This intervention lists no activities, so selecting it would do nothing.',
          loc,
        ),
      )
    }

    if (iv.trigger && !(IMPLEMENTED_TRIGGER_MODES as readonly string[]).includes(iv.trigger.mode)) {
      issues.push(
        issue(
          'intervention.reserved-trigger',
          'error',
          `Trigger mode "${iv.trigger.mode}" needs the planning layer, which is not available yet. Only "on-demand" can be exported today.`,
          { ...loc, field: 'trigger' },
        ),
      )
    }

    if (isOpenHandoff(iv.applicability)) {
      issues.push(
        issue(
          'expression.open-handoff',
          'error',
          'The intent for this intervention applicability is written but the logic is not. It cannot be exported until someone expresses it in CQL.',
          { ...loc, field: 'applicability' },
        ),
      )
    }

    const seenRefs = new Set<string>()
    for (const ref of iv.activities) {
      usedActivities.add(ref.ref)

      const referenced = project.activities[ref.ref]
      if (referenced && activityKind(referenced) === 'process' && calledActivities(referenced).length === 0) {
        issues.push(
          issue(
            'process-activity.no-calls',
            'warning',
            `"${ref.ref}" is a process activity but calls no activity, so opening it would do nothing.`,
            { ...loc, activityId: ref.ref },
          ),
        )
      }

      if (!activityIds.has(ref.ref)) {
        issues.push(
          issue(
            'intervention.dangling-activity',
            'error',
            `"${ref.ref}" is listed in this intervention but is not an activity in this project.`,
            { ...loc, activityId: ref.ref },
          ),
        )
      }
      if (seenRefs.has(ref.ref)) {
        issues.push(
          issue(
            'intervention.duplicate-activity',
            'warning',
            `"${ref.ref}" is listed twice on this intervention. Keep one reference to the same activity file.`,
            { ...loc, activityId: ref.ref },
          ),
        )
      }
      seenRefs.add(ref.ref)
    }
  }

  for (const [code, ids] of seenCodes) {
    if (ids.length < 2) continue
    for (const id of ids) {
      issues.push(
        issue(
          'intervention.duplicate-code',
          'error',
          `${ids.length} interventions share the code "${code}". Codes identify an intervention to the point-of-care app and must be unique.`,
          { interventionId: id },
        ),
      )
    }
  }

  // Orphaned activities are a normal mid-authoring state, so this is information, not a
  // warning - but hiding it is how work gets lost. A normal activity called by a process
  // activity is not orphaned, even though no intervention names it directly.
  const called = new Set<string>()
  for (const activity of Object.values(project.activities)) {
    for (const id of calledActivities(activity)) called.add(id)
  }
  for (const id of Object.keys(project.activities).sort()) {
    if (usedActivities.has(id) || called.has(id)) continue
    issues.push(
      issue(
        'activity.unassigned',
        'info',
        'This activity belongs to no intervention, so it will not be offered to a health worker.',
        { activityId: id },
      ),
    )
  }

  return issues
}

function validateTerminology(project: Project): Issue[] {
  const issues: Issue[] = []
  for (const cs of Object.values(project.codeSystems)) {
    for (const code of cs.conceptOrder) {
      const c = cs.concepts[code]
      if (!c) continue
      // Both or neither: a path is meaningless without knowing what it is relative to
      // (tricc_oo/feature/20260826-concept-persistence-mapping.md §1).
      if (c.targetPath && !c.targetResource) {
        issues.push(
          issue(
            'concept.path-without-resource',
            'error',
            `"${code}" declares where it is stored but not on which resource. Set the target resource, or remove the path.`,
            { conceptCode: code, field: 'targetPath' },
          ),
        )
      }
      if (!c.dataType) {
        issues.push(
          issue(
            'concept.no-datatype',
            'warning',
            `"${code}" has no data type, so nothing can check that the questions bound to it capture the right kind of answer.`,
            { conceptCode: code, field: 'dataType' },
          ),
        )
      }
    }
  }

  if (Object.keys(project.codeSystems).length === 0) {
    issues.push(
      issue(
        'project.no-terminology',
        'warning',
        'This project has no concept dictionary, so nothing that is captured can be coded.',
        {},
      ),
    )
  }

  return issues
}

export { validateActivity }
