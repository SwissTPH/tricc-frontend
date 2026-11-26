import {
  SHOW_AS,
  SHOW_AS_LABEL,
  showAsOf,
  showAsPatch,
  type ShowAs,
  type ShowAsPair,
} from '@tricc/core'

const HELP: Record<ShowAs, string> = {
  page: 'Its own page in the form. A page is always a section.',
  section: 'Its own section of the form; a group of questions becomes a sub-heading.',
  inline: 'No section: its questions go into the enclosing one.',
}

/**
 * Show as (feature/20261126-questionnaire-pages.md §3): Page, Section, Inline or Default, on an
 * activity, a block, a Go to, a Use block and a group of questions. It writes `page` and
 * `asGroup` as a pair in one patch; Default removes both.
 */
export function ShowAsField({
  value,
  resolved,
  defaultFrom,
  readOnly,
  idPrefix,
  onChange,
}: {
  value: ShowAsPair
  /** What Default resolves to here, when known. */
  resolved: ShowAs | undefined
  /** Where Default comes from on a call: "the activity", "the block". */
  defaultFrom?: string
  readOnly: boolean
  /** Keeps the ids unique when the node panel and a dialog show the field at once. */
  idPrefix: string
  onChange: (patch: { page: boolean | undefined; asGroup: boolean | undefined }) => void
}) {
  const choice = showAsOf(value)
  const id = `${idPrefix}-show-as`
  const resolvedText = resolved ? SHOW_AS_LABEL[resolved] : undefined
  const defaultLabel = resolvedText
    ? defaultFrom
      ? `Default (as ${defaultFrom}: ${resolvedText})`
      : `Default (${resolvedText})`
    : defaultFrom
      ? `Default (as ${defaultFrom})`
      : 'Default'
  const shown = choice ?? resolved
  return (
    <>
      <label htmlFor={id}>Show as</label>
      <select
        id={id}
        data-testid="field-show-as"
        value={choice ?? ''}
        disabled={readOnly}
        onChange={(e) => onChange(showAsPatch((e.target.value || undefined) as ShowAs | undefined))}
      >
        <option value="">{defaultLabel}</option>
        {SHOW_AS.map((c) => (
          <option key={c} value={c}>
            {SHOW_AS_LABEL[c]}
          </option>
        ))}
      </select>
      <p data-testid="field-show-as-help">
        {shown ? HELP[shown] : 'As the activity or block it calls.'}
        {value.page === true && value.asGroup === false
          ? ' The file also says no section; the page wins.'
          : ''}
      </p>
    </>
  )
}
