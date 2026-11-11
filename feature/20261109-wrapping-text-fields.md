# Long labels wrap in their fields instead of scrolling out of sight

| Field             | Value                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------- |
| **Status**        | Implemented (2026-11-11, RFC #36)                                                       |
| **RFC**           | [#36](https://github.com/SwissTPH/tricc-frontend/issues/36)                             |
| **Branch target** | `feature/wrapping-text-fields` → `develop`                                              |
| **Scope**         | `@tricc/editor`                                                                         |
| **Related**       | #23 (tall preference fields edited in a dialog: a different case, multi-line by nature) |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### The problem

The **Label** in the Details panel is a one-line box. A label longer than the box scrolls
sideways while it is typed; once the author clicks elsewhere and comes back, only the start of
the text is visible. To read or check the rest they have to click into the box and move through
it with the arrow keys. Clinical labels are often long ("Does the child have chest indrawing
when calm?"), so this happens a lot. The group **Title**, the activity **Title** and the
concept **Display** have the same problem.

### What changes for an author

- These fields show the whole text, wrapped over as many lines as it needs. The box grows as
  they type and shrinks when text is removed. Nothing to drag or expand.
- A short label still looks like a one-line box.
- **Enter** does not start a new line: a label stays one line in the exported form. A pasted
  text with line breaks has them turned into spaces.
- Nothing else changes: same fields, same place, same saving.

### Out of scope

- Codes, names, units, languages and storage paths: they are short identifiers and stay one-line.
- Rich texts (questionnaire text, hint, help), which already have their own editor.
- Node text on the canvas: it is cut to the viewer's "lines of text on a node" preference, and
  the hover card shows the rest.
- Multi-line labels.

---

## Part II — Technical specification

### 1. Design

A new component `packages/editor/src/components/WrappingInput.tsx`, built on the existing
`Textarea` (`components/ui/textarea.tsx`, which already has `field-sizing-content`):

- `rows={1}`, no resize handle, the height of the existing `Input size="sm"` when the text fits
  on one line (overrides the textarea's `min-h-14`).
- `onKeyDown`: Enter (without IME composition, `!event.nativeEvent.isComposing`) is
  `preventDefault`ed.
- `onChange` receives the value with `/\r\n|\r|\n/g` replaced by a single space, so pasting or
  dropping text cannot introduce a line break.
- Grows with its content through `field-sizing: content`. Where the browser lacks it (Firefox
  today; `CSS.supports('field-sizing', 'content')` is false), a layout effect sets
  `height = scrollHeight` on each value change and on resize of the panel.
- Same props as `Input` for these call sites (`id`, `data-testid`, `value`, `readOnly`,
  `disabled`, `onChange`, `aria-label`, `placeholder`), so the swap is one line each.

Call sites switched from `Input` to `WrappingInput`:

| Field                          | File                            | Test id                                       |
| ------------------------------ | ------------------------------- | --------------------------------------------- |
| Node Label                     | `activity/ActivityEditor.tsx`   | `field-label`                                 |
| Group Title                    | `activity/GroupProperties.tsx`  | `group-title`                                 |
| Activity Title                 | `activity/ActivitySettings.tsx` | `act-title`                                   |
| Concept Display                | `terminology/ConceptDialog.tsx` | `concept-display`                             |
| Plain text of another language | `terminology/ConceptDialog.tsx` | `concept-text-<n>-value` (non-rich uses only) |

No model, format or export change: the values were one-line before and stay one-line.

### 2. Validation and errors

None new. A label already stored with a line break (imported from draw.io, say) is shown as it
is; the first edit replaces the break with a space.

### 3. Tests

- Vitest (`components/WrappingInput.test.tsx`): Enter does not change the value; a value typed
  or pasted with `\n` reaches `onChange` with spaces; `readOnly` / `disabled` pass through.
- `integration.test.tsx`: the existing `field-label`, `group-title`, `act-title` and
  `concept-display` cases keep passing unchanged (same test ids, same values).
- Playwright (`e2e/authoring.spec.ts`), Chromium and Firefox: type a 120-character label,
  select another node, select the first again; the label box is taller than one line and shows
  the whole text (`scrollWidth <= clientWidth`, `scrollHeight <= clientHeight + 1`). A short
  label keeps the one-line height.

### 4. Phases

1. `WrappingInput` with its unit tests; switch the node Label; e2e test.
2. Switch the group Title, activity Title, concept Display and plain other-language texts.

---

## Open questions

None.

## Decisions

- 2026-11-09: All five fields switch (node Label, group Title, activity Title, concept Display,
  plain other-language texts).
- 2026-11-09: Firefox grows the box with the `scrollHeight` effect, so both browsers behave the
  same.
- 2026-11-09: Enter does nothing in these fields, as in a one-line input today.
