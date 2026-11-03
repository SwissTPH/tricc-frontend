# Building blocks and parameters

A **building block** is a reusable piece of flow. You write it once and use it in several places
with different settings. Each use puts its own copy of the block into the form.

Use a block when the same steps need different settings, for example measuring the temperature at
another site or with another threshold. Use **Go to activity** when the steps are identical
everywhere: there is one shared copy and no settings.

## The Building blocks tab

The navigator has a **Building blocks** tab next to Processes and Activities. It lists every block
with its settings and how many times it is used. **New block** creates one. A block opens in the
activity editor like any activity. It starts at a **Block start** node and ends at an
**Activity end**.

To use a block, add a **Use block** node to an activity and choose the block in **Uses the
block**. **Open block** (or the button on the node) opens it.

## Block settings

A block's gear opens **Block settings**. Its **Parameters** section lists the block's settings.
Each has a name, a type (yes/no, number, text, choice, and the advanced `name`, `concept` and
`expression`), an optional default, and whether it is required. Labels and help texts live in the
data dictionary, like those of any concept.

Parameters work like function arguments. When the block is built, each parameter takes the first
value found among:

1. the value set on the **Use block** node;
2. the value of a parameter with the same name on the page that uses it (inherited);
3. the parameter's default.

At the top of the chain, the settings of the **intervention** give the values. A parameter that a
page's uses leave unset becomes a parameter of that page too. The page lists it as **computed**,
so it can be set further up.

## The argument form

Selecting a Use block node shows one row per parameter of the block:

- **Inherited**: nothing is stored on the node. The row says where the value comes from: the page
  that uses it, or the intervention.
- **Set for this call**: the value is stored on the node. Clearing it returns the row to
  inherited.
- **A setting of this activity**: the row is bound to a parameter of the page, written
  <span v-pre>`{{name}}`</span>.

## Placeholders

Inside a block, <span v-pre>`{{name}}`</span> stands for the value of a parameter.

- In an expression, <span v-pre>`{{name}}`</span> is a literal: <span v-pre>`{{threshold}}`</span>
  becomes `37.5`, a text becomes `'axillary'`.
- In a label or a node name, it is plain text: <span v-pre>`temp_{{site}}`</span> becomes
  `temp_axillary`.
- <span v-pre>`{{name|raw}}`</span> puts the value into an expression as plain text, without
  quotes. Use it to build a field name inside an expression:
  <span v-pre>`"temp_{{site|raw}}" > {{threshold}}`</span>.

## Naming when a block is used several times

Each use makes the block's fields again. The names say whether the uses collect different things or
the same one. Two uses that build the same name are allowed: the name tells tricc_oo which case it
is.

**1. Different things, both kept.** The names must differ: put a parameter in them.

- An existing parameter can do it. A field named <span v-pre>`temp_{{site}}`</span> gives
  `temp_axillary` in one use and `temp_rectal` in the other.
- When no parameter does, add one just for the name: a parameter of type `name`, for example
  `prefix`. Name the field <span v-pre>`{{prefix}}_temp`</span>, and use the block once with
  `prefix: admission` and once with `prefix: discharge`.

**2. The same thing, collected once.** The block is reached from several places, but the value is
collected only once. Keep the same names and leave **Repeat** empty. tricc_oo keeps each copy as a
version of one concept, and a later copy is not asked again once the value is captured.
**Go to activity** covers the same need by reuse instead: one shared copy of the activity, reached
from each place.

**3. The same thing, collected again.** For example the same site later in the visit. Keep the same
names and give each use its own **Repeat** on the Use block node (1, 2…). The fields become
`temp_axillary` and `temp_axillary_Rr_2`. For now, the second slot is only asked when the first is
empty: the rule that skips a question already asked looks at the slot drawn on the node, not at the
repeat set on the use. This may change.

## The data dictionary

Each declared parameter of type yes/no, number, text or choice is a concept in the calculate
dictionary, coded `param_<owner>_<name>`. The project dictionary wins: when it already holds the
concept, tricc_oo keeps it and only adds the ones that are missing.

## Files

A block is saved as `blocks/<id>.block.yaml` and listed under `blocks:` in `tricc.yaml`. Its root
node has type `block_start`, and a use has type `block`, with `link` (the block) and `args` (the
values set for that use). Older files that say `snippet_start` and `snippet` are still read; they
are saved with the new names.

In a draw.io drawing, a block page has one `parameters` shape with an attribute `param.<name>`
per parameter (for example `param.site` = `choice(axillary|rectal)!`), and a `block` or `goto`
shape sets its values with the same attributes (`param.site` = `axillary`).
