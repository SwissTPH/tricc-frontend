# Not available — a node with reasons

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_frontend` + **`tricc_oo`** (§2.6, YAML path only) |
| **Depends on** | `20261008-data-dictionary-and-concept-texts.md` phases 1-3. The node and its reasons carry concept codes only, and their texts live in the CodeSystem. |
| **Related** | `../../tricc_oo/feature/20260902-not-available-title-options.md` (Implemented in `tricc_oo`), `20261008-drawio-import-and-sequence-nodes.md` §2.4, `20260825-project-format.md` §4 (the `notAvailable` modifier this replaces) |
| **Source** | Review remarks, 2026-10-08 |
| **Approval** | — |

---

## Part I — Business description

Some measurements cannot always be taken. For example, the scale is broken, or the child is not
stable enough to weigh. TRICC calls this **Not available**. It is a small question attached to a
measurement. When it is ticked, the measurement is no longer required and the guideline
continues without it.

`tricc_oo` now supports giving the *reasons* (2026-09-02). The node has two parts:

- a title, for example "Weight could not be measured";
- a list of reasons, for example "No scale" and "Not stable enough".

The health worker picks one reason. Picking any reason counts as "not available".

The authoring app does not support this yet:

- `not_available` is hidden from the palette.
- Its reasons cannot be edited.
- The older "Not available" badge on a question saves a `notAvailable:` key, and `tricc_oo`
  silently ignores that key.

After this work, the author can:

- add a Not available node from the palette;
- link it from the measurement;
- pick or create a concept for its title and for each reason.

The activity file holds only the codes. The title and reason texts, and their translations, live
in the data dictionary like every other question.

---

## Part II — Technical specification

### 2.1 Shape in the file

`tricc_oo` YamlStrategy expects `type: not_available` (`yaml.py:268-274`, model
`TriccNodeSelectNotAvailable`). There is no inline text, per the codes-only rule
(data-dictionary spec §2.0):

```yaml
- id: weight-na
  type: not_available
  name: weight_na                       # = concept code; title text = its q-display
  options:
    - { id: weight-na-scale,  name: na.no_scale }    # = reason concept code
    - { id: weight-na-stable, name: na.not_stable }
edges:
  - { source: weight, target: weight-na }   # unconditional; the measured question is the parent
```

- The parent is the source of the single incoming edge.
- Edges out of `weight-na` mean "any reason chosen".
- No synthetic option `"1"` is written.
- The node `name` and each option `name` are concept codes in `default_code_system`
  (data-dictionary spec §2.0). `concept:` appears only as an override.
- Reason concepts are ordinary concepts, so the same `na.no_scale` can be reused across Not
  available nodes. That also satisfies the `tricc_oo` request that copies share option names.

### 2.2 Editor

**Palette**

- Add `not_available` to `DRAWABLE_TYPES`, in the Question group.
- Label "Not available", button `add-not_available`, glyph `∅` (`node-visuals.ts:72`).
- Default name: `uniqueId('not_available', names)`. The type is already in the validator's
  `needsName`.

**Properties**

- The Concept section from the data-dictionary spec §2.3 gives the title text.
- Name.
- The answers editor that select nodes use (`ActivityEditor.tsx:612`). Widen the `isSelect` gate
  to include `not_available` and head the section "Reasons".
- Each reason row has the answer concept picker and the stored `name`.
- The picker offers reason concepts already used by other Not available nodes first.

**Canvas**

- The reasons render as rows, like `select_one` (`--answers` in `TriccNode.tsx`), showing each
  reason concept's q-display.
- The rows have **no** per-answer source handles. Outgoing edges always use `out`.
- The edge from the measurement into the node is unconditional
  (`20261008-drawio-import-and-sequence-nodes.md` §2.4).

**Quick-add from a measurement**

- Add an "Add Not available" button to the properties of numeric and date questions (integer,
  decimal, quantity, date).
- One `mutate` does all of this:
  - creates the node below-right of the question;
  - creates a title concept, with code `<question concept code>.na`;
  - creates the edge from the question;
  - selects the new node.
- One undo removes all of it.

### 2.3 Validation

| Code | Severity | Rule |
|------|----------|------|
| `not-available.no-parent` | error | Exactly one incoming edge, and its source is a question node. |
| `not-available.no-reasons` | warning | No options. `tricc_oo` then renders no radios, so the node cannot be chosen. |
| `node.missing-concept` | error | From the data-dictionary spec. Applies to the node and to each reason. |
| `node.missing-name` | error | Existing rule. |

`not_available` stays exempt from the unreachable warning (`validate/activity.ts:85`).

### 2.4 Retire the `notAvailable` modifier

The modifier is the `{name,label,concept}` badge on a question:

- `format/codec.ts:108-114,301-307`
- `document/codec.ts:80-85,138-147,178-191`
- `TriccNode.tsx:46`

It was meant to expand into a sibling node on save. That was never built, and `tricc_oo` drops
the key.

**Read.** Expand a `notAvailable:` key into a `not_available` node plus its edge:

- place it at the question's `ui` position plus (240, 0);
- copy `name` and `concept`;
- if the modifier had an inline `label` and no concept, apply the data-dictionary §2.0 migration,
  so the label becomes a concept q-display;
- leave the reasons empty;
- emit info `not-available.migrated`.

**Write.** Never write `notAvailable:`.

Remove the badge and the modifier fields from `TriccNode`.

### 2.5 Draw.io read

- `drawio.ts:170` folds `select_option` children only for `isSelectNode`. Extend it to
  `not_available`, so reasons become `options` instead of loose `select_option` nodes.
- Shape texts go through the data-dictionary §2.0 migration: the header becomes the title
  concept and each child becomes a reason concept.
- Drop any value on the edge into the node (the import spec, §2.4).

### 2.6 `tricc_oo` gap (YAML path)

Draw.io sets `not_available.parent` from the incoming edge (`xml_to_tricc.py:271-286`).
YamlStrategy `_build_activity` does not, so the relevance and required coupling
(`visitors/tricc.py:505-522`) is missing for YAML projects.

- Add the same parent assignment after the edges are built in `strategies/input/yaml.py`.
- Add a fixture to `tests/test_not_available_options.py`:
  - load through YAML with concept-only node and options;
  - assert that `parent` is set;
  - assert that the measurement's required is cleared when a reason is chosen;
  - assert that the option labels come from the CodeSystem.
- Mirror a short note into `../../tricc_oo/feature/` on approval.

### 2.7 Tests

**core**

- YAML round-trip of `not_available` with concept-only options
- `notAvailable:` migration on read
- draw.io fold of reason children into concepts
- the validation rules

**editor integration**

- add from the palette
- the reasons editor with the concept picker
- quick-add from a decimal, then one undo

**e2e `canvas.spec.ts`**

- add from the palette and connect from a decimal; no branch modal opens
- the saved YAML has no `label:`

### 2.8 Open questions

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Should Not available be restricted to numeric and date sources? | Warn on other sources. Do not block. |
| 2 | Should the editor seed a default reason set? | No. Do not invent values. Offer existing reason concepts first. |
| 3 | Code pattern for generated title concepts (`<code>.na`)? | Yes, unless the project has a naming convention. |
