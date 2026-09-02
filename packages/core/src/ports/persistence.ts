import type { ProjectFiles } from '../format/serialize/index.js'

/**
 * Where projects are stored. The local shells and a hosted service differ here and
 * essentially nowhere else (feature/20260825-library-architecture.md §3).
 */

export interface ProjectRef {
  /** Stable within a catalog. */
  id: string
  name: string
  /** Adapter-private handle (a FileSystemDirectoryHandle, a URL, a key). */
  handle?: unknown
}

export interface PersistenceCapabilities {
  /** Can detect a change made outside the tool. */
  canWatch: boolean
  /** Can write one changed file rather than the whole project. */
  canWriteIncrementally: boolean
}

export interface WriteRequest {
  files: ProjectFiles
  changed: string[]
  removed: string[]
}

export interface Disposable {
  dispose(): void
}

export interface PersistencePort {
  readonly id: string
  capabilities(): PersistenceCapabilities
  read(ref: ProjectRef): Promise<ProjectFiles>
  write(ref: ProjectRef, req: WriteRequest): Promise<void>
  watch?(ref: ProjectRef, onExternalChange: (paths: string[]) => void): Disposable
}
