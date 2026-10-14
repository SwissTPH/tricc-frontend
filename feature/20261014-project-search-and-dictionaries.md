# Project search and data dictionaries

| Field | Value |
|-------|-------|
| **Status** | Implemented (frontend). `tricc_oo` reading of `calculate_code_system` and of `concept` on calculations: to follow. |
| **Repo** | `tricc_frontend` — `@tricc/core`, `@tricc/editor`, `apps/local` |
| **Source** | Patrick, 2026-10-14 |
| **Decisions** | 2026-10-14: the dictionaries are `<default id>` and `<default id>-calculate` (no rename, no URL change); calculate types are calculate, count, add, diagnosis, proposed_diagnosis; existing diagnosis concepts stay where they are (no production content yet, no migration). |

## Part I — What the author sees

### 1. Search the project

The navigator bar has a **Search the project** box where the list filter used to be. The
filter of the Processes and Activities lists moved down, to the start of the list row.

Typing a word and pressing **Enter** opens a window with what matches, by source:

- **Data dictionary**: concepts (code, display, any text), with the dictionary they are in;
- **Processes** and **Activities**: by title, id, or the process started;
- **Nodes**: by label, name, or the display of their concept, with the activity they are in.

Choosing a hit opens it: the concept in its dictionary, the activity, or the node selected on
its canvas. Escape, Close and the backdrop close the window. Matching ignores case.

### 2. Several data dictionaries

The **Data dictionary** tab lists the dictionaries like the Activities tab lists activities,
each with its number of concepts:

- the **default** dictionary (today's one, named after the project): what the health worker
  reads — questions, answers, notes;
- the **calculate** dictionary (`<default>-calculate`): the values logic computes —
  calculations, counts, sums and diagnoses. It is the special dictionary a CQL library can be
  made from. Decisions (rhombus) are only nodes and have no concept.
- any other code system the project carries (a DAK, a shared dictionary).

Both the default and the calculate dictionaries are listed before they exist; the first concept
put in one creates it. Choosing one shows only its concepts; **+ Concept** adds to it.

Calculations, counts and sums now have a **concept card** like questions. **Create concept**
has a **Dictionary** list: it starts on the node's own dictionary (calculate for a calculation
or a diagnosis, default otherwise) and offers every dictionary.

## Part II — Technical specification

- `NodeTypeSpec.calculated` marks calculate, count, add, diagnosis and proposed_diagnosis;
  `CALCULATED_TYPES` / `isCalculated` derive from it.
- `Project.calculateCodeSystem` (canonical url) is saved as `calculate_code_system` in
  `tricc.yaml` (and `terminology.calculate` in a legacy `project.json`, `meta` in the Y.Doc). It
  is set when the calculate dictionary is created. Without it, the code system with id
  `<default id>-calculate` is the calculate one.
- `projectDictionaries(project)`: default, calculate, then the others by id, each with its url,
  id, kind and code system when it exists. `dictionaryForType(project, type)` picks the one a new
  concept for that node goes to. `emptyCodeSystem(dictionary)` builds it (editor:
  `ensureDictionary`).
- `nodeConceptKey`: a calculated node without an explicit `concept` is found by its name in the
  calculate dictionary first, then in the default one (so diagnoses whose concepts are in the
  default dictionary keep working). A concept linked from the node's own dictionary is written as
  the name only; from any other, as an explicit `concept` reference.
- `searchProject(project, query)` returns concepts (via `ConceptIndex`), processes,
  activities and nodes. `ProjectSearchDialog` (editor) renders it.

### `tricc_oo` (to follow)

- Read `calculate_code_system` from `tricc.yaml` and resolve calculation / diagnosis concepts by
  name there first.
- The calculate dictionary is the input for generating a CQL library (one `define` per concept).
