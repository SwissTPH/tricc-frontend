# Deduced process wrapper — the intervention link as definition

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_frontend` + **`tricc_oo`** (the deduction happens on the Python side) |
| **Related** | `20260826-project-and-interventions.md` (the intervention model this builds on), `20260825-tricc-oo-interop.md` (§5 `TriccProjectStrategy`, where the deduction would live), `20260825-project-format.md` §4 (node types), `../../tricc_oo/tricc_oo/strategies/input/base_input_strategy.py` (`execute_linked_process`) |
| **Supersedes** | Nothing. This is the **alternative** to the materialised process activity shipped in the app today. |
| **Approval** | — |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

> **What is built today is the other option.** Process activities are authored: a real page
> rooted by `start` carrying a `process`, wrapping calls to normal activities, and listed
> by the intervention. That works with `tricc_oo` unchanged. This spec describes replacing
> that with deduction, and is written now so the decision stays open and the reasoning is
> not lost.

---

## Part I — Business description

### The idea

An author draws activities. An intervention says which activities make up which process,
in what order. **Nothing else is drawn.** The process entry point — the thing TRICC calls
a `start` node with a process — is worked out from that list at conversion time, rather
than being a page someone maintains.

The consequence is a clean split. The **definition** of a guideline is: these activities,
grouped into these processes, in this order, applying under these conditions. The
**implementation** — main starts, process entry pages, the chaining between segments — is
something the converter produces. An author never sees or maintains it.

### Why it is worth considering

**Reuse becomes the default.** A normal activity carries no process affiliation, so the
same activity can be registration in one intervention and be `goto`-called from inside
another, with nothing to duplicate. Today, being a process entry means having a wrapper;
if you want the same content in two processes you maintain two wrappers.

**Far fewer concepts.** The author learns "activity" and "intervention". They do not learn
that some activities are secretly entry points with different linking semantics. That is
the barrier-lowering `20260825-guided-authoring.md` exists to achieve, applied to the one
place the current design still asks an author to understand an implementation detail.

**One source of truth.** The intervention's ordered list *is* the process definition, so
nothing can disagree with it. With authored wrappers there are two places that must
match — the intervention's list and the wrapper's calls — and they can drift.

**Readable change history.** "Added `hp-diarrhoea` to `history-and-physical`" is one line
in `project.json`, not a new page plus a call node plus an edge.

### What it costs

**It cannot ship without the `tricc_oo` change.** Nothing today reads an ordered activity
list and produces process entry pages. Until that exists, a project authored this way does
not convert at all. This is the whole reason the materialised option was built first.

**Segment-level logic has nowhere to live.** Applicability is already on the link. But a
priority, a note shown at the start of a segment, or a decision that gates the whole
segment currently have no home. The failure mode to watch is adding fields to the link one
at a time until it is a diagram expressed in JSON — at which point drawing it would have
been better.

**Order expresses sequence only.** "Do A, then B or C depending on X" cannot be said in an
ordered list. That is the boundary of what deduction can carry.

**Debugging moves one step away.** When a process chain converts wrongly, the cause is
Python code rather than a page an author can open and look at.

---

## Part II — Technical specification

### 1. What changes in the authored project

Nothing is added to the format. What changes is what is *absent*: there are no activities
rooted by `start`, and `activity.process` is not set by the editor.

```jsonc
"interventions": [
  {
    "id": "sick-child",
    "processes": [
      { "process": "registration",         "activities": ["reg-child"] },
      { "process": "history-and-physical", "activities": [
          "hp-cough",
          { "ref": "hp-diarrhoea", "applicability": { "expression": "\"Diarrhoea reported\"" } }
      ]}
    ]
  }
]
```

The array order is the sequence within the process — settled in
`20260826-project-and-interventions.md` and already implemented.

### 2. What `tricc_oo` deduces

In `TriccProjectStrategy` (`20260825-tricc-oo-interop.md` §5), after activities are loaded
and before `execute_linked_process` runs:

For each intervention, for each process group, synthesize one **process activity**:

```
TriccNodeActivity(
  id      = f"{intervention.id}__{process}",
  root    = TriccNodeMainStart(process=process, form_id=..., label=...),
  nodes   = [root, *goto per listed activity, end],
  edges   = root → goto₁ → goto₂ → … → end
)
```

- One wrapper per process, calling each listed activity in order. This is the shape agreed
  in `20260826-project-and-interventions.md`, and it matches how a process reads
  clinically: one segment, several steps.
- Each `goto` uses `instance = 0` (auto-unique nested instance), so a normal activity
  listed in two interventions gets a distinct instance in each and their relevance cannot
  leak into one another.
- Per-reference `applicability` becomes the `goto`'s relevance.
- The synthesized activity is registered in `project.pages` and `project.start_pages`
  exactly as a drawn process page would be, so everything downstream is unchanged.

**Determinism matters here.** The synthesized ids must be a pure function of
`(intervention id, process)` so two conversions of the same project produce the same
export names, and so a diff between two exports reflects a real change.

### 3. Coexistence with authored wrappers

Deduction runs **only where nothing was authored**. If an activity rooted by `start` with
`process = P` exists and an intervention lists it under `P`, that page is used and no
wrapper is synthesized.

This is what makes the migration path work in both directions, and it is what turns the
two options into one design with an escape hatch:

| Situation | Behaviour |
|-----------|-----------|
| Intervention lists normal activities only | Wrapper synthesized |
| Intervention lists an authored process activity | That page used as-is |
| Intervention lists a mix under one process | **Error.** Half-deduced, half-drawn is not a state anyone can reason about. |

### 4. Materialising

The escape hatch, and the answer to "segment-level logic has nowhere to live": an author
who needs a diagram converts the deduced wrapper into a real one.

- The editor generates the same page `tricc_oo` would have deduced, writes it into the
  project, and retargets the intervention's list to it.
- From that point the process is authored, and deduction stops for it.
- The operation is one undoable command, and it is **one-way**: going back means deleting
  the page and relisting the activities, which is an explicit thing to do rather than an
  automatic reversion that could silently discard drawn logic.

The trigger is concrete rather than a matter of taste — materialise when the process needs
branching between activities, segment-level relevance or priority, or anything else the
ordered list cannot say.

### 5. `main` and the process chain

`execute_linked_process` builds the overall form by chaining process pages in
`self.processes` order. Deduced wrappers participate identically, since they are ordinary
`TriccNodeActivity` objects with a `TriccNodeMainStart` root.

One open point: with several interventions, several wrappers may share a process name.
`execute_linked_process` currently collects `[(p.root.process, p) for p in pages]` and
groups by process, which would merge activities from different interventions into one
segment. Whether that is right depends on the multi-intervention export decision in
`20260825-tricc-oo-interop.md` §4, which is itself unresolved. **This spec should not be
implemented before that one is settled.**

### 6. Code checklist

| Repo | Path | Change |
|------|------|--------|
| `tricc_oo` | `strategies/input/tricc_project.py` | Synthesize wrappers from intervention process groups |
| `tricc_oo` | `models/tricc.py` | Nothing — wrappers are ordinary activities |
| `tricc_oo` | `strategies/input/base_input_strategy.py` | Verify chain behaviour with several interventions (§5) |
| `tricc_frontend` | `packages/core/src/model/activity-kind.ts` | `deducedWrapperId(intervention, process)`, shared with the Python side by convention |
| `tricc_frontend` | `packages/core/src/validate/project.ts` | Replace `intervention.not-a-process-activity` with the mixed-listing rule (§3) |
| `tricc_frontend` | `packages/editor/src/project/InterventionEditor.tsx` | Offer normal activities again; add "materialise" |
| `tricc_frontend` | `packages/editor/src/project/ActivityNavigator.tsx` | Show deduced processes as derived, visibly distinct from authored ones |

### 7. Tests

**`tricc_oo`** — a project with interventions and no process pages converts, producing one
process page per group with calls in list order; per-reference applicability lands on the
`goto` relevance; ids are deterministic across runs; an authored wrapper suppresses
deduction for its process; a mixed listing raises; an activity listed in two interventions
gets distinct instances.

**Frontend** — the mixed-listing rule; materialise produces exactly what the deduction
would have (asserted against a fixture shared with the Python tests, the same technique the
CQL corpus uses); materialise is one undo step; the navigator distinguishes deduced from
authored.

**Equivalence** — the strongest test available: the *same guideline* expressed with
authored wrappers and with deduction produces equivalent exports. If that does not hold,
deduction is not a faithful replacement and the question reopens.

### 8. Acceptance criteria

- [ ] A project with no process pages converts, and the process chain matches the
      intervention's ordered lists.
- [ ] Synthesized ids and export names are deterministic.
- [ ] An authored process activity suppresses deduction for its process.
- [ ] A mixed listing is refused rather than half-deduced.
- [ ] An activity listed in two interventions gets distinct instances.
- [ ] Materialising produces exactly the deduced shape, in one undoable step.
- [ ] Authored-wrapper and deduced forms of one guideline export equivalently.

### 9. Phasing

Not before `20260825-tricc-oo-interop.md` phases 1–4, and not before its §4
multi-intervention question is answered (see §5).

1. `deducedWrapperId` + the shared fixture corpus.
2. Deduction in `TriccProjectStrategy`; equivalence test against authored wrappers.
3. Frontend: mixed-listing rule, normal activities offered again.
4. Materialise.
5. Navigator treatment of deduced processes.

### 10. Open risk

**This moves guideline meaning into the converter.** Today an author can look at every page
that contributes to an export. Afterwards, part of the structure exists only as Python that
runs at conversion time — which is the same objection as any code generation, and it is
real.

The mitigation is that the deduced shape is small, fixed, and reproducible by the editor
on demand (§4): an author who wants to see it can materialise it and look. If the deduction
ever grows beyond "root, calls in order, end", that mitigation stops holding and the design
should be revisited rather than extended.
