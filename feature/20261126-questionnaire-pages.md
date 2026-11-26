# "Show as" (page, section, inline), replacing goto `instance = -1`

| Field             | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | Approved (2026-11-26, in conversation)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Branch target** | `feature/questionnaire-pages` → `develop`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Scope**         | `@tricc/core`, `@tricc/editor`, `tricc_oo` (cross-repo)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Related**       | Mirror of `../../tricc/feature/20261120-questionnaire-pages.md` (SwissTPH/tricc#90, implemented in SwissTPH/tricc#93): the export side, and the rules for which GoTo wins; `20261014-none-answer-repeat-instance.md` (the Repeat / Instance fields, whose `-1` help changes); `20261028-snippets-tab-and-params.md` (blocks, which already replace most uses of `instance = -1`); `20261009-canvas-comments-and-groups.md` (page groups, which get **Show as**); `20261021-discussions.md` (the note left where `instance = -1` was converted) |
| **RFC**           | #55                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### The problem

`tricc_oo` can now show an activity, a block or a group of questions on its own page in the
exported form, and can put a called activity's questions inline in the caller without the
`instance = -1` trick (SwissTPH/tricc#90). DrawTRICC has no way to set either, and its Instance
field still offers `-1`.

### What changes for an author

One setting everywhere, **Show as**, on an activity, a block, a Go to, a Use block and a group of
questions (the frame). It has four choices:

| Choice      | In the form                                                                                | Saved                           |
| ----------- | ------------------------------------------------------------------------------------------ | ------------------------------- |
| **Page**    | its own page (a page is always a section)                                                  | `page: true`, `asGroup: true`   |
| **Section** | its own section, or a sub-heading for a group                                              | `page: false`, `asGroup: true`  |
| **Inline**  | no section: its questions go into the enclosing one; a group is only a frame on the canvas | `page: false`, `asGroup: false` |
| **Default** | as today (see below)                                                                       | nothing                         |

"Inline, but on its own page" cannot be chosen: a page is always a section.

**Default** means:

| Where                        | Default                                              |
| ---------------------------- | ---------------------------------------------------- |
| Activity (activity settings) | Section                                              |
| Block (block settings)       | Inline                                               |
| Group of questions           | Section                                              |
| Go to activity / Use block   | as the activity / block it calls, for this call only |

The select shows what Default resolves to, e.g. **Default (Section)** on an activity, or
**Default (as the activity: Page)** on a Go to.

- The canvas shows a **Page**, **Section** or **Inline** badge when the choice is not Default,
  next to the Repeat / Instance badges. A group shown Inline is drawn with a dotted frame and
  no fill.
- The Instance field no longer offers `-1`. Projects that use it are converted on open: the
  node gets **Show as: Inline** and loses its instance value, and a discussion is opened on
  that node (the Go to, or the activity start) saying what changed, so the author can check it
  and resolve it. The project is unsaved until then, so the first save writes the change.
- Two Go to nodes that open the same instance of an activity as a page or section, with
  different **Show as** choices (other than Default), are an **error** in the validation list,
  as the export stops on it.

### Out of scope

- Previewing pages. The preview, when it exists, shows the exported form as it is.
- The meaning of other instance values (`0`, `n`) and of `repeat`, including `repeat = -1`.
- Whether the exported form is paginated: that is decided by `tricc_oo` from these settings.

---

## Part II — Technical specification

### 1. Format

Same attribute names as `tricc_oo` reads (draw.io and YAML):

```yaml
nodes:
  - id: s1
    type: activity_start
    page: true # optional, default false
    asGroup: false # optional, default true
  - id: g1
    type: goto
    link: cough
    page: false # optional; absent = as the activity
    asGroup: true # optional; absent = as the activity
  - id: bs
    type: block_start
    asGroup: true # optional, default false
  - id: b1
    type: block
    link: measure_temperature
    page: true # optional; absent = as the block
    asGroup: false # optional; absent = as the block
groups:
  - id: grp1
    name: danger_signs
    page: true # optional, default false
    asGroup: false # optional, default true
```

The file keeps the two attributes `tricc_oo` reads; **Show as** is how the editor writes them,
always as a pair (Default writes neither). Absent and `false` are different (absent defers to
the container's default, or on a Go to / Use block to the activity or block), so the serializer
writes a field only when it is set and never normalises `false` away.

Reading a pair back into the select (`showAsOf` in `@tricc/core`): neither set → Default;
`page: true` → Page (with `asGroup: false` as well: Page, and the `node.page-not-section`
warning); otherwise `asGroup: true` → Section, `asGroup: false` → Inline, `page: false` alone →
Section. Saving the select writes both.

`FORMAT_VERSION` stays `1.0.0`: the new fields are optional, the declared version of a file is
not checked on read, and `tricc_oo` ignores it.

### 2. `@tricc/core`

- `model/types.ts`: `TriccNode.page?: boolean`, `TriccNode.asGroup?: boolean`;
  `CanvasGroup.page?: boolean`, `CanvasGroup.asGroup?: boolean`.
- `format/schema/activity.ts`: `page: z.boolean().optional()`, `asGroup: z.boolean().optional()`
  on nodes; `page` and `asGroup` on the group schema. `format/node-fields.ts`: both `'scalar'`.
  `format/codec.ts` reads and writes them on groups.
- `format/schema/node-types.ts`: `hasShowAs(type)` (`activity_start`, `block_start`, `goto`,
  `block`), next to `isRepeatable`. The schema accepts them on any node; elsewhere they are a
  validation warning, not a load failure.
- `format/show-as.ts`: `ShowAs = 'page' | 'section' | 'inline'`, `showAsOf(pair)`,
  `showAsPatch(choice | undefined)` (the pair to write, `undefined` fields for Default) and
  `defaultShowAs(…)` (what Default resolves to on a container or call).
- `format/drawio.ts`: read `page` / `asGroup` (`true`/`false`/`1`/`0`, anything else ignored)
  on every shape and on `container_page`.
- **Conversion of `instance = -1` on open** (`migrateInlineInstances` in
  `format/serialize/index.ts`, run in `readFromTriccYaml` after the draw.io pages are merged, so
  YAML and draw.io projects alike): a `goto` or `activity_start` with `instance: -1` loses its
  instance; with no `asGroup` it gets `asGroup: false`, and `page: false` when `page` is absent;
  with `asGroup` already set only the instance is removed. Each converted node gets an open
  discussion anchored on it, authored by `TRICC`, saying what changed; its id is derived from
  the activity and node ids, so reading the same files gives the same project. The read result
  is `migratedFrom = 'inline-instance'`, so the project is dirty on arrival. The format
  migrations (`format/migrations`) are not used: they are not wired into reading.
- **Validation** (`validate/params.ts`, beside `sameInstance`):
  - `goto.instance-page`, **error**: gotos with the same `link|instance` that are not Inline
    (resolved `asGroup` true, with the target's start node as fallback) and set different
    `page` values. GoTos that leave `page` unset never conflict. An Inline goto has no instance
    to share (`tricc_oo` only checks `page`, on the instance path).
  - `goto.inline-instance`, warning: an Inline goto with an `instance` other than empty / 1
    (`tricc_oo` ignores it).
  - `goto.instance-negative`, error: `instance < 0` on a goto or activity start (the
    conversion leaves none; this catches an edit after load).
  - `node.page-not-supported`, warning: `page` / `asGroup` on a type that does not carry it.
  - `node.page-not-section`, warning: `page: true` with `asGroup: false` on the same node or
    group (`tricc_oo` keeps the page). The editor cannot write this pair; it comes from a file.
- `BlocksView.tsx` `BLOCK_RULES`: add `goto.instance-page` and `goto.inline-instance`.

### 3. `@tricc/editor`

- `activity/RepeatFields.tsx`: Instance `min` becomes `0` for a goto and an activity start; the
  goto help drops "-1 puts its nodes here" and says "Use **Show as: Inline** to put its nodes
  here."
- New `activity/ShowAsField.tsx`: one select (`field-show-as`) with Default / Page / Section /
  Inline, the Default entry labelled with what it resolves to (the container's default, or the
  target activity's / block's choice for a Go to / Use block). Used in the `ActivityEditor.tsx`
  node panel (goto, block), in `ActivitySettings.tsx` (activity and block start) and in
  `activity/GroupProperties.tsx`. It writes the pair from the table in Part I in one patch.
- `activity/canvas/TriccNode.tsx`, `activity/canvas/GroupNode.tsx`: a **Page** / **Section** /
  **Inline** badge from `showAsOf`, none for Default; an Inline group frame is dotted with no
  fill.
- Clipboard (`activity/canvas/clipboard.ts`) and group copy keep the new fields.

### 4. Tests

- `@tricc/core` (Vitest):
  - YAML round trip keeps `page` / `asGroup` on every carrier, including `false` on a goto
    and on a Use block, and `asGroup` on a group;
  - draw.io import reads them, and a goto with `instance="-1"` opens as Inline with a
    discussion;
  - the conversion: goto and activity start, `asGroup` already set, other instance values left
    alone, one discussion per node, same project on a second read of the same files, the saved
    files hold no `instance: -1`;
  - each validation rule above, including "one GoTo sets, the other does not" → no issue,
    an Inline goto beside a Page goto → no issue, and `page: true` with `asGroup: false` →
    `node.page-not-section`;
  - `showAsOf` / `showAsPatch`, including one-attribute and `true`/`false` pairs.
- `@tricc/editor` (Vitest + Testing Library): the select writes the pair and Default removes
  both; the Default label; the badges.
- `e2e/` (Playwright): **Show as** Page on an activity, Inline on a Go to and on a group,
  Section on a Use block, back to Default (both fields removed); badges shown; the saved YAML
  holds the fields; a project with `instance: -1` opens converted with its discussion.
- `node scripts/check-tricc-project.mjs` (workspace) against a converted test project.

### 5. Phases

1. `@tricc/core`: model, schema, serializer, draw.io import, conversion, validation.
2. `@tricc/editor`: fields, badges, help texts.
3. e2e, and a round trip through `tricc_oo` (`YamlStrategy` → FHIR).

---

## Open questions

None.

## Decisions

- 2026-11-20: field names and rules follow SwissTPH/tricc#90 (@delcroip)
- 2026-11-20: `asGroup` on every container and call (activity, block, group; Go to, Use block),
  defaults activity on, block off, group on, as in the #90 revision (@delcroip)
- 2026-11-20: one **Show as** select (Page / Section / Inline / Default) instead of two
  settings; it writes `page` and `asGroup` as a pair, and "inline on its own page" cannot be
  chosen (@delcroip)
- 2026-11-26: the format migrations are not wired into reading, so `instance = -1` is converted
  by a pass in `readProject`, like the other conversions on open; `FORMAT_VERSION` stays
  `1.0.0` (replaces the 2026-11-20 "1.1.0" decision) (@delcroip)
- 2026-11-26: the author learns of each conversion from a discussion opened on the converted
  node (goto or activity start), not from a validation message, which cannot be shown once
  (@delcroip)
- 2026-11-26: only `page` conflicts between gotos sharing an instance, among those that are not
  Inline, as in `tricc_oo` (`apply_goto_page_to_activity`); no `goto.instance-as-group` rule
  (@delcroip)
- 2026-11-26: approved for implementation (@delcroip)
