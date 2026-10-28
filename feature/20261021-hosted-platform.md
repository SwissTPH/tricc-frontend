# Hosted platform: accounts, live editing, tagging and notifications

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_platform` (does not exist yet). This file is drafted in `tricc_frontend` and is **mirrored** into that repo when it is created, the same way as the `tricc_oo` companion specs. This frontend repo stays libraries plus `apps/local`, with no backend. |
| **Related** | [`20261021-discussions.md`](./20261021-discussions.md) (discussions in the project files — built first, in this repo), [`20261013-hosting-groundwork.md`](./20261013-hosting-groundwork.md) (library P0: `BlobPort`, `TriccRuntime.join` of both documents), `20260825-library-architecture.md` |
| **Source** | 2026-10-21: an online platform so people can use the editor according to their account. Live co-editing, tagging, assigning, in-app and email notifications. Discussions themselves are part of the drawing and are specified in the app. |
| **Decisions** | 2026-10-21: **separate repository**. Organisations own projects. Open sign-up with a verified email; a new account sees nothing until invited. Live co-editing in the first release. Notifications in the app and by email. Email excerpts are **per project**. A notification stores the project, the element id and the discussion id, and opening it jumps there (`?open=` / `?discussion=`, already in the app spec). Discussions are **not** a server table: they travel in the shared documents and the exported files. Any verified account may create an organisation, up to a limit. A reviewer may resolve a discussion they did not start. |
| **Approval** | — |
| **Build after** | The discussions spec is `Approved` and implemented in `tricc_frontend`, and hosting-groundwork (`join`, `BlobPort`) is implemented. |

---

## Part I — Business description

### What this is

The editor already runs on one computer. This spec is the **online shell**: accounts, teams,
several people in the same diagram, and telling someone they were tagged.

It is **not** a second discussions product. A discussion is a file in the project
(`20261021-discussions.md`). Exporting the project, cloning it, or opening it in the local app
still has every comment, status, label and decision. The platform syncs those same files live and
adds the parts that need a signed-in person.

### App vs platform

| App (`tricc_frontend`, no server) | Platform (`tricc_platform`) |
|---|---|
| The editor, the guideline model, validation | Sign-up, sign-in, organisations |
| Discussions in `discussions/`, statuses, labels, decision log | Who may open or change a project (roles) |
| Sticky notes | Several people editing together |
| Jump to an element from `?open=` and `?discussion=` | `@` tagging, assigning a discussion |
| GitHub / GitLab import from a personal token | Bell, "You were tagged in a comment", email |

### Accounts

- Anyone can create an account with an email and a password. The email must be confirmed before
  the account can be used.
- A new account sees nothing until someone invites it to an organisation or a project.
- Forgotten passwords are reset by email. A second factor (authenticator app or passkey) is
  available to everyone, and required for administrators.
- A person can change their name and colour, see where they are signed in, sign out everywhere,
  download their data, and delete their account.

### Organisations and projects

An **organisation** is a team (Swiss TPH, a ministry programme). It owns projects. People join by
invitation. Any verified account may create an organisation and becomes its owner, up to a limit
(default 3).

A project is **private** (only its members) or visible to the **whole organisation**. A guest from
outside the organisation can be invited to one project only.

### Roles (permissions — not the clinical/technical/terminology focus)

Each person has one role per project.

| A person can… | Viewer | Reviewer | Editor | Owner |
|---|:-:|:-:|:-:|:-:|
| Open the guideline, export it, read discussions | ✓ | ✓ | ✓ | ✓ |
| Start and answer discussions, set a status, tag, assign | | ✓ | ✓ | ✓ |
| Change the guideline (diagram, data dictionary, media) | | | ✓ | ✓ |
| Invite people, change roles, rename or delete the project | | | | ✓ |
| Edit or remove someone else's comment | | | | ✓ |

Organisation **owners** and **admins** are owners of every project in their organisation. An
organisation **member** is a viewer of organisation-visible projects, and may create projects.

A reviewer may resolve a discussion they did not start.

### Editing together

Several people edit the same activity at the same time. Each sees who else is in the project and
which node they have selected. Undo only takes back one's own changes. Reviewers' edits never
reach the guideline; they do reach the discussions.

### Tagging and assigning

- Typing `@` in a comment offers the members of **this project** who can read discussions. The
  person tagged is told. The tag is stored in the comment text (`@[Name](user:<id>)`), so it
  survives export and is visible in the local app as a name chip.
- A discussion can be assigned to one member. That is stored in the discussion file.

### Being told

- A bell in the top bar shows unread notifications and updates live. Example: "Alice Martin tagged
  you in a discussion on *Weight (kg)*, IMCI 2–59 months".
- Clicking a notification opens the project at that element, with the discussion open. The
  notification stores the **project id**, the **element id** (anchor) and the **discussion id**.
  The editor already jumps there from `?open=` and `?discussion=` (app spec §7). If the element
  was deleted, the detached discussion still opens.
- People are also told when a discussion they follow gets an answer or a new status, when one is
  assigned to them, and when they are invited or their role changes.
- Tags and assignments also arrive by email, grouped after a couple of minutes. Each person
  chooses, per kind: email at once, a daily summary, or the app only.
- **Email excerpts** (the first lines of the comment in the email) are a **per-project** setting,
  default on. An owner turns them off for a confidential guideline. Every email has a one-click
  unsubscribe.

### History

The platform keeps versions of the two shared documents as people work. An owner can save a
**named version**. Any version can be opened read-only, downloaded as a `.tricc` (discussions
included), or restored. The decision log itself is inside those files; the app can also download
it as Markdown or CSV.

### Not in the first release

Readable "what changed" between versions, git sync from the server, conversion with `tricc_oo` on
the server, public links, sign-in with an institution's account, and offline editing in the hosted
app.

---

## Part II — Technical specification

### 1. Repository and stack

```
tricc_platform/
├── apps/web/                 the hosted shell: adapters + chrome around @tricc/editor
├── packages/
│   ├── adapters-hosted/      Identity, catalog, collaboration, blobs, DiscussionPort
│   └── shared/               API contracts (zod), role → capabilities
├── services/
│   ├── db/                   Drizzle schema, migrations
│   ├── api/                  Fastify: BFF session, orgs, projects, members, tickets,
│   │                         notifications, events (SSE)
│   ├── collab/               Hocuspocus: two documents per project
│   └── worker/               outbox: email, digests, versions, image sweep
└── infra/                    compose, Caddy, Keycloak realm
```

Depends on published (or workspace-linked, while pre-1.0) `@tricc/core` and `@tricc/editor`.
Nothing from this platform is imported back into `tricc_frontend`.

| Concern | Choice |
|---|---|
| API | Node 22, TypeScript, Fastify 5 |
| Database | Postgres 16, Drizzle, SQL migrations |
| Shared documents | Hocuspocus 2, two docs per project |
| Identity | Keycloak 26 (OIDC). Organisation and project roles are **in the app database**. |
| Browser session | Backend-for-frontend: the browser never holds an access token, only `__Host-tricc_session`. |
| Email | Nodemailer over SMTP (Mailpit in development) |

### 2. What the libraries must already provide

From `tricc_frontend`, before this repo is started:

- [ ] `20261021-discussions.md` implemented: files, `discussionDoc`, `DiscussionPort` with
      `people`, `anchorToParam` / `openAnchor`, `?open=` / `?discussion=`, `comment.*` capabilities,
      `useCapability` scoped to the open project.
- [ ] `20261013-hosting-groundwork.md`: `BlobPort`, `TriccRuntime.join` connecting **both**
      documents, blob and collaboration conformance suites.

The platform adapters then: swap identity, catalog, persistence/collaboration and blobs; set
`DiscussionPort.people = true` and implement `members` / `assign`; the editor UI is unchanged
except the `@` picker appears because `people` is true.

### 3. Identity and sessions

Keycloak realm `tricc`: registration on, verify email required, password at least 12 characters,
brute-force lockout, CAPTCHA on registration, terms as a required action, TOTP and passkeys,
required for platform admins and organisation owners.

BFF as in the usual pattern: authorization code with PKCE; session cookie
`HttpOnly; Secure; SameSite=Lax; Path=/`; `__Host-` prefix; session id hashed in the database;
refresh token encrypted. Idle 8 hours, absolute 7 days. CSRF: `SameSite=Lax` plus
`X-Tricc-Request: 1` and a matching `Origin`. CORS off (one origin behind Caddy).

### 4. Organisations, projects, members

```
users, organisations, organisation_members (owner | admin | member)
projects (visibility: private | organisation)
project_members (owner | editor | reviewer | viewer)
invitations, sessions
```

`effectiveRole(userId, projectId)` is one function. Guests are `project_members` without an
organisation row. Invitations: hashed token, 7 days, accepted only with a **verified email equal
to the invitation**. Soft-delete projects for 30 days. Import uses the same `readProject` /
`normalizeImport` as the local app, including `discussions/`.

### 5. Roles → capabilities

`roleCapabilities` in `packages/shared`, used by API and browser.

| Capability | Viewer | Reviewer | Editor | Owner |
|---|:-:|:-:|:-:|:-:|
| `project.read`, `project.export`, `terminology.read`, `comment.read` | ✓ | ✓ | ✓ | ✓ |
| `comment.write` | | ✓ | ✓ | ✓ |
| `project.write`, `terminology.write` | | | ✓ | ✓ |
| `project.share`, `project.delete`, `settings.write`, `comment.moderate` | | | | ✓ |

Enforced three times: API routes (declare a capability or fail at startup; other org → 404),
collab server (read-only per document), browser (`HostedIdentity.capabilities({ projectId })`).

The two-document split is how a reviewer comments without changing the diagram
(`20261021-discussions.md` §3). There is still no "dictionary only" editor: `terminology.write`
is never granted without `project.write` in this release.

### 6. Live co-editing

- Seeded **once** on create/import: guideline state and discussion state stored in
  `project_documents (project_id, kind: guideline | discussions, state bytea)`.
- Clients `join`; they never seed from files.
- Short-lived collab ticket (JWT, 60 s, single use). `onAuthenticate` sets `connection.readOnly`
  per document from the current role.
- Losing access (role change, removal, sign-out) closes that person's connections via
  `NOTIFY`.
- Presence names come from the server connection context. Awareness carries only the selection.
- Size quota (default 50 MB) per document. Connection state in the top bar. No local copy of the
  hosted document in this release.

### 7. Tagging, assigning, notifications

The platform does **not** insert a comment of its own. `HostedDiscussions` calls the same
mutations, with `author` taken from the signed-in user (never from the client body). After a
successful write it:

1. Parses `@[Name](user:<id>)` from the new or edited text.
2. Drops mentions of people who cannot `comment.read` on this project.
3. Writes `notifications` and `outbox` rows in the **same database transaction**.

```
notifications     id, user_id, kind, project_id, thread_id, comment_id?, actor_id?,
                  anchor text,   -- anchorToParam, e.g. node:weight_check/n-weight
                  created_at, read_at?
notification_settings
outbox
projects.email_excerpt  boolean, default true   -- per project
```

| Event | Who | In the app |
|---|---|---|
| Tagged | the person tagged | "Alice Martin tagged you in a discussion on *Weight (kg)*, …" |
| Reply | subscribers, unless muted | "Alice Martin answered a discussion you follow on …" |
| Status | subscribers | "Alice Martin resolved a discussion on …" |
| Assigned | the assignee | "Alice Martin assigned you a discussion on …" |
| Invited / role changed | that person | "Alice Martin invited you to *IMCI* as Reviewer" |

The actor is never told. Access is checked again at delivery. Clicking opens
`/o/:org/p/:project?open=<anchor>&discussion=<id>`.

Email: 2-minute grouping for "at once"; daily summary at 08:00 in the person's timezone.
Defaults: tags and assignments at once; the rest app-only. If `projects.email_excerpt` is false,
the email has who, where and a link, and no comment text. `List-Unsubscribe` on every message.

SSE `GET /api/events` (session cookie) for the bell and live discussion events.

### 8. Versions, images, audit

- Versions: worker snapshots both documents after 5 minutes idle (at most hourly). Named versions
  kept; automatic ones thinned (7 days all, then daily for 90 days). Restore uses
  `Mutations.replaceProject` plus replacing `discussionDoc`. Download is `writeProject` +
  `toArchive` (discussions included).
- Images: `BlobPort` as in hosting-groundwork. SVG sanitised on upload. Served with a locked CSP.
- Audit log append-only (`INSERT`/`SELECT` only for the app role): sign-in, membership, role and
  invitation changes, project create/import/delete/restore, version restore, exports, moderation.

### 9. Security, privacy, operations

The same baseline as a public web app: HTTPS, HSTS, CSP (`script-src 'self'`), deny-by-default
API, zod on every body, rate limits, no secrets in git, logs without tokens or comment text,
`security.txt`, GDPR/FADP (delete my account, download my data, comments remain as *Deleted
user*). Hosting in Switzerland or the EU.

Compose for development (Postgres, Keycloak, Mailpit), staging and production. Backups with
point-in-time recovery (lose at most 15 minutes). `/healthz` and `/readyz`. Outbox lag alert.

### 10. Tests (platform repo)

- Role matrix: every route × every role × another organisation.
- A reviewer's forged guideline update never reaches storage or another client; their discussion
  update does.
- Removal closes the live connection.
- Tagging creates one notification whose link opens the node and the discussion (Playwright against
  compose + Mailpit).
- Email with excerpts off contains no comment text.
- Two clients converge on both documents.
- Import/export of a project with `discussions/` is byte-stable with the local app.

### 11. Implementation phases (platform repo)

**P0 — in `tricc_frontend`, already required:** discussions spec + hosting-groundwork.

**P1 — Foundation:** compose, Keycloak, API (BFF, orgs, projects, members, invitations, tickets,
images), collab of both documents, hosted web app, role matrix.

**P2 — Tagging and notifications:** `people` on the discussion port, `@` picker, assign, bell,
SSE, worker emails, per-project excerpt setting.

**P3 — Production:** versions, restore, backups, observability, privacy pages, admin console,
load test, penetration test.

### 12. Acceptance criteria

- A person signs up, confirms email, and sees nothing until invited.
- Viewer/reviewer cannot change the guideline through the UI or a forged Yjs update; a reviewer
  can start and resolve a discussion.
- Two people edit one activity, see each other, and converge; discussions converge too.
- Tagging creates one in-app notification and, with defaults, one email. Clicking it opens the
  element and the discussion.
- Exporting a hosted project as `.tricc` and opening it in the local app shows the same
  discussions, tags-as-names, statuses and decision log.
- A project with email excerpts off never puts comment text in mail.

### 13. Open points

- Hosting provider and region (Switzerland or the EU), and who runs it.
- Version retention: 7 days of all versions and 90 days of daily ones — enough?
- Moving many local projects in at once, or one archive at a time (supported)?
- A platform guide on the docs site.
