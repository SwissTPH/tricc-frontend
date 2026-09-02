# Library Architecture — packages, ports, capabilities, publishing

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_frontend` |
| **Related** | `20260825-document-model.md` (the CRDT core), `20260825-local-app.md` (the first instantiation), all other specs (each now names its package) |
| **Approval** | — |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### What this is

TRICC authoring is built as a **set of libraries**, not as an application. The application you run
on your laptop is a thin shell around them — and a hosted service, later, is a different thin shell
around the same libraries.

### Why not just build the app

Because the app is the small part. The valuable, difficult, slow-to-get-right pieces are the
guideline model, the file format, the CQL language tooling, the terminology dictionary, and the
graph editor. If those live inside a desktop-shaped application, a hosted version means writing
them twice — and two implementations of a guideline model drift, which means the same guideline
means different things depending on where you opened it.

Separating them costs some structure now. It buys the ability to run the identical authoring
experience against a folder on your laptop or against a server, with only the plumbing swapped.

### What "swapping plumbing" means

Four things differ between a local tool and a hosted service, and each is isolated behind a
clearly defined boundary:

- **Where projects are stored** — a folder on disk, or a server.
- **Who you are and what you may do** — locally, you are the only user and you may do everything;
  hosted, there are accounts, and someone may be allowed to read a guideline but not change it.
- **Whether other people are editing at the same time** — locally no; hosted, yes.
- **Where concepts come from** — the project's own dictionary, or additionally a terminology
  server.

Everything else — every screen, every validation rule, every keystroke of the CQL editor — is
shared.

### Read-only is real from day one

Because permissions are threaded through the interface from the start rather than added later, the
tool genuinely supports viewing a guideline without being able to change it. That is immediately
useful even locally: opening a colleague's guideline to review it, without the risk of nudging a
node while you read.

### Published, not internal

The libraries are published as npm packages. That is a commitment — a documented public interface,
proper versioning, changelogs — and it is what allows anyone else to build on the TRICC model
without forking this repository.

---

## Part II — Technical specification

### 1. Repository layout

pnpm workspaces, Turborepo for task orchestration and caching.

```
tricc_frontend/
├── packages/
│   ├── core/            # @tricc/core        — model, CRDT document, format, validation, terminology, ports
│   ├── cql/             # @tricc/cql         — grammar, parser, profile, TriccOperation mapping
│   ├── editor/          # @tricc/editor      — React components
│   └── adapters-local/  # @tricc/adapters-local — local implementations of every port
├── apps/
│   └── local/           # private; the desktop-shaped instantiation
├── e2e/                 # Playwright, drives apps/local
└── feature/             # these specs
```

pnpm over npm workspaces: strict, non-flat `node_modules` prevents a package from importing a
dependency it does not declare — the single most common way a monorepo's package boundaries rot
without anyone noticing until the first publish.

### 2. Packages

| Package | Contains | Depends on |
|---------|----------|------------|
| **`@tricc/core`** | Guideline model; Yjs document (`20260825-document-model.md`); file format read/write and migrations (`20260825-project-format.md`); authoring validation; terminology model, search index and usage walker (`20260825-terminology.md`); **all port interfaces** | `yjs`, `zod`, `yaml`, `@tricc/cql` |
| **`@tricc/cql`** | Vendored `Cql.g4`, generated parser, resolution, TRICC profile, `TriccOperation` mapping, language-service primitives (`20260825-cql-authoring.md`) | `antlr4ng` |
| **`@tricc/editor`** | React: canvas, palette, property panels, CQL editor, concept picker, concept browser, validation panel | `@tricc/core`, `@tricc/cql`, React, MUI, `@xyflow/react`, CodeMirror (peers) |
| **`@tricc/adapters-local`** | File System Access + download persistence, local project catalog, local identity, IndexedDB collaboration provider | `@tricc/core`, `y-indexeddb` |

**`core` and `cql` contain no React.** That is enforced by an ESLint rule banning `react` imports
in those packages, not merely by intention. They are the parts with real logic; keeping them out of
the component tree is what makes their tests fast, and what lets a future non-React consumer exist
at all.

`cql` does not depend on `core` — it receives a resolution context as an interface. The dependency
runs one way only, so the language tooling is usable standalone (a CLI linter, a CI check on a
guideline repository).

### 3. Ports

Every environmental difference is an interface in `@tricc/core/ports`. Nothing in `core`, `cql` or
`editor` reaches for a browser API, a network, or a filesystem directly.

```ts
interface PersistencePort {
  read(ref: ProjectRef): Promise<ProjectFiles>
  write(ref: ProjectRef, changed: ChangeSet): Promise<void>
  watch?(ref: ProjectRef, onExternalChange: (paths: string[]) => void): Disposable
  capabilities(): { canWatch: boolean; canWriteIncrementally: boolean }
}

interface ProjectCatalogPort {
  list(): Promise<ProjectSummary[]>
  create(name: string): Promise<ProjectRef>
  open(): Promise<ProjectRef | undefined>     // may prompt
  remove(ref: ProjectRef): Promise<void>
}

interface IdentityPort {
  current(): Identity                          // { id, displayName, email?, colour? }
  capabilities(scope: Scope): CapabilitySet
  onChange(cb: () => void): Disposable
}

interface CollaborationPort {
  connect(doc: Y.Doc, ref: ProjectRef): Promise<CollaborationSession>
  // session exposes: awareness, connection state, disconnect
}

interface TerminologySourcePort {
  search(q: string, opts?: SearchOptions): Promise<ConceptMatch[]>
  lookup(system: string, code: string): Promise<Concept | undefined>
  readonly id: string
  readonly online: boolean
}

interface TelemetryPort { event(name: string, data?: Record<string, unknown>): void }
```

`PersistencePort.capabilities()` exists because the shells genuinely differ in kind: a download-mode
browser cannot write one changed file, and no persistence layer except a real filesystem can watch.
The UI adapts to declared capability rather than sniffing the environment, which keeps the
adaptation testable.

### 4. Identity and capabilities

```ts
type Capability =
  | 'project.read' | 'project.write' | 'project.export' | 'project.delete'
  | 'terminology.read' | 'terminology.write'
  | 'settings.write'
  | 'project.share'          // hosted only; locally never granted
```

- `@tricc/adapters-local` returns one identity holding every capability except `project.share`.
- `@tricc/editor` exposes `useCapability('project.write')` and a `<RequireCapability>` wrapper.
  Every mutating affordance is gated; every editor component accepts a derived `readOnly`.
- Gating is **defence in depth, not decoration**: `core` refuses writes to the document when the
  active capability set lacks `project.write`, so a component that forgets to gate cannot mutate.

This is the honest replacement for the prototype's `UserAccount.tsx`. There are no accounts, no
profiles to manage and no authentication in the local shell — there is an identity with a display
name, used for authorship metadata and for collaborator presence, stored as a local preference.
`UserAccount.tsx` is deleted; a Preferences screen takes its place.

### 5. Wiring

An instantiation composes adapters and renders the editor:

```tsx
const runtime = createTriccRuntime({
  persistence:   new FileSystemPersistence(),
  catalog:       new LocalProjectCatalog(),
  identity:      new LocalIdentity(prefs),
  collaboration: new IndexedDbCollaboration(),
  terminologySources: [],
  telemetry:     noopTelemetry,
})

<TriccRuntimeProvider value={runtime}>
  <ProjectWorkspace />
</TriccRuntimeProvider>
```

A hosted shell replaces four of those lines. Nothing else about it differs, and that claim is
testable — §8 requires a fake in-memory adapter set that runs the entire component suite, which is
by construction a second instantiation.

### 6. Publishing

- **Changesets** for versioning and changelogs. Every user-visible change carries a changeset;
  CI fails a PR that touches `packages/` without one.
- **Independent semver**, released together. Pre-1.0 until the API has been proven against a
  second real consumer — the honest signal that the surface is still moving.
- **Public API is an explicit barrel.** Only `src/index.ts` is exported (`exports` map, no deep
  imports). An API report is generated by `api-extractor` and committed, so any surface change
  appears as a reviewable diff rather than shipping unnoticed.
- **Build** with `tsup`: ESM + CJS + `.d.ts`. CJS is retained because `@tricc/cql` is useful from
  Node tooling and the Node ecosystem is not uniformly ESM.
- `publint` and `arethetypeswrong` run in CI.
- `@tricc/editor` declares React, MUI, `@xyflow/react` and CodeMirror as **peer dependencies** — a
  component library that bundles its own React is the classic way to produce two-React bugs in a
  consumer.
- API docs via TypeDoc, published with the docs site.

### 7. Versioning against the format

Package version and `formatVersion` (`20260825-project-format.md` §8) are **independent**. A
library release may change nothing about the file format, and a format change may be readable by
several library versions. Each package declares the `formatVersion` range it supports, and `core`
exposes it programmatically so a shell can report "this project needs a newer TRICC".

### 8. Testing

| Scope | Where |
|-------|-------|
| Unit | Per package, Vitest. `core` and `cql` carry the bulk. |
| Component | `packages/editor`, Vitest + RTL, against the in-memory adapter set |
| CRDT convergence | `packages/core` — see `20260825-document-model.md` §8 |
| Contract | Adapter conformance suite (§8.1) |
| API surface | `api-extractor` report diff; `publint`; `attw` |
| E2E | `e2e/`, Playwright, drives `apps/local` |

#### 8.1 Adapter conformance suite

`@tricc/core/testing` exports a suite that any `PersistencePort`, `IdentityPort`,
`ProjectCatalogPort` or `CollaborationPort` implementation must pass. The local adapters run it;
a hosted adapter later runs the same suite unchanged.

This is what makes "swap the plumbing" a claim rather than a hope — an adapter is correct when it
passes the suite, and the suite is written once by the package that defines the interface.

#### 8.2 In-memory adapters

`@tricc/adapters-memory` (private, test-only) implements every port over plain objects. The entire
component suite runs against it, with no browser APIs, no filesystem and no timing. It doubles as
the reference implementation and as proof the ports are actually sufficient.

### 9. Code checklist

| Path | Purpose |
|------|---------|
| `pnpm-workspace.yaml`, `turbo.json` | Workspace + task graph |
| `packages/core/src/ports/` | Every port interface |
| `packages/core/src/runtime.ts` | `createTriccRuntime`, capability enforcement |
| `packages/core/src/testing/` | Adapter conformance suite |
| `packages/editor/src/runtime/` | `TriccRuntimeProvider`, `useCapability`, `RequireCapability` |
| `packages/adapters-local/src/` | Local adapters |
| `packages/adapters-memory/src/` | In-memory adapters (private) |
| `.changeset/`, `api-extractor.json` | Release + API surface tooling |
| `src/pages/UserAccount.tsx` | **Deleted** — no accounts without a backend |

### 10. Acceptance criteria

- [ ] `core` and `cql` contain no React import, enforced by lint.
- [ ] Every environmental dependency is reached only through a port.
- [ ] The full component suite runs against in-memory adapters with no browser APIs.
- [ ] Local adapters pass the conformance suite.
- [ ] Read-only capability genuinely prevents mutation, at the document layer as well as the UI.
- [ ] Each package publishes with correct types and exports (`publint`, `attw` green).
- [ ] The committed API report changes only when the public surface does.
- [ ] A changeset is required for any change under `packages/`.

### 11. Implementation phases

1. Workspace, Turborepo, TS project references, lint/test/build wiring per package.
2. Port interfaces, runtime, capability enforcement in `core`.
3. In-memory adapters + conformance suite.
4. Local adapters.
5. Publishing pipeline: Changesets, `tsup`, api-extractor, `publint`/`attw` in CI.

### 12. Open risk

**Four published packages before a second consumer exists.** The API surface will be wrong in
places, and publishing makes wrongness expensive to correct. Mitigations: stay pre-1.0, keep the
barrel deliberately narrow (export what a consumer needs, not what is convenient internally), and
treat the in-memory adapter set as the stand-in second consumer until a real one arrives. If the
surface is still churning by the time the hosted shell starts, that is the signal to delay 1.0
rather than to freeze a surface nobody has validated.
