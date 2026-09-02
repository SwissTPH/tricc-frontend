import { openDB, type IDBPDatabase } from 'idb'
import type {
  PersistenceCapabilities,
  PersistencePort,
  ProjectFiles,
  ProjectRef,
  WriteRequest,
} from '@tricc/core'

/**
 * Durable browser-local storage, in IndexedDB.
 *
 * This is where a project lives until — and unless — it is bound to a folder on disk. It
 * exists because creating a project must not require a folder prompt: the picker needs a
 * user gesture, is unavailable in Firefox and Safari entirely, and demanding one before
 * an author can type anything is the wrong first experience.
 *
 * `localStorage` is deliberately not used: it is synchronous, roughly 5 MB, and throws on
 * quota — a realistic guideline with images exceeds it.
 */

const DB_NAME = 'tricc-projects'
const STORE = 'files'

export class BrowserStoragePersistence implements PersistencePort {
  readonly id = 'browser-storage'
  private db: Promise<IDBPDatabase> | undefined

  private connect(): Promise<IDBPDatabase> {
    this.db ??= openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      },
    })
    return this.db
  }

  capabilities(): PersistenceCapabilities {
    // Nothing else can write this store, so there is no external change to watch for.
    return { canWatch: false, canWriteIncrementally: true }
  }

  async read(ref: ProjectRef): Promise<ProjectFiles> {
    const db = await this.connect()
    return ((await db.get(STORE, ref.id)) as ProjectFiles | undefined) ?? {}
  }

  async write(ref: ProjectRef, req: WriteRequest): Promise<void> {
    const db = await this.connect()
    const current = ((await db.get(STORE, ref.id)) as ProjectFiles | undefined) ?? {}
    for (const path of req.changed) current[path] = req.files[path] as string
    for (const path of req.removed) delete current[path]
    await db.put(STORE, current, ref.id)
  }

  async clear(ref: ProjectRef): Promise<void> {
    const db = await this.connect()
    await db.delete(STORE, ref.id)
  }
}

/**
 * Routes each project to the right store.
 *
 * A project bound to a folder is written there; everything else lives in browser storage.
 * The UI reports which, per project, rather than assuming one mode for the whole app —
 * an author can have both at once, and being wrong about it risks silent data loss.
 */
export class LocalPersistence implements PersistencePort {
  readonly id = 'local'

  constructor(
    private readonly folder: PersistencePort & {
      register?(ref: ProjectRef, handle: unknown): void
    },
    private readonly browser: PersistencePort,
  ) {}

  /** Which store backs this project. */
  storeFor(ref: ProjectRef): 'folder' | 'browser' {
    return ref.handle ? 'folder' : 'browser'
  }

  private port(ref: ProjectRef): PersistencePort {
    return ref.handle ? this.folder : this.browser
  }

  capabilities(): PersistenceCapabilities {
    // The conservative union: callers that need per-project detail ask `capabilitiesFor`.
    return { canWatch: false, canWriteIncrementally: true }
  }

  capabilitiesFor(ref: ProjectRef): PersistenceCapabilities {
    return this.port(ref).capabilities()
  }

  async read(ref: ProjectRef): Promise<ProjectFiles> {
    this.bind(ref)
    return this.port(ref).read(ref)
  }

  async write(ref: ProjectRef, req: WriteRequest): Promise<void> {
    this.bind(ref)
    return this.port(ref).write(ref, req)
  }

  watch(ref: ProjectRef, onExternalChange: (paths: string[]) => void) {
    const port = this.port(ref)
    return port.watch?.(ref, onExternalChange) ?? { dispose: () => undefined }
  }

  private bind(ref: ProjectRef): void {
    if (ref.handle) this.folder.register?.(ref, ref.handle)
  }
}
