# Ctrl+F to search, Ctrl+K for commands

| Field             | Value                                                                                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | Draft                                                                                                                                                                                                                               |
| **Branch target** | `feature/command-palette-actions` → `develop`                                                                                                                                                                                       |
| **Packages**      | `@tricc/editor`, `apps/local`                                                                                                                                                                                                       |
| **Related**       | `20261124-project-search-command-palette.md` (the palette this extends), `20261111-shared-project-workspace.md` (where the palette and its commands live), `20261109-preferences-close.md` (the Preferences toggle a command calls) |

---

## Part I — Business description

### The problem

The project search opens in a search box with **Ctrl+K**. Most authors never learn Ctrl+K: the
key they reach for to find something is **Ctrl+F**, and today Ctrl+F only searches the text
on screen, not segments, activities, concepts or nodes elsewhere in the project.

Authors who use the tool all day also want to reach common actions (a new activity, the data
dictionary, Viewing mode, tidy layout) without moving to the mouse. Today each action is a
button in a different place.

### What changes for an author

- **Ctrl+F** (Cmd+F on a Mac) opens the project search, as selecting **Search the project**
  does today.
- Pressing **Ctrl+F again** while the search is open closes it and opens the browser's own
  find, for text on the page such as the data dictionary or a long label. Two presses always
  reach the browser's find.
- **Ctrl+K** (Cmd+K) opens the same box with an **Actions** list above the search results.
  Typing narrows both: "dict" offers _Go to data dictionary_ and any concept or node that
  matches. Enter runs the highlighted action or opens the highlighted hit.
- Actions show their keyboard shortcut where they have one (_Undo_ — Ctrl+Z).
- Actions that change the project are not offered in **Viewing** mode or without write access.
- A first set of actions, all things the app already does:
  - **Create:** new activity, new segment, new building block, import an activity
  - **Go to:** overview, segments, activities, building blocks, data dictionary, media
  - **Activity** (when one is open): tidy layout
  - **Edit:** undo, redo
  - **App:** switch to Editing / Viewing, open Preferences

### Out of scope

- What the project search matches (`searchProject` is unchanged).
- Commands outside an open project (the home page).
- Authors choosing their own shortcuts.
- Actions on the selected node (delete, duplicate, change type): a later RFC.

---

## Part II — Technical specification

### 1. Design

**Command registry** (`packages/editor/src/commands/`, exported from `@tricc/editor`):

```ts
interface Command {
  id: string // 'nav.dictionary', 'create.activity', …
  group: 'Create' | 'Go to' | 'Activity' | 'Edit' | 'App'
  label: string
  keywords?: string[] // extra words the filter matches
  shortcut?: string // shown only, e.g. 'Ctrl+Z'; Cmd on a Mac
  writes?: boolean // hidden when useCanWrite() is false
  run: () => void
}
```

- `CommandStore` holds the registered commands; `CommandsProvider` gives one to everything
  under it (a nested provider adds nothing). `useRegisterCommands(commands)` adds them while the
  calling component is mounted, so a command exists only where it can run (tidy layout only
  while `ActivityEditor` is mounted). It registers again only when an id, label, group,
  shortcut, `writes` or keyword changes; `run` is always the latest one passed. Without a
  provider (the host's home page) it does nothing.
- `useCommands()` reads them for the palette; `matchCommands` and `shortcutLabel` (`⌘` on a
  Mac) are the palette's filter and shortcut text.
- `ProjectWorkspace` wraps its whole frame in a `CommandsProvider`, around
  `OpenProjectProvider`. The host's top bar is drawn inside the frame, so `apps/local` needs no
  provider of its own.
- Who registers what:
  - `ActivityNavigator`: new activity / segment / building block (`openDraft`, the same draft
    dialog as the buttons), import activities (`setTab('activity')`, then `openImport`).
  - `ProjectWorkspace` (`GoToCommands`): go to overview (`openActivity(undefined)`),
    segments, activities, building blocks, data dictionary, media (`showView`).
  - `ActivityEditor`: tidy layout (`tidyLayout`, now shared with the `tidy-layout` button).
  - `runtime/context.tsx` (`UndoKeys`): undo / redo (`document.undo`).
  - `apps/local/src/shell/TopBar.tsx`: open / close Preferences
    (`usePreferencesPanel().toggle`); `ModeMenu`: switch to Editing or to Viewing, whichever
    the author is not in (`local.identity.setReadOnly`). Neither is a `writes` command, so
    Viewing mode can be left from the palette.

**Palette** (`packages/editor/src/project/ProjectSearch.tsx`):

- `ProjectSearchCommand` takes `mode: 'search' | 'commands'`. In `commands` mode it renders a
  `CommandGroup` per command group before the search groups, with `CommandShortcut` for
  `shortcut`.
- Commands are filtered by `matchCommands` (case-insensitive, on label, group and keywords),
  as `shouldFilter` stays `false` for the search hits. `writes` commands are dropped when
  `useCanWrite()` is false.
- The palette root carries `data-mode`; each action is `command-<id>`, each action group
  `palette-actions`.
- Running a command closes the palette first, then calls `run` on the next frame:
  `UndoKeys` and other handlers ignore keys while a `[role="dialog"]` is open.

**Keys** (`ActivityNavigator`, the existing capture-phase listener):

| Key                     | Palette closed        | Palette open                                         |
| ----------------------- | --------------------- | ---------------------------------------------------- |
| Ctrl+F                  | open, `search` mode   | close, no `preventDefault`: the browser's find opens |
| Ctrl+K                  | open, `commands` mode | switch to `commands` mode                            |
| Shift / Alt with either | ignored               | ignored                                              |

Selecting the **Search the project** bar keeps opening `search` mode.

### 2. Validation and errors

- A command whose `run` throws is logged with `console.error`; the palette stays closed.
  (The notifications port is for collaborators' notifications, not errors; a visible error
  can follow when the app has a place for one.)
- Two commands with the same `id`: the later registration wins, with a `console.warn`.

### 3. Tests

- Unit (`commands/registry.test.tsx`): register and unregister on unmount; the latest `run`
  is called without registering again; one command per id, the later winning; no provider,
  no commands; the filter matches label, group and keywords; the shortcut text.
- e2e (`e2e/search.spec.ts`): Ctrl+F opens search mode with no Actions group; a second Ctrl+F
  closes it. Ctrl+K shows Actions with the undo shortcut; typing "dict" and Enter opens the
  data dictionary; _New activity_ opens the new-activity draft.
- e2e: in Viewing mode, Ctrl+K does not offer _New activity_; _Switch to Editing_ does, and
  runs.
- e2e (`e2e/canvas.spec.ts`): with an activity open, Ctrl+K → _Tidy layout_ moves the nodes,
  and Ctrl+Z undoes it in one step.

### 4. Phases

All three are on the branch, built with the recommendation of each open question below.

1. Ctrl+F opens search; a second Ctrl+F hands over to the browser's find.
2. Command registry, `commands` mode, and the editor's commands (Create, Go to, Activity,
   Edit).
3. Host commands from `apps/local` (Editing / Viewing, Preferences).

---

## Open questions

1. **Is the first set of actions right?** Recommendation: the list in Part I, and nothing that
   acts on the selected node yet.
2. **Ctrl+F inside a text field or the rich text editor**: project search too, or the
   browser's find? Recommendation: project search everywhere, for one rule; the second press
   still reaches the browser's find.
3. **Ctrl+K with nothing typed**: list every action, or only a few frequent ones?
   Recommendation: every action, grouped; the set is small.
4. **Should Ctrl+K also work on the home page** (new project, open a recent project,
   Preferences)? Recommendation: not in this RFC.
5. **A `>` prefix in the Ctrl+F box to switch to commands**, as VS Code does?
   Recommendation: no; Ctrl+K is enough.
