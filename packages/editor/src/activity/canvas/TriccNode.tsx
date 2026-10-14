import { createContext, useContext } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { hasInternalName, isSequenceNode, resolve, type NodeType, type TriccNode as Model } from '@tricc/core'
import { NODE_OUT_HANDLE, answerHandleId, answerLabel, optionCode } from './answer.js'
import { visualFor } from './node-visuals.js'
import { useImageUrl } from '../../media/images.js'
import { FollowIcon } from '../../components/Dialog.js'

/**
 * Opens the activity a goto goes to. Provided by the canvas, so the node data stays plain
 * and the follow button is absent where nothing can open another activity.
 */
export const FollowContext = createContext<((activityId: string) => void) | undefined>(undefined)

export type TriccFlowNode = Node<
  {
    model: Model
    lang: string
    /** Highest severity attached to this node, or undefined when clean. */
    severity?: 'error' | 'warning'
    conceptDisplay?: string
    /** The hint and help a health worker sees (from the concept, or still on the node). */
    hint?: string
    help?: string
    /** Answer texts by option id, resolved from their concepts. */
    answerTexts?: Record<string, string>
    /** The first picture of the questionnaire text, by image id. */
    picture?: string
    /** The same for each answer, by option id. */
    answerPictures?: Record<string, string>
    /** On the root node: the activity title. The start node is the activity. */
    activityTitle?: string
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
  const { model, lang, severity, conceptDisplay, activityTitle, missing } = data
  const visual = visualFor(model.type as NodeType)
  const follow = useContext(FollowContext)
  const display = activityTitle ?? displayText(model, lang, conceptDisplay)
  const answers =
    model.type === 'select_one' || model.type === 'select_multiple' ? (model.options ?? []) : []

  const head = (
    <>
      <span className="tricc-node__glyph" aria-hidden="true">
        {visual.glyph}
      </span>
      <span className="tricc-node__body">
        <span
          className="tricc-node__label"
          data-testid={`node-${model.id}-label`}
          title={typeof display === 'string' ? display : undefined}
        >
          {display}
        </span>
        {model.concept && <span className="tricc-node__code">{model.concept.code}</span>}
        {!model.concept && model.name && display !== model.name && !hasInternalName(model.type as NodeType) && (
          <span className="tricc-node__code">{model.name}</span>
        )}
      </span>
      <span className="tricc-node__badges">
        {model.notAvailable && <span className="tricc-badge">Not available</span>}
        {model.repeat !== undefined && model.repeat !== 1 && (
          <span className="tricc-badge" data-testid={`node-${model.id}-repeat`}>
            Repeat {model.repeat}
          </span>
        )}
        {model.instance !== undefined && model.instance !== 1 && (
          <span className="tricc-badge" data-testid={`node-${model.id}-instance`}>
            Instance {model.instance}
          </span>
        )}
        {follow && model.type === 'goto' && model.link && !missing && (
          <button
            type="button"
            // Not a drag or pan handle: a click here opens the activity, nothing else.
            className="tricc-node__follow nodrag nopan"
            data-testid={`goto-follow-${model.id}`}
            aria-label="Open the activity this goes to"
            title="Open the activity this goes to"
            onClick={(event) => {
              event.stopPropagation()
              follow(model.link!)
            }}
          >
            <FollowIcon />
          </button>
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

      {data.picture && <NodePicture id={data.picture} nodeId={model.id} />}

      {answers.length > 0 ? <div className="tricc-node__head">{head}</div> : head}

      {answers.length > 0 && (
        <ul className="tricc-node__answers">
          {answers.map((option) => {
            const text = data.answerTexts?.[option.id] ?? answerLabel(option, lang)
            return (
              <li
                key={option.id}
                className="tricc-node__answer"
                data-testid={`node-${model.id}-answer-${option.id}`}
                data-answer={optionCode(option)}
                data-option-id={option.id}
              >
                <span className="tricc-node__answer-label" title={text}>
                  {text}
                </span>
                {option.is_none && (
                  <span
                    className="tricc-badge tricc-node__answer-none"
                    data-testid={`node-${model.id}-answer-${option.id}-none`}
                    title="None of these: choosing it means none of the other answers applies"
                  >
                    none
                  </span>
                )}
                {data.answerPictures?.[option.id] && (
                  <span
                    className="tricc-node__answer-picture"
                    data-testid={`node-${model.id}-answer-${option.id}-picture`}
                    title={`Picture: ${data.answerPictures[option.id]}`}
                    aria-label="Has a picture"
                  >
                    ▣
                  </span>
                )}
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

      {(data.hint || data.help) && (
        <span className="tricc-node__marks">
          {data.hint && (
            <span className="tricc-node__mark tricc-node__mark--hint" data-testid={`node-${model.id}-hint`} title={`Hint: ${data.hint}`}>
              !
            </span>
          )}
          {data.help && (
            <span className="tricc-node__mark tricc-node__mark--help" data-testid={`node-${model.id}-help`} title={`Help: ${data.help}`}>
              ?
            </span>
          )}
        </span>
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

/** The first picture of the node's text, small, on top. It never makes the node wider. */
function NodePicture({ id, nodeId }: { id: string; nodeId: string }) {
  const url = useImageUrl(id)
  return (
    <div className="tricc-node__picture" data-testid={`node-${nodeId}-picture`} data-image={id}>
      {url ? <img src={url} alt="" draggable={false} /> : <span title="Not in the image library">[{id}]</span>}
    </div>
  )
}
