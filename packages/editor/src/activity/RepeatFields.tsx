import type { TriccNode } from '@tricc/core'

/**
 * `repeat` and `instance` of a node (docs/tricc-elements.md in tricc_oo, "Instance vs repeat"):
 * a repeat collects again in a new slot, an instance is the same collection reached at several
 * points (collected once, reused). Empty means the default, 1.
 */
export function RepeatFields({
  node,
  readOnly,
  idPrefix,
  onChange,
}: {
  node: TriccNode
  readOnly: boolean
  /** Keeps the ids unique when the node panel and a dialog show the fields at once. */
  idPrefix: string
  onChange: (patch: Pick<TriccNode, 'repeat' | 'instance'>) => void
}) {
  const number = (value: string) => (value === '' ? undefined : Math.trunc(Number(value)))
  const goto = node.type === 'goto'
  const start = node.type === 'activity_start'
  return (
    <>
      <label htmlFor={`${idPrefix}-repeat`}>Repeat</label>
      <input
        id={`${idPrefix}-repeat`}
        type="number"
        min={-1}
        step={1}
        placeholder="1"
        data-testid="field-repeat"
        value={node.repeat ?? ''}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={(e) => onChange({ repeat: number(e.target.value) })}
      />
      <p data-testid="field-repeat-help">
        {start
          ? 'Collect every value of this activity again: 2, 3… for a new slot.'
          : goto
            ? 'Run the activity again, collecting its values afresh: 2, 3… for a new slot.'
            : 'Ask again even if already collected: 2, 3… for a new slot.'}{' '}
        -1 collects it here only, inheriting nothing.
      </p>
      <label htmlFor={`${idPrefix}-instance`}>Instance</label>
      <input
        id={`${idPrefix}-instance`}
        type="number"
        min={-1}
        step={1}
        placeholder="1"
        data-testid="field-instance"
        value={node.instance ?? ''}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={(e) => onChange({ instance: number(e.target.value) })}
      />
      <p data-testid="field-instance-help">
        {goto
          ? 'Which copy of the activity: the same number shares it, 0 makes a new one each time, -1 puts its nodes here.'
          : 'The same collection reached at several points: collected once, then reused. It is not repeated with its activity.'}
      </p>
    </>
  )
}
