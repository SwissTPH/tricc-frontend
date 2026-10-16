import { describe, expect, it } from 'vitest'
import {
  blobId,
  blobsOf,
  editsSince,
  isImportablePath,
  planOnto,
  withConflicts,
} from './changes.js'
import { GitHubHost } from './github.js'
import { canRememberTokens } from './links.js'
import { GitLabHost } from './gitlab.js'
import {
  fromBase64,
  locationOf,
  parseRepoUrl,
  splitBranchAndPath,
  toBase64,
  type RepoLocation,
} from './host.js'

describe('repository links', () => {
  it('reads GitHub links with a branch and a folder', () => {
    expect(parseRepoUrl('https://github.com/SwissTPH/almanach/tree/main/projects/global')).toEqual({
      host: 'github',
      origin: 'https://github.com',
      repo: 'SwissTPH/almanach',
      rest: ['main', 'projects', 'global'],
    })
    expect(parseRepoUrl('github.com/SwissTPH/almanach.git')).toMatchObject({
      repo: 'SwissTPH/almanach',
      rest: [],
    })
    expect(parseRepoUrl('git@github.com:SwissTPH/almanach.git')).toMatchObject({
      host: 'github',
      repo: 'SwissTPH/almanach',
    })
  })

  it('reads GitLab links, nested groups and self-hosted instances', () => {
    expect(parseRepoUrl('https://gitlab.com/moh/imci/guideline/-/tree/develop/projects/x')).toEqual(
      {
        host: 'gitlab',
        origin: 'https://gitlab.com',
        repo: 'moh/imci/guideline',
        rest: ['develop', 'projects', 'x'],
      },
    )
    expect(parseRepoUrl('https://git.moh.example/health/imci/-/tree/main')).toMatchObject({
      host: 'gitlab',
      origin: 'https://git.moh.example',
      repo: 'health/imci',
    })
    // A self-hosted address that does not say which host it is.
    expect(parseRepoUrl('https://git.moh.example/health/imci')).toEqual({
      origin: 'https://git.moh.example',
      repo: 'health/imci',
      rest: [],
    })
    expect(parseRepoUrl('not a url at all')).toBeUndefined()
    expect(parseRepoUrl('https://github.com/only-owner')).toBeUndefined()
  })

  it('tells a branch with slashes from the folder', () => {
    const branches = ['main', 'feature', 'feature/fever']
    expect(splitBranchAndPath(['feature', 'fever', 'projects', 'x'], branches)).toEqual({
      branch: 'feature/fever',
      path: 'projects/x',
    })
    expect(splitBranchAndPath(['main'], branches)).toEqual({ branch: 'main', path: '' })
    expect(splitBranchAndPath(['unknown', 'p'], branches)).toEqual({ branch: 'unknown', path: 'p' })
    expect(splitBranchAndPath([], branches)).toEqual({ path: '' })
  })

  it('turns the tricc.yaml entry back into a location', () => {
    expect(
      locationOf(
        { host: 'gitlab', url: 'https://gitlab.com/g/s/r', branch: 'main', path: 'p' },
        'dev',
      ),
    ).toEqual({
      host: 'gitlab',
      origin: 'https://gitlab.com',
      repo: 'g/s/r',
      branch: 'dev',
      path: 'p',
    })
  })
})

describe('tokens', () => {
  it('are remembered only when the app runs on this computer', () => {
    expect(canRememberTokens('localhost')).toBe(true)
    expect(canRememberTokens('127.0.0.1')).toBe(true)
    // Every *.github.io site of an organisation shares this origin.
    expect(canRememberTokens('swisstph.github.io')).toBe(false)
  })
})

describe('changes', () => {
  it('computes the blob id git does', async () => {
    // `printf 'hello\n' | git hash-object --stdin`
    expect(await blobId('hello\n')).toBe('ce013625030ba8dba906f756967f9e9ca394464a')
    expect(await blobId(new Uint8Array([104, 101, 108, 108, 111, 10]))).toBe(
      'ce013625030ba8dba906f756967f9e9ca394464a',
    )
  })

  it('reads project files and leaves build output and tooling', () => {
    expect(isImportablePath('tricc.yaml')).toBe(true)
    expect(isImportablePath('activities/a.activity.yaml')).toBe(true)
    expect(isImportablePath('media/logo.png')).toBe(true)
    expect(isImportablePath('common/fever.drawio')).toBe(true)
    expect(isImportablePath('README.md')).toBe(false)
    expect(isImportablePath('build/XLSFormStrategy/x.json')).toBe(false)
    expect(isImportablePath('.github/workflows/ci.yml')).toBe(false)
  })

  it('lists the author’s edits; deletes only in folders the project owns', async () => {
    const base = await blobsOf({
      'tricc.yaml': 't',
      'activities/a.activity.yaml': 'a',
      'activities/gone.activity.yaml': 'g',
      'source.drawio': 'd',
    })
    const local = await blobsOf({
      'tricc.yaml': 't',
      'activities/a.activity.yaml': 'a2',
      'activities/new.activity.yaml': 'n',
    })
    expect(
      editsSince(local, base).map((e) => [e.path, e.blob === undefined ? 'deleted' : 'kept']),
    ).toEqual([
      ['activities/a.activity.yaml', 'kept'],
      ['activities/gone.activity.yaml', 'deleted'],
      ['activities/new.activity.yaml', 'kept'],
    ])
  })

  it('applies edits file by file and never overwrites someone else’s change', async () => {
    const base = await blobsOf({
      'a.yaml': 'a',
      'b.yaml': 'b',
      'c.yaml': 'c',
      'activities/d.yaml': 'd',
    })
    const local = await blobsOf({ 'a.yaml': 'a2', 'b.yaml': 'b2', 'c.yaml': 'c2', 'e.yaml': 'e' })
    // On the branch since: a untouched, b changed by someone else, c already merged, d deleted.
    const target = await blobsOf({ 'a.yaml': 'a', 'b.yaml': 'b-theirs', 'c.yaml': 'c2' })
    const edits = editsSince(local, base)
    const plan = planOnto(edits, base, target)
    expect(plan.apply.map((c) => [c.path, c.kind])).toEqual([
      ['a.yaml', 'change'],
      ['e.yaml', 'add'],
    ])
    expect(plan.same).toEqual(['activities/d.yaml', 'c.yaml'])
    expect(plan.conflicts).toEqual(['b.yaml'])
    expect(withConflicts(plan, target, edits).map((c) => [c.path, c.kind])).toEqual([
      ['a.yaml', 'change'],
      ['b.yaml', 'change'],
      ['e.yaml', 'add'],
    ])
  })

  it('follows its own earlier push on an open proposal', async () => {
    const base = await blobsOf({ 'a.yaml': 'a' })
    const first = await blobId('a2')
    const target = new Map([['a.yaml', first]])
    const local = await blobsOf({ 'a.yaml': 'a3' })
    const edits = editsSince(local, base)
    expect(planOnto(edits, base, target).conflicts).toEqual(['a.yaml'])
    expect(planOnto(edits, base, target, { 'a.yaml': first }).apply.map((c) => c.kind)).toEqual([
      'change',
    ])
  })

  it('round-trips base64', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255])
    expect(fromBase64(toBase64(bytes))).toEqual(bytes)
  })
})

/** A fetch that answers from a table of `METHOD url` → JSON, and records what it was sent. */
function fakeFetch(
  routes: Record<string, unknown>,
  headers: Record<string, Record<string, string>> = {},
) {
  const calls: { method: string; url: string; body?: unknown; auth?: string }[] = []
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const h = (init?.headers ?? {}) as Record<string, string>
    calls.push({
      method,
      url,
      ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
      ...(h['Authorization'] ? { auth: h['Authorization'] } : {}),
    })
    const key = `${method} ${url}`
    if (!(key in routes))
      return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 })
    const value = routes[key]
    const body =
      value instanceof Uint8Array ? (value.slice().buffer as ArrayBuffer) : JSON.stringify(value)
    return new Response(body, { status: 200, headers: headers[key] ?? {} })
  }) as typeof fetch
  return { fn, calls }
}

const GH: RepoLocation = {
  host: 'github',
  origin: 'https://github.com',
  repo: 'o/r',
  branch: 'main',
  path: 'p',
}
const API = 'https://api.github.com/repos/o/r'

describe('GitHub', () => {
  it('lists the project folder and reads its files', async () => {
    const { fn, calls } = fakeFetch({
      [`GET ${API}/branches/main`]: { commit: { sha: 'c1' } },
      [`GET ${API}/git/trees/c1?recursive=1`]: {
        truncated: false,
        tree: [
          { path: 'p/tricc.yaml', type: 'blob', sha: 'b1' },
          { path: 'p/activities', type: 'tree', sha: 't' },
          { path: 'other/x.yaml', type: 'blob', sha: 'b2' },
        ],
      },
      [`GET ${API}/git/blobs/b1`]: {
        content: toBase64(new TextEncoder().encode('title: X\n')),
        encoding: 'base64',
      },
    })
    const host = new GitHubHost('tok', fn)
    expect(await host.head(GH)).toBe('c1')
    const tree = await host.tree(GH, 'c1')
    expect([...tree]).toEqual([['tricc.yaml', 'b1']])
    const files = await host.read(GH, [{ path: 'tricc.yaml', blob: 'b1' }])
    expect(new TextDecoder().decode(files['tricc.yaml'])).toBe('title: X\n')
    expect(calls.every((c) => c.auth === 'Bearer tok')).toBe(true)
  })

  it('commits on a new branch and opens a pull request', async () => {
    const { fn, calls } = fakeFetch({
      [`GET ${API}/git/commits/c1`]: { tree: { sha: 'tree1' } },
      [`POST ${API}/git/blobs`]: { sha: 'blobN' },
      [`POST ${API}/git/trees`]: { sha: 'tree2' },
      [`POST ${API}/git/commits`]: { sha: 'c2' },
      [`POST ${API}/git/refs`]: { ref: 'refs/heads/tricc/x' },
      [`POST ${API}/pulls`]: { number: 7, html_url: 'https://github.com/o/r/pull/7' },
    })
    const host = new GitHubHost('tok', fn)
    const sha = await host.commit(GH, {
      parent: 'c1',
      branch: 'tricc/x',
      createBranch: true,
      message: 'Update',
      changes: [
        { path: 'activities/a.activity.yaml', kind: 'change', content: 'id: a\n' },
        { path: 'activities/old.activity.yaml', kind: 'delete' },
      ],
    })
    expect(sha).toBe('c2')
    const tree = calls.find((c) => c.url.endsWith('/git/trees'))!.body as {
      base_tree: string
      tree: unknown[]
    }
    expect(tree.base_tree).toBe('tree1')
    expect(tree.tree).toEqual([
      { path: 'p/activities/a.activity.yaml', mode: '100644', type: 'blob', sha: 'blobN' },
      { path: 'p/activities/old.activity.yaml', mode: '100644', type: 'blob', sha: null },
    ])
    expect(calls.find((c) => c.url.endsWith('/git/refs'))!.body).toEqual({
      ref: 'refs/heads/tricc/x',
      sha: 'c2',
    })
    const pr = await host.openRequest(GH, {
      branch: 'tricc/x',
      target: 'main',
      title: 'T',
      body: 'B',
    })
    expect(pr).toEqual({ number: 7, url: 'https://github.com/o/r/pull/7' })
  })

  it('moves an existing proposal branch forward instead of creating it', async () => {
    const { fn, calls } = fakeFetch({
      [`GET ${API}/git/commits/c5`]: { tree: { sha: 't5' } },
      [`POST ${API}/git/trees`]: { sha: 't6' },
      [`POST ${API}/git/commits`]: { sha: 'c6' },
      [`PATCH ${API}/git/refs/heads/tricc/x`]: {},
    })
    await new GitHubHost('tok', fn).commit(GH, {
      parent: 'c5',
      branch: 'tricc/x',
      createBranch: false,
      message: 'More',
      changes: [{ path: 'a.yaml', kind: 'delete' }],
    })
    expect(calls.at(-1)).toMatchObject({ method: 'PATCH', body: { sha: 'c6', force: false } })
  })

  it('explains a missing private repository', async () => {
    const { fn } = fakeFetch({})
    await expect(new GitHubHost(undefined, fn).head(GH)).rejects.toThrow(
      /private repository, add an access token/,
    )
  })
})

const GL: RepoLocation = {
  host: 'gitlab',
  origin: 'https://gitlab.example.org',
  repo: 'g/s/r',
  branch: 'main',
  path: '',
}
const GLAPI = 'https://gitlab.example.org/api/v4/projects/g%2Fs%2Fr'

describe('GitLab', () => {
  it('pages through the tree and reads raw blobs', async () => {
    const { fn } = fakeFetch(
      {
        [`GET ${GLAPI}/repository/tree?ref=c1&recursive=true&per_page=100&page=1`]: [
          { path: 'tricc.yaml', type: 'blob', id: 'b1' },
        ],
        [`GET ${GLAPI}/repository/tree?ref=c1&recursive=true&per_page=100&page=2`]: [
          { path: 'activities', type: 'tree', id: 't' },
          { path: 'activities/a.activity.yaml', type: 'blob', id: 'b2' },
        ],
        [`GET ${GLAPI}/repository/blobs/b1/raw`]: new TextEncoder().encode('title: X\n'),
      },
      {
        [`GET ${GLAPI}/repository/tree?ref=c1&recursive=true&per_page=100&page=1`]: {
          'x-next-page': '2',
        },
      },
    )
    const host = new GitLabHost('tok', fn)
    expect([...(await host.tree(GL, 'c1'))]).toEqual([
      ['tricc.yaml', 'b1'],
      ['activities/a.activity.yaml', 'b2'],
    ])
    const files = await host.read(GL, [{ path: 'tricc.yaml', blob: 'b1' }])
    expect(new TextDecoder().decode(files['tricc.yaml'])).toBe('title: X\n')
  })

  it('commits in one call and opens a merge request', async () => {
    const { fn, calls } = fakeFetch({
      [`POST ${GLAPI}/repository/commits`]: { id: 'c2' },
      [`POST ${GLAPI}/merge_requests`]: {
        iid: 3,
        web_url: 'https://gitlab.example.org/g/s/r/-/merge_requests/3',
      },
      [`GET ${GLAPI}/merge_requests/3`]: { state: 'merged' },
    })
    const host = new GitLabHost('tok', fn)
    await host.commit(GL, {
      parent: 'c1',
      branch: 'tricc/x',
      createBranch: true,
      message: 'Update',
      changes: [
        { path: 'activities/a.activity.yaml', kind: 'add', content: 'id: a\n' },
        { path: 'activities/b.activity.yaml', kind: 'delete' },
      ],
    })
    expect(calls[0]!.body).toEqual({
      branch: 'tricc/x',
      commit_message: 'Update',
      start_sha: 'c1',
      actions: [
        {
          action: 'create',
          file_path: 'activities/a.activity.yaml',
          content: toBase64(new TextEncoder().encode('id: a\n')),
          encoding: 'base64',
        },
        { action: 'delete', file_path: 'activities/b.activity.yaml' },
      ],
    })
    expect(
      await host.openRequest(GL, { branch: 'tricc/x', target: 'main', title: 'T', body: 'B' }),
    ).toEqual({
      number: 3,
      url: 'https://gitlab.example.org/g/s/r/-/merge_requests/3',
    })
    expect(await host.requestState(GL, 3)).toBe('merged')
  })
})
