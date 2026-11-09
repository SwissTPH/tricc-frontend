import { Fragment, useMemo } from 'react'
import {
  RETRIEVAL_CONTEXTS,
  RETRIEVAL_CONTEXT_LABELS,
  RETRIEVAL_LANGUAGES,
  contextUsesPeriod,
  effectiveFunction,
  functionsFor,
  lookupConcept,
  retrieveCodeSystem,
  type Project,
  type Retrieval,
  type RetrievalContext,
} from '@tricc/core'
import { Typeahead, type TypeaheadOption } from '../components/Typeahead.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'
import { Textarea } from '../components/ui/textarea.js'

/**
 * What a retrieval reads: where, which function or concept, how far back, and for a custom
 * one its expressions (feature/20261109-project-retrievals.md §1). Part of the concept dialog.
 */
export function RetrievalFields({
  project,
  value,
  disabled,
  onChange,
}: {
  project: Project
  value: Retrieval
  disabled: boolean
  onChange: (next: Retrieval) => void
}) {
  const functions = functionsFor(value.context)
  const fn = effectiveFunction(value)
  const custom = value.context === 'custom'
  const showReads = custom || !!fn?.needsSource
  const read = lookupConcept(project, value.reads)
  const options = useMemo(() => readableConcepts(project), [project])

  const set = (patch: Partial<Retrieval>) => {
    const next: Retrieval = { ...value, ...patch }
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') delete (next as unknown as Record<string, unknown>)[k]
    }
    onChange(next)
  }

  const setContext = (context: RetrievalContext) => {
    const next: Retrieval = { context }
    if (value.reads) next.reads = value.reads
    if (value.period && contextUsesPeriod(context)) next.period = value.period
    if (context === 'custom') next.expressions = value.expressions ?? []
    onChange(next)
  }

  const expressionFor = (language: string) =>
    value.expressions?.find((e) => e.language === language)?.expression ?? ''
  const setExpression = (language: string, expression: string) => {
    const others = (value.expressions ?? []).filter((e) => e.language !== language)
    const all = RETRIEVAL_LANGUAGES.map((l) => l.code)
    const next = [...others, ...(expression ? [{ language, expression }] : [])].sort(
      (a, b) => all.indexOf(a.language as never) - all.indexOf(b.language as never),
    )
    set({ expressions: next })
  }

  return (
    <>
      <h3>What it reads</h3>
      <label htmlFor="retrieval-context">Where</label>
      <select
        id="retrieval-context"
        data-testid="retrieval-context"
        value={value.context}
        disabled={disabled}
        onChange={(e) => setContext(e.target.value as RetrievalContext)}
      >
        {RETRIEVAL_CONTEXTS.map((c) => (
          <option key={c} value={c}>
            {RETRIEVAL_CONTEXT_LABELS[c]}
          </option>
        ))}
      </select>

      {!custom && (
        <>
          <label htmlFor="retrieval-function">What</label>
          <select
            id="retrieval-function"
            data-testid="retrieval-function"
            value={value.function ?? ''}
            disabled={disabled}
            onChange={(e) => set({ function: e.target.value || undefined })}
          >
            <option value="">{functions[0]?.label ?? '—'} (default)</option>
            {functions.slice(1).map((f) => (
              <option key={f.code} value={f.code}>
                {f.label}
              </option>
            ))}
          </select>
        </>
      )}

      {showReads && (
        <>
          <span>Concept read</span>
          <div className="tricc-retrieval__reads" data-testid="retrieval-reads">
            {value.reads ? (
              <span data-testid="retrieval-reads-value">
                {read?.display ?? value.reads.code} <code>{value.reads.code}</code>{' '}
                {!disabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    data-testid="retrieval-reads-clear"
                    onClick={() => set({ reads: undefined })}
                  >
                    Change
                  </Button>
                )}
              </span>
            ) : (
              <Typeahead
                label="Concept read"
                testId="retrieval-reads-search"
                options={options}
                disabled={disabled}
                placeholder="Find a concept in the data dictionary"
                emptyMessage="No concept matches."
                onSelect={(id) => {
                  const at = id.lastIndexOf('|')
                  set({ reads: { system: id.slice(0, at), code: id.slice(at + 1) } })
                }}
              />
            )}
          </div>
        </>
      )}

      {contextUsesPeriod(value.context) && (!fn || fn.usesPeriod || custom) && (
        <>
          <label htmlFor="retrieval-period">How far back</label>
          <Input
            id="retrieval-period"
            data-testid="retrieval-period"
            value={value.period ?? ''}
            placeholder="P30D"
            disabled={disabled}
            onChange={(e) => set({ period: e.target.value.trim() || undefined })}
          />
          <p>An ISO-8601 period: P30D is 30 days, P6M six months. Empty reads all of it.</p>
        </>
      )}

      {custom &&
        RETRIEVAL_LANGUAGES.map((l) => (
          <Fragment key={l.code}>
            <label htmlFor={`retrieval-expression-${l.label}`}>{l.label} expression</label>
            <Textarea
              id={`retrieval-expression-${l.label}`}
              data-testid={`retrieval-expression-${l.label.toLowerCase()}`}
              rows={2}
              spellCheck={false}
              value={expressionFor(l.code)}
              disabled={disabled}
              onChange={(e) => setExpression(l.code, e.target.value)}
            />
          </Fragment>
        ))}
      {custom && (
        <p data-testid="retrieval-placeholders">
          <code>{'{{code}}'}</code> is the code of the concept read and <code>{'{{period}}'}</code>{' '}
          the period; each export writes them for its language. An export with no expression for its
          language stops with an error.
        </p>
      )}
    </>
  )
}

/** Concepts a retrieval can read: every dictionary but the retrieval one. */
function readableConcepts(project: Project): TypeaheadOption[] {
  const skip = retrieveCodeSystem(project)
  const out: TypeaheadOption[] = []
  for (const cs of Object.values(project.codeSystems)) {
    if (cs === skip) continue
    for (const code of cs.conceptOrder) {
      const concept = cs.concepts[code]
      if (concept) out.push({ id: `${cs.url}|${code}`, label: concept.display ?? code, hint: code })
    }
  }
  return out
}
