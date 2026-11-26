import type { Project } from '../model/types.js'
import { calledStart, effectiveShowAs, showAsOf, type ShowAs } from '../model/show-as.js'
import { hasShowAs } from '../format/schema/node-types.js'
import { issue, type Issue } from './types.js'

/**
 * Show as and instances (feature/20261126-questionnaire-pages.md §2), as tricc_oo checks them
 * (`apply_goto_page_to_activity`, `check_page_as_group`).
 */
export function validateShowAs(project: Project): Issue[] {
  const out: Issue[] = []
  // Gotos opening one shared instance as a page or section: link|instance → gotos that set page.
  const shared = new Map<string, { activityId: string; nodeId: string; page: boolean }[]>()
  for (const activityId of Object.keys(project.activities).sort()) {
    const activity = project.activities[activityId]!
    for (const group of activity.groups ?? []) {
      if (group.page === true && group.asGroup === false) {
        out.push(
          issue(
            'node.page-not-section',
            'warning',
            'This group is shown on its own page but also set to have no section. A page is always a section, so the page wins. Choose Page or Inline in Show as.',
            { activityId, groupId: group.id, field: 'page' },
          ),
        )
      }
    }
    for (const nodeId of activity.nodeOrder) {
      const node = activity.nodes[nodeId]
      if (!node) continue
      const at = { activityId, nodeId }
      const set = node.page !== undefined || node.asGroup !== undefined
      if (set && !hasShowAs(node.type)) {
        out.push(
          issue(
            'node.page-not-supported',
            'warning',
            'Show as (page, asGroup) only applies to an activity or block start, a Go to and a Use block. It is ignored here; remove it from the file.',
            { ...at, field: 'page' },
          ),
        )
        continue
      }
      if (node.page === true && node.asGroup === false) {
        out.push(
          issue(
            'node.page-not-section',
            'warning',
            'This is shown on its own page but also set to have no section. A page is always a section, so the page wins. Choose Page or Inline in Show as.',
            { ...at, field: 'page' },
          ),
        )
      }
      if ((node.type === 'goto' || node.type === 'activity_start') && (node.instance ?? 1) < 0) {
        out.push(
          issue(
            'goto.instance-negative',
            'error',
            'An instance cannot be negative. To put the activity’s questions here, use Show as: Inline and leave Instance empty.',
            { ...at, field: 'instance' },
          ),
        )
        continue
      }
      if (node.type !== 'goto' || !node.link) continue
      const start = calledStart(node, project)
      const choice: ShowAs = showAsOf(node) ?? (start ? effectiveShowAs(start) : 'section')
      if (choice === 'inline') {
        if (node.instance !== undefined && node.instance !== 1) {
          out.push(
            issue(
              'goto.inline-instance',
              'warning',
              `This Go to puts the activity’s questions here (Show as: Inline), so there is no copy to share: instance ${node.instance} is ignored. Leave Instance empty, or show the activity as a section.`,
              { ...at, field: 'instance' },
            ),
          )
        }
        continue
      }
      if (node.page === undefined) continue
      const key = `${node.link}|${node.instance ?? 1}`
      const list = shared.get(key) ?? []
      list.push({ activityId, nodeId, page: node.page })
      shared.set(key, list)
    }
  }
  for (const [key, list] of shared) {
    if (new Set(list.map((l) => l.page)).size < 2) continue
    const instance = key.split('|')[1]
    for (const l of list) {
      out.push(
        issue(
          'goto.instance-page',
          'error',
          `Go to nodes open instance ${instance} of this activity, some as a page and some not. One copy is shown one way: give the same Show as to every Go to of this instance, leave it at Default on all but one, or give one of them another instance.`,
          { activityId: l.activityId, nodeId: l.nodeId, field: 'page' },
        ),
      )
    }
  }
  return out
}
