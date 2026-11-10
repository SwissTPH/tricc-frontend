# Preferences: two-column layout, and tall fields edited in a dialog

| Field      | Value                                                       |
| ---------- | ----------------------------------------------------------- |
| **Status** | Implemented (2026-11-09, RFC #23)                           |
| **RFC**    | [#23](https://github.com/SwissTPH/tricc-frontend/issues/23) |

## Problem

The Preferences page (`Preferences` in [App.tsx](apps/local/src/App.tsx)) is one long column. Each setting is a label, a full-width field, then a paragraph of explanation, one after another:

- theme, display name, lines of text on a node, diagram style, space between side-by-side nodes, characters of a label in short lists, concept types, maximum image width, storage note.

With the settings added lately (diagram style, the tidy-layout node gap), the page has to be scrolled to find a setting, and the explanations push the fields apart. The **Concept types** textarea (8 rows, one type per line, 26 types by default) takes up most of a screen by itself, so everything below it is out of view.

## Proposal

### Two columns, like the concept page

Lay Preferences out as a two-column grid: the setting's name on the left, its control on the right. This is the layout the concept page already uses: `.tricc-concept__body` in [ConceptDialog.tsx](packages/editor/src/terminology/ConceptDialog.tsx) / [styles.css](packages/editor/styles.css), `grid-template-columns: max-content minmax(0, 1fr)`, with headings, notes and tables spanning both columns.

- The explanation for each setting goes under its control, in the right column, in the muted small text used elsewhere (or as a hover hint on the label), so one setting is one row.
- Group the rows under short headings, for example **You** (display name, theme), **Diagram** (diagram style, lines of text on a node, space between side-by-side nodes), **Lists and labels** (characters of a label in short lists), **Data dictionary** (concept types), **Media** (maximum image width), **Storage** (the storage note).
- Reuse the same class or a shared one rather than a third copy of the grid.
- Narrow window: the two columns stack, as the concept page does.

### Tall fields edit in a dialog

A field that would be taller than one line on the page is shown as a short summary with an **Edit…** button, and edited in a dialog:

- **Concept types:** the row shows the count and the first few ("26 types: Observation, Value, Condition, …"). **Edit…** opens a dialog with the one-per-line textarea, **Save** and **Cancel**. Escape cancels. The change applies on Save, not on each keystroke.
- Any later multi-line preference follows the same rule, so no single field stretches the page.

Use the shared `Dialog` from [Dialog.tsx](packages/editor/src/components/Dialog.tsx), as the activity and intervention settings do.

## Acceptance

- [ ] Preferences is a two-column grid (name | control) with grouped headings, using the concept page's layout style.
- [ ] Each setting's explanation stays with its row; no full-width paragraph between rows.
- [ ] Concept types shows a one-line summary and an **Edit…** button; the textarea is only in a dialog with Save / Cancel; Escape cancels.
- [ ] Every test id stays the same (`pref-label-lines`, `pref-node-gap`, `pref-diagram-style-*`, `pref-label-chars`, `pref-image-width`, `display-name`); `pref-concept-types` is the textarea inside the dialog, and the summary row gets a new id.
- [ ] Under 900px the columns stack and nothing scrolls sideways.
- [ ] e2e test: edit the concept types through the dialog; Cancel keeps the old list, Save keeps the new one after a reload.

Related: #22 (a Close that returns to where you were). If #22 turns Preferences into an overlay, this layout applies to that overlay.
