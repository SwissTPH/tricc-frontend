import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'
import type { ProjectFiles } from './serialize/index.js'

/**
 * `.tricc` — a ZIP of the project directory.
 *
 * Packaging, never a distinct format: unzip it and the directory layout is exactly what
 * appears (feature/20260825-project-format.md §7). It exists so a project can be shared,
 * and so browsers that cannot write to a folder still have a way out.
 */

export const ARCHIVE_EXTENSION = '.tricc'

/**
 * ZIP cannot represent a timestamp before 1980, so a fixed one is used rather than the
 * clock: the archive bytes must be deterministic for identical content, and a real mtime
 * would make every export differ from the last.
 */
const ZIP_EPOCH = Date.UTC(1980, 0, 1)

export function toArchive(files: ProjectFiles): Uint8Array {
  const entries: Record<string, Uint8Array> = {}
  // Sorted so the archive bytes are deterministic for identical content — the same
  // guarantee the file writer makes, extended to the packaged form.
  for (const path of Object.keys(files).sort()) {
    entries[path] = strToU8(files[path] as string)
  }
  return zipSync(entries, { level: 6, mtime: ZIP_EPOCH })
}

export function fromArchive(data: Uint8Array): ProjectFiles {
  const entries = unzipSync(data)
  const files: ProjectFiles = {}
  for (const [rawPath, bytes] of Object.entries(entries)) {
    // Directory entries carry no content.
    if (rawPath.endsWith('/')) continue
    const path = stripRoot(rawPath)
    if (path === '') continue
    files[path] = strFromU8(bytes)
  }
  return files
}

/**
 * Archives produced elsewhere often wrap everything in a single top-level folder — that
 * is what most zip tools do when you compress a directory. Strip it so importing a
 * hand-zipped project works rather than failing with "missing project.json".
 */
export function stripCommonRoot(files: ProjectFiles): ProjectFiles {
  const paths = Object.keys(files)
  if (paths.length === 0 || paths.some((p) => !p.includes('/'))) return files

  const firstSegments = new Set(paths.map((p) => p.slice(0, p.indexOf('/'))))
  if (firstSegments.size !== 1) return files

  const root = `${[...firstSegments][0]}/`
  const stripped: ProjectFiles = {}
  for (const [path, content] of Object.entries(files)) {
    stripped[path.slice(root.length)] = content
  }
  // Only accept the strip if it actually produced a project.
  return 'project.json' in stripped ? stripped : files
}

function stripRoot(path: string): string {
  return path.replace(/^\.\//, '').replace(/^\/+/, '')
}

/** Normalize an imported file set: strip a wrapping folder, drop anything irrelevant. */
export function normalizeImport(files: ProjectFiles): ProjectFiles {
  const stripped = stripCommonRoot(files)
  const out: ProjectFiles = {}
  for (const [path, content] of Object.entries(stripped)) {
    // macOS archives carry these; they are not part of a project and confuse the reader.
    if (path.startsWith('__MACOSX/') || path.endsWith('/.DS_Store')) continue
    out[path] = content
  }
  return out
}
