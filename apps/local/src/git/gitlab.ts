import {
  bytesOf,
  pool,
  repoPath,
  requestJson,
  toBase64,
  type ChangeRequest,
  type ChangeRequestState,
  type CommitRequest,
  type GitHost,
  type RepoLocation,
  type Tree,
} from './host.js'

type Loc = Omit<RepoLocation, 'branch'>

/** GitLab REST v4: gitlab.com or a self-hosted instance. */
export class GitLabHost implements GitHost {
  readonly kind = 'gitlab' as const

  constructor(
    private readonly token: string | undefined,
    private readonly fetchFn: typeof fetch = (...a) => fetch(...a),
  ) {}

  private api(loc: Loc, path: string): string {
    return `${loc.origin}/api/v4/projects/${encodeURIComponent(loc.repo)}${path}`
  }

  private async call<T>(
    url: string,
    method = 'GET',
    body?: unknown,
    raw = false,
  ): Promise<{ data: T; headers: Headers }> {
    const headers: Record<string, string> = {}
    // A personal access token works as a bearer token on every GitLab API route.
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`
    return requestJson<T>(this.fetchFn, url, { method, headers, body, raw })
  }

  async defaultBranch(loc: Loc): Promise<string> {
    const { data } = await this.call<{ default_branch: string }>(this.api(loc, ''))
    return data.default_branch
  }

  async branches(loc: Loc): Promise<string[]> {
    const out: string[] = []
    for (let page = 1; page <= 10; page++) {
      const { data } = await this.call<{ name: string }[]>(
        this.api(loc, `/repository/branches?per_page=100&page=${page}`),
      )
      out.push(...data.map((b) => b.name))
      if (data.length < 100) break
    }
    return out
  }

  async head(loc: RepoLocation, branch = loc.branch): Promise<string> {
    const { data } = await this.call<{ commit: { id: string } }>(
      this.api(loc, `/repository/branches/${encodeURIComponent(branch)}`),
    )
    return data.commit.id
  }

  async tree(loc: RepoLocation, commit: string): Promise<Tree> {
    const prefix = loc.path ? `${loc.path}/` : ''
    const tree: Tree = new Map()
    let page = '1'
    while (page) {
      const query = new URLSearchParams({ ref: commit, recursive: 'true', per_page: '100', page })
      if (loc.path) query.set('path', loc.path)
      const { data, headers } = await this.call<{ path: string; type: string; id: string }[]>(
        this.api(loc, `/repository/tree?${query}`),
      )
      for (const e of data) {
        if (e.type === 'blob' && e.path.startsWith(prefix))
          tree.set(e.path.slice(prefix.length), e.id)
      }
      page = headers.get('x-next-page') ?? ''
    }
    return tree
  }

  async read(
    loc: RepoLocation,
    files: { path: string; blob: string }[],
  ): Promise<Record<string, Uint8Array>> {
    const out: Record<string, Uint8Array> = {}
    await pool(files, 6, async (f) => {
      const { data } = await this.call<Uint8Array>(
        this.api(loc, `/repository/blobs/${f.blob}/raw`),
        'GET',
        undefined,
        true,
      )
      out[f.path] = data
    })
    return out
  }

  async commit(loc: RepoLocation, req: CommitRequest): Promise<string> {
    const actions = req.changes.map((c) => {
      const file_path = repoPath(loc, c.path)
      if (c.kind === 'delete') return { action: 'delete', file_path }
      return {
        action: c.kind === 'add' ? 'create' : 'update',
        file_path,
        content: toBase64(bytesOf(c.content ?? '')),
        encoding: 'base64',
      }
    })
    const { data } = await this.call<{ id: string }>(this.api(loc, '/repository/commits'), 'POST', {
      branch: req.branch,
      commit_message: req.message,
      actions,
      ...(req.createBranch ? { start_sha: req.parent } : {}),
    })
    return data.id
  }

  async openRequest(
    loc: RepoLocation,
    req: { branch: string; target: string; title: string; body: string },
  ): Promise<ChangeRequest> {
    const { data } = await this.call<{ iid: number; web_url: string }>(
      this.api(loc, '/merge_requests'),
      'POST',
      {
        source_branch: req.branch,
        target_branch: req.target,
        title: req.title,
        description: req.body,
      },
    )
    return { number: data.iid, url: data.web_url }
  }

  async requestState(loc: RepoLocation, number: number): Promise<ChangeRequestState> {
    const { data } = await this.call<{ state: string }>(this.api(loc, `/merge_requests/${number}`))
    return data.state === 'merged' ? 'merged' : data.state === 'opened' ? 'open' : 'closed'
  }

  tokenPage(origin: string): string {
    return `${origin}/-/user_settings/personal_access_tokens?name=TRICC%20Authoring&scopes=api`
  }
}
