# Document Model — CRDT project document, undo, presence, file projection

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_frontend` — `@tricc/core` |
| **Related** | `20260825-library-architecture.md` (packages, ports), `20260825-project-format.md` (the file projection), `20260825-activity-editor.md` (consumer), `20260825-cql-authoring.md` (collaborative expression editing) |
| **Approval** | — |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### What this is

How an open guideline is represented in memory while you edit it, and how that representation
becomes files on disk.

The project in memory is a **collaborative document** — the same kind of structure that lets
several people type in a shared document at once. Locally, with one person editing, it behaves
like any other editor. Hosted, several authors can work on the same guideline simultaneously
without overwriting each other.

### Why decide this now

This is the one choice that cannot be deferred. Adding live collaboration to an editor built on
ordinary snapshots means replacing the document, the undo system, and every piece of code that
touches state — effectively rewriting the application. Building on a collaborative structure from
the start costs perhaps a fortnight now and removes that rewrite entirely.

The cost is real and should be stated plainly: it is more complex than a plain snapshot for a v1
that has one user. This is a bet that the hosted version happens.

### What it means in practice

- Two authors editing different activities never conflict.
- Two authors editing the *same* CQL expression merge character by character, the way a shared
  document does — not "last save wins", which would silently discard someone's work.
- Undo is yours. Pressing undo reverses *your* last change, not your colleague's.
- Work done offline merges when you reconnect, rather than forcing a choice between two versions.

### Files remain the truth

The collaborative document is how a guideline is *edited*. Files in your project folder are how it
is **stored, reviewed and converted**. Every change is written out to those files, and opening a
project reads them. If someone changes a file outside the tool — a `git pull`, a text editor — the
files win, because that is what everyone else and every other tool sees.

---

## Part II — Technical specification

### 1. Technology

**Yjs**, with `y-indexeddb` locally and `y-websocket` (or `y-webrtc`) behind `CollaborationPort` for
a hosted shell.

Chosen over Automerge for the mature `Y.Text` implementation — collaborative editing of CQL
expressions and localized labels is a first-class requirement, and rich text is where Yjs is
strongest — and for its ecosystem of providers and its `UndoManager`, which supplies per-origin
undo we would otherwise build.

### 2. Document shape

One `Y.Doc` per project.

```
Y.Doc
├─ meta          Y.Map    formatVersion, id, system, code, version, mediaPath
├─ languages     Y.Map    { default: string, available: Y.Array<string> }
├─ title         Y.Map    lang → Y.Text
├─ description   Y.Map    lang → Y.Text
├─ interventions Y.Map    interventionId → Y.Map
│                           { id, code, title: Y.Map<lang, Y.Text>,
│                             processes: Y.Array<Y.Map{ process: string,
│                                                       activities: Y.Array<activityId> }> }
├─ activities    Y.Map    activityId → Y.Map
│                           { id, process, title: Y.Map<lang, Y.Text>,
│                             applicability: Y.Text,
│                             ui: Y.Map{ viewport },
│                             nodes: Y.Map<nodeId, Y.Map>,
│                             edges: Y.Map<edgeId, Y.Map> }
├─ codeSystems   Y.Map    url → Y.Map { …, concepts: Y.Map<code, Y.Map> }
└─ libraries     Y.Map    libraryName → Y.Text
```

A node:

```
Y.Map { id, type, name, save, repeat, instance, required, min, max,
        concept: Y.Map { system, code },
        label: Y.Map<lang, Y.Text>, hint: …, help: …,
        relevance: Y.Text, calculate: Y.Text, expression: Y.Text, constraint: Y.Text,
        options: Y.Array<Y.Map>,          # ordered — order is clinically meaningful
        notAvailable: Y.Map | absent,
        ui: Y.Map { x, y, width, height } }
```

### 3. Structural rules

These are what make the document merge correctly. They are enforced by the schema layer (§5), not
left to discipline.

| Rule | Reason |
|------|--------|
| Identity-keyed collections are `Y.Map`, keyed by stable id | Two authors adding a node concurrently both survive. An array would interleave by position and could lose one. |
| Genuinely ordered lists are `Y.Array` | Select options, process ordering, edge waypoints. Yjs arrays handle concurrent insertion correctly; the ordering carries meaning and must not be re-derived. |
| Every entity has a stable, immutable `id` | Ids are never regenerated — `goto.link`, edge endpoints and undo all depend on them. |
| Free text is `Y.Text` | Labels, definitions, and every CQL expression. Character-level merge; last-write-wins on a shared expression would silently destroy work. |
| Scalars are plain values in a `Y.Map` | Per-key last-write-wins is correct for `x`, `required`, `min`. |
| **No derived state in the document** | Validation results, layout output, search indices, parsed CQL. Derived state in a CRDT means peers replicate stale conclusions and fight over recomputing them. |
| No `ui` field affects semantics | Already required by `20260825-project-format.md` §3.2; here it additionally means position churn never conflicts with content edits. |

The last one carries a subtlety worth stating: `ui.x`/`ui.y` are last-write-wins scalars, so two
people dragging the same node concurrently produces one winner. That is acceptable — it is a
position, it is visible, and it is trivially re-dragged. It is explicitly *not* acceptable for
anything semantic, which is why nothing semantic is a bare scalar that two people plausibly edit at
once.

### 4. Reads and writes

The document is not exposed raw. `@tricc/core` provides:

```ts
interface ProjectDocument {
  readonly doc: Y.Doc
  snapshot(): Project                                  // plain, immutable, for pure consumers
  transact<T>(fn: (tx: Mutations) => T, origin?: unknown): T
  observe(path: Path, cb: (event) => void): Disposable
  readonly undo: UndoController
}
```

- **All mutation goes through `transact`**, which enforces capabilities (`project.write`) and
  stamps a local origin for undo scoping. Direct `Y.Map.set` from outside `core` is prevented by
  the barrel not exporting the raw types and by a lint rule.
- **`snapshot()`** produces a structurally-shared plain object, memoized per document version, for
  validation, serialization and pure logic that should not know about Yjs. This is what keeps CRDT
  knowledge from leaking through the whole codebase.
- **React** binds through fine-grained subscriptions (`useNode(activityId, nodeId)` observes that
  node's `Y.Map` only), so editing one node re-renders one node. A whole-document snapshot on
  every keystroke would not hold at 500 nodes.

### 5. Schema and validation

Zod schemas (`20260825-project-format.md`) validate `snapshot()` output, not the CRDT. A codec
layer converts between the plain shape and the Y types, and is the single place that knows the
structural rules in §3 — adding a field to the schema without deciding its Y type is a type error.

Authoring validation runs on snapshots, debounced, off the main thread past a threshold. It never
writes to the document (§3, no derived state); results live in a separate store.

### 6. Undo

`Y.UndoManager` over the whole document, tracking only the local client's origins.

- One stack across project- and node-level changes — the requirement that made separate per-scope
  stacks unworkable in the prototype.
- Gesture coalescing via `captureTimeout` (500 ms), so a drag or a burst of typing is one entry.
- Remote changes are never undone by the local user. This falls out of origin tracking rather than
  needing logic.
- Undo after a remote edit to the same node reverts the local contribution and leaves the remote
  one — correct, and the behaviour users expect from shared documents.

Explicitly discarded: the command-stack-with-Immer-patches design from the superseded
`20260825-app-foundation.md` (see `feature/README.md`). Two undo systems over one document cannot
be reconciled.

### 7. Persistence and the file projection

#### 7.1 Layers

| Layer | Role | Lifetime |
|-------|------|----------|
| `Y.Doc` in memory | The editing document | Session |
| `y-indexeddb` | Local update log; instant reload, offline safety | Until the project is closed and files are clean |
| Sidecar `.tricc/state.bin` | Update log persisted beside the project | Optional; gitignored |
| **Project files** | **Canonical. Reviewed, committed, converted.** | Permanent |

#### 7.2 Writing

On change (debounced 2 s, plus on route change and `visibilitychange`), `core` diffs the previous
snapshot against the current one and asks `PersistencePort` to write only the affected files. Yjs
events identify which activities changed, so the diff is scoped rather than whole-project.

#### 7.3 Reading

Opening a project parses the files into a fresh `Y.Doc`. Deterministically: the same files always
produce the same document structure, so two people opening the same commit and then collaborating
start from a compatible base.

#### 7.4 External change

Files are canonical. When `PersistencePort.watch` reports an external change (a `git pull`, an
editor save), the user is prompted; on reload, the document is rebuilt from files and the local
update log is discarded.

The consequence, stated because it is a genuine limitation rather than an oversight: **local
offline edits do not CRDT-merge with an external file change.** Merging a Yjs history against a
text-file edit made by another tool is not something a CRDT can do — the external edit has no
place in the causal history. Locally this is the right trade (git is the merge tool, as it is for
code). Hosted, it does not arise, because the server holds the document and files are generated
from it.

#### 7.5 Determinism

File writing is deterministic given a snapshot: stable key order, stable formatting. Two peers
converging on the same document produce byte-identical files. Without this, collaborators generate
spurious git diffs against each other forever.

### 8. Tests

**Convergence** — for each of a generated set of concurrent operation pairs: apply A then B, and B
then A, to separate docs; assert identical snapshots. Covers concurrent node creation, deletion vs
edit, concurrent option reordering, concurrent edits to one `Y.Text` expression.

**Offline merge** — diverge two docs offline, exchange updates, assert convergence and no lost
content.

**Undo** — local-only scoping with a remote peer active; coalescing of a drag; undo spanning
project- and node-level changes; undo after a remote edit to the same node.

**Projection** — snapshot → files → parse → snapshot is identity, over generated projects
(`fast-check`) and every fixture. Byte-identical output from converged peers.

**Capability** — `transact` refuses without `project.write`; no code path mutates around it.

**Performance** — 500-node activity: single-node edit re-renders one node; snapshot memoization
holds; document under a stated memory budget.

### 9. Code checklist

| Path | Purpose |
|------|---------|
| `packages/core/src/document/doc.ts` | `ProjectDocument`, `transact`, capability enforcement |
| `packages/core/src/document/codec.ts` | Plain ⇄ Y types; the §3 rules |
| `packages/core/src/document/snapshot.ts` | Memoized structural sharing |
| `packages/core/src/document/undo.ts` | `UndoController` over `Y.UndoManager` |
| `packages/core/src/document/observe.ts` | Path-scoped subscriptions |
| `packages/editor/src/hooks/` | `useProjectDocument`, `useActivity`, `useNode`, `useUndo` |
| `packages/core/src/persistence/` | Snapshot diff → `ChangeSet`; open/save orchestration |

### 10. Acceptance criteria

- [ ] Concurrent operations converge, verified by generated-pair testing.
- [ ] Two authors editing one CQL expression merge without loss.
- [ ] Undo reverses only local changes, coalesces gestures, and spans all scopes on one stack.
- [ ] `snapshot() → files → parse → snapshot()` is identity.
- [ ] Converged peers write byte-identical files.
- [ ] No derived state is stored in the document.
- [ ] Editing one node re-renders one node at 500 nodes.
- [ ] Mutation without `project.write` is impossible, not merely hidden.
- [ ] Local shell works with no collaboration provider connected.

### 11. Implementation phases

1. Document shape, codec, snapshot memoization.
2. `transact`, capability enforcement, path-scoped observation.
3. Undo controller.
4. File projection: parse-in, diff-out, determinism.
5. `y-indexeddb` + sidecar; external-change reconciliation.
6. Convergence and property test suites.
7. Awareness/presence primitives (unused locally; required by the editor's API surface).

### 12. Open risk

**Complexity paid up front against a hosted product that does not exist yet.** If the hosted shell
never happens, this is the most over-built part of the system — a single-user editor carrying a
CRDT.

The mitigation is that the cost is contained: `ProjectDocument` is the only module that knows
about Yjs, and everything downstream consumes plain snapshots. If collaboration were abandoned,
that one module could be replaced with an immutable store and nothing else would change. That
containment is worth protecting deliberately — the moment Yjs types appear in component props, the
bet becomes irreversible.
