import * as Y from 'yjs'
import type { Project } from './model/types.js'
import type {
  CollaborationPort,
  CollaborationSession,
  IdentityPort,
  PersistencePort,
  ProjectCatalogPort,
  ProjectDescription,
  NotificationsPort,
  ProjectRef,
  TelemetryPort,
} from './ports/index.js'
import { DerivedNotifications } from './notifications/derived.js'
import { noopTelemetry } from './ports/telemetry.js'
import { ProjectDocument } from './document/doc.js'
import { LocalDiscussions, type DiscussionPort } from './discussion/port.js'
import { attentionFor } from './discussion/attention.js'
import { resolve } from './format/schema/localized.js'
import {
  readProject,
  writeProject,
  writeChanged,
  type ProjectFiles,
} from './format/serialize/index.js'

/**
 * Composition root.
 *
 * An instantiation supplies adapters; everything above this is shared. A hosted shell
 * replaces four of these and nothing else about it differs
 * (feature/20260825-library-architecture.md §5).
 */
export interface TriccRuntimeConfig {
  persistence: PersistencePort
  catalog: ProjectCatalogPort
  identity: IdentityPort
  collaboration?: CollaborationPort
  telemetry?: TelemetryPort
  /** The bell. Without one, notifications are worked out from the project files. */
  notifications?: NotificationsPort
}

export interface OpenProject {
  ref: ProjectRef
  document: ProjectDocument
  /** The file set as last written or read — the baseline for incremental saves. */
  baseline: ProjectFiles
  /**
   * Set when the project was opened with `join`. The server already holds the document,
   * so `save` does not write files.
   */
  session?: CollaborationSession
  migratedFrom?: string
}

export class TriccRuntime {
  readonly persistence: PersistencePort
  readonly catalog: ProjectCatalogPort
  readonly identity: IdentityPort
  readonly collaboration: CollaborationPort | undefined
  readonly telemetry: TelemetryPort
  readonly discussion: DiscussionPort
  readonly notifications: NotificationsPort

  constructor(config: TriccRuntimeConfig) {
    this.persistence = config.persistence
    this.catalog = config.catalog
    this.identity = config.identity
    this.collaboration = config.collaboration
    this.telemetry = config.telemetry ?? noopTelemetry
    this.discussion = new LocalDiscussions(this)
    this.notifications =
      config.notifications ?? new DerivedNotifications(this.catalog, this.identity)
  }

  async open(ref: ProjectRef): Promise<OpenProject> {
    const files = await this.persistence.read(ref)
    const { project, migratedFrom } = readProject(files)
    const document = ProjectDocument.fromProject(project, {
      capabilities: () => this.identity.capabilities({ projectId: ref.id }),
    })
    await this.catalog.touch(ref)
    await this.catalog.describe(ref, this.describe(ref, project))
    // A migrated project is dirty on arrival: the baseline is what was on disk, so the
    // first save writes the migrated form rather than silently leaving the old one.
    const baseline = migratedFrom ? files : writeProject(project)
    const open: OpenProject = { ref, document, baseline }
    if (migratedFrom !== undefined) open.migratedFrom = migratedFrom
    return open
  }

  /**
   * Open a document that a server has already seeded. The client never builds one from
   * files, so two people joining the same project cannot insert every node twice.
   */
  async join(ref: ProjectRef): Promise<OpenProject> {
    if (!this.collaboration) throw new Error('join requires a collaboration port')
    const doc = new Y.Doc()
    const session = await this.collaboration.connect(doc, ref)
    await session.whenSynced()
    const document = ProjectDocument.fromDoc(doc, {
      capabilities: () => this.identity.capabilities({ projectId: ref.id }),
    })
    return { ref, document, session, baseline: {} }
  }

  async create(name: string, created: Project): Promise<OpenProject> {
    const ref = await this.catalog.create(name)
    // The author who starts a project owns it until someone says otherwise.
    const me = this.identity.current()
    const project: Project = created.owner
      ? created
      : { ...created, owner: { id: me.id, name: me.displayName } }
    const files = writeProject(project)
    await this.persistence.write(ref, { files, changed: Object.keys(files), removed: [] })
    const document = ProjectDocument.fromProject(project, {
      capabilities: () => this.identity.capabilities({ projectId: ref.id }),
    })
    await this.catalog.describe(ref, this.describe(ref, project))
    return { ref, document, baseline: files }
  }

  /** Writes only what changed, and returns the new baseline. */
  async save(open: OpenProject): Promise<{ baseline: ProjectFiles; changed: string[] }> {
    if (open.session) return { baseline: open.baseline, changed: [] }
    const { files, changed, removed } = writeChanged(open.document.snapshot(), open.baseline)
    if (changed.length === 0 && removed.length === 0) {
      return { baseline: open.baseline, changed: [] }
    }
    await this.persistence.write(open.ref, { files, changed, removed })
    open.baseline = files
    await this.catalog.describe(open.ref, this.describe(open.ref, open.document.snapshot()))
    this.notifications.refresh?.()
    this.telemetry.event('project.saved', { files: changed.length })
    return { baseline: files, changed }
  }

  /** What the project list shows about a project, for the current author. */
  describe(ref: ProjectRef, project: Project): ProjectDescription {
    const lang = project.languages.default
    const d: ProjectDescription = {}
    if (project.code) d.code = project.code
    const title = resolve(project.title, lang, lang)
    if (title) d.title = title
    if (project.labels?.length) d.labels = [...project.labels]
    if (project.owner) d.owner = { ...project.owner }
    const me = this.identity.current()
    const attention = attentionFor(
      Object.values(project.discussions ?? {}),
      { id: me.id, name: me.displayName },
      ref.id,
    ).map((n) => ({ ...n, projectName: title ?? ref.name }))
    if (attention.length) d.attention = attention
    return d
  }

  hasUnsavedChanges(open: OpenProject): boolean {
    if (open.session) return false
    const { changed, removed } = writeChanged(open.document.snapshot(), open.baseline)
    return changed.length > 0 || removed.length > 0
  }
}

export function createTriccRuntime(config: TriccRuntimeConfig): TriccRuntime {
  return new TriccRuntime(config)
}
