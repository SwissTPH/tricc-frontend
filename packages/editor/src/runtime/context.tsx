import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  DEFAULT_PREFERENCES,
  type Capability,
  type EditorPreferences,
  type OpenProject,
  type PreferencesPort,
  type TriccRuntime,
} from '@tricc/core'

/**
 * The runtime provider.
 *
 * An instantiation composes adapters and renders the editor beneath this. A hosted shell
 * replaces the adapters and nothing else about the tree differs
 * (feature/20260825-library-architecture.md §5).
 */

const RuntimeContext = createContext<TriccRuntime | undefined>(undefined)
const OpenProjectContext = createContext<OpenProject | undefined>(undefined)
const PreferencesContext = createContext<PreferencesPort | undefined>(undefined)

export function TriccRuntimeProvider({
  runtime,
  preferences,
  children,
}: {
  runtime: TriccRuntime
  /** Per-viewer editor preferences. Without it the editor uses the defaults. */
  preferences?: PreferencesPort
  children: ReactNode
}) {
  return (
    <RuntimeContext.Provider value={runtime}>
      <PreferencesContext.Provider value={preferences}>{children}</PreferencesContext.Provider>
    </RuntimeContext.Provider>
  )
}

/** The viewer's editor preferences, kept current when they change. */
export function useEditorPreferences(): EditorPreferences {
  const port = useContext(PreferencesContext)
  const [value, setValue] = useState(() => port?.current() ?? DEFAULT_PREFERENCES)
  useEffect(() => {
    if (!port) return
    setValue(port.current())
    return port.onChange(() => setValue(port.current()))
  }, [port])
  return value
}

export function OpenProjectProvider({
  project,
  children,
}: {
  project: OpenProject
  children: ReactNode
}) {
  return (
    <OpenProjectContext.Provider value={project}>
      <UndoKeys />
      {children}
    </OpenProjectContext.Provider>
  )
}

export function useRuntime(): TriccRuntime {
  const runtime = useContext(RuntimeContext)
  if (!runtime) throw new Error('useRuntime must be used inside a TriccRuntimeProvider')
  return runtime
}

export function useOpenProject(): OpenProject {
  const open = useContext(OpenProjectContext)
  if (!open) throw new Error('useOpenProject must be used inside an OpenProjectProvider')
  return open
}

/**
 * Re-renders on every document change, local or remote.
 *
 * Subscribing to the whole document is correct for the screens that read project-level
 * data. Per-node subscription (`useNode`) is what the canvas will need at 500 nodes.
 */
export function useProjectSnapshot() {
  const { document } = useOpenProject()
  const [, force] = useState(0)
  useEffect(() => document.subscribe(() => force((n) => n + 1)), [document])
  return document.snapshot()
}

export function useActivity(activityId: string) {
  return useProjectSnapshot().activities[activityId]
}

/**
 * Capability gating.
 *
 * The document refuses writes independently, so this is defence in depth rather than the
 * only guard — a component that forgets to gate still cannot mutate.
 */
export function useCapability(capability: Capability): boolean {
  const runtime = useRuntime()
  const [, force] = useState(0)
  useEffect(() => runtime.identity.onChange(() => force((n) => n + 1)), [runtime])
  return runtime.identity.capabilities().has(capability)
}

export function useCanWrite(): boolean {
  return useCapability('project.write')
}

export function RequireCapability({
  capability,
  children,
  fallback = null,
}: {
  capability: Capability
  children: ReactNode
  fallback?: ReactNode
}) {
  return useCapability(capability) ? <>{children}</> : <>{fallback}</>
}

/** Mutate the open project, re-rendering afterwards. */
export function useMutate() {
  const { document } = useOpenProject()
  return useCallback(
    (fn: Parameters<typeof document.transact>[0]) => document.transact(fn),
    [document],
  )
}

/**
 * Ctrl+Z undoes the last local change. Ctrl+Shift+Z and Ctrl+Y restore it.
 * Cmd is accepted as well. A search box or an open dialog keeps the browser's own undo.
 */
function UndoKeys() {
  const { document } = useOpenProject()
  const canWrite = useCanWrite()

  useEffect(() => {
    if (!canWrite) return
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      const key = event.key.toLowerCase()
      const redo = key === 'y' || (key === 'z' && event.shiftKey)
      const undo = key === 'z' && !event.shiftKey
      if (!undo && !redo) return
      if (keepsNativeUndo(event.target)) return
      // A dialog is a draft. Undo waits until it closes, so a preview cannot land on a stale id.
      // `document` here is the project document, so the page is reached through the window.
      if (window.document.querySelector('[role="dialog"]')) return
      event.preventDefault()
      if (redo) document.undo.redo()
      else document.undo.undo()
    }
    // Capture so a focused field or the canvas cannot swallow the shortcut.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [canWrite, document])

  return null
}

/** Search fields and dialog drafts are not document edits yet. */
function keepsNativeUndo(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const field = target.closest('input, textarea, select, [contenteditable="true"]')
  if (!field) return false
  if (field.closest('[role="dialog"]')) return true
  return field instanceof HTMLInputElement && (field.type === 'search' || field.type === 'file')
}
