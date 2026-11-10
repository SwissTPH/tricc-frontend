/**
 * What the author reads for the reuse terms (feature/20261028-snippets-tab-and-params.md §1).
 * The files, the library and the screen all say block. Kept in one place so the tab
 * and the terms can be renamed without touching the components.
 */
export const TERMS = {
  blocks: 'Building blocks',
  block: 'Building block',
  newBlock: 'New block',
  useBlock: 'Use block',
  settings: 'Parameters',
  setting: 'setting',
  /** The one line that tells reuse with variation from reuse as is. */
  blockOrGoto:
    'Use a block when the same steps need different settings; use Go to activity when they are identical.',
  /**
   * Naming when a block is used several times (tricc_oo docs/tricc-elements.md, "A block used
   * several times"): each use makes the block's fields again, so the names say which case it is.
   */
  naming: [
    'Different things, both kept: put a setting in the names, e.g. temp_{{site}}, or a name setting such as {{prefix}}_temp.',
    'The same thing, collected once: keep the same names and leave Repeat empty.',
    'The same thing, collected again: keep the same names and give each use its own Repeat (1, 2…).',
  ],
} as const
