import { createContext, useContext, useState } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import {
  hasInternalName,
  isSequenceNode,
  resolve,
  type NodeType,
  type TriccNode as Model,
} from '@tricc/core'
import { NODE_OUT_HANDLE, answerHandleId, answerLabel, optionCode } from './answer.js'
import { drawnShape, visualFor } from './node-visuals.js'
import { useEditorPreferences } from '../../runtime/context.js'
import { useImageUrl } from '../../media/images.js'
import { FollowIcon } from '../../components/Dialog.js'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../components/ui/hover-card.js'

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
  const { diagramStyle } = useEditorPreferences()
  const follow = useContext(FollowContext)
  const display = activityTitle ?? displayText(model, lang, conceptDisplay)
  const answers =
    model.type === 'select_one' || model.type === 'select_multiple' ? (model.options ?? []) : []
  const confirm = model.type === 'acknowledge'
  const stacked = answers.length > 0 || confirm
  // Controlled so a press (the start of a drag) closes the card instead of dragging it along.
  const [details, setDetails] = useState(false)

  const head = (
    <>
      <span className="tricc-node__glyph" aria-hidden="true">
        {visual.glyph}
      </span>
      <span className="tricc-node__body">
        <span className="tricc-node__label" data-testid={`node-${model.id}-label`}>
          {display}
        </span>
        {model.concept && <span className="tricc-node__code">{model.concept.code}</span>}
        {!model.concept &&
          model.name &&
          display !== model.name &&
          !hasInternalName(model.type as NodeType) && (
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
    <HoverCard open={details} onOpenChange={setDetails} openDelay={500} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          className={[
            'tricc-node',
            `tricc-node--${drawnShape(visual.shape, diagramStyle)}`,
            `tricc-node--${visual.group}`,
            answers.length > 0 ? 'tricc-node--answers' : '',
            confirm ? 'tricc-node--acknowledge' : '',
            selected ? 'is-selected' : '',
            severity ? `has-${severity}` : '',
          ]
            .filter(Boolean)
            .join(' ')}
          data-testid={`node-${model.id}`}
          data-node-type={model.type}
          data-severity={severity ?? 'none'}
          onPointerDown={() => setDetails(false)}
        >
          {visual.targets && <Handle type="target" position={Position.Top} />}

          {data.picture && <NodePicture id={data.picture} nodeId={model.id} />}

          {stacked ? <div className="tricc-node__head">{head}</div> : head}

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

          {confirm && (
            <div className="tricc-node__confirm" data-testid={`node-${model.id}-acknowledge`}>
              <span className="tricc-node__radio" aria-hidden="true" />
              <span>OK. Please continue.</span>
            </div>
          )}

          {(data.hint || data.help) && (
            <span className="tricc-node__marks">
              {data.hint && (
                <span
                  className="tricc-node__mark tricc-node__mark--hint"
                  data-testid={`node-${model.id}-hint`}
                  title={`Hint: ${data.hint}`}
                >
                  !
                </span>
              )}
              {data.help && (
                <span
                  className="tricc-node__mark tricc-node__mark--help"
                  data-testid={`node-${model.id}-help`}
                  title={`Help: ${data.help}`}
                >
                  ?
                </span>
              )}
            </span>
          )}

          {visual.sources && (
            <Handle
              type="source"
              id={NODE_OUT_HANDLE}
              position={Position.Bottom}
              title="Link onward"
            />
          )}
        </div>
      </HoverCardTrigger>
      <NodeDetails model={model} display={display} />
    </HoverCard>
  )
}

/** What the node's hover card shows: its type, then the label, name and concept code. */
function NodeDetails({ model, display }: { model: Model; display: string }) {
  const rows: [string, string | undefined][] = [
    ['Label', display],
    ['Name', model.name],
    ['Code', model.concept?.code],
  ]
  return (
    <HoverCardContent
      side="top"
      className="w-72 p-3 text-xs"
      data-testid={`node-${model.id}-details`}
      // Keep the canvas from treating clicks in the card as clicks on the pane.
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="mb-2 font-medium text-muted-foreground">{model.type}</div>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {rows.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className={value ? 'm-0 break-words' : 'm-0 text-muted-foreground italic'}>
              {value || 'None'}
            </dd>
          </div>
        ))}
      </dl>
    </HoverCardContent>
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
      {url ? (
        <img src={url} alt="" draggable={false} />
      ) : (
        <span title="Not in the image library">[{id}]</span>
      )}
    </div>
  )
}
