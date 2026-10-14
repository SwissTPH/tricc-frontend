# Hosting groundwork: what the libraries change so a hosted platform can use them

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_frontend` (libraries only). The platform itself lives in `../../tricc_platform/`, see [`../../tricc_platform/feature/20261013-hosted-platform.md`](../../tricc_platform/feature/20261013-hosted-platform.md). |
| **Related** | `20260825-library-architecture.md` (ports, §5 "four lines"), `20260825-document-model.md` (§7 persistence and the file projection), `20261012-images.md` (images in the CRDT) |
| **Source** | Patrick, 2026-10-13: an online app that keeps every project on a server and lets authors edit the same diagram together. Postgres for the data, auth reused from an existing product, Node and/or Python backend, Docker or Tilt packaging. |
| **Decisions** | 2026-10-13: the platform is a **separate repo** (`../tricc_platform`), so this repo stays libraries plus the local app with no backend. Identity is **Keycloak** (OIDC). Images go through a **blob port**: Postgres first, S3-compatible storage later. |
| **Approval** | — |

---

## Part I — Business description

The local app stays as it is: a project is a folder of files, and nothing needs a server. A hosted
platform will reuse the same editor, which was the point of building it as libraries. It is built
in its own repository, next to this one and `tricc_oo`.

Some changes inside the libraries come first. They are small and help the local app as well:

- **Images are stored by content.** Each image is identified by a fingerprint of its bytes, and the
  bytes are kept separately from the editing document. A person joining a shared project downloads
  an image only when it is shown, not every image as soon as the project opens. Exports and the
  project folder look exactly the same as today.
- **Undoing an image change works.** Today adding, renaming or deleting an image cannot be undone.
- **A project can be opened from a shared document,** not only from files. This is the step that
  makes real collaboration possible.

Nothing in this spec adds accounts, servers or network access to the local app.

## Part II — Technical specification

### 1. What the code already provides (checked 2026-10-13)

| Expectation | State |
|---|---|
| The document is a Yjs CRDT, edited only through `Mutations` | Yes, `document/doc.ts`, `document/mutations.ts` |
| `ProjectDocument.applyUpdate` / `encodeState` | Yes, `document/doc.ts:106-111` |
| Undo reverses only local edits | Yes, `document/undo.ts` (`trackedOrigins`) |
| `CollaborationPort` | Defined in `ports/collaboration.ts`. `IndexedDbCollaboration` implements it, but **nothing calls `connect`**. |
| Opening a project | `TriccRuntime.open` (`runtime.ts:57`) always builds the document from files with `ProjectDocument.fromProject` |
| Capabilities, including `project.share` | Yes, `ports/identity.ts` |
| Conformance suites | Persistence, catalog and identity. **No collaboration suite.** |
| Images | Bytes inside the CRDT (`codec.ts` `imageToY` stores `data: Uint8Array`) |
| Undo scope | **Leaves out the `images` map** (`undo.ts:15-26`), although `20261012-images.md` says undo covers images |

So the claim in `20260825-library-architecture.md` §5, that a hosted shell replaces four lines, is
not true yet. A hosted shell could swap the adapters, but `open` would still build the document from
files on every client, and that cannot work when several people share it (§3).

### 2. Images by content hash

**Model.** `ProjectImage` becomes:

```ts
interface ProjectImage {
  id: string                 // unchanged: the name, `Binary/<id>` in texts
  contentType: ImageContentType
  sha256: string             // hex, of the stored bytes
  size: number
}
```

The bytes are no longer in the Yjs document. The `images` Y.Map holds only the four fields above.
A replace still writes a new value (a new `sha256`).

**Port.** A new `ports/blob.ts`:

```ts
export interface BlobPort {
  readonly id: string
  put(bytes: Uint8Array, contentType: string): Promise<string>   // returns sha256; idempotent
  get(sha256: string): Promise<Uint8Array | undefined>
  has(sha256: string): Promise<boolean>
}
```

- Content-addressed: the same bytes always give the same key, and `put` of an existing hash does
  nothing. There is no delete in the port. Removing unreferenced blobs is the job of whoever
  stores them (the platform does it in a sweep, and the local stores drop blobs when a project is
  forgotten).
- Local implementations in `adapters-local`: an IndexedDB store (`tricc-blobs`) for browser
  projects, and the project folder for folder projects (the file is already on disk; the adapter
  keeps an in-memory map from hash to path).
- `adapters-memory` gets an in-memory one for tests.

**Files are unchanged.**
- `writeProject` gets the bytes through a resolver (`(sha) => Uint8Array`), and still writes
  `<media_path>/images/<id>.<ext>`.
- `readProject` hashes each image file and returns the bytes next to the project, so the caller
  can `put` them. `readProject` is synchronous today and `crypto.subtle.digest` is async, so it
  either uses a small synchronous sha256 (the same in browsers and Node), or it becomes async.
  A synchronous hash is preferred, so callers don't change.
- The YAML does not change. `20261012-images.md` already allowed for this.

**Editor.** The Media tab and node thumbnails load bytes through `BlobPort.get` and cache them as
object URLs. Uploads call `put` first, then `addImage` / `replaceImage` with the hash.

### 3. Opening from a shared document

A Yjs document must be seeded **once**. If two clients each run `projectToDoc` on the same files,
they create two separate sets of inserts, and once they sync every node, edge and concept appears
twice. Hosted, the server seeds the document once on import (platform spec §6), and clients only
ever join it.

`TriccRuntime` gets a second way to open a project:

```ts
/** Join a shared document: no file read, no seeding. */
async join(ref: ProjectRef): Promise<OpenProject> {
  const doc = new Y.Doc()
  const session = await this.collaboration!.connect(doc, ref)
  await session.whenSynced()
  const document = ProjectDocument.fromDoc(doc, { capabilities: ... })
  return { ref, document, session, baseline: {} }
}
```

- `OpenProject` gets an optional `session`, so the UI can show participants and disconnect.
- `save` is not used with `join`: the server writes the files (platform spec §1).
  `hasUnsavedChanges` returns false when a `session` is present.
- `open` stays as it is for the local app. Whether the local app should also connect
  `IndexedDbCollaboration` (the crash-recovery log in `20260825-document-model.md` §7.1) is a
  separate question, not part of this spec.
- `ProjectDocument.fromProject(p).encodeState()` is the only thing the server needs to seed a
  document. It already exists, and no new API is needed.

### 4. Undo covers images

Add `doc.getMap('images')` to the scope in `UndoController`. Since §2 makes an image entry small
metadata, undoing a delete restores the hash, and the bytes are still in the blob store.

### 5. Conformance suites

In `testing/conformance.ts`, exported as `@tricc/core/testing`:

- **`testBlobPort(make)`**
  - `put` returns the sha256 of the bytes
  - `get` gives back the same bytes, as a `Uint8Array`
  - `put` twice is idempotent
  - `has` is false for an unknown hash
  - `get` of an unknown hash is `undefined`
- **`testCollaborationPort(make)`**, where `make` returns two ports that talk to the same
  backend:
  - two documents connected to one ref converge, after edits on both sides
  - `whenSynced` resolves after the remote state has arrived
  - `participants()` lists the other side, where the adapter supports presence (the local adapter
    is exempt and declares that)
  - `disconnect` stops updates in both directions
  - a read-only connection's local edits never reach the other side. This is an optional
    capability; it is declared by the adapter and checked only where declared.

The hosted adapters in `tricc_platform` run these suites as they are, as
`20260825-library-architecture.md` §8 intended.

### 6. Tests

- `images.test.ts`: a round trip (files → project + blobs → files) gives byte-identical files.
- Undo: add an image, undo, and the image is gone; redo, and it is back with the same hash.
- `runtime.join`: with the memory collaboration adapter, two runtimes join one ref, one edits, and
  the other's snapshot shows the change. Neither builds the document from files.
- Seeding guard: a test that shows two `fromProject` documents merged produce duplicates. It
  documents why `join` exists.

### 7. Code checklist

- [ ] `ports/blob.ts`, exported from `ports/index.ts`
- [ ] `ProjectImage` uses `sha256` + `size`, with no `data`; update `codec.ts`, `mutations.ts`
      (`addImage`, `replaceImage`) and `format/serialize` (resolver on write, bytes on read)
- [ ] `adapters-local`: IndexedDB and folder blob stores. `adapters-memory`: in-memory store.
- [ ] Editor: Media tab and thumbnails read through `BlobPort`
- [ ] `undo.ts`: add `images` to the scope
- [ ] `runtime.ts`: `join`, `OpenProject.session`
- [ ] `testing/conformance.ts`: `testBlobPort`, `testCollaborationPort`
- [ ] `20260825-library-architecture.md` §5: point to this spec for what "four lines" now means

### 8. Acceptance criteria

- The local app behaves exactly as before, and existing project folders and `.tricc` archives open
  and save byte-identically.
- Image add, rename, replace and delete can be undone.
- The memory adapters pass both new conformance suites.
- `TriccRuntime.join` opens a shared document without reading files.

### 9. Later library work (not in this spec)

The platform spec plans two more library features. Each will get its own spec here:

- **Semantic diff** (`@tricc/core` `diff/`): compares two `Project` snapshots, optionally with a
  common base, and lists the changes by entity (activities, nodes, edges, answers, concepts,
  designations, images). It flags conflicts when both sides changed the same field. It feeds the
  platform's sync review and the readable history (platform spec §9-10). The local app can use it
  for its own external-change case (`20260825-document-model.md` §7.4).
- **Read-only, sourced code systems**: an imported data dictionary pinned to a canonical URL and
  version, which `Mutations` refuses to change (platform spec §11). Same pattern as the external
  `source` of project-level activities.

### 10. Open points

- An existing browser project in IndexedDB has image bytes inside its stored files. Opening it
  hashes them into the blob store, which is a one-time migration with no user action. Check that it
  is safe for large libraries.
- Should the local app also connect `IndexedDbCollaboration` (crash recovery), now that a
  collaboration session is part of `OpenProject`?
