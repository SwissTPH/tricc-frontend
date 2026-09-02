import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Capability, OpenProject, TriccRuntime } from '@tricc/core'

/**
 * The runtime provider.
 *
 * An instantiation composes adapters and renders the editor beneath this. A hosted shell
 * replaces the adapters and nothing else about the tree differs
 * (feature/20260825-library-architecture.md §5).
 */

const RuntimeContext = createContext<TriccRuntime | undefined>(undefined)
const OpenProjectContext = createContext<OpenProject | undefined>(undefined)

export function TriccRuntimeProvider({
  runtime,
  children,
}: {
  runtime: TriccRuntime
  children: ReactNode
}) {
  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>
}

export function OpenProjectProvider({
  project,
  children,
}: {
  project: OpenProject
  children: ReactNode
}) {
  return <OpenProjectContext.Provider value={project}>{children}</OpenProjectContext.Provider>
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
