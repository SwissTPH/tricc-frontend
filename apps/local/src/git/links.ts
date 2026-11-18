import type { ProjectRepository } from '@tricc/core'
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
  /**
   * Where the copy came from, as `tricc.yaml` records it. Kept here as well because this
   * outlives the files: a browser that deletes a project's storage under disk pressure
   * leaves localStorage behind, and this is then all that says where to load it from.
   * Absent in entries saved before it was added.
   */
  repository?: ProjectRepository
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

const STATE_PREFIX = 'tricc.repo.'
const stateKey = (projectId: string) => `${STATE_PREFIX}${projectId}`

/** Every project this browser holds repository state for, whether or not it still has it. */
export function listRepoStates(): { projectId: string; state: RepoState }[] {
  const out: { projectId: string; state: RepoState }[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(STATE_PREFIX)) continue
      const state = loadRepoState(key.slice(STATE_PREFIX.length))
      if (state && typeof state.branch === 'string') {
        out.push({ projectId: key.slice(STATE_PREFIX.length), state })
      }
    }
  } catch {
    // No storage: nothing to list.
  }
  return out
}

/**
 * The repository a copy came from, and the branch its work is on: the proposal's branch
 * when there is one, since that is where it was pushed. Entries from before `repository`
 * was kept fall back on the proposal's address, which names the repository but not the
 * folder.
 */
export function sourceOf(
  state: RepoState,
): { host: HostKind; url: string; branch: string; path?: string } | undefined {
  const branch = state.proposal?.branch ?? state.branch
  if (state.repository) {
    const { host, url, path } = state.repository
    return path ? { host, url, branch, path } : { host, url, branch }
  }
  const request = state.proposal?.url
  const gitlab = request ? /^(.+)\/-\/merge_requests\/\d+\/?$/.exec(request) : null
  if (gitlab) return { host: 'gitlab', url: gitlab[1]!, branch }
  const github = request ? /^(.+)\/pull\/\d+\/?$/.exec(request) : null
  if (github) return { host: 'github', url: github[1]!, branch }
  return undefined
}

/** A link to a source's folder on its branch, as the import dialog reads one. */
export function treeLink(source: {
  host: HostKind
  url: string
  branch: string
  path?: string
}): string {
  const tree = source.host === 'gitlab' ? '/-/tree/' : '/tree/'
  return `${source.url}${tree}${source.branch}${source.path ? `/${source.path}` : ''}`
}

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
