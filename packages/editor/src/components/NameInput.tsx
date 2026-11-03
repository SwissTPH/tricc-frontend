import { useEffect, useState } from 'react'
import { NAME_RE, TEMPLATE_NAME_RE } from '@tricc/core'
import { Input } from './ui/input.js'

export interface NameInputProps {
  id: string
  testId: string
  value: string | undefined
  /** Called only with a valid name, or `undefined` when the field is cleared. */
  onChange: (name: string | undefined) => void
  readOnly?: boolean
}

/**
 * A name field that never saves a name the file format rejects.
 *
 * An invalid name stays in the field with a warning and is not saved; leaving the field puts
 * the saved name back. A name the loader refuses would stop the whole project from opening.
 */
export function NameInput({ id, testId, value, onChange, readOnly }: NameInputProps) {
  const [draft, setDraft] = useState(value ?? '')
  useEffect(() => setDraft(value ?? ''), [value])
  const invalid = draft !== '' && !validName(draft)
  return (
    <>
      <Input size="sm"
        id={id}
        data-testid={testId}
        value={draft}
        readOnly={readOnly}
        disabled={readOnly}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={(e) => {
          const next = e.target.value
          setDraft(next)
          if (next === '' || validName(next)) onChange(next || undefined)
        }}
        onBlur={() => setDraft(value ?? '')}
      />
      {invalid && (
        <p
          role="alert"
          id={`${id}-error`}
          data-testid={`${testId}-error`}
          className="tricc-field-error"
        >
          Not saved: a name holds only letters, digits, _, . and -, and starts with a letter or _.
        </p>
      )}
    </>
  )
}

/** A name, or one holding `{{setting}}` that becomes a name when a block is used (`fever_{{site}}`). */
function validName(name: string): boolean {
  return NAME_RE.test(name) || (name.includes('{{') && TEMPLATE_NAME_RE.test(name))
}
