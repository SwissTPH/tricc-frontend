<!-- fix: slug=sequence-calculate -->

# A sequence-driven calculation is reported as having no expression

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Status**        | Implemented                                                            |
| **Approved**      | 2026-11-26, in conversation                                            |
| **Branch target** | `fix/sequence-calculate` → `develop`                                   |
| **Scope**         | `@tricc/core` (validation, `sequencePaths`), `@tricc/editor` inspector |
| **Related**       | `fix/20261121-dangling-calculates.md` (its "Out of scope" line)        |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Issue analysis

### Symptoms

An author draws a calculation at the end of one or more paths and leaves its expression empty:
it should be true when one of those paths was followed. The validation panel shows an error on
it: "This calculation has no expression, so it will always be empty. Write what it should
compute." (`calculate.no-expression`), and the project cannot be exported.

### Who is affected

Every author who uses sequence-driven calculations, a common pattern in drawn guidelines.

### Expected vs actual

| Expected                                                                                  | Actual                                         |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------- |
| No error: the calculation is true when one of the paths leading to it was followed.       | `calculate.no-expression` error, blocks export |
| The inspector shows those paths, from the activity start, so the author sees the meaning. | The inspector shows an empty CQL field only.   |

### How to reproduce

1. Activity start → yes/no question "Fever" → its "Yes" link → a calculation with no expression.
2. The validation panel reports `calculate.no-expression` on the calculation.

### Out of scope

- A calculation with no link into it and no expression is still an error: it has nothing to be
  worked out from.
- An intent written without CQL (open hand-off) is still reported, as `expression.open-handoff`.

---

## Part II — Fix approach

### 1. Root cause

`validateActivity` (`packages/core/src/validate/activity.ts`) reported every `calculate` without
an expression. `tricc_oo` gives such a calculation the expression of the nodes before it
(`get_calculation_terms` → `get_prev_node_expression` in `tricc_oo/visitors/tricc.py`): the OR of
the paths that lead to it. Only a calculation with no link into it and no expression is empty.
`fix/20261121-dangling-calculates.md` kept the old rule as out of scope.

### 2. Fix

- `calculate.no-expression` applies to a `calculate` with no expression **and no incoming link**.
- `sequencePaths(activity, nodeId, limit)` (`packages/core/src/model/sequence-paths.ts`) lists the
  paths that lead to a node, each from a node nothing leads to (the activity start, or a
  calculation that starts on its own) to the node, with the value of each link. Paths through a
  loop are left out; past `limit` paths, or 5000 visited nodes, it says there are more.
- The inspector of a linked `calculate` with no expression shows "Sequence-driven" and those
  paths, reduced to their decision points: the first step ("Activity started"), then each step
  whose link carries a condition (an answer, yes/no, a CQL condition) and each decision
  (rhombus), as "Fever: Yes". Steps with an unconditional link are left out, and paths that read
  the same once reduced are shown once. Each step reveals its node.

- A "follow" link n1 → n2 ignores the answer at n1: whatever happens at n1, or at any node
  between n1 and n2, does not matter on a path that goes through both. On such a path, n1 and
  every step up to n2 are dropped before the decision points are picked, so every route from n1
  to n2 merges with the follow link (n2 may be the calculation itself). The activity start is
  always kept.

### 3. Code checklist

- [x] `validateActivity`: skip `calculate.no-expression` when a link leads to the calculation.
- [x] `sequencePaths` in `@tricc/core`, exported.
- [x] `SequencePaths` inspector section under the calculation field.

### 4. Tests

- `validate.test.ts`: a linked calculation with no expression has no `calculate.no-expression`
  (failed before the fix); an unlinked one still has it; an open hand-off on a linked one is
  still reported.
- `sequence-paths.test.ts`: paths in order with link values, loops left out, the limit.
- `SequencePaths.test.tsx`: the inspector lists "Activity started → Fever: Yes" and
  "Activity started → Fever: No" (an unconditional question before the decision is left out, a
  second route through "Yes" is shown once), and hides the list once an expression is written;
  with Cough "follow" → Fever and Cough → Yes → Chest → Yes → Fever, one path is listed:
  "Activity started → Fever: Yes".

### 5. Acceptance criteria

- The reproduction above shows no validation error, and the inspector lists the path.
- A calculation with neither link nor expression still shows `calculate.no-expression`.

---

## Open questions

None.
