# Project and Intervention Layers — bundling, applicability, planning overview

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_frontend` — `@tricc/core`, `@tricc/editor` |
| **Related** | `20260825-guided-authoring.md` §1 (the layer model this extends), `20260825-project-format.md` §2 (the format), `20260825-tricc-oo-interop.md` §4 (multi-intervention export), `../../tricc_oo/feature/careplan.md` (**the planning design — Draft, unimplemented**), `../../tricc_oo/feature/careplan-intervention-plandefinition.md` (Implemented), `../../tricc_oo/docs/visual-authoring-concepts.md` |
| **Approval** | — |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### What this is

The two layers above the flowchart: what a **project** is, and what an **intervention** is.

The WHO material TRICC follows (`../../tricc_oo/docs/visual-authoring-concepts.md`) describes
authoring in three layers — segment, activity, node. That is the right model for drawing a
guideline, and it stops one level too low. Two things sit above it that authors reason about
constantly and that no tool currently shows them.

### Layer 0 — the intervention

An intervention is a coherent package of care a health worker can be offered: a sick-child
consultation, an antenatal visit, a routine immunization contact. It is a **defined list of
activities**, ordered along the standard clinical processes.

The part that makes it more than a list: **applicability**. Not every activity in a package suits
every patient. An intervention says when each of its activities applies — by age, by symptom, by
what the facility can actually do. Two children entering the same consultation can be taken through
different subsets of it.

This is where clinical tailoring lives, and it is distinct from the skip logic *inside* an
activity. Skip logic decides which question to ask next. Applicability decides whether this part of
the package is relevant to this patient at all.

### Layer -1 — the project

A project is the set of interventions carried together: the unit of **authoring** — one folder, one
repository, one review process — and the unit of **delivery** — what gets packaged and installed on
a device.

A project may also carry **planning**: the decisions about *when* its interventions start. Some are
on demand — a sick child arrives. Some are planned — an antenatal schedule with visits at defined
intervals. Some are triggered by an event — a lab result comes back. Planning can be reasoned about
per intervention, but a project needs the overview: seeing all of it together is the only way to
tell whether the pathway a patient experiences makes sense.

> **Planning is designed but not built.** `../../tricc_oo/feature/careplan.md` specifies this in
> full — its CarePlan pages, `schedule` connectors, and intervention call nodes are exactly the
> planning surface described here. It is `Draft` and unimplemented. This spec builds the
> **project and intervention layers**, which are real today, and reserves the planning surface
> rather than inventing a second design for it. See §6.

### The full model

| Layer | What it answers |
|-------|-----------------|
| **-1 Project** | Which interventions are carried together, and when each one starts |
| **0 Intervention** | Which activities make up this package, and which suit this patient |
| **1 Segment / process** | What should happen, and in what order |
| **2 Activity** | How a segment executes |
| **3 Node** | The specific action or logic |

Five layers is the whole conceptual model, and the tool should navigate and teach all five. Today
an author holds the top two in their head.

---

## Part II — Technical specification

### 1. Reconciling with `careplan.md`

`../../tricc_oo/feature/careplan.md` §0.1 records an agreed hierarchy of
**`Project → CarePlan(s) → Intervention(s) → Process(es)`**, with these points explicitly *not*
open questions: a project may have zero CarePlans (today's behaviour) or several, each evaluated
independently; only interventions are schedulable; and CarePlan authoring reuses the existing
relevance vocabulary rather than introducing a new one.

That is four levels where this spec's teaching model has two. They are not in conflict — they are
counting different things:

- The **teaching model** has five layers because that is what an author must understand.
- **CarePlan is the mechanism by which the project layer expresses planning.** A project with two
  unrelated pathways has two CarePlans; a project with none has no planning and its interventions
  are all on-demand — today's behaviour exactly.

So CarePlan is not a sixth thing to teach; it is what the project layer contains when there is
planning to express.

**This reconciliation is a proposal.** `careplan.md` treats CarePlan as its own level, and if its
owners prefer it taught as a distinct layer, the model becomes six and this spec follows.

### 2. Intervention model

Extending `20260825-project-format.md` §2:

```jsonc
{
  "interventions": [
    {
      "id": "sick-child",
      "code": "sick-child",
      "title":       { "en": "Sick child consultation" },
      "description": { "en": "..." },

      "applicability": {
        "intent": { "en": "Children from 2 months up to 5 years" },
        "expression": "AgeInMonths() >= 2 and AgeInMonths() < 60"
      },

      "trigger": { "mode": "on-demand" },

      "processes": [
        { "process": "registration", "activities": [
            { "ref": "reg-child" }
        ]},
        { "process": "history-and-physical", "activities": [
            { "ref": "hp-cough" },
            { "ref": "hp-diarrhoea", "applicability": {
                "intent": { "en": "Only when diarrhoea was reported at triage" },
                "expression": "\"Diarrhoea reported\""
            }}
        ]},
        { "process": "determine-diagnosis", "activities": [] }
      ]
    }
  ]
}
```

#### 2.1 Two levels of applicability

| Where | Meaning |
|-------|---------|
| `intervention.applicability` | Whether this package suits this patient at all |
| `processes[].activities[].applicability` | Whether this activity, **in this intervention**, suits this patient |
| `activity.applicability` (in the activity YAML) | The activity's **intrinsic** applicability, wherever it is used |

Intrinsic and per-reference conditions are **ANDed**. The reason for both: an activity is reusable
across interventions, and a condition that is true of the activity everywhere (a growth assessment
needs a weight) is a different statement from one true only in this package (skip the diarrhoea
history in a package that already covered it).

Collapsing them into one would force authors to duplicate an activity to vary its applicability,
which is precisely the copy-and-drift failure the snippet work exists to prevent.

Both carry `intent` alongside `expression`, per `20260825-guided-authoring.md` §4 — applicability
is exactly the kind of clinical judgement that should be stated in words and then formalized.

#### 2.2 Activity references became objects

`activities: ["reg-child"]` becomes `activities: [{ "ref": "reg-child" }]`.

A bare string remains valid shorthand for `{ref: "..."}`, so the simple case stays simple and
`20260825-project-format.md`'s existing examples keep parsing.

#### 2.3 Process instance selection

`careplan.md` §3.2a records that reuse matters most at the **process** level: a project may hold
several registration definitions, and an intervention picks one.

The shape above already expresses that — each intervention names its own activities per process, so
two interventions can select different registration activities from the same project. No format
change is needed; it is noted here so the capability is known to exist rather than rediscovered.

### 3. Triggers

```jsonc
"trigger": { "mode": "on-demand" }
```

| `mode` | Meaning | Status |
|--------|---------|--------|
| `on-demand` | Started by a health worker when a patient presents | Today's behaviour; the default |
| `planned` | Started on a schedule defined in the project's planning layer | **Reserved** — needs `careplan.md` |
| `event` | Started when a named event occurs | **Reserved** — needs `careplan.md` |

Only `on-demand` is implemented in v1. The others are accepted in the format, shown in the UI as
unavailable with an explanation, and **blocked at export** — a project claiming a planned
intervention that nothing schedules would export a guideline that never runs.

Defining the vocabulary now costs nothing and means the planning work is an addition rather than a
format migration.

### 4. Project overview

A new top-level screen — the layer -1 surface, and the first thing an author sees on opening a
project.

**Content:**

- Every intervention as a card: title, applicability (as plain language,
  `20260825-guided-authoring.md` §5), trigger mode, activity count, validation state.
- The process chain per intervention, in canonical order, with each activity and its applicability.
- Cross-intervention observations authors currently cannot get: activities used by more than one
  intervention, activities in the project used by none, concepts captured in several interventions.
- Project-level validation: dangling activity references, duplicate intervention codes, an empty
  intervention, reserved trigger modes in use.

**Not a canvas.** The project layer is a structured list, not a flowchart — until planning exists,
there is nothing spatial to draw. When `careplan.md` lands, planning gets a canvas of its own (§6)
and this overview links to it.

### 5. Navigator

A five-level tree, replacing the flat activity list, using the layer vocabulary throughout:

```
Project  "IMCI sick child"
├── Intervention  "Sick child consultation"          ← applicability, trigger
│   ├── registration                                  ← process
│   │   └── Activity  "Register child"
│   └── history-and-physical
│       ├── Activity  "Cough"
│       └── Activity  "Diarrhoea"           ⟨conditional⟩   ← per-reference applicability
└── Intervention  "Routine immunization"
```

- Conditional activities are marked, with the condition on hover.
- An activity used by several interventions appears under each, marked as shared, with edits
  affecting all — stated where it is shown, not discovered afterwards.
- Activities belonging to no intervention appear under an "Unassigned" group rather than being
  invisible. Orphaned work is a common state mid-authoring and hiding it is how it gets lost.

### 6. Planning surface — reserved, not built

When `../../tricc_oo/feature/careplan.md` is approved and implemented, the project layer gains a
planning canvas: its `careplan_start`, `intervention` call nodes, `schedule` connectors and
`careplan_end`, drawn on the same React Flow surface with a restricted palette (that spec
disallows capture nodes on CarePlan pages — orchestration, not a form).

Reserved now:

- `project.planning` in the format, absent by default.
- Trigger modes `planned` and `event` (§3).
- The overview screen links to planning where present.

**Not designed here.** `careplan.md` is a substantial and largely-settled draft, including
resolutions its owners reached on 2026-08-11. Producing a second design for the same problem in
this repository would be actively unhelpful. When it is approved, the frontend surface follows it,
in its own dated spec.

### 7. Code checklist

| Path | Purpose |
|------|---------|
| `packages/core/src/format/schema/intervention.ts` | Intervention schema: applicability, triggers, activity refs |
| `packages/core/src/validate/project.ts` | Project-scoped rules (§4) |
| `packages/core/src/model/usage.ts` | Activity ↔ intervention usage, shared and orphaned activities |
| `packages/editor/src/project/Overview.tsx` | Layer -1 screen |
| `packages/editor/src/project/Navigator.tsx` | Five-level tree |
| `packages/editor/src/project/InterventionEditor.tsx` | Intervention metadata, process chain, applicability |

### 8. Tests

**Unit** — activity-reference shorthand round-trips; intrinsic and per-reference applicability are
ANDed in the correct order; usage computation finds shared and orphaned activities; project
validation catches dangling refs, duplicate codes, empty interventions and reserved trigger modes;
reserved trigger modes block export with an actionable message.

**Component** — overview renders applicability as plain language; navigator marks conditional and
shared activities; unassigned activities are visible.

**E2E** — create two interventions sharing one activity, give the shared reference different
applicability in each, save and reload; confirm the shared activity is marked in both and that
editing it warns; set a `planned` trigger and confirm export is blocked with an explanation.

### 9. Acceptance criteria

- [ ] The layer vocabulary is used consistently across navigator, overview and teaching content.
- [ ] Interventions carry applicability with `intent`, at both intervention and activity-reference
      level, ANDed with the activity's intrinsic applicability.
- [ ] A bare string activity reference still parses.
- [ ] The overview shows shared and orphaned activities.
- [ ] Reserved trigger modes are accepted by the format, visible, and blocked at export.
- [ ] No second design for planning exists in this repository.
- [ ] A project with one intervention and no applicability behaves exactly as today.

### 10. Implementation phases

1. Intervention schema: applicability, triggers, activity-reference objects.
2. Project-scoped validation and usage computation.
3. Navigator.
4. Project overview.
5. Intervention editor.
6. Planning surface — **only after `careplan.md` is approved and implemented.**

### 11. Open questions

1. **Layer count** — §1. Is CarePlan taught as its own layer (six) or as the project layer's
   planning content (five)? This spec assumes five; `careplan.md`'s owners should decide.
2. **Applicability evaluation context.** Intervention applicability is evaluated before any
   question is answered, so it can only reference `populate` data — patient age, sex, history — not
   in-form answers. Activity-reference applicability *can* reference answers from earlier processes
   in the same intervention. The editor must scope completion accordingly, and that scoping rule
   should be confirmed rather than inferred.
3. **Does `tricc_oo` export activity-reference applicability today?** `20260825-tricc-oo-interop.md`
   §4 covers multi-intervention export but not per-reference applicability. It likely maps onto
   PlanDefinition `action.condition`, which needs checking against fhircore before it is promised.
