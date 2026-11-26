/**
 * A project's capability statements (feature/20261125-output-capabilities.md §1.1, §1.4): the
 * `tricc.yaml` entries and their copies, loaded and resolved offline, and the edits of the
 * Outputs tab as plain functions over `(entries, files)`.
 */
import type { CapabilityEntry, Project } from '../model/types.js'
import { issue, type Issue } from '../validate/types.js'
import { sha256Hex } from './sha256.js'
import {
  StatementError,
  resolveStatement,
  versionSatisfies,
  statementLabel,
  statementProblem,
  type ResolvedStatement,
  type Statement,
} from './statement.js'

/** Where a statement's copy is kept: `capabilities/<package>@<version>.json`. */
export const statementPath = (pkg: string, version: string) => `capabilities/${pkg}@${version}.json`

/** The copy's text: two-space JSON and a final newline, as tricc writes its packages. */
export const statementText = (statement: Statement) => `${JSON.stringify(statement, null, 2)}\n`

export interface ProjectStatements {
  /** Every loaded statement that reads and validates, by package. */
  loaded: Map<string, Statement>
  /** The active ones, resolved. */
  active: ResolvedStatement[]
  issues: Issue[]
}

const at = (entry: CapabilityEntry) => ({ field: 'capabilities', conceptCode: entry.package })

/**
 * Read every entry's copy (sha256, schema, package and version), then resolve the active ones.
 * `langVersion` (the pinned tricc-lang) adds `capability.lang` when a statement's range excludes it.
 */
export function projectStatements(project: Project, langVersion?: string): ProjectStatements {
  const loaded = new Map<string, Statement>()
  const issues: Issue[] = []
  const entries = project.capabilities ?? []
  for (const entry of entries) {
    const text = project.capabilityFiles?.[entry.file]
    const fail = (message: string) =>
      issues.push(issue('capability.file', 'error', `${entry.file}: ${message}`, at(entry)))
    if (text === undefined) {
      fail('the copy of this statement is missing. Load it again from its source.')
      continue
    }
    if (entry.sha256 && sha256Hex(text) !== entry.sha256.toLowerCase()) {
      fail('the copy does not match its sha256 in tricc.yaml. Load it again from its source.')
      continue
    }
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      fail('not JSON.')
      continue
    }
    const problem = statementProblem(data)
    if (problem) {
      fail(`not a capability statement (${problem}).`)
      continue
    }
    const statement = data as Statement
    if (statement.id !== entry.package || statement.version !== entry.version) {
      fail(`holds ${statementLabel(statement)}, tricc.yaml says ${entry.package}@${entry.version}.`)
      continue
    }
    loaded.set(entry.package, statement)
  }
  const active: ResolvedStatement[] = []
  for (const entry of entries) {
    if (!entry.active || !loaded.has(entry.package)) continue
    try {
      const resolved = resolveStatement(entry.package, loaded)
      if (langVersion && !versionSatisfies(langVersion, resolved.lang)) {
        issues.push(
          issue(
            'capability.lang',
            'warning',
            `${statementLabel(resolved)} names operators and functions of tricc-lang ${resolved.lang}; this editor uses ${langVersion}.`,
            at(entry),
          ),
        )
      }
      active.push(resolved)
    } catch (e) {
      if (!(e instanceof StatementError)) throw e
      issues.push(issue('capability.extends', 'error', e.message, at(entry)))
    }
  }
  return { loaded, active, issues }
}

export interface StatementSet {
  entries: CapabilityEntry[]
  files: Record<string, string>
}

/** The project's entries and copies, ready for `setCapabilities`. */
export const statementSet = (project: Project): StatementSet => ({
  entries: (project.capabilities ?? []).map((e) => ({ ...e })),
  files: { ...(project.capabilityFiles ?? {}) },
})

/**
 * Add (or replace, same package) a statement and its copy. `active` defaults to true for the
 * statement itself; parents loaded with it come in inactive.
 */
export function withStatement(
  set: StatementSet,
  statement: Statement,
  source: { source: CapabilityEntry['source']; registry?: string },
  active = true,
): StatementSet {
  const text = statementText(statement)
  const file = statementPath(statement.id, statement.version)
  const previous = set.entries.find((e) => e.package === statement.id)
  const files = { ...set.files }
  if (previous && previous.file !== file) delete files[previous.file]
  files[file] = text
  const entry: CapabilityEntry = {
    package: statement.id,
    version: statement.version,
    source: source.source,
    ...(source.registry ? { registry: source.registry } : {}),
    file,
    sha256: sha256Hex(text),
    active: previous ? previous.active : active,
  }
  const entries = previous
    ? set.entries.map((e) => (e.package === statement.id ? entry : e))
    : [...set.entries, entry]
  return { entries, files }
}

/** Activate or deactivate one statement. */
export const withActive = (set: StatementSet, pkg: string, active: boolean): StatementSet => ({
  entries: set.entries.map((e) => (e.package === pkg ? { ...e, active } : e)),
  files: set.files,
})

/** Remove a statement and its copy. */
export function withoutStatement(set: StatementSet, pkg: string): StatementSet {
  const entry = set.entries.find((e) => e.package === pkg)
  const files = { ...set.files }
  if (entry) delete files[entry.file]
  return { entries: set.entries.filter((e) => e.package !== pkg), files }
}
