import { describe, expect, it } from 'vitest'
import {
  CAPTURE_TYPES,
  DRAWABLE_TYPES,
  EXTENSION_TARGET_TYPES,
  NAMED_TYPES,
  NODE_TYPES,
  NODE_TYPE_GROUPS,
  SELECT_TYPES,
  SEQUENCE_TYPES,
  TEXT_NODE_TYPES,
  canBranchFrom,
  hasInternalName,
} from './schema/node-types.js'
import { NODE_TYPE_SPECS, PALETTE_GROUPS } from './schema/node-spec.js'

/**
 * The lists are derived from NODE_TYPE_SPECS. These are the values they had when they were
 * written by hand: moving them into the table must not change what any check does.
 */
describe('node type table', () => {
  it('has an entry for every node type', () => {
    expect(Object.keys(NODE_TYPE_SPECS).sort()).toEqual([...NODE_TYPES].sort())
    for (const t of NODE_TYPES) expect(NODE_TYPE_SPECS[t].label).toBeTruthy()
  })

  it('derives the same lists the code had before', () => {
    expect(SELECT_TYPES).toEqual(['select_one', 'select_multiple', 'select_yesno'])
    expect(SEQUENCE_TYPES).toEqual(['start', 'activity_start', 'activity_end', 'end'])
    expect(CAPTURE_TYPES).toEqual([
      'select_one', 'select_multiple', 'select_yesno', 'integer', 'decimal', 'quantity', 'text', 'date', 'acknowledge',
    ])
    expect(NAMED_TYPES).toEqual([
      'select_one', 'select_multiple', 'select_yesno', 'integer', 'decimal', 'quantity', 'text', 'date', 'acknowledge',
      'calculate', 'count', 'add', 'populate', 'diagnosis', 'proposed_diagnosis', 'not_available',
    ])
    expect(TEXT_NODE_TYPES).toEqual([
      'select_one', 'select_multiple', 'select_yesno', 'integer', 'decimal', 'quantity', 'text', 'date',
      'note', 'acknowledge', 'diagnosis', 'proposed_diagnosis', 'not_available',
    ])
    expect(EXTENSION_TARGET_TYPES).toEqual(['not_available'])
    expect(DRAWABLE_TYPES).toEqual(NODE_TYPES.filter((t) => t !== 'not_available'))
    expect(Object.keys(NODE_TYPE_GROUPS)).toEqual([...PALETTE_GROUPS])
    expect(NODE_TYPE_GROUPS.logic).toEqual(['calculate', 'rhombus', 'count', 'add', 'not'])
    expect(NODE_TYPE_GROUPS.clinical).toEqual(['diagnosis', 'proposed_diagnosis'])
    expect(NODE_TYPES.filter(canBranchFrom)).toEqual([
      'select_one', 'select_multiple', 'select_yesno', 'calculate', 'rhombus', 'count', 'add', 'not', 'not_available',
    ])
    expect(NODE_TYPES.filter(hasInternalName)).toEqual(['start', 'activity_start', 'activity_end', 'end', 'goto', 'rhombus'])
  })
})
