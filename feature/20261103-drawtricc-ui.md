# DrawTricc: themed UI, project table and segments

| Field             | Value                                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | Implemented (frontend, not committed, 2026-11-03)                                                                                                    |
| **Branch target** | `feature/drawtricc-ui` → `develop`                                                                                                                   |
| **Related**       | `20261021-discussions.md` (tags and assignees the bell reads), `20261021-hosted-platform.md` (the notification service that replaces the local bell) |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### What changes for an author

- **The app is called DrawTricc.** "TRICC project" still names the file format.
- **Light and dark.** Every colour comes from one palette (raspberry pink `#E11D74`, warm greys,
  a violet accent). Preferences offers System, Light or Dark.
- **A top bar**:
  - the name and where you are;
  - the project tools;
  - an **Editing / Viewing** menu, in the style of a shared document editor. _Suggesting_ is shown
    but is for the platform;
  - a **bell**;
  - **Preferences**.
- **Home** is a table of projects with columns ID / code, name, labels, owner and last opened. One
  search box covers name, code, owner and labels; `label:x` matches a label exactly. A **+** button
  starts a project (name, code, labels). The **import** button above it opens a folder, a
  repository, a `.tricc` file, or copies a folder into the browser.
- **The project page** is a table of interventions: name (code), title, labels, when it starts, and
  the number of segments. Each intervention's segments are sub-rows, expanded until you press
  **Collapse all**. A filter matches name, code or title; a second one matches labels. A side panel
  has three tabs: **Info** (contents, with links), **Discussion** (the project, or the selected
  intervention) and **Validation**.
- **Segments, not processes.** A _segment_ is one intervention's part of one stage of the encounter.
  It implements a CPG common process (triage, diagnosis…). The UI says _segment_; the files and
  tricc_oo still say _process activity_. Segments are added, ordered and removed in the
  intervention's gear dialog. They are no longer edited on the overview.
- **Labels and owner.** Projects and interventions take free labels (typed comma-separated). A
  project has an owner, who is the author that created it until someone changes it. These are for
  authoring only; tricc_oo ignores them.
- **The bell** lists open discussions that tag you or are assigned to you. On home it covers every
  project; inside a project, only that project.

---

## Part II — Technical specification

### 1. Theme (`@tricc/editor` `src/theme/`)

- **`palette.ts`** holds every raw colour in the app; nothing else does.
  - The scales are named by role: `primary` (pink now), `secondary` (violet now) and `neutral`.
  - Per-scheme roles: `primaryRoles`, `secondaryRoles`, `surfaces`, `semantic`, `elevation`,
    `syntax`, `marks`.
  - Named colours an author picks (the sticky-note and label `swatches`, the canvas
    `nodeGroups`, the rich-text `textColours`) keep literal values, so a re-brand does not
    change them.
- **`tokens.ts`** only maps those entries to role names. It emits them as `--tricc-*` custom
  properties: light on `:root`, dark on `:root[data-theme="dark"]`.
- **`theme.ts`** builds the MUI v7 theme with `cssVariables` and the same `data-theme` selector.
  **`DrawTriccThemeProvider`** applies both. **`useThemeMode()`** reads and sets System / Light /
  Dark; MUI persists the choice under `drawtricc.theme`.
- The hand-written stylesheets (`styles.css`, the app's `app.css`) use only `var(--tricc-*)`. A grep
  for hex or `rgb(` in them finds nothing.
- The Tailwind/shadcn tokens in `tailwind.css` point at the same variables, and `dark:` follows
  `data-theme`.
- **`<Icon name>`** renders Google Material Symbols (Outlined). The font is self-hosted from the
  `material-symbols` package, so the app works offline.

### 2. Files

Plain string keys in `tricc.yaml`, written only when set:

```yaml
labels: [child, triage] # project; a comma-separated string is also read
owner: { id: local, name: Ada } # project; a bare string is read as both
interventions:
  - id: sick-child
    labels: [IMCI]
```

`normalizeLabels` / `parseLabels` / `collectLabels` are in `core/src/model/labels.ts`. The Y.Doc
keeps these keys in `meta` and on the intervention map. The mutations are `setProjectLabels`
and `setProjectOwner`.

### 3. Catalog summary

- `ProjectSummary` adds a `ProjectDescription`: `code`, `title`, `labels`, `owner`, `attention`.
- `ProjectCatalogPort.describe(ref, description)` replaces it.
- `TriccRuntime` calls `describe` after `open`, `create` and every save that wrote something. The
  home page therefore never opens a project to fill its table.

### 4. Notifications port

- `NotificationsPort` (`core/src/ports/notifications.ts`) has `list(scope)`, `subscribe`,
  `markRead` and `capabilities`, plus optional `attach` and `refresh` for local derivation.
- The scope is `{}` on home and `{ projectId }` in a project.
- **`DerivedNotifications`** is the runtime default:
  - The home scope reads `attention` from the catalog.
  - The project scope reads the open project live, attached by `OpenProjectProvider`.
  - Read ids are kept by a `ReadStateStore`. Locally that store is `localStorage`
    (`drawtricc.notifications.read`).
- **`attentionFor`** (`core/src/discussion/attention.ts`) returns open discussions where:
  - someone else's comment tags `@[Name](user:<id>)`, matching the id, or the display name, since
    every local author is `local`; or
  - the assignee is the author.
- The platform passes its own `notifications` port in `TriccRuntimeConfig`, typically pushing over
  SSE or a websocket. The UI only uses `useNotifications(scope)`.

### 5. UI components

- `apps/local`:
  - `shell/TopBar.tsx`: the app bar and mode menu;
  - `home/HomePage.tsx`: the project table, the FABs and the new-project dialog;
  - `projects.ts`: list helpers.
- `@tricc/editor`:
  - `project/InterventionTable.tsx`: the table and its segment sub-rows;
  - `project/InterventionEditor.tsx`: `InterventionDialog`, holding the settings, labels and
    segments. Its add-segment picker replaces the settings view instead of stacking on it;
  - `components/InspectorPanel.tsx`: the tab strip of the side panels;
  - `components/LabelsField.tsx`;
  - `notifications/NotificationBell.tsx`.
- The intervention editor stays on the shared hand-written `Dialog`. Nested MUI focus traps would
  fight the pickers and confirmations that open over it.
- Test ids are kept where the element still exists:
  - `open-<id>`, `new-project-name`, `create-project`, `import-archive` and `import-files` on home;
  - `configure-intervention-*`, `add-process-to-*`, `move-up-*`, `remove-activity-*` and
    `intervention-*-activity-*`, now inside the intervention dialog.
- New test ids:
  - top bar and home: `new-project`, `import-project`, `mode-menu`, `mode-viewing`,
    `mode-editing`, `notification-bell`;
  - project page: `segment-<iv>-<activity>`, `expand-all-interventions`, `intervention-filter`,
    `intervention-label-filter`, `tab-info`.

### 6. Not done

- Code identifiers (`kind: 'process'`, `isProcessActivity`, test ids such as `tab-processes`) keep
  _process_.
- The activity editor's own inspector does not use `InspectorPanel` yet. The markup and classes are
  the same.
- Opening a notification on home opens the project, not the discussion itself.
