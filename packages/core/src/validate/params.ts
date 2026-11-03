import type { Activity, Project } from '../model/types.js'
import { activityKind, callsOf, isBlock } from '../model/activity-kind.js'
import { PARAM_NAME_RE } from '../format/schema/activity.js'
import { argRef, effectiveParams, paramConflicts, paramPlaceholders } from '../params/effective.js'
import { argProblem, paramEnvironments } from '../params/resolve.js'
import { paramLabel, syncedParamConcepts } from '../params/sync.js'
import { resolve } from '../format/schema/localized.js'
import { issue, type Issue } from './types.js'

/**
 * Building blocks, parameters and values (feature/20261028-snippets-tab-and-params.md §11).
 * The library reports the same problems at build time (tricc_oo block-params §3.5).
 */
export function validateParams(project: Project): Issue[] {
  const issues: Issue[] = []
  for (const id of Object.keys(project.activities).sort()) {
    const activity = project.activities[id]!
    issues.push(...pageParams(project, activity), ...calls(project, activity))
  }
  for (const c of paramConflicts(project)) {
    const title = (id: string) => titleOf(project, id)
    issues.push(
      issue(
        'param.conflict',
        'error',
        `“${c.name}” is declared differently in ${c.declaredIn.map(title).join(' and ')}. The same name along a chain is the same setting: give it one type and one list of options, or bind one to another name.`,
        { activityId: c.activityId, field: 'params' },
      ),
    )
  }
  for (const t of syncedParamConcepts(project).taken) {
    issues.push(
      issue(
        'param.code-taken',
        'error',
        `The setting “${t.name}” needs the dictionary code “${t.code}”, which another concept already has. Rename the setting, or that concept.`,
        { activityId: t.activityId, field: 'params' },
      ),
    )
  }
  issues.push(
    ...cycles(project),
    ...unusedBlocks(project),
    ...interventions(project),
    ...sameInstance(project),
  )
  return issues
}

function titleOf(project: Project, id: string): string {
  const lang = project.languages.default
  return `“${resolve(project.activities[id]?.title, lang, lang) ?? id}”`
}

function pageParams(project: Project, activity: Activity): Issue[] {
  const out: Issue[] = []
  const at = { activityId: activity.id, field: 'params' }
  const seen = new Set<string>()
  for (const p of activity.params ?? []) {
    if (seen.has(p.name)) {
      out.push(
        issue(
          'param.duplicate-name',
          'error',
          `Two settings are called “${p.name}”. Each needs its own name.`,
          at,
        ),
      )
    }
    seen.add(p.name)
    if (!PARAM_NAME_RE.test(p.name)) {
      out.push(
        issue(
          'param.name-pattern',
          'error',
          `“${p.name}” is not a valid setting name: start with a lower-case letter, then letters, digits or _.`,
          at,
        ),
      )
    }
    if (p.type === 'choice' && !(p.options ?? []).length) {
      out.push(
        issue(
          'param.choice-empty',
          'error',
          `The setting “${p.name}” is a choice with no options. Add the options.`,
          at,
        ),
      )
    }
    if (p.default !== undefined) {
      const problem = argProblem(p, p.default, paramLabel(project, activity.id, p))
      if (problem) out.push(issue('param.default-invalid', 'error', `Default: ${problem}`, at))
    }
  }
  const effective = effectiveParams(project, activity.id)
  for (const e of effective) {
    if (e.unused) {
      out.push(
        issue(
          'param.unused',
          'warning',
          `The setting “${e.name}” is not used: nothing on this page reads {{${e.name}}} and nothing it calls needs it. Remove it, or use it.`,
          at,
        ),
      )
    }
  }
  const known = new Set(effective.map((e) => e.name))
  for (const name of paramPlaceholders(activity)) {
    if (known.has(name)) continue
    out.push(
      issue(
        'param.unknown-placeholder',
        'error',
        `This page uses {{${name}}}, but it has no setting called “${name}”. Add the setting, or correct the name.`,
        { activityId: activity.id },
      ),
    )
  }
  return out
}

function calls(project: Project, activity: Activity): Issue[] {
  const out: Issue[] = []
  for (const node of Object.values(activity.nodes)) {
    const at = { activityId: activity.id, nodeId: node.id }
    if (node.type === 'block' && !node.link) {
      out.push(
        issue(
          'block.no-link',
          'error',
          'This node uses no block yet. Choose the building block it uses.',
          { ...at, field: 'link' },
        ),
      )
    }
    if (node.type === 'block' && node.link) {
      const target = project.activities[node.link]
      if (!target) {
        out.push(
          issue(
            'block.dangling-link',
            'error',
            `This node uses “${node.link}”, which is not a building block in this project. Choose an existing block.`,
            { ...at, field: 'link' },
          ),
        )
      } else if (!isBlock(target)) {
        out.push(
          issue(
            'block.not-a-block',
            'error',
            `“${node.link}” is an activity, not a building block. Use Go to activity for it.`,
            { ...at, field: 'link' },
          ),
        )
      }
    }
    if (
      node.type === 'goto' &&
      node.link &&
      project.activities[node.link] &&
      isBlock(project.activities[node.link]!)
    ) {
      out.push(
        issue(
          'goto.links-to-block',
          'error',
          `“${node.link}” is a building block. Use a Use block node, which sets its values.`,
          { ...at, field: 'link' },
        ),
      )
    }
  }
  for (const call of callsOf(activity)) {
    const target = project.activities[call.link!]
    if (!target || !call.args) continue
    const params = new Map(effectiveParams(project, target.id).map((e) => [e.name, e]))
    const own = new Set(effectiveParams(project, activity.id).map((e) => e.name))
    for (const [name, value] of Object.entries(call.args)) {
      const at = { activityId: activity.id, nodeId: call.id, field: 'args' }
      const p = params.get(name)
      if (!p) {
        out.push(
          issue(
            'call.unknown-param',
            'error',
            `${activityKind(target) === 'block' ? 'The block' : 'The activity'} no longer has a setting called “${name}”. Clear this value.`,
            at,
          ),
        )
        continue
      }
      const ref = argRef(value)
      if (ref && !own.has(ref)) {
        out.push(
          issue(
            'call.unknown-ref',
            'error',
            `“${name}” is bound to {{${ref}}}, which is not a setting of this page.`,
            at,
          ),
        )
        continue
      }
      const problem = argProblem(p.param, value, paramLabel(project, p.declaredIn, p.param))
      if (problem) out.push(issue('call.value-not-allowed', 'error', problem, at))
    }
  }
  return out
}

/** "Block A uses itself through Block B." */
function cycles(project: Project): Issue[] {
  const out: Issue[] = []
  const reported = new Set<string>()
  const walk = (id: string, path: string[]) => {
    const activity = project.activities[id]
    if (!activity) return
    for (const call of callsOf(activity)) {
      const next = call.link!
      const at = path.indexOf(next)
      if (at >= 0) {
        const loop = path.slice(at)
        const key = [...loop].sort().join('|')
        if (reported.has(key)) continue
        reported.add(key)
        const via = loop.slice(1).map((p) => titleOf(project, p))
        out.push(
          issue(
            'block.cycle',
            'error',
            via.length > 0
              ? `${titleOf(project, next)} uses itself through ${via.join(', ')}. A page cannot call itself.`
              : `${titleOf(project, next)} uses itself. A page cannot call itself.`,
            { activityId: next },
          ),
        )
        continue
      }
      if (path.length < 64) walk(next, [...path, next])
    }
  }
  for (const id of Object.keys(project.activities).sort()) walk(id, [id])
  return out
}

function unusedBlocks(project: Project): Issue[] {
  const used = new Set<string>()
  for (const activity of Object.values(project.activities)) {
    for (const call of callsOf(activity)) used.add(call.link!)
  }
  return Object.keys(project.activities)
    .sort()
    .filter((id) => isBlock(project.activities[id]!) && !used.has(id))
    .map((id) =>
      issue('block.unused', 'warning', 'Nothing uses this block yet.', { activityId: id }),
    )
}

function interventions(project: Project): Issue[] {
  const out: Issue[] = []
  const ids = new Set(project.interventions.map((iv) => iv.id))
  const envs = paramEnvironments(project)
  for (const iv of project.interventions) {
    const loc = { interventionId: iv.id }
    for (const r of iv.requires ?? []) {
      if (!ids.has(r) || r === iv.id) {
        out.push(
          issue(
            'intervention.unknown-requires',
            'error',
            `The scope names “${r}”, which is not another intervention of this project.`,
            { ...loc, field: 'requires' },
          ),
        )
      }
    }
    const byName = new Map<
      string,
      { activityId: string; e: ReturnType<typeof effectiveParams>[number] }
    >()
    for (const ref of iv.activities) {
      if (!project.activities[ref.ref]) continue
      for (const e of effectiveParams(project, ref.ref)) {
        if (!byName.has(e.name)) byName.set(e.name, { activityId: ref.ref, e })
      }
    }
    for (const [name, value] of Object.entries(iv.args ?? {})) {
      const found = byName.get(name)
      if (!found) {
        out.push(
          issue(
            'intervention.unknown-param',
            'error',
            `No activity of this intervention has a setting called “${name}”. Clear this value.`,
            { ...loc, field: 'args' },
          ),
        )
        continue
      }
      const problem = argProblem(
        found.e.param,
        value,
        paramLabel(project, found.e.declaredIn, found.e.param),
      )
      if (problem)
        out.push(
          issue('intervention.value-not-allowed', 'error', problem, { ...loc, field: 'args' }),
        )
    }
    // A required setting with no value anywhere up the chain blocks the export.
    const missing = new Set<string>()
    for (const [pageId, list] of envs) {
      for (const env of list) {
        if (env.interventionId !== iv.id) continue
        for (const e of effectiveParams(project, pageId)) {
          if (!e.param.required || env.values[e.name] !== undefined) continue
          const key = `${pageId}|${e.name}`
          if (missing.has(key)) continue
          missing.add(key)
          const label = paramLabel(project, e.declaredIn, e.param)
          out.push(
            issue(
              'param.missing-required',
              'error',
              `“${label}” needs a value. Nothing sets it on the way ${env.chain.map((p) => titleOf(project, p)).join(' → ')}. Set it on this intervention or on a call.`,
              { ...loc, field: 'args' },
            ),
          )
        }
      }
    }
  }
  return out
}

/** Two gotos to the same activity instance must agree on its values. */
function sameInstance(project: Project): Issue[] {
  const out: Issue[] = []
  const byKey = new Map<string, { activityId: string; nodeId: string; args: string }[]>()
  for (const activity of Object.values(project.activities)) {
    for (const call of callsOf(activity)) {
      if (call.type !== 'goto') continue
      const key = `${call.link}|${call.instance ?? 1}`
      const list = byKey.get(key) ?? []
      list.push({
        activityId: activity.id,
        nodeId: call.id,
        args: JSON.stringify(sorted(call.args ?? {})),
      })
      byKey.set(key, list)
    }
  }
  for (const [key, list] of byKey) {
    if (new Set(list.map((l) => l.args)).size < 2) continue
    const instance = key.split('|')[1]
    for (const l of list) {
      out.push(
        issue(
          'goto.instance-values',
          'warning',
          `Two calls use instance ${instance} of this activity with different settings. Give one of them another instance, or the same values.`,
          { activityId: l.activityId, nodeId: l.nodeId, field: 'args' },
        ),
      )
    }
  }
  return out
}

function sorted(o: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)))
}
