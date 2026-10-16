import type { HostKind } from './host.js'

/**
 * What this browser knows about a project imported from a repository: the branch and
 * commit its copy started from, and the open proposal. `tricc.yaml` says where the
 * project lives; this says where this particular copy came from, which changes with every
 * load and would only add noise to the project's history.
 */
export interface RepoState {
  branch: string
  baseCommit: string
  proposal?: {
    branch: string
    number: number
    url: string
    /** The branch it asks to merge into. */
    target: string
    /** What this app committed there, by path (null: deleted), so a later push can follow it. */
    pushed: Record<string, string | null>
  }
}

const stateKey = (projectId: string) => `tricc.repo.${projectId}`

export function loadRepoState(projectId: string): RepoState | undefined {
  try {
    const raw = localStorage.getItem(stateKey(projectId))
    return raw ? (JSON.parse(raw) as RepoState) : undefined
  } catch {
    return undefined
  }
}

export function saveRepoState(projectId: string, state: RepoState): void {
  try {
    localStorage.setItem(stateKey(projectId), JSON.stringify(state))
  } catch {
    // Without storage the copy cannot propose later; loading the branch again recovers.
  }
}

export function forgetRepoState(projectId: string): void {
  try {
    localStorage.removeItem(stateKey(projectId))
  } catch {
    // Nothing kept, nothing to forget.
  }
}

/**
 * Access tokens, by host origin. Always held for this tab. Kept across visits only when
 * the app runs on this computer: every `*.github.io` site of an organisation shares one
 * origin, so a token stored by the hosted copy could be read by any of them.
 */
const TOKENS_KEY = 'tricc.git-tokens'
const session = new Map<string, string>()

export function canRememberTokens(hostname: string = globalThis.location?.hostname ?? ''): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  )
}

function remembered(): Record<string, string> {
  if (!canRememberTokens()) return {}
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

export function tokenFor(origin: string): string | undefined {
  return session.get(origin) ?? remembered()[origin]
}

export function isTokenRemembered(origin: string): boolean {
  return origin in remembered()
}

export function setToken(origin: string, token: string | undefined, remember: boolean): void {
  const all = remembered()
  if (token) session.set(origin, token)
  else session.delete(origin)
  if (token && remember && canRememberTokens()) all[origin] = token
  else delete all[origin]
  if (!canRememberTokens()) return
  try {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(all))
  } catch {
    // Kept for this tab only.
  }
}

export function hostLabel(kind: HostKind): string {
  return kind === 'github' ? 'GitHub' : 'GitLab'
}
