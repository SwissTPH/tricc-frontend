import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

/** The groups of the Ctrl+K palette, in the order it lists them. */
export const COMMAND_GROUPS = ['Create', 'Go to', 'Activity', 'Edit', 'App'] as const
export type CommandGroup = (typeof COMMAND_GROUPS)[number]

/** An action the Ctrl+K palette offers. */
export interface Command {
  /** Unique across the app, e.g. `nav.dictionary`, `create.activity`. */
  id: string
  group: CommandGroup
  label: string
  /** Extra words the palette's filter matches. */
  keywords?: string[]
  /** Shown only, written with Ctrl (the palette shows ⌘ on a Mac), e.g. `Ctrl+Z`. */
  shortcut?: string
  /** It changes the project: not offered without write access or in Viewing mode. */
  writes?: boolean
  run: () => void
}

/** The commands registered by the components on screen. */
export class CommandStore {
  private entries = new Map<number, Command[]>()
  private next = 0
  private listeners = new Set<() => void>()
  private snapshot: Command[] = []

  /** Adds `commands`; the returned function removes them. */
  register(commands: Command[]): () => void {
    const key = this.next++
    this.entries.set(key, commands)
    this.changed()
    return () => {
      this.entries.delete(key)
      this.changed()
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Every command, once per id: a later registration of an id replaces an earlier one. */
  getSnapshot = (): Command[] => this.snapshot

  private changed() {
    const byId = new Map<string, Command>()
    for (const commands of this.entries.values()) {
      for (const command of commands) {
        if (byId.has(command.id)) console.warn(`Command "${command.id}" is registered twice.`)
        byId.set(command.id, command)
      }
    }
    this.snapshot = [...byId.values()]
    for (const listener of this.listeners) listener()
  }
}

const CommandsContext = createContext<CommandStore | null>(null)
const EMPTY: Command[] = []
const noop = () => () => {}

/** Holds the commands of everything under it. One is enough: a nested provider adds nothing. */
export function CommandsProvider({ children }: { children: ReactNode }) {
  const outer = useContext(CommandsContext)
  const [store] = useState(() => new CommandStore())
  if (outer) return <>{children}</>
  return <CommandsContext.Provider value={store}>{children}</CommandsContext.Provider>
}

/**
 * Offers `commands` in the palette while the calling component is mounted. Without a provider
 * above (the host's home page) it does nothing. `run` is always the latest one passed.
 */
export function useRegisterCommands(commands: Command[]): void {
  const store = useContext(CommandsContext)
  const latest = useRef(commands)
  latest.current = commands
  // Re-register only when what the palette shows changes, not on every render.
  const signature = commands
    .map((c) =>
      [c.id, c.group, c.label, c.shortcut ?? '', c.writes ? 'w' : '', ...(c.keywords ?? [])].join(
        '\u0001',
      ),
    )
    .join('\u0002')
  useEffect(() => {
    if (!store) return
    const stable = latest.current.map((command) => ({
      ...command,
      run: () => latest.current.find((c) => c.id === command.id)?.run(),
    }))
    return store.register(stable)
    // `signature` stands for `commands`; `latest` keeps `run` current.
  }, [store, signature])
}

/** The registered commands, for the palette. */
export function useCommands(): Command[] {
  const store = useContext(CommandsContext)
  return useSyncExternalStore(
    store?.subscribe ?? noop,
    store?.getSnapshot ?? (() => EMPTY),
    store?.getSnapshot ?? (() => EMPTY),
  )
}

/** Case-insensitive match on the label, the group and the keywords. Empty query: all. */
export function matchCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase()
  if (!q) return commands
  return commands.filter((c) =>
    [c.label, c.group, ...(c.keywords ?? [])].some((text) => text.toLowerCase().includes(q)),
  )
}

/** `Ctrl+Z` as the platform writes it: `⌘Z` on a Mac. */
export function shortcutLabel(shortcut: string): string {
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  if (!mac) return shortcut
  return shortcut
    .replace(/Ctrl\+/g, '⌘')
    .replace(/Shift\+/g, '⇧')
    .replace(/Alt\+/g, '⌥')
}
