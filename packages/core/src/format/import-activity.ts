import { ZodError } from 'zod'
import type { Activity } from '../model/types.js'
import { decodeActivity } from './codec.js'
import { activitiesFromDrawio } from './drawio.js'
import { fromYaml } from './serialize/yaml.js'

/**
 * One activity read from a file the author picked.
 *
 * `renamedFrom` is the id the file asked for when that id was already taken.
 * `alreadyInProject` means the clash was with the project, so the dialog can say so.
 * A clash inside the same draw.io file leaves `alreadyInProject` false.
 */
export interface ParsedActivity {
  activity: Activity
  renamedFrom?: string
  alreadyInProject: boolean
}

/**
 * Read one activity YAML file, or every page of a draw.io file.
 *
 * Ids already in `taken` are given a free suffix. Every returned id is added to
 * `taken`, so a second file in the same batch does not reuse them. Draw.io links
 * between pages keep the ids assigned here.
 */
export function readActivityFile(
  filename: string,
  text: string,
  taken: Set<string>,
  lang = 'en',
): ParsedActivity[] {
  const body = text.replace(/^\uFEFF/, '').trim()
  if (!body) throw new Error('This file is empty.')
  if (isDrawio(filename, body)) return drawioActivities(body, taken, lang)
  return [yamlActivity(body, taken, lang)]
}

function isDrawio(filename: string, body: string): boolean {
  if (/\.drawio$/i.test(filename)) return true
  const start = body.trimStart().slice(0, 400).toLowerCase()
  return start.startsWith('<?xml') || start.startsWith('<mxfile') || start.startsWith('<mxgraphmodel')
}

function drawioActivities(body: string, taken: Set<string>, lang: string): ParsedActivity[] {
  const prior = new Set(taken)
  let activities: Activity[]
  try {
    activities = activitiesFromDrawio(body, taken, lang)
  } catch (error) {
    throw new Error(error instanceof Error && error.message ? error.message : 'This file is not a draw.io diagram.')
  }
  return activities.map((activity) => {
    const base = slug(activity.title?.[lang] ?? '')
    const renamedFrom = base && activity.id !== base ? base : undefined
    return {
      activity,
      renamedFrom,
      alreadyInProject: renamedFrom ? prior.has(renamedFrom) : false,
    }
  })
}

function yamlActivity(body: string, taken: Set<string>, lang: string): ParsedActivity {
  let parsed: unknown
  try {
    parsed = fromYaml(body)
  } catch (error) {
    const detail = error instanceof Error ? error.message.split('\n')[0] : ''
    throw new Error(detail || 'This file is not an activity file or a draw.io diagram.')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('This file is not an activity file.')
  }
  const record = parsed as Record<string, unknown>
  if ('interventions' in record && !Array.isArray(record.nodes)) {
    throw new Error('This is a project file. Choose an activity file or a draw.io diagram.')
  }
  let activity: Activity
  try {
    activity = decodeActivity(parsed, lang)
  } catch (error) {
    throw new Error(schemaMessage(error))
  }
  if (!taken.has(activity.id)) {
    taken.add(activity.id)
    return { activity, alreadyInProject: false }
  }
  const renamedFrom = activity.id
  let n = 2
  while (taken.has(`${renamedFrom}-${n}`)) n += 1
  const id = `${renamedFrom}-${n}`
  taken.add(id)
  return { activity: { ...activity, id }, renamedFrom, alreadyInProject: true }
}

function schemaMessage(error: unknown): string {
  if (error instanceof ZodError) {
    const issue = error.issues[0]
    if (!issue) return 'This file is not an activity file.'
    const path = issue.path.join('.')
    return path ? `${path}: ${issue.message}` : issue.message
  }
  return 'This file is not an activity file.'
}

function slug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
