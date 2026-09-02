import type { Activity, Project } from '../../model/types.js'
import { activityPath, codeSystemPath, libraryPath, PATHS } from '../../model/types.js'
import {
  decodeActivity,
  decodeCodeSystem,
  decodeProjectMeta,
  encodeActivity,
  encodeCodeSystem,
  encodeProjectMeta,
} from '../codec.js'
import { fromJson, fromYaml, toJson, toYaml } from './yaml.js'
import { FORMAT_VERSION } from '../schema/project.js'
import { migrate, needsMigration, FormatVersionError } from '../migrations/index.js'

/** The file set that makes up a project on disk. Keys are project-relative paths. */
export type ProjectFiles = Record<string, string>

export interface ReadResult {
  project: Project
  /** Files that were migrated from an older format version. */
  migratedFrom?: string
}

/** Serialize a whole project to its file set. */
export function writeProject(project: Project): ProjectFiles {
  const files: ProjectFiles = {}
  const lang = project.languages.default

  files[PATHS.project] = toJson(encodeProjectMeta(project))

  for (const id of Object.keys(project.activities).sort()) {
    const a = project.activities[id]
    if (!a) continue
    files[activityPath(id)] = toYaml(encodeActivity(a, lang, project.formatVersion))
  }
  for (const url of Object.keys(project.codeSystems).sort()) {
    const cs = project.codeSystems[url]
    if (!cs) continue
    files[codeSystemPath(cs.id)] = toJson(encodeCodeSystem(cs))
  }
  for (const name of Object.keys(project.libraries).sort()) {
    files[libraryPath(name)] = project.libraries[name] as string
  }
  return files
}

/** Serialize only what changed, given the previous file set. */
export function writeChanged(
  project: Project,
  previous: ProjectFiles,
): {
  files: ProjectFiles
  changed: string[]
  removed: string[]
} {
  const files = writeProject(project)
  const changed = Object.keys(files).filter((p) => previous[p] !== files[p])
  const removed = Object.keys(previous).filter((p) => !(p in files))
  return { files, changed, removed }
}

const ACTIVITY_RE = /^activities\/(.+)\.activity\.yaml$/
const CODESYSTEM_RE = /^terminology\/(.+)\.codesystem\.json$/
const LIBRARY_RE = /^cql\/(.+)\.cql$/

/** Parse a file set into a project. Deterministic: same files always give the same structure. */
export function readProject(files: ProjectFiles): ReadResult {
  const projectRaw = files[PATHS.project]
  if (projectRaw === undefined) {
    throw new Error(`missing ${PATHS.project} — not a TRICC project directory`)
  }

  let raw = fromJson(projectRaw) as Record<string, unknown>
  const declared = String(raw['formatVersion'] ?? '')
  let migratedFrom: string | undefined
  if (needsMigration(declared)) {
    raw = migrate(raw, declared) as Record<string, unknown>
    migratedFrom = declared
  }

  const meta = decodeProjectMeta(raw)
  const lang = meta.languages.default

  const project: Project = {
    ...meta,
    activities: {},
    codeSystems: {},
    libraries: {},
  }

  for (const path of Object.keys(files).sort()) {
    const content = files[path] as string
    const am = ACTIVITY_RE.exec(path)
    if (am) {
      const activity = decodeActivity(fromYaml(content), lang)
      project.activities[activity.id] = activity
      continue
    }
    const cm = CODESYSTEM_RE.exec(path)
    if (cm) {
      const cs = decodeCodeSystem(fromJson(content))
      project.codeSystems[cs.url] = cs
      continue
    }
    const lm = LIBRARY_RE.exec(path)
    if (lm) {
      project.libraries[lm[1] as string] = content
    }
  }

  const result: ReadResult = { project }
  if (migratedFrom !== undefined) result.migratedFrom = migratedFrom
  return result
}

/** An empty project, ready to author into. */
export function createProject(opts: { id: string; title?: string; language?: string }): Project {
  const lang = opts.language ?? 'en'
  const project: Project = {
    formatVersion: FORMAT_VERSION,
    id: opts.id,
    languages: { default: lang, available: [lang] },
    interventions: [],
    contexts: [],
    codeSystems: {},
    libraries: {},
    activities: {},
  }
  if (opts.title !== undefined) project.title = { [lang]: opts.title }
  return project
}

/**
 * A normal, reusable activity: rooted by `activity_start`, carrying no process.
 */
export function createActivity(opts: { id: string; title?: string; language?: string }): Activity {
  const lang = opts.language ?? 'en'
  const rootId = 'start'
  const activity: Activity = {
    id: opts.id,
    nodeOrder: [rootId],
    edgeOrder: [],
    nodes: {
      [rootId]: {
        id: rootId,
        type: 'activity_start',
        name: toName(opts.id),
        ui: { x: 80, y: 40 },
      },
    },
    edges: {},
  }
  if (opts.title !== undefined) activity.title = { [lang]: opts.title }
  return activity
}

/**
 * A process activity: rooted by `start` carrying the process, and wrapping calls to
 * normal activities. `process` is set on both the root node and the activity so either
 * read path in `tricc_oo` resolves it.
 */
export function createProcessActivity(opts: {
  id: string
  process: string
  title?: string
  language?: string
  /** Normal activities to call, in order. */
  calls?: string[]
}): Activity {
  const lang = opts.language ?? 'en'
  const rootId = 'start'
  const activity: Activity = {
    id: opts.id,
    process: opts.process,
    nodeOrder: [rootId],
    edgeOrder: [],
    nodes: {
      [rootId]: {
        id: rootId,
        type: 'start',
        name: toName(opts.id),
        process: opts.process,
        formId: toName(opts.id),
        ui: { x: 80, y: 40 },
      },
    },
    edges: {},
  }
  if (opts.title !== undefined) activity.title = { [lang]: opts.title }

  let previous = rootId
  let y = 140
  for (const call of opts.calls ?? []) {
    const nodeId = `call-${call}`
    activity.nodes[nodeId] = { id: nodeId, type: 'goto', link: call, ui: { x: 80, y } }
    activity.nodeOrder.push(nodeId)
    const edgeId = `e-${previous}-${nodeId}`
    activity.edges[edgeId] = { id: edgeId, source: previous, target: nodeId }
    activity.edgeOrder.push(edgeId)
    previous = nodeId
    y += 96
  }

  const endId = 'end'
  activity.nodes[endId] = { id: endId, type: 'end', ui: { x: 80, y } }
  activity.nodeOrder.push(endId)
  const lastEdge = `e-${previous}-${endId}`
  activity.edges[lastEdge] = { id: lastEdge, source: previous, target: endId }
  activity.edgeOrder.push(lastEdge)

  return activity
}

function toName(id: string): string {
  return id.replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1')
}

export { FormatVersionError, toYaml, fromYaml, toJson, fromJson }
