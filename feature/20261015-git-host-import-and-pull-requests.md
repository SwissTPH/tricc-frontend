# Import from GitHub / GitLab, and propose changes as a pull request

| Field | Value |
|-------|-------|
| **Status** | Implemented (local app), not committed |
| **Repo** | `tricc_frontend`: `apps/local/src/git/` (hosts, rules, dialogs); `@tricc/core` (`tricc.yaml` `repository`); `@tricc/editor` exports `Dialog` |
| **Source** | Patrick, 2026-10-15: "import from github/gitlab, and for export create a PR on the repo if one is selected. This should be on the local wrapper: the platform will have a similar feature." |
| **Related** | `20260825-local-app.md`, `20261013-hosting-groundwork.md` (the hosted platform lives in `../tricc_platform`) |
| **Decisions** | 2026-10-15 (Patrick): personal access tokens only, no OAuth proxy. Self-hosted GitLab is in. The hosted copy never stores a token; remembered tokens are for the real platform and the local app. The import sits on the Projects page; reopening a copy asks between its changes and a branch. Where the project lives is kept in `tricc.yaml`. One pull request per copy, updated rather than multiplied. |

---

## Part I — What the author sees

Guidelines often live in a git repository already (one per country or programme). Before this, an
author had to clone it, find the project folder and open it, then commit and push by hand. Most
clinicians cannot.

### Import from a repository

On **Projects**, under *Open an existing project*, **Import from GitHub or GitLab…** asks for a
link to the project folder, for example:

- `https://github.com/SwissTPH/almanach/tree/main/projects/global`
- `https://gitlab.com/moh/imci/-/tree/develop/guideline`
- `https://git.moh.example/health/imci`

A self-hosted address that does not say which host it is gets a *GitHub Enterprise / GitLab*
choice. **Find the project** shows the repository, the number of project files, the branch and
the folder, and both can be changed. **Import** opens the folder as a new project in this browser.
The top bar then shows where it lives (`github.com/SwissTPH/almanach · main`).

A public repository imports without a token. A private one needs an access token (Part II §4).

### Propose changes

**Propose changes…** in the top bar lists the files that will be added, changed or deleted, with a
title and a description prefilled from the activities touched. **Create pull request** (on
GitLab, *merge request*) commits on a new branch `tricc/<project>-<date>-<time>` and opens the
request.

The next proposal from the same copy **updates that request** while it is open, instead of
opening another. Once it is merged or closed, the next proposal opens a new one.

If someone changed a file on the branch since this copy was loaded, the file is listed as a
conflict and left out. The author can tick *Propose my version anyway*; reviewers then see both
versions in the request. A file is never overwritten silently.

### Reopening a copy

Opening a project imported from a repository first compares it with its branch. When there is
something to decide, a dialog asks **Which version do you want to open?**:

- the changes in this copy that the branch does not have yet, with **Continue with my changes**;
- whether the branch has changed since the copy was loaded;
- a **Branch** list and **Load \<branch\>**, which replaces this copy with that branch.

Nothing to decide (no unproposed changes, branch unchanged): the project opens directly. When the
host cannot be reached, it also opens directly; working offline is not interrupted.

**Branch…** in the top bar opens the same choice at any time.

### What it does not do

- It never pushes to the target branch, and never merges.
- Folder projects keep using git on the disk. The repository badge shows; *Branch…* and *Propose
  changes…* are for copies kept in the browser.
- Forking a repository the author cannot push to is not done (Part II §8).

## Part II — Technical specification

### 1. Where it lives

```
apps/local/src/git/
├── host.ts        GitHost interface, RepoLocation, parseRepoUrl(), splitBranchAndPath(), request helper
├── github.ts      GitHubHost: REST v3, api.github.com or GitHub Enterprise (<origin>/api/v3)
├── gitlab.ts      GitLabHost: REST v4, gitlab.com or self-hosted (<origin>/api/v4)
├── changes.ts     blob ids, the author's edits, applying them to a branch (pure, unit tested)
├── links.ts       RepoState per project, tokens
├── index.ts       hostFor(kind, origin)
└── ui.tsx         ImportFromRepoButton, ChooseCopyDialog, RepoTools, ProposeDialog
```

The platform will need the same thing behind its own sign-in. `host.ts`, `github.ts`,
`gitlab.ts` and `changes.ts` depend only on `fetch` and `@tricc/core`, so moving them into a
package is a copy.

### 2. Where the project lives: `tricc.yaml`

```yaml
repository:
  host: github            # or gitlab
  url: https://github.com/SwissTPH/almanach
  branch: main            # where changes are proposed to by default
  path: projects/global   # absent for the top of the repository
```

- `Project.repository?: ProjectRepository`, read and written by `tricc-yaml.ts`, kept in the Y.Doc
  `meta` map, and set with `Mutations.setRepository`.
- `repositoryOfTriccYaml(text)` reads it without reading the project.
  `setTriccYamlRepository(text, repo)` sets it and keeps the rest of the file and its comments.
- Import adds it to a `tricc.yaml` that lacks it. The first proposal then commits it, and every
  later copy knows where it came from.
- `tricc_oo` ignores unknown top-level keys (`TriccProjectConfig`, `extra="ignore"`).

### 3. What this browser keeps: `RepoState`

`localStorage` `tricc.repo.<projectId>`. It is deleted with the project.

```ts
interface RepoState {
  branch: string        // the branch this copy was loaded from
  baseCommit: string    // the commit it was loaded at
  proposal?: { branch; number; url; target; pushed: Record<path, blobId | null> }
}
```

It is not in `tricc.yaml`, because it changes with every load and proposal. A copy that arrives
without it (a `.tricc` export, another browser) has to load a branch before it can propose
changes.

### 4. Access tokens

There is no server, so there is no OAuth sign-in:

- GitHub's token endpoint and its device flow do not answer browser requests (no CORS).
- GitLab PKCE needs an application registered on every instance.

The author pastes a **personal access token**, per host origin:

- GitHub: fine-grained, *Contents* and *Pull requests* read and write.
- GitLab: `api`, or `read_repository` for import only.

Both are sent as `Authorization: Bearer`. The dialog links to the token page.

| Running at | Kept | "Remember on this computer" |
|---|---|---|
| `localhost`, `127.0.0.1` (`npx @tricc/app-local`, dev) | for the tab | offered: `localStorage` `tricc.git-tokens` |
| anywhere else, e.g. `swisstph.github.io` | for the tab | **not offered**, with the reason |

Every `*.github.io` site of an organisation shares one origin, so a stored token could be read by
any of them.

### 5. Import

1. `parseRepoUrl` accepts GitHub `…/tree/<branch>/<path>` and GitLab `…/-/tree/<branch>/<path>`
   links, nested groups, `.git` and `git@host:` clone addresses. `splitBranchAndPath` takes the
   longest branch that matches, so `feature/fever` works. Without a branch, the default branch is
   used.
2. The folder must hold `tricc.yaml` (or a legacy `project.json`).
3. Only project files are read: `.yaml`, `.yml`, `.json`, `.cql`, `.drawio`, `.xml`, `.po` and
   pictures. Hidden folders, `node_modules`, `build`, `dist`, `out` and `output` are skipped. A
   README next to the project is never read.
4. The files go through the same path as a `.tricc` import (`importFiles` in `App.tsx`). Then
   `RepoState { branch, baseCommit: head }` is saved.

### 6. Proposing: the author's edits, applied file by file

All in `changes.ts`, over git blob ids (SHA-1 of `blob <size>\0<bytes>`, computed with WebCrypto):

1. **Edits** = `writeProject(snapshot)` compared with the tree at `baseCommit`: files added or
   changed, plus files deleted, but only under `activities/`, `terminology/`, `cql/` and
   `media/`. A `.drawio` source or any other file is never deleted.
2. **Target**: the open proposal's branch if its request is still open, else the head of the
   target branch.
3. **Plan**, per edited file, against the target's tree:
   - already the same: skipped (for example merged by an earlier proposal);
   - the target still holds the base version, or what this app pushed there before
     (`proposal.pushed`): applied;
   - anything else: a **conflict**, left out unless the author ticks *Propose my version anyway*.
4. **Commit**:
   - GitHub: one blob per file, a tree on `base_tree` (deletions as `sha: null`), a commit, then
     `POST git/refs` for a new branch or `PATCH git/refs/heads/<branch>` (`force: false`).
   - GitLab: one `POST repository/commits` with `actions[]`, and `start_sha` for a new branch.
5. **Request**: `POST /pulls` or `POST /merge_requests` for a new branch. An open one is reused.
   `RepoState.proposal` records it, with the blobs pushed.

This is why a new proposal can start from the branch's current head and still never revert
someone else's work. An earlier draft started from `baseCommit` instead. That needed the host's
merge UI to show conflicts, and re-proposed changes that were already merged.

### 7. Reopening

`checkCopy` runs before the project opens (browser copies with a `repository` only):

1. Read the head of the copy's branch, and the trees at the base and at the head.
2. The copy's pending edits are those whose file on the head differs from the copy. A
   `tricc.yaml` that differs only by the `repository` that import added does not count.
3. The dialog is shown when there is no `RepoState`, when the head moved, or when there are
   pending edits. If the host is unreachable, the project opens directly.

Loading a branch is two steps:

1. `fetchBranch` reads it while the project is still open, so errors show in the dialog.
2. The workspace closes the project, so autosave stops, waits for a save already under way, and
   then `writeBranch` replaces the stored files and clears the local editing log. Then the
   project opens again without asking.

### 8. Not done yet

- Fork-then-propose for repositories without push access. Today a 403 or 404 says the token
  cannot do it.
- Folder projects proposing from the disk.
- Updating the request's title and description when it is updated with more changes.

### 9. Tests

- Unit (`apps/local/src/git/git.test.ts`, 17 tests):
  - link parsing (GitHub, gitlab.com, self-hosted, nested groups, `/` in a branch);
  - blob id equal to `git hash-object`;
  - edits and deletions, the plan with an already-merged file, a conflict, and our own earlier
    push;
  - both hosts against a recording fake `fetch` (tree paging, base64, commit shapes, the request);
  - tokens never remembered off `localhost`.
- Core (`format/serialize/repository.test.ts`): `repository` through `tricc.yaml` and the Y.Doc;
  incomplete entries; setting it in a text keeps comments.
- e2e (`e2e/repository.spec.ts`, Chromium and Firefox): an in-memory git server behind
  `page.route`, answering CORS and preflight.
  - Import from a GitHub folder, without its READMEs.
  - The first proposal opens a pull request on a new branch from main, with the change only in
    the folder and the bearer token on every write. The second updates the same request.
  - Reopening asks, *Continue* opens, *Load develop* replaces the copy, and an unchanged copy
    opens without asking.
  - A conflict is shown and can be overridden.
  - A self-hosted GitLab import after choosing the host.
  - A folder without `tricc.yaml` says so.
