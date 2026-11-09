import { useMemo } from 'react'
import {
  defaultCodeSystem,
  isIsoPeriod,
  lookupConcept,
  populateSourceKey,
  retrieveCodeSystem,
  type Project,
  type TriccNode,
} from '@tricc/core'
import { useMutate, useProjectSnapshot } from '../runtime/context.js'
import { Typeahead, type TypeaheadOption } from '../components/Typeahead.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'

/**
 * A prefilled value: where it reads, which concept, how far back
 * (fix/20261109-populate-source-period.md), and the move to the retrieval dictionary
 * (feature/20261109-project-retrievals.md §5).
 */
export function PopulateFields({
  activityId,
  node,
  readOnly,
  update,
  onMoved,
}: {
  activityId: string
  node: TriccNode
  readOnly: boolean
  update: (patch: Partial<TriccNode>) => void
  /** The node is gone: it is an entry of the retrieval dictionary now. */
  onMoved?: (code: string) => void
}) {
  const project = useProjectSnapshot()
  const mutate = useMutate()
  const options = useMemo(() => sourceOptions(project), [project])
  const timed = node.context === 'encounter' || node.context === 'history'
  const sourceKey = node.source === undefined ? undefined : populateSourceKey(project, node)
  const source = lookupConcept(project, sourceKey)
  const implicit =
    node.source === undefined ? lookupConcept(project, populateSourceKey(project, node)) : undefined
  const periodInvalid = timed && node.period !== undefined && !isIsoPeriod(node.period)

  return (
    <>
      <label htmlFor="node-context">Read from</label>
      <select
        id="node-context"
        data-testid="field-context"
        value={node.context ?? ''}
        disabled={readOnly}
        onChange={(e) => {
          const context = (e.target.value || undefined) as TriccNode['context']
          const stillTimed = context === 'encounter' || context === 'history'
          // tricc_oo ignores a period elsewhere, so it is not kept.
          update({ context, ...(stillTimed ? {} : { period: undefined }) })
        }}
      >
        <option value="">Not set</option>
        <option value="patient">Patient</option>
        <option value="facility">Facility</option>
        <option value="practitioner">Practitioner</option>
        <option value="location">Location</option>
        <option value="encounter">Encounter</option>
        <option value="history">History</option>
      </select>

      <span>Source concept</span>
      <div data-testid="field-source">
        {node.source !== undefined ? (
          <span data-testid="field-source-value">
            {source?.display ?? sourceKey?.code} <code>{sourceKey?.code}</code>{' '}
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                data-testid="field-source-clear"
                onClick={() => update({ source: undefined })}
              >
                Clear
              </Button>
            )}
          </span>
        ) : (
          <Typeahead
            label="Source concept"
            testId="field-source-search"
            options={options}
            disabled={readOnly}
            placeholder="Find the concept it reads"
            emptyMessage="No concept matches."
            onSelect={(id) => {
              const at = id.lastIndexOf('|')
              const system = id.slice(0, at)
              const code = id.slice(at + 1)
              const inDefault = defaultCodeSystem(project)?.url === system
              update({ source: inDefault ? code : { system, code } })
            }}
          />
        )}
      </div>
      {node.source === undefined && (
        <p data-testid="field-source-implicit">
          {implicit
            ? `Without a source it reads ${implicit.display ?? implicit.code} (${implicit.code}), the concept with its name.`
            : 'Without a source it reads the concept with its name, and the dictionary has none.'}
        </p>
      )}

      {timed && (
        <>
          <label htmlFor="node-period">Period</label>
          <Input
            size="sm"
            id="node-period"
            data-testid="field-period"
            value={node.period ?? ''}
            placeholder="P30D"
            readOnly={readOnly}
            disabled={readOnly}
            aria-invalid={periodInvalid || undefined}
            onChange={(e) => update({ period: e.target.value.trim() || undefined })}
          />
          <p data-testid={periodInvalid ? 'field-period-invalid' : undefined}>
            {periodInvalid
              ? 'Not an ISO-8601 period. Write it like P30D (30 days) or P6M (6 months).'
              : 'How far back to read: an ISO-8601 period, for example P30D.'}
          </p>
        </>
      )}

      {!readOnly && node.name && (
        <p>
          <Button
            variant="outline"
            size="sm"
            type="button"
            data-testid="populate-move-to-retrieval"
            title={`Define it once in ${retrieveCodeSystem(project)?.id ?? 'the retrieval dictionary'}; logic refers to it as "#${node.name}"`}
            onClick={() => {
              let code = ''
              mutate((tx) => {
                code = tx.moveToRetrieval(activityId, node.id)
              })
              onMoved?.(code)
            }}
          >
            Move to the retrieval dictionary
          </Button>
        </p>
      )}
    </>
  )
}

/** Concepts a prefilled value can read: every dictionary but the retrieval one. */
function sourceOptions(project: Project): TypeaheadOption[] {
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
