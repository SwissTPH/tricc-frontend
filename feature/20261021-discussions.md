# Discussions in the project: comments on elements, statuses, labels and a decision log

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_frontend`: `@tricc/core` (model, files, document, port), `@tricc/editor` (discussion UI), `apps/local` (wiring, decision log download). Works with no server. |
| **Related** | `20261009-canvas-comments-and-groups.md` (the sticky notes, which stay), `20260825-document-model.md` (CRDT, undo), `20260825-library-architecture.md` (ports, capabilities), `20261013-hosting-groundwork.md` (later: `join` both documents). Platform: [`20261021-hosted-platform.md`](./20261021-hosted-platform.md), to live in `tricc_platform`. |
| **Source** | 2026-10-21: authors comment on elements that exist, with a status such as pending or resolved, to record why changes were made. Discussions are **part of the project**, so an export carries them and there is no separate artifact. They attach to the element's existing id. A decision log can also be exported on its own. Tagging people works only on the platform. The platform is a **separate repository**. This repo is built first. |
| **Decisions** | 2026-10-21: discussions are saved in the project files and travel with every export. The app has them fully, without a server. Tagging, assigning, live co-editing, accounts and notifications are platform features, in `tricc_platform`. Labels are per project. The app is built first. A notification stores the project, the element id (anchor) and the discussion id, and opening it goes there. |
| **Approval** | — |

---

## Part I — Business description

### App vs platform

This spec is **only the app**. The platform does not store a second copy of discussions: it
syncs the same files live, and adds the things that need accounts.

| In this app (no server) | Only on the platform |
|---|---|
| Start, answer, edit, delete discussions | Sign-up, organisations, project roles |
| Status (open, pending, resolved, won't change) and a resolution note | Tagging a person (`@Alice`) |
| Labels, per project | Assigning a discussion to a person |
| Speech-bubble badges, Discussion tab, Discussions panel | Telling people (bell and email). The local app never sends mail |
| Decision log in the project, and a separate Markdown/CSV download | Several people editing the same diagram at once |
| Jump to an element from `?open=` and `?discussion=` | A notification that uses that jump |
| Sticky notes on the drawing | |

A project made on the platform and opened here still shows tags and assignees as names. There is
no `@` picker here: typing `@Bob` is just text.

### What it is

A **discussion** is a conversation about one element of the guideline. It can be about a node, a
connection, a group, an activity, an intervention, a concept in the data dictionary, an image, or
the project as a whole. For example:

> **Weight (kg)** · Pending · *Clinical review*
> Alice Martin, 21 Oct: Is 9 kg right for children of 2 to 59 months?
> Bob Keller, 22 Oct: The 2024 chart says 8 kg. Changing it.
> *Resolved by Bob Keller on 23 Oct, in version 1.3.0: "Threshold changed to 8 kg, as in the 2024 chart."*

### Where it shows

- A node, connection or group with open or pending discussions shows a small speech bubble with
  the count.
- Selecting the element opens its discussions in a **Discussion** tab, next to Details. With
  nothing selected, the tab shows the activity's discussions.
- The concept page in the data dictionary, the Media view and the project overview have the same
  section.
- A **Discussions** button in the top bar lists every discussion of the project. Filters: open,
  pending, resolved, won't change, by label, *element removed*, *started by me*. Clicking a row
  goes to the element and opens the discussion.

### Status

| Status | Meaning |
|---|---|
| **Open** | New, needs attention. |
| **Pending** | Waiting for an answer, a decision or a change. |
| **Resolved** | Answered or changed. The person resolving can say why. |
| **Won't change** | Decided against. The reason is required. |

A discussion can be reopened. Every change of status or label is shown in the discussion, with who
did it and when.

### Labels

Labels such as *Question*, *Decision*, *Clinical review*, *Translation* or *Problem* sort
discussions. Each project has its own list, in its settings. A new project starts with those five.

### Saved with the project

Discussions are saved in the project, in a `discussions/` folder next to `activities/`. So they are
in the `.tricc` file, in the project folder, in git, and in a pull request. `tricc_oo` ignores
them: they never reach a form.

If the element is deleted, its discussions stay. They are marked *element removed* and keep the
element's name. Undoing the deletion attaches them again.

**Undo (Ctrl+Z) never removes a comment.** Undo is for changes to the guideline. A comment is
deleted on purpose, with its own button.

### The decision log

Resolved and won't-change discussions, with their notes, are the project's **decision log**. It is
always inside the project. It can also be downloaded on its own, as a document (Markdown) or a
table (CSV), for a review meeting or a report.

When the project has a version number (in its settings), a resolution records it, so the log says
in which version each change was made.

### Who wrote it

In the app, a comment is signed with the name in Preferences. The first time someone comments with
the default name *Local author*, the app asks for their name.

The **Read-only** switch still allows discussions. That is the reviewer's case: read the guideline
without moving a node, and comment on it.

### What needs the platform

Tagging someone (`@Alice`), assigning a discussion to someone, and telling people (a bell on the
platform, and email) need accounts, so they are platform features. The local app has no bell and
never sends email: there is no address book and no mail server. A project made on the platform and
opened here still shows the tags, as names.

### The sticky notes stay

The coloured notes on the drawing stay as they are. They are called **Sticky note** in the menus,
so that two different things are not both called "comment". "Note" alone would clash with TRICC's
`note` node.

---

## Part II — Technical specification

### 1. Model (`@tricc/core`, `model/types.ts`)

```ts
export type DiscussionStatus = 'open' | 'pending' | 'resolved' | 'wont_change'

/** A person as written in the files: an id, and the name shown then. */
export interface Person {
  id: string
  name: string
}

export interface DiscussionComment {
  id: string
  author: Person
  /** ISO 8601, UTC. */
  at: string
  /** Plain text. `@[Name](user:<id>)` is a tag (made on the platform only). */
  text: string
  edited?: string
  /** Removed by its author or a moderator: the text is gone, the place is kept. */
  deleted?: boolean
}

export interface DiscussionEvent {
  at: string
  by: Person
  status?: DiscussionStatus
  labels?: string[]
  /** Platform only. `null` is "unassigned". */
  assignee?: Person | null
}

export interface Discussion {
  id: string
  about: Anchor
  /** The element's name when the discussion started; shown once the element is gone. */
  label: string
  status: DiscussionStatus
  labels: string[]
  /** Platform only. */
  assignee?: Person
  comments: DiscussionComment[]
  events: DiscussionEvent[]
  resolution?: { by: Person; at: string; note?: string; version?: string }
}

export interface DiscussionLabel {
  id: string
  name: string
  color: CommentColor
}

// Project gets:
//   discussions?: Record<string, Discussion>
//   discussionLabels?: DiscussionLabel[]
```

**Anchors** (`discussion/anchor.ts`):

```ts
export type Anchor =
  | { kind: 'project' }
  | { kind: 'intervention'; interventionId: string }
  | { kind: 'activity'; activityId: string }
  | { kind: 'node'; activityId: string; nodeId: string }
  | { kind: 'edge'; activityId: string; edgeId: string }
  | { kind: 'group'; activityId: string; groupId: string }
  | { kind: 'concept'; system: string; code: string }
  | { kind: 'image'; imageId: string }

export function resolveAnchor(project: Project, anchor: Anchor): AnchorTarget | undefined
export function anchorLabel(project: Project, anchor: Anchor, language: string): string
export function anchorKey(anchor: Anchor): string                  // for maps and filters
export function anchorToParam(anchor: Anchor): string              // `node:weight_check/n-weight`
export function anchorFromParam(param: string): Anchor | undefined
```

- Anchors use the ids already in the files: node and edge ids are unique within their activity, so
  those anchors carry the activity id.
- `resolveAnchor` returning `undefined` means *element removed*. Nothing is rewritten: undoing the
  deletion brings the id back, and the discussion attaches again.
- Ids of discussions and comments are random (`d-` or `c-` and 10 base-36 characters), so two
  people on two branches never pick the same one.

### 2. Files

One file per discussion, plus the labels:

```
discussions/
├── labels.yaml
├── d-7k2m9q4x0a.discussion.yaml
└── d-p3c8w1n5ze.discussion.yaml
```

```yaml
id: d-7k2m9q4x0a
about: { activity: weight_check, node: n-weight }
label: Weight (kg)
status: resolved
labels: [clinical-review]
comments:
  - id: c-3h8v1w0p2k
    author: { id: 9a41c6e2-…, name: Alice Martin }
    at: 2026-10-21T09:12:00Z
    text: Is 9 kg right for children of 2 to 59 months?
  - id: c-q0z7m2r8ta
    author: { id: 5f0c11b4-…, name: Bob Keller }
    at: 2026-10-22T08:40:00Z
    text: The 2024 chart says 8 kg. Changing it.
events:
  - { at: 2026-10-21T09:12:00Z, by: { id: 9a41c6e2-…, name: Alice Martin }, labels: [clinical-review] }
  - { at: 2026-10-22T08:41:00Z, by: { id: 5f0c11b4-…, name: Bob Keller }, status: pending }
resolution:
  by: { id: 5f0c11b4-…, name: Bob Keller }
  at: 2026-10-23T14:02:00Z
  note: Threshold changed to 8 kg, as in the 2024 chart.
  version: 1.3.0
```

`about` is the link back to the element. The file is **not** inside the activity YAML, but it
still names the activity and the element:

- a node: `{ activity: weight_check, node: n-weight }`
- a connection: `{ activity, edge }`
- a group: `{ activity, group }`
- the activity itself: `{ activity }`
- an intervention, a concept (`{ system, concept }`), an image (`{ image }`), or the whole project
  (`project`)

Node ids are only unique inside one activity, so the activity id is required. Deleting the node
does not delete this file; the discussion stays and is marked *element removed*.

```yaml
# discussions/labels.yaml
labels:
  - { id: question, name: Question, color: blue }
  - { id: decision, name: Decision, color: green }
  - { id: clinical-review, name: Clinical review, color: pink }
  - { id: translation, name: Translation, color: yellow }
  - { id: problem, name: Problem, color: grey }
```

**Why one file per discussion, and not inside the activity files**

- The activity files stay about the guideline. A review in git shows clinical changes, not a page
  of chatter.
- Two people adding discussions on two branches change two different files, so git merges them
  without a conflict. Two replies to the same discussion touch the same file, as they should.
- Concepts, interventions and the project have no activity file to hold them.

**Rules**

- `PATHS.discussions = 'discussions'`. `writeProject` writes the folder in a stable order (keys as
  in the example, comments and events in time order). `isManaged` includes `discussions/`, so a
  deleted discussion's file is removed on save.
- A project without discussions writes no `discussions/` folder, so existing projects save
  byte-identically.
- `labels.yaml` is written once the project has a discussion or a label of its own. The five
  defaults are added when the first discussion is created.
- `readProject` reads `discussions/*.discussion.yaml` and `discussions/labels.yaml` with zod schemas
  (`format/schema/discussion.ts`). An unreadable file is reported and left on disk, never deleted.
- No `formatVersion` change: an older app ignores the folder, and its save leaves the folder alone
  because the folder is not managed there.
- `tricc_oo` reads only what `tricc.yaml` lists, so it never sees the folder. To be confirmed on the
  `tricc_oo` side, with a test.

### 3. The document

- Discussions live in **their own Yjs document**, `ProjectDocument.discussionDoc`, beside the
  guideline document:
  - `discussionDoc.getMap('discussions')`: one `Y.Map` per discussion; comments and events are
    `Y.Array`s, so two replies at the same time are both kept;
  - `discussionDoc.getArray('labels')`.
- `snapshot()` reads both documents. The version increases after a transaction in either one.
- `ProjectDocument.fromProject` seeds both. `fromDoc(doc, discussionDoc?)` accepts both.
- When `TriccRuntime.join` lands (`20261013-hosting-groundwork.md`), it connects **both**
  documents. Until then, the local `open` seeds both from files. The platform gives write on the
  discussion document to reviewers, and write on the guideline document only to editors.
- **Undo.** `UndoController` keeps its scope on the guideline document only, so Ctrl+Z never touches
  a discussion.
- **Writes.** `ProjectDocument.discuss(fn: (tx: DiscussionMutations) => T)` requires
  `comment.write`. `DiscussionMutations`:
  - `start(about, label, text, by, at)`, `reply`, `edit`, `remove`;
  - `setStatus(id, status, by, at, note?, version?)`, `setLabels`, `assign`;
  - `defineLabel`, `removeLabel` (also takes the label off its discussions).

  `edit` and `remove` of someone else's comment require `comment.moderate`.
- **Why a second document.** On the platform, a reviewer must be able to discuss without being able
  to change the guideline. A Yjs document cannot allow one part and refuse another. With two
  documents, the platform can give each its own rights. In the app the split costs nothing: both
  are built from the files on every open.

### 4. Capabilities (`ports/identity.ts`)

- New: `'comment.read' | 'comment.write' | 'comment.moderate'`.
- `ALL_CAPABILITIES` includes them. `READ_ONLY_CAPABILITIES` gets `comment.read`.
- New `REVIEW_CAPABILITIES`: read-only plus `comment.read` and `comment.write`. The local app's
  **Read-only** switch uses it, so one can review and comment without changing the guideline.
- **Per project.** `useCapability` (`editor/src/runtime/context.tsx`) passes the open project's id to
  `identity.capabilities({ projectId })`. `LocalIdentity` ignores the scope; the platform needs it.

### 5. The port (`ports/discussion.ts`)

The screens never write the files themselves. They call `DiscussionPort` (`start`, `reply`, and so
on). In the local app, `LocalDiscussions` turns those calls into edits of the discussion document.
The normal save then writes `discussions/*.discussion.yaml`. On the platform the same screens call
a different implementation, which sends the change to the server. The server records the signed-in
person as the author, so a name in the file cannot be faked.

```ts
export interface DiscussionPort {
  readonly id: string
  /** People can be tagged and assigned: there is a directory of members (the platform). */
  readonly people: boolean
  start(open: OpenProject, about: Anchor, text: string, labels?: string[]): Promise<string>
  reply(open: OpenProject, discussionId: string, text: string): Promise<string>
  edit(open: OpenProject, discussionId: string, commentId: string, text: string): Promise<void>
  remove(open: OpenProject, discussionId: string, commentId: string): Promise<void>
  setStatus(open: OpenProject, discussionId: string, status: DiscussionStatus, note?: string): Promise<void>
  setLabels(open: OpenProject, discussionId: string, labelIds: string[]): Promise<void>
  defineLabel(open: OpenProject, label: DiscussionLabel): Promise<void>
  removeLabel(open: OpenProject, labelId: string): Promise<void>
  /** Only when `people`. */
  assign?(open: OpenProject, discussionId: string, personId: string | null): Promise<void>
  /** Only when `people`: members who may be tagged. */
  members?(open: OpenProject, query: string): Promise<Person[]>
}
```

- **Reads** always come from `document.snapshot().discussions`, in the app and on the platform.
- `LocalDiscussions` (`@tricc/core`) implements it with `document.discuss`. The author is
  `identity.current()` (`{ id, name: displayName }`). The time comes from an injectable clock, and a
  resolution takes the project's `version`.
- `TriccRuntimeConfig.discussion` is optional and defaults to `LocalDiscussions`.
- `@tricc/core/testing` gets `testDiscussionPort`, run against `LocalDiscussions`. The platform's
  adapter runs the same suite.

**Local identity.** `LocalIdentity` gives every install a random id (`crypto.randomUUID()`, kept in
preferences) instead of `'local'`, so two people sharing a project through git stay two people.

### 6. Comment text

- Plain text, up to 10 000 characters. Line breaks are kept and web addresses become links
  (`http`, `https` and `mailto` only, `rel="noopener noreferrer nofollow"`).
- `@[Name](user:<id>)` is a tag. The app shows it as a chip with the name, and has no `@` picker
  (`people` is false). Typing "@Bob" in the app is just text.
- Rendered as React elements from a small parser (`discussion/text.ts`), never as HTML.
- Rich formatting is not in this release: comments are short, and plain text reads well in the files.

### 7. Editor (`packages/editor/src/discussion/`)

| Component | What it does |
|---|---|
| `useDiscussions(anchor?)` | Discussions of one element, or of the project, from the snapshot; open and pending counts. |
| `DiscussionBadge` | The speech bubble on nodes, groups and connection labels (open and pending only). Click: select the element, open the Discussion tab. |
| `DiscussionSection` | The list for one element, and *Start a discussion*. Used by the inspector tab, the concept page, Media and the overview. |
| `DiscussionThread` | Comments and events in time order; edit and delete one's own comments; the *element removed* banner with the saved label. |
| `Composer` | Plain-text box; Ctrl+Enter sends. |
| `StatusMenu`, `ResolveDialog` | Status change. Resolve asks for an optional note; won't change requires one. |
| `LabelPicker`, `LabelSettings` | Labels on a discussion; the project's labels in the project settings. |
| `DiscussionsPanel` | Every discussion, with filters (status, label, element removed, started by me), text search, latest activity first, and the decision log download. |

- **Inspector.** A **Discussion** tab beside Details, Nodes, Connection and Validation, with a count.
  It is shown when the identity has `comment.read`.
- Without `comment.write` there is no composer and no status menu.
- **Going to an element.** `openAnchor(anchor, discussionId?)` maps an anchor onto the workspace's
  existing callbacks: `openNode`, `openEdge`, `openConcept`, `openActivity`, the overview and Media.
  Rows in the panel use it, and so do links from the platform.
- **Link into a project.** The workspace already keeps the open activity in React state, not in
  the URL. Changing that is not needed. On open, it reads `?open=<anchorToParam>&discussion=<id>`
  once, goes there, and clears the parameters — the same pattern as `?settings=1` today.

  A platform notification stores three ids, not a screenshot of the screen: the project, the
  element (`anchorToParam`, e.g. `node:weight_check/n-weight`) and the discussion id. Clicking it
  opens `/project/<id>?open=node:weight_check/n-weight&discussion=d-7k2m9q4x0a`, which selects the
  node and opens that discussion. If the element was deleted, the panel still opens on the
  detached discussion.

  The app implements this jump first, so it can be tried from a pasted link before the platform
  exists.

### 8. Decision log (`@tricc/core`, `discussion/decision-log.ts`)

```ts
export interface DecisionRow {
  decidedAt: string
  status: 'resolved' | 'wont_change'
  element: string          // kind and name, e.g. "Node · Weight (kg) · Weight check"
  labels: string[]
  question: string         // first comment
  decision?: string        // resolution note
  decidedBy: string
  version?: string
  comments: number
}
export function decisionLog(project: Project, opts?: { since?: string; labels?: string[] }): DecisionRow[]
export function decisionLogMarkdown(project: Project, rows: DecisionRow[]): string
export function decisionLogCsv(rows: DecisionRow[]): string
```

- *Download decision log* in the Discussions panel asks for Markdown or CSV and, optionally, a start
  date. The file is `<project>-decisions-<date>.md` or `.csv`.
- Markdown groups the rows by version (newest first), then by activity.
- CSV is RFC 4180, UTF-8 with a byte-order mark so spreadsheet programs open it correctly.

### 9. App (`apps/local`)

- A **Discussions** button in the top bar, with the open count.
- The first comment with the default name asks for a display name (writes Preferences).
- The **Read-only** switch uses `REVIEW_CAPABILITIES`. Its hint says that discussions stay open.
- The palette's *Comment* becomes **Sticky note**. Test ids (`add-comment`, `comment-properties`) do
  not change.
- `docs/guide/discussions.md`: how to discuss, statuses, labels, the decision log, and what the
  platform adds.

### 10. Tests

| Scope | What |
|---|---|
| `core` format | Files → project → files is byte-identical; stable order; a project without discussions writes no folder; deleting a discussion removes its file; an unreadable file is reported and kept. |
| `core` document | Ctrl+Z after a comment leaves the comment; two replies at the same time are both kept; `discuss` refuses without `comment.write`; editing someone else's comment needs `comment.moderate`. |
| `core` anchors | Each kind resolves; a deleted node detaches, and undoing the delete reattaches; `anchorToParam` and `anchorFromParam` round trip. |
| `core` decision log | Rows, filters, Markdown and CSV (quotes, line breaks, BOM). |
| Conformance | `testDiscussionPort` on `LocalDiscussions`. |
| `editor` | Discussion tab, badge counts, composer, resolve dialog (note required for won't change), labels, tags shown as chips, no composer without `comment.write`. |
| e2e | Start a discussion on a node, answer, resolve with a note, reload: still there. Export the `.tricc`: `discussions/` is inside. Delete the node: *element removed*; undo: back. A panel row opens the node. `?open=…&discussion=…` opens the node and the discussion. Read-only: can comment, cannot move a node. Download the decision log in both formats. |

### 11. Implementation phases

**A1 — Core**

- [ ] Model types, anchors, ids.
- [ ] Zod schemas; read and write `discussions/`; `isManaged`.
- [ ] `discussionDoc`, codec, `DiscussionMutations`, `discuss`, snapshot.
- [ ] Capabilities, `REVIEW_CAPABILITIES`.
- [ ] `DiscussionPort`, `LocalDiscussions`, `testDiscussionPort`.
- [ ] Decision log functions.

**A2 — Editor**

- [ ] `useCapability` per project.
- [ ] Components of §7; the inspector tab; badges on nodes, groups and connections.
- [ ] `openAnchor`; the `?open=` and `?discussion=` entry.

**A3 — App and docs**

- [ ] Top-bar button and panel, name prompt, Read-only with review capabilities, random local id.
- [ ] Decision log download; label settings; *Sticky note* in the palette.
- [ ] `docs/guide/discussions.md`; e2e suite of §10.

### 12. Acceptance criteria

- A discussion can be started on every anchor kind, answered, given a status and labels, and
  resolved with a note.
- Discussions are in the saved folder, the `.tricc` export and the files a pull request proposes.
  Reopening the project shows them unchanged.
- A project without discussions saves byte-identically to before.
- Ctrl+Z never removes or changes a comment.
- A discussion survives the deletion of its element and attaches again on undo.
- Read-only allows discussions and refuses guideline changes, at the document layer as well as in
  the UI.
- The decision log downloads as Markdown and CSV, and holds every resolved and won't-change
  discussion.
- `tricc_oo` converts a project with discussions exactly as one without.

### 13. Open points

- One file per discussion in `discussions/` (proposed), or the discussions inside each activity
  file? The reasons for the first are in §2.
- Should resolved discussions show a muted badge on the canvas, or none (proposed: none; they are in
  the tab and the panel)?
- Who may delete a whole discussion in the app: its starter while nobody has answered (proposed),
  or anyone with `comment.write`?
- Later: turning a sticky note into a discussion; links to other elements inside a comment; rich
  formatting.
