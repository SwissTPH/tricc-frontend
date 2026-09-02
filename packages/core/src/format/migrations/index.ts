import { FORMAT_VERSION } from '../schema/project.js'

/**
 * Format migrations.
 *
 * The machinery goes in at v1 deliberately: the cost of adding it once real guidelines
 * exist in the field is much higher (feature/20260825-project-format.md §8).
 */

export interface Migration {
  /** Version this migration produces. */
  to: string
  /** Pure transform of the raw, pre-decode project object. */
  up(raw: unknown): unknown
}

export class FormatVersionError extends Error {
  constructor(
    readonly declared: string,
    readonly supported: string,
    message: string,
  ) {
    super(message)
    this.name = 'FormatVersionError'
  }
}

/** Registered in ascending order. */
export const MIGRATIONS: Migration[] = []

export function parseVersion(v: string): [number, number, number] {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v.trim())
  if (!m) throw new FormatVersionError(v, FORMAT_VERSION, `unreadable formatVersion "${v}"`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] as number) - (pb[i] as number)
    if (d !== 0) return d < 0 ? -1 : 1
  }
  return 0
}

export function needsMigration(declared: string): boolean {
  const [major] = parseVersion(declared)
  const [supportedMajor] = parseVersion(FORMAT_VERSION)
  if (major > supportedMajor) {
    throw new FormatVersionError(
      declared,
      FORMAT_VERSION,
      `This project uses format version ${declared}, which needs a newer version of TRICC. ` +
        `This build reads up to ${FORMAT_VERSION}.`,
    )
  }
  if (major < supportedMajor) {
    throw new FormatVersionError(
      declared,
      FORMAT_VERSION,
      `Format version ${declared} is no longer supported by this build (reads ${FORMAT_VERSION}).`,
    )
  }
  return compareVersions(declared, FORMAT_VERSION) < 0
}

/** Apply every registered migration above `declared`, in order. */
export function migrate(raw: unknown, declared: string): unknown {
  let current = raw
  let version = declared
  for (const m of MIGRATIONS) {
    if (compareVersions(version, m.to) < 0) {
      current = m.up(current)
      version = m.to
    }
  }
  if (current && typeof current === 'object') {
    ;(current as Record<string, unknown>)['formatVersion'] = FORMAT_VERSION
  }
  return current
}
