import { useCallback, useEffect, useState } from 'react'
import type { NotificationScope, TriccNotification } from '@tricc/core'
import { useRuntime } from './context.js'

/**
 * The bell's list for a scope: no project id on the home page (every project), the open
 * project's id inside it. Kept current through the runtime's `NotificationsPort`, whatever
 * backs it: the project files locally, a notification service on the platform.
 */
export function useNotifications(scope: NotificationScope): {
  items: TriccNotification[]
  unread: number
  markRead: (ids: readonly string[]) => void
} {
  const port = useRuntime().notifications
  const [items, setItems] = useState<TriccNotification[]>([])
  const projectId = scope.projectId
  useEffect(() => {
    let live = true
    const load = () =>
      void port.list({ projectId }).then((next) => {
        if (live) setItems(next)
      })
    load()
    const off = port.subscribe({ projectId }, load)
    return () => {
      live = false
      off()
    }
  }, [port, projectId])
  const markRead = useCallback((ids: readonly string[]) => void port.markRead(ids), [port])
  return { items, unread: items.filter((n) => !n.read).length, markRead }
}
