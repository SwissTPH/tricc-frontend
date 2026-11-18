# Projects kept in the browser vanish when the disk runs low, and the list says nothing

| Field             | Value                                                      |
| ----------------- | ---------------------------------------------------------- |
| **Status**        | Implemented (approved 2026-11-18, in conversation)         |
| **Branch target** | `fix/48-49-browser-storage-eviction` → `develop`           |
| **Scope**         | `@tricc/adapters-local`, `@tricc/app-local`                |
| **Issue**         | #48, #49                                                   |
| **Related**       | `../feature/20261015-git-host-import-and-pull-requests.md` |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Issue analysis

### Symptoms

After a restart, the project list on the hosted app was empty. The project's files were gone, but
localStorage still held its `tricc.repo.<id>` entry, so it looked as if the data was still there.

### Who is affected

Every author whose projects are kept in the browser (not bound to a folder), mostly in Chromium
browsers on a nearly full disk. A copy from a repository keeps whatever was pushed. Anything else,
including a new project that was never exported, is lost.

### Expected vs actual

| Expected                                                              | Actual                                           |
| --------------------------------------------------------------------- | ------------------------------------------------ |
| A project kept in the browser stays until the author deletes it.      | The browser deletes it when disk space runs low. |
| If the browser may delete it, the author is told while there is time. | Nothing says so.                                 |
| A copy whose files are gone is reported, with a way to load it again. | The list is empty and gives no explanation.      |

### How it was found

In the affected Brave profile:

- The leveldb log for `https_swisstph.github.io_0.indexeddb.leveldb` read `Creating DB … since it
was missing`, and an empty `tricc-catalog` was created on page load.
- IndexedDB for every other site survived, and no "clear on exit" or "forget this site" setting
  was set.
- `/home` was 99% full. The previous session ended with `exit_type: "Crashed"`.
- Nothing in the app deletes `tricc-catalog` or `tricc-projects`.

### Out of scope

- Moving projects out of IndexedDB.
- Keeping a reloaded copy linked to its old pull request (see Decisions).

---

## Part II — Fix approach

### Root cause

The app never calls `navigator.storage.persist()`, so its storage is best-effort. When disk space
runs low, Chromium deletes the IndexedDB of best-effort origins, least recently used first, and
leaves localStorage in place. Projects (`tricc-projects`), the list (`tricc-catalog`) and the
editing log (`tricc-doc-<id>`) all live in IndexedDB. Repository state (`tricc.repo.<id>`) lives in
localStorage, which is why it was left behind.

### Fix

**#48: ask the browser to keep the data, and tell the author when it won't.**

- `requestDurableStorage()` and `storageDurability()` in
  `packages/adapters-local/src/storage-durability.ts` ask for persistent storage once and report
  `persisted`, `best-effort` or `unknown`. A refusal or a missing API is a result, not an error.
- The home page calls it at the start of New project, every import and Open folder, while the click
  still counts as the author's (Firefox asks; Chromium weighs how the site is used).
- Opening a project kept in the browser asks too. If storage is not persisted, the top bar shows
  **⚠ May be deleted** next to "Saved in this browser", with a tooltip suggesting an export or a
  folder.

**#49: report a copy whose files are gone and offer to load it again.**

- `RepoState` now also records `repository` (host, URL, branch, folder), so the entry says where to
  load from even after `tricc.yaml` is lost. Older entries get it from `tricc.yaml` the next time
  the project is opened. Loading a branch over a copy keeps it.
- `listRepoStates()`, `sourceOf()` and `treeLink()` in `apps/local/src/git/links.ts`. `sourceOf`
  prefers the proposal's branch, because that is where the work was pushed. Entries without
  `repository` fall back on the proposal's URL, which gives the repository but not the folder.
- The home page lists every `tricc.repo.*` entry with no project behind it, as a warning naming the
  repository, the branch and the proposal. **Load again** opens the import dialog with the link
  already looked up (`initialUrl` on `ImportFromRepoDialog`), and removes the old entry once the
  new copy is imported. **Dismiss** removes the entry.

### Code checklist

- [x] `storage-durability.ts` and its unit tests; exported from `@tricc/adapters-local`.
- [x] `HomePage.tsx`: ask for durable storage on create, import and open folder; the lost-copy
      notice with Load again and Dismiss.
- [x] `App.tsx` and `TopBar.tsx`: ask when opening a browser project, and show the warning.
- [x] `links.ts`: `repository` on `RepoState`, `listRepoStates`, `sourceOf`, `treeLink`.
- [x] `ui.tsx`: save `repository` on import, keep it when a branch is loaded, fill it in for older
      entries, `initialUrl` on the import dialog.

### Tests

- `storage-durability.test.ts`: no StorageManager, already persisted (no second ask), granted,
  refused, and a call that throws.
- `git.test.ts`: `sourceOf` and `treeLink` with a repository, from a GitHub or GitLab proposal URL,
  and with neither.
- `e2e/repository.spec.ts`:
  - "a copy whose browser data was deleted can be loaded again from its proposal": import, propose,
    delete IndexedDB but keep localStorage, then the notice appears and Load again restores the
    pushed change from the proposal branch.
  - "a lost copy can be dismissed": the entry and its key are removed.

The persistent-storage request itself is not covered end to end, because a test cannot make the
browser evict data or decide its grant.

### Acceptance criteria

- On Chromium, creating, importing or opening a browser project leaves `navigator.storage.persisted()`
  true, or the top bar shows the warning.
- After the browser deletes the app's IndexedDB, the home page names each lost copy from a
  repository, and one click loads its branch again.

---

## Open questions

None.

## Decisions

- 2026-11-18: one branch for #48 and #49, since they come from the same incident (in conversation).
- 2026-11-18: a copy loaded again is not linked to the old proposal. The old link targets the base
  branch while the new copy starts from the proposal branch, so reusing it would need changes to the
  propose flow. The pull request stays open on the host.
