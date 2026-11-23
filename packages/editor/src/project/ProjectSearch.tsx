import { useDeferredValue, useMemo, useRef, type ReactNode } from 'react'
import { searchProject, type ConceptKey } from '@tricc/core'
import { useProjectSnapshot } from '../runtime/context.js'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../components/ui/command.js'

/**
 * The project search as a command palette: what the query finds, by source (segments,
 * activities, dictionary concepts, nodes). The query stays editable here; picking a hit
 * opens where it lives and closes the palette. Escape and the backdrop close it.
 */
export function ProjectSearchCommand({
  open,
  query,
  onQueryChange,
  onClose,
  onOpenConcept,
  onOpenActivity,
  onOpenNode,
}: {
  open: boolean
  query: string
  onQueryChange: (query: string) => void
  onClose: () => void
  onOpenConcept?: (key: ConceptKey) => void
  onOpenActivity: (activityId: string) => void
  onOpenNode?: (activityId: string, nodeId: string) => void
}) {
  const project = useProjectSnapshot()
  // Typing stays responsive on big projects; the hits catch up a frame later.
  const deferredQuery = useDeferredValue(query)
  const result = useMemo(
    () => (open ? searchProject(project, deferredQuery) : null),
    [open, project, deferredQuery],
  )
  const inputRef = useRef<HTMLInputElement>(null)

  const go = (navigate: () => void) => () => {
    navigate()
    onClose()
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Search the project"
      description="Concepts, segments, activities and nodes. Pick one to open it."
      className="sm:max-w-2xl"
      // Hits come from searchProject, so cmdk must not filter or re-sort them.
      commandProps={{ shouldFilter: false, loop: true, 'data-testid': 'project-search-results' }}
      onOpenAutoFocus={(event) => {
        // Focus the query with the caret after what was already typed in the bar.
        event.preventDefault()
        const input = inputRef.current
        if (!input) return
        input.focus()
        input.setSelectionRange(input.value.length, input.value.length)
      }}
      // Radix would hand focus back to the bar, and focusing the bar opens the palette again.
      onCloseAutoFocus={(event) => event.preventDefault()}
    >
      <CommandInput
        ref={inputRef}
        data-testid="project-search-input"
        placeholder="Search the project"
        value={query}
        onValueChange={onQueryChange}
      />
      <CommandList className="max-h-[min(60vh,480px)]">
        <CommandEmpty data-testid={query.trim() ? 'project-search-none' : undefined}>
          {query.trim()
            ? 'Nothing in the project matches.'
            : 'Type to search concepts, segments, activities and nodes.'}
        </CommandEmpty>
        {/* Segments and activities first: they are where people most often want to go. */}
        {result && (
          <>
            <Hits source="processes" title="Segments" count={result.processes.length}>
              {result.processes.map((hit) => (
                <Hit
                  key={hit.activityId}
                  value={`process|${hit.activityId}`}
                  testId={`search-hit-process-${hit.activityId}`}
                  onSelect={go(() => onOpenActivity(hit.activityId))}
                  main={hit.title}
                  detail={hit.process ?? hit.activityId}
                />
              ))}
            </Hits>
            <Hits source="activities" title="Activities" count={result.activities.length}>
              {result.activities.map((hit) => (
                <Hit
                  key={hit.activityId}
                  value={`activity|${hit.activityId}`}
                  testId={`search-hit-activity-${hit.activityId}`}
                  onSelect={go(() => onOpenActivity(hit.activityId))}
                  main={hit.title}
                  detail={hit.activityId}
                />
              ))}
            </Hits>
            <Hits source="concepts" title="Data dictionary" count={result.concepts.length}>
              {result.concepts.map(({ concept, dictionary }) => (
                <Hit
                  key={`${concept.system}|${concept.code}`}
                  value={`concept|${concept.system}|${concept.code}`}
                  testId={`search-hit-concept-${concept.code}`}
                  disabled={!onOpenConcept}
                  onSelect={go(() =>
                    onOpenConcept?.({ system: concept.system, code: concept.code }),
                  )}
                  main={concept.display ?? concept.code}
                  detail={`${concept.code} · ${dictionary}`}
                />
              ))}
            </Hits>
            <Hits source="nodes" title="Nodes" count={result.nodes.length}>
              {result.nodes.map((hit) => (
                <Hit
                  key={`${hit.activityId}|${hit.nodeId}`}
                  value={`node|${hit.activityId}|${hit.nodeId}`}
                  testId={`search-hit-node-${hit.activityId}-${hit.nodeId}`}
                  disabled={!onOpenNode}
                  onSelect={go(() => onOpenNode?.(hit.activityId, hit.nodeId))}
                  main={hit.text}
                  detail={`${hit.type} · ${hit.activityTitle}`}
                />
              ))}
            </Hits>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}

function Hits({
  source,
  title,
  count,
  children,
}: {
  source: string
  title: string
  count: number
  children: ReactNode
}) {
  if (count === 0) return null
  return (
    <CommandGroup data-testid={`project-search-${source}`} heading={`${title} (${count})`}>
      {children}
    </CommandGroup>
  )
}

function Hit({
  value,
  testId,
  disabled,
  onSelect,
  main,
  detail,
}: {
  value: string
  testId: string
  disabled?: boolean | undefined
  onSelect: () => void
  main: string
  detail: string
}) {
  return (
    <CommandItem value={value} data-testid={testId} disabled={disabled} onSelect={onSelect}>
      <span className="min-w-0 flex-1 truncate">{main}</span>
      <span className="text-muted-foreground shrink-0 text-xs">{detail}</span>
    </CommandItem>
  )
}
