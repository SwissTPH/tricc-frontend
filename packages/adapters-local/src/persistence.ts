import type {
  PersistenceCapabilities,
  PersistencePort,
  ProjectFiles,
  ProjectRef,
  WriteRequest,
} from '@tricc/core'
import { readAll, resolveFile, type DirHandle } from './fs.js'

/**
 * File System Access persistence — Chromium.
 *
 * Writes only the files in `changed`, which is what keeps git history clean and continuous
 * saving cheap (feature/20260825-local-app.md §3.1).
 */
export class FileSystemPersistence implements PersistencePort {
  readonly id = 'file-system-access'
  private readonly handles = new Map<string, DirHandle>()
  private readonly mtimes = new Map<string, Map<string, number>>()

  capabilities(): PersistenceCapabilities {
    return { canWatch: true, canWriteIncrementally: true }
  }

  register(ref: ProjectRef, handle: DirHandle): void {
    this.handles.set(ref.id, handle)
  }

  private root(ref: ProjectRef): DirHandle {
    const fromRef = ref.handle as DirHandle | undefined
    const handle = this.handles.get(ref.id) ?? fromRef
    if (!handle)
      throw new Error(`no directory handle for project "${ref.name}" — reopen the folder`)
    return handle
  }

  async read(ref: ProjectRef): Promise<ProjectFiles> {
    const root = this.root(ref)
    await ensurePermission(root, 'read')
    const files = await readAll(root)
    await this.recordMtimes(ref, root, Object.keys(files))
    return files
  }

  async write(ref: ProjectRef, req: WriteRequest): Promise<void> {
    const root = this.root(ref)
    await ensurePermission(root, 'readwrite')

    for (const path of req.changed) {
      const handle = await resolveFile(root, path, true)
      if (!handle) throw new Error(`could not create ${path}`)
      const writable = await handle.createWritable()
      await writable.write(req.files[path] as string)
      await writable.close()
    }
    for (const path of req.removed) {
      await removePath(root, path)
    }
    await this.recordMtimes(ref, root, Object.keys(req.files))
  }

  /**
   * Detects a change made outside the tool by comparing modification times on focus.
   * Polling rather than a real watcher because the File System Access API has no change
   * notification — so this is honest about being best-effort.
   */
  watch(ref: ProjectRef, onExternalChange: (paths: string[]) => void) {
    const check = async () => {
      try {
        const changed = await this.externallyChanged(ref)
        if (changed.length > 0) onExternalChange(changed)
      } catch {
        // A revoked permission or a removed folder is handled on the next read.
      }
    }
    const target = typeof window === 'undefined' ? undefined : window
    target?.addEventListener('focus', check)
    return {
      dispose: () => target?.removeEventListener('focus', check),
    }
  }

  async externallyChanged(ref: ProjectRef): Promise<string[]> {
    const root = this.root(ref)
    const known = this.mtimes.get(ref.id)
    if (!known) return []
    const changed: string[] = []
    for (const [path, mtime] of known) {
      const handle = await resolveFile(root, path, false)
      if (!handle) {
        changed.push(path)
        continue
      }
      const file = await handle.getFile()
      if (file.lastModified !== mtime) changed.push(path)
    }
    return changed
  }

  private async recordMtimes(ref: ProjectRef, root: DirHandle, paths: string[]): Promise<void> {
    const map = new Map<string, number>()
    for (const path of paths) {
      const handle = await resolveFile(root, path, false)
      if (handle) map.set(path, (await handle.getFile()).lastModified)
    }
    this.mtimes.set(ref.id, map)
  }
}

async function removePath(root: DirHandle, path: string): Promise<void> {
  const parts = path.split('/')
  const name = parts.pop()
  if (!name) return
  let dir = root
  for (const part of parts) {
    try {
      dir = await dir.getDirectoryHandle(part)
    } catch {
      return
    }
  }
  try {
    await dir.removeEntry(name)
  } catch {
    // Already gone.
  }
}

async function ensurePermission(root: DirHandle, mode: 'read' | 'readwrite'): Promise<void> {
  if (!root.queryPermission) return
  const state = await root.queryPermission({ mode })
  if (state === 'granted') return
  const requested = await root.requestPermission?.({ mode })
  if (requested !== 'granted') {
    throw new Error('permission to this folder was not granted — reopen it to continue')
  }
}

/**
 * Download/upload persistence — Firefox and Safari, which cannot write to a folder.
 *
 * The project is held in memory and mirrored by the caller; saving means producing a file
 * the user downloads. A user in this mode must know before they close the tab, which is
 * why the capability is declared rather than sniffed.
 */
export class DownloadPersistence implements PersistencePort {
  readonly id = 'download'
  private readonly stores = new Map<string, ProjectFiles>()

  capabilities(): PersistenceCapabilities {
    return { canWatch: false, canWriteIncrementally: false }
  }

  async read(ref: ProjectRef): Promise<ProjectFiles> {
    return { ...(this.stores.get(ref.id) ?? {}) }
  }

  async write(ref: ProjectRef, req: WriteRequest): Promise<void> {
    this.stores.set(ref.id, { ...req.files })
  }

  /** Seed from an uploaded archive or multi-file selection. */
  load(ref: ProjectRef, files: ProjectFiles): void {
    this.stores.set(ref.id, { ...files })
  }

  snapshot(ref: ProjectRef): ProjectFiles {
    return { ...(this.stores.get(ref.id) ?? {}) }
  }
}
