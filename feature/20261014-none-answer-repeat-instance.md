# "None of these" answer, repeat and instance on every node

| Field | Value |
|-------|-------|
| **Status** | Implemented (frontend). `tricc_oo` YAML input reads `is_none` (working tree, not committed). |
| **Repo** | `tricc_frontend` — `@tricc/core`, `@tricc/editor`; `tricc_oo` (`strategies/input/yaml.py`) |
| **Source** | Patrick, 2026-10-14 |
| **Decisions** | 2026-10-14: `is_none` is set from the select or from the answer, not on the concept; a select may have none. `instance` is supported the same way as `repeat`, though it should go away with `tricc_og`. |

## Part I — What the author sees

### "None of these"

A select's answers may include one that means *none of the others applies* ("No danger sign").
It can be set from either side, which edit the same thing:

- on the question, **None of these**: a list of its answers, or *No such answer*;
- on each answer, a **None of these** checkbox.

Marking one answer unmarks any other. On the canvas the answer row shows a small **none** badge.
A question with two (from a drawing) gets a warning: tricc_oo only uses the first.

### Repeat and instance

Every node that holds a value (questions, calculations, counts, sums, prefilled values,
diagnoses), every goto, and the activity itself (in the activity gear) has **Repeat** and
**Instance** fields. A decision, a note and the flow anchors have neither. Empty means 1.
The node shows a *Repeat n* / *Instance n* badge when it is not 1.

- **Repeat**: collect again in a new slot (2, 3…); `-1` collects here only and inherits nothing.
  On the activity, every value of the activity; on a goto, the called activity.
- **Instance**: the same collection reached at several points — collected once, then reused.
  On a goto: which copy of the activity (`0` a new one each time, `-1` its nodes inlined).

See `../../tricc_oo/docs/tricc-elements.md`, "Instance vs repeat" and "Concept repeat".

## Part II — Technical specification

- `SelectOption.is_none?: boolean`, written as `is_none: true` on the answer in the activity
  YAML (absent when false), kept in the Y.Doc, read from a draw.io `select_option`'s `is_none`
  attribute as tricc_oo does (`xml_to_tricc.py`). Rule `select.several-none` (warning).
- `isRepeatable(type)`: named types, `goto`, `activity_start`. `repeat` and `instance` were
  already in the model, both codecs and the draw.io import; only the editor limited them.
  `RepeatFields` renders both, in the node panel and in `ActivitySettings` (on the root node).
- `tricc_oo`: `YamlOption.is_none` passed to `TriccNodeSelectOption`. Not done: the YAML
  `NODE_TYPE_MAP` lists `instance` only on `activity_start` and `goto` (and has no `count` /
  `add` entries); on other nodes tricc_oo's base `instance` is its internal copy number, so
  reading an authored one there needs a decision on the tricc_oo side first.
