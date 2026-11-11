# One project workspace for the local app and the hosted platform

| Field             | Value                                                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | Implemented (2026-11-11, RFC #41)                                                                                                                                                                                               |
| **RFC**           | [#41](https://github.com/SwissTPH/tricc-frontend/issues/41)                                                                                                                                                                     |
| **Branch target** | `feature/shared-project-workspace` → `develop`                                                                                                                                                                                  |
| **Scope**         | `@tricc/editor`, `apps/local`                                                                                                                                                                                                   |
| **Related**       | `20261013-hosting-groundwork.md` (`TriccRuntime.join`, on the same branch); `tricc_platform/feature/20261028-hosted-platform.md` (lists "`ProjectWorkspace` exported by `@tricc/editor`" as a prerequisite, "to specify there") |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### The problem

Inside a project, the local app shows the project overview, the activity editor, the data
dictionary, media and building blocks, with the breadcrumbs, the navigator and jumps to a
discussion. All of that is written inside the local app itself. The hosted platform needs the same
screen around its own top bar (live status, invitations, accounts). Today it would have to copy it,
and the two copies would drift: every new view (building blocks, discussions) would have to be added
twice.

### What changes for an author

- Nothing visible in the local app: same screens, same navigation, same breadcrumbs.
- The hosted platform shows the same project screen as the local app, and gets each new view as
  soon as the library has it.

### Out of scope

- The platform's own top bar, accounts, sharing and live status.
- Opening a shared project from a server (`TriccRuntime.join`): that is
  `20261013-hosting-groundwork.md` §3.
- Changing how any view inside the project works.

---

## Part II — Technical specification

### 1. Design

`@tricc/editor` exports `ProjectWorkspace` and `ProjectWorkspaceFrame` from
`packages/editor/src/project/ProjectWorkspace.tsx`. It owns the navigation state that today lives
in `apps/local/src/App.tsx`: the trail of activities, focus, the side view (dictionary, media,
building blocks), the open concept, and the discussion jump.

```ts
export interface ProjectWorkspaceFrame {
  crumbs: ReactNode // Breadcrumbs, or null while no project is open
  body: ReactNode // ActivityNavigator + the open view, as a fragment for the host's <main>
  showDiscussion: (anchor: Anchor, discussionId: string) => void
}

export function ProjectWorkspace(props: {
  project?: OpenProject
  initialSettingsOpen?: boolean
  onHome?: () => void
  onRename?: (name: string) => void
  onDelete?: () => void
  deleteNote?: string
  frame: (parts: ProjectWorkspaceFrame) => ReactNode
}): ReactNode
```

- The host draws its own chrome through `frame`. `showDiscussion` is handed out so the host can
  wire its notification bell and discussions button.
- `project` may be absent while the host is (re)opening; the component stays mounted, so the trail
  survives.
- It wraps the framed output in `OpenProjectProvider`, so the host's tools (`useSave`,
  `HistoryButtons`, `DiscussionsButton`) work inside `frame`.
- `apps/local/src/App.tsx` keeps a `ProjectPage` that loads the project from the URL (catalog,
  copy-or-branch choice, errors) and renders `<ProjectWorkspace frame={… <Shell …>{body}</Shell>}>`.

### 2. Validation and errors

None new. Opening errors stay with the host (`ProjectPage` in the local app).

### 3. Tests

- `ProjectWorkspace.test.tsx`: opens the overview, then an activity, the dictionary and media; keeps
  the open activity while the host has no project, then shows it again.
- Existing `integration.test.tsx` and the `navigation`, `navigator`, `repository` e2e specs pass
  unchanged (same test ids).
- Add: building blocks view and a discussion jump through `showDiscussion`.

### 4. Phases

1. Move the workspace into `@tricc/editor`, export it, use it from `apps/local`. Already on
   `feature/shared-project-workspace` (`2aa050c`, up to date with `develop`).
2. Add the building-blocks and discussion-jump tests.

---

## Open questions

None.

## Decisions

- 2026-11-11: `TriccRuntime.join` is left out of this RFC and its branch. It stays on
  `feature/hosting-groundwork-join-workspace` for the platform until
  `20261013-hosting-groundwork.md` §3 is approved and `join` also connects the discussion document.
