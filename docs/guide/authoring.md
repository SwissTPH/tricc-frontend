# Authoring a guideline

A guideline has five layers. The app uses the same five words everywhere.

| Layer                 | What it answers                                                    |
| --------------------- | ------------------------------------------------------------------ |
| **Project**           | Which interventions are carried together, and when each one starts |
| **Intervention**      | Which processes make up this package, and which patients it is for |
| **Process** (segment) | What should happen, and in what order                              |
| **Activity**          | How one step is carried out                                        |
| **Node**              | One question, calculation, decision or message                     |

## The overview

Opening a project shows one card per intervention. A card lists its processes as chips. Click a chip
to open that process. The gear on a card holds its title, code, when it starts, and who it applies
to.

Above the overview, the navigator has two tabs, **Processes** and **Activities**, each with a
search box. Use **+** to create one, or the import button to bring in an activity file or a
draw.io drawing.

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
