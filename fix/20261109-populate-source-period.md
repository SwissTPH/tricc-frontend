# A prefilled value cannot say which concept it reads, nor its period

| Field             | Value                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| **Status**        | Implemented (2026-11-09)                                                                                |
| **Branch target** | `feature/project-retrievals` → `develop` (one PR with #31)                                              |
| **Scope**         | `@tricc/core` (schema, model, validator, draw.io import), `@tricc/editor` (populate inspector)          |
| **Issue**         | #34                                                                                                     |
| **Related**       | `../feature/20261109-project-retrievals.md` (#31): this fix gives its migration a real source. #26, #16 |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Issue analysis

### Symptoms

On a **Prefilled value** (`populate`) node the inspector's **Read from** section only shows the
context select. There is no way to say which recorded concept the node reads, and no way to set
the look-back period, although `period` is already in the activity schema.

### Who is affected

Authors of prefilled values, and everything tricc_oo generates from them: with no source,
tricc_oo reads the concept named like the node. A "previous weight" node `t_weight` cannot read
`weight` without being renamed to `weight`.

### Expected vs actual

| Expected                                                                                                                          | Actual                                                         |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Under **Read from**, a **Source concept** picked from the data dictionary. The node keeps its name.                               | No field.                                                      |
| A **Period** field (ISO-8601, e.g. `P30D`) when the context is `encounter` or `history`, with a warning when it cannot be parsed. | No field; `period` is only kept if it was in the file.         |
| `source` and `period` survive a YAML save/load, and are read from a draw.io import.                                               | `source` is rejected by the schema; draw.io import drops both. |

### How to reproduce

1. Add a **Prefilled value** to an activity and select it.
2. Look under **Read from**: only the context select is there.

Commit: `368f5bd` (`develop`).

### Out of scope

- `concept_type` / `data_type` (#26, now on the retrieval entry of #31).

---

## Part II — Fix approach

### 1. Root cause

`nodeSchema` (`packages/core/src/format/schema/activity.ts`) has `context` and `period` but no
`source`; `NODE_FIELDS` has no `source`; the populate branch of `ActivityEditor.tsx` shows only the
context; `drawio.ts` maps no populate attribute.

### 2. Fix

- `source` on a node: a concept code (default dictionary) or `{system, code}`. Field kind `json`.
- `populateSourceKey(project, node)` in `terminology/usage.ts`: the concept the node reads (its
  `source`, else the default-dictionary concept named like the node).
- Validator (`validate/activity.ts`) on populate nodes: `populate-period` warning for a period
  that is not ISO-8601 on `encounter` / `history`; `populate-source` warning for a source missing
  from the dictionary.
- draw.io import: `source` and `period` attributes on populate shapes.
- Inspector: **Source concept** typeahead and, for `encounter` / `history`, **Period**. Choosing a
  context without a period drops it.

### 3. Code checklist

- [x] schema, model type, `NODE_FIELDS`, both codecs
- [x] `populateSourceKey`
- [x] validator warnings
- [x] draw.io import
- [x] inspector fields

### 4. Tests

YAML round trip of `source` and `period`; draw.io import; validator; inspector.

### 5. Acceptance criteria

The table above, Expected column.

## Decisions

- 2026-11-09: Approved in conversation, built in the #31 PR. (@delcroip)
