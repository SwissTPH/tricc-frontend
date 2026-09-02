/**
 * The slice of the File System Access API these adapters use.
 *
 * Declared structurally rather than taken from lib.dom so the adapter can be exercised
 * outside a browser — the alternative is a persistence layer whose only test is an e2e
 * run, which is where silent data loss hides.
 */
export interface DirHandle {
  readonly name: string
  readonly kind: 'directory'
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirHandle>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>
  entries(): AsyncIterableIterator<[string, DirHandle | FileHandle]>
  queryPermission?(desc: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission?(desc: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
}

export interface FileHandle {
  readonly name: string
  readonly kind: 'file'
  getFile(): Promise<{ text(): Promise<string>; lastModified: number }>
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>
}

export function isDir(h: DirHandle | FileHandle): h is DirHandle {
  return h.kind === 'directory'
}

/** Walk a project-relative path, creating intermediate directories on demand. */
export async function resolveFile(
  root: DirHandle,
  path: string,
  create: boolean,
): Promise<FileHandle | undefined> {
  const parts = path.split('/')
  const fileName = parts.pop()
  if (!fileName) return undefined
  let dir = root
  for (const part of parts) {
    try {
      dir = await dir.getDirectoryHandle(part, { create })
    } catch {
      return undefined
    }
  }
  try {
    return await dir.getFileHandle(fileName, { create })
  } catch {
    return undefined
  }
}

/** Every file under `root`, keyed by project-relative path. */
export async function readAll(root: DirHandle, prefix = ''): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for await (const [name, handle] of root.entries()) {
    const path = prefix ? `${prefix}/${name}` : name
    if (isDir(handle)) {
      Object.assign(out, await readAll(handle, path))
    } else {
      out[path] = await (await handle.getFile()).text()
    }
  }
  return out
}
