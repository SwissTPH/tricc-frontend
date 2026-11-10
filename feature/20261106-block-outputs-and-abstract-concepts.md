# Block calls: expression arguments, outputs and abstract concepts

| Field             | Value                                                                                                                                                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | Approved (2026-11-06, RFC #12)                                                                                                                                                                                                                                                                           |
| **RFC**           | [#12](https://github.com/SwissTPH/tricc-frontend/issues/12)                                                                                                                                                                                                                                              |
| **Branch target** | `feature/block-outputs` → `develop`                                                                                                                                                                                                                                                                      |
| **Packages**      | `@tricc/core`, `@tricc/editor`, `tricc_oo`                                                                                                                                                                                                                                                               |
| **Related**       | `20261028-snippets-tab-and-params.md` (amends §3.2, §5.1, §10; phases 1–5 are built), `20261008-data-dictionary-and-concept-texts.md` (texts live on concepts), `tricc_oo/feature/20261102-block-params-and-start-node.md` §18 rev 3 "closed blocks" (dynamic arguments, `outputs`, concepts at linking) |
| **tricc_oo**      | Mirror into `../tricc_oo/feature/` on approval: abstract concepts (§1.3), the `{expression}` argument form (§1.1), `outputs: []` meaning none (§1.2; no key still means all, §18.2), the stored-data function list (§1.5; done in tricc_oo §18.8, Draft).                                                |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### The problem

Building blocks work, but four things get in the way when an author uses them:

1. **A call can only pass fixed values.** On a _Use block_ node, a setting is inherited, set to a
   literal, or tied to a setting of the calling activity. The author cannot pass "the child's age"
   or "the weight measured above", so a block that needs patient data cannot be written as a
   closed block.
2. **Fields named with a setting have nowhere to keep their texts.** A field named
   `fever_{{site}}` becomes `fever_axillary` and `fever_rectal`. Its label ("Fever, {{site}}") and
   translations must live in the data dictionary, but there is no concept for a name that is not
   yet known.
3. **A concept linked by mistake cannot be removed.** Linking a concept to such a field replaced
   its name with the concept's code, and the node has no _Unlink_ action. The only fix is to delete
   and redraw the node.
4. **Nothing says what a block gives back.** Every field inside a block can be read from outside.
   The author cannot say "this block produces _fever_ and _temperature_; the rest is internal", and
   other activities can depend on internal fields by accident.

### What changes for an author

- **Expression at a call.** On a _Use block_ or _Go to activity_ node, a setting can be
  _Inherited_, _Set here_, _A setting of this activity_, or **_Calculated here_**: a CQL expression
  with its plain-language intent, written with the names available at that point of the calling
  activity (`AgeInDays()`, `"weight"`). The block reads the result through `{{age}}`.
  Settings that shape the drawing (used in a field name or a configuration choice) cannot be
  calculated; the option is greyed out with the reason.
- **Abstract concepts.** A field whose name uses a setting gets an **abstract concept** with the
  same code (`fever_{{site}}`). It holds the texts and translations, which may use the settings
  too ("Fever ({{site}})"). It is shown in the data dictionary with an _Abstract_ badge and the
  block that owns it. It is never offered in expressions outside its block.
- **Unlink.** The concept card on a node has an _Unlink_ action. The node goes back to having no
  concept, ready for the next one to be picked or created; its texts come from that next concept.
  Linking never overwrites a name that uses a setting.
- **A block checks that it is closed.** Inside a block, a _Go to activity_, a reference to a field
  outside the block, or a function that reads stored data (the child's age, earlier visits) is
  flagged where it is written, with the fix: pass the value in as a setting calculated at the
  call.
- **Outputs.** _Block settings_ get an **Outputs** section listing every input and calculation of
  the block, each with a checkbox: checked fields are given back, unchecked ones stay internal and
  cannot be read after the block. Until the author unchecks one, all are checked and a message
  says that every field is given back.
- **Outputs become real concepts at each use.** Where a block is used with `site = axillary`, its
  output `fever_{{site}}` is `fever_axillary`: a real concept, with the abstract concept's texts
  filled in, offered in expressions after that _Use block_ node. The _Use block_ node lists the
  outputs it produces.

### Out of scope

- Exporting blocks as a single node (tricc_oo §18.4). The export is the library's.
- Outputs of activities. _Go to activity_ keeps today's visibility.

---

## Part II — Technical specification

### 1. Design

#### 1.1 Expression arguments

`ParamValue` (`packages/core/src/model/types.ts`) gains an expression form, reusing `Expression`
from `format/schema/expression.ts`:

```yaml
- id: u-temp
  type: block
  link: measure_temperature
  args:
    site: axillary # static: a literal
    threshold: '{{fever_threshold}}' # bound to a setting of the caller
    age: # dynamic: evaluated at the call, in the caller's scope
      expression: AgeInDays()
      intent: { en: Age of the child in days }
```

- `paramValueSchema` (`format/schema/activity.ts`) adds `expressionSchema` in object form. A bare
  string stays a literal, so `{expression}` is always explicit. It does not clash with
  `ConceptRef`, which has `system` and `code`.
- `argRef()` and `argProblem()` (`params/effective.ts`, `params/resolve.ts`) treat it as neither a
  reference nor a literal. `argSummary` shows the intent, or the CQL when no intent is set.
- **Static-only parameters.** `staticParams(project, pageId)` (new, `params/effective.ts`) returns
  the names used in a node or option `name`, in a configuration choice, as `{{p|raw}}` (it builds
  a name), in a `save` field (a concept code), or of type `name` or `concept`. This set is
  computed through the call chain. `ArgumentForm` disables _Calculated
  here_ for them.
- `ArgumentForm` (`editor/src/blocks/ArgumentForm.tsx`): a fourth mode `calc` renders
  `CqlExpressionField` with the caller's names (`expressionNames(project, lang, callerId)`). An
  intervention form has no `calc` mode, since nothing has been collected at that point. The
  `expression`-typed parameter's plain `Input` is also replaced by `CqlExpressionField`.
- Inheritance: a dynamic value is never inherited down a call chain. A callee below reads it as
  `{{name}}` from the block that received it, the same as a static value. Effective parameters
  (`effectiveParams`) are unchanged: a calculated argument binds the parameter like a literal.
- draw.io: `param.age = {"expression":"AgeInDays()"}`, the JSON form already accepted for
  declarations (`params/drawio.ts`).

#### 1.2 Outputs

- Block page field `outputs: [<node name>]` in the block YAML, beside `params`. Names are the
  template names (`fever_{{site}}`). Kept on `Activity` in `model/types.ts`, codec in
  `document/codec.ts`, serialized in `format/serialize`.
- **Listed nodes are outputs; no list means all**, as in tricc_oo §18.2: with no `outputs` key,
  every inner input and calculation is an output. `outputs: []` (explicit) means none, for a
  block that only displays or advises (mirror into tricc_oo §18.2).
- Block settings (`ActivitySettings.tsx`, block mode): an **Outputs** section showing the
  **computed list**, every inner input and calculate node in canvas order, one row each: checkbox,
  template name, label rendered from its concept, and an _Input_ / _Calculation_ badge.
  - No `outputs` key: every box is checked and a note reads "No outputs chosen: every input and
    calculation of this block can be read after it. Uncheck the ones to keep internal." The key
    is written only when a box is unchecked (the list then holds the checked names).
  - _Check all_ removes the key; _Uncheck all_ writes `outputs: []`.
  - A renamed node is followed, and a deleted one removed, in the same transaction as the change
    (`tx.updateNode`, `tx.removeNode`). A node added to a block with an explicit list starts
    unchecked; one added with no list is an output, like the rest.
  - A checkbox list was chosen over a dual internal/output list: the inner fields of a block are
    few, and one list keeps canvas order and shows the default state at a glance.
- `blockOutputs(project, useNode)` (new, `params/outputs.ts`) renders each output name with the
  use's static arguments (and inherited ones when all reaching interventions agree, as
  `inheritedAtCall` does). It returns `{ template, name, concept }[]`. An output whose name cannot
  be resolved at that use is returned with `name: undefined` and flagged (§2).
- `expressionNames` (`editor/src/cql/names.ts`): on a page that uses a block, the rendered outputs
  are offered with the label rendered from the abstract concept. Non-outputs and abstract codes
  are offered only inside their own block.
- The _Use block_ node face (`TriccNode.tsx`) shows the output count. Its properties panel lists
  the rendered outputs, each linked to its abstract concept.

#### 1.3 Abstract concepts

- A concept is **abstract** when its code matches `TEMPLATE_NAME_RE` and contains `{{`. It carries
  the FHIR standard property `notSelectable = true` and `kind = template`, with `owner` = the block
  id. It lives in the same dictionary as a concrete concept of that node type
  (`dictionaryForType`). tricc_oo's terminology export skips `kind = template` concepts.
- Its texts (display, questionnaire text, hint, help, every designation) may use `{{param}}`.
  Rendering in text follows lib §4 (raw text). A `choice` value renders as the option's label in
  the target language when the option has a concept, and as the code otherwise.
- `ConceptCard` on a node with a template name:
  - shows the abstract concept when it exists (linked by name, as today for the home dictionary);
  - otherwise offers only **Create abstract concept**, never a concrete concept by search. A
    template name stands for many concepts, so it cannot point to one.
- **Instances are computed, not stored.** The concrete concept of an output at a use (`fever_axillary`)
  is derived from the abstract concept and the arguments. The dictionary shows these under the
  abstract concept ("Built as: fever_axillary in Danger signs, fever_rectal in …"). If the author
  creates a concrete concept with that code (to give it its own translation or a coding), the
  project dictionary wins, as in snippets spec §14 Q4.
- Dictionary rules in `@tricc/core` `terminology/`: abstract concepts are excluded from
  `conceptOptions` outside their block and from CQL name suggestions outside the block. They are
  never offered as answers. A rename of the node's template name renames the abstract concept
  (`planParamRename` already rewrites `{{from}}` in names, and now also in abstract codes and texts).

#### 1.4 Unlink

- `ConceptCard` gains **Unlink** (`data-testid="concept-unlink"`), with no dialog. The node returns
  to the empty card (`concept-card-empty`): no concept, no texts. Texts are not copied back from
  the concept; the next concept picked or created supplies them.
  - explicit ref (`node.concept`): removes it;
  - link by name (home dictionary): the name is the link, so the node gets the next free name
    (`<code>_2`, …) until the next concept renames it. The concept stays in the dictionary.
- `linkTo` never writes `name` on a node whose name contains `{{`. Linking such a node is not
  offered (§1.3).
- Undo restores the link (one transaction).

#### 1.5 Closed-block validation

The rules of tricc_oo §18.1, checked by the frontend on block pages (`validate/blocks.ts`, new,
called from `validateProject`). They are validation only: nothing is prevented while drawing.

- The CQL tokenizer behind `presentCql` (`editor/src/cql/present.ts`) moves to `@tricc/core`
  (`cql/tokens.ts`) so validation can read quoted names and function calls from every expression
  field, edge value and calculated argument of the block.
- **Outside references.** A quoted name that is not an inner node name (template or rendered), a
  parameter, an output of an inner _Use block_, or a library calculate → `E_BLOCK_SCOPE`.
- **Stored data.** A call to a function on the stored-data list (`AgeInDays()`, the history and
  `GetRepeatedValue` readers, and the context readers `GetPractitionerValue`, `GetLocationValue`
  and `GetFacilityValue`), and any `populate` node → `E_BLOCK_SCOPE`. A block that needs one of
  these values takes it as an argument. `Today()` and `Now()` are not on the list: a block may call
  them. They are still not static, so a static-only parameter cannot be computed from them. The list is
  `STORED_DATA_FUNCTIONS` in `@tricc/core`, a copy of tricc_oo's
  `tricc_oo/converters/cql/stored_data_functions.json` (`{"version": 1, "functions": [{"name",
"reads": patient|encounter|history|context}]}`, tricc_oo §18.8 point 4), which a test compares
  with the tricc_oo file when it is present.
- **Go to.** A `goto` node in a block → `E_BLOCK_GOTO`. The palette still offers it; the node is
  flagged.
- The token scan can miss what only the library's operation tree sees. tricc_oo stays the
  authority, and its errors are shown with the original under "Details" (snippets spec §11).

### 2. Validation and errors

Shown inline and under **Needs attention** (`validate/params.ts`, new `validate/outputs.ts`):

| Code                     | Condition                                                                   | Message                                                                                            |
| ------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `E_ARG_DYNAMIC_STATIC`   | calculated argument for a static-only parameter (imported file)             | "“Site” shapes the drawing (it is used in a name), so it needs a fixed value."                     |
| `E_ARG_EXPRESSION_EMPTY` | calculated argument with intent but no CQL                                  | open handoff, as for any expression                                                                |
| `E_BLOCK_PRIVATE`        | a reference outside the block to an inner node not in an explicit `outputs` | "“fever_score” is internal to Measure temperature. Add it to the block's outputs to use it."       |
| `E_OUTPUT_UNKNOWN`       | `outputs` lists a name no inner input or calculation has                    | "Measure temperature lists an output “x” that it does not have."                                   |
| `E_OUTPUT_UNRESOLVED`    | output name depends on a setting with no single value at this use           | warning; the output is offered under its template name with a warning                              |
| `E_OUTPUT_CLASH`         | two uses render the same output name with a different concept type          | error on both uses (same type: same concept, as snippets §5.4 case 2)                              |
| `E_ABSTRACT_SELECTED`    | a node or answer outside its block references an abstract concept           | "Abstract concepts are only used inside their block."                                              |
| `E_BLOCK_SCOPE`          | inside a block, a name from outside it or a function reading stored data    | "Measure temperature reads “weight” from outside. Pass it in as a setting calculated at the call." |
| `E_BLOCK_GOTO`           | a _Go to activity_ inside a block                                           | "A block cannot go to an activity. Use a block, or make this an activity."                         |

### 3. Tests

- `params.test.ts`: `paramValueSchema` round-trips `{expression, intent}`; `argRef` ignores it;
  `staticParams` covers names, option names, configuration choices, and the chain.
- `params/outputs.test.ts`: rendering of outputs with literal, bound and inherited values;
  unresolved and clash cases.
- `ConceptCard` (`blocks.test.tsx` or a new `ConceptCard.test.tsx`): template-name node offers only
  _Create abstract concept_; Unlink on an explicit ref and on a by-name link leaves the empty card
  with no texts; undo restores it; linking never rewrites a template name.
- `validate/blocks.test.ts`: outside name, stored-data function (from the shared fixture),
  `populate` node and `goto` in a block are flagged; parameters, inner names, inner block outputs
  and library calculates are not.
- `ArgumentForm`: _Calculated here_ present at calls, absent on interventions, disabled with the
  reason for static-only parameters.
- `names.test.ts`: outputs offered after a use with rendered labels; non-outputs and abstract
  codes not offered outside the block.
- YAML and draw.io round trip: `args` expression form, block `outputs`, abstract concept
  properties.
- e2e (`e2e/`): use a block with a calculated age, read its output in a later calculate.

### 4. Phases

1. Unlink and the `linkTo` fix (§1.4). Independent, ships first.
2. Abstract concepts: creation from a template-name node, dictionary badge and filtering, rename
   propagation (§1.3).
3. Expression arguments (§1.1), YAML and draw.io.
4. Outputs: settings picker, `blockOutputs`, CQL suggestions, `E_BLOCK_PRIVATE` (§1.2).
5. Closed-block validation (§1.5).
6. Computed instances in the dictionary view; `E_OUTPUT_CLASH`.

---

## Open questions

None.

## Decisions

- 2026-11-05: no `outputs` key means every input and calculation is an output (tricc_oo §18.2).
  Block settings show that computed list with a checkbox per field and a note while nothing is
  unchecked; checkboxes rather than a dual internal/output list (Patrick).
- 2026-11-05: `{{choice}}` in an abstract concept's text renders the option's label in the target
  language when the option has a concept, else its code (Patrick).
- 2026-11-05: concrete output concepts are computed, not stored; one is stored only when the author
  overrides it; tricc_oo creates them at linking (§18.3) (Patrick).
- 2026-11-05: the abstract concept's code is the template name verbatim (`fever_{{site}}`), so the
  link stays by name (Patrick).
- 2026-11-05: a calculated value passed on to an inner block is bound, evaluated once at the
  outermost call (Patrick).
- 2026-11-06: the closed-block rules of tricc_oo §18.1 are part of the frontend validation
  (Patrick).
- 2026-11-06: Unlink returns the node to no concept and no texts, without a dialog; the next
  concept supplies the texts (Patrick).
- 2026-11-06: an explicit `outputs: []` means no outputs, distinct from no key (all); tricc_oo
  §18.2 adopts the distinction (Patrick, on approval).
- 2026-11-06: inside a block, `Today()` and `Now()` are allowed: they are not stored data, but they
  are still not static. `GetPractitionerValue`, `GetLocationValue` and `GetFacilityValue` are
  forbidden like the patient, encounter and history readers (`reads: context`). This follows
  tricc_oo §18.8 "Decisions" (Patrick).
