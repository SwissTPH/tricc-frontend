import {
  BrowserStoragePersistence,
  FileSystemPersistence,
  IndexedDbCollaboration,
  LocalIdentity,
  LocalPersistence,
  LocalProjectCatalog,
  LocalPreferences,
} from '@tricc/adapters-local'
import { createTriccRuntime, type ProjectRef, type TriccRuntime } from '@tricc/core'

/**
 * Adapter composition — the only thing this app contributes beyond routing and chrome.
 * A hosted shell replaces these lines and nothing else about the tree differs.
 */

export type StorageMode = 'folder' | 'browser'

export interface LocalRuntime {
  runtime: TriccRuntime
  identity: LocalIdentity
  /** Per-viewer editor preferences, kept in this browser and never in the project. */
  preferences: LocalPreferences
  catalog: LocalProjectCatalog
  persistence: LocalPersistence
  /** The local editing log, kept per project in IndexedDB. */
  collaboration: IndexedDbCollaboration
  /** Whether this browser can bind a project to a folder at all. */
  canUseFolders: boolean
  storeFor(ref: ProjectRef): StorageMode
}

export function supportsDirectoryAccess(): boolean {
  return typeof (globalThis as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'
}

export function createLocalRuntime(): LocalRuntime {
  // Storage is per project, not per app: a project bound to a folder is written there,
  // everything else lives in browser storage. Assuming one mode for the whole app is how
  // an author ends up with two diverging copies of the same guideline.
  const persistence = new LocalPersistence(
    new FileSystemPersistence(),
    new BrowserStoragePersistence(),
  )
  const identity = new LocalIdentity()
  const preferences = new LocalPreferences()
  const catalog = new LocalProjectCatalog()

  const collaboration = new IndexedDbCollaboration()
  const runtime = createTriccRuntime({ persistence, catalog, identity, collaboration })

  return {
    runtime,
    identity,
    preferences,
    catalog,
    persistence,
    collaboration,
    canUseFolders: supportsDirectoryAccess(),
    storeFor: (ref) => (persistence.storeFor(ref) === 'folder' ? 'folder' : 'browser'),
  }
}
