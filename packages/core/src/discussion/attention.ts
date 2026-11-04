import type { Discussion, Person } from '../model/types.js'
import type { TriccNotification } from '../ports/notifications.js'
import { parseCommentText } from './text.js'

/** Who the notifications are for: an identity id, and the name others tag them by. */
export interface AttentionTarget {
  id: string
  name?: string
}

/**
 * The open discussions that ask for this person's attention, as notifications (all
 * unread; read state belongs to the notifications adapter):
 *
 * - `mention`: a comment by someone else tags them, `@[Name](user:<id>)`. Locally every
 *   author is `local`, so a tag also matches on the display name (case-insensitive).
 * - `assigned`: the discussion is assigned to them.
 *
 * Resolved and won't-change discussions ask for nothing.
 */
export function attentionFor(
  discussions: Iterable<Discussion>,
  who: AttentionTarget,
  projectId: string,
): TriccNotification[] {
  const out: TriccNotification[] = []
  const name = who.name?.trim().toLowerCase()
  const isMe = (p: { id: string; name: string }) =>
    p.id === who.id || (name !== undefined && name !== '' && p.name.trim().toLowerCase() === name)

  for (const d of discussions) {
    if (d.status === 'resolved' || d.status === 'wont_change') continue
    for (const c of d.comments) {
      if (c.deleted || !c.text || isMe(c.author)) continue
      const tagged = parseCommentText(c.text).some((p) => p.type === 'mention' && isMe(p))
      if (!tagged) continue
      out.push({
        id: `${projectId}:${d.id}:mention:${c.id}`,
        kind: 'mention',
        projectId,
        discussionId: d.id,
        anchor: d.about,
        title: d.label,
        excerpt: excerpt(c.text),
        by: c.author,
        at: time(c.at),
        read: false,
      })
    }
    if (d.assignee && isMe(d.assignee)) {
      const event = [...d.events].reverse().find((e) => e.assignee?.id === d.assignee!.id)
      const n: TriccNotification = {
        id: `${projectId}:${d.id}:assigned`,
        kind: 'assigned',
        projectId,
        discussionId: d.id,
        anchor: d.about,
        title: d.label,
        at: time(event?.at ?? d.comments[0]?.at),
        read: false,
      }
      const by: Person | undefined = event?.by
      if (by) n.by = by
      out.push(n)
    }
  }
  return out.sort((a, b) => b.at - a.at)
}

/** Comment text for a one-line preview: tags as `@Name`, whitespace collapsed. */
function excerpt(text: string, max = 140): string {
  const flat = parseCommentText(text)
    .map((p) => (p.type === 'text' ? p.text : p.type === 'link' ? p.href : `@${p.name}`))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

function time(iso: string | undefined): number {
  const t = iso ? Date.parse(iso) : NaN
  return Number.isNaN(t) ? 0 : t
}
