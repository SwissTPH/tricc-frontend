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

- `CommandsProvider` holds the registered commands. `useRegisterCommands(commands, deps)`
  adds them while the calling component is mounted, so a command exists only where it can run
  (tidy layout only while `ActivityEditor` is mounted).
- `ProjectWorkspace` renders a `CommandsProvider` unless one is already above it. `apps/local`
  mounts one around `Shell`, so `TopBar` can register the host's commands.
- Who registers what:
  - `ActivityNavigator`: create activity / segment / block (opens the existing draft via
    `setDraft`), import (`fileRef.current?.click()`).
  - `ProjectWorkspace`: go to overview, segments, activities, blocks (`showView`), dictionary
    (`onOpenDictionary` with the default system), media.
  - `ActivityEditor`: tidy layout (the body of the `tidy-layout` button, moved into a
    function both use).
  - `runtime/context.tsx`: undo / redo (`document.undo`).
  - `apps/local/src/shell/TopBar.tsx`: Editing / Viewing (`local.identity.setReadOnly`),
    Preferences (`usePreferencesPanel().toggle`).

**Palette** (`packages/editor/src/project/ProjectSearch.tsx`):

- `ProjectSearchCommand` takes `mode: 'search' | 'commands'`. In `commands` mode it renders a
  `CommandGroup` per command group before the search groups, with `CommandShortcut` for
  `shortcut`.
- Commands are filtered by our own case-insensitive match on `label` and `keywords`, as
  `shouldFilter` stays `false` for the search hits.
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

- A command whose `run` throws is reported through the notifications port and the palette
  stays closed.
- Two commands with the same `id`: the later registration wins, with a `console.warn` in
  development.

### 3. Tests

- Unit (`commands/registry.test.tsx`): register and unregister on unmount; `writes` commands
  hidden when the project is read-only; the filter matches label and keywords.
- e2e (`e2e/search.spec.ts`): Ctrl+F opens search mode with no Actions group; a second Ctrl+F
  closes it. Ctrl+K shows Actions; typing "dict" and Enter opens the data dictionary.
- e2e: in Viewing mode, Ctrl+K does not offer _New activity_; _Switch to Editing_ does, and
  runs.
- e2e (`e2e/canvas.spec.ts`): with an activity open, Ctrl+K → _Tidy layout_ moves the nodes,
  and Ctrl+Z undoes it in one step.

### 4. Phases

1. Ctrl+F opens search; a second Ctrl+F hands over to the browser's find. Ctrl+K keeps
   today's behaviour.
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
