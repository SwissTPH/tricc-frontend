# Display text as ProseMirror documents

| Field             | Value                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | Implemented (2026-11-20)                                                                                                                                                                                                                                                                                                                                                                       |
| **Branch target** | `feature/prosemirror-display-text` → `develop`                                                                                                                                                                                                                                                                                                                                                 |
| **Scope**         | `@tricc/core`, `@tricc/editor`, `tricc_oo` (cross-repo)                                                                                                                                                                                                                                                                                                                                        |
| **Related**       | `20261008-data-dictionary-and-concept-texts.md` §2.7 (the `designation-message` tree, superseded here). `20261012-images.md` (`image` nodes, kept). `tricc_oo`: `feature/20260909-display-message-ast.md` (the tree this replaces), mirror spec `feature/20261120-prosemirror-display-text.md` (same schema, fixtures and storage), `fix/20261120-fhir-text-format.md` (PR SwissTPH/tricc#94). |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### The problem

The text editor works on one format (the editor's own document), but texts are saved in
another, a tree of our own shared with the converter. Every save and every open converts between
the two. Reading draw.io labels and writing Markdown repeat, by hand, rules the converter also
writes by hand, and the two have drifted before (spacing, split bold, Markdown typed in labels).

### What changes for an author

- Nothing visible: the same editor, the same formatting (bold, italic, underline, colour, lists,
  pictures, `${name}`).
- Markdown typed into an imported draw.io label (`**bold**`, `* item`) shows as formatting in the
  editor, as it already does in the exports.
- Projects saved by an older version open unchanged and are saved in the new form.

### Out of scope

- New formatting (headings, links, tables) and editor UI changes.

---

## Part II — Technical specification

### 1. Design

**Format.** A display text is a plain `string` (no structure) or a ProseMirror document
(`PmDoc`, the JSON of `editor.getJSON()`). The schema is the one in the `tricc_oo` mirror spec
§1: TipTap names (`doc`, `paragraph`, `bulletList`, `orderedList`, `listItem`, `text`,
`hardBreak`, `image`, `interp`; marks `bold`, `italic`, `underline`, `textStyle.color`).
`Message` / `MessageNode` and the tree ⇄ document mapping are removed.

**Libraries in `@tricc/core`:**

- `prosemirror-model`: `Schema`, `Node.fromJSON`, `DOMParser`.
- `markdown-it` (preset `zero` + `list`, `emphasis`, `newline`, `image`), with an `interp` inline
  rule for `${name}`; its tokens are mapped to nodes and marks the way `tricc_oo` maps them
  (a blank line between top-level blocks is an empty paragraph). `prosemirror-markdown` is not
  used: its parser cannot see the blank lines and its serializer separates blocks with a blank
  line, while `tricc_oo` writes blocks as lines (see Decisions).
- `linkedom`: a DOM for `DOMParser` in Node and in the browser alike, so the import gives the same
  result in the app, in tests and in `scripts/check-tricc-project.mjs`. The hand-written HTML
  tokenizer in `text/message.ts` is removed.

**`packages/core/src/text/`** (`message.ts` is replaced by):

- `schema.ts` — `textSchema` (`prosemirror-model` `Schema`), the source of truth on this side.
- `normalize.ts` — `normalize`, the canonical form every reader returns (as `tricc_oo`
  `normalize`).
- `parse.ts` — `fromHtml` (draw.io labels: DOM import → `${name}` split → typed Markdown re-read,
  as `tricc_oo` §1.2), `fromMarkdown`, `docFromJson` (schema-checked; core already exports `fromJson` for project files), `fromMessageJson` (old
  `designation-message` tree, read-only).
- `render.ts` — `toPlain`, `toMarkdown` (blocks as lines, as `tricc_oo/text/render.py`),
  `inlineMarkdown`, `references`, `imageRefs`,
  `retargetImage`, `prependImage`, `isStructured`, `simplify` (a document with one plain
  paragraph becomes a `string`).
- `designation.ts` — `designationText` reads `designation-doc`, then `designation-message`, then
  `value`; `withDesignationText` writes `value` (Markdown) and `designation-doc`
  (`https://tricc.org/StructureDefinition/designation-doc`, compact JSON) only when structured,
  and drops `designation-message`.

**`@tricc/editor`.** `RichTextEditor` stores `editor.getJSON()` directly and builds its
extensions from the same schema names (StarterKit + `TextStyle`/`Color` + the existing image node

- an `interp` node). `text/prosemirror.ts` (`toDoc`/`fromDoc`) is deleted. `RichTextField`,
  `ConceptCard`, `ConceptDialog` and `activity/canvas/elements.ts` use `toPlain` / `toMarkdown` /
  `isStructured` from core as today.

**draw.io import** (`format/drawio.ts`): `labelMessage` becomes `labelDoc: PmDoc` from
`fromHtml`; `terminology/texts-to-concepts.ts` writes it with `withDesignationText`.

### 2. Validation and errors

- `docFromJson` rejects a document that does not fit the schema; the designation falls back to
  `value` and `validate/project.ts` reports it once per concept.
- `textStyle.color` keeps the `isColor` check; `image.src` keeps the `Binary/<id>` check.

### 3. Tests

- The shared fixtures from `tricc_oo` (`tests/text/fixtures/*.json`) are copied to
  `packages/core/src/text/fixtures/` and run by `text/fixtures.test.ts`: HTML or Markdown in →
  same ProseMirror JSON → same plain and Markdown out as Python.
- `designation.test.ts`: `designation-doc` round trip, old `designation-message` read, `value`
  fallback, plain text costs no extension.
- Existing `message.test.ts` and `prosemirror.test.ts` cases move to the new modules; the editor's
  e2e rich-text specs stay green.

### 4. Phases

1. `text/schema.ts`, `parse.ts`, `render.ts`, `designation.ts` with the shared fixtures.
2. Switch core call sites (`drawio.ts`, `texts-to-concepts.ts`, `mutations.ts`, `usage.ts`,
   `validate/project.ts`, `serialize/index.ts`, `model/types.ts`).
3. Editor: store `getJSON()`, delete `text/prosemirror.ts`.
4. Remove `Message` types and the old tokenizer; README row → Implemented.

---

## Open questions

None open; see Decisions.

## Decisions

- 2026-11-20: ProseMirror JSON with TipTap names is the stored format; the `Message` tree is read only for compatibility. (Patrick, in conversation)
- 2026-11-20: core uses `prosemirror-model`, `markdown-it` and `linkedom` (`prosemirror-markdown` dropped in implementation, see below); the schema and the fixtures are shared with `tricc_oo` (`fixtures/`, synced by `tricc_oo`'s `scripts/sync-text-fixtures.sh`; frontend-only cases in `fixtures-frontend/`).
- 2026-11-20: new extension URL `designation-doc`; `designation-message` read, never written.
- 2026-11-20 (implementation): the text parser is exported as `docFromJson`, since core already exports `fromJson` for project files. The editor saves `getJSON()` through `docFromJson`, which keeps it as is apart from dropping TipTap's unused `orderedList.type` and sorting marks in schema order.
- 2026-11-20 (implementation): a designation `value` with no extension is read as Markdown, but a value that reads as plain text is kept exactly as typed (Markdown would trim spaces while an author types in a plain field).
- 2026-11-20 (implementation): Markdown is read with `markdown-it` and written by a port of `tricc_oo/text/render.py` (blocks are lines, an empty paragraph is a blank line, underline and colour have no Markdown), not with `prosemirror-markdown`, so the shared fixtures match; the colour `<span>` the old tree wrote into `value` is gone (the document keeps the colour).
