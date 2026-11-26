import { useState } from 'react'
import { BUILTIN_ALIASES, type FunctionAlias } from '@tricc/core'
import { useCanWrite, useMutate, useProjectSnapshot } from '../runtime/context.js'

const CALL = /^\s*(DMN|DMNFirst|DMNList)\s*\(([^()]*)\)\s*$/
const NAME = /^[A-Za-z][A-Za-z0-9_]*$/

/** `DMN(table, age, weight)` → an alias; undefined when the text is not one. */
export function parseAlias(text: string): FunctionAlias | undefined {
  const m = CALL.exec(text)
  if (!m) return undefined
  const args = m[2]!
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
  if (!args.includes('table') || args.some((a) => !NAME.test(a))) return undefined
  return { function: m[1] as FunctionAlias['function'], args }
}

export function aliasText(alias: FunctionAlias): string {
  return `${alias.function}(${alias.args.join(', ')})`
}

/**
 * Project settings: other names for a table call (`tricc.yaml` `aliases`), so existing drawings
 * keep working — `DrugDosage('diazepam', age, weight)` is `DMN` with its inputs given by name.
 * Saved as soon as a row is committed, like the discussion labels.
 */
export function AliasSettings() {
  const project = useProjectSnapshot()
  const canWrite = useCanWrite()
  const mutate = useMutate()
  const aliases = project.aliases ?? {}
  const [name, setName] = useState('')
  const [call, setCall] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)

  const save = (next: Record<string, FunctionAlias>) => mutate((tx) => tx.setAliases(next))
  const add = () => {
    const n = name.trim()
    const parsed = parseAlias(call)
    if (!NAME.test(n)) return setError('A name starts with a letter, then letters, digits or _.')
    if (!parsed) {
      return setError(
        'Write the call as DMN(table, input, …): "table" for the table name, then the table inputs by name.',
      )
    }
    setError(undefined)
    save({ ...aliases, [n]: parsed })
    setName('')
    setCall('')
  }
  const enter = (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    add()
  }
  const builtins = Object.keys(BUILTIN_ALIASES).filter((n) => !(n in aliases))

  return (
    <fieldset className="tricc-label-settings" disabled={!canWrite} data-testid="alias-settings">
      <legend>Table call aliases</legend>
      <p>
        Another name for a decision table call. The arguments after the table are matched to the
        table inputs by name.
      </p>
      <ul>
        {Object.keys(aliases)
          .sort()
          .map((n) => (
            <li key={n} className="tricc-label-settings__row" data-testid={`alias-${n}`}>
              <code>{n}</code> = <code>{aliasText(aliases[n]!)}</code>
              {canWrite && (
                <button
                  type="button"
                  aria-label={`Remove the alias ${n}`}
                  data-testid={`alias-remove-${n}`}
                  onClick={() => {
                    const { [n]: _gone, ...rest } = aliases
                    save(rest)
                  }}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        {builtins.map((n) => (
          <li key={n} className="tricc-label-settings__row" data-testid={`alias-builtin-${n}`}>
            <code>{n}</code> = <code>{aliasText(BUILTIN_ALIASES[n]!)}</code>
            <span className="tricc-nav__note"> built in</span>
          </li>
        ))}
      </ul>
      {canWrite && (
        <div className="tricc-label-settings__row">
          <input
            value={name}
            data-testid="alias-new-name"
            placeholder="Name"
            aria-label="Alias name"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={enter}
          />
          <input
            value={call}
            data-testid="alias-new-call"
            placeholder="DMN(table, age, weight)"
            aria-label="Alias call"
            onChange={(e) => setCall(e.target.value)}
            onKeyDown={enter}
          />
          <button type="button" data-testid="alias-add" onClick={add}>
            Add
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="tricc-tables__error">
          {error}
        </p>
      )}
    </fieldset>
  )
}
