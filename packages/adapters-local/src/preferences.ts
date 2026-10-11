import {
  DEFAULT_PREFERENCES,
  normalizePreferences,
  type EditorPreferences,
  type PreferencesPort,
} from '@tricc/core'
import { localStoragePreferences, type PreferenceStore } from './identity.js'

const KEY = 'tricc.preferences'

/** Editor preferences kept in this browser. Storage that fails or is blocked falls back to the defaults. */
export class LocalPreferences implements PreferencesPort {
  private listeners = new Set<() => void>()
  private value: EditorPreferences

  constructor(private readonly prefs: PreferenceStore = localStoragePreferences) {
    this.value = this.load()
  }

  private load(): EditorPreferences {
    try {
      const raw = this.prefs.get(KEY)
      return raw ? normalizePreferences(JSON.parse(raw) as Partial<EditorPreferences>) : DEFAULT_PREFERENCES
    } catch {
      return DEFAULT_PREFERENCES
    }
  }

  current(): EditorPreferences {
    return this.value
  }

  update(patch: Partial<EditorPreferences>): void {
    this.value = normalizePreferences({ ...this.value, ...patch })
    try {
      this.prefs.set(KEY, JSON.stringify(this.value))
    } catch {
      // Kept for this session only; a blocked store is not worth an error.
    }
    for (const l of this.listeners) l()
  }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }
}
