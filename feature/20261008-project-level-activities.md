# Project-level activities, referenced by interventions, with an optional external `source`

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_frontend` + **`tricc_oo`** (project config, §2.4) |
| **Related** | `20261008-authoring-continuation.md` §3 (Shared activities), `20260826-project-and-interventions.md`, `20260825-project-format.md`, `../../tricc_oo/feature/20260907-project-config.md` (the `activity` glob list this extends), `20261008-data-dictionary-and-concept-texts.md` (codes-only YAML: an external activity needs its concepts) |
| **Source** | Patrick, 2026-10-08: "sharing is a must; that is why activities are referred to in interventions but not defined. They should live at project level. We might support a `source` URI for activities defined by another project." |
| **Approval** | — |

---

## Part I — Business description

An activity is defined **once, in the project**. An intervention does not contain activities, it
**refers** to them. The same weight measurement can then serve the young-infant, child, and
follow-up interventions. A fix made once reaches all three.

The editor already behaves this way: one library, and intervention cards that list references.
The saved file does not. `tricc.yaml` lists file paths under each intervention, and an activity
that no intervention lists has no entry at all. This plan makes the file say what the editor
shows:

- `tricc.yaml` gets a project-level **activities** list. It covers every activity in the
  project, used or not.
- Interventions list activity **ids**, in order.

Some activities are maintained by another project. For example, a national "vital signs"
activity that several country projects reuse. Such an activity can be listed with a `source`, the
URI of the project or file that defines it. In this project it is **read-only**. The author can
refresh it from its source, or make a local copy to change it.

---

## Part II — Technical specification

### 2.1 `tricc.yaml` shape

```yaml
activities:                         # project level: every activity, used or not
  - id: weight-measurement
    path: activities/weight-measurement.activity.yaml
  - id: urine-test
    path: activities/urine-test.activity.yaml
  - id: vital-signs                 # defined by another project
    source: https://example.org/tricc/global/activities/vital-signs.activity.yaml
    path: external/vital-signs.activity.yaml   # local snapshot, what builds use
    sha256: 9f2c…                   # snapshot hash at last refresh
    version: "2026-09-30"           # optional, from the source project
  - activities/legacy/*.drawio      # a plain glob is still allowed; ids come from the files

interventions:
  - id: young-infant
    title: Young infant
    activities: [vital-signs, weight-measurement, yi-tests]   # ids, in process order
    start: { on: demand, condition: "AgeInDays() < 60" }
```

- `activities[]` entries take one of three forms: `{id, path}`, `{id, source, path, sha256,
  version?}`, or a plain glob string. The glob form exists for draw.io-era projects.
- `interventions[].activities` is a list of **ids**. It replaces the `activity` glob list for
  projects the app writes.
  - The order is the process order (continuation §3: reorder swaps neighbouring process indexes).
  - Page refs stay in the list, as they do today.
- `draft_interventions` keeps the same shape. They now list ids, which they already do.
- Ids are unique across the project, including external ones and ids read from globs.
  Duplicates are error `project.duplicate-activity-id`.

### 2.2 Frontend read and write

**Write** (`packages/core/src/format/serialize/tricc-yaml.ts` `encodeTriccYaml`,
`encodeIntervention` l.68-108)

- Emit `activities:` from `project.activities`, sorted by id, with each activity's own path.
  - Use `sourcePath` when it was read from a non-canonical path; see
    `20261008-canvas-display-and-activity-removal.md` §2.2.
  - Otherwise use `activityPath(id)`.
- Emit `activities: [ids]` on interventions instead of `activity: [paths]`.
- Never write the glob form. A project opened with globs is written back with every activity
  listed explicitly.

**Read**

- Accept the new form, the current per-intervention `activity` path list, and `{InputStrategy:
  [globs]}` mappings.
- A path in an intervention's `activity` list resolves to the id of the activity at that path,
  through `activityIdByPath`, which already exists (`tricc-yaml.ts:15`).
- The regex scan of `activities/` stays as a last fallback for activities that are listed nowhere.

**Model**

- Add `source?: { uri: string; sha256: string; version?: string }` to `Activity`.
- `ActivityRef` (`model/types.ts:139-141`) is unchanged: `{ref}` is already an id.

### 2.3 External activities

**Why a snapshot.** The local app reaches disk only through the folder the author opened
(`showDirectoryPicker`, `packages/adapters-local/src/catalog.ts:53`). It cannot read
`../global/…`, and an https source needs CORS. So the project keeps a **snapshot**: the file at
`path`, under `external/`. The `source` URI is provenance, used for refresh. Builds read the
snapshot, which makes them reproducible and work offline.

**Editor**

- The navigator chip shows a link icon and the tooltip "From {source}" (`external-${id}`).
- The activity opens read-only, as in the existing read-only mode: write controls are hidden, and
  this one activity is locked even when the project is writable. A banner names the source and
  version.
- **Refresh from source** (`external-refresh`):
  - https: fetch the URI.
  - File: ask the author to pick the source project folder (a second directory handle, kept in
    IndexedDB under the project id).
  - Show a diff summary (nodes added, removed, and changed) and replace the snapshot.
- **Make a local copy** (`external-detach`): drop `source`, move the file to `activities/<id>…`,
  and unlock it. One undo step.
- **Add from another project.** The Activities tab Import gets a "Link instead of copy" checkbox.
  When ticked, the activity gets `source` set to the picked file's URI. When not ticked, the
  activity is copied, as today.

**Dependencies an external activity brings**

- **Concepts.** YAML holds codes only, so the snapshot needs its source project's concepts.
  - On refresh, copy the used concepts into a project CodeSystem snapshot,
    `external/<source-project>.codesystem.json`, and list it under `terminology`.
  - A concept missing from it is error `activity.external-missing-concept`.
  - The local dictionary shows these concepts read-only, labelled with the source.
- **`goto` targets.** A `goto` inside an external activity points at ids in its source project.
  - When a target is not in this project, raise warning `activity.external-unresolved-goto` with
    an action "Link {target} too".
  - Never rewrite the external file.
- **CQL library defines** it references: same treatment as concepts, under `external/*.cql`.

**Validation summary**

| Code | Severity |
|------|----------|
| `project.duplicate-activity-id` | error |
| `activity.external-snapshot-missing` (the `path` file is absent) | error |
| `activity.external-hash-mismatch` (snapshot edited outside the app) | warning |
| `activity.external-missing-concept` | error |
| `activity.external-unresolved-goto` | warning |

### 2.4 `tricc_oo` changes

These extend `20260907-project-config.md`. Mirror them into `../../tricc_oo/feature/` on approval.

- Top-level `activities:` list with `{id, path}`, `{id, source, path, sha256, version}`, or a glob.
  - Build from `path`.
  - `source` is informational.
  - Fail on a hash mismatch only with `--strict`.
- `interventions[].activities: [ids]`, resolved against the project list. An unknown id is a
  build error naming it.
  - The existing `activity:` glob list keeps working. A file that both forms list is read once.
- Both forms on one intervention are a build error.
- Each intervention is still converted separately (template: "shared files are read once per
  intervention"). Nothing changes there.
- `terminology` and `libraries` may list `external/…` files like any other.

### 2.5 Migration and order of work

1. Read the new form, and keep reading the old one.
2. `tricc_oo` reads the new form (§2.4). The app must not write the new form before this lands,
   or builds break.
3. Write the new form. Use a project-level flag `format: 2` in `tricc.yaml`, so an older
   `tricc_oo` fails with a clear message instead of a confusing glob error.
4. External `source`, snapshot, and refresh (§2.3). This can come later. Steps 1-3 alone
   implement "activities live at project level".

### 2.6 Tests

**core**

- round-trip of each read form → one written form
- unassigned activities survive save
- the order of the intervention id list is kept
- duplicate ids
- an external snapshot with its hash

**editor integration**

- an external activity is read-only while the project is writable
- detach is one undo step
- the "Link instead of copy" import

**e2e**

- open a glob-based project, save, and reopen; the overview cards are unchanged
- the external chip and banner

**`tricc_oo`**

- id-list interventions
- mixing a glob and ids in one project
- unknown id
- `format: 2` gate

### 2.7 Open questions

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Builds read the snapshot (`path`), not the live `source`? | Yes. It is reproducible and offline. Refresh is an explicit author action. |
| 2 | Which `source` URI schemes in v1? | https (including Google Drive, which `tricc_oo` already supports) and relative file paths. Leave git URIs for later. |
| 3 | May a local id differ from the source project's id (an alias)? | No in v1. The same id avoids rewriting `goto` targets. |
| 4 | Should external concepts merge into the project CodeSystem, or stay a separate CodeSystem? | Separate snapshot CodeSystem, read-only. Merging would hide ownership. |
| 5 | Key name on interventions: `activities` (ids) beside the legacy `activity` (globs)? | Yes. The plural signals the new meaning, and both are accepted on read. |
