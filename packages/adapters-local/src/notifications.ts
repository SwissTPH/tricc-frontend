import type { ReadStateStore } from '@tricc/core'
import { localStoragePreferences, type PreferenceStore } from './identity.js'

const KEY = 'drawtricc.notifications.read'

/** Which notifications this viewer has read, kept in this browser. */
export function localReadState(prefs: PreferenceStore = localStoragePreferences): ReadStateStore {
  return {
    load() {
      try {
        const parsed: unknown = JSON.parse(prefs.get(KEY) ?? '[]')
        return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
      } catch {
        return []
      }
    },
    save(ids) {
      try {
        prefs.set(KEY, JSON.stringify(ids))
      } catch {
        // Storage full or blocked: read marks last for this session only.
      }
    },
  }
}
