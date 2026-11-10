import {
  argProblem,
  argRef,
  effectiveParams,
  paramDescription,
  paramEnvironments,
  paramLabel,
  refArg,
  resolve,
  showParamValue,
  type ActivityParam,
  type ParamValue,
  type Project,
  type ValueSource,
} from '@tricc/core'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'

/** One parameter the form asks for. */
export interface ArgumentRow {
  name: string
  param: ActivityParam
  /** The page declaring it, whose concept holds its label and help. */
  declaredIn: string
}

/** Where an unset value comes from, and what it is when that is known. */
export interface Inherited {
  from: string
  value?: ParamValue
}

/**
 * The values of a call (Use block, Go to activity) or of an intervention, one row per parameter
 * (feature/20261028-snippets-tab-and-params.md §5.1). A row is *inherited* (nothing stored)
 * or *set for this call* (stored in `args`); at a call it can also be bound to a setting of the
 * calling page (`{{name}}`). A value stored for a parameter that no longer exists is shown, so
 * it can be cleared, never dropped silently.
 */
export function ArgumentForm({
  project,
  rows,
  values,
  onChange,
  readOnly,
  testId,
  inherited,
  bindable,
  unsetLabel = 'Inherited',
}: {
  project: Project
  rows: ArgumentRow[]
  values: Record<string, ParamValue> | undefined
  onChange: (values: Record<string, ParamValue> | undefined) => void
  readOnly: boolean
  testId: string
  /** What a row shows while nothing is set here. */
  inherited?: (name: string) => Inherited | undefined
  /**
   * Settings of the calling page a row can be bound to (`{{name}}`); a row can always be bound to
   * its own name, which then becomes a setting of the caller. Absent: no binding (an intervention).
   */
  bindable?: string[]
  /** The name of the unset state: "Inherited" at a call, "Not set" on an intervention. */
  unsetLabel?: string
}) {
  const set = (name: string, value: ParamValue | undefined) => {
    const next = { ...(values ?? {}) }
    if (value === undefined) delete next[name]
    else next[name] = value
    onChange(Object.keys(next).length > 0 ? next : undefined)
  }
  const known = new Set(rows.map((r) => r.name))
  const stale = Object.keys(values ?? {}).filter((name) => !known.has(name))

  if (rows.length === 0 && stale.length === 0) {
    return (
      <p className="tricc-args__empty" data-testid={`${testId}-none`}>
        No settings to set.
      </p>
    )
  }

  return (
    <div className="tricc-args" data-testid={testId}>
      {rows.map((row) => {
        const label = paramLabel(project, row.declaredIn, row.param)
        const help = paramDescription(project, row.declaredIn, row.name)
        const value = values?.[row.name]
        const ref = value === undefined ? undefined : argRef(value)
        const mode = value === undefined ? 'inherit' : ref ? 'bind' : 'set'
        const from = inherited?.(row.name)
        const problem = value === undefined ? undefined : argProblem(row.param, value, label)
        const fallback = from?.value ?? row.param.default
        const needsValue = row.param.required && value === undefined && fallback === undefined
        const id = `${testId}-${row.name}`
        const targets = bindable ? [...new Set([row.name, ...bindable, ...(ref ? [ref] : [])])] : []
        return (
          <fieldset key={row.name} className="tricc-args__row" data-testid={id} data-mode={mode}>
            <legend>
              {label}
              {row.param.required && (
                <span className="tricc-args__required" title="Required">
                  {' '}
                  *
                </span>
              )}
              {label !== row.name && <span className="tricc-args__code"> {row.name}</span>}
            </legend>
            {help && <p className="tricc-args__help">{help}</p>}
            <select
              aria-label={`How ${label} is set`}
              data-testid={`${id}-mode`}
              value={mode}
              disabled={readOnly}
              onChange={(e) => {
                const next = e.target.value
                if (next === 'inherit') set(row.name, undefined)
                else if (next === 'bind') set(row.name, refArg(row.name))
                else set(row.name, starting(row.param, fallback))
              }}
            >
              <option value="inherit">{unsetLabel}</option>
              <option value="set">Set here</option>
              {bindable && <option value="bind">A setting of this activity</option>}
            </select>
            {mode === 'inherit' && (
              <p className="tricc-args__inherited" data-testid={`${id}-inherited`}>
                {from
                  ? `${from.from}${from.value !== undefined ? `: ${showParamValue(from.value)}` : ''}`
                  : row.param.default !== undefined
                    ? `Default: ${showParamValue(row.param.default)}`
                    : 'No value yet'}
              </p>
            )}
            {mode === 'set' && (
              <ValueControl
                id={`${id}-value`}
                label={label}
                param={row.param}
                value={value!}
                project={project}
                readOnly={readOnly}
                onChange={(v) => set(row.name, v)}
              />
            )}
            {mode === 'set' && from?.value !== undefined && from.from && (
              <p className="tricc-args__override" data-testid={`${id}-override`}>
                Overrides the value inherited from {from.from.replace(/^Inherited from /, '')}.
              </p>
            )}
            {mode === 'bind' && (
              <select
                aria-label={`Setting ${label} is bound to`}
                data-testid={`${id}-bind`}
                value={ref}
                disabled={readOnly}
                onChange={(e) => set(row.name, refArg(e.target.value))}
              >
                {targets.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
            {problem && (
              <p role="alert" className="tricc-field-error" data-testid={`${id}-error`}>
                {problem}
              </p>
            )}
            {needsValue && (
              <p className="tricc-field-error" data-testid={`${id}-needs-value`}>
                “{label}” needs a value.
              </p>
            )}
          </fieldset>
        )
      })}
      {stale.map((name) => (
        <p key={name} className="tricc-field-error" data-testid={`${testId}-stale-${name}`}>
          There is no setting called “{name}” any more ({showParamValue(values![name])}).{' '}
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              data-testid={`${testId}-clear-${name}`}
              onClick={() => set(name, undefined)}
            >
              Clear
            </Button>
          )}
        </p>
      ))}
    </div>
  )
}

/** A first value when a row becomes "set here": what it would have had, else a blank of its type. */
function starting(param: ActivityParam, fallback: ParamValue | undefined): ParamValue {
  if (fallback !== undefined && !argRef(fallback)) return fallback
  switch (param.type) {
    case 'boolean':
      return false
    case 'number':
      return 0
    case 'choice':
      return param.options?.[0] ?? ''
    default:
      return ''
  }
}

function ValueControl({
  id,
  label,
  param,
  value,
  project,
  readOnly,
  onChange,
}: {
  id: string
  label: string
  param: ActivityParam
  value: ParamValue
  project: Project
  readOnly: boolean
  onChange: (value: ParamValue) => void
}) {
  switch (param.type) {
    case 'boolean':
      return (
        <label className="tricc-check">
          <input
            type="checkbox"
            data-testid={id}
            checked={value === true}
            disabled={readOnly}
            onChange={(e) => onChange(e.target.checked)}
          />
          {label}
        </label>
      )
    case 'number':
      return (
        <Input
          size="sm"
          type="number"
          aria-label={label}
          data-testid={id}
          value={typeof value === 'number' ? value : String(value)}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      )
    case 'choice':
      return (
        <select
          aria-label={label}
          data-testid={id}
          value={String(value)}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
        >
          {!(param.options ?? []).includes(String(value)) && (
            <option value={String(value)}>{String(value)}</option>
          )}
          {(param.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )
    case 'concept': {
      const lang = project.languages.default
      const concepts = Object.values(project.codeSystems).flatMap((cs) =>
        cs.conceptOrder.map((code) => ({
          system: cs.url,
          code,
          label: cs.concepts[code]?.display ?? code,
        })),
      )
      const current = typeof value === 'object' ? `${value.system}|${value.code}` : ''
      return (
        <select
          aria-label={label}
          data-testid={id}
          value={current}
          disabled={readOnly}
          onChange={(e) => {
            const [system, code] = e.target.value.split('|')
            if (system && code) onChange({ system, code })
          }}
        >
          <option value="">Choose a concept…</option>
          {concepts.map((c) => (
            <option key={`${c.system}|${c.code}`} value={`${c.system}|${c.code}`}>
              {resolve({ [lang]: c.label }, lang, lang)} ({c.code})
            </option>
          ))}
        </select>
      )
    }
    default:
      return (
        <Input
          size="sm"
          aria-label={label}
          data-testid={id}
          value={String(value)}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

/** The rows a call to `targetId` asks for: every effective parameter of the target. */
export function rowsFor(project: Project, targetId: string): ArgumentRow[] {
  return effectiveParams(project, targetId).map((e) => ({
    name: e.name,
    param: e.param,
    declaredIn: e.declaredIn,
  }))
}

/**
 * What an unset value at a call on `callerId` inherits: the caller's value of the same name, as
 * resolved from the interventions that reach the caller (shown when they agree).
 */
export function inheritedAtCall(project: Project, callerId: string): (name: string) => Inherited {
  const lang = project.languages.default
  const envs = paramEnvironments(project).get(callerId) ?? []
  const callerTitle = resolve(project.activities[callerId]?.title, lang, lang) ?? callerId
  return (name) => {
    const values = new Set(envs.map((env) => JSON.stringify(env.values[name] ?? null)))
    const env = envs[0]
    if (!env || values.size !== 1 || env.values[name] === undefined) {
      return {
        from:
          envs.length > 1 && values.size > 1
            ? `Inherited from ${callerTitle} (differs by intervention)`
            : `Inherited from ${callerTitle}`,
      }
    }
    return {
      from: `Inherited from ${sourceText(project, env.sources[name])}`,
      value: env.values[name],
    }
  }
}

export function sourceText(project: Project, source: ValueSource | undefined): string {
  const lang = project.languages.default
  if (!source) return 'the calling activity'
  switch (source.kind) {
    case 'intervention': {
      const iv = project.interventions.find((i) => i.id === source.interventionId)
      return `the intervention ${resolve(iv?.title, lang, lang) ?? source.interventionId}`
    }
    case 'call':
      return resolve(project.activities[source.activityId]?.title, lang, lang) ?? source.activityId
    case 'default':
      return 'the default'
    case 'none':
      return 'nowhere yet'
  }
}

/** "Axillary · 37.5": the values set on a call, for its node. */
export function argSummary(values: Record<string, ParamValue> | undefined): string {
  return Object.values(values ?? {})
    .map((v) => (argRef(v) ? `=${argRef(v)}` : showParamValue(v)))
    .join(' · ')
}
