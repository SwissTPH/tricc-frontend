# Generic names ending with `_` share one concept and lose their texts

| Field             | Value                                                                           |
| ----------------- | ------------------------------------------------------------------------------- |
| **Status**        | Implemented (approved 2026-11-22, in conversation)                              |
| **Branch target** | `fix/underscore-names` → `develop`                                              |
| **Scope**         | `@tricc/core` `terminology/`                                                    |
| **Related**       | `../feature/20261008-data-dictionary-and-concept-texts.md`, Global ALMANACH run |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Issue analysis

### Symptoms

Drawings give many items a generic name that ends with `_`: notes are `label_`, some
questions are `select_`. When a drawing is opened, each text moves to the concept named like
the item. All items called `label_` therefore wrote to one concept. The first text stayed and
every other one was dropped. In the Global ALMANACH this lost most note texts, including the
dose texts.

### Expected

Each such item gets its own concept, named with the item's id after the `_`
(`label_` on node `42` becomes `label_42`).

### Out of scope

Names that do not end with `_`, and items that carry no text: links (`lk_`), goto names
(`act_`) and logic nodes keep their names.

---

## Part II — Fix

`moveTextsToConcepts` (`packages/core/src/terminology/texts-to-concepts.ts`):

- Before it picks the concept code of an item with text and no explicit concept, the item's
  name goes through `ownName(name, id)`.
- `ownName` appends the item's id when the name ends with `_`. The id is the node id, or the
  option id for an answer. Characters outside `[A-Za-z0-9_.-]` become `_`.
- The node or answer keeps the new name, so it stays linked to its concept by name.
- Page groups follow the same rule with the group id.
- The result no longer ends with `_`, so a second pass changes nothing.

### Tests

`terminology.test.ts`: two `label_` notes get `label_n1` and `label_x_2`, each with its own
text; no `label_` concept is created; a second pass keeps the names.

### Result

Global ALMANACH: 272 notes and answers now have their own concept, and no concept name ends
with `_`.
