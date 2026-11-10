import {
  CPG_PROCESSES,
  createProcessActivity,
  processOf,
  type Activity,
  type Project,
} from '@tricc/core'
import { Input } from '../components/ui/input.js'
import { uniqueId } from './Overview.js'

/** The value of the "Other / custom…" entry of the process picker. */
const OTHER = '__other__'

/**
 * What the New segment form holds until Create. `name` is what the author typed; until they
 * type, the name follows the process (`named` is false).
 */
export interface SegmentDraft {
  /** A listed process, or the typed one when `custom` is set. */
  process: string
  custom: boolean
  name: string
  named: boolean
}

export const EMPTY_SEGMENT: SegmentDraft = { process: '', custom: false, name: '', named: false }

/** `history-and-physical` → `History and physical`: the name a process suggests. */
export function processName(process: string): string {
  const words = process.trim().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Processes this project's segments use that are not CPG common processes, sorted. */
export function customProcesses(project: Project): string[] {
  const cpg = new Set<string>(CPG_PROCESSES)
  const found = new Set<string>()
  for (const activity of Object.values(project.activities)) {
    const process = processOf(activity)?.trim()
    if (process && !cpg.has(process)) found.add(process)
  }
  return [...found].sort((a, b) => a.localeCompare(b))
}

/** The name shown in the form: the typed one, or the one the process suggests. */
export function segmentName(draft: SegmentDraft): string {
  return draft.named ? draft.name : draft.process.trim() ? processName(draft.process) : ''
}

/**
 * The segment Create would add, or undefined while no process is chosen. The id comes from
 * a typed name; a name left as suggested keeps the `<process>-process` id.
 */
export function plannedSegment(
  draft: SegmentDraft,
  taken: Set<string>,
): { id: string; process: string; title: string } | undefined {
  const process = draft.process.trim()
  const processBase = slugId(process)
  if (!processBase) return undefined
  const name = segmentName(draft).trim()
  const nameBase = draft.named ? slugId(name) : ''
  const id = nameBase ? uniqueId(nameBase, taken) : uniqueId(`${processBase}-process`, taken)
  return { id, process, title: name || process }
}

/** The process activity for a planned segment. */
export function createSegment(
  plan: { id: string; process: string; title: string },
  language: string,
): Activity {
  return createProcessActivity({ ...plan, language })
}

/**
 * The New segment fields, shared by the Segments tab and an intervention's Add a segment:
 * the process (CPG list, the project's own, or typed) and the name. "Saved as" follows.
 */
export function NewSegmentFields({
  project,
  draft,
  taken,
  onChange,
}: {
  project: Project
  draft: SegmentDraft
  taken: Set<string>
  onChange: (draft: SegmentDraft) => void
}) {
  const custom = customProcesses(project)
  const plan = plannedSegment(draft, taken)
  const choice = draft.custom ? OTHER : draft.process

  return (
    <div className="tricc-segment-form">
      <label>
        Process
        <select
          data-testid="new-segment-process"
          value={choice}
          onChange={(event) => {
            const value = event.target.value
            onChange(
              value === OTHER
                ? { ...draft, custom: true, process: '' }
                : { ...draft, custom: false, process: value },
            )
          }}
        >
          <option value="" disabled>
            Choose a process…
          </option>
          <optgroup label="CPG common processes">
            {CPG_PROCESSES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </optgroup>
          {custom.length > 0 && (
            <optgroup label="Used in this project">
              {custom.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </optgroup>
          )}
          <option value={OTHER}>Other / custom…</option>
        </select>
      </label>
      {draft.custom && (
        <label>
          Custom process
          <Input
            data-testid="new-segment-custom-process"
            placeholder="e.g. vaccination"
            value={draft.process}
            autoComplete="off"
            autoFocus
            onChange={(event) => onChange({ ...draft, process: event.target.value })}
          />
        </label>
      )}
      <label>
        Name
        <Input
          data-testid="new-segment-name"
          placeholder={draft.process.trim() ? processName(draft.process) : 'e.g. Triage'}
          value={segmentName(draft)}
          autoComplete="off"
          onChange={(event) => onChange({ ...draft, name: event.target.value, named: true })}
        />
      </label>
      <p className="tricc-library-modal__id">
        {plan ? (
          <>
            Saved as <span data-testid="new-segment-id">{plan.id}</span>
          </>
        ) : (
          'Choose the process this segment implements.'
        )}
      </p>
    </div>
  )
}

function slugId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
