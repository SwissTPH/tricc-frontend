import * as Y from 'yjs'
import type {
  Anchor,
  Discussion,
  DiscussionComment,
  DiscussionEvent,
  DiscussionLabel,
  DiscussionResolution,
  DiscussionStatus,
  Person,
  Project,
} from '../model/types.js'
import { CapabilityError } from '../document/errors.js'
import { randomDiscussionId } from './ids.js'
import { DEFAULT_DISCUSSION_LABELS } from './labels.js'

export const COMMENT_TEXT_MAX = 10_000

export interface DiscussionActor {
  by: Person
  at: string
  /** The project's version, recorded when a discussion is resolved. */
  version?: string
  canModerate: boolean
}

const MAP = 'discussions'
const LABELS = 'labels'
const KEEP = 'keep'

function discussions(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap(MAP)
}

function labelArray(doc: Y.Doc): Y.Array<Y.Map<unknown>> {
  return doc.getArray(LABELS)
}

function keepMap(doc: Y.Doc): Y.Map<string> {
  return doc.getMap(KEEP)
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function personOf(value: unknown): Person {
  const person = value as Person
  return { id: person.id, name: person.name }
}

function commentFromY(m: Y.Map<unknown>): DiscussionComment {
  const comment: DiscussionComment = {
    id: m.get('id') as string,
    author: personOf(m.get('author')),
    at: m.get('at') as string,
  }
  const text = m.get('text')
  if (typeof text === 'string' && text !== '') comment.text = text
  const edited = m.get('edited')
  if (typeof edited === 'string') comment.edited = edited
  if (m.get('deleted') === true) comment.deleted = true
  return comment
}

function commentToY(comment: DiscussionComment): Y.Map<unknown> {
  const m = new Y.Map<unknown>()
  m.set('id', comment.id)
  m.set('author', clone(comment.author))
  m.set('at', comment.at)
  if (comment.text) m.set('text', comment.text)
  if (comment.edited) m.set('edited', comment.edited)
  if (comment.deleted) m.set('deleted', true)
  return m
}

function eventFromY(m: Y.Map<unknown>): DiscussionEvent {
  const event: DiscussionEvent = { at: m.get('at') as string, by: personOf(m.get('by')) }
  const status = m.get('status')
  if (typeof status === 'string') event.status = status as DiscussionStatus
  const labels = m.get('labels')
  if (Array.isArray(labels)) event.labels = [...labels]
  if (m.has('assignee'))
    event.assignee = m.get('assignee') === null ? null : personOf(m.get('assignee'))
  return event
}

function eventToY(event: DiscussionEvent): Y.Map<unknown> {
  const m = new Y.Map<unknown>()
  m.set('at', event.at)
  m.set('by', clone(event.by))
  if (event.status) m.set('status', event.status)
  if (event.labels) m.set('labels', [...event.labels])
  if ('assignee' in event) m.set('assignee', event.assignee ? clone(event.assignee) : null)
  return m
}

function byTime<T extends { at: string; id?: string }>(items: T[]): T[] {
  return items
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at) || (a.id ?? '').localeCompare(b.id ?? ''))
}

function discussionFromY(m: Y.Map<unknown>): Discussion {
  const comments = (
    (m.get('comments') as Y.Array<Y.Map<unknown>> | undefined)?.toArray() ?? []
  ).map(commentFromY)
  const events = ((m.get('events') as Y.Array<Y.Map<unknown>> | undefined)?.toArray() ?? []).map(
    eventFromY,
  )
  const labels = ((m.get('labels') as Y.Array<string> | undefined)?.toArray() ?? []).slice()
  const discussion: Discussion = {
    id: m.get('id') as string,
    about: clone(m.get('about') as Anchor),
    label: m.get('label') as string,
    status: m.get('status') as DiscussionStatus,
    labels,
    comments: byTime(comments),
    events: byTime(events),
  }
  const assignee = m.get('assignee')
  if (assignee && typeof assignee === 'object') discussion.assignee = personOf(assignee)
  const resolution = m.get('resolution')
  if (resolution && typeof resolution === 'object')
    discussion.resolution = clone(resolution) as DiscussionResolution
  return discussion
}

function discussionToY(discussion: Discussion): Y.Map<unknown> {
  const m = new Y.Map<unknown>()
  m.set('id', discussion.id)
  m.set('about', clone(discussion.about))
  m.set('label', discussion.label)
  m.set('status', discussion.status)
  const labels = new Y.Array<string>()
  if (discussion.labels.length > 0) labels.insert(0, [...discussion.labels])
  m.set('labels', labels)
  const comments = new Y.Array<Y.Map<unknown>>()
  if (discussion.comments.length > 0) comments.insert(0, discussion.comments.map(commentToY))
  m.set('comments', comments)
  const events = new Y.Array<Y.Map<unknown>>()
  if (discussion.events.length > 0) events.insert(0, discussion.events.map(eventToY))
  m.set('events', events)
  if (discussion.assignee) m.set('assignee', clone(discussion.assignee))
  if (discussion.resolution) m.set('resolution', clone(discussion.resolution))
  return m
}

function labelFromY(m: Y.Map<unknown>): DiscussionLabel {
  return {
    id: m.get('id') as string,
    name: m.get('name') as string,
    color: m.get('color') as DiscussionLabel['color'],
  }
}

function labelToY(label: DiscussionLabel): Y.Map<unknown> {
  const m = new Y.Map<unknown>()
  m.set('id', label.id)
  m.set('name', label.name)
  m.set('color', label.color)
  return m
}

export interface DiscussionState {
  discussions?: Record<string, Discussion>
  discussionLabels?: DiscussionLabel[]
  discussionKeep?: Record<string, string>
}

/** Copy a project's discussions into their own document. The guideline document never holds them. */
export function seedDiscussions(project: Project, doc: Y.Doc): void {
  doc.transact(() => {
    const map = discussions(doc)
    for (const id of Object.keys(project.discussions ?? {}).sort()) {
      const discussion = project.discussions?.[id]
      if (discussion) map.set(id, discussionToY(discussion))
    }
    const labels = labelArray(doc)
    for (const label of project.discussionLabels ?? []) labels.push([labelToY(label)])
    const keep = keepMap(doc)
    for (const [path, text] of Object.entries(project.discussionKeep ?? {}).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      keep.set(path, text)
    }
  })
}

export function readDiscussions(doc: Y.Doc): DiscussionState {
  const state: DiscussionState = {}
  const map = discussions(doc)
  if (map.size > 0) {
    const record: Record<string, Discussion> = {}
    for (const id of [...map.keys()].sort())
      record[id] = discussionFromY(map.get(id) as Y.Map<unknown>)
    state.discussions = record
  }
  const labels = labelArray(doc)
  if (labels.length > 0) state.discussionLabels = labels.toArray().map(labelFromY)
  const keep = keepMap(doc)
  if (keep.size > 0) {
    const record: Record<string, string> = {}
    for (const path of [...keep.keys()].sort()) record[path] = keep.get(path) as string
    state.discussionKeep = record
  }
  return state
}

function assertText(text: string): void {
  if (text.length > COMMENT_TEXT_MAX) {
    throw new Error(`A comment can be at most ${COMMENT_TEXT_MAX} characters`)
  }
}

function requireDiscussion(doc: Y.Doc, id: string): Y.Map<unknown> {
  const found = discussions(doc).get(id)
  if (!found) throw new Error(`No discussion ${id}`)
  return found
}

function commentsOf(m: Y.Map<unknown>): Y.Array<Y.Map<unknown>> {
  return m.get('comments') as Y.Array<Y.Map<unknown>>
}

function findComment(m: Y.Map<unknown>, commentId: string): Y.Map<unknown> {
  const found = commentsOf(m)
    .toArray()
    .find((item) => item.get('id') === commentId)
  if (!found) throw new Error(`No comment ${commentId}`)
  return found
}

function pushEvent(m: Y.Map<unknown>, event: DiscussionEvent): void {
  ;(m.get('events') as Y.Array<Y.Map<unknown>>).push([eventToY(event)])
}

/** The five labels are written once, with the first discussion. A later removal stays removed. */
function ensureDefaults(doc: Y.Doc): void {
  const labels = labelArray(doc)
  if (labels.length > 0) return
  labels.insert(0, DEFAULT_DISCUSSION_LABELS.map(labelToY))
}

/**
 * Edits of the discussion document. A comment is never on the undo stack: this document
 * is not the one undo watches.
 */
export class DiscussionMutations {
  constructor(
    private readonly doc: Y.Doc,
    private readonly actor: DiscussionActor,
  ) {}

  start(about: Anchor, label: string, text: string, labelIds: string[] = []): string {
    assertText(text)
    ensureDefaults(this.doc)
    labelIds = labelIds.slice(0, 1)
    const id = freshId(this.doc, 'd')
    const m = new Y.Map<unknown>()
    m.set('id', id)
    m.set('about', clone(about))
    m.set('label', label)
    m.set('status', 'open')
    const labels = new Y.Array<string>()
    if (labelIds.length > 0) labels.insert(0, [...labelIds])
    m.set('labels', labels)
    const comments = new Y.Array<Y.Map<unknown>>()
    comments.insert(0, [
      commentToY({ id: freshId(this.doc, 'c'), author: this.actor.by, at: this.actor.at, text }),
    ])
    m.set('comments', comments)
    const events = new Y.Array<Y.Map<unknown>>()
    events.insert(0, [
      eventToY({
        at: this.actor.at,
        by: this.actor.by,
        ...(labelIds.length > 0 ? { labels: [...labelIds] } : {}),
      }),
    ])
    m.set('events', events)
    discussions(this.doc).set(id, m)
    return id
  }

  reply(discussionId: string, text: string): string {
    assertText(text)
    const id = freshId(this.doc, 'c')
    commentsOf(requireDiscussion(this.doc, discussionId)).push([
      commentToY({ id, author: this.actor.by, at: this.actor.at, text }),
    ])
    return id
  }

  edit(discussionId: string, commentId: string, text: string): void {
    assertText(text)
    const comment = findComment(requireDiscussion(this.doc, discussionId), commentId)
    this.ownOrModerate(comment)
    if (comment.get('deleted') === true) throw new Error('That comment was removed')
    comment.set('text', text)
    comment.set('edited', this.actor.at)
  }

  remove(discussionId: string, commentId: string): void {
    const comment = findComment(requireDiscussion(this.doc, discussionId), commentId)
    this.ownOrModerate(comment)
    comment.set('deleted', true)
    comment.delete('text')
  }

  setStatus(discussionId: string, status: DiscussionStatus, note?: string): void {
    if (status === 'wont_change' && !note?.trim()) {
      throw new Error('A reason is required when a discussion will not change')
    }
    const m = requireDiscussion(this.doc, discussionId)
    m.set('status', status)
    pushEvent(m, { at: this.actor.at, by: this.actor.by, status })
    if (status === 'resolved' || status === 'wont_change') {
      const resolution: DiscussionResolution = { by: this.actor.by, at: this.actor.at }
      const trimmed = note?.trim()
      if (trimmed) resolution.note = trimmed
      if (this.actor.version) resolution.version = this.actor.version
      m.set('resolution', resolution)
    } else if (m.has('resolution')) {
      m.delete('resolution')
    }
  }

  setLabels(discussionId: string, labelIds: string[]): void {
    labelIds = labelIds.slice(0, 1)
    const m = requireDiscussion(this.doc, discussionId)
    const labels = new Y.Array<string>()
    if (labelIds.length > 0) labels.insert(0, [...labelIds])
    m.set('labels', labels)
    pushEvent(m, { at: this.actor.at, by: this.actor.by, labels: [...labelIds] })
  }

  assign(discussionId: string, person: Person | null): void {
    const m = requireDiscussion(this.doc, discussionId)
    if (person) m.set('assignee', clone(person))
    else m.delete('assignee')
    pushEvent(m, { at: this.actor.at, by: this.actor.by, assignee: person })
  }

  defineLabel(label: DiscussionLabel): void {
    const labels = labelArray(this.doc)
    const existing = labels.toArray().find((item) => item.get('id') === label.id)
    if (existing) {
      existing.set('name', label.name)
      existing.set('color', label.color)
      return
    }
    labels.push([labelToY(label)])
  }

  removeLabel(labelId: string): void {
    const labels = labelArray(this.doc)
    const index = labels.toArray().findIndex((item) => item.get('id') === labelId)
    if (index >= 0) labels.delete(index, 1)
    for (const discussion of discussions(this.doc).values()) {
      const own = discussion.get('labels') as Y.Array<string>
      const at = own.toArray().indexOf(labelId)
      if (at >= 0) own.delete(at, 1)
    }
  }

  /** The starter may remove a discussion while nobody else has answered. */
  discard(discussionId: string): void {
    const m = requireDiscussion(this.doc, discussionId)
    const comments = commentsOf(m).toArray()
    const answered = comments.some(
      (comment) =>
        comment.get('deleted') !== true && personOf(comment.get('author')).id !== this.actor.by.id,
    )
    if (answered && !this.actor.canModerate) {
      throw new Error('A discussion that has been answered stays in the project')
    }
    const starter = comments[0] ? personOf(comments[0].get('author')).id : undefined
    if (starter !== this.actor.by.id && !this.actor.canModerate) {
      throw new Error('Only the person who started a discussion can remove it')
    }
    discussions(this.doc).delete(discussionId)
  }

  private ownOrModerate(comment: Y.Map<unknown>): void {
    const author = personOf(comment.get('author'))
    if (author.id !== this.actor.by.id && !this.actor.canModerate) {
      throw new CapabilityError('comment.moderate')
    }
  }
}

function freshId(doc: Y.Doc, prefix: 'd' | 'c'): string {
  const taken = new Set<string>()
  for (const discussion of discussions(doc).values()) {
    taken.add(discussion.get('id') as string)
    for (const comment of (
      discussion.get('comments') as Y.Array<Y.Map<unknown>> | undefined
    )?.toArray() ?? []) {
      taken.add(comment.get('id') as string)
    }
  }
  let id = randomDiscussionId(prefix)
  while (taken.has(id)) id = randomDiscussionId(prefix)
  return id
}
