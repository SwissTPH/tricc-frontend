import { useMemo, useState } from 'react'
import { useProjectSnapshot } from '../runtime/context.js'
import { expressionNames, truncateLabel, type ExpressionName } from './names.js'
import { presentCql } from './present.js'

/**
 * An expression the author already wrote in CQL.
 *
 * The textarea is the stored text. The line under it shows a concept or question label
 * in place of a code, with a tooltip and an About action. Nothing here rewrites the expression.
 */
export function CqlExpressionField({
  id,
  testId,
  label,
  value,
  readOnly,
  rows = 3,
  activityId,
  onReveal,
  onChange,
}: {
  id: string
  testId: string
  label: string
  value: string
  readOnly: boolean
  rows?: number
  /** Names in this activity win when the same code is used in several places. */
  activityId?: string
  /** Open the question a name points at. */
  onReveal?: (activityId: string, nodeId: string) => void
  onChange: (value: string) => void
}) {
  const project = useProjectSnapshot()
  const lang = project.languages.default
  const names = useMemo(
    () => expressionNames(project, lang, activityId),
    [project, lang, activityId],
  )
  const { tokens, diagnostics } = presentCql(value)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="tricc-cql">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        rows={rows}
        className="tricc-cql__input"
        data-testid={testId}
        value={value}
        readOnly={readOnly}
        disabled={readOnly}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
      {tokens.length > 0 && (
        <p className="tricc-cql__read" data-testid={`${testId}-display`}>
          {tokens.map((token, index) => {
            if (token.kind === 'name' && token.label) {
              return (
                <NameChip
                  key={index}
                  testId={testId}
                  index={index}
                  code={token.label}
                  info={names.get(token.label)}
                  open={openIndex === index}
                  onToggle={() => setOpenIndex((current) => (current === index ? null : index))}
                  onReveal={onReveal}
                />
              )
            }
            if (token.kind === 'text') return <span key={index}>{token.text}</span>
            return (
              <span key={index} className={`tricc-cql__${token.kind}`}>
                {token.text}
              </span>
            )
          })}
        </p>
      )}
      {diagnostics.length > 0 && (
        <ul className="tricc-cql__lint" data-testid={`${testId}-lint`}>
          {diagnostics.map((d) => (
            <li key={d.message} data-severity={d.severity}>
              {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function NameChip({
  testId,
  index,
  code,
  info,
  open,
  onToggle,
  onReveal,
}: {
  testId: string
  index: number
  code: string
  info: ExpressionName | undefined
  open: boolean
  onToggle: () => void
  onReveal?: (activityId: string, nodeId: string) => void
}) {
  const named = !!info && info.label !== code
  const shown = named ? truncateLabel(info.label) : code
  const tip = nameTip(code, info)
  const canShow = !!(info?.activityId && info.nodeId && onReveal)

  return (
    <span className={named ? 'tricc-cql__name' : 'tricc-cql__name tricc-cql__name--unknown'}>
      <span data-testid={`${testId}-term-${index}`} data-code={code} title={tip}>
        {shown}
      </span>
      <button
        type="button"
        className="tricc-cql__about"
        aria-expanded={open}
        aria-label={`About ${shown}`}
        title={tip}
        data-testid={`${testId}-about-${index}`}
        onClick={onToggle}
      >
        i
      </button>
      {open && (
        <span className="tricc-cql__card" role="note" data-testid={`${testId}-card-${index}`}>
          <strong>{info?.label ?? code}</strong>
          <span>{code}</span>
          {info?.definition && <span>{info.definition}</span>}
          {info?.system && <span>{info.system}</span>}
          {info?.activityTitle && <span>Question in {info.activityTitle}</span>}
          {!info && <span>This name has no concept label in the project.</span>}
          {canShow && (
            <button
              type="button"
              data-testid={`${testId}-show-${index}`}
              onClick={() => onReveal!(info!.activityId!, info!.nodeId!)}
            >
              Show question
            </button>
          )}
        </span>
      )}
    </span>
  )
}

function nameTip(code: string, info: ExpressionName | undefined): string {
  if (info && info.label !== code) return `${info.label} — ${code}`
  if (info?.activityTitle) return `${code} — question in ${info.activityTitle}`
  return `${code} — no concept label in this project`
}
