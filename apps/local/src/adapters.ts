import {
  BrowserStoragePersistence,
  FileSystemPersistence,
  IndexedDbCollaboration,
  LocalIdentity,
  LocalPersistence,
  LocalProjectCatalog,
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
  catalog: LocalProjectCatalog
  persistence: LocalPersistence
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
  const catalog = new LocalProjectCatalog()

  const runtime = createTriccRuntime({
    persistence,
    catalog,
    identity,
    collaboration: new IndexedDbCollaboration(),
  })

  return {
    runtime,
    identity,
    catalog,
    persistence,
    canUseFolders: supportsDirectoryAccess(),
    storeFor: (ref) => (persistence.storeFor(ref) === 'folder' ? 'folder' : 'browser'),
  }
}
