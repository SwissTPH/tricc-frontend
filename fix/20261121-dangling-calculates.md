# Calculations with no link into them: start points, not unreachable

| Field             | Value                                                                          |
| ----------------- | ------------------------------------------------------------------------------ |
| **Status**        | Implemented (approved 2026-11-21, in conversation)                             |
| **Branch target** | `fix/dangling-calculates` → `develop`                                          |
| **Scope**         | `@tricc/core` `validate/`, `@tricc/editor` canvas                              |
| **Related**       | `../feature/20261008-drawio-import-and-sequence-nodes.md`, Global ALMANACH run |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Issue analysis

### Symptoms

A calculation drawn with no link into it (a "dangling" calculation) is a normal pattern in
drawings. It is worked out from its expression wherever the consultation is, and the path
drawn after it is followed only when it is true. Linking it to the activity start would
change that: it would be true as soon as the activity starts.

The editor treated everything after such a calculation as "Nothing leads here". The Global
ALMANACH showed 820 of those warnings, almost all false. The canvas did not show that the
calculation stands on its own.

### Expected

- No "unreachable" warning on the calculation, or on what follows it, when it has something to
  be worked out from:
  - an expression or a reference;
  - another node of the same name in the project, whose value it takes. For example, the
    vitamin A diagnosis takes its value from its proposed diagnosis.
- A small mark in the node's top-left corner says that it starts on its own.

### Out of scope

`calculate.no-expression` is unchanged. A calculation with no expression that is reached by
a path is still reported.

---

## Part II — Fix

### Root cause

`validateActivity` (`packages/core/src/validate/activity.ts`) walked the graph only from the
start nodes. `unreachableOk` exempted the calculation itself, but not the nodes after it.

### Rule

`danglingCalculates(activity, project?)` (`packages/core/src/model/dangling.ts`) returns the
nodes that `tricc_oo` collects in `manage_dangling_calculate` (`TriccNodeCalculateBase`) and that
have something to work them out from. Each such node:

- has no incoming edge;
- has a type of calculation, count, add, diagnosis, proposed diagnosis, decision (rhombus) or
  populate;
- and has one of the following:
  - a `calculate` or `expression`, or a string `reference`;
  - another node with the same `name` in the project (`tricc_oo` version inheritance);
  - being a populate, whose value is always read from the record.

The reachability walk starts from the start nodes and from these nodes. The per-project name
count is cached per snapshot (a `WeakMap`).

### Canvas

`elements.ts` sets `dangling` on the node data. `TriccNode.tsx` `DanglingMark` draws a BPMN
conditional start event (a thin circle around a ruled sheet) on the top-left corner. Its tooltip
says what it means. It has test id `node-<id>-dangling`.

### Tests

- `validate.test.ts`:
  - with an expression, a reference and a decision;
  - a diagnosis that takes its value from a proposed diagnosis elsewhere;
  - no expression and no peer still leaves what follows unreachable.
- `activity/canvas/dangling.test.tsx`: the mark is shown on the right nodes, and the node after
  the calculation carries no warning.

### Result

Global ALMANACH: 820 `node.unreachable` warnings became 6. The 6 left are true orphans:
4 notes, 1 link-in, and the question after one of them.
