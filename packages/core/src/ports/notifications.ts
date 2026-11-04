import type { Anchor, Person, Project } from '../model/types.js'

/**
 * Something that asks for the author's attention: they were tagged in a discussion, or a
 * discussion was assigned to them.
 *
 * The bell reads these through `NotificationsPort`. Locally they are worked out from the
 * project files; on the platform a notification service supplies them (and may add kinds,
 * such as a reply, that a file cannot tell).
 */
export interface TriccNotification {
  /** Stable across reads, so read state survives a reload. */
  id: string
  kind: 'mention' | 'assigned' | (string & {})
  projectId: string
  /** Shown when the project is not open (the home page bell). */
  projectName?: string
  discussionId?: string
  anchor?: Anchor
  /** The discussion's element name, e.g. "Danger signs". */
  title: string
  excerpt?: string
  by?: Person
  /** Epoch millis. */
  at: number
  read: boolean
}

/** No project: every project the author can reach. A project: that project only. */
export interface NotificationScope {
  projectId?: string
}

export interface NotificationsPort {
  list(scope: NotificationScope): Promise<TriccNotification[]>
  /** Calls back whenever the list for the scope may have changed. Returns an unsubscribe. */
  subscribe(scope: NotificationScope, cb: () => void): () => void
  markRead(ids: readonly string[]): Promise<void>
  capabilities(): NotificationCapabilities
  /**
   * Local derivation only: read the open project live. A service-backed port leaves it out;
   * the host calls it when a project opens and the returned function when it closes.
   */
  attach?(projectId: string, source: NotificationSource): () => void
  /** Local derivation only: the catalog changed (a project was saved). */
  refresh?(): void
}

/** An open project the bell can read live. */
export interface NotificationSource {
  snapshot(): Project
  subscribe(cb: () => void): () => void
}

export interface NotificationCapabilities {
  /** A service pushes new notifications; otherwise they are recomputed on change. */
  push: boolean
  /** The home-page scope lists notifications across projects. */
  crossProject: boolean
}
