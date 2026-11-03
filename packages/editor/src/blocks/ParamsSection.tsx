import { useEffect, useState } from 'react'
import {
  PARAM_TYPES,
  PRIMITIVE_PARAM_TYPES,
  argProblem,
  conceptText,
  effectiveParams,
  paramConcept,
  paramLabel,
  resolve,
  showParamValue,
  withConceptText,
  type ActivityParam,
  type ParamType,
  type ParamValue,
  type Project,
} from '@tricc/core'
import { useMutate } from '../runtime/context.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'
import { TERMS } from './terms.js'

const TYPE_LABELS: Record<ParamType, string> = {
  boolean: 'Yes/No',
  number: 'Number',
  string: 'Text',
  choice: 'Choice',
  name: 'Name',
  concept: 'Concept',
  expression: 'Expression',
}

/**
 * The Parameters section of a block's or an activity's settings
 * (feature/20261028-snippets-tab-and-params.md §3.1, §3.4). Declared rows are edited here;
 * computed rows come from what the page calls and are read-only, with a link to where they come
 * from. Labels and help texts are the parameter concept's, in the calculate dictionary.
 */
export function ParamsSection({
  project,
  activityId,
  readOnly,
  onOpenActivity,
}: {
  project: Project
  activityId: string
  readOnly: boolean
  /** Open the page a computed row comes from. */
  onOpenActivity?: (activityId: string) => void
}) {
  const mutate = useMutate()
  const lang = project.languages.default
  const rows = effectiveParams(project, activityId)
  const [advanced, setAdvanced] = useState(() =>
    rows.some((r) => !PRIMITIVE_PARAM_TYPES.includes(r.param.type)),
  )
  const [newLabel, setNewLabel] = useState('')
  const declared = project.activities[activityId]?.params ?? []
  const taken = new Set(rows.map((r) => r.name))
  const newName = uniqueName(slugName(newLabel), taken)

  const add = () => {
    const label = newLabel.trim()
    if (!label || !newName) return
    mutate((tx) => {
      tx.setActivityParams(activityId, [
        ...declared,
        { name: newName, type: 'string', label: { [lang]: label } },
      ])
    })
    setNewLabel('')
  }

  const title = (id: string) => resolve(project.activities[id]?.title, lang, lang) ?? id

  return (
    <fieldset className="tricc-params" data-testid="params-section">
      <legend>{TERMS.settings}</legend>
      <p className="tricc-params__note" data-testid="params-note">
        Settings work like function parameters. Each takes the first value found: the one set on the
        use, the calling page's setting of the same name, then the default. At the top, the
        intervention's settings give the values. Write {'{{name}}'} to use one: a value in
        expressions, plain text in labels and names. {'{{name|raw}}'} puts plain text inside an
        expression, e.g. {'"temp_{{site|raw}}" > {{threshold}}'}.
      </p>
      {rows.length === 0 && <p data-testid="params-none">No parameters.</p>}
      <ul className="tricc-params__list">
        {rows.map((row) =>
          row.computed ? (
            <li
              key={row.name}
              className="tricc-params__row"
              data-testid={`param-${row.name}`}
              data-kind="computed"
            >
              <strong>{paramLabel(project, row.declaredIn, row.param)}</strong>{' '}
              <code>{row.name}</code>{' '}
              <span className="tricc-badge">{TYPE_LABELS[row.param.type]}</span>
              {row.from.map((from) => (
                <button
                  key={from}
                  type="button"
                  className="tricc-badge tricc-params__from"
                  data-testid={`param-${row.name}-from-${from}`}
                  title="This page calls it and does not set it, so it is a setting here too"
                  onClick={() => onOpenActivity?.(from)}
                >
                  From {title(from)}
                </button>
              ))}
              {row.param.default !== undefined && (
                <span> Default {showParamValue(row.param.default)}</span>
              )}
            </li>
          ) : (
            <DeclaredRow
              key={row.name}
              project={project}
              activityId={activityId}
              param={declared.find((p) => p.name === row.name) ?? row.param}
              unused={row.unused}
              advanced={advanced}
              readOnly={readOnly}
              taken={taken}
            />
          ),
        )}
      </ul>
      {!readOnly && (
        <div className="tricc-params__add">
          <label htmlFor="param-new-label">New parameter</label>
          <Input
            size="sm"
            id="param-new-label"
            data-testid="param-new-label"
            placeholder="e.g. Fever threshold"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
          />
          <Button size="sm" type="button" data-testid="param-add" disabled={!newName} onClick={add}>
            Add parameter
          </Button>
          {newName && <span className="tricc-params__id">Named {newName}</span>}
        </div>
      )}
      <label className="tricc-check">
        <input
          type="checkbox"
          data-testid="param-advanced"
          checked={advanced}
          onChange={(e) => setAdvanced(e.target.checked)}
        />
        Advanced types (name, concept, expression). They have no dictionary concept.
      </label>
    </fieldset>
  )
}

function DeclaredRow({
  project,
  activityId,
  param,
  unused,
  advanced,
  readOnly,
  taken,
}: {
  project: Project
  activityId: string
  param: ActivityParam
  unused: boolean
  advanced: boolean
  readOnly: boolean
  taken: Set<string>
}) {
  const mutate = useMutate()
  const lang = project.languages.default
  const concept = paramConcept(project, activityId, param.name)
  const [name, setName] = useState(param.name)
  useEffect(() => setName(param.name), [param.name])
  const nameProblem =
    name !== param.name && taken.has(name)
      ? 'Another parameter has this name.'
      : !/^[a-z][a-z0-9_]*$/.test(name)
        ? 'A lower-case letter, then letters, digits or _.'
        : undefined
  const update = (next: ActivityParam) =>
    mutate((tx) => tx.updateParam(activityId, param.name, next))
  const types = advanced
    ? PARAM_TYPES
    : PRIMITIVE_PARAM_TYPES.includes(param.type)
      ? PRIMITIVE_PARAM_TYPES
      : [...PRIMITIVE_PARAM_TYPES, param.type]
  const id = `param-${param.name}`
  const defaultProblem = param.default === undefined ? undefined : argProblem(param, param.default)

  return (
    <li className="tricc-params__row" data-testid={id} data-kind="declared">
      {PRIMITIVE_PARAM_TYPES.includes(param.type) && (
        <>
          <label htmlFor={`${id}-label`}>Label</label>
          <Input
            size="sm"
            id={`${id}-label`}
            data-testid={`${id}-label`}
            value={conceptText(concept, 'display', lang, lang) ?? ''}
            placeholder={param.name}
            disabled={readOnly || !concept}
            onChange={(e) =>
              concept &&
              mutate((tx) =>
                tx.upsertConcept(
                  concept.system,
                  withConceptText(concept, 'display', lang, e.target.value || undefined, lang),
                ),
              )
            }
          />
        </>
      )}
      <label htmlFor={`${id}-name`}>Name</label>
      <Input
        size="sm"
        id={`${id}-name`}
        data-testid={`${id}-name`}
        value={name}
        disabled={readOnly}
        aria-invalid={nameProblem ? true : undefined}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name !== param.name && !nameProblem) update({ ...param, name })
          else setName(param.name)
        }}
      />
      {nameProblem && name !== param.name && (
        <p role="alert" className="tricc-field-error" data-testid={`${id}-name-error`}>
          Not saved: {nameProblem}
        </p>
      )}
      <div
        className="tricc-params__types"
        role="radiogroup"
        aria-label="Type"
        data-testid={`${id}-type`}
      >
        {types.map((type) => (
          <label key={type}>
            <input
              type="radio"
              name={`${id}-type`}
              value={type}
              data-testid={`${id}-type-${type}`}
              checked={param.type === type}
              disabled={readOnly}
              onChange={() => {
                const next: ActivityParam = { ...param, type }
                if (type !== 'choice') delete next.options
                if (next.default !== undefined && argProblem(next, next.default))
                  delete next.default
                update(next)
              }}
            />
            {TYPE_LABELS[type]}
          </label>
        ))}
      </div>
      {param.type === 'choice' && (
        <OptionsEditor
          id={id}
          options={param.options ?? []}
          readOnly={readOnly}
          onChange={(options) =>
            update({ ...param, options: options.length ? options : undefined })
          }
        />
      )}
      <DefaultField
        id={id}
        param={param}
        readOnly={readOnly}
        onChange={(value) => {
          const next = { ...param }
          if (value === undefined) delete next.default
          else next.default = value
          update(next)
        }}
      />
      {defaultProblem && (
        <p role="alert" className="tricc-field-error" data-testid={`${id}-default-error`}>
          {defaultProblem}
        </p>
      )}
      <label className="tricc-check">
        <input
          type="checkbox"
          data-testid={`${id}-required`}
          checked={param.required === true}
          disabled={readOnly}
          onChange={(e) => {
            const next = { ...param }
            if (e.target.checked) next.required = true
            else delete next.required
            update(next)
          }}
        />
        Required
      </label>
      {concept && (
        <>
          <label htmlFor={`${id}-description`}>Description</label>
          <Input
            size="sm"
            id={`${id}-description`}
            data-testid={`${id}-description`}
            value={concept.definition ?? ''}
            placeholder="Help text shown where it is set"
            disabled={readOnly}
            onChange={(e) => {
              const next = { ...concept }
              if (e.target.value) next.definition = e.target.value
              else delete next.definition
              mutate((tx) => tx.upsertConcept(concept.system, next))
            }}
          />
        </>
      )}
      {unused && (
        <span
          className="tricc-badge"
          data-testid={`${id}-unused`}
          title="Nothing on this page uses it, and nothing it calls needs it"
        >
          Not used
        </span>
      )}
      {!readOnly && (
        <Button
          variant="outline"
          size="sm"
          type="button"
          data-testid={`${id}-remove`}
          onClick={() => mutate((tx) => tx.removeParam(activityId, param.name))}
        >
          Remove
        </Button>
      )}
    </li>
  )
}

function OptionsEditor({
  id,
  options,
  readOnly,
  onChange,
}: {
  id: string
  options: string[]
  readOnly: boolean
  onChange: (options: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const code = slugName(draft)
  return (
    <div className="tricc-params__options" data-testid={`${id}-options`}>
      <span>Options</span>
      {options.length === 0 && <p className="tricc-field-error">Add the options to choose from.</p>}
      <ol>
        {options.map((o, i) => (
          <li key={o}>
            <code>{o}</code>
            {!readOnly && (
              <>
                <Button
                  variant="outline"
                  size="icon-sm"
                  type="button"
                  aria-label={`Move ${o} up`}
                  disabled={i === 0}
                  onClick={() => onChange(move(options, i, -1))}
                >
                  ↑
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  type="button"
                  aria-label={`Remove ${o}`}
                  data-testid={`${id}-option-remove-${o}`}
                  onClick={() => onChange(options.filter((x) => x !== o))}
                >
                  ×
                </Button>
              </>
            )}
          </li>
        ))}
      </ol>
      {!readOnly && (
        <span>
          <Input
            size="sm"
            aria-label="New option"
            data-testid={`${id}-option-new`}
            value={draft}
            placeholder="e.g. axillary"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code && !options.includes(code)) {
                e.preventDefault()
                onChange([...options, code])
                setDraft('')
              }
            }}
          />
          <Button
            variant="outline"
            size="sm"
            type="button"
            data-testid={`${id}-option-add`}
            disabled={!code || options.includes(code)}
            onClick={() => {
              onChange([...options, code])
              setDraft('')
            }}
          >
            Add option
          </Button>
        </span>
      )}
    </div>
  )
}

function DefaultField({
  id,
  param,
  readOnly,
  onChange,
}: {
  id: string
  param: ActivityParam
  readOnly: boolean
  onChange: (value: ParamValue | undefined) => void
}) {
  const label = <label htmlFor={`${id}-default`}>Default</label>
  if (param.type === 'boolean' || param.type === 'choice') {
    const choices = param.type === 'boolean' ? ['true', 'false'] : (param.options ?? [])
    return (
      <>
        {label}
        <select
          id={`${id}-default`}
          data-testid={`${id}-default`}
          value={param.default === undefined ? '' : String(param.default)}
          disabled={readOnly}
          onChange={(e) => {
            const v = e.target.value
            onChange(v === '' ? undefined : param.type === 'boolean' ? v === 'true' : v)
          }}
        >
          <option value="">No default</option>
          {choices.map((c) => (
            <option key={c} value={c}>
              {param.type === 'boolean' ? (c === 'true' ? 'Yes' : 'No') : c}
            </option>
          ))}
        </select>
      </>
    )
  }
  if (param.type === 'concept') return null
  return (
    <>
      {label}
      <Input
        size="sm"
        id={`${id}-default`}
        data-testid={`${id}-default`}
        type={param.type === 'number' ? 'number' : 'text'}
        value={param.default === undefined ? '' : String(param.default)}
        placeholder="No default"
        disabled={readOnly}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === '' ? undefined : param.type === 'number' ? Number(v) : v)
        }}
      />
    </>
  )
}

function move<T>(list: T[], index: number, delta: number): T[] {
  const next = [...list]
  const [item] = next.splice(index, 1)
  next.splice(index + delta, 0, item!)
  return next
}

/** A parameter name from a label: lower case, `_` for anything else, a letter first. */
export function slugName(label: string): string {
  const s = label
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!s) return ''
  return /^[a-z]/.test(s) ? s : `p_${s}`
}

function uniqueName(base: string, taken: Set<string>): string {
  if (!base || !taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}_${n}`)) n++
  return `${base}_${n}`
}
