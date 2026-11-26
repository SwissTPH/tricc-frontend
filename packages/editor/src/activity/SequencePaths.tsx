import { Fragment, useMemo } from 'react'
import {
  NODE_TYPE_SPECS,
  resolve,
  sequencePaths,
  type Activity,
  type PathStep,
  type TriccNode,
} from '@tricc/core'
import { useEditorPreferences, useProjectSnapshot } from '../runtime/context.js'
import { expressionNames, renderCqlLabels } from '../cql/names.js'
import { branchKindOf, branchLabel } from './canvas/BranchEdge.js'
import { answerEdgeCaption } from './canvas/answer.js'

/** How many paths the inspector lists before it says there are more. */
const PATH_LIMIT = 10

/** What the root of a path says: the start is an event, a calculation starting alone is a test. */
const ROOT_TEXT: Partial<Record<TriccNode['type'], string>> = {
  activity_start: 'Activity started',
  start: 'Started',
  block_start: 'Block started',
}

/**
 * The paths that lead to a node, from the activity start, reduced to their decision points. Shown
 * on every node a link leads to. For a calculation with no expression they are its value:
 * `tricc_oo` works it out from the nodes before it (sequence-driven), true when one was followed.
 */
export function SequencePaths({
  activityId,
  activity,
  lang,
  nodeId,
  sequenceDriven = false,
  onReveal,
}: {
  activityId: string
  activity: Activity
  lang: string
  nodeId: string
  /** A calculation with no expression: these paths are its value. */
  sequenceDriven?: boolean
  onReveal?: (activityId: string, nodeId: string) => void
}) {
  const project = useProjectSnapshot()
  const { labelChars } = useEditorPreferences()
  const names = useMemo(
    () => expressionNames(project, lang, activityId),
    [project, lang, activityId],
  )
  const { paths, more } = useMemo(
    () => sequencePaths(activity, nodeId, PATH_LIMIT),
    [activity, nodeId],
  )

  const stepText = (step: PathStep, index: number): string => {
    const node = activity.nodes[step.nodeId]
    if (!node) return step.nodeId
    const title =
      resolve(node.label, lang, lang) ?? node.name ?? NODE_TYPE_SPECS[node.type]?.label ?? node.type
    const text = index === 0 ? (ROOT_TEXT[node.type] ?? `${title} is true`) : title
    const answer = answerEdgeCaption(node, step.value, lang, project, labelChars)
    const branch = answer
      ? answer.short
      : branchKindOf(step.value) === 'condition'
        ? renderCqlLabels(step.value ?? '', names)
        : branchLabel(step.value)
    return branch ? `${text}: ${branch}` : text
  }

  // A "follow" link n1 → n2 ignores the answer: whatever happens at n1, or between n1 and n2,
  // does not matter on a path through both. So n1 and every step up to n2 are dropped.
  const follows = new Map<string, Set<string>>()
  for (const e of Object.values(activity.edges)) {
    if (branchKindOf(e.value) !== 'continue') continue
    const set = follows.get(e.source) ?? new Set<string>()
    set.add(e.target)
    follows.set(e.source, set)
  }
  const afterFollows = (path: PathStep[]): { step: PathStep; j: number }[] => {
    const ids = [...path.map((s) => s.nodeId), nodeId]
    const kept: { step: PathStep; j: number }[] = []
    for (let i = 0; i < path.length; i++) {
      const to = follows.get(ids[i] as string)
      // The start stays: it opens every path.
      if (i > 0 && to) {
        let last = -1
        for (let k = i + 1; k < ids.length; k++) if (to.has(ids[k] as string)) last = k
        if (last > 0) {
          i = last - 1
          continue
        }
      }
      kept.push({ step: path[i] as PathStep, j: i })
    }
    return kept
  }

  // Then only the decision points: the start, each link with a condition and each decision.
  // Paths that differ only in the steps dropped read the same, so they are shown once.
  const shown: { nodeId: string; text: string }[][] = []
  const seen = new Set<string>()
  for (const path of paths) {
    const steps = afterFollows(path)
      .filter(
        ({ step, j }) =>
          j === 0 || step.value?.trim() || activity.nodes[step.nodeId]?.type === 'rhombus',
      )
      .map(({ step, j }) => ({ nodeId: step.nodeId, text: stepText(step, j) }))
    const key = steps.map((s) => s.text).join(' → ')
    if (seen.has(key)) continue
    seen.add(key)
    shown.push(steps)
  }

  return (
    <div data-testid="sequence-paths" className="tricc-sequence-paths text-sm">
      <h3>Paths leading here</h3>
      <p>
        {sequenceDriven
          ? 'Sequence-driven: with no expression, this is true when one of these paths was followed.'
          : 'Reached when one of these paths was followed (decision points only).'}
      </p>
      {paths.length === 0 ? (
        <p className="text-muted-foreground italic">Every path leading here goes through a loop.</p>
      ) : (
        <ol className="list-decimal pl-5">
          {shown.map((path, i) => (
            <li key={i} data-testid="sequence-path">
              {path.map((step, j) => (
                <Fragment key={`${step.nodeId}-${j}`}>
                  {j > 0 && ' → '}
                  {onReveal ? (
                    <button
                      type="button"
                      className="underline"
                      onClick={() => onReveal(activityId, step.nodeId)}
                    >
                      {step.text}
                    </button>
                  ) : (
                    step.text
                  )}
                </Fragment>
              ))}
            </li>
          ))}
        </ol>
      )}
      {more && <p className="text-muted-foreground">There are more paths than these.</p>}
    </div>
  )
}
