# Authoring a guideline

A guideline has five layers. The app uses the same five words everywhere.

| Layer            | What it answers                                                    |
| ---------------- | ------------------------------------------------------------------ |
| **Project**      | Which interventions are carried together, and when each one starts |
| **Intervention** | Which segments make up this package, and which patients it is for  |
| **Segment**      | What should happen, and in what order                              |
| **Activity**     | How one step is carried out                                        |
| **Node**         | One question, calculation, decision or message                     |

A segment is the intervention's part of one stage of the encounter. It implements one of the
[CPG common processes](https://build.fhir.org/ig/HL7/cqf-recommendations/), such as triage or
diagnosis, named in its **Starts** field. In the files and in tricc_oo it is still a _process
activity_.

How these fit the WHO SMART layers and the care segments is explained in
[Segments, activities and nodes](../concepts/layers). Every node type is described in the
[node reference](../concepts/nodes).

## The overview

Opening a project shows its interventions as a table: name (code), title, labels, when it starts and
how many segments it has. Each intervention's segments are listed under its row, in order; click one
to open it. **Collapse all** (top right of the table) folds the segments away. Filter the table by
name, code or title, and by label.

The gear on a row opens the intervention editor: its title, name, labels, when it starts, who it
applies to, and its **segments**, where you add one, put them in order or remove one. Labels are free
tags for finding interventions: type them separated by commas.

The panel on the right has three tabs: **Info** (what the project holds, with links to the building
blocks, the data dictionary and the media), **Discussion** (about the project, or about the
intervention selected in the table) and **Validation**.

Above the overview, the navigator has three tabs, **Segments**, **Activities** and **Building
blocks**, each with a search box. Use **+** to create one, or the import button to bring in an
activity file or a draw.io drawing. Building blocks are reusable pieces of flow with settings; see
[Building blocks](./blocks).

## The activity editor

The diagram fills the left. The panel on the right has four tabs:

- **Details**: the fields of the selected node or connection. A node shows only the fields its
  type accepts.
- **Nodes**: add a node (click, or drag it onto the diagram), and list the nodes already there.
- **Connection**: the connections in the activity.
- **Validation**: problems in the selected item, or in the whole activity.

Connecting from a yes/no question or a decision (rhombus) asks which branch the connection is:
**Yes**, **No** or **Follow**. A single- or multiple-choice question has one handle per answer, so
you draw from the answer itself.

Undo and redo work across the project (<kbd>Ctrl</kbd>+<kbd>Z</kbd>,
<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>). <kbd>Delete</kbd> removes the selected node or
connection.

## Logic

Conditions and calculations are written in [CQL](https://cql.hl7.org/). A concept or question
written in double quotes, such as `"CHE.B6.DE07" > 9`, is shown as a chip with its label
("Weight (kilograms)"). A chip in red means nothing in the project has that code yet.

## Data dictionary

The data dictionary lists the concepts the project uses, with their texts and translations. The
activity files hold only concept codes. The texts live in the dictionary.

## Search

The search box in the top bar finds activities, nodes and concepts across the whole project.
