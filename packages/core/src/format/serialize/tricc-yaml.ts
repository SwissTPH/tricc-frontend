import type { Activity, Intervention, Project } from '../../model/types.js'
import { activityPath, codeSystemPath, libraryPath, PATHS } from '../../model/types.js'
import { resolve, type LocalizedText } from '../schema/localized.js'
import { activitiesFromDrawio } from '../drawio.js'
import { fromYaml } from './yaml.js'
import type { ProjectFiles } from './index.js'

/**
 * `tricc.yaml` is the project file. Activity bodies are `activities/<id>.activity.yaml`.
 * The same path may be listed on more than one intervention. `project.json` is not written.
 *
 * An intervention with no activity file yet is kept under `draft_interventions`, which
 * `tricc_oo` ignores, so an empty intervention is not lost on save and is not sent to
 * the backend as an empty glob.
 *
 * `start.due` on an intervention stays a UCUM duration. A follow-up authored in the
 * editor is a `continue_with` node whose delay is an ISO-8601 period, saved on the
 * activity file, not on this trigger.
 */

const YAML_EXT = /\.(yaml|yml)$/i
const DRAWIO_EXT = /\.drawio$/i

export function encodeTriccYaml(project: Project): Record<string, unknown> {
  const lang = project.languages.default
  const o: Record<string, unknown> = {}
  const title = writeText(project.title, lang)
  o['title'] = title.text ?? project.id
  if (title.map) o['titles'] = title.map
  const description = writeText(project.description, lang)
  if (description.text) o['description'] = description.text
  if (description.map) o['descriptions'] = description.map
  put(o, 'id', project.id)
  put(o, 'system', project.system)
  put(o, 'code', project.code)
  put(o, 'version', project.version)
  o['input_strategy'] = 'YamlStrategy'
  o['output_strategies'] = ['XLSFormCHTStrategy']
  o['parameters'] = {
    languages: {
      default: project.languages.default,
      available: [...project.languages.available],
    },
  }

  const terms = Object.values(project.codeSystems)
    .map((cs) => codeSystemPath(cs.id))
    .sort()
  if (terms.length > 0) o['terminology'] = terms
  const libs = Object.keys(project.libraries)
    .sort()
    .map((name) => libraryPath(name))
  if (libs.length > 0) o['libraries'] = libs
  if (project.contexts.length > 0) o['contexts'] = project.contexts.map((c) => ({ ...c }))
  put(o, 'default_code_system', project.defaultCodeSystem)
  put(o, 'media_path', project.mediaPath)

  const interventions: Record<string, unknown>[] = []
  const drafts: Record<string, unknown>[] = []
  for (const iv of project.interventions) {
    const encoded = encodeIntervention(iv, project, lang)
    if (encoded.files.length > 0) interventions.push(encoded.item)
    else drafts.push(encoded.draft)
  }
  o['interventions'] = interventions
  if (drafts.length > 0) o['draft_interventions'] = drafts
  return o
}

function encodeIntervention(
  iv: Intervention,
  project: Project,
  lang: string,
): { files: string[]; item: Record<string, unknown>; draft: Record<string, unknown> } {
  const files: string[] = []
  const seen = new Set<string>()
  for (const ref of iv.activities) {
    if (!project.activities[ref.ref]) continue
    const path = activityPath(ref.ref)
    if (seen.has(path)) continue
    seen.add(path)
    files.push(path)
  }

  const item: Record<string, unknown> = { id: iv.id }
  const title = writeText(iv.title, lang)
  item['title'] = title.text ?? iv.id
  if (title.map) item['titles'] = title.map
  const description = writeText(iv.description, lang)
  if (description.text) item['description'] = description.text
  if (description.map) item['descriptions'] = description.map
  put(item, 'code', iv.code)
  const intent = writeText(iv.applicability?.intent, lang)
  if (intent.text) item['intent'] = intent.text
  if (intent.map) item['intents'] = intent.map
  if (files.length > 0) item['activity'] = files

  const start: Record<string, unknown> = { on: 'demand' }
  if (iv.applicability?.expression) start['condition'] = iv.applicability.expression
  item['start'] = start
  if (iv.trigger && iv.trigger.mode !== 'on-demand') item['trigger'] = { ...iv.trigger }

  const draft: Record<string, unknown> = { ...item, activities: iv.activities.map((r) => r.ref) }
  delete draft['activity']
  delete draft['start']
  if (iv.applicability?.expression) draft['condition'] = iv.applicability.expression
  return { files, item, draft }
}

export interface TriccYamlRead {
  id: string
  title?: LocalizedText
  description?: LocalizedText
  system?: string
  code?: string
  version?: string
  languages: { default: string; available: string[] }
  interventions: Intervention[]
  contexts: Project['contexts']
  defaultCodeSystem?: string
  mediaPath?: string
  /** Activities expanded from `.drawio` pages. The source file is left as it was. */
  drawioActivities: Record<string, Activity>
  expandedDrawio: boolean
}

/**
 * Build interventions from `tricc.yaml`. A `.drawio` path is opened in place:
 * each page becomes an activity. `project.json`, if present beside this file, is not read.
 */
export function readTriccYamlMeta(
  text: string,
  files: ProjectFiles,
  activityIdByPath: Map<string, string>,
  takenActivityIds: Set<string>,
): TriccYamlRead {
  let raw: unknown
  try {
    raw = fromYaml(text)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    throw new Error(
      `tricc.yaml could not be parsed (${message}). Fix the YAML, then import the folder again.`,
    )
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('tricc.yaml must be a mapping with a title and an interventions list.')
  }
  const doc = raw as Record<string, unknown>
  const languages = readLanguages(doc['parameters'])
  const title = readText(doc['title'], doc['titles'], languages.default)
  const description = readText(doc['description'], doc['descriptions'], languages.default)

  const drawioActivities: Record<string, Activity> = {}
  const drawioIdsByPath = new Map<string, string[]>()
  let expandedDrawio = false

  const interventions: Intervention[] = []
  const list = doc['interventions']
  if (list !== undefined && !Array.isArray(list)) {
    throw new Error('tricc.yaml interventions must be a list. Each entry needs an id and an activity list.')
  }
  const seenIds = new Set<string>()
  for (const entry of list ?? []) {
    const iv = readIntervention(
      entry,
      files,
      activityIdByPath,
      takenActivityIds,
      drawioActivities,
      drawioIdsByPath,
      languages.default,
      () => {
        expandedDrawio = true
      },
    )
    interventions.push(iv)
    seenIds.add(iv.id)
  }
  for (const entry of asList(doc['draft_interventions'])) {
    const iv = readDraft(entry, languages.default)
    if (seenIds.has(iv.id)) continue
    interventions.push(iv)
  }

  const result: TriccYamlRead = {
    id: typeof doc['id'] === 'string' && doc['id'].trim() ? doc['id'].trim() : slug(plain(title) ?? 'project'),
    languages,
    interventions,
    contexts: readContexts(doc['contexts']),
    drawioActivities,
    expandedDrawio,
  }
  if (title) result.title = title
  if (description) result.description = description
  if (typeof doc['system'] === 'string') result.system = doc['system']
  if (typeof doc['code'] === 'string') result.code = doc['code']
  if (typeof doc['version'] === 'string') result.version = doc['version']
  if (typeof doc['default_code_system'] === 'string') result.defaultCodeSystem = doc['default_code_system']
  if (typeof doc['media_path'] === 'string') result.mediaPath = doc['media_path']
  return result
}

function readIntervention(
  entry: unknown,
  files: ProjectFiles,
  activityIdByPath: Map<string, string>,
  takenActivityIds: Set<string>,
  drawioActivities: Record<string, Activity>,
  drawioIdsByPath: Map<string, string[]>,
  lang: string,
  onDrawio: () => void,
): Intervention {
  if (!entry || typeof entry !== 'object') {
    throw new Error('An intervention in tricc.yaml is not a mapping. Give it an id and an activity list.')
  }
  const rec = entry as Record<string, unknown>
  const id = typeof rec['id'] === 'string' ? rec['id'].trim() : ''
  if (!id) {
    throw new Error('An intervention in tricc.yaml has no id. Add an id so it can be told apart from the others.')
  }
  const groups = activityGroups(rec['activity'])
  const refs: string[] = []
  const seen = new Set<string>()
  for (const group of groups) {
    const paths = resolveGlobs(group, Object.keys(files))
    for (const path of paths) {
      const activityIds = DRAWIO_EXT.test(path)
        ? drawioPages(path, files, takenActivityIds, drawioActivities, drawioIdsByPath, lang, onDrawio)
        : activityIdByPath.get(path)
          ? [activityIdByPath.get(path) as string]
          : []
      if (activityIds.length === 0) {
        throw new Error(
          `"${path}" is listed on intervention "${id}" but is not an activity file this editor can read. Check that it is YAML with an id and a nodes list, or a draw.io file.`,
        )
      }
      for (const activityId of activityIds) {
        if (seen.has(activityId)) continue
        seen.add(activityId)
        refs.push(activityId)
      }
    }
  }
  if (refs.length === 0) {
    throw new Error(
      `Intervention "${id}" has no activity files. In tricc.yaml, point activity at an existing activities/<id>.activity.yaml path or a .drawio file.`,
    )
  }
  return finishIntervention(rec, id, refs.map((ref) => ({ ref })), lang)
}

function drawioPages(
  path: string,
  files: ProjectFiles,
  taken: Set<string>,
  into: Record<string, Activity>,
  cache: Map<string, string[]>,
  lang: string,
  onDrawio: () => void,
): string[] {
  const cached = cache.get(path)
  if (cached) return cached
  const text = files[path]
  if (text === undefined) return []
  let pages: Activity[]
  try {
    pages = activitiesFromDrawio(text, taken, lang)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    throw new Error(`Could not open the draw.io file "${path}" (${message}).`)
  }
  const ids: string[] = []
  for (const activity of pages) {
    into[activity.id] = activity
    ids.push(activity.id)
  }
  cache.set(path, ids)
  onDrawio()
  return ids
}

function readDraft(entry: unknown, lang: string): Intervention {
  if (!entry || typeof entry !== 'object') {
    throw new Error('A draft intervention in tricc.yaml is not a mapping.')
  }
  const rec = entry as Record<string, unknown>
  const id = typeof rec['id'] === 'string' ? rec['id'].trim() : ''
  if (!id) throw new Error('A draft intervention in tricc.yaml has no id.')
  const refs = asList(rec['activities'])
    .map((item) => (typeof item === 'string' ? item : ''))
    .filter(Boolean)
    .map((ref) => ({ ref }))
  const iv = finishIntervention(rec, id, refs, lang)
  if (typeof rec['condition'] === 'string' && rec['condition'].trim()) {
    iv.applicability = { ...iv.applicability, expression: rec['condition'].trim() }
  }
  return iv
}

function finishIntervention(
  rec: Record<string, unknown>,
  id: string,
  activities: Intervention['activities'],
  lang: string,
): Intervention {
  const iv: Intervention = { id, activities }
  const title = readText(rec['title'], rec['titles'], lang)
  if (title) iv.title = title
  const description = readText(rec['description'], rec['descriptions'], lang)
  if (description) iv.description = description
  if (typeof rec['code'] === 'string' && rec['code'].trim()) iv.code = rec['code'].trim()
  const intent = readText(rec['intent'], rec['intents'], lang)
  const start = firstStart(rec['start'])
  const trigger = readTrigger(rec['trigger'])
  iv.trigger = trigger ?? { mode: 'on-demand' }
  if (intent || start?.condition) {
    iv.applicability = {}
    if (intent) iv.applicability.intent = intent
    if (start?.condition) iv.applicability.expression = start.condition
  }
  if (!trigger && start?.on === 'follow_up') {
    const note = [
      description ? resolve(description, lang, lang) : '',
      `Follow-up of ${start.intervention ?? 'another intervention'}` +
        (start.due ? `, due ${start.due}` : '') +
        '. Schedule this follow-up with a Continue with node (an ISO-8601 delay such as P3D). start.due on the intervention stays a UCUM duration and is kept in this sentence.',
    ]
      .filter(Boolean)
      .join(' ')
    iv.description = { [lang]: note }
  }
  return iv
}

function readTrigger(value: unknown): Intervention['trigger'] | undefined {
  if (!value || typeof value !== 'object') return undefined
  const mode = (value as Record<string, unknown>)['mode']
  if (mode !== 'on-demand' && mode !== 'planned' && mode !== 'event') return undefined
  const trigger: NonNullable<Intervention['trigger']> = { mode }
  const event = (value as Record<string, unknown>)['event']
  if (typeof event === 'string') trigger.event = event
  return trigger
}

interface StartView {
  on: string
  condition?: string
  intervention?: string
  due?: string
}

function firstStart(start: unknown): StartView | undefined {
  const items = Array.isArray(start) ? start : start ? [start] : []
  const first = items[0]
  if (!first || typeof first !== 'object') return undefined
  const rec = first as Record<string, unknown>
  const on = typeof rec['on'] === 'string' ? rec['on'] : 'demand'
  const view: StartView = { on }
  if (typeof rec['condition'] === 'string' && rec['condition'].trim()) view.condition = rec['condition'].trim()
  if (typeof rec['intervention'] === 'string') view.intervention = rec['intervention']
  if (rec['due'] !== undefined && rec['due'] !== null) view.due = String(rec['due'])
  return view
}

function activityGroups(activity: unknown): string[][] {
  if (activity === undefined) return []
  if (Array.isArray(activity)) return [activity.map(String)]
  if (activity && typeof activity === 'object') {
    return Object.values(activity as Record<string, unknown>).map((globs) =>
      Array.isArray(globs) ? globs.map(String) : [],
    )
  }
  throw new Error(
    'An intervention activity must be a list of paths or a mapping of strategy to paths, as in tricc.yaml.',
  )
}

function resolveGlobs(globs: string[], paths: string[]): string[] {
  const matched: string[] = []
  const seen = new Set<string>()
  for (const glob of globs) {
    const pattern = glob.trim().replace(/\\/g, '/').replace(/^\.\//, '')
    if (!pattern) continue
    const hits = paths.filter((p) => matchGlob(pattern, p)).sort()
    const kept = hits.filter((p) => YAML_EXT.test(p) || DRAWIO_EXT.test(p))
    if (kept.length === 0) {
      throw new Error(
        `activity glob "${pattern}" matched no activity files in this folder. Check the path against the files you imported.`,
      )
    }
    for (const hit of kept) {
      if (seen.has(hit)) continue
      seen.add(hit)
      matched.push(hit)
    }
  }
  return matched
}

/** `*` does not match a slash. An exact path matches that file only. */
export function matchGlob(pattern: string, path: string): boolean {
  if (!pattern.includes('*')) return pattern === path
  const re = new RegExp(
    '^' +
      pattern
        .split('*')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]*') +
      '$',
  )
  return re.test(path)
}

function readLanguages(parameters: unknown): { default: string; available: string[] } {
  const fallback = { default: 'en', available: ['en'] }
  if (!parameters || typeof parameters !== 'object') return fallback
  const languages = (parameters as Record<string, unknown>)['languages']
  if (!languages) return fallback
  if (typeof languages === 'string') return { default: languages, available: [languages] }
  if (Array.isArray(languages)) {
    const available = languages.map(String).filter(Boolean)
    const def = available[0] ?? 'en'
    return { default: def, available: available.length > 0 ? available : [def] }
  }
  if (typeof languages === 'object') {
    const rec = languages as Record<string, unknown>
    const available = Array.isArray(rec['available'])
      ? rec['available'].map(String).filter(Boolean)
      : []
    const def = typeof rec['default'] === 'string' && rec['default'] ? rec['default'] : (available[0] ?? 'en')
    if (!available.includes(def)) available.unshift(def)
    return { default: def, available }
  }
  return fallback
}

function readContexts(value: unknown): Project['contexts'] {
  if (!Array.isArray(value)) return []
  const out: Project['contexts'] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    if (typeof rec['system'] !== 'string' || typeof rec['code'] !== 'string') continue
    const ctx: Project['contexts'][number] = { system: rec['system'], code: rec['code'] }
    if (typeof rec['display'] === 'string') ctx.display = rec['display']
    if (typeof rec['version'] === 'string') ctx.version = rec['version']
    out.push(ctx)
  }
  return out
}

function readText(primary: unknown, map: unknown, lang: string): LocalizedText | undefined {
  if (map && typeof map === 'object' && !Array.isArray(map)) {
    const out: LocalizedText = {}
    for (const [key, value] of Object.entries(map as Record<string, unknown>)) {
      if (typeof value === 'string' && value) out[key] = value
    }
    if (Object.keys(out).length > 0) return out
  }
  if (typeof primary === 'string' && primary.trim()) return { [lang]: primary.trim() }
  return undefined
}

function writeText(
  value: LocalizedText | undefined,
  lang: string,
): { text?: string; map?: LocalizedText } {
  if (!value) return {}
  const keys = Object.keys(value).filter((key) => value[key])
  if (keys.length === 0) return {}
  const text = resolve(value, lang, lang) ?? value[keys[0]!]
  if (keys.length === 1 && keys[0] === lang) return { text }
  return { text, map: { ...value } }
}

function plain(value: LocalizedText | undefined): string | undefined {
  if (!value) return undefined
  const first = Object.values(value).find(Boolean)
  return first
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function put(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined) target[key] = value
}

function slug(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'project'
  )
}

export function triccConfigText(files: ProjectFiles): string | undefined {
  return files[PATHS.tricc] ?? files['tricc.yml']
}

/** Language block only, so activity files can be decoded before interventions are. */
export function peekTriccLanguages(text: string): { default: string; available: string[] } {
  try {
    const raw = fromYaml(text)
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { default: 'en', available: ['en'] }
    }
    return readLanguages((raw as Record<string, unknown>)['parameters'])
  } catch {
    return { default: 'en', available: ['en'] }
  }
}
