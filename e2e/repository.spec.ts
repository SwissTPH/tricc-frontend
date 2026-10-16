import { createHash } from 'node:crypto'
import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * Import from GitHub / GitLab and propose changes back
 * (feature/20261015-git-host-import-and-pull-requests.md). The hosts are faked in memory
 * behind page.route, answering CORS the way the real APIs do, so the browser's own
 * cross-origin path is exercised.
 */

const TRICC_YAML = [
  'title: Demo guideline',
  'input_strategy: YamlStrategy',
  'output_strategies:',
  '- XLSFormCHTStrategy',
  'parameters:',
  '  languages:',
  '    default: en',
  '    available:',
  '    - en',
  'interventions:',
  '- id: screening',
  '  title: Screening',
  '  activity:',
  '  - activities/screening.activity.yaml',
  '  start:',
  '    on: demand',
  '',
].join('\n')
const SCREENING =
  'id: screening\ntitle: Screening\nnodes:\n  - id: s\n    type: activity_start\n    name: screening\n'

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, accept',
  'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
  'access-control-expose-headers': 'x-next-page',
}

function blobSha(bytes: Buffer): string {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
}

/** A git repository in memory: blobs, trees (path → blob), commits, branches. */
class FakeRepo {
  blobs = new Map<string, Buffer>()
  trees = new Map<string, Map<string, string>>()
  commits = new Map<string, { tree: string; parent?: string }>()
  branches = new Map<string, string>()
  requests: { method: string; path: string; auth?: string; body?: unknown }[] = []
  private n = 0

  constructor(files: Record<string, string>, branch = 'main') {
    this.branches.set(branch, this.commitFiles(files))
  }

  addBlob(bytes: Buffer): string {
    const sha = blobSha(bytes)
    this.blobs.set(sha, bytes)
    return sha
  }

  /** A new commit holding exactly these files, on top of `parent`. */
  commitFiles(files: Record<string, string>, parent?: string): string {
    const tree = new Map(parent ? this.trees.get(this.commits.get(parent)!.tree) : [])
    for (const [path, text] of Object.entries(files))
      tree.set(path, this.addBlob(Buffer.from(text)))
    return this.commitTree(tree, parent)
  }

  commitTree(tree: Map<string, string>, parent?: string): string {
    const treeId = `tree${++this.n}`
    this.trees.set(treeId, tree)
    const sha = `c${this.n}`.padEnd(40, '0')
    this.commits.set(sha, { tree: treeId, ...(parent ? { parent } : {}) })
    return sha
  }

  fileAt(branch: string, path: string): string | undefined {
    const tree = this.trees.get(this.commits.get(this.branches.get(branch)!)!.tree)!
    const blob = tree.get(path)
    return blob ? this.blobs.get(blob)!.toString() : undefined
  }

  record(route: Route): { method: string; url: URL; body: any } {
    const req = route.request()
    const url = new URL(req.url())
    const body = req.postData() ? JSON.parse(req.postData()!) : undefined
    const auth = req.headers()['authorization']
    this.requests.push({
      method: req.method(),
      path: url.pathname,
      ...(auth ? { auth } : {}),
      ...(body ? { body } : {}),
    })
    return { method: req.method(), url, body }
  }
}

async function json(
  route: Route,
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  await route.fulfill({
    status,
    headers: { ...CORS, ...headers, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** api.github.com for repository `o/r`. */
async function fakeGitHub(page: Page, repo: FakeRepo) {
  const pulls: { number: number; state: string; merged: boolean; head: string }[] = []
  await page.route('https://api.github.com/**', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    const { method, url, body } = repo.record(route)
    const p = url.pathname.replace('/repos/o/r', '')
    let m: RegExpExecArray | null
    if (method === 'GET' && p === '') return json(route, { default_branch: 'main' })
    if (method === 'GET' && p === '/branches')
      return json(
        route,
        [...repo.branches.keys()].map((name) => ({ name })),
      )
    if (method === 'GET' && (m = /^\/branches\/(.+)$/.exec(p))) {
      const sha = repo.branches.get(decodeURIComponent(m[1]!))
      return sha
        ? json(route, { commit: { sha } })
        : json(route, { message: 'Branch not found' }, 404)
    }
    if (method === 'GET' && (m = /^\/git\/trees\/(\w+)$/.exec(p))) {
      const tree = repo.trees.get(repo.commits.get(m[1]!)!.tree)!
      return json(route, {
        truncated: false,
        tree: [...tree].map(([path, sha]) => ({ path, type: 'blob', sha })),
      })
    }
    if (method === 'GET' && (m = /^\/git\/blobs\/(\w+)$/.exec(p))) {
      return json(route, { content: repo.blobs.get(m[1]!)!.toString('base64'), encoding: 'base64' })
    }
    if (method === 'GET' && (m = /^\/git\/commits\/(\w+)$/.exec(p)))
      return json(route, { tree: { sha: repo.commits.get(m[1]!)!.tree } })
    if (method === 'POST' && p === '/git/blobs')
      return json(route, { sha: repo.addBlob(Buffer.from(body.content, 'base64')) })
    if (method === 'POST' && p === '/git/trees') {
      const tree = new Map(repo.trees.get(body.base_tree)!)
      for (const e of body.tree) {
        if (e.sha === null) tree.delete(e.path)
        else tree.set(e.path, e.sha)
      }
      const id = `t${repo.trees.size + 1}`
      repo.trees.set(id, tree)
      return json(route, { sha: id })
    }
    if (method === 'POST' && p === '/git/commits') {
      const sha = `n${repo.commits.size + 1}`.padEnd(40, '0')
      repo.commits.set(sha, { tree: body.tree, parent: body.parents[0] })
      return json(route, { sha })
    }
    if (method === 'POST' && p === '/git/refs') {
      repo.branches.set(body.ref.replace('refs/heads/', ''), body.sha)
      return json(route, { ref: body.ref })
    }
    if (method === 'PATCH' && (m = /^\/git\/refs\/heads\/(.+)$/.exec(p))) {
      repo.branches.set(decodeURIComponent(m[1]!), body.sha)
      return json(route, {})
    }
    if (method === 'POST' && p === '/pulls') {
      const pr = { number: pulls.length + 1, state: 'open', merged: false, head: body.head }
      pulls.push(pr)
      return json(
        route,
        { number: pr.number, html_url: `https://github.com/o/r/pull/${pr.number}` },
        201,
      )
    }
    if (method === 'GET' && (m = /^\/pulls\/(\d+)$/.exec(p)))
      return json(route, pulls[Number(m[1]) - 1])
    return json(route, { message: 'Not Found' }, 404)
  })
  return { pulls }
}

const SOURCE = {
  'README.md': '# Guidelines\n',
  'projects/demo/README.md': 'Not part of the project.\n',
  'projects/demo/tricc.yaml': TRICC_YAML,
  'projects/demo/activities/screening.activity.yaml': SCREENING,
}

async function importDemo(page: Page) {
  await page.goto('/')
  await page.getByTestId('import-repo').click()
  await page.getByTestId('repo-url').fill('https://github.com/o/r/tree/main/projects/demo')
  await page.getByTestId('repo-token').fill('ghp_test')
  await page.getByTestId('repo-look').click()
  await expect(page.getByTestId('repo-found')).toContainText('o/r')
  await expect(page.getByTestId('repo-branch')).toHaveValue('main')
  await expect(page.getByTestId('repo-path')).toHaveValue('projects/demo')
  await page.getByTestId('repo-import').click()
  await expect(page.getByTestId('project-overview')).toBeVisible()
  await expect(page.getByTestId('repo-badge')).toHaveText('github.com/o/r · main')
}

async function addInteger(page: Page, name: string) {
  await page.getByTestId('nav-activity-screening').click()
  if ((await page.getByTestId('add-integer').count()) === 0)
    await page.getByTestId('tab-nodes').click()
  await page.getByTestId('add-integer').click()
  await page.getByTestId('field-name').fill(name)
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
    timeout: 10_000,
  })
}

test('imports a project folder from GitHub and proposes changes as one pull request', async ({
  page,
}) => {
  const repo = new FakeRepo(SOURCE)
  const base = repo.branches.get('main')!
  const { pulls } = await fakeGitHub(page, repo)
  await importDemo(page)
  await expect(page.getByRole('heading', { name: 'Demo guideline' })).toBeVisible()
  // Only the project folder's files were read: no README.
  const read = new Set(
    repo.requests.filter((r) => r.path.includes('/git/blobs/')).map((r) => r.path.split('/').pop()),
  )
  expect(read.size).toBe(2)
  expect(read.has(blobSha(Buffer.from(SOURCE['README.md'])))).toBe(false)
  expect(read.has(blobSha(Buffer.from(SOURCE['projects/demo/README.md'])))).toBe(false)

  await addInteger(page, 'age_years')
  await page.getByTestId('propose-changes').click()
  const files = page.getByTestId('propose-files')
  await expect(files.locator('li')).toHaveText([
    /^activities\/screening\.activity\.yaml.*changed$/,
    /^tricc\.yaml.*changed$/,
  ])
  await expect(page.getByTestId('propose-title')).toHaveValue('Update Screening')
  await page.getByTestId('propose-create').click()
  await expect(page.getByTestId('propose-link')).toHaveText('https://github.com/o/r/pull/1')

  // A new branch from main's head, holding the change in the project folder only.
  const branch = pulls[0]!.head
  expect(branch).toMatch(/^tricc\/[a-z0-9-]+-\d{8}-\d{4}$/)
  expect(repo.commits.get(repo.branches.get(branch)!)!.parent).toBe(base)
  expect(repo.fileAt(branch, 'projects/demo/activities/screening.activity.yaml')).toContain(
    'age_years',
  )
  expect(repo.fileAt(branch, 'projects/demo/tricc.yaml')).toContain(
    'repository:\n  host: github\n  url: https://github.com/o/r\n  branch: main\n  path: projects/demo',
  )
  expect(repo.fileAt(branch, 'README.md')).toBe('# Guidelines\n')
  expect(repo.fileAt(branch, 'projects/demo/README.md')).toBe('Not part of the project.\n')
  expect(repo.fileAt('main', 'projects/demo/activities/screening.activity.yaml')).toBe(SCREENING)
  for (const r of repo.requests.filter((r) => r.method !== 'GET'))
    expect(r.auth).toBe('Bearer ghp_test')
  await page.getByTestId('propose-dialog-close').click()

  // A second proposal goes onto the same pull request.
  await addInteger(page, 'weight_kg')
  await page.getByTestId('propose-changes').click()
  await expect(page.getByTestId('propose-update')).toBeVisible()
  await expect(page.getByTestId('propose-files').locator('li')).toHaveText([
    /^activities\/screening\.activity\.yaml/,
  ])
  await page.getByTestId('propose-create').click()
  await expect(page.getByTestId('propose-done')).toContainText('is updated')
  expect(pulls).toHaveLength(1)
  expect(repo.fileAt(branch, 'projects/demo/activities/screening.activity.yaml')).toContain(
    'weight_kg',
  )
})

test('reopening a copy asks between its changes and a branch', async ({ page }) => {
  const repo = new FakeRepo(SOURCE)
  repo.branches.set(
    'develop',
    repo.commitFiles(
      { 'projects/demo/tricc.yaml': TRICC_YAML.replace('Demo guideline', 'Demo, next version') },
      repo.branches.get('main')!,
    ),
  )
  await fakeGitHub(page, repo)
  await importDemo(page)
  await addInteger(page, 'age_years')

  await page.getByTestId('nav-home').first().click()
  await page.getByRole('button', { name: 'Demo guideline', exact: true }).click()
  const dialog = page.getByTestId('choose-copy')
  await expect(dialog).toBeVisible()
  await expect(page.getByTestId('choose-copy-pending')).toContainText('main does not have yet')
  await page.getByTestId('choose-copy-continue').click()
  await expect(page.getByTestId('project-overview')).toBeVisible()
  await expect(page.getByTestId('repo-badge')).toHaveText('github.com/o/r · main')

  // Load another branch: the copy is replaced by it.
  await page.getByTestId('repo-switch').click()
  await page.getByTestId('choose-copy-branch').selectOption('develop')
  await page.getByTestId('choose-copy-load').click()
  await expect(page.getByRole('heading', { name: 'Demo, next version' })).toBeVisible()
  await expect(page.getByTestId('repo-badge')).toHaveText('github.com/o/r · develop')

  // Nothing changed since: it opens without asking.
  await page.getByTestId('nav-home').first().click()
  await page.getByRole('button', { name: 'Demo guideline', exact: true }).click()
  await expect(page.getByTestId('project-overview')).toBeVisible()
  await expect(page.getByTestId('choose-copy')).toHaveCount(0)
})

test('a file someone else changed on the branch is a conflict, not overwritten', async ({
  page,
}) => {
  const repo = new FakeRepo(SOURCE)
  await fakeGitHub(page, repo)
  await importDemo(page)
  await addInteger(page, 'age_years')
  // Meanwhile, on main.
  repo.branches.set(
    'main',
    repo.commitFiles(
      {
        'projects/demo/activities/screening.activity.yaml': SCREENING.replace(
          'title: Screening',
          'title: Triage',
        ),
      },
      repo.branches.get('main')!,
    ),
  )
  await page.getByTestId('propose-changes').click()
  await expect(page.getByTestId('propose-conflicts')).toContainText(
    'activities/screening.activity.yaml',
  )
  await expect(page.getByTestId('propose-files').locator('li')).toHaveText([/^tricc\.yaml/])
  await page.getByTestId('propose-overwrite').check()
  await expect(page.getByTestId('propose-files').locator('li')).toHaveCount(2)
})

test('imports from a self-hosted GitLab after saying which host it is', async ({ page }) => {
  const repo = new FakeRepo({
    'tricc.yaml': TRICC_YAML,
    'activities/screening.activity.yaml': SCREENING,
  })
  const api = 'https://git.moh.example/api/v4/projects/health%2Fimci'
  await page.route('https://git.moh.example/api/v4/**', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    const { url } = repo.record(route)
    const p = url.href.slice(api.length).split('?')[0]!
    let m: RegExpExecArray | null
    if (p === '/repository/branches') return json(route, [{ name: 'main' }])
    if (p === '') return json(route, { default_branch: 'main' })
    if ((m = /^\/repository\/branches\/(.+)$/.exec(p)))
      return json(route, { commit: { id: repo.branches.get(m[1]!) } })
    if (p === '/repository/tree') {
      const tree = repo.trees.get(repo.commits.get(url.searchParams.get('ref')!)!.tree)!
      return json(
        route,
        [...tree].map(([path, id]) => ({ path, type: 'blob', id })),
        200,
        { 'x-next-page': '' },
      )
    }
    if ((m = /^\/repository\/blobs\/(\w+)\/raw$/.exec(p))) {
      return route.fulfill({ status: 200, headers: CORS, body: repo.blobs.get(m[1]!)! })
    }
    return json(route, { message: '404 Not Found' }, 404)
  })

  await page.goto('/')
  await page.getByTestId('import-repo').click()
  await page.getByTestId('repo-url').fill('https://git.moh.example/health/imci')
  await expect(page.getByTestId('repo-look')).toBeDisabled()
  await page.getByTestId('repo-kind').selectOption('gitlab')
  await page.getByTestId('repo-look').click()
  await expect(page.getByTestId('repo-path')).toHaveValue('')
  await page.getByTestId('repo-import').click()
  await expect(page.getByRole('heading', { name: 'Demo guideline' })).toBeVisible()
  await expect(page.getByTestId('repo-badge')).toHaveText('git.moh.example/health/imci · main')
})

test('a link to a folder without a project says so', async ({ page }) => {
  const repo = new FakeRepo({ 'README.md': '# Nothing here\n' })
  await fakeGitHub(page, repo)
  await page.goto('/')
  await page.getByTestId('import-repo').click()
  await page.getByTestId('repo-url').fill('github.com/o/r')
  await page.getByTestId('repo-look').click()
  await expect(page.getByTestId('repo-error')).toContainText('tricc.yaml is missing')
})
