import { useEffect, useMemo, useState } from 'react'
import {
  fileText,
  repositoryOfTriccYaml,
  setTriccYamlRepository,
  writeProject,
  type OpenProject,
  type ProjectFiles,
  type ProjectRef,
  type ProjectRepository,
} from '@tricc/core'
import { Button, Dialog } from '@tricc/editor'
import type { LocalRuntime } from '../adapters.js'
import {
  asProjectFiles,
  blobsOf,
  canRememberTokens,
  editsSince,
  forgetRepoState,
  hostFor,
  hostLabel,
  isImportablePath,
  isTokenRemembered,
  loadRepoState,
  locationOf,
  parseRepoUrl,
  planOnto,
  repositoryOf,
  saveRepoState,
  setToken,
  splitBranchAndPath,
  tokenFor,
  withConflicts,
  type Edit,
  type HostKind,
  type Plan,
  type RepoLocation,
  type RepoState,
  type Tree,
} from './index.js'

/* ------------------------------------------------------------------ shared pieces */

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** The access token for one host: kept for this tab, or on this computer when allowed. */
function TokenField({
  kind,
  origin,
  onChange,
}: {
  kind: HostKind
  origin: string
  onChange?: () => void
}) {
  const [token, setTokenText] = useState(tokenFor(origin) ?? '')
  const [remember, setRemember] = useState(isTokenRemembered(origin))
  const page = hostFor(kind, origin).tokenPage(origin)
  const store = (t: string, r: boolean) => {
    setToken(origin, t.trim() || undefined, r)
    onChange?.()
  }
  return (
    <div className="tricc-repo__token">
      <label htmlFor="repo-token">
        Access token for {new URL(origin).host}
        <input
          id="repo-token"
          type="password"
          autoComplete="off"
          data-testid="repo-token"
          value={token}
          placeholder="Needed for private repositories and to propose changes"
          onChange={(e) => {
            setTokenText(e.target.value)
            store(e.target.value, remember)
          }}
        />
      </label>
      <p className="tricc-repo__hint">
        <a href={page} target="_blank" rel="noreferrer">
          Create a token
        </a>{' '}
        {kind === 'github'
          ? 'with Contents and Pull requests set to read and write, on this repository.'
          : 'with the api scope (read_repository is enough to import).'}
      </p>
      {canRememberTokens() ? (
        <label className="tricc-repo__check">
          <input
            type="checkbox"
            data-testid="repo-token-remember"
            checked={remember}
            onChange={(e) => {
              setRemember(e.target.checked)
              store(token, e.target.checked)
            }}
          />
          Remember on this computer
        </label>
      ) : (
        <p className="tricc-repo__hint" data-testid="repo-token-session">
          Kept until this tab closes. This copy of the app shares its storage with other sites, so
          it never keeps a token. Run it with <code>npx @tricc/app-local</code> to have it
          remembered.
        </p>
      )}
    </div>
  )
}

const KIND_LABEL: Record<FileChangeKind, string> = {
  add: 'added',
  change: 'changed',
  delete: 'deleted',
}
type FileChangeKind = 'add' | 'change' | 'delete'

function FileList({
  items,
  testId,
}: {
  items: { path: string; kind: FileChangeKind }[]
  testId: string
}) {
  return (
    <ul className="tricc-import-list" data-testid={testId}>
      {items.map((c) => (
        <li key={c.path} data-kind={c.kind}>
          {c.path}
          <span>{KIND_LABEL[c.kind]}</span>
        </li>
      ))}
    </ul>
  )
}

/** The project files of a folder on a branch, with `repository` added to `tricc.yaml` if it lacks one. */
async function readBranch(
  loc: RepoLocation,
  repository: ProjectRepository,
): Promise<{ head: string; files: ProjectFiles }> {
  const host = hostFor(loc.host, loc.origin)
  const head = await host.head(loc)
  const tree = await host.tree(loc, head)
  if (!tree.has('tricc.yaml') && !tree.has('project.json')) {
    throw new Error(
      `There is no TRICC project in ${loc.path || 'the top folder'} on ${loc.branch}: tricc.yaml is missing.`,
    )
  }
  const wanted = [...tree]
    .filter(([path]) => isImportablePath(path))
    .map(([path, blob]) => ({ path, blob }))
  const files = asProjectFiles(await host.read(loc, wanted))
  const yaml = fileText(files['tricc.yaml'])
  if (yaml !== undefined && !repositoryOfTriccYaml(yaml)) {
    files['tricc.yaml'] = setTriccYamlRepository(yaml, repository)
  }
  return { head, files }
}

/* ------------------------------------------------------------------ import */

interface Found {
  loc: RepoLocation
  branches: string[]
  head: string
  files: number
}

export function ImportFromRepoButton({
  onImport,
}: {
  /** Adopt the files as a new project; resolves to it, or undefined when they were refused. */
  onImport: (files: ProjectFiles, fallbackName: string) => Promise<ProjectRef | undefined>
}) {
  const [openDialog, setOpenDialog] = useState(false)
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        type="button"
        data-testid="import-repo"
        onClick={() => setOpenDialog(true)}
      >
        Import from GitHub or GitLab…
      </Button>
      {openDialog && (
        <ImportFromRepoDialog onImport={onImport} onClose={() => setOpenDialog(false)} />
      )}
    </>
  )
}

function ImportFromRepoDialog({
  onImport,
  onClose,
}: {
  onImport: (files: ProjectFiles, fallbackName: string) => Promise<ProjectRef | undefined>
  onClose: () => void
}) {
  const [url, setUrl] = useState('')
  const [kind, setKind] = useState<HostKind | ''>('')
  const [found, setFound] = useState<Found | undefined>(undefined)
  const [branch, setBranch] = useState('')
  const [path, setPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const parsed = useMemo(() => parseRepoUrl(url), [url])
  const hostKind: HostKind | undefined = parsed?.host ?? (kind || undefined)

  const look = async (wantBranch?: string, wantPath?: string) => {
    if (!parsed || !hostKind) return
    setBusy(true)
    setError(undefined)
    try {
      const host = hostFor(hostKind, parsed.origin)
      const base = { host: hostKind, origin: parsed.origin, repo: parsed.repo, path: '' }
      const branches = await host.branches(base)
      const split = splitBranchAndPath(parsed.rest, branches)
      const b = wantBranch ?? split.branch ?? (await host.defaultBranch(base))
      const loc: RepoLocation = {
        ...base,
        branch: b,
        path: (wantPath ?? split.path).replace(/^\/+|\/+$/g, ''),
      }
      const head = await host.head(loc)
      const tree = await host.tree(loc, head)
      if (!tree.has('tricc.yaml') && !tree.has('project.json')) {
        throw new Error(
          `No TRICC project in ${loc.path || 'the top folder'} on ${b}: tricc.yaml is missing. Check the folder.`,
        )
      }
      setFound({ loc, branches, head, files: [...tree.keys()].filter(isImportablePath).length })
      setBranch(b)
      setPath(loc.path)
    } catch (e) {
      setFound(undefined)
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }

  const importNow = async () => {
    if (!found) return
    setBusy(true)
    setError(undefined)
    try {
      const loc = { ...found.loc, branch, path: path.replace(/^\/+|\/+$/g, '') }
      const { head, files } = await readBranch(loc, repositoryOf(loc))
      const name = loc.path.split('/').pop() || loc.repo.split('/').pop() || 'Imported project'
      const ref = await onImport(files, name)
      if (ref) {
        saveRepoState(ref.id, { branch: loc.branch, baseCommit: head })
        onClose()
      }
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      testId="import-repo-dialog"
      titleId="import-repo-title"
      title="Import from a repository"
      onClose={onClose}
    >
      <form
        className="tricc-repo"
        onSubmit={(e) => {
          e.preventDefault()
          void (found ? importNow() : look())
        }}
      >
        <label htmlFor="repo-url">
          Link to the project folder
          <input
            id="repo-url"
            data-testid="repo-url"
            value={url}
            placeholder="https://github.com/org/repo/tree/main/projects/guideline"
            onChange={(e) => {
              setUrl(e.target.value)
              setFound(undefined)
            }}
          />
        </label>
        {parsed && !parsed.host && (
          <label htmlFor="repo-kind">
            {new URL(parsed.origin).host} is
            <select
              id="repo-kind"
              data-testid="repo-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as HostKind | '')}
            >
              <option value="">Choose…</option>
              <option value="github">GitHub Enterprise</option>
              <option value="gitlab">GitLab</option>
            </select>
          </label>
        )}
        {parsed && hostKind && <TokenField kind={hostKind} origin={parsed.origin} />}
        {found && (
          <div className="tricc-repo__found" data-testid="repo-found">
            <p>
              {hostLabel(found.loc.host)} · {found.loc.repo} · {found.files} project files
            </p>
            <label htmlFor="repo-branch">
              Branch
              <select
                id="repo-branch"
                data-testid="repo-branch"
                value={branch}
                onChange={(e) => {
                  setBranch(e.target.value)
                  void look(e.target.value, path)
                }}
              >
                {(found.branches.includes(branch)
                  ? found.branches
                  : [branch, ...found.branches]
                ).map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="repo-path">
              Folder
              <input
                id="repo-path"
                data-testid="repo-path"
                value={path}
                placeholder="the top of the repository"
                onChange={(e) => setPath(e.target.value)}
                onBlur={() => {
                  if (path !== found.loc.path) void look(branch, path)
                }}
              />
            </label>
          </div>
        )}
        {url && !parsed && (
          <p className="tricc-repo__error">That does not look like a repository link.</p>
        )}
        {error && (
          <p className="tricc-repo__error" data-testid="repo-error">
            {error}
          </p>
        )}
        <div className="tricc-library-modal__actions">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          {found ? (
            <Button size="sm" type="submit" data-testid="repo-import" disabled={busy}>
              {busy ? 'Importing…' : 'Import'}
            </Button>
          ) : (
            <Button
              size="sm"
              type="submit"
              data-testid="repo-look"
              disabled={busy || !parsed || !hostKind}
            >
              {busy ? 'Looking…' : 'Find the project'}
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ opening a copy */

export interface CopyCheck {
  repository: ProjectRepository
  loc: RepoLocation
  state: RepoState | undefined
  head?: string
  /** The author's changes that the branch does not have yet. */
  pending: Edit[]
  error?: string
}

/** The repository a stored copy belongs to, read from its `tricc.yaml`. */
export function repositoryOfFiles(files: ProjectFiles): ProjectRepository | undefined {
  const yaml = fileText(files['tricc.yaml'])
  return yaml === undefined ? undefined : repositoryOfTriccYaml(yaml)
}

/** Compare this browser's copy with its branch. Never throws: an unreachable host is reported. */
export async function checkCopy(
  projectId: string,
  files: ProjectFiles,
  repository: ProjectRepository,
): Promise<CopyCheck | undefined> {
  const state = loadRepoState(projectId)
  const loc = locationOf(repository, state?.branch)
  if (!loc) return undefined
  const result: CopyCheck = { repository, loc, state, pending: [] }
  try {
    const host = hostFor(loc.host, loc.origin)
    result.head = await host.head(loc)
    if (!state) return result
    const base = await host.tree(loc, state.baseCommit)
    const headTree = result.head === state.baseCommit ? base : await host.tree(loc, result.head)
    const local = await blobsOf(
      Object.fromEntries(Object.entries(files).filter(([p]) => isImportablePath(p))),
    )
    result.pending = editsSince(local, base).filter((e) => headTree.get(e.path) !== e.blob)
    // Import adds `repository` to a tricc.yaml that lacks it. That alone is not a change for
    // the author to decide about; it reaches the repository with the first proposal.
    const yaml = result.pending.find((e) => e.path === 'tricc.yaml' && e.blob !== undefined)
    const baseYaml = base.get('tricc.yaml')
    if (yaml && baseYaml) {
      const read = await host.read(loc, [{ path: 'tricc.yaml', blob: baseYaml }])
      const remote = new TextDecoder().decode(read['tricc.yaml'])
      if (fileText(files['tricc.yaml']) === setTriccYamlRepository(remote, repository)) {
        result.pending = result.pending.filter((e) => e !== yaml)
      }
    }
  } catch (e) {
    result.error = message(e)
  }
  return result
}

/** Whether opening the copy needs the author to choose between it and a branch. */
export function needsChoice(check: CopyCheck): boolean {
  if (check.error) return false
  return !check.state || check.head !== check.state.baseCommit || check.pending.length > 0
}

/** A branch read from the repository, ready to replace a copy. */
export interface FetchedBranch {
  branch: string
  head: string
  files: ProjectFiles
}

export async function fetchBranch(
  repository: ProjectRepository,
  branch: string,
): Promise<FetchedBranch> {
  const loc = locationOf(repository, branch)
  if (!loc) throw new Error('The repository address in tricc.yaml cannot be read.')
  return { branch, ...(await readBranch(loc, repository)) }
}

/**
 * Replace a browser-stored copy with a fetched branch. The project must not be open:
 * its autosave would write the old version back over the new one.
 */
export async function writeBranch(
  local: LocalRuntime,
  ref: ProjectRef,
  fetched: FetchedBranch,
): Promise<void> {
  const { branch, head, files } = fetched
  const before = await local.persistence.read(ref)
  await local.persistence.write(ref, {
    files,
    changed: Object.keys(files),
    removed: Object.keys(before).filter((p) => !(p in files)),
  })
  await local.collaboration.forget(ref)
  const previous = loadRepoState(ref.id)
  const state: RepoState = { branch, baseCommit: head }
  if (previous?.proposal && previous.proposal.target === branch) state.proposal = previous.proposal
  saveRepoState(ref.id, state)
}

/**
 * Shown when a copy from a repository is opened and there is something to decide: the
 * author's changes are not on the branch yet, the branch moved on, or this browser does
 * not know which version the copy started from.
 */
export function ChooseCopyDialog({
  check,
  onContinue,
  onLoad,
  onClose,
}: {
  check: CopyCheck
  onContinue: () => void
  onLoad: (branch: string) => Promise<void>
  onClose?: () => void
}) {
  const [branch, setBranch] = useState(check.state?.branch ?? check.repository.branch)
  const [branches, setBranches] = useState<string[]>([branch])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(check.error)
  const { loc, state, pending } = check
  useEffect(() => {
    let cancelled = false
    hostFor(loc.host, loc.origin)
      .branches(loc)
      .then((all) => {
        if (!cancelled && all.length > 0) setBranches(all.includes(branch) ? all : [branch, ...all])
      })
      .catch(() => {
        // The branch the copy is on stays offered.
      })
    return () => {
      cancelled = true
    }
    // The list is read once per dialog; the chosen branch does not change it.
  }, [loc])
  const moved = state && check.head && check.head !== state.baseCommit
  return (
    <Dialog
      testId="choose-copy"
      titleId="choose-copy-title"
      title="Which version do you want to open?"
      onClose={onClose ?? onContinue}
    >
      <div className="tricc-repo">
        <p className="tricc-repo__where">
          {hostLabel(loc.host)} · {loc.repo}
          {loc.path ? ` · ${loc.path}` : ''}
        </p>
        {!state ? (
          <p data-testid="choose-copy-no-base">
            This browser does not know which version of the repository this copy started from, so it
            cannot propose changes yet. Load a branch to start from it.
          </p>
        ) : (
          <>
            {pending.length > 0 && (
              <>
                <p data-testid="choose-copy-pending">
                  This copy has {pending.length} {pending.length === 1 ? 'change' : 'changes'} that{' '}
                  {state.branch} does not have yet.
                </p>
                <FileList
                  testId="choose-copy-files"
                  items={pending.map((e) => ({
                    path: e.path,
                    kind: e.blob === undefined ? 'delete' : 'change',
                  }))}
                />
              </>
            )}
            {moved && (
              <p data-testid="choose-copy-moved">
                {state.branch} has changed since this copy was loaded.
              </p>
            )}
          </>
        )}
        <label htmlFor="choose-copy-branch">
          Branch
          <select
            id="choose-copy-branch"
            data-testid="choose-copy-branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        {pending.length > 0 && (
          <p className="tricc-repo__hint">
            Loading a branch replaces this copy. Propose your changes first to keep them.
          </p>
        )}
        {error && (
          <p className="tricc-repo__error" data-testid="choose-copy-error">
            {error}
          </p>
        )}
        <div className="tricc-library-modal__actions">
          {state && (
            <Button
              variant={pending.length > 0 ? 'default' : 'outline'}
              size="sm"
              type={pending.length > 0 ? 'submit' : 'button'}
              data-testid="choose-copy-continue"
              onClick={onContinue}
              disabled={busy}
            >
              {pending.length > 0 ? 'Continue with my changes' : 'Keep this copy'}
            </Button>
          )}
          <Button
            variant={state && pending.length > 0 ? 'outline' : 'default'}
            size="sm"
            type={state && pending.length > 0 ? 'button' : 'submit'}
            data-testid="choose-copy-load"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setError(undefined)
              try {
                await onLoad(branch)
              } catch (e) {
                setError(message(e))
                setBusy(false)
              }
            }}
          >
            {busy ? 'Loading…' : `Load ${branch}`}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ the open project */

/**
 * The repository a project lives in, in the top bar: where it is, and for a copy in this
 * browser, proposing its changes and switching branch.
 */
export function RepoTools({
  local,
  open,
  onReplace,
}: {
  local: LocalRuntime
  open: OpenProject
  /** Close the project, write the branch over it, and open it again. */
  onReplace: (fetched: FetchedBranch) => void
}) {
  const repository = useMemo(() => open.document.snapshot().repository, [open])
  const [state, setState] = useState(() => loadRepoState(open.ref.id))
  const [dialog, setDialog] = useState<'propose' | 'branch' | undefined>(undefined)
  const [check, setCheck] = useState<CopyCheck | undefined>(undefined)
  if (!repository) return null
  const loc = locationOf(repository, state?.branch)
  if (!loc) return null
  const inBrowser = local.storeFor(open.ref) === 'browser'
  return (
    <span className="tricc-repo-tools">
      <a
        className="tricc-repo-badge"
        data-testid="repo-badge"
        href={`${loc.origin}/${loc.repo}`}
        target="_blank"
        rel="noreferrer"
        title={`${hostLabel(loc.host)} repository${loc.path ? `, folder ${loc.path}` : ''}`}
      >
        {new URL(loc.origin).host}/{loc.repo} · {state?.branch ?? repository.branch}
      </a>
      {inBrowser && (
        <>
          <Button
            variant="outline"
            size="sm"
            type="button"
            data-testid="repo-switch"
            onClick={async () => {
              const files = await local.persistence.read(open.ref)
              setCheck(await checkCopy(open.ref.id, files, repository))
              setDialog('branch')
            }}
          >
            Branch…
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            data-testid="propose-changes"
            onClick={() => setDialog('propose')}
          >
            Propose changes…
          </Button>
        </>
      )}
      {dialog === 'branch' && check && (
        <ChooseCopyDialog
          check={check}
          onContinue={() => setDialog(undefined)}
          onClose={() => setDialog(undefined)}
          onLoad={async (branch) => onReplace(await fetchBranch(repository, branch))}
        />
      )}
      {dialog === 'propose' && (
        <ProposeDialog
          local={local}
          open={open}
          repository={repository}
          state={state}
          onState={setState}
          onClose={() => setDialog(undefined)}
        />
      )}
    </span>
  )
}

interface Proposal {
  loc: RepoLocation
  parent: string
  branch: string
  createBranch: boolean
  base: Tree
  target: Tree
  edits: Edit[]
  plan: Plan
  local: ProjectFiles
  activityTitles: Record<string, string>
}

function branchName(projectId: string): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
  return `tricc/${projectId.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}-${stamp}`
}

async function prepare(
  open: OpenProject,
  repository: ProjectRepository,
  state: RepoState,
): Promise<Proposal> {
  const loc = locationOf(repository, state.branch)
  if (!loc) throw new Error('The repository address in tricc.yaml cannot be read.')
  const host = hostFor(loc.host, loc.origin)
  const project = open.document.snapshot()
  const local = writeProject(project)
  const lang = project.languages.default
  const activityTitles = Object.fromEntries(
    Object.values(project.activities).map((a) => [
      a.id,
      a.title?.[lang] ?? Object.values(a.title ?? {})[0] ?? a.id,
    ]),
  )
  const base = await host.tree(loc, state.baseCommit)
  const edits = editsSince(await blobsOf(local), base)
  let open_ = state.proposal && state.proposal.target === loc.branch ? state.proposal : undefined
  if (open_ && (await host.requestState(loc, open_.number)) !== 'open') open_ = undefined
  const parent = open_ ? await host.head(loc, open_.branch) : await host.head(loc)
  const target = await host.tree(loc, parent)
  return {
    loc,
    parent,
    branch: open_?.branch ?? branchName(project.id),
    createBranch: !open_,
    base,
    target,
    edits,
    plan: planOnto(edits, base, target, open_?.pushed),
    local,
    activityTitles,
  }
}

function defaultTitle(p: Proposal, projectTitle: string): string {
  const names = p.plan.apply
    .map((c) => /^activities\/(.+)\.activity\.yaml$/.exec(c.path)?.[1])
    .filter((id): id is string => Boolean(id))
    .map((id) => p.activityTitles[id] ?? id)
  const shown =
    names.slice(0, 3).join(', ') + (names.length > 3 ? ` and ${names.length - 3} more` : '')
  return names.length > 0 ? `Update ${shown}` : `Update ${projectTitle}`
}

function ProposeDialog({
  local,
  open,
  repository,
  state,
  onState,
  onClose,
}: {
  local: LocalRuntime
  open: OpenProject
  repository: ProjectRepository
  state: RepoState | undefined
  onState: (s: RepoState) => void
  onClose: () => void
}) {
  const [proposal, setProposal] = useState<Proposal | undefined>(undefined)
  const [attempt, setAttempt] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [overwrite, setOverwrite] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [done, setDone] = useState<{ url: string; updated: boolean } | undefined>(undefined)
  const loc = locationOf(repository, state?.branch)!
  const projectTitle = useMemo(() => {
    const p = open.document.snapshot()
    return p.title?.[p.languages.default] ?? open.ref.name
  }, [open])

  useEffect(() => {
    if (!state || done) return
    let cancelled = false
    setError(undefined)
    setProposal(undefined)
    prepare(open, repository, state)
      .then((p) => {
        if (cancelled) return
        setProposal(p)
        setTitle((t) => t || defaultTitle(p, projectTitle))
        setBody(
          (b) =>
            b ||
            `Proposed with TRICC Authoring by ${local.identity.current().displayName}.\n\n` +
              p.plan.apply.map((c) => `- ${c.path} (${KIND_LABEL[c.kind]})`).join('\n'),
        )
      })
      .catch((e) => !cancelled && setError(message(e)))
    return () => {
      cancelled = true
    }
  }, [open, repository, state, attempt, local, projectTitle, done])

  const changes = proposal
    ? overwrite
      ? withConflicts(proposal.plan, proposal.target, proposal.edits)
      : proposal.plan.apply
    : []
  const target = loc.branch
  const create = async () => {
    if (!proposal || !state || changes.length === 0) return
    setBusy(true)
    setError(undefined)
    try {
      const host = hostFor(loc.host, loc.origin)
      await host.commit(proposal.loc, {
        parent: proposal.parent,
        branch: proposal.branch,
        createBranch: proposal.createBranch,
        message: `${title}\n\n${body}`.trim(),
        changes: changes.map((c) => ({
          path: c.path,
          kind: c.kind,
          ...(c.kind === 'delete' ? {} : { content: proposal.local[c.path] }),
        })),
      })
      const pushed = { ...(proposal.createBranch ? {} : state.proposal?.pushed) }
      for (const c of changes) pushed[c.path] = c.blob ?? null
      let request =
        state.proposal && !proposal.createBranch
          ? { number: state.proposal.number, url: state.proposal.url }
          : undefined
      if (!request)
        request = await host.openRequest(proposal.loc, {
          branch: proposal.branch,
          target,
          title,
          body,
        })
      const next: RepoState = {
        ...state,
        proposal: {
          branch: proposal.branch,
          number: request.number,
          url: request.url,
          target,
          pushed,
        },
      }
      saveRepoState(open.ref.id, next)
      onState(next)
      setDone({ url: request.url, updated: !proposal.createBranch })
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }

  const word = loc.host === 'github' ? 'pull request' : 'merge request'
  return (
    <Dialog
      testId="propose-dialog"
      titleId="propose-title"
      title="Propose changes"
      onClose={onClose}
    >
      <div className="tricc-repo">
        <p className="tricc-repo__where">
          {hostLabel(loc.host)} · {loc.repo} · into {target}
        </p>
        {!state ? (
          <p data-testid="propose-no-base">
            This browser does not know which version this copy started from. Use Branch… to load{' '}
            {target} first, then make the changes again.
          </p>
        ) : done ? (
          <p data-testid="propose-done">
            {done.updated ? `The ${word} is updated: ` : `The ${word} is open: `}
            <a href={done.url} target="_blank" rel="noreferrer" data-testid="propose-link">
              {done.url}
            </a>
          </p>
        ) : (
          <>
            <TokenField kind={loc.host} origin={loc.origin} onChange={() => setError(undefined)} />
            {!proposal && !error && <p>Comparing with {target}…</p>}
            {proposal && (
              <>
                {proposal.createBranch ? null : (
                  <p data-testid="propose-update">
                    Your open {word} is updated with these changes.{' '}
                    <a href={state.proposal!.url} target="_blank" rel="noreferrer">
                      Open it
                    </a>
                  </p>
                )}
                {changes.length === 0 && proposal.plan.conflicts.length === 0 ? (
                  <p data-testid="propose-nothing">
                    Nothing to propose: {target} already has all your changes.
                  </p>
                ) : (
                  <FileList testId="propose-files" items={changes} />
                )}
                {proposal.plan.conflicts.length > 0 && (
                  <div className="tricc-repo__conflicts" data-testid="propose-conflicts">
                    <p>
                      Someone else also changed{' '}
                      {proposal.plan.conflicts.length === 1 ? 'this file' : 'these files'} on{' '}
                      {target} since you loaded it:
                    </p>
                    <ul>
                      {proposal.plan.conflicts.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                    <label className="tricc-repo__check">
                      <input
                        type="checkbox"
                        data-testid="propose-overwrite"
                        checked={overwrite}
                        onChange={(e) => setOverwrite(e.target.checked)}
                      />
                      Propose my version anyway; reviewers see both in the {word}
                    </label>
                  </div>
                )}
                {proposal.createBranch && changes.length > 0 && (
                  <>
                    <label htmlFor="propose-title-input">
                      Title
                      <input
                        id="propose-title-input"
                        data-testid="propose-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </label>
                    <label htmlFor="propose-body">
                      Description
                      <textarea
                        id="propose-body"
                        data-testid="propose-body"
                        rows={5}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                      />
                    </label>
                  </>
                )}
              </>
            )}
          </>
        )}
        {error && (
          <p className="tricc-repo__error" data-testid="propose-error">
            {error}
          </p>
        )}
        <div className="tricc-library-modal__actions">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            {done ? 'Close' : 'Cancel'}
          </Button>
          {state && !done && error && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </Button>
          )}
          {state && !done && (
            <Button
              size="sm"
              type="button"
              data-testid="propose-create"
              disabled={busy || !proposal || changes.length === 0 || !title.trim()}
              onClick={() => void create()}
            >
              {busy
                ? 'Sending…'
                : proposal && !proposal.createBranch
                  ? `Update the ${word}`
                  : `Create ${word}`}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  )
}

export { forgetRepoState }
