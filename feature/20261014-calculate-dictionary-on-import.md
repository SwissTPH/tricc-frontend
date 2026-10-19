# Calculate dictionary filled on import

| Field | Value |
|-------|-------|
| **Status** | Draft |
| **Repo** | `tricc_frontend` — `@tricc/core` (`terminology/texts-to-concepts.ts`), `@tricc/editor` (navigator import); `tricc_oo` for phase 2 |
| **Source** | Patrick, 2026-10-14: "the calculate DD is not populated upon import; should at least be the case for diag and proposed diag" |
| **Related** | `20261014-project-search-and-dictionaries.md` (the two dictionaries), `20261008-data-dictionary-and-concept-texts.md` (the text move) |
| **Decisions** | — |
| **Approval** | — |

## Part I — What the author sees

After importing a drawing, or opening a project that lists `.drawio` files, the **calculate**
dictionary lists its diagnoses and proposed diagnoses, with their labels. Today it stays empty
("No calculation or diagnosis has a concept yet"): diagnoses land in the default dictionary
next to the questions, and calculations get no concept at all.

Phase 2 does the same for calculations, counts and sums.

## Part II — Technical specification

### 1. Current state (checked 2026-10-14)

- Concepts are created on import only by `moveTextsToConcepts`
  (`packages/core/src/terminology/texts-to-concepts.ts`). It runs from the navigator import
  (`ActivityNavigator.tsx:223`) and when a project is read (`format/serialize/index.ts:189`).
- `codeSystemFor` (lines 34-51) uses the item's explicit concept system, else
  `defaultCodeSystem(project)`. It never consults `dictionaryForType`, so diagnoses go to the
  default dictionary (conceptType `Condition`).
- Only `isTextNode` types are processed (line 141). calculate, count and add are not text nodes,
  so they get no concept and keep their label on the node (locked by
  `terminology.test.ts:268-274`).
- `TextMoveResult.createdCodeSystem` holds one code system. The navigator registers only a
  created default one (`setMeta('defaultCodeSystem')`).

### 2. Phase 1: diagnosis and proposed diagnosis

- `codeSystemFor(item, nodeType)`: without an explicit concept, use
  `dictionaryForType(project, nodeType)`. Create the missing code system with `emptyCodeSystem`
  and set `project.calculateCodeSystem` (or `defaultCodeSystem`) to it. Options always follow the
  default dictionary.
- An existing concept with the same code in the default dictionary is reused rather than
  duplicated, so a project that already has its diagnoses there is unchanged. `nodeConceptKey`
  already looks in calculate first, then default.
- `TextMoveResult.createdCodeSystems: { codeSystem; role: 'default' | 'calculate' }[]` replaces
  `createdCodeSystem`. The navigator import adds each code system and sets the matching meta key
  (`defaultCodeSystem` / `calculateCodeSystem`). `readFromTriccYaml` sets
  `loaded.calculateCodeSystem` when the calculate one was created.
- conceptType stays `Condition`. `tricc_oo`'s own draw.io path uses `Diagnosis`; aligning the two
  is a separate decision.
- `tricc_oo`: `_resolve_concept` searches every code system listed in `tricc.yaml` `terminology:`,
  and the writer lists all of them, so diagnoses resolve without a `tricc_oo` change.

### 3. Phase 2: calculate, count and add (needs `tricc_oo`)

- Process these types in the text move: create the concept in the calculate dictionary with the
  label as display, and remove the label from the node, as for questions (activity YAML holds
  concept codes only).
- **Blocking:** `tricc_oo` YAML input refills texts from concepts except for `calculate` and
  `rhombus` (`NO_CONCEPT_TEXT_TYPES`, `strategies/input/yaml.py:167-168`). `calculate` has to
  leave that set first, or the label is lost on conversion. A rhombus stays as it is: it has no
  concept.
- Replace `terminology.test.ts` "leaves logic nodes alone" with: calculate/count/add get a
  calculate-dictionary concept; a rhombus is untouched.

### 4. Scope

New imports and `.drawio` files listed in `tricc.yaml` (re-read on every open). Projects already
saved as YAML are not migrated (no production content).

### 5. Tests

- core: a draw.io page with a diagnosis, a proposed diagnosis and a select. The diagnosis
  concepts are in `<id>-calculate`, the select and its answers in `<id>`, and
  `calculateCodeSystem` is set. A project whose default dictionary already holds the diagnosis
  code adds nothing.
- e2e: import that page from the Activities tab. The Data dictionary tab's calculate dictionary
  lists both diagnoses; the empty note is gone.
