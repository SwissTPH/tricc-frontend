import type { Capability, CapabilitySet, Identity, IdentityPort } from '@tricc/core'
import { ALL_CAPABILITIES, READ_ONLY_CAPABILITIES } from '@tricc/core'

export interface PreferenceStore {
  get(key: string): string | null
  set(key: string, value: string): void
}

export const localStoragePreferences: PreferenceStore = {
  get: (k) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(k)),
  set: (k, v) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(k, v)
  },
}

const KEY = 'tricc.identity'

/**
 * The local identity.
 *
 * There are no accounts and no authentication: a display name, used for authorship and —
 * if a hosted version is ever used — for collaborator presence. This is the honest
 * replacement for the prototype's user-management screen
 * (feature/20260825-local-app.md §3.3).
 *
 * Every capability is granted except `project.share`, which is hosted-only. The read-only
 * toggle drops `project.write` for the session: it costs nothing, makes
 * review-without-touching real, and keeps the capability path exercised continuously
 * rather than untested until a hosted shell needs it.
 */
export class LocalIdentity implements IdentityPort {
  private listeners = new Set<() => void>()
  private readOnly = false
  private identity: Identity

  constructor(private readonly prefs: PreferenceStore = localStoragePreferences) {
    this.identity = this.load()
  }

  private load(): Identity {
    const raw = this.prefs.get(KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<Identity>
        if (parsed.displayName) {
          return {
            id: parsed.id ?? 'local',
            displayName: parsed.displayName,
            ...(parsed.email ? { email: parsed.email } : {}),
            ...(parsed.colour ? { colour: parsed.colour } : {}),
          }
        }
      } catch {
        // A corrupt preference is not worth failing startup over.
      }
    }
    return { id: 'local', displayName: 'Local author' }
  }

  current(): Identity {
    return this.identity
  }

  update(patch: Partial<Identity>): void {
    this.identity = { ...this.identity, ...patch }
    this.prefs.set(KEY, JSON.stringify(this.identity))
    this.notify()
  }

  capabilities(): CapabilitySet {
    return this.readOnly ? READ_ONLY_CAPABILITIES : LOCAL_CAPABILITIES
  }

  isReadOnly(): boolean {
    return this.readOnly
  }

  setReadOnly(value: boolean): void {
    if (this.readOnly === value) return
    this.readOnly = value
    this.notify()
  }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private notify(): void {
    for (const l of this.listeners) l()
  }
}

/** Everything except `project.share`, which has no meaning without a server. */
export const LOCAL_CAPABILITIES: CapabilitySet = new Set(
  [...ALL_CAPABILITIES].filter((c) => c !== 'project.share') as Capability[],
) as CapabilitySet
