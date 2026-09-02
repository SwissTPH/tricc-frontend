/**
 * Identity and capabilities.
 *
 * Capabilities are permissions and can refuse. They are deliberately distinct from
 * authoring *roles*, which are a UI focus preference and never refuse
 * (feature/20260825-library-architecture.md §4, guided-authoring §2).
 */

export const CAPABILITIES = [
  'project.read',
  'project.write',
  'project.export',
  'project.delete',
  'terminology.read',
  'terminology.write',
  'settings.write',
  /** Hosted only; never granted locally. */
  'project.share',
] as const

export type Capability = (typeof CAPABILITIES)[number]
export type CapabilitySet = ReadonlySet<Capability>

export interface Identity {
  id: string
  displayName: string
  email?: string
  /** Presence colour for collaborative awareness. */
  colour?: string
}

export interface Scope {
  projectId?: string
}

export interface IdentityPort {
  current(): Identity
  capabilities(scope?: Scope): CapabilitySet
  onChange(cb: () => void): () => void
}
