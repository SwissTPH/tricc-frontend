import * as Y from 'yjs'
import type {
  Capability,
  CapabilitySet,
  CollaborationPort,
  CollaborationSession,
  Identity,
  IdentityPort,
  PersistenceCapabilities,
  PersistencePort,
  ProjectCatalogPort,
  ProjectFiles,
  ProjectRef,
  ProjectSummary,
  WriteRequest,
} from '@tricc/core'
import { ALL_CAPABILITIES } from '@tricc/core'

/**
 * In-memory adapters.
 *
 * Test-only, and by construction a second instantiation of the runtime — which is the
 * proof that the ports are actually sufficient before a hosted shell exists
 * (feature/20260825-library-architecture.md §8.2).
 */

export class MemoryPersistence implements PersistencePort {
  readonly id = 'memory'
  private readonly stores = new Map<string, ProjectFiles>()
  private readonly watchers = new Map<string, Set<(paths: string[]) => void>>()

  constructor(
    private readonly caps: PersistenceCapabilities = {
      canWatch: true,
      canWriteIncrementally: true,
    },
  ) {}

  capabilities(): PersistenceCapabilities {
    return this.caps
  }

  async read(ref: ProjectRef): Promise<ProjectFiles> {
    return { ...(this.stores.get(ref.id) ?? {}) }
  }

  async write(ref: ProjectRef, req: WriteRequest): Promise<void> {
    const store = this.stores.get(ref.id) ?? {}
    if (this.caps.canWriteIncrementally) {
      for (const path of req.changed) store[path] = req.files[path] as string
      for (const path of req.removed) delete store[path]
    } else {
      for (const key of Object.keys(store)) delete store[key]
      Object.assign(store, req.files)
    }
    this.stores.set(ref.id, store)
  }

  watch(ref: ProjectRef, onExternalChange: (paths: string[]) => void) {
    const set = this.watchers.get(ref.id) ?? new Set()
    set.add(onExternalChange)
    this.watchers.set(ref.id, set)
    return { dispose: () => set.delete(onExternalChange) }
  }

  /** Simulate a change made outside the tool — a git pull, an editor save. */
  externalWrite(ref: ProjectRef, path: string, content: string): void {
    const store = this.stores.get(ref.id) ?? {}
    store[path] = content
    this.stores.set(ref.id, store)
    for (const cb of this.watchers.get(ref.id) ?? []) cb([path])
  }
}

export class MemoryCatalog implements ProjectCatalogPort {
  private readonly projects = new Map<string, ProjectSummary>()
  private counter = 0
  /** What `open()` resolves to; undefined models the user cancelling the picker. */
  nextOpen: ProjectRef | undefined

  async list(): Promise<ProjectSummary[]> {
    return [...this.projects.values()].sort((a, b) => a.name.localeCompare(b.name))
  }

  async create(name: string): Promise<ProjectRef> {
    const id = `mem-${++this.counter}`
    const summary: ProjectSummary = { id, name }
    this.projects.set(id, summary)
    return { id, name }
  }

  async open(): Promise<ProjectRef | undefined> {
    return this.nextOpen
  }

  async remove(ref: ProjectRef): Promise<void> {
    this.projects.delete(ref.id)
  }

  async touch(ref: ProjectRef): Promise<void> {
    const existing = this.projects.get(ref.id)
    if (existing) existing.lastOpened = this.counter
  }
}

export class MemoryIdentity implements IdentityPort {
  private listeners = new Set<() => void>()
  private caps: CapabilitySet

  constructor(
    private identity: Identity = { id: 'local', displayName: 'Local author' },
    capabilities: CapabilitySet = ALL_CAPABILITIES,
  ) {
    this.caps = capabilities
  }

  current(): Identity {
    return this.identity
  }

  capabilities(): CapabilitySet {
    return this.caps
  }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  /** Drop or restore capabilities at runtime — how the read-only toggle is exercised. */
  setCapabilities(caps: Iterable<Capability>): void {
    this.caps = new Set(caps) as CapabilitySet
    for (const l of this.listeners) l()
  }

  setIdentity(identity: Identity): void {
    this.identity = identity
    for (const l of this.listeners) l()
  }
}

export class MemoryCollaboration implements CollaborationPort {
  readonly id = 'memory'

  async connect(_doc: Y.Doc, _ref: ProjectRef): Promise<CollaborationSession> {
    return {
      connected: true,
      participants: () => [],
      onParticipantsChange: () => () => undefined,
      whenSynced: async () => undefined,
      disconnect: async () => undefined,
    }
  }
}

/** A complete adapter set, ready to hand to `createTriccRuntime`. */
export function memoryAdapters(
  overrides: Partial<{
    persistence: MemoryPersistence
    catalog: MemoryCatalog
    identity: MemoryIdentity
  }> = {},
) {
  return {
    persistence: overrides.persistence ?? new MemoryPersistence(),
    catalog: overrides.catalog ?? new MemoryCatalog(),
    identity: overrides.identity ?? new MemoryIdentity(),
    collaboration: new MemoryCollaboration(),
  }
}
