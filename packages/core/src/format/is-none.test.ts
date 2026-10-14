import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { decodeNode, encodeNode } from './codec.js'
import { activitiesFromDrawio } from './drawio.js'
import { nodeFromY, nodeToY } from '../document/codec.js'
import { validateActivity } from '../validate/activity.js'
import { minimalActivity } from './__fixtures__.js'
import type { TriccNode } from '../model/types.js'

const select: TriccNode = {
  id: 's',
  type: 'select_multiple',
  name: 'danger_signs',
  options: [
    { id: 'o1', name: 'convulsions' },
    { id: 'o2', name: 'none', is_none: true },
  ],
}

describe('the "none of these" answer', () => {
  it('is written as is_none on the answer and read back', () => {
    const yaml = encodeNode(select, 'en')
    expect((yaml['options'] as Record<string, unknown>[])[1]).toMatchObject({ id: 'o2', is_none: true })
    expect((yaml['options'] as Record<string, unknown>[])[0]).not.toHaveProperty('is_none')
    expect(decodeNode(yaml as never, 'en').options).toEqual(select.options)
  })

  it('survives the shared document', () => {
    const doc = new Y.Doc()
    const m = nodeToY(select)
    doc.getMap('x').set('n', m)
    expect(nodeFromY(m).options).toEqual(select.options)
  })

  it('is read from a draw.io answer', () => {
    const cell = (id: string, attrs: string, parent = '1') =>
      `<object id="${id}" label="${id}" ${attrs}><mxCell vertex="1" parent="${parent}"><mxGeometry x="0" y="0" width="80" height="40" as="geometry"/></mxCell></object>`
    const xml = `<mxfile><diagram id="p" name="Page"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${[
      cell('st', 'odk_type="activity_start"'),
      cell('q', 'odk_type="select_multiple" name="signs"'),
      cell('a', 'odk_type="select_option" name="cough"', 'q'),
      cell('n', 'odk_type="select_option" name="opt_none" is_none="true"', 'q'),
    ].join('')}</root></mxGraphModel></diagram></mxfile>`
    const [activity] = activitiesFromDrawio(xml, new Set())
    expect(activity!.nodes['q']!.options).toEqual([
      expect.not.objectContaining({ is_none: true }),
      expect.objectContaining({ id: 'n', is_none: true }),
    ])
  })

  it('warns when a question has more than one', () => {
    const activity = minimalActivity('a')
    const two: TriccNode = { ...select, options: select.options!.map((o) => ({ ...o, is_none: true })) }
    activity.nodes[two.id] = two
    activity.nodeOrder.push(two.id)
    const rules = (a: typeof activity) => validateActivity(a).map((i) => i.rule)
    expect(rules(activity)).toContain('select.several-none')
    activity.nodes[two.id] = select
    expect(rules(activity)).not.toContain('select.several-none')
  })
})
