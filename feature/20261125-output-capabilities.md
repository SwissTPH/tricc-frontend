# Output capability statements in the project

| Field             | Value                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | Approved (2026-11-25, mirror of SwissTPH/tricc#102)                                                                                                                                                                                                                                                                                    |
| **Branch target** | `feature/lang-and-capabilities` → `develop`                                                                                                                                                                                                                                                                                            |
| **Scope**         | `@tricc/core` (project format `capabilities`, statements, registry port, check), `@tricc/editor` (project capabilities screen), `apps/local` (registry adapter), `tricc_oo` (cross-repo: packages and build check)                                                                                                                     |
| **Related**       | Mirror of `tricc/feature/20261125-output-capabilities.md` (SwissTPH/tricc#102, phase 3). `20261125-expression-languages.md` (the parser and catalogue the check uses). `20260825-project-format.md` (`tricc.yaml`). `20261109-project-retrievals.md` (retrieval contexts). `20261120-decision-table-editor.md` (decision-table calls). |
| **RFC**           | SwissTPH/tricc#102                                                                                                                                                                                                                                                                                                                     |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### The problem

Each output (XLSForm, CHT, FHIR, OpenSRP…) writes only part of what an author can draw. Today the
author learns it when an export fails; the editor cannot warn because it does not know what each
output can do.

### What changes for an author

- The project page has an **Outputs** tab listing the capability statements loaded in the
  project: package, version, where it came from, and whether it is active.
- The project lead adds a statement from npm, from GitHub Packages (with a token) or by
  uploading a file, activates or deactivates it, and updates it to a newer version. An update
  shows what changed (operators, functions, contexts added or removed) before it is applied.
- A project with none lists the latest published statements to pick from.
- The project keeps a copy of every loaded statement, so the build works offline.
- With an active statement, the problems list shows, while drawing, the constructs that output
  cannot write ("`IsAdult` uses `Max`, which the FHIRStrategy output cannot write inline"),
  the same as the build.

### Out of scope

- Publishing statements (release task). Statements for outputs that do not exist.

---

## Part II — Technical specification

### 1. Design

**1.1 Project format.** `tricc.yaml` `capabilities` (tricc spec §2) is read into
`Project.capabilities: CapabilityEntry[]` (`package`, `version`, `source: 'npm' | 'github' |
'file'`, `registry?`, `file`, `sha256?`, `active`) and written back unchanged. The copies
(`capabilities/**/*.json`) are kept as text in `Project.capabilityFiles` (path → text) so the
bytes, and so `sha256`, do not change on save. Both are plain values in the Yjs `meta` map. A
file under `capabilities/` no entry lists is still kept.

**1.2 Statements in core** (`packages/core/src/capabilities/`): `validateStatement` (the
rules of `statement.schema.json`, copied from tricc by `scripts/sync-lang.mjs` with its
sha256 in `lang.lock.json`), `resolveStatement` (`extends`, `add` / `remove`, semver ranges),
`diffStatements`, `sha256Hex` (synchronous, so validation stays synchronous),
`loadStatement(project, entry)` (`E_CAPABILITY_FILE`, `E_CAPABILITY_EXTENDS`).

**1.3 Registry port.** `CapabilityRegistry` (`packages/core/src/ports/capability-registry.ts`):
`list()` (latest version of every `@tricc/capabilities-*` package), `versions(pkg)`,
`fetchStatement(pkg, version)` (the `statement.json` of the package tarball). `createNpmRegistry({
url, token?, fetch })` implements it over an injected `fetch`: npmjs (`registry.npmjs.org`,
search API) and GitHub Packages (`npm.pkg.github.com`, a token; no search, so `list()` reads the
known packages). The tarball is read with `fflate` and a small tar reader. Tests use a mock
registry; nothing calls a real registry in tests.

**1.4 Mutations.** `addCapability(project, statement, entry)` writes the copy at
`capabilities/<package>@<version>.json`, its `sha256` and the entry, and adds the `extends`
chain the source can give as inactive entries; `setCapabilityActive`, `updateCapability`
(replaces copy and entry), `removeCapability`.

**1.5 The check.** `checkCapabilities(project, lang)` in `@tricc/core/lang` (it needs the
parser): every expression field and expression argument is parsed into operator and function
names (`cqlOperators`), and checked against every active resolved statement, with the
context rule of tricc (`form`; FHIR: a condition, `relevance` or `constraint`, is `inline`
(FHIRPath); a calculation needs the operator in either context, as the writer picks; CQL
libraries are `library` and are not parsed here yet);
decision-table calls against `decision_table_calls` / `limits`; retrieval contexts of the
`"#codes"` used; populate contexts. `validateProject(project, { lang })` adds its issues.

**1.6 Screen.** `CapabilitiesPanel` in the project inspector's **Outputs** tab: the list
(toggle active, update, remove), "Add from npm", "Add from GitHub Packages" (token field, not
saved in the project), "Upload a statement". The registry comes from the runtime
(`EditorRuntime.capabilityRegistry`, optional; without it only file upload is offered).

### 2. Validation and errors

| Rule                  | Severity | When                                                                                      |
| --------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `output.unsupported`  | error    | `E_OUTPUT_UNSUPPORTED`: a node uses a construct an active statement's output cannot write |
| `output.limit`        | warning  | `W_OUTPUT_LIMIT`                                                                          |
| `output.no-statement` | info     | `W_OUTPUT_NO_STATEMENT`: an output of `output_strategies` has no active statement         |
| `capability.file`     | error    | `E_CAPABILITY_FILE`: copy missing, bad sha256, fails the schema                           |
| `capability.extends`  | error    | `E_CAPABILITY_EXTENDS`                                                                    |
| `capability.lang`     | warning  | `W_CAPABILITY_LANG`                                                                       |

### 3. Tests

- `tricc.yaml` `capabilities` and the copies round-trip unchanged (files and Yjs).
- Resolution (add / remove, missing parent, range), schema rules, sha256.
- The check on the tricc fixture's expressions: FHIR inline gap, retrieval context, table limit;
  inactive not checked; none active, no check.
- Registry: npm metadata and tarball through a mock `fetch`; GitHub token header.
- Editor: the Outputs tab lists, activates, loads from a mock registry and a file, shows the
  update summary.

### 4. Phases

1. Project format, statements, sha256, mutations.
2. Registry port and npm adapter.
3. The check in `@tricc/core/lang` and validation.
4. The Outputs tab.

---

## Open questions

None.

## Decisions

- 2026-11-25: Mirror of SwissTPH/tricc#102, approved there for implementation with #98 on one
  branch, frontend included (@delcroip).
