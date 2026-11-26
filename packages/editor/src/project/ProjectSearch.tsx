import { useDeferredValue, useMemo, useRef, type ReactNode } from 'react'
import { searchProject, type ConceptKey } from '@tricc/core'
import { useCanWrite, useProjectSnapshot } from '../runtime/context.js'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '../components/ui/command.js'
import {
  COMMAND_GROUPS,
  matchCommands,
  shortcutLabel,
  useCommands,
  type Command,
} from '../commands/registry.js'

/** `search`: the project search (Ctrl+F, the bar). `commands`: actions above it (Ctrl+K). */
export type PaletteMode = 'search' | 'commands'

/**
 * The project search as a command palette: what the query finds, by source (segments,
 * activities, dictionary concepts, nodes). The query stays editable here; picking a hit
 * opens where it lives and closes the palette. Escape and the backdrop close it.
 *
 * In `commands` mode the registered actions come first, narrowed by the same query.
 */
export function ProjectSearchCommand({
  open,
  mode = 'search',
  query,
  onQueryChange,
  onClose,
  onOpenConcept,
  onOpenActivity,
  onOpenNode,
}: {
  open: boolean
  mode?: PaletteMode
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
  const canWrite = useCanWrite()
  const registered = useCommands()
  const commands =
    open && mode === 'commands'
      ? matchCommands(
          registered.filter((c) => canWrite || !c.writes),
          query,
        )
      : []

  const go = (navigate: () => void) => () => {
    navigate()
    onClose()
  }
  // A command runs once the palette is closed: keyboard handlers such as undo stand aside
  // while a dialog is open, and a command may open a dialog of its own.
  const runCommand = (command: Command) => () => {
    onClose()
    requestAnimationFrame(() => {
      try {
        command.run()
      } catch (error) {
        console.error(`Command "${command.id}" failed.`, error)
      }
    })
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={mode === 'commands' ? 'Commands and project search' : 'Search the project'}
      description={
        mode === 'commands'
          ? 'Actions, then concepts, segments, activities and nodes. Pick one to run or open it.'
          : 'Concepts, segments, activities and nodes. Pick one to open it.'
      }
      className="sm:max-w-2xl"
      // Hits come from searchProject, so cmdk must not filter or re-sort them.
      commandProps={{
        shouldFilter: false,
        loop: true,
        'data-testid': 'project-search-results',
        'data-mode': mode,
      }}
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
        placeholder={mode === 'commands' ? 'Type a command or search' : 'Search the project'}
        value={query}
        onValueChange={onQueryChange}
      />
      <CommandList className="max-h-[min(60vh,480px)]">
        <CommandEmpty data-testid={query.trim() ? 'project-search-none' : undefined}>
          {query.trim()
            ? 'Nothing in the project matches.'
            : 'Type to search concepts, segments, activities and nodes.'}
        </CommandEmpty>
        {COMMAND_GROUPS.map((group) => {
          const inGroup = commands.filter((c) => c.group === group)
          if (inGroup.length === 0) return null
          return (
            <CommandGroup key={group} heading={group} data-testid="palette-actions">
              {inGroup.map((command) => (
                <CommandItem
                  key={command.id}
                  value={`command|${command.id}`}
                  data-testid={`command-${command.id}`}
                  onSelect={runCommand(command)}
                >
                  <span className="min-w-0 flex-1 truncate">{command.label}</span>
                  {command.shortcut && (
                    <CommandShortcut>{shortcutLabel(command.shortcut)}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}
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
