import type { Activity, Project } from '../../model/types.js'
import { activityPath, codeSystemPath, libraryPath, PATHS } from '../../model/types.js'
import { decodeActivity, decodeCodeSystem, encodeActivity, encodeCodeSystem } from '../codec.js'
import { moveTextsToConcepts } from '../../terminology/texts-to-concepts.js'
import { fromJson, fromYaml, toJson, toYaml } from './yaml.js'
import {
  encodeTriccYaml,
  peekTriccLanguages,
  readTriccYamlMeta,
  triccConfigText,
  triccTerminologyGlobs,
} from './tricc-yaml.js'
import { FORMAT_VERSION } from '../schema/project.js'
import { FormatVersionError } from '../migrations/index.js'

/** The file set that makes up a project on disk. Keys are project-relative paths. */
export type ProjectFiles = Record<string, string>

export interface ReadResult {
  project: Project
  /** Files that were migrated from an older format version. */
  migratedFrom?: string
}

/** Serialize a whole project to its file set. `project.json` is never written. */
export function writeProject(project: Project): ProjectFiles {
  const files: ProjectFiles = {}
  const lang = project.languages.default

  // Same activities, referenced by path. Not a second copy of the flow.
  files[PATHS.tricc] = toYaml(encodeTriccYaml(project))

  for (const id of Object.keys(project.activities).sort()) {
    const a = project.activities[id]
    if (!a) continue
    files[activityPath(id)] = toYaml(encodeActivity(a, lang, project.formatVersion))
  }
  for (const url of Object.keys(project.codeSystems).sort()) {
    const cs = project.codeSystems[url]
    if (!cs) continue
    files[cs.path ?? codeSystemPath(cs.id)] = toJson(encodeCodeSystem(cs))
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
  // A `.drawio` stays in the folder. Saving writes activity YAML and points
  // tricc.yaml at those paths; it does not delete or rewrite the drawing.
  // Anything else that is not part of the project file set (a README, media
  // that was never in the baseline) is left alone. `project.json` is removed
  // when it was part of the baseline, because it is no longer the document.
  const removed = Object.keys(previous).filter((p) => !(p in files) && isManaged(p))
  return { files, changed, removed }
}

function isManaged(path: string): boolean {
  if (path.endsWith('.drawio')) return false
  return (
    path === PATHS.project ||
    path === PATHS.tricc ||
    path === 'tricc.yml' ||
    path.startsWith(`${PATHS.activities}/`) ||
    path.startsWith(`${PATHS.terminology}/`) ||
    path.startsWith(`${PATHS.cql}/`)
  )
}

const ACTIVITY_RE = /^activities\/[^/]+\.ya?ml$/
const CODESYSTEM_RE = /^terminology\/(.+)\.codesystem\.json$/
const LIBRARY_RE = /^cql\/(.+)\.cql$/

/** Parse a file set into a project. Deterministic: same files always give the same structure. */
export function readProject(files: ProjectFiles): ReadResult {
  const triccRaw = triccConfigText(files)
  if (triccRaw === undefined) {
    throw new Error(
      `missing ${PATHS.tricc} — not a TRICC project directory. Add a tricc.yaml whose activity paths point at activity YAML or draw.io files.`,
    )
  }
  // An old project.json beside tricc.yaml is not the document. It is ignored.
  return readFromTriccYaml(files, triccRaw)
}

/**
 * `tricc.yaml` plus activity YAML. A listed `.drawio` is expanded into activities.
 * Saving then writes those activities as YAML. The drawing file is not the saved form.
 */
function readFromTriccYaml(files: ProjectFiles, triccRaw: string): ReadResult {
  const languages = peekTriccLanguages(triccRaw)
  const { project: loaded, idByPath } = attachFiles(
    {
      formatVersion: FORMAT_VERSION,
      id: 'project',
      languages,
      interventions: [],
      contexts: [],
    },
    files,
    languages.default,
  )
  readListedTerminology(loaded, files, triccTerminologyGlobs(triccRaw))
  const meta = readTriccYamlMeta(triccRaw, files, idByPath, new Set(Object.keys(loaded.activities)))
  loaded.id = meta.id
  loaded.languages = meta.languages
  loaded.interventions = meta.interventions
  loaded.contexts = meta.contexts
  if (meta.title) loaded.title = meta.title
  if (meta.description) loaded.description = meta.description
  if (meta.system) loaded.system = meta.system
  if (meta.code) loaded.code = meta.code
  if (meta.version) loaded.version = meta.version
  if (meta.defaultCodeSystem) loaded.defaultCodeSystem = meta.defaultCodeSystem
  if (meta.mediaPath) loaded.mediaPath = meta.mediaPath
  for (const [id, activity] of Object.entries(meta.drawioActivities)) {
    if (loaded.activities[id]) {
      throw new Error(
        `The draw.io page "${id}" uses the same id as an activity file already in this folder. Rename one of them so each activity is stored once.`,
      )
    }
    loaded.activities[id] = activity
  }
  migrateFormIds(loaded)
  // Texts move from the activity files to the concepts they stand for.
  const texts = moveTextsToConcepts(loaded)
  const result: ReadResult = { project: loaded }
  // Opening a diagram is unsaved until activity YAML is written, so the next
  // save points tricc.yaml at those files and the edit is not lost.
  if (meta.expandedDrawio) result.migratedFrom = 'drawio'
  // An activity file at another path than activities/<id>.activity.yaml is moved there on
  // the next save. Treating it as a migration keeps the baseline equal to the folder, so
  // the save renames it and rewrites tricc.yaml, instead of leaving two copies of one id.
  else if ([...idByPath].some(([path, id]) => path !== activityPath(id))) {
    result.migratedFrom = 'activity-paths'
  }
  // Labels, hints and help moved into the CodeSystem: the first save writes both.
  else if (texts.touched.length > 0) result.migratedFrom = 'concept-texts'
  return result
}

/**
 * `form_id` is a remnant of the time one drawing was one form. The intervention names
 * the form now. An intervention with no name takes the `form_id` of the first process
 * it lists, so existing form names do not change. Then `form_id` is dropped everywhere.
 */
export function migrateFormIds(project: Project): void {
  for (const iv of project.interventions) {
    if (iv.name) continue
    for (const ref of iv.activities) {
      const activity = project.activities[ref.ref]
      const start = activity && Object.values(activity.nodes).find((n) => n.type === 'start')
      if (start?.form_id) {
        iv.name = start.form_id
        break
      }
    }
  }
  for (const activity of Object.values(project.activities)) {
    for (const node of Object.values(activity.nodes)) delete node.form_id
  }
}

/**
 * CodeSystems that `tricc.yaml` lists under `terminology` (paths or globs, as `tricc_oo`
 * reads them), wherever they sit. A file already read from `terminology/` is not read twice.
 */
function readListedTerminology(project: Project, files: ProjectFiles, globs: string[]): void {
  if (globs.length === 0) return
  const patterns = globs.map(globToRegExp)
  for (const path of Object.keys(files).sort()) {
    if (!path.endsWith('.json') || CODESYSTEM_RE.test(path)) continue
    if (!patterns.some((re) => re.test(path))) continue
    let raw: unknown
    try {
      raw = fromJson(files[path] as string)
    } catch {
      continue
    }
    if (!raw || (raw as { resourceType?: unknown }).resourceType !== 'CodeSystem') continue
    const cs = decodeCodeSystem(raw)
    if (project.codeSystems[cs.url]) continue
    if (path !== codeSystemPath(cs.id)) cs.path = path
    project.codeSystems[cs.url] = cs
  }
}

function globToRegExp(glob: string): RegExp {
  const body = glob
    .replace(/^\.\//, '')
    .split('**')
    .map((part) =>
      part
        .split('*')
        .map((chunk) => chunk.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]*'),
    )
    .join('.*')
  return new RegExp(`^${body}$`)
}

function attachFiles(
  meta: Omit<Project, 'activities' | 'codeSystems' | 'libraries'>,
  files: ProjectFiles,
  lang: string,
): { project: Project; idByPath: Map<string, string> } {
  const project: Project = { ...meta, activities: {}, codeSystems: {}, libraries: {} }
  const idByPath = new Map<string, string>()
  for (const path of Object.keys(files).sort()) {
    const content = files[path] as string
    if (ACTIVITY_RE.test(path)) {
      let activity
      try {
        activity = decodeActivity(fromYaml(content), lang)
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        throw new Error(
          `${path} could not be read as an activity (${message}). Fix that file, or remove it from the folder, then import again.`,
        )
      }
      if (project.activities[activity.id]) {
        throw new Error(
          `Two files declare the activity id "${activity.id}". An activity is stored once — keep one file and point every intervention at it.`,
        )
      }
      project.activities[activity.id] = activity
      idByPath.set(path, activity.id)
      continue
    }
    if (CODESYSTEM_RE.test(path)) {
      const cs = decodeCodeSystem(fromJson(content))
      project.codeSystems[cs.url] = cs
      continue
    }
    const lm = LIBRARY_RE.exec(path)
    if (lm) project.libraries[lm[1] as string] = content
  }
  return { project, idByPath }
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
 * normal activities. `process` is on the activity: the start node is the activity.
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


export { FormatVersionError, toYaml, fromYaml, toJson, fromJson }
