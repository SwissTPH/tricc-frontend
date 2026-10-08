import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { isSequenceNode, resolve, type NodeType, type TriccNode as Model } from '@tricc/core'
import { NODE_OUT_HANDLE, answerHandleId, answerLabel, optionCode } from './answer.js'
import { visualFor } from './node-visuals.js'

export type TriccFlowNode = Node<
  {
    model: Model
    lang: string
    /** Highest severity attached to this node, or undefined when clean. */
    severity?: 'error' | 'warning'
    conceptDisplay?: string
    /** Goto whose target activity is not in this project. */
    missing?: boolean
  },
  'tricc'
>

/**
 * A node on the canvas.
 *
 * Display text follows the concept-inheritance rule: non-sequence nodes show their bound
 * concept's display, sequence anchors keep their own label
 * (feature/20260825-activity-editor.md §3).
 */
export function TriccNodeView({ data, selected }: NodeProps<TriccFlowNode>) {
  const { model, lang, severity, conceptDisplay, missing } = data
  const visual = visualFor(model.type as NodeType)
  const display = displayText(model, lang, conceptDisplay)
  const answers =
    model.type === 'select_one' || model.type === 'select_multiple' ? (model.options ?? []) : []

  const head = (
    <>
      <span className="tricc-node__glyph" aria-hidden="true">
        {visual.glyph}
      </span>
      <span className="tricc-node__body">
        <span className="tricc-node__label">{display}</span>
        {model.concept && <span className="tricc-node__code">{model.concept.code}</span>}
        {!model.concept && model.name && display !== model.name && (
          <span className="tricc-node__code">{model.name}</span>
        )}
      </span>
      <span className="tricc-node__badges">
        {model.notAvailable && <span className="tricc-badge">Not available</span>}
        {model.hint && <span className="tricc-badge">Hint</span>}
        {model.help && <span className="tricc-badge">Help</span>}
        {model.repeat !== undefined && model.repeat !== 1 && (
          <span className="tricc-badge">Repeat {model.repeat}</span>
        )}
        {missing && (
          <span className="tricc-badge" data-testid="goto-missing">
            <span aria-hidden="true">⚠ </span>
            Missing activity
          </span>
        )}
        {severity && (
          <span className={`tricc-badge tricc-badge--${severity}`}>
            {severity === 'error' ? 'Error' : 'Warning'}
          </span>
        )}
      </span>
    </>
  )

  return (
    <div
      className={[
        'tricc-node',
        `tricc-node--${visual.shape}`,
        `tricc-node--${visual.group}`,
        answers.length > 0 ? 'tricc-node--answers' : '',
        selected ? 'is-selected' : '',
        severity ? `has-${severity}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={`node-${model.id}`}
      data-node-type={model.type}
      data-severity={severity ?? 'none'}
      title={`${model.type}${model.name ? ` — ${model.name}` : ''}`}
    >
      {visual.targets && <Handle type="target" position={Position.Top} />}

      {answers.length > 0 ? <div className="tricc-node__head">{head}</div> : head}

      {answers.length > 0 && (
        <ul className="tricc-node__answers">
          {answers.map((option) => {
            const text = answerLabel(option, lang)
            return (
              <li
                key={option.id}
                className="tricc-node__answer"
                data-testid={`node-${model.id}-answer-${option.id}`}
                data-answer={optionCode(option)}
              >
                <span className="tricc-node__answer-label" title={text}>
                  {text}
                </span>
                <Handle
                  type="source"
                  id={answerHandleId(option.id)}
                  position={Position.Right}
                  title={`Link from ${text}`}
                />
              </li>
            )
          })}
        </ul>
      )}

      {visual.sources && (
        <Handle type="source" id={NODE_OUT_HANDLE} position={Position.Bottom} title="Link onward" />
      )}
    </div>
  )
}

function displayText(model: Model, lang: string, conceptDisplay: string | undefined): string {
  const label = resolve(model.label, lang, lang)
  // Sequence anchors keep their own label; everything else inherits its concept's display.
  if (isSequenceNode(model.type as NodeType)) return label ?? model.name ?? model.type
  return conceptDisplay ?? label ?? model.name ?? model.type
}
