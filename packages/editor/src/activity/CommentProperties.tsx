import { COMMENT_COLORS, resolve, type Activity, type CanvasComment, type CommentColor } from '@tricc/core'
import { useMutate } from '../runtime/context.js'

const COLOR_LABEL: Record<CommentColor, string> = {
  yellow: 'Yellow',
  blue: 'Blue',
  green: 'Green',
  pink: 'Pink',
  grey: 'Grey',
}

/** A comment's details: its text, its colour, and the node it is about. */
export function CommentProperties({
  activityId,
  activity,
  comment,
  lang,
  readOnly,
  onDeleted,
}: {
  activityId: string
  activity: Activity
  comment: CanvasComment
  lang: string
  readOnly: boolean
  onDeleted: () => void
}) {
  const mutate = useMutate()
  const update = (patch: Partial<CanvasComment>) => {
    const next = { ...comment, ...patch }
    if (patch.node === undefined && 'node' in patch) delete next.node
    mutate((tx) => tx.setComment(activityId, next))
  }
  return (
    <section aria-labelledby="comment-heading" data-testid="comment-properties">
      <h2 id="comment-heading">Comment</h2>
      <p>Only on the drawing, for authors. It is not part of the guideline and is never converted.</p>
      <label htmlFor="comment-text">Text</label>
      <textarea
        id="comment-text"
        data-testid="comment-text"
        rows={4}
        value={comment.text}
        disabled={readOnly}
        onChange={(e) => update({ text: e.target.value })}
      />
      <label htmlFor="comment-color">Colour</label>
      <select
        id="comment-color"
        data-testid="comment-color"
        value={comment.color}
        disabled={readOnly}
        onChange={(e) => update({ color: e.target.value as CommentColor })}
      >
        {COMMENT_COLORS.map((c) => (
          <option key={c} value={c}>
            {COLOR_LABEL[c]}
          </option>
        ))}
      </select>
      <label htmlFor="comment-node">About</label>
      <select
        id="comment-node"
        data-testid="comment-node"
        value={comment.node ?? ''}
        disabled={readOnly}
        onChange={(e) => update({ node: e.target.value || undefined })}
      >
        <option value="">Nothing in particular</option>
        {activity.nodeOrder.map((id) => {
          const n = activity.nodes[id]
          if (!n) return null
          return (
            <option key={id} value={id}>
              {resolve(n.label, lang, lang) ?? n.name ?? n.type} ({n.type})
            </option>
          )
        })}
      </select>
      <p>Or drag from the comment's handle onto a node. The line it draws is not an edge.</p>
      {!readOnly && (
        <button
          type="button"
          className="tricc-danger-text"
          data-testid="comment-delete"
          onClick={() => {
            mutate((tx) => tx.removeComment(activityId, comment.id))
            onDeleted()
          }}
        >
          Delete comment
        </button>
      )}
    </section>
  )
}
