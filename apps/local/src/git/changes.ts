import { isBinaryPath, type FileContent, type ProjectFiles } from '@tricc/core'
import { bytesOf, type FileChange, type Tree } from './host.js'

/**
 * What an author changed, and how it applies to a branch. Pure functions over git blob
 * ids, so the rules are tested without a host.
 */

/** Folders the project owns: a file there that the project no longer has is deleted. */
const OWNED = ['activities/', 'terminology/', 'cql/', 'media/']

/** Folders never read from a repository: build output, dependencies, tooling. */
const SKIPPED = /(^|\/)(\.[^/]*|node_modules|build|dist|out|output)(\/|$)/

const IMPORTED_EXT = /\.(ya?ml|json|cql|drawio|xml|po)$/i

export function isOwnedPath(path: string): boolean {
  return OWNED.some((p) => path.startsWith(p))
}

/** Whether a repository file belongs to the project and is read on import. */
export function isImportablePath(path: string): boolean {
  if (SKIPPED.test(path)) return false
  return IMPORTED_EXT.test(path) || isBinaryPath(path) || path.toLowerCase().endsWith('.svg')
}

/** The git blob id of a file: SHA-1 of `blob <size>\0<bytes>`, as `git hash-object` gives. */
export async function blobId(content: FileContent): Promise<string> {
  const bytes = bytesOf(content)
  const header = new TextEncoder().encode(`blob ${bytes.length}\0`)
  const all = new Uint8Array(header.length + bytes.length)
  all.set(header)
  all.set(bytes, header.length)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', all))
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function blobsOf(files: ProjectFiles): Promise<Tree> {
  const out: Tree = new Map()
  for (const [path, content] of Object.entries(files)) out.set(path, await blobId(content))
  return out
}

/** One file the author changed since `base`: its blob now, or undefined when deleted. */
export interface Edit {
  path: string
  blob: string | undefined
}

/**
 * The author's own changes: files that differ from the version they started from. A file
 * the project no longer has counts only in the folders the project owns, so a README or a
 * `.drawio` source next to it is never deleted.
 */
export function editsSince(local: Tree, base: Tree): Edit[] {
  const out: Edit[] = []
  for (const [path, blob] of local) if (base.get(path) !== blob) out.push({ path, blob })
  for (const path of base.keys())
    if (!local.has(path) && isOwnedPath(path)) out.push({ path, blob: undefined })
  return out.sort((a, b) => a.path.localeCompare(b.path))
}

export interface Plan {
  /** Changes to commit on the target, relative to what it holds now. */
  apply: { path: string; kind: FileChange['kind']; blob: string | undefined }[]
  /** Already the same on the target: an earlier proposal, merged or open. */
  same: string[]
  /** Changed on the target by someone else as well. */
  conflicts: string[]
}

/**
 * Apply the author's edits to a branch file by file. A file is taken over only when the
 * branch still holds the version the author started from (or what this app pushed there
 * before); anything else was changed by someone else and is a conflict, never overwritten
 * silently.
 */
export function planOnto(
  edits: Edit[],
  base: Tree,
  target: Tree,
  pushed: Record<string, string | null> = {},
): Plan {
  const plan: Plan = { apply: [], same: [], conflicts: [] }
  for (const e of edits) {
    const there = target.get(e.path)
    if (there === e.blob) {
      plan.same.push(e.path)
      continue
    }
    const ours = e.path in pushed ? (pushed[e.path] ?? undefined) : null
    if (there !== base.get(e.path) && there !== ours) {
      plan.conflicts.push(e.path)
      continue
    }
    const kind = e.blob === undefined ? 'delete' : there === undefined ? 'add' : 'change'
    plan.apply.push({ path: e.path, kind, blob: e.blob })
  }
  return plan
}

/** Conflicting files, taken over anyway when the author chooses to. */
export function withConflicts(plan: Plan, target: Tree, edits: Edit[]): Plan['apply'] {
  const extra = plan.conflicts.map((path) => {
    const blob = edits.find((e) => e.path === path)?.blob
    const kind: FileChange['kind'] =
      blob === undefined ? 'delete' : target.has(path) ? 'change' : 'add'
    return { path, kind, blob }
  })
  return [...plan.apply, ...extra].sort((a, b) => a.path.localeCompare(b.path))
}

/** Repository bytes as project files: pictures stay bytes, everything else is text. */
export function asProjectFiles(raw: Record<string, Uint8Array>): ProjectFiles {
  const out: ProjectFiles = {}
  const decoder = new TextDecoder()
  for (const [path, bytes] of Object.entries(raw))
    out[path] = isBinaryPath(path) ? bytes : decoder.decode(bytes)
  return out
}
