import { useEffect, useMemo, useState } from 'react'
import {
  anchorKey,
  anchorKindName,
  decisionLog,
  decisionLogCsv,
  decisionLogMarkdown,
  DEFAULT_DISCUSSION_LABELS,
  parseCommentText,
  resolveAnchor,
  type Anchor,
  type Discussion,
  type DiscussionEvent,
  type DiscussionLabel,
  type DiscussionStatus,
  type TextPart,
} from '@tricc/core'
import {
  useCapability,
  useOpenProject,
  useProjectSnapshot,
  useRuntime,
} from '../runtime/context.js'
import { discussionsAbout } from './marks.js'
import { Button } from '../components/ui/button.js'
import { Textarea } from '../components/ui/textarea.js'

const STATUS_NAME: Record<DiscussionStatus, string> = {
  open: 'Open',
  pending: 'Pending',
  resolved: 'Resolved',
  wont_change: "Won't change",
}

export function DiscussionSection({ anchor, focusId }: { anchor: Anchor; focusId?: string }) {
  const project = useProjectSnapshot()
  const threads = discussionsAbout(project, anchor)
  const removed = resolveAnchor(project, anchor) === undefined && anchor.kind !== 'project'
  return (
    <section className="tricc-discussion" data-testid="discussion-section">
      {removed && (
        <p className="tricc-discussion__removed" data-testid="discussion-removed">
          This element was removed. The discussion keeps its name.
        </p>
      )}
      {threads.map((thread) => (
        <Thread key={thread.id} discussion={thread} highlight={thread.id === focusId} />
      ))}
      {threads.length === 0 && <p>No discussion yet.</p>}
      <Composer anchor={anchor} />
    </section>
  )
}

function Thread({ discussion, highlight }: { discussion: Discussion; highlight?: boolean }) {
  const project = useProjectSnapshot()
  const canWrite = useCapability('comment.write')
  const removed =
    resolveAnchor(project, discussion.about) === undefined && discussion.about.kind !== 'project'
  const labels = project.discussionLabels ?? []
  const category = labels.find((label) => label.id === discussion.labels[0])
  return (
    <article
      className="tricc-discussion__thread"
      data-testid={`discussion-${discussion.id}`}
      data-highlight={highlight ? 'true' : undefined}
    >
      <header className="tricc-discussion__meta">
        {discussion.status === 'open' && <span className="tricc-discuss-marks__open">1</span>}
        {discussion.status === 'pending' && <span className="tricc-discuss-marks__pending">1</span>}
        <span
          className={
            settled(discussion) ? 'tricc-discussion__status is-settled' : 'tricc-discussion__status'
          }
        >
          {STATUS_NAME[discussion.status]}
        </span>
        {category && <CategoryName label={category} />}
      </header>
      {removed && <p className="tricc-discussion__removed">Element removed · {discussion.label}</p>}
      <ol>
        {merged(discussion).map((item) =>
          item.kind === 'comment' ? (
            <CommentLine
              key={item.comment.id}
              discussionId={discussion.id}
              comment={item.comment}
            />
          ) : (
            <li
              key={`${item.event.at}-${item.event.status ?? ''}-${item.event.labels?.join(',') ?? ''}`}
            >
              {eventText(item.event)}
            </li>
          ),
        )}
      </ol>
      {discussion.resolution?.note && <p>Decision: {discussion.resolution.note}</p>}
      {canWrite && <StatusControl discussion={discussion} />}
      {canWrite && discussion.status !== 'resolved' && discussion.status !== 'wont_change' && (
        <Composer discussionId={discussion.id} />
      )}
      {canWrite && <Discard discussion={discussion} />}
    </article>
  )
}

function CommentLine({
  discussionId,
  comment,
}: {
  discussionId: string
  comment: Discussion['comments'][number]
}) {
  const runtime = useRuntime()
  const open = useOpenProject()
  const canWrite = useCapability('comment.write')
  const mine = comment.author.id === runtime.identity.current().id
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(comment.text ?? '')
  const [error, setError] = useState<string | undefined>()
  if (comment.deleted) return <li>Comment removed</li>
  const save = async () => {
    setError(undefined)
    try {
      await runtime.discussion.edit(open, discussionId, comment.id, text)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <li>
      <span>
        {comment.author.name} · {when(comment.at)}
        {comment.edited ? ' · edited' : ''}
      </span>
      {editing ? (
        <>
          <Textarea value={text} onChange={(event) => setText(event.target.value)} />
          <Button type="button" size="sm" onClick={() => void save()}>
            Save
          </Button>
        </>
      ) : (
        <p>{comment.text ? <CommentText text={comment.text} /> : null}</p>
      )}
      {canWrite && mine && !editing && (
        <>
          <Button type="button" variant="link" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Remove discussionId={discussionId} commentId={comment.id} />
        </>
      )}
      {error && <p>{error}</p>}
    </li>
  )
}

function Remove({ discussionId, commentId }: { discussionId: string; commentId: string }) {
  const runtime = useRuntime()
  const open = useOpenProject()
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      onClick={() => void runtime.discussion.remove(open, discussionId, commentId)}
    >
      Remove
    </Button>
  )
}

function CommentText({ text }: { text: string }) {
  return (
    <>
      {parseCommentText(text).map((part, index) => (
        <Part key={index} part={part} />
      ))}
    </>
  )
}

function Part({ part }: { part: TextPart }) {
  if (part.type === 'link') {
    return (
      <a href={part.href} rel="noopener noreferrer nofollow" target="_blank">
        {part.href}
      </a>
    )
  }
  if (part.type === 'mention') return <span className="tricc-discussion__mention">{part.name}</span>
  return <>{part.text}</>
}

function settled(discussion: Discussion): boolean {
  return discussion.status === 'resolved' || discussion.status === 'wont_change'
}

function CategoryName({ label }: { label: DiscussionLabel }) {
  return (
    <span className={`tricc-discuss-chip tricc-discuss-chip--${label.color}`}>{label.name}</span>
  )
}

function CategoryChoices({
  labels,
  picked,
  onPick,
}: {
  labels: DiscussionLabel[]
  picked: string
  onPick: (id: string) => void
}) {
  return (
    <div className="tricc-discussion__chips" role="radiogroup" aria-label="Category">
      {labels.map((label) => (
        <button
          key={label.id}
          type="button"
          role="radio"
          aria-checked={picked === label.id}
          data-testid={`discussion-category-${label.id}`}
          className={
            picked === label.id
              ? `tricc-discuss-chip is-selected tricc-discuss-chip--${label.color}`
              : `tricc-discuss-chip tricc-discuss-chip--${label.color}`
          }
          onClick={() => onPick(label.id)}
        >
          {label.name}
        </button>
      ))}
    </div>
  )
}

function StatusControl({ discussion }: { discussion: Discussion }) {
  const runtime = useRuntime()
  const open = useOpenProject()
  const [choice, setChoice] = useState<DiscussionStatus | undefined>(undefined)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>()
  const needsNote = choice === 'resolved' || choice === 'wont_change'
  const apply = async (status: DiscussionStatus, resolution?: string) => {
    setError(undefined)
    try {
      await runtime.discussion.setStatus(open, discussion.id, status, resolution)
      setChoice(undefined)
      setNote('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <div>
      <label>
        Status
        <select
          data-testid={`discussion-status-${discussion.id}`}
          value={choice ?? discussion.status}
          onChange={(event) => {
            const status = event.target.value as DiscussionStatus
            if (status === 'resolved' || status === 'wont_change') setChoice(status)
            else void apply(status)
          }}
        >
          {(Object.keys(STATUS_NAME) as DiscussionStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_NAME[status]}
            </option>
          ))}
        </select>
      </label>
      {needsNote && choice && (
        <>
          <Textarea
            data-testid="discussion-note"
            value={note}
            placeholder={choice === 'wont_change' ? 'Why it will not change' : 'Note, optional'}
            onChange={(event) => setNote(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            data-testid="discussion-confirm-status"
            disabled={choice === 'wont_change' && note.trim() === ''}
            onClick={() => void apply(choice, note)}
          >
            Save status
          </Button>
        </>
      )}
      {error && <p>{error}</p>}
    </div>
  )
}

function Discard({ discussion }: { discussion: Discussion }) {
  const runtime = useRuntime()
  const open = useOpenProject()
  const mine = discussion.comments[0]?.author.id === runtime.identity.current().id
  const answered = discussion.comments.some(
    (comment) => !comment.deleted && comment.author.id !== discussion.comments[0]?.author.id,
  )
  if (!mine || answered) return null
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      onClick={() => void runtime.discussion.discard(open, discussion.id)}
    >
      Remove discussion
    </Button>
  )
}

function Composer({ anchor, discussionId }: { anchor?: Anchor; discussionId?: string }) {
  const runtime = useRuntime()
  const open = useOpenProject()
  const project = useProjectSnapshot()
  const canWrite = useCapability('comment.write')
  const labels = project.discussionLabels?.length
    ? project.discussionLabels
    : DEFAULT_DISCUSSION_LABELS
  const [text, setText] = useState('')
  const [picked, setPicked] = useState(labels[0]?.id ?? 'question')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | undefined>()
  const current = runtime.identity.current()
  const needsName = current.displayName === 'Local author' && Boolean(runtime.identity.update)
  if (!canWrite) return null
  const send = async () => {
    const body = text.trim()
    if (!body) return
    setError(undefined)
    try {
      if (needsName) {
        const chosen = name.trim()
        if (!chosen) {
          setError('A comment is signed with your name.')
          return
        }
        runtime.identity.update?.({ displayName: chosen })
      }
      if (discussionId) await runtime.discussion.reply(open, discussionId, body)
      else if (anchor) await runtime.discussion.start(open, anchor, body, [picked])
      setText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <div
      className="tricc-discussion__composer"
      data-testid={discussionId ? 'discussion-reply' : 'discussion-composer'}
    >
      {!discussionId && <span className="tricc-discussion__start">Start a discussion</span>}
      {needsName && (
        <label>
          Your name
          <input
            value={name}
            data-testid="discussion-name"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
      )}
      <Textarea
        data-testid="discussion-text"
        value={text}
        placeholder={discussionId ? 'Reply' : 'Write the question…'}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            void send()
          }
        }}
      />
      {!discussionId && <CategoryChoices labels={labels} picked={picked} onPick={setPicked} />}
      <Button type="button" size="sm" data-testid="discussion-send" onClick={() => void send()}>
        {discussionId ? 'Reply' : 'Start discussion'}
      </Button>
      {error && <p data-testid="discussion-error">{error}</p>}
    </div>
  )
}

type Row =
  | { kind: 'comment'; at: string; comment: Discussion['comments'][number] }
  | { kind: 'event'; at: string; event: DiscussionEvent }

function merged(discussion: Discussion): Row[] {
  const rows: Row[] = [
    ...discussion.comments.map((comment) => ({
      kind: 'comment' as const,
      at: comment.at,
      comment,
    })),
    ...discussion.events
      .filter((event) => event.status || 'assignee' in event)
      .map((event) => ({ kind: 'event' as const, at: event.at, event })),
  ]
  return rows.sort((a, b) => a.at.localeCompare(b.at))
}

function eventText(event: DiscussionEvent): string {
  if (event.status) return `${event.by.name} set the status to ${STATUS_NAME[event.status]}`
  if (event.labels) return `${event.by.name} changed the labels`
  if ('assignee' in event) {
    return event.assignee
      ? `${event.by.name} assigned ${event.assignee.name}`
      : `${event.by.name} cleared the assignee`
  }
  return `${event.by.name} updated the discussion`
}

function when(at: string): string {
  return at.replace('T', ' ').slice(0, 16)
}

export function DiscussionsPanel({
  onClose,
  onShow,
}: {
  onClose: () => void
  onShow: (anchor: Anchor, discussionId: string) => void
}) {
  const project = useProjectSnapshot()
  const me = useRuntime().identity.current().id
  const [status, setStatus] = useState<DiscussionStatus | ''>('')
  const [label, setLabel] = useState('')
  const [removedOnly, setRemovedOnly] = useState(false)
  const [mine, setMine] = useState(false)
  const [query, setQuery] = useState('')
  const [since, setSince] = useState('')
  const [openId, setOpenId] = useState<string | undefined>(undefined)
  const labels = project.discussionLabels ?? []
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return Object.values(project.discussions ?? {})
      .filter((discussion) => (status ? discussion.status === status : true))
      .filter((discussion) => (label ? discussion.labels.includes(label) : true))
      .filter((discussion) =>
        removedOnly ? resolveAnchor(project, discussion.about) === undefined : true,
      )
      .filter((discussion) => (mine ? discussion.comments[0]?.author.id === me : true))
      .filter((discussion) =>
        needle
          ? `${discussion.label} ${discussion.comments.map((comment) => comment.text ?? '').join(' ')}`
              .toLowerCase()
              .includes(needle)
          : true,
      )
      .sort((a, b) => (b.comments.at(-1)?.at ?? '').localeCompare(a.comments.at(-1)?.at ?? ''))
  }, [label, me, mine, project, query, removedOnly, status])
  const openCount = Object.values(project.discussions ?? {}).filter(
    (discussion) => discussion.status === 'open',
  ).length
  const download = (kind: 'md' | 'csv') => {
    const log = decisionLog(project, since ? { since: new Date(since).toISOString() } : undefined)
    const text = kind === 'md' ? decisionLogMarkdown(project, log) : decisionLogCsv(log)
    const blob = new Blob([text], { type: kind === 'md' ? 'text/markdown' : 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${project.id}-decisions-${new Date().toISOString().slice(0, 10)}.${kind === 'md' ? 'md' : 'csv'}`
    link.click()
    URL.revokeObjectURL(url)
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      className="tricc-library-modal"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="tricc-discussion-panel"
        data-testid="discussions-panel"
        role="dialog"
        aria-label="Discussions"
      >
        <header>
          <h2>Discussions{openCount > 0 ? ` · ${openCount} open` : ''}</h2>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </header>
        <div className="tricc-discussion-panel__filters">
          <input
            data-testid="discussions-search"
            placeholder="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as DiscussionStatus | '')}
          >
            <option value="">Any status</option>
            {(Object.keys(STATUS_NAME) as DiscussionStatus[]).map((item) => (
              <option key={item} value={item}>
                {STATUS_NAME[item]}
              </option>
            ))}
          </select>
          <select value={label} onChange={(event) => setLabel(event.target.value)}>
            <option value="">Any label</option>
            {labels.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <label>
            <input
              type="checkbox"
              checked={removedOnly}
              onChange={(event) => setRemovedOnly(event.target.checked)}
            />
            Element removed
          </label>
          <label>
            <input
              type="checkbox"
              checked={mine}
              onChange={(event) => setMine(event.target.checked)}
            />
            Started by me
          </label>
        </div>
        <ul>
          {rows.map((discussion) => (
            <li key={discussion.id}>
              <button
                type="button"
                data-testid={`discussion-row-${discussion.id}`}
                onClick={() => setOpenId(discussion.id)}
              >
                {anchorKindName(discussion.about.kind)} · {discussion.label} ·{' '}
                {STATUS_NAME[discussion.status]}
              </button>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => onShow(discussion.about, discussion.id)}
              >
                Show
              </Button>
            </li>
          ))}
        </ul>
        {openId && project.discussions?.[openId] && (
          <Thread discussion={project.discussions[openId]} highlight />
        )}
        <div>
          <label>
            Decisions since
            <input type="date" value={since} onChange={(event) => setSince(event.target.value)} />
          </label>
          <Button
            type="button"
            size="sm"
            data-testid="download-decisions-md"
            onClick={() => download('md')}
          >
            Download Markdown
          </Button>
          <Button
            type="button"
            size="sm"
            data-testid="download-decisions-csv"
            onClick={() => download('csv')}
          >
            Download CSV
          </Button>
        </div>
      </div>
    </div>
  )
}

export function DiscussionsButton({
  onShow,
}: {
  onShow: (anchor: Anchor, discussionId: string) => void
}) {
  const project = useProjectSnapshot()
  const canRead = useCapability('comment.read')
  const [open, setOpen] = useState(false)
  const all = Object.values(project.discussions ?? {})
  const openCount = all.filter((discussion) => discussion.status === 'open').length
  const pendingCount = all.filter((discussion) => discussion.status === 'pending').length
  if (!canRead) return null
  return (
    <>
      <button
        type="button"
        className="tricc-discuss-button"
        data-testid="discussions-button"
        onClick={() => setOpen(true)}
      >
        Discussions
        {openCount > 0 && <span className="tricc-discuss-button__open"> {openCount} open</span>}
        {pendingCount > 0 && (
          <span className="tricc-discuss-button__pending"> · {pendingCount} pending</span>
        )}
      </button>
      {open && (
        <DiscussionsPanel
          onClose={() => setOpen(false)}
          onShow={(anchor, discussionId) => {
            setOpen(false)
            onShow(anchor, discussionId)
          }}
        />
      )}
    </>
  )
}

export function discussionAnchorKey(anchor: Anchor): string {
  return anchorKey(anchor)
}
