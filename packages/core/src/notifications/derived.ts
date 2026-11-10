import type { IdentityPort } from '../ports/identity.js'
import type { ProjectCatalogPort } from '../ports/catalog.js'
import type {
  NotificationCapabilities,
  NotificationScope,
  NotificationSource,
  NotificationsPort,
  TriccNotification,
} from '../ports/notifications.js'
import { attentionFor } from '../discussion/attention.js'

/** Which notification ids have been read. Kept by the viewer, never in the project. */
export interface ReadStateStore {
  load(): string[]
  save(ids: string[]): void
}

export function memoryReadState(): ReadStateStore {
  let ids: string[] = []
  return { load: () => ids, save: (next) => void (ids = next) }
}

/** Read ids kept; older ones are dropped (their discussions are long settled). */
const READ_KEEP = 500

/**
 * Notifications worked out from the project files, for an app without a notification
 * service:
 *
 * - **Project scope**: from the open project (`attach`), live as discussions change.
 * - **Home scope**: from what the catalog recorded at each project's last save, so no
 *   project is opened to fill the bell.
 *
 * A hosted shell passes its own `NotificationsPort` to the runtime instead.
 */
export class DerivedNotifications implements NotificationsPort {
  private readonly sources = new Map<string, NotificationSource>()
  private readonly listeners = new Set<() => void>()
  private read: Set<string>

  constructor(
    private readonly catalog: ProjectCatalogPort,
    private readonly identity: IdentityPort,
    private readonly readState: ReadStateStore = memoryReadState(),
  ) {
    this.read = new Set(readState.load())
    identity.onChange(() => this.changed())
  }

  capabilities(): NotificationCapabilities {
    return { push: false, crossProject: true }
  }

  async list(scope: NotificationScope): Promise<TriccNotification[]> {
    let items: TriccNotification[]
    const source = scope.projectId ? this.sources.get(scope.projectId) : undefined
    if (scope.projectId && source) {
      const me = this.identity.current()
      items = attentionFor(
        Object.values(source.snapshot().discussions ?? {}),
        { id: me.id, name: me.displayName },
        scope.projectId,
      )
    } else {
      const summaries = await this.catalog.list()
      items = summaries
        .filter((s) => !scope.projectId || s.id === scope.projectId)
        .flatMap((s) => s.attention ?? [])
        .sort((a, b) => b.at - a.at)
    }
    return items.map((n) => ({ ...n, read: this.read.has(n.id) }))
  }

  subscribe(_scope: NotificationScope, cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  async markRead(ids: readonly string[]): Promise<void> {
    let added = false
    for (const id of ids) {
      if (this.read.has(id)) continue
      this.read.add(id)
      added = true
    }
    if (!added) return
    const kept = [...this.read].slice(-READ_KEEP)
    this.read = new Set(kept)
    this.readState.save(kept)
    this.changed()
  }

  /** Read this project live while it is open. Returns the detach. */
  attach(projectId: string, source: NotificationSource): () => void {
    this.sources.set(projectId, source)
    const off = source.subscribe(() => this.changed())
    this.changed()
    return () => {
      off()
      if (this.sources.get(projectId) === source) this.sources.delete(projectId)
      this.changed()
    }
  }

  /** The catalog was described again (a save): the home list may differ. */
  refresh(): void {
    this.changed()
  }

  private changed(): void {
    for (const l of this.listeners) l()
  }
}
