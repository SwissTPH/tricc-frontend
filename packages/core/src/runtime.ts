import type { Project } from './model/types.js'
import type {
  CollaborationPort,
  IdentityPort,
  PersistencePort,
  ProjectCatalogPort,
  ProjectRef,
  TelemetryPort,
} from './ports/index.js'
import { noopTelemetry } from './ports/telemetry.js'
import { ProjectDocument } from './document/doc.js'
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
}

export interface OpenProject {
  ref: ProjectRef
  document: ProjectDocument
  /** The file set as last written or read — the baseline for incremental saves. */
  baseline: ProjectFiles
  migratedFrom?: string
}

export class TriccRuntime {
  readonly persistence: PersistencePort
  readonly catalog: ProjectCatalogPort
  readonly identity: IdentityPort
  readonly collaboration: CollaborationPort | undefined
  readonly telemetry: TelemetryPort

  constructor(config: TriccRuntimeConfig) {
    this.persistence = config.persistence
    this.catalog = config.catalog
    this.identity = config.identity
    this.collaboration = config.collaboration
    this.telemetry = config.telemetry ?? noopTelemetry
  }

  async open(ref: ProjectRef): Promise<OpenProject> {
    const files = await this.persistence.read(ref)
    const { project, migratedFrom } = readProject(files)
    const document = ProjectDocument.fromProject(project, {
      capabilities: () => this.identity.capabilities({ projectId: ref.id }),
    })
    await this.catalog.touch(ref)
    // A migrated project is dirty on arrival: the baseline is what was on disk, so the
    // first save writes the migrated form rather than silently leaving the old one.
    const baseline = migratedFrom ? files : writeProject(project)
    const open: OpenProject = { ref, document, baseline }
    if (migratedFrom !== undefined) open.migratedFrom = migratedFrom
    return open
  }

  async create(name: string, project: Project): Promise<OpenProject> {
    const ref = await this.catalog.create(name)
    const files = writeProject(project)
    await this.persistence.write(ref, { files, changed: Object.keys(files), removed: [] })
    const document = ProjectDocument.fromProject(project, {
      capabilities: () => this.identity.capabilities({ projectId: ref.id }),
    })
    return { ref, document, baseline: files }
  }

  /** Writes only what changed, and returns the new baseline. */
  async save(open: OpenProject): Promise<{ baseline: ProjectFiles; changed: string[] }> {
    const { files, changed, removed } = writeChanged(open.document.snapshot(), open.baseline)
    if (changed.length === 0 && removed.length === 0) {
      return { baseline: open.baseline, changed: [] }
    }
    await this.persistence.write(open.ref, { files, changed, removed })
    open.baseline = files
    this.telemetry.event('project.saved', { files: changed.length })
    return { baseline: files, changed }
  }

  hasUnsavedChanges(open: OpenProject): boolean {
    const { changed, removed } = writeChanged(open.document.snapshot(), open.baseline)
    return changed.length > 0 || removed.length > 0
  }
}

export function createTriccRuntime(config: TriccRuntimeConfig): TriccRuntime {
  return new TriccRuntime(config)
}
