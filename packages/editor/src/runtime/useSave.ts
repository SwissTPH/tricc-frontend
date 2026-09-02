import { useCallback, useEffect, useRef, useState } from 'react'
import { useOpenProject, useRuntime } from './context.js'

export type SaveState = 'saved' | 'saving' | 'unsaved' | 'error'

export interface SaveStatus {
  state: SaveState
  lastSavedAt?: number
  error?: string
  save: () => Promise<void>
}

/**
 * Continuous save.
 *
 * Debounced, plus immediate on tab hide. Save state is always visible, because a user in
 * download mode must know before they close the tab rather than after
 * (feature/20260825-local-app.md §4).
 */
export function useSave(debounceMs = 2000): SaveStatus {
  const runtime = useRuntime()
  const open = useOpenProject()
  const [state, setState] = useState<SaveState>('saved')
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const inFlight = useRef(false)

  const save = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setState('saving')
    try {
      await runtime.save(open)
      setState('saved')
      setLastSavedAt(Date.now())
      setError(undefined)
    } catch (e) {
      setState('error')
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      inFlight.current = false
    }
  }, [runtime, open])

  useEffect(() => {
    return open.document.subscribe(() => {
      setState('unsaved')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void save(), debounceMs)
    })
  }, [open.document, save, debounceMs])

  useEffect(() => {
    const onHide = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') void save()
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (runtime.hasUnsavedChanges(open)) e.preventDefault()
    }
    document?.addEventListener('visibilitychange', onHide)
    window?.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document?.removeEventListener('visibilitychange', onHide)
      window?.removeEventListener('beforeunload', onBeforeUnload)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [runtime, open, save])

  const status: SaveStatus = { state, save }
  if (lastSavedAt !== undefined) status.lastSavedAt = lastSavedAt
  if (error !== undefined) status.error = error
  return status
}
