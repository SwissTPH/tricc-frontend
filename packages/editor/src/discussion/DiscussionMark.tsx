import type { DiscussCounts } from './marks.js'
import { countsOnActivity } from './marks.js'
import { useProjectSnapshot } from '../runtime/context.js'

/** The open dot and the pending ring. A click selects the element and opens its discussions. */
export function DiscussionMark({ counts, onOpen }: { counts: DiscussCounts; onOpen: () => void }) {
  return (
    <button
      type="button"
      className="tricc-discuss-marks nodrag nopan"
      title={counts.latest}
      data-testid="discussion-mark"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        onOpen()
      }}
    >
      {counts.open > 0 && (
        <span className="tricc-discuss-marks__open" data-testid="discussion-mark-open">
          {counts.open}
        </span>
      )}
      {counts.pending > 0 && (
        <span className="tricc-discuss-marks__pending" data-testid="discussion-mark-pending">
          {counts.pending}
        </span>
      )}
    </button>
  )
}

/** The same two marks beside an activity on the project overview. No composer there. */
export function ActivityDiscussMarks({ activityId }: { activityId: string }) {
  const project = useProjectSnapshot()
  const counts = countsOnActivity(project, activityId)
  if (!counts) return null
  return (
    <span className="tricc-process-row__marks" data-testid={`activity-marks-${activityId}`}>
      {counts.open > 0 && (
        <span className="tricc-discuss-marks__open" title="Open discussions">
          {counts.open}
        </span>
      )}
      {counts.pending > 0 && (
        <span className="tricc-discuss-marks__pending" title="Pending discussions">
          {counts.pending}
        </span>
      )}
    </span>
  )
}
