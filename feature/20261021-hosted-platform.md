# Hosted platform: accounts, organisations, roles, live editing, discussions and notifications

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_frontend`. New: `apps/platform`, `services/*`, `packages/adapters-hosted`, `packages/platform-shared`, `infra/`. The libraries and `apps/local` keep working without a server. |
| **Related** | `20261013-hosting-groundwork.md` (the library changes this builds on: blob port, `TriccRuntime.join`), `20260825-library-architecture.md` (ports, capabilities), `20260825-document-model.md` (CRDT, undo, presence), `20261009-canvas-comments-and-groups.md` (the sticky notes, which this does not replace), `20260825-guided-authoring.md` (authoring roles: a focus, never a permission) |
| **Source** | 2026-10-21: turn the editor into an online platform. People create accounts and have roles. They comment on elements that exist, tag other people, give a comment a status such as pending or resolved, and record why a change was made. People are told in the app when someone tags them. Secure enough to be served online. |
| **Decisions** | 2026-10-21: the platform lives **in this monorepo**. This overrides the separate `tricc_platform` repo chosen on 2026-10-13, which was never created. **Organisations** own projects. **Open sign-up** with a verified email; a new account sees nothing until someone invites it. **Live co-editing** in the first release. Notifications **in the app and by email**, with settings per person. Kept from 2026-10-13: Keycloak (OIDC) for identity, Postgres for data, Hocuspocus for the shared Yjs document, Docker Compose packaging. |
| **Approval** | — |

---

## Part I — Business description

### What changes

Today the editor runs on one computer. A project is kept in the browser or in a folder, and
sharing it means sending a file or using git. The platform puts projects online. A team works on
the same guideline at the same time, discusses it in place, and keeps a record of what was decided.

The local app stays as it is, for people who want files and no server.

### Accounts

- Anyone can create an account with an email address and a password. The email must be confirmed
  before the account can be used.
- A new account sees nothing until someone invites it to an organisation or a project.
- Forgotten passwords are reset by email. A second factor (an authenticator app or a passkey) is
  available to everyone, and required for administrators.
- A person can change their name and colour, see where they are signed in, sign out everywhere,
  download their data, and delete their account.

### Organisations and projects

An **organisation** is a team, for example Swiss TPH or a ministry programme. It owns projects.
People join an organisation by invitation.

A project is **private** (only its members see it) or visible to the **whole organisation** (every
member can read it). A person from outside the organisation, such as an external clinical
reviewer, can be invited to one project only. They see that project and nothing else.

### Roles

Each person has one role per project.

| A person can… | Viewer | Reviewer | Editor | Owner |
|---|:-:|:-:|:-:|:-:|
| Open the guideline, export it, read discussions | ✓ | ✓ | ✓ | ✓ |
| Start and answer discussions, tag people, set a status | | ✓ | ✓ | ✓ |
| Change the guideline (diagram, data dictionary, media) | | | ✓ | ✓ |
| Invite people, change roles, rename or delete the project | | | | ✓ |
| Edit or remove someone else's comment | | | | ✓ |

Organisation **owners** and **admins** are owners of every project in their organisation. An
organisation **member** is a viewer of the projects visible to the organisation, and a member can
create new projects.

These roles say what a person *may* do. They are not the authoring roles (clinical, technical,
terminology), which only choose what the editor shows first and never refuse anything.

### Discussions

A **discussion** is a conversation about one element of the guideline: a node, a connection, a
group, an activity, an intervention, a concept in the data dictionary, an image, or the project
as a whole.

- Any node, connection or concept with a discussion shows a small speech bubble with a count.
  Selecting the element shows its discussions in a **Discussion** tab next to Details.
- A **Discussions** panel lists every discussion of the project. It can be filtered: open,
  pending, resolved, tagged me, assigned to me, element removed.
- Typing `@` in a comment offers the members of the project. The person tagged is told.
- Each discussion has a **status**:
  - **Open**: new, needs attention.
  - **Pending**: waiting for an answer, a decision or a change.
  - **Resolved**: answered or changed. The person resolving it can say why.
  - **Won't change**: decided against. The reason is required.

  A discussion can be reopened. Every status change is shown in the discussion, with who did it
  and when.
- **Labels** such as *Question*, *Decision*, *Clinical review* or *Translation* sort discussions.
  Each organisation keeps its own list.
- A discussion can be **assigned** to one person: the one it is waiting for.
- If the element is deleted, its discussions stay. They are marked *element removed* and keep the
  element's name, so nothing is lost. If the deletion is undone, they attach again.

The sticky notes that exist today stay. They are part of the drawing and are saved in the project
files. Discussions are not saved in the files: they belong to the platform, with their authors
and dates. To avoid two things called "comment", the sticky note is called a **Note** in the menus.

### Being told

- A bell in the top bar shows how many notifications are unread. It updates live.
- Clicking a notification opens the project at the element, with the discussion open. For
  example: "Alice Martin tagged you in a discussion on *Weight (kg)*, IMCI 2–59 months".
- People are told when they are tagged, when a discussion they take part in gets an answer or a
  new status, when one is assigned to them, and when they are invited or their role changes.
- Tags and assignments also arrive by email, a couple of minutes later and grouped. Each person
  chooses, per kind: email at once, a daily summary, or the app only. Every email has a one-click
  unsubscribe.

### Editing together

Several people edit the same activity at the same time. Each sees who else is in the project and
which node they have selected. Undo only takes back one's own changes. When the connection drops,
the editor says so, keeps the changes, and sends them when it comes back.

### History, and why a change was made

- The platform keeps versions of the project as people work. An owner can also save a **named
  version**, for example "Sent for the March review".
- Any version can be opened read-only, downloaded as a `.tricc` file, or restored. A restore is one
  new change that everyone sees and that can be undone.
- When a discussion is resolved, it is linked to the version where the change was made. A named
  version lists the discussions resolved since the previous one. That list is the **decision
  log**, and it can be downloaded.
- An activity log records who invited whom, role changes, deletions, restores and exports.

### Not in the first release

Readable "what changed" between two versions, git sync from the server, conversion with
`tricc_oo` on the server, public links, sign-in with an institution's account, and offline
editing. See Part II §17.

---

## Part II — Technical specification

### 1. What the code provides today (checked 2026-10-21)

| Need | State |
|---|---|
| Identity and capabilities behind a port | Yes. `IdentityPort` and `CAPABILITIES` (`ports/identity.ts`). `ProjectDocument.transact` refuses writes without `project.write` (`document/doc.ts`). |
| Capabilities per project | The port takes `Scope.projectId`, and `TriccRuntime.open` passes it. **`useCapability` (`editor/src/runtime/context.tsx`) calls `capabilities()` without a scope**, so hosted it would show one answer for every project. |
| Opening a shared document | `CollaborationPort` exists but nothing calls `connect`. `TriccRuntime.open` always seeds from files. Groundwork §3 (`join`) is not built. |
| Images | Bytes inside the CRDT. Groundwork §2 (`BlobPort`) is not built. |
| Comments | Sticky notes in the activity's `ui.comments`, with no author, date, replies or status. They are saved in the files. |
| Links to an element | The open activity, node, concept and view are React state in `apps/local/src/App.tsx` (`ProjectWorkspace`). No URL can point at a node, so a notification cannot link to one. |
| Server, accounts, email | None. |

### 2. Architecture

```
Browser: apps/platform (React, @tricc/editor, @tricc/adapters-hosted)
   │  HTTPS, one origin, behind Caddy
   ├── /          the web app (static files)
   ├── /api/*     services/api      Fastify: sign-in (BFF), organisations, projects, members,
   │                                invitations, discussions, notifications, images, events (SSE)
   ├── /collab    services/collab   Hocuspocus: one Yjs document per project
   └── /auth/*    Keycloak          sign-up, sign-in, email check, password reset, second factor

               services/worker      outbox: email, digests, versions, image sweep
               Postgres             app database, and a separate Keycloak database
               SMTP                 transactional email (Mailpit in development)
```

Repository layout:

```
apps/
├── local/                unchanged
└── platform/             @tricc/app-platform: the hosted web app
packages/
├── core/                 + Anchor, DiscussionPort, BlobPort, new capabilities, join, replaceProject
├── editor/               + ProjectWorkspace (moved from apps/local), discussion UI, presence
├── adapters-local/       + local BlobPort
├── adapters-memory/      + memory DiscussionPort, BlobPort, a linked pair of collaboration ports
├── adapters-hosted/      @tricc/adapters-hosted: the ports over the API and Hocuspocus (browser)
└── platform-shared/      @tricc/platform-shared: API contracts (zod), role → capabilities,
                          comment body schema; used by browser and server
services/
├── db/                   @tricc/server-db: Drizzle schema, migrations, query helpers
├── api/                  @tricc/api
├── collab/               @tricc/collab
└── worker/               @tricc/worker
infra/
├── compose.yaml          development: postgres, keycloak, mailpit, api, collab, worker, web
├── compose.prod.yaml
├── Caddyfile
└── keycloak/             realm export, TRICC login theme and email templates
```

- `pnpm-workspace.yaml` adds `services/*`. Turbo gets `dev` and `test:integration` tasks.
- `services/*` never import `@tricc/editor` or React (lint rule, like `core`).
- The server reuses `@tricc/core` to seed, read and validate documents: `readProject`,
  `ProjectDocument.fromProject`, `writeProject`, `toArchive`, `resolveAnchor`. This is the reason
  for a TypeScript backend.

| Concern | Choice | Why |
|---|---|---|
| API | Node 22, TypeScript, Fastify 5 | Same language as `@tricc/core`. Schema validation, and maintained security plugins (`@fastify/helmet`, `@fastify/rate-limit`, `@fastify/cookie`). |
| Database | Postgres 16, Drizzle ORM, drizzle-kit migrations | Typed queries; SQL migrations reviewed in git. |
| Shared document | Hocuspocus 2 | Yjs server with an auth hook, read-only connections, a database extension, and Redis scaling later. |
| Identity | Keycloak 26 | Sign-up, email check, reset, second factor, passkeys, brute-force protection and later institutional sign-in, none of it written by us. |
| OIDC client | `openid-client` | Certified implementation. |
| Email | Nodemailer over SMTP | Any provider. |
| Web | Vite, React 18, react-router, as `apps/local` | Same toolchain. |

### 3. Identity and sessions

**Keycloak realm `tricc`**, committed as `infra/keycloak/realm-tricc.json` and imported on start:

- registration on, sign-in with email, **verify email required**, reset password;
- password policy: at least 12 characters, not the email, not one of the last 5;
- brute-force detection on (temporary lockout);
- a CAPTCHA on registration, because sign-up is open;
- required action *Terms and Conditions* on first sign-in; the accepted version is recorded;
- TOTP and passkeys (WebAuthn) for everyone; **required** for platform admins and organisation
  owners (checked by the API from the `acr`/`amr` claims, not only by Keycloak);
- a TRICC theme for the sign-in pages and the emails Keycloak sends;
- one realm role, `platform-admin`. Organisation and project roles are **in the app database**:
  they are data the app lists, searches and changes often.

**The browser never holds a token** (backend-for-frontend, as advised by *OAuth 2.0 for
Browser-Based Applications*):

1. `GET /api/auth/login?returnTo=/…` redirects to Keycloak: authorization code with PKCE; `state`
   and `nonce` in a signed cookie that lasts 10 minutes. `returnTo` must be a relative path
   (no open redirect).
2. `GET /api/auth/callback` exchanges the code, verifies the ID token, and creates or updates the
   `users` row by Keycloak `sub` (accounts are created on first sign-in).
3. It sets `__Host-tricc_session`: a random 256-bit id, `HttpOnly; Secure; SameSite=Lax; Path=/`.
   The `sessions` table keeps the id **hashed** and the refresh token **encrypted** (AES-256-GCM,
   key from the environment). Idle timeout 8 hours, absolute 7 days. A new id at every sign-in.
4. `POST /api/auth/logout` revokes the refresh token, deletes the session and ends the Keycloak
   session. Keycloak back-channel logout deletes the sessions and closes collab connections.
   *Sign out everywhere* deletes all of a person's sessions.
5. `GET /api/me`: identity, organisations, platform role.

**CSRF.** Session cookie `SameSite=Lax`. Every request that changes something must send the
header `X-Tricc-Request: 1` and an `Origin` equal to the app's. CORS is off, so another site cannot
send that header.

### 4. Organisations, projects, members, invitations

```
users                 id, keycloak_sub (unique), email, display_name, colour, timezone,
                      created_at, deleted_at
organisations         id, slug (unique), name, created_by, created_at, deleted_at
organisation_members  organisation_id, user_id, role: owner | admin | member
projects              id, organisation_id, slug, name, visibility: private | organisation,
                      created_by, created_at, deleted_at          unique (organisation_id, slug)
project_members       project_id, user_id, role: owner | editor | reviewer | viewer
invitations           id, organisation_id, project_id?, email, role, token_hash, invited_by,
                      expires_at, accepted_at, revoked_at
sessions              id_hash, user_id, refresh_token_enc, created_at, last_seen_at, expires_at
```

- **Effective project role:** the highest of the `project_members` role; *owner* for organisation
  owners and admins; *viewer* for organisation members when the project is visible to the
  organisation. One function, `effectiveRole(userId, projectId)`, in `services/db`.
- **Guests:** a `project_members` row without an `organisation_members` row. They see only that
  project.
- **Invitations:** by email, with a role, to the organisation or to one project. The link carries a
  random token, kept hashed, single use, valid 7 days. To accept, the person signs in with a
  **verified email equal to the invitation's**. An existing account is also told in the app.
  Owners see pending invitations and can revoke them.
- **Organisations:** any verified account can create one and becomes its owner, up to a limit
  (default 3; a platform admin can raise it). See §18.
- **Deleting:** a project is soft-deleted for 30 days (an organisation admin can restore it), then
  purged with its document, versions, discussions and image references. An organisation can be
  deleted once it has no projects.
- **Creating and importing.** Create, or import a `.tricc` archive or a project folder (the same
  `normalizeImport` and `readProject` as the local app). Limits: 50 MB per import.

### 5. Roles, capabilities, and where they are enforced

New capabilities in `ports/identity.ts`:

```ts
'comment.read' | 'comment.write' | 'comment.moderate'
```

`project.share` (hosted only) already exists: it now means managing members and invitations.

| Capability | Viewer | Reviewer | Editor | Owner |
|---|:-:|:-:|:-:|:-:|
| `project.read`, `project.export`, `terminology.read`, `comment.read` | ✓ | ✓ | ✓ | ✓ |
| `comment.write` (start, answer, tag, status, labels, assignee) | | ✓ | ✓ | ✓ |
| `project.write`, `terminology.write` | | | ✓ | ✓ |
| `project.share`, `project.delete`, `settings.write`, `comment.moderate` | | | | ✓ |

`roleCapabilities(role)` in `@tricc/platform-shared` is the only mapping. Server and browser both
use it.

**Three layers enforce it:**

1. **API: the real boundary.** Every route declares the capability it needs. A `preHandler`
   resolves the effective role from the database for (user, project). No access at all returns
   **404**, so the project's existence is not revealed; access without that capability returns
   **403**. A route that declares nothing fails a startup check (deny by default). Queries take the
   project and organisation ids from the checked path, never from the body.
2. **Collab server.** A connection without `project.write` is read-only: Hocuspocus drops its
   document updates.
3. **Browser.** `HostedIdentity.capabilities({ projectId })` returns the role's set.
   `ProjectDocument` and `useCapability` gate the UI. `useCapability` is changed to pass the open
   project's id.

**Limitation, stated on purpose.** A Yjs document has no per-field permissions. The server can
tell *may write* from *may not*, but not *may write the dictionary but not the diagram*. So no role
has `terminology.write` without `project.write` in this release. A terminology-only role needs the
dictionary in its own Yjs document (§17).

Authoring roles (`clinical`, `technical`, `terminology`) stay a per-person preference and never
refuse.

### 6. Live co-editing

- **Seeded once.** On create and import, the API builds the document a single time,
  `ProjectDocument.fromProject(project).encodeState()`, and stores it. Clients only `join`
  (groundwork §3). Two clients seeding the same files would duplicate every node.
- **Ticket.** The browser calls `POST /api/projects/:id/collab-ticket` and gets a JWT signed by the
  API (EdDSA, 60 seconds, `sub`, `project`, `role`, `jti`). `HostedCollaboration.connect` passes it
  as the Hocuspocus `token`. `onAuthenticate` checks the signature, expiry and single use, reads the
  membership again from the database, and sets `connection.readOnly`.
- **Losing access.** A role change, a removal or a sign-out publishes a Postgres `NOTIFY`. The collab
  server closes that person's connections to the project. The client asks for a new ticket and
  comes back with the new role, or not at all.
- **Storage.** `@hocuspocus/extension-database` reads and writes
  `project_documents (project_id, state bytea, updated_at)`. Writes are debounced (2 s, at most
  10 s) and flushed on shutdown. `document_activity (project_id, user_id, at, bytes)` records who
  edited when.
- **Size guard.** An update that would take the document over the project quota (default 50 MB) is
  refused.
- **Presence.** The participant list comes from the server's connection context, so a name cannot be
  faked. Awareness carries only the selection (`activityId`, `nodeId`). The top bar shows avatars,
  and a node selected by someone else gets a ring in their colour.
- **Connection state.** *Live*, or *Reconnecting… your changes will be sent*. Closing the tab with
  unsent changes asks first. The hosted app keeps no copy of the document in browser storage in
  this release.
- **Undo** already tracks only local origins (`document/undo.ts`). Unchanged.
- **Saving.** With a session there is nothing to save: `hasUnsavedChanges` is false (groundwork §3),
  and the save indicator shows the connection state instead.

### 7. Discussions

#### 7.1 Anchors (`@tricc/core`, `discussion/anchor.ts`)

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
```

Anchors use the stable ids already in the files. When `resolveAnchor` returns `undefined`, the
discussion is *detached*: it keeps its saved label and stays in the panel. Undoing the deletion
brings the same id back, so it attaches again. The server computes the label from the stored
document; it does not trust one sent by the browser.

#### 7.2 Port (`@tricc/core`, `ports/discussion.ts`)

```ts
export interface DiscussionPort {
  readonly id: string
  list(projectId: string, filter?: ThreadFilter): Promise<ThreadSummary[]>
  get(threadId: string): Promise<Thread>
  create(projectId: string, anchor: Anchor, body: CommentBody, opts?: NewThreadOptions): Promise<Thread>
  reply(threadId: string, body: CommentBody): Promise<Comment>
  edit(commentId: string, body: CommentBody): Promise<Comment>
  remove(commentId: string): Promise<void>
  setStatus(threadId: string, status: ThreadStatus, note?: string, versionId?: string): Promise<Thread>
  setLabels(threadId: string, labelIds: string[]): Promise<Thread>
  assign(threadId: string, userId: string | null): Promise<Thread>
  labels(projectId: string): Promise<Label[]>
  /** People who may be tagged: members with `comment.read`. Never a wider directory. */
  members(projectId: string, query: string): Promise<Member[]>
  watch(projectId: string, onEvent: (event: DiscussionEvent) => void): () => void
}
```

- `TriccRuntimeConfig` gets an optional `discussion`. Without it (the local app) the discussion UI
  is not shown.
- `adapters-memory` implements it. `@tricc/core/testing` gets `testDiscussionPort`, which the memory
  and hosted adapters both run.

#### 7.3 Data

```
threads             id, project_id, anchor jsonb, anchor_label, status, assignee_id?,
                    created_by, created_at, updated_at,
                    resolved_by?, resolved_at?, resolution_note?, version_id?
comments            id, thread_id, author_id, body jsonb, created_at, edited_at?, deleted_at?
comment_mentions    comment_id, user_id
labels              id, organisation_id, name, colour
thread_labels       thread_id, label_id
thread_subscribers  thread_id, user_id, muted
thread_events       id, thread_id, actor_id, kind, from, to, at
                    kind: created | status | labels | assignee | detached | attached
```

- Indexes on `(project_id, status, updated_at)` and on `anchor->>'activityId'`.
- New organisations get the labels Question, Decision, Clinical review, Translation and Problem.
- `thread_status`: `open | pending | resolved | wont_change`. `wont_change` requires a note.

#### 7.4 Comment body

- A small TipTap / ProseMirror schema: paragraph, bold, italic, code, link, bullet and ordered
  lists, `mention { userId }`, `element { anchor }`. At most 10 000 characters.
- Stored as JSON, never as HTML. The server validates it with the zod schema in
  `@tricc/platform-shared`.
- **The server extracts mentions from the body.** It never takes a list of mentions from the client,
  and drops a mention of someone who cannot read the project.
- Rendered by React from the JSON, with no `dangerouslySetInnerHTML`. Links: only `http`, `https` and
  `mailto`, with `rel="noopener noreferrer nofollow"`.
- The composer reuses the editor's TipTap setup (`packages/editor/src/text/`) with
  `@tiptap/extension-mention`, which suggests `members(projectId, query)`.

#### 7.5 Rules

- `comment.write`: start, answer, set status, labels, assignee.
- An author can edit their comment (shown as *edited*) and delete it (shown as *Comment deleted*, so
  the discussion still reads). `comment.moderate` does the same to anyone's.
- Starting or answering a discussion, or being tagged in it, subscribes a person. Anyone can mute
  a discussion.
- Every status, label and assignee change writes a `thread_event`, shown in the discussion.
- The UI reminds people not to put patient data in comments; the terms say so too.

#### 7.6 Live updates

`GET /api/events?project=<id>` is a Server-Sent Events stream authenticated by the session cookie.
It sends `thread.*` and `comment.*` events for that project (checked against `comment.read` when it
opens), and the person's own `notification.created`. Events go between API instances through
Postgres `LISTEN/NOTIFY`, so more than one instance works. Reconnection resumes from
`Last-Event-ID`.

#### 7.7 UI (`packages/editor/src/discussion/`)

- **Canvas:** a speech-bubble badge with the open and pending count on nodes, connections and groups.
  Clicking it opens the Discussion tab.
- **Inspector:** a **Discussion** tab beside Details, Nodes, Connection and Validation. It shows the
  selected element's discussions, or the activity's when nothing is selected, and *Start a
  discussion*.
- **Concept page and Media:** the same component.
- **Discussions panel:** a top-bar button with a count. Filters: status, label, tagged me, assigned to
  me, element removed. Sorted by latest activity. A row opens the element.
- **Discussion:** comments and status changes in time order, the composer, a status menu,
  *Resolve with a note*, labels and assignee. A viewer sees everything but has no composer.

**Prerequisite: links to elements.** `ProjectWorkspace` moves from `apps/local/src/App.tsx` into
`@tricc/editor`, and its view state moves into the URL:
`/o/:org/p/:project/a/:activity?node=…&edge=…&concept=…&thread=…`. The shell passes a small router
adapter, so `apps/local` keeps its routes (and its hash router on Pages).

### 8. Notifications

```
notifications          id, user_id, kind, project_id?, thread_id?, comment_id?, actor_id?,
                       data jsonb, created_at, read_at?
notification_settings  user_id, kind, channel: email_now | email_daily | app_only
outbox                 id, kind, payload jsonb, available_at, attempts, processed_at, error
```

| Event | Who is told | In the app |
|---|---|---|
| Tagged in a comment | the person tagged | "Alice Martin tagged you in a discussion on *Weight (kg)*, IMCI 2–59 months" |
| Answer in a discussion | its subscribers, unless muted | "Alice Martin answered a discussion you follow on …" |
| Status changed | its subscribers | "Alice Martin resolved a discussion on …" |
| Assigned | the assignee | "Alice Martin assigned you a discussion on …" |
| Invited | the person invited (email; in the app if the account exists) | "Alice Martin invited you to *IMCI* as Reviewer" |
| Role changed or removed | that person | "Your role in *IMCI* is now Editor" |

- The person who acted is never told. Someone tagged who also follows the discussion gets one
  notification (the tag). Editing a comment tells only people newly tagged.
- Access is checked again at delivery. Someone who lost access is not told.
- **Transactional outbox.** The API writes the comment, its notifications and its outbox rows in one
  transaction, so there is never a comment without its notifications, or the reverse.
- **In the app:** the bell's count is live (§7.6). The list shows unread first. Clicking marks it
  read and opens the element with the discussion. *Mark all as read*. A `/notifications` page with
  filters. Kept 180 days.
- **Email (worker):**
  - *At once* waits 2 minutes and groups everything for one person into one email, so a quick edit
    or deletion is respected.
  - The *daily summary* goes at 08:00 in the person's timezone, and only when something is unread.
  - Defaults: tags and assignments at once; everything else in the app only.
  - Content: who, where (project, activity, element), the first 300 characters as plain text, and a
    link. An organisation can turn the excerpt off.
  - Footer: why this email came, a link to the settings, and a one-click unsubscribe (signed token,
    `List-Unsubscribe` and `List-Unsubscribe-Post`).
  - Retries with backoff; failures logged. SPF, DKIM and DMARC on the sending domain.

### 9. History, versions and audit

- **Versions.** The worker stores the full document state when edits settle (5 minutes without an
  edit, at most once an hour per project) in
  `project_versions (id, project_id, state bytea, kind: auto | named, label?, note?, created_by?, created_at)`.
  Automatic versions are thinned: all of them for 7 days, then one a day for 90 days. Named
  versions are kept.
- **Restore.** A version opens read-only. *Restore this version* replaces the content of the live
  document in one transaction, which everyone sees and which can be undone. Library:
  `Mutations.replaceProject(project)`, which writes only what differs. It is also useful to the
  local app for loading a branch.
- **Download** any version as a `.tricc` archive (server-side `writeProject` and `toArchive`).
- **Decision log.** Resolving a discussion links a version (by default the latest). A named version
  lists the discussions resolved since the previous named one. Download as Markdown or CSV.
- **Audit log.**
  `audit_events (id, at, actor_id, organisation_id?, project_id?, action, target jsonb, ip, user_agent)`.
  It records sign-ins, membership, role and invitation changes, project create, import, rename,
  delete and restore, version restores, exports, discussion status changes, moderation, and admin
  actions. It is **append-only**: the app's database user has `INSERT` and `SELECT` only on that
  table. Organisation owners see their organisation's log; platform admins see all of it.

### 10. Images

- Groundwork §2: images by sha256 behind `BlobPort`. `HostedBlobs` uses
  `PUT /api/projects/:id/blobs` (returns the hash) and `GET /api/projects/:id/blobs/:sha`.
  `blobs (sha256, content_type, size, bytes)` and `project_blobs (project_id, sha256)`. S3-compatible
  storage later.
- Upload: the type is checked from the bytes, not the name, against the existing `IMAGE_TYPES`.
  At most 5 MB per image, plus a project quota.
- **An SVG can carry a script.** The server sanitizes every SVG on upload (DOMPurify, SVG profile)
  and refuses one that does not parse.
- Every blob is served with `X-Content-Type-Options: nosniff`,
  `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox` and
  `Cross-Origin-Resource-Policy: same-origin`, only to people who can read a project that uses it.
- The worker deletes blobs that no project and no version has used for 30 days.

### 11. Security baseline (all required before launch)

**Transport and browser**

- [ ] HTTPS only (Caddy, automatic certificates), TLS 1.2 or newer, HSTS.
- [ ] One origin for the app, the API and the collab server; CORS off.
- [ ] CSP: `default-src 'self'; script-src 'self'; connect-src 'self' wss://<host>;
      img-src 'self' blob: data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`.
      Aim for `style-src 'self'`: TipTap is configured with `injectCSS: false`, and a library that
      still injects a `<style>` gets a nonce. Checked in P1.
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`,
      `Cross-Origin-Opener-Policy: same-origin`.

**Application**

- [ ] Deny by default; one declared capability per route; the role matrix test (§14) covers every
      route.
- [ ] UUIDs for every id; another organisation's id returns 404.
- [ ] Every body validated with zod from `@tricc/platform-shared`. Size limits: 1 MB per API
      request, 50 MB per import, the document quota for Yjs updates.
- [ ] Rate limits per IP and per person: 300 requests a minute in general, 30 comments a minute,
      30 invitations an hour, 60 collab tickets a minute. Keycloak handles sign-in attempts.
- [ ] No secrets in the repository (`.env.example` only). Session key, ticket signing key, OIDC
      client secret and SMTP password come from the host's secret store and can be rotated.
- [ ] Logs never contain tokens, cookies, comment text or document content. Request ids instead.
- [ ] No git tokens kept by the hosted app (same rule as `20261015-git-host-import-and-pull-requests.md`).
      The local app's git features are not part of the platform's first release.

**Supply chain**

- [ ] Renovate or Dependabot; `pnpm audit` and CodeQL in CI; Trivy on the images.
- [ ] Pinned base images, containers run as non-root, read-only file systems where possible.

**Process**

- [ ] A threat-model review before launch.
- [ ] An external penetration test before the first organisation outside Swiss TPH.
- [ ] `/.well-known/security.txt` and a disclosure address.

### 12. Privacy and data protection (GDPR, Swiss FADP)

- Kept: account (name, email), memberships, contributions, audit events. The only cookie is the
  session cookie, so no cookie banner is needed; the privacy notice says so.
- Privacy notice, terms of use and imprint, accepted at sign-up (Keycloak required action, version
  recorded).
- **Delete my account** (self-service): removes the account in Keycloak and in the app. Comments stay
  and show *Deleted user*, so discussions still read. The last owner of an organisation must hand
  it over first.
- **Download my data:** profile, memberships, comments and notifications, as JSON.
- Retention: notifications 180 days; sessions until they expire; audit events 2 years; deleted
  projects 30 days; versions as in §9.
- Hosting in Switzerland or the EU (§18).

### 13. Operations

- **Environments.** Development (`infra/compose.yaml`, Mailpit, Keycloak with seeded test accounts),
  staging (same images, own database, test email), production.
- **Deploy.** CI builds the images on a tag and pushes them to GHCR. Production runs
  `compose.prod.yaml` on a VM behind Caddy; Kubernetes only if load requires it. Migrations run as a
  one-off job before the new API starts, and stay compatible with the previous release (expand, then
  contract).
- **Backups.** Postgres with point-in-time recovery (at least 14 days: managed service or
  pgBackRest), plus a nightly encrypted dump kept off-site. The Keycloak database is included. A
  restore is tested every quarter and written down. Targets: lose at most 15 minutes; back within
  4 hours.
- **Observability.** JSON logs (pino) with request ids. `/healthz` (alive) and `/readyz` (database
  and Keycloak reachable). Prometheus metrics: requests, latency, collab connections, outbox lag,
  email failures. Error tracking (Sentry protocol; GlitchTip can be self-hosted) for the server and
  the browser through `TelemetryPort`, with personal data removed. An uptime check, and alerts on
  error rate, outbox lag, disk and failed backups.
- **Graceful shutdown.** Collab flushes its documents; the API closes SSE streams cleanly.
- **Quotas** in configuration: projects per organisation, document size, image size, members per
  project.
- **Admin console** (`/admin` in `apps/platform`, `platform-admin` only): organisations, accounts
  (disabling one also signs it out), quotas, the audit log.

### 14. Tests

| Scope | What |
|---|---|
| `core` | Anchor resolution, detach and attach; `replaceProject` round trip; new capabilities. |
| Conformance | `testDiscussionPort`, `testBlobPort`, `testCollaborationPort`, run by the memory and the hosted adapters. |
| `platform-shared` | Role → capability table; comment body schema (refuses scripts, `javascript:` links, oversize); mention extraction. |
| API integration | Vitest, Testcontainers Postgres, a fake OIDC issuer. **The role matrix:** every route × every role × "another organisation" → expected status. Invitations (wrong email, expired, reused). Notification rules. The outbox delivers once. |
| Collab | A reviewer's forged update never reaches the stored document or another client. Removal closes the connection. Two clients converge. A project is seeded once. |
| E2E | Playwright against the compose stack: sign up and confirm the email in Mailpit; create an organisation; invite a reviewer; two browsers edit together and see each other; the reviewer tags the editor, whose bell shows it and who gets the email; resolve with a note; a viewer cannot edit in the UI, and a forged write is refused; a notification link opens the node and the discussion. |
| Security | OWASP ZAP baseline scan against staging in CI. An XSS corpus through comments, names, labels and SVG uploads. |

### 15. Implementation phases

Each phase ends with its tests green and the local app unchanged (existing e2e suite).

**P0 — Library groundwork (packages only)**

- [ ] `20261013-hosting-groundwork.md`: `BlobPort`, images by hash, undo covers images,
      `TriccRuntime.join`, blob and collaboration conformance suites.
- [ ] New capabilities; `useCapability` scoped to the open project.
- [ ] `Anchor`, `resolveAnchor`, `anchorLabel`; `DiscussionPort`; memory adapter;
      `testDiscussionPort`.
- [ ] `Mutations.replaceProject`.
- [ ] `ProjectWorkspace` moved into `@tricc/editor` with view state in the URL; `apps/local` uses it.

**P1 — Foundation: accounts, organisations, projects, roles, editing together**

- [ ] `infra/`: compose files, Caddy, Keycloak realm and theme, Mailpit.
- [ ] `services/db`: schema of §4, `effectiveRole`, migrations.
- [ ] `services/api`: sign-in (BFF), `/me`, organisations, projects (create, import, export, rename,
      delete), members, invitations, audit, collab tickets, images; the transport and application
      items of §11; the role matrix test.
- [ ] `services/collab`: tickets, read-only, closing on access loss, storage, presence.
- [ ] `packages/platform-shared`, `packages/adapters-hosted` (identity, catalog, collaboration,
      blobs).
- [ ] `apps/platform`: sign-in, home, organisation pages, members and invitation dialogs, the
      workspace, presence, connection state, account settings.

**P2 — Discussions**

- [ ] Schema of §7.3; API routes; SSE events.
- [ ] Hosted `DiscussionPort`.
- [ ] Editor: badges, Discussion tab, Discussions panel, composer with tags, status, labels,
      assignee, *Note* rename of the sticky note.

**P3 — Notifications**

- [ ] Schema of §8; fan-out in the comment transaction; outbox.
- [ ] Bell, list, `/notifications`, settings.
- [ ] `services/worker`: immediate and daily emails, templates, unsubscribe.

**P4 — Ready for production**

- [ ] Versions, restore, version download, decision log.
- [ ] Backups and a tested restore; observability and alerts; CI/CD to staging and production.
- [ ] Privacy: delete my account, download my data, legal pages.
- [ ] Admin console.
- [ ] The supply-chain and process items of §11; a load test (30 people on one project, 200 people
      connected).

**Launch** when P0 to P4 are done and §16 holds.

### 16. Acceptance criteria

- A person signs up, confirms their email and sees nothing until invited.
- Every API route refuses a role it does not allow (the matrix test), and another organisation's
  project returns 404.
- A viewer or reviewer cannot change the document, through the UI or by sending a forged Yjs
  update.
- Removing a member closes their live connection within seconds.
- Two people edit one activity at once, see each other, and converge.
- A discussion can be started on every anchor kind, survives the deletion of its element, and
  attaches again when the deletion is undone.
- Tagging a person creates exactly one in-app notification and, with the default settings, one
  email. Its link opens the element and the discussion.
- A version can be restored, and the restore can be undone.
- A database restore from backup has been done on staging.
- The local app behaves exactly as before, and its e2e suite passes unchanged.

### 17. Later (not in this spec)

- **Readable history**: the semantic diff of groundwork §9, to show what changed between versions,
  by element.
- **Git from the server**: import, sync and pull requests, as the local app does, with a GitHub or
  GitLab app instead of personal tokens.
- **Conversion on the server**: a `tricc_oo` worker (Python) building XLSForm, CHT and the other
  targets, and feeding the preview.
- Public read-only links; project templates; data dictionaries shared between projects
  (groundwork §9).
- Sign-in with an institution's account (Keycloak identity brokering: Microsoft Entra, Google,
  eduGAIN).
- A terminology-only role (the dictionary in its own Yjs document).
- Scaling out: the Hocuspocus Redis extension, several API instances, object storage for images.
- Offline editing in the hosted app.
- Notifications to Teams, Slack or browser push.

### 18. Open points

- Hosting provider and region (Switzerland or the EU), and who runs it.
- Who may create organisations: any verified account up to a limit (proposed), or only after a
  platform admin approves?
- Renaming the sticky note to *Note* in the menus (proposed), and whether a note can be turned into
  a discussion.
- Version retention: are 7 days of all versions and 90 days of daily ones enough?
- Email excerpts on by default (proposed), or off for organisations with confidential guidelines?
- Can a reviewer resolve a discussion someone else started? Proposed: yes.
- Moving existing local projects: one at a time through archive or folder import (supported), or a
  bulk import?
- A platform guide in `docs/` (accounts, roles, discussions, notifications).
