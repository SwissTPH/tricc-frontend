import { useState } from 'react'
import { activityKind, resolve, type Project } from '@tricc/core'
import { Typeahead, type TypeaheadOption } from './Typeahead.js'

/**
 * Pick one activity.
 *
 * A single-value picker needs to show what is currently chosen, which a bare typeahead
 * does not — so the current value is displayed with a Change affordance, and the search
 * appears only when there is something to search for.
 */
export function ActivityRefField({
  label,
  value,
  project,
  onChange,
  readOnly,
  testId,
  /** Activities that must not be offered — usually the one being edited. */
  exclude = [],
  kind = 'activity',
  emptyMessage,
}: {
  label: string
  value: string | undefined
  project: Project
  onChange: (id: string | undefined) => void
  readOnly: boolean
  testId: string
  exclude?: string[]
  kind?: 'activity' | 'process'
  emptyMessage?: string
}) {
  const [changing, setChanging] = useState(false)
  const lang = project.languages.default

  const excluded = new Set(exclude)
  const options: TypeaheadOption[] = Object.keys(project.activities)
    .filter((id) => !excluded.has(id) && activityKind(project.activities[id]!) === kind)
    .sort()
    .map((id) => {
      const title = resolve(project.activities[id]?.title, lang, lang)
      return title && title !== id ? { id, label: title, hint: id } : { id, label: id }
    })

  const current = value ? project.activities[value] : undefined
  const currentLabel = value ? (resolve(current?.title, lang, lang) ?? value) : undefined

  if (value && !changing) {
    return (
      <div className="tricc-ref-field">
        <span className="tricc-ref-field__label">{label}</span>
        <span className="tricc-ref-field__value" data-testid={`${testId}-current`}>
          {currentLabel}
          {!current && (
            <span className="tricc-ref-field__missing" data-testid={`${testId}-missing`}>
              {' '}
              — no longer in this project
            </span>
          )}
        </span>
        {!readOnly && (
          <>
            <button
              type="button"
              data-testid={`${testId}-change`}
              onClick={() => setChanging(true)}
            >
              Change
            </button>
            <button
              type="button"
              data-testid={`${testId}-clear`}
              onClick={() => onChange(undefined)}
            >
              Clear
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="tricc-ref-field">
      <Typeahead
        testId={testId}
        label={label}
        placeholder="Search activities…"
        options={options}
        disabled={readOnly}
        emptyMessage="No activity matches."
        exhaustedMessage={
          emptyMessage ??
          (kind === 'activity'
            ? 'This project has no other activities to go to yet.'
            : 'This project has no process activities yet.')
        }
        onSelect={(id) => {
          onChange(id)
          setChanging(false)
        }}
      />
      {changing && !readOnly && (
        <button type="button" data-testid={`${testId}-cancel`} onClick={() => setChanging(false)}>
          Cancel
        </button>
      )}
    </div>
  )
}
