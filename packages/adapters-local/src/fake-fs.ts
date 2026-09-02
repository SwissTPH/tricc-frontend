import type { DirHandle, FileHandle } from './fs.js'

/**
 * An in-memory File System Access implementation, for testing persistence without a
 * browser. Models the parts that matter: nested directories, permission prompts, and
 * modification times — which is what external-change detection depends on.
 */

interface FakeFile {
  content: string
  lastModified: number
}

/** Shared across the whole tree so a nested write is visible from the root. */
interface Clock {
  value: number
}

export class FakeDir implements DirHandle {
  readonly kind = 'directory' as const
  private readonly dirs = new Map<string, FakeDir>()
  private readonly files = new Map<string, FakeFile>()
  /** Set to 'prompt' or 'denied' to exercise the permission path. */
  permission: PermissionState = 'granted'
  /** Whether a prompt would be granted. */
  grantOnRequest = true
  private readonly sharedClock: Clock

  constructor(
    readonly name = 'project',
    clock?: Clock,
  ) {
    this.sharedClock = clock ?? { value: 1 }
  }

  /** Advanced by writes rather than by wall time, so mtime assertions are deterministic. */
  get clock(): number {
    return this.sharedClock.value
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirHandle> {
    const existing = this.dirs.get(name)
    if (existing) return existing
    if (!options?.create) throw new Error(`NotFoundError: ${name}`)
    const dir = new FakeDir(name, this.sharedClock)
    dir.permission = this.permission
    dir.grantOnRequest = this.grantOnRequest
    this.dirs.set(name, dir)
    return dir
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle> {
    if (!this.files.has(name)) {
      if (!options?.create) throw new Error(`NotFoundError: ${name}`)
      this.files.set(name, { content: '', lastModified: this.tick() })
    }
    const store = this.files
    const tick = () => this.tick()
    return {
      kind: 'file',
      name,
      async getFile() {
        const f = store.get(name) as FakeFile
        return { text: async () => f.content, lastModified: f.lastModified }
      },
      async createWritable() {
        let buffer = ''
        return {
          async write(data: string) {
            buffer += data
          },
          async close() {
            store.set(name, { content: buffer, lastModified: tick() })
          },
        }
      },
    }
  }

  async removeEntry(name: string, options?: { recursive?: boolean }): Promise<void> {
    if (this.files.delete(name)) return
    if (this.dirs.has(name)) {
      if (!options?.recursive && this.dirs.get(name)?.isNonEmpty()) {
        throw new Error('InvalidModificationError: directory not empty')
      }
      this.dirs.delete(name)
      return
    }
    throw new Error(`NotFoundError: ${name}`)
  }

  async *entries(): AsyncIterableIterator<[string, DirHandle | FileHandle]> {
    for (const [name, dir] of this.dirs) yield [name, dir]
    for (const name of this.files.keys()) yield [name, await this.getFileHandle(name)]
  }

  async queryPermission(): Promise<PermissionState> {
    return this.permission
  }

  async requestPermission(): Promise<PermissionState> {
    this.permission = this.grantOnRequest ? 'granted' : 'denied'
    return this.permission
  }

  /** Simulate an edit made outside the tool - a git pull, another editor. */
  externalWrite(path: string, content: string): void {
    const parts = path.split('/')
    const fileName = parts.pop() as string
    let dir: FakeDir = this
    for (const part of parts) {
      const next = dir.dirs.get(part) ?? new FakeDir(part, this.sharedClock)
      dir.dirs.set(part, next)
      dir = next
    }
    dir.files.set(fileName, { content, lastModified: this.tick() })
  }

  private isNonEmpty(): boolean {
    return this.dirs.size > 0 || this.files.size > 0
  }

  private tick(): number {
    return ++this.sharedClock.value
  }
}
