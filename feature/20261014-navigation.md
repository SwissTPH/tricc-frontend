# Navigation: breadcrumb, following gotos, callers, project list actions

| Field | Value |
|-------|-------|
| **Status** | Implemented |
| **Repo** | `tricc_frontend` — `@tricc/editor`, `apps/local` |
| **Source** | Patrick, 2026-10-14 |

## What the author sees

- **Breadcrumb** at the start of the top bar: home icon › project › activity › activity… It
  replaces the app name and the navigator's "Project overview" button.
  - Following a goto (the new follow icon on a goto node, "Open activity" in its details, or
    Ctrl+click) **adds** the target to the breadcrumb. Reaching an activity already on it cuts the
    breadcrumb back there, so a loop of gotos never grows it.
  - Opening an activity from a list (navigator, overview, validation, dictionary) **resets** it to
    home › project › that activity.
  - A crumb goes back to that activity; the project crumb opens the overview; home opens the
    project list. The data dictionary and media views show as the last crumb.
- **Called by**: an activity lists every goto that leads to it — on its start node's details and
  in its settings dialog. Each entry opens the calling activity with that goto selected; if the
  caller is on the breadcrumb, the breadcrumb is cut back to it.
- **Project list**: each project has a gear (opens the project with its settings dialog) and a bin
  (same confirmation and effect as the bin on the overview; hidden when read-only).

## Notes

- The breadcrumb is app state, not the URL; reloading opens the overview as before.
- `Breadcrumbs`, `nextTrail`, `CalledBy` and `goToCallers` are exported from `@tricc/editor` so a
  hosted app can reuse them. `ActivityEditor` gains `onOpenCaller`; `ProjectOverview` gains
  `initialSettingsOpen`.
- Test ids: `nav-home`, `nav-overview` (project crumb), `crumb-<activity>`, `goto-follow-<node>`,
  `called-by-<activity>-<node>`, `configure-<project>`, `delete-<project>`.
