import { openDB, type IDBPDatabase } from 'idb'
import type { ProjectCatalogPort, ProjectRef, ProjectSummary } from '@tricc/core'

/**
 * Recently-opened projects, kept in IndexedDB.
 *
 * Directory handles are stored alongside the summary so reopening restores a project
 * without a second folder prompt. `localStorage` is deliberately not used: it is
 * synchronous, roughly 5 MB, throws on quota, and cannot hold a handle at all.
 */

const DB_NAME = 'tricc-catalog'
const STORE = 'projects'

interface StoredProject extends ProjectSummary {
  handle?: unknown
}

export class LocalProjectCatalog implements ProjectCatalogPort {
  private db: Promise<IDBPDatabase> | undefined

  constructor(private readonly newId: () => string = defaultId) {}

  private connect(): Promise<IDBPDatabase> {
    this.db ??= openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
      },
    })
    return this.db
  }

  async list(): Promise<ProjectSummary[]> {
    const db = await this.connect()
    const all = (await db.getAll(STORE)) as StoredProject[]
    return all
      .map(({ handle: _handle, ...summary }) => summary)
      .sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0) || a.name.localeCompare(b.name))
  }

  async create(name: string): Promise<ProjectRef> {
    const ref: ProjectRef = { id: this.newId(), name }
    const db = await this.connect()
    await db.put(STORE, { ...ref, lastOpened: Date.now() } satisfies StoredProject)
    return ref
  }

  /**
   * Prompts for a folder. Resolves undefined when the user cancels, which is a normal
   * outcome and not an error.
   */
  async open(): Promise<ProjectRef | undefined> {
    const picker = (globalThis as { showDirectoryPicker?: () => Promise<unknown> })
      .showDirectoryPicker
    if (!picker) return undefined
    let handle: unknown
    try {
      handle = await picker()
    } catch {
      return undefined
    }
    const name = (handle as { name?: string }).name ?? 'Project'
    const db = await this.connect()
    const existing = ((await db.getAll(STORE)) as StoredProject[]).find((p) => p.name === name)
    const ref: ProjectRef = existing
      ? { id: existing.id, name: existing.name, handle }
      : { id: this.newId(), name, handle }
    await db.put(STORE, { id: ref.id, name: ref.name, handle, lastOpened: Date.now() })
    return ref
  }

  async remove(ref: ProjectRef): Promise<void> {
    const db = await this.connect()
    await db.delete(STORE, ref.id)
  }

  async touch(ref: ProjectRef): Promise<void> {
    const db = await this.connect()
    const existing = (await db.get(STORE, ref.id)) as StoredProject | undefined
    if (!existing) return
    await db.put(STORE, { ...existing, lastOpened: Date.now() })
  }

  /** Retrieve the stored directory handle, if the browser kept one. */
  async handleFor(ref: ProjectRef): Promise<unknown> {
    const db = await this.connect()
    const existing = (await db.get(STORE, ref.id)) as StoredProject | undefined
    return existing?.handle
  }
}

function defaultId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `p-${Math.random().toString(36).slice(2, 10)}`
}
