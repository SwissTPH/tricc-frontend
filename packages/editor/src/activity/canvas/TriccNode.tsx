import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { isSequenceNode, resolve, type NodeType, type TriccNode as Model } from '@tricc/core'
import { visualFor } from './node-visuals.js'

export type TriccFlowNode = Node<
  {
    model: Model
    lang: string
    /** Highest severity attached to this node, or undefined when clean. */
    severity?: 'error' | 'warning'
    conceptDisplay?: string
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
  const { model, lang, severity, conceptDisplay } = data
  const visual = visualFor(model.type as NodeType)
  const display = displayText(model, lang, conceptDisplay)

  return (
    <div
      className={[
        'tricc-node',
        `tricc-node--${visual.shape}`,
        `tricc-node--${visual.group}`,
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
        {model.notAvailable && (
          <span className="tricc-badge" title="Adds a branchable “not available” output">
            ∅
          </span>
        )}
        {model.hint && (
          <span className="tricc-badge" title="Has a hint">
            i
          </span>
        )}
        {model.help && (
          <span className="tricc-badge" title="Has a help message">
            ?
          </span>
        )}
        {model.repeat !== undefined && model.repeat !== 1 && (
          <span className="tricc-badge" title={`Repeat slot ${model.repeat}`}>
            R{model.repeat}
          </span>
        )}
        {severity && (
          <span className={`tricc-badge tricc-badge--${severity}`} title={severity}>
            {severity === 'error' ? '!' : '△'}
          </span>
        )}
      </span>

      {visual.sources && <Handle type="source" position={Position.Bottom} />}
    </div>
  )
}

function displayText(model: Model, lang: string, conceptDisplay: string | undefined): string {
  const label = resolve(model.label, lang, lang)
  // Sequence anchors keep their own label; everything else inherits its concept's display.
  if (isSequenceNode(model.type as NodeType)) return label ?? model.name ?? model.type
  return conceptDisplay ?? label ?? model.name ?? model.type
}
