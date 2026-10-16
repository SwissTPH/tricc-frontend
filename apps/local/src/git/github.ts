import {
  bytesOf,
  fromBase64,
  pool,
  repoPath,
  requestJson,
  toBase64,
  GitHostError,
  type ChangeRequest,
  type ChangeRequestState,
  type CommitRequest,
  type GitHost,
  type RepoLocation,
  type Tree,
} from './host.js'

type Loc = Omit<RepoLocation, 'branch'>

/** GitHub REST v3: github.com, or GitHub Enterprise at `<origin>/api/v3`. */
export class GitHubHost implements GitHost {
  readonly kind = 'github' as const

  constructor(
    private readonly token: string | undefined,
    private readonly fetchFn: typeof fetch = (...a) => fetch(...a),
  ) {}

  private api(loc: Loc, path: string): string {
    const base =
      loc.origin === 'https://github.com' ? 'https://api.github.com' : `${loc.origin}/api/v3`
    return `${base}/repos/${loc.repo}${path}`
  }

  private async call<T>(
    url: string,
    method = 'GET',
    body?: unknown,
  ): Promise<{ data: T; headers: Headers }> {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`
    return requestJson<T>(this.fetchFn, url, { method, headers, body })
  }

  async defaultBranch(loc: Loc): Promise<string> {
    const { data } = await this.call<{ default_branch: string }>(this.api(loc, ''))
    return data.default_branch
  }

  async branches(loc: Loc): Promise<string[]> {
    const out: string[] = []
    for (let page = 1; page <= 10; page++) {
      const { data } = await this.call<{ name: string }[]>(
        this.api(loc, `/branches?per_page=100&page=${page}`),
      )
      out.push(...data.map((b) => b.name))
      if (data.length < 100) break
    }
    return out
  }

  async head(loc: RepoLocation, branch = loc.branch): Promise<string> {
    const { data } = await this.call<{ commit: { sha: string } }>(
      this.api(loc, `/branches/${encodeURIComponent(branch)}`),
    )
    return data.commit.sha
  }

  async tree(loc: RepoLocation, commit: string): Promise<Tree> {
    const { data } = await this.call<{
      truncated: boolean
      tree: { path: string; type: string; sha: string }[]
    }>(this.api(loc, `/git/trees/${commit}?recursive=1`))
    if (data.truncated) {
      throw new GitHostError(
        'This repository is too large to list in one go. Import a smaller repository.',
      )
    }
    const prefix = loc.path ? `${loc.path}/` : ''
    const tree: Tree = new Map()
    for (const e of data.tree) {
      if (e.type === 'blob' && e.path.startsWith(prefix))
        tree.set(e.path.slice(prefix.length), e.sha)
    }
    return tree
  }

  async read(
    loc: RepoLocation,
    files: { path: string; blob: string }[],
  ): Promise<Record<string, Uint8Array>> {
    const out: Record<string, Uint8Array> = {}
    await pool(files, 6, async (f) => {
      const { data } = await this.call<{ content: string; encoding: string }>(
        this.api(loc, `/git/blobs/${f.blob}`),
      )
      out[f.path] =
        data.encoding === 'base64'
          ? fromBase64(data.content)
          : new TextEncoder().encode(data.content)
    })
    return out
  }

  async commit(loc: RepoLocation, req: CommitRequest): Promise<string> {
    const { data: parent } = await this.call<{ tree: { sha: string } }>(
      this.api(loc, `/git/commits/${req.parent}`),
    )
    const entries = await pool(req.changes, 6, async (c) => {
      const path = repoPath(loc, c.path)
      if (c.kind === 'delete') return { path, mode: '100644', type: 'blob', sha: null }
      const { data } = await this.call<{ sha: string }>(this.api(loc, '/git/blobs'), 'POST', {
        content: toBase64(bytesOf(c.content ?? '')),
        encoding: 'base64',
      })
      return { path, mode: '100644', type: 'blob', sha: data.sha }
    })
    const { data: tree } = await this.call<{ sha: string }>(this.api(loc, '/git/trees'), 'POST', {
      base_tree: parent.tree.sha,
      tree: entries,
    })
    const { data: commit } = await this.call<{ sha: string }>(
      this.api(loc, '/git/commits'),
      'POST',
      {
        message: req.message,
        tree: tree.sha,
        parents: [req.parent],
      },
    )
    if (req.createBranch) {
      await this.call(this.api(loc, '/git/refs'), 'POST', {
        ref: `refs/heads/${req.branch}`,
        sha: commit.sha,
      })
    } else {
      await this.call(this.api(loc, `/git/refs/heads/${req.branch}`), 'PATCH', {
        sha: commit.sha,
        force: false,
      })
    }
    return commit.sha
  }

  async openRequest(
    loc: RepoLocation,
    req: { branch: string; target: string; title: string; body: string },
  ): Promise<ChangeRequest> {
    const { data } = await this.call<{ number: number; html_url: string }>(
      this.api(loc, '/pulls'),
      'POST',
      {
        title: req.title,
        body: req.body,
        head: req.branch,
        base: req.target,
      },
    )
    return { number: data.number, url: data.html_url }
  }

  async requestState(loc: RepoLocation, number: number): Promise<ChangeRequestState> {
    const { data } = await this.call<{ state: string; merged: boolean }>(
      this.api(loc, `/pulls/${number}`),
    )
    return data.merged ? 'merged' : data.state === 'open' ? 'open' : 'closed'
  }

  tokenPage(origin: string): string {
    return `${origin}/settings/personal-access-tokens/new`
  }
}
