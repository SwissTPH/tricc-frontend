import type { FileContent, ProjectRepository } from '@tricc/core'

/**
 * Git hosts the local app can import a project from and propose changes to. Reads and
 * writes go straight from the browser to the host's REST API; there is no server of ours in
 * between. See feature/20261015-git-host-import-and-pull-requests.md.
 */

export type HostKind = ProjectRepository['host']

export interface RepoLocation {
  host: HostKind
  /** `https://github.com`, `https://gitlab.example.org`. */
  origin: string
  /** `owner/name`, or `group/subgroup/name` on GitLab. */
  repo: string
  branch: string
  /** The project folder inside the repository, without slashes at either end; '' for the root. */
  path: string
}

/** Path (relative to the project folder) → git blob id. */
export type Tree = Map<string, string>

export interface FileChange {
  /** Relative to the project folder. */
  path: string
  kind: 'add' | 'change' | 'delete'
  content?: FileContent
}

export interface CommitRequest {
  /** The commit the new one goes on top of. */
  parent: string
  branch: string
  /** True: create `branch` at the new commit. False: move the existing branch forward. */
  createBranch: boolean
  message: string
  changes: FileChange[]
}

export interface ChangeRequest {
  /** Pull request number (GitHub) or merge request iid (GitLab). */
  number: number
  url: string
}

export type ChangeRequestState = 'open' | 'merged' | 'closed'

export interface GitHost {
  readonly kind: HostKind
  defaultBranch(loc: Omit<RepoLocation, 'branch'>): Promise<string>
  branches(loc: Omit<RepoLocation, 'branch'>): Promise<string[]>
  /** The commit a branch points at now. */
  head(loc: RepoLocation, branch?: string): Promise<string>
  /** The files under the project folder at a commit. */
  tree(loc: RepoLocation, commit: string): Promise<Tree>
  /** The contents of these blobs, keyed by their path. */
  read(
    loc: RepoLocation,
    files: { path: string; blob: string }[],
  ): Promise<Record<string, Uint8Array>>
  /** Commit the changes and point the branch at the result. Returns the new commit. */
  commit(loc: RepoLocation, req: CommitRequest): Promise<string>
  openRequest(
    loc: RepoLocation,
    req: { branch: string; target: string; title: string; body: string },
  ): Promise<ChangeRequest>
  requestState(loc: RepoLocation, number: number): Promise<ChangeRequestState>
  /** Where the author creates a token with the scopes this app needs. */
  tokenPage(origin: string): string
}

export class GitHostError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'GitHostError'
  }
}

/** The repository part of a link, before the branch and folder are known. */
export interface ParsedRepoUrl {
  /** Undefined when the address does not say (a self-hosted instance without `/-/`). */
  host?: HostKind
  origin: string
  repo: string
  /** What followed `tree/` or `blob/`: a branch, then a folder, not yet told apart. */
  rest: string[]
}

/**
 * Read a repository link as pasted from the browser or a clone dialog:
 * `https://github.com/o/r/tree/main/projects/x`, `https://gitlab.com/g/s/r/-/tree/dev/p`,
 * `git@gitlab.example.org:g/r.git`.
 */
export function parseRepoUrl(input: string): ParsedRepoUrl | undefined {
  let text = input.trim()
  if (!text) return undefined
  const ssh = /^git@([^:]+):(.+)$/.exec(text)
  if (ssh) text = `https://${ssh[1]}/${ssh[2]}`
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return undefined
  }
  const segs = url.pathname
    .split('/')
    .filter(Boolean)
    .map((s) => decodeURIComponent(s))
  if (segs.length > 0) segs[segs.length - 1] = segs[segs.length - 1]!.replace(/\.git$/, '')
  const origin = url.origin
  const hostname = url.hostname.toLowerCase()
  const dash = segs.indexOf('-')
  let host: HostKind | undefined =
    hostname === 'github.com' || hostname.startsWith('github.')
      ? 'github'
      : hostname.includes('gitlab') || dash >= 0
        ? 'gitlab'
        : undefined
  let repoSegs: string[]
  let rest: string[] = []
  if (dash >= 0) {
    repoSegs = segs.slice(0, dash)
    const after = segs.slice(dash + 1)
    if (after[0] === 'tree' || after[0] === 'blob') rest = after.slice(1)
  } else if (
    host === 'github' ||
    (host === undefined && (segs[2] === 'tree' || segs[2] === 'blob'))
  ) {
    host ??= 'github'
    repoSegs = segs.slice(0, 2)
    if (segs[2] === 'tree' || segs[2] === 'blob') rest = segs.slice(3)
  } else {
    repoSegs = segs
  }
  if (repoSegs.length < 2) return undefined
  const parsed: ParsedRepoUrl = { origin, repo: repoSegs.join('/'), rest }
  if (host) parsed.host = host
  return parsed
}

/**
 * Tell the branch from the folder in what followed `tree/`. A branch may contain `/`
 * (`feature/fever`), so the longest branch that matches wins.
 */
export function splitBranchAndPath(
  rest: string[],
  branches: string[],
): { branch?: string; path: string } {
  if (rest.length === 0) return { path: '' }
  const joined = rest.join('/')
  const match = branches
    .filter((b) => joined === b || joined.startsWith(`${b}/`))
    .sort((a, b) => b.length - a.length)[0]
  if (match) return { branch: match, path: trimPath(joined.slice(match.length)) }
  return { branch: rest[0]!, path: trimPath(rest.slice(1).join('/')) }
}

export function trimPath(path: string): string {
  return path.replace(/^\/+|\/+$/g, '')
}

/** The repository's web address, as `tricc.yaml` records it. */
export function repoWebUrl(loc: Pick<RepoLocation, 'origin' | 'repo'>): string {
  return `${loc.origin}/${loc.repo}`
}

export function locationOf(
  repo: ProjectRepository,
  branch: string = repo.branch,
): RepoLocation | undefined {
  const parsed = parseRepoUrl(repo.url)
  if (!parsed) return undefined
  return {
    host: repo.host,
    origin: parsed.origin,
    repo: parsed.repo,
    branch,
    path: repo.path ?? '',
  }
}

export function repositoryOf(loc: RepoLocation): ProjectRepository {
  const repo: ProjectRepository = { host: loc.host, url: repoWebUrl(loc), branch: loc.branch }
  if (loc.path) repo.path = loc.path
  return repo
}

/** `path` inside the project folder → path inside the repository. */
export function repoPath(loc: Pick<RepoLocation, 'path'>, path: string): string {
  return loc.path ? `${loc.path}/${path}` : path
}

/** Run `fn` over `items`, at most `limit` at a time. Hosts throttle bursts of requests. */
export async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i]!)
    }
  })
  await Promise.all(workers)
  return out
}

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export function fromBase64(text: string): Uint8Array {
  const binary = atob(text.replace(/\s+/g, ''))
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

export function bytesOf(content: FileContent): Uint8Array {
  return typeof content === 'string' ? new TextEncoder().encode(content) : content
}

/** JSON request helper shared by the hosts: one place for headers and error messages. */
export async function requestJson<T>(
  fetchFn: typeof fetch,
  url: string,
  init: { method?: string; headers: Record<string, string>; body?: unknown; raw?: boolean },
): Promise<{ data: T; headers: Headers }> {
  let res: Response
  try {
    res = await fetchFn(url, {
      method: init.method ?? 'GET',
      headers:
        init.body !== undefined
          ? { ...init.headers, 'Content-Type': 'application/json' }
          : init.headers,
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    })
  } catch {
    throw new GitHostError(
      `Could not reach ${new URL(url).host}. Check the connection; a self-hosted GitLab must also allow requests from this page (CORS).`,
    )
  }
  if (!res.ok) throw await errorOf(res)
  const data = init.raw
    ? (new Uint8Array(await res.arrayBuffer()) as unknown as T)
    : ((await res.json()) as T)
  return { data, headers: res.headers }
}

async function errorOf(res: Response): Promise<GitHostError> {
  let detail = ''
  try {
    const body = (await res.json()) as { message?: unknown; error?: unknown }
    const m = body.message ?? body.error
    detail = typeof m === 'string' ? m : m ? JSON.stringify(m) : ''
  } catch {
    // No JSON body: the status says enough.
  }
  const host = new URL(res.url || 'https://host').host
  if (res.status === 401)
    return new GitHostError(`${host} refused the access token. Check it, or create a new one.`, 401)
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
    return new GitHostError(
      `${host} limits reads without a token. Add an access token and try again.`,
      403,
    )
  }
  if (res.status === 403) {
    return new GitHostError(
      `${host} does not allow this with the current token${detail ? `: ${detail}` : ''}.`,
      403,
    )
  }
  if (res.status === 404) {
    return new GitHostError(
      `Not found on ${host}. For a private repository, add an access token that can read it.`,
      404,
    )
  }
  return new GitHostError(
    `${host} answered ${res.status}${detail ? `: ${detail}` : ''}.`,
    res.status,
  )
}
