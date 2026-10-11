import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { NODE_FIELDS, type NodeField } from './node-fields.js'
import { decodeNode, encodeNode } from './codec.js'
import { fromYaml, toYaml } from './serialize/yaml.js'
import { nodeFromY, nodeToY, updateNodeY } from '../document/codec.js'
import type { TriccNode } from '../model/types.js'

/** A node with every stored field set. Fields NODE_FIELDS never stores are left out. */
const FULL: TriccNode = {
  id: 'n1',
  type: 'select_one',
  name: 'cough',
  label: { en: 'Cough', fr: 'Toux' },
  concept: { system: 'http://x', code: 'cough' },
  required: true,
  min: 1,
  max: 9,
  unit: 'kg',
  unit_system: 'http://unitsofmeasure.org',
  unit_code: 'kg',
  default: 'no',
  listName: 'cough_list',
  group: 'g1',
  options: [{ id: 'o1', name: 'yes', label: { en: 'Yes' }, concept: { system: 'http://x', code: 'yes' }, relevance: { expression: 'true' } }],
  relevance: { intent: { en: 'When coughing' }, expression: 'Fever' },
  calculate: { expression: '1 + 1' },
  expression: { expression: 'x' },
  constraint: { expression: '. > 0' },
  constraintMessage: { en: 'Must be positive' },
  reference: 'Weight > 9',
  link: 'other-activity',
  repeat: 2,
  instance: 1,
  severity: 'severe',
  priority: 3,
  context: 'encounter',
  period: 'P1D',
  process: 'triage',
  intervention: 'follow-up',
  condition: 'true',
  delay: 'P3D',
  hint: { en: 'Ask the mother' },
  help: { en: 'More detail' },
  media: { image: 'cough.png' },
  notAvailable: { name: 'cough_na', label: { en: 'Not asked' }, concept: { system: 'http://x', code: 'na' } },
  save: 'obs',
  ui: { x: 10, y: 20, width: 200, height: 64, color: 'red', collapsed: false },
}

const NEVER_STORED: NodeField[] = ['form_id', 'labelMessage']

describe('every node field round-trips', () => {
  it('the sample sets every field the table stores (add a value here for a new field)', () => {
    const stored = (Object.keys(NODE_FIELDS) as NodeField[]).filter((f) => !NEVER_STORED.includes(f))
    expect(stored.filter((f) => !(f in FULL))).toEqual([])
  })

  it('through the activity YAML', () => {
    const back = decodeNode(fromYaml(toYaml(encodeNode(FULL, 'en'))) as never, 'en')
    expect(back).toEqual(FULL)
  })

  it('through the document, created and updated', () => {
    const doc = new Y.Doc()
    const nodes = doc.getMap<Y.Map<unknown>>('nodes')
    nodes.set('n1', nodeToY(FULL))
    expect(nodeFromY(nodes.get('n1')!)).toEqual(FULL)
    // Update from a bare node to the full one, and back: nothing stale stays behind.
    nodes.set('n2', nodeToY({ id: 'n1', type: 'select_one' }))
    updateNodeY(nodes.get('n2')!, FULL)
    expect(nodeFromY(nodes.get('n2')!)).toEqual(FULL)
    updateNodeY(nodes.get('n2')!, { id: 'n1', type: 'select_one' })
    expect(nodeFromY(nodes.get('n2')!)).toEqual({ id: 'n1', type: 'select_one' })
  })
})
