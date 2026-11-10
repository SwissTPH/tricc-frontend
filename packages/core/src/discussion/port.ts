import type { Anchor, DiscussionLabel, DiscussionStatus, Person } from '../model/types.js'
import type { OpenProject, TriccRuntime } from '../runtime.js'
import { anchorLabel } from './anchor.js'
import type { DiscussionActor } from './store.js'

/**
 * The screens call this. The local app edits the discussion document; a hosted app
 * can replace it and still serve the same screens.
 */
export interface DiscussionPort {
  readonly id: string
  /** People can be tagged and assigned: there is a directory of members (the platform). */
  readonly people: boolean
  start(open: OpenProject, about: Anchor, text: string, labels?: string[]): Promise<string>
  reply(open: OpenProject, discussionId: string, text: string): Promise<string>
  edit(open: OpenProject, discussionId: string, commentId: string, text: string): Promise<void>
  remove(open: OpenProject, discussionId: string, commentId: string): Promise<void>
  setStatus(
    open: OpenProject,
    discussionId: string,
    status: DiscussionStatus,
    note?: string,
  ): Promise<void>
  /** One category. A longer list keeps the first id. */
  setLabels(open: OpenProject, discussionId: string, labelIds: string[]): Promise<void>
  defineLabel(open: OpenProject, label: DiscussionLabel): Promise<void>
  removeLabel(open: OpenProject, labelId: string): Promise<void>
  discard(open: OpenProject, discussionId: string): Promise<void>
  assign?(open: OpenProject, discussionId: string, person: Person | null): Promise<void>
}

/** A discussion carries one category. */
export function oneCategory(labelIds: readonly string[] | undefined): string[] {
  const first = labelIds?.find((id) => id.trim() !== '')
  return first ? [first] : []
}

export class LocalDiscussions implements DiscussionPort {
  readonly id = 'local'
  readonly people = false

  constructor(private readonly runtime: TriccRuntime) {}

  start(open: OpenProject, about: Anchor, text: string, labels?: string[]): Promise<string> {
    const project = open.document.snapshot()
    const name = anchorLabel(project, about, project.languages.default)
    const id = open.document.discuss(this.actor(open), (tx) =>
      tx.start(about, name, text, oneCategory(labels)),
    )
    return Promise.resolve(id)
  }

  reply(open: OpenProject, discussionId: string, text: string): Promise<string> {
    return Promise.resolve(
      open.document.discuss(this.actor(open), (tx) => tx.reply(discussionId, text)),
    )
  }

  async edit(
    open: OpenProject,
    discussionId: string,
    commentId: string,
    text: string,
  ): Promise<void> {
    open.document.discuss(this.actor(open), (tx) => tx.edit(discussionId, commentId, text))
  }

  async remove(open: OpenProject, discussionId: string, commentId: string): Promise<void> {
    open.document.discuss(this.actor(open), (tx) => tx.remove(discussionId, commentId))
  }

  async setStatus(
    open: OpenProject,
    discussionId: string,
    status: DiscussionStatus,
    note?: string,
  ): Promise<void> {
    open.document.discuss(this.actor(open), (tx) => tx.setStatus(discussionId, status, note))
  }

  async setLabels(open: OpenProject, discussionId: string, labelIds: string[]): Promise<void> {
    open.document.discuss(this.actor(open), (tx) =>
      tx.setLabels(discussionId, oneCategory(labelIds)),
    )
  }

  async defineLabel(open: OpenProject, label: DiscussionLabel): Promise<void> {
    open.document.discuss(this.actor(open), (tx) => tx.defineLabel(label))
  }

  async removeLabel(open: OpenProject, labelId: string): Promise<void> {
    open.document.discuss(this.actor(open), (tx) => tx.removeLabel(labelId))
  }

  async discard(open: OpenProject, discussionId: string): Promise<void> {
    open.document.discuss(this.actor(open), (tx) => tx.discard(discussionId))
  }

  private actor(open: OpenProject): DiscussionActor {
    const who = this.runtime.identity.current()
    const caps = this.runtime.identity.capabilities({ projectId: open.ref.id })
    const version = open.document.snapshot().version
    return {
      by: { id: who.id, name: who.displayName },
      at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      ...(version ? { version } : {}),
      canModerate: caps.has('comment.moderate'),
    }
  }
}
