# Segments, activities and nodes

## Where visual authoring sits in the WHO SMART layers

The WHO [SMART Guidelines](https://www.who.int/teams/digital-health-and-innovation/smart-guidelines)
describe a guideline's journey from paper to software in layers: L1 narrative guidelines, L2
operational requirements (the _digital adaptation kit_), L3 machine-readable recommendations, L4
executable reference software and L5 dynamic, precision-health models.

Visual authoring adds two steps between them:

![L2 Operational: DAK, human-readable requirements. L2.5 Machine and human readable: visual and computable clinical reference files. L3.5 L4 computable: L4 content components generated from the reference files. L4 Executable: reference software.](/concepts/smart-layers-mapping.png){.diagram}

- **L2.5, visual and computable clinical reference files.** What you author in this app: diagrams
  that clinicians read and machines compute.
- **L3.5, L4 content components.** The forms and configuration that tricc_oo generates from them,
  ready for the L4 software to run. This step is automated.

## Segments: when content runs

An encounter is divided into **segments**: registration, history and physical, diagnosis,
dispensing medications, and so on. A segment says when an activity is carried out, lets several
guidelines merge into one coherent visit, and allows jumping to a given segment. The segments
follow the HL7 [CPG common processes](https://build.fhir.org/ig/HL7/cqf-recommendations/).

![A cycle of CPG common processes: triage, emergency care, registration, history and physical, local urgent care, acute tertiary care, diagnostic testing, determine diagnosis, dispense medications, provide counselling, monitor and follow-up, alerts and education, discharge and referral, charge for service, record and report.](/concepts/cpg-segments.png){.diagram}

Each guideline, or _track_, takes part only in the segments it needs:

![Three segments side by side. Guideline 1 has content in segments 1 and 3; guideline 2 in all three; guideline 3 only in segment 2.](/concepts/tracks-segments.png){.diagram}

**In the app:**

- a guideline or track is an **intervention**;
- its part in one segment is a **process**: a process activity whose **Starts** field names the
  segment, chosen from the CPG list;
- an intervention's **start** condition says for whom and when it opens.

## Layers: what, then how

Each process is described in three or more levels. The **intent** (what to do) is kept apart from
the **details** (how to do it):

![A segment for one guideline holds activities 1 and 3. Activity 1 holds tasks; activity 3 holds tasks and activity 4, which holds tasks of its own.](/concepts/layers.png){.diagram}

The app names these levels the same way everywhere:

| Layer                   | What it answers                                   | In the app                                     |
| ----------------------- | ------------------------------------------------- | ---------------------------------------------- |
| Project                 | Which interventions are carried together          | The project, on the overview                   |
| Intervention            | Which processes make up the package, and for whom | An intervention card, with its start condition |
| **1. Segment overview** | _What_ should happen, and in what order           | A process activity                             |
| **2. Activity**         | _How_ a step is carried out                       | An activity                                    |
| **3. Node**             | One question, calculation, decision or message    | A node on the diagram                          |

### Layer 1: the segment overview

It defines **what** needs to be done, and stays generic so everyone understands it. Each box is an
activity, detailed on its own page. The same segment can have several overviews, and an overview
reuses existing activities.

![A segment overview for emergency care: start, basic patient information, then the emergency signs (airway and breathing, circulation, coma and convulsion, dehydration), then prioritisation signs, then end.](/concepts/segment-overview.png){.diagram .diagram--narrow}

In the app, this is a process activity whose boxes are **Go to activity** nodes. Ctrl-click (or
**Open activity**) opens the activity behind a box.

### Layer 2 and below: activities

An activity defines **how** a step is done. It is a sequential decision tree that:

- may have an **applicability** expression, so it runs only for the patients it concerns;
- is **done** when all of its paths have reached an **Activity end**;
- can contain other activities, through Go to activity;
- can be used in several processes and several guidelines;
- shows exactly what the health worker will face.

### Layer 3 and below: nodes

Nodes are the specific actions: **questions** capture patient data and findings, **sequence**
nodes say how the logic starts, branches and ends, **calculations** hold the complex logic in CQL,
and **notes** give information to the user. A node can also say how it should be shown on the
device. See the [node reference](./nodes).
