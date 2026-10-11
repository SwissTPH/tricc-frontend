import { deflateSync, strToU8, zlibSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { activitiesFromDrawio, inflateDiagram } from './drawio.js'
import { activityKind } from '../model/activity-kind.js'

const graph = (body: string) =>
  `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${body}</root></mxGraphModel>`

const cell = (id: string, attrs: string, label: string, extra = '') =>
  `<object id="${id}" label="${label}" ${attrs}><mxCell vertex="1" parent="1"${extra}><mxGeometry x="10" y="20" width="80" height="40" as="geometry"/></mxCell></object>`

function mxfile(
  pages: { id: string; name: string; body: string; compress?: 'raw' | 'zlib' | 'url' | 'drawio' }[],
): string {
  const diagrams = pages
    .map((page) => {
      let body = page.body
      if (page.compress) {
        // Global drawings deflate the URL-encoded XML, then base64 it.
        const source = page.compress === 'drawio' ? encodeURIComponent(body) : body
        const bytes = page.compress === 'zlib' ? zlibSync(strToU8(source)) : deflateSync(strToU8(source))
        const b64 = Buffer.from(bytes).toString('base64')
        body = page.compress === 'url' ? encodeURIComponent(b64) : b64
      }
      return `<diagram id="${page.id}" name="${page.name}">${body}</diagram>`
    })
    .join('')
  return `<?xml version="1.0"?><!-- keep --><mxfile>${diagrams}</mxfile>`
}

describe('draw.io pages', () => {
  it('takes the title from the start label, the page name only as a fallback', () => {
    const xml = mxfile([
      {
        id: 'a',
        name: 'Page 1',
        body: graph(
          [
            cell('s', 'odk_type="activity_start" relevance="AgeInMonths() &lt; 60"', 'Weight measurement'),
            cell('w', 'odk_type="decimal" name="weight"', 'Weight (kg)'),
          ].join(''),
        ),
      },
      { id: 'b', name: 'Danger signs', body: graph(cell('s2', 'odk_type="activity_start"', '')) },
    ])
    const [first, second] = activitiesFromDrawio(xml, new Set())
    expect(first?.id).toBe('page-1')
    expect(first?.title).toEqual({ en: 'Weight measurement' })
    expect(first?.applicability).toEqual({ expression: 'AgeInMonths() < 60' })
    expect(first?.nodes['s']).toEqual({ id: 's', type: 'activity_start', ui: expect.anything() })
    expect(second?.title).toEqual({ en: 'Danger signs' })
  })

  it('reads a page with a main start as a process even when it also holds an activity start', () => {
    const xml = mxfile([
      {
        id: 'nav',
        name: 'Navigation',
        body: graph(
          [
            cell('a', 'odk_type="activity_start"', 'Old entry'),
            cell('m', 'odk_type="start" process="registration"', 'Registration'),
          ].join(''),
        ),
      },
    ])
    const [page] = activitiesFromDrawio(xml, new Set())
    expect(activityKind(page!)).toBe('process')
    expect(page?.title).toEqual({ en: 'Registration' })
  })

  it('imports an edge leaving an answer as an edge from its question, on that answer', () => {
    const option = (id: string, parent: string, name: string, label: string) =>
      `<object id="${id}" label="${label}" odk_type="select_option" name="${name}"><mxCell vertex="1" parent="${parent}"><mxGeometry x="0" y="20" width="80" height="20" as="geometry"/></mxCell></object>`
    const edge = (id: string, source: string, target: string, value = '') =>
      `<mxCell id="${id}" edge="1" parent="1" source="${source}" target="${target}" value="${value}"><mxGeometry relative="1" as="geometry"/></mxCell>`
    const xml = mxfile([
      {
        id: 'p',
        name: 'Signs',
        body: graph(
          [
            cell('s', 'odk_type="activity_start"', 'Danger signs'),
            cell('m', 'odk_type="select_multiple" name="signs"', 'Which danger signs?'),
            option('m1', 'm', 'convulsions', 'Convulsions'),
            option('m2', 'm', 'lethargic', 'Lethargic'),
            cell('one', 'odk_type="select_one" name="cough"', 'Cough?'),
            option('o1', 'one', 'dry', 'Dry'),
            cell('refer', 'odk_type="note" name="refer"', 'Refer urgently'),
            cell('advise', 'odk_type="note" name="advise"', 'Advise'),
            edge('e1', 'm1', 'refer'),
            edge('e2', 'm2', 'refer', 'yes'),
            edge('e3', 'o1', 'advise'),
            edge('e4', 'm', 'advise'),
          ].join(''),
        ),
      },
    ])
    const [activity] = activitiesFromDrawio(xml, new Set())
    const edges = Object.values(activity!.edges).map((e) => [e.source, e.target, e.value])
    expect(edges).toEqual([
      ['m', 'refer', "Answer('convulsions')"],
      ['m', 'refer', "Answer('lethargic')"],
      ['one', 'advise', "Answer('dry')"],
      ['m', 'advise', undefined],
    ])
    expect(activity!.nodes['m']?.options?.map((o) => o.name)).toEqual(['convulsions', 'lethargic'])
  })

  it('turns a line between a note and a node into what the comment is about', () => {
    const xml = mxfile([
      {
        id: 'p',
        name: 'Weight',
        body: graph(
          [
            cell('s', 'odk_type="activity_start"', 'Weight'),
            cell('w', 'odk_type="decimal" name="weight"', 'Weight (kg)'),
            cell('c', '', 'Check the 9 kg threshold with the clinician'),
            '<mxCell id="e1" edge="1" parent="1" source="c" target="w"><mxGeometry relative="1" as="geometry"/></mxCell>',
            '<mxCell id="e2" edge="1" parent="1" source="s" target="w"><mxGeometry relative="1" as="geometry"/></mxCell>',
          ].join(''),
        ),
      },
    ])
    const [activity] = activitiesFromDrawio(xml, new Set())
    expect(activity?.ui?.comments?.[0]).toMatchObject({ id: 'c', node: 'w' })
    expect(Object.values(activity!.edges).map((e) => [e.source, e.target])).toEqual([['s', 'w']])
  })

  it('reads a container_page as a page group, with its shapes inside', () => {
    const xml = mxfile([
      {
        id: 'p',
        name: 'Signs',
        body: graph(
          [
            cell('s', 'odk_type="activity_start"', 'Signs'),
            '<object id="box" label="Danger signs" odk_type="container_page" name="danger_signs"><mxCell vertex="1" parent="1"><mxGeometry x="300" y="100" width="400" height="300" as="geometry"/></mxCell></object>',
            '<object id="q" label="Convulsions?" odk_type="select_yesno" name="convulsions"><mxCell vertex="1" parent="box"><mxGeometry x="20" y="40" width="160" height="40" as="geometry"/></mxCell></object>',
            '<object id="n" label="Ask the mother"><mxCell vertex="1" parent="box"><mxGeometry x="200" y="40" width="160" height="40" as="geometry"/></mxCell></object>',
          ].join(''),
        ),
      },
    ])
    const [activity] = activitiesFromDrawio(xml, new Set())
    expect(activity?.groups).toEqual([
      { id: 'box', name: 'danger_signs', label: { en: 'Danger signs' }, color: 'grey', x: 300, y: 100, width: 400, height: 300 },
    ])
    expect(activity?.nodes['q']).toMatchObject({ group: 'box', ui: { x: 20, y: 40 } })
    expect(activity?.nodes['box']).toBeUndefined()
    // A note inside the group is a comment, placed on the page.
    expect(activity?.ui?.comments?.[0]).toMatchObject({ id: 'n', x: 500, y: 140 })
  })

  it('attaches a hint or help linked by an edge to its question, as tricc_oo reads it', () => {
    const xml = mxfile([
      {
        id: 'p',
        name: 'Weight',
        body: graph(
          [
            cell('s', 'odk_type="activity_start"', 'Weight'),
            cell('w', 'odk_type="decimal" name="weight"', 'Weight (kg)'),
            cell('h', 'odk_type="hint-message"', 'Use a calibrated scale'),
            cell('x', 'odk_type="help-message"', 'Undress the child'),
            cell('lost', 'odk_type="hint-message"', 'Linked to nothing'),
            '<mxCell id="e1" edge="1" parent="1" source="h" target="w"><mxGeometry relative="1" as="geometry"/></mxCell>',
            '<mxCell id="e2" edge="1" parent="1" source="x" target="w"><mxGeometry relative="1" as="geometry"/></mxCell>',
            '<mxCell id="e3" edge="1" parent="1" source="s" target="w"><mxGeometry relative="1" as="geometry"/></mxCell>',
          ].join(''),
        ),
      },
    ])
    const [activity] = activitiesFromDrawio(xml, new Set())
    expect(activity?.nodes['w']).toMatchObject({ hint: { en: 'Use a calibrated scale' }, help: { en: 'Undress the child' } })
    expect(Object.values(activity!.edges).map((e) => [e.source, e.target])).toEqual([['s', 'w']])
    expect(activity?.ui?.comments?.map((c) => c.id)).toEqual(['lost'])
  })

  it('drops a label on an edge into Not available; it attaches, it does not branch', () => {
    const xml = mxfile([
      {
        id: 'p',
        name: 'Weight',
        body: graph(
          [
            cell('s', 'odk_type="activity_start"', 'Weight'),
            cell('w', 'odk_type="decimal" name="weight"', 'Weight (kg)'),
            cell('na', 'odk_type="not_available" name="weight_na"', 'Weight could not be measured'),
            cell('q', 'odk_type="select_yesno" name="fever"', 'Fever?'),
            cell('t', 'odk_type="text" name="note"', 'Note'),
            '<mxCell id="e1" edge="1" parent="1" source="w" target="na" value="Yes"><mxGeometry relative="1" as="geometry"/></mxCell>',
            '<mxCell id="e2" edge="1" parent="1" source="q" target="t" value="Yes"><mxGeometry relative="1" as="geometry"/></mxCell>',
          ].join(''),
        ),
      },
    ])
    const [activity] = activitiesFromDrawio(xml, new Set())
    const edges = Object.values(activity!.edges)
    expect(edges.find((e) => e.target === 'na')?.value).toBeUndefined()
    expect(edges.find((e) => e.target === 't')?.value).toBe('Yes')
  })

  it('reads an uncompressed diagram, including an unmapped shape', () => {
    const xml = mxfile([
      {
        id: 'p',
        name: 'Village visit',
        body: graph(
          [
            cell('s1', 'odk_type="activity_start" name="visit_start" form_id="visitform" process="registration"', 'Start'),
            cell('p1', 'odk_type="start" name="reg" form_id="visitform" process="registration"', 'Process'),
            cell('w1', 'odk_type="integer" name="weight_kg"', 'Weight'),
            cell('u1', 'odk_type="mystery_shape" name="mystery"', 'Mystery box'),
            cell('loose', '', 'Loose label'),
            '<mxCell id="blank" vertex="1" parent="1"><mxGeometry x="1" y="1" width="10" height="10" as="geometry"/></mxCell>',
          ].join(''),
        ),
      },
    ])
    const [activity] = activitiesFromDrawio(xml, new Set())
    expect(activity?.id).toBe('village-visit')
    // A page with a main start is a process, and that start is the activity:
    // its label is the title, its name and process are the activity's.
    expect(activity?.process).toBe('registration')
    expect(activity?.title).toEqual({ en: 'Process' })
    expect(activity?.name).toBe('reg')
    expect(activity?.nodes['p1']).toMatchObject({ type: 'start', form_id: 'visitform' })
    expect(activity?.nodes['p1']).not.toHaveProperty('name')
    expect(activity?.nodes['p1']).not.toHaveProperty('label')
    expect(activity?.nodes['s1']).toMatchObject({ type: 'activity_start', name: 'visit_start' })
    expect(activity?.nodes['s1']?.form_id).toBeUndefined()
    expect(activity?.nodes['w1']?.label).toEqual({ en: 'Weight' })
    expect(activity?.nodes['w1']?.filter).toBeUndefined()
    // Shapes tricc_oo ignores become comments on the diagram, not nodes it would convert.
    expect(activity?.nodes['u1']).toBeUndefined()
    expect(activity?.nodes['loose']).toBeUndefined()
    expect(activity?.ui?.comments).toEqual([
      expect.objectContaining({ id: 'u1', text: 'Unmapped type: mystery_shape — Mystery box', color: 'pink' }),
      expect.objectContaining({ id: 'loose', text: 'Loose label', color: 'yellow' }),
    ])
    expect(activity?.nodes['blank']).toBeUndefined()
  })

  it('inflates raw deflate, zlib, and a URL-encoded payload', () => {
    const inner = graph(cell('p1', 'odk_type="integer" name="pulse"', 'Pulse'))
    for (const compress of ['raw', 'zlib', 'url', 'drawio'] as const) {
      const xml = mxfile([{ id: 'c', name: 'Pulse check', body: inner, compress }])
      const [activity] = activitiesFromDrawio(xml, new Set())
      expect(activity?.id).toBe('pulse-check')
      expect(activity?.nodes['p1']?.type).toBe('integer')
      expect(activity?.nodes['p1']?.label).toEqual({ en: 'Pulse' })
    }
    const raw = Buffer.from(deflateSync(strToU8('<mxGraphModel/>'))).toString('base64')
    expect(inflateDiagram(encodeURIComponent(raw))).toContain('mxGraphModel')
    expect(() => inflateDiagram('@@@')).toThrow(/neither plain XML nor a compressed/)
  })

  it('ignores a select filter (choices compile from the options\' relevance)', () => {
    const xml = mxfile([
      {
        id: 'p',
        name: 'Coma',
        body: graph(
          [
            cell('q1', 'odk_type="select_one" name="select_" filter="etat.coma.004"', 'Check blood sugar'),
            cell('q2', 'odk_type="select_one" name="etat.r.001" filter=""', 'Age category'),
          ].join(''),
        ),
      },
    ])
    const [activity] = activitiesFromDrawio(xml, new Set())
    expect(activity?.nodes['q1']?.name).toBe('select_')
    expect(activity?.nodes['q1']).not.toHaveProperty('filter')
    expect(activity?.nodes['q2']).not.toHaveProperty('filter')
    expect(activity?.nodes['q2']?.name).toBe('etat.r.001')
  })

  it('folds hints, options, calculates, and resolves a goto inside the file', () => {
    const body = graph(
      [
        cell('q', 'odk_type="select_one yesno" name="breathing"', 'Breathing?'),
        `<object id="opt" label="Yes" odk_type="select_option" name="yes"><mxCell vertex="1" parent="q"><mxGeometry x="0" y="0" width="40" height="20" as="geometry"/></mxCell></object>`,
        `<object id="hint" label="Look at the chest" odk_type="hint-message"><mxCell vertex="1" parent="q"><mxGeometry x="0" y="0" width="40" height="20" as="geometry"/></mxCell></object>`,
        cell('calc', 'odk_type="calculate" name="score" reference="&quot;weight_kg&quot; + 1"', 'Score'),
        cell('pop', 'odk_type="input" name="prev_weight"', 'Previous weight'),
        cell('rh', 'odk_type="rhombus" name="gate" reference="&quot;age&quot; &lt; 60" severity="severe"', 'Young'),
        `<object id="go" label="Temperature" odk_type="goto" name="temp_goto" link="data:page/id,other"><mxCell vertex="1" parent="1"><mxGeometry x="10" y="20" width="70" height="40" as="geometry"/></mxCell></object>`,
        `<object id="gone" label="Oxygen" odk_type="goto" link="data:page/name,Missing page"><mxCell vertex="1" parent="1"><mxGeometry x="10" y="20" width="70" height="40" as="geometry"/></mxCell></object>`,
        '<mxCell id="e1" edge="1" parent="1" source="q" target="calc" value="Yes"><mxGeometry relative="1" as="geometry"/></mxCell>',
        '<mxCell id="e-missing" edge="1" parent="1" source="q" target="nope"><mxGeometry relative="1" as="geometry"/></mxCell>',
      ].join(''),
    )
    const other = graph(cell('n', 'odk_type="note" name="temp_note"', 'Temperature page'))
    const xml = mxfile([
      { id: 'main', name: 'Main', body },
      { id: 'other', name: 'Temperature page', body: other },
    ])
    const activities = activitiesFromDrawio(xml, new Set(['main']))
    const main = activities.find((a) => a.title?.en === 'Main')
    expect(main?.id).not.toBe('main')
    expect(main?.nodes['q']?.type).toBe('select_yesno')
    expect(main?.nodes['q']?.options?.[0]).toMatchObject({ name: 'yes', label: { en: 'Yes' } })
    expect(main?.nodes['q']?.hint).toEqual({ en: 'Look at the chest' })
    expect(main?.nodes['opt']).toBeUndefined()
    expect(main?.nodes['calc']?.calculate).toEqual({ expression: '"weight_kg" + 1' })
    expect(main?.nodes['pop']).toMatchObject({ type: 'populate', context: 'encounter' })
    expect(main?.nodes['rh']).toMatchObject({ type: 'rhombus', severity: 'severe', reference: '"age" < 60' })
    expect(main?.nodes['go']?.link).toBe('temperature-page')
    expect(main?.nodes['gone']?.link).toBe('oxygen')
    expect(Object.values(main?.edges ?? {})).toEqual([
      expect.objectContaining({ source: 'q', target: 'calc', value: 'Yes' }),
    ])
  })

  it('rejects a file that is not a diagram and an empty page', () => {
    expect(() => activitiesFromDrawio('<html></html>', new Set())).toThrow(/not a draw\.io diagram/)
    expect(() => activitiesFromDrawio('<mxfile></mxfile>', new Set())).toThrow(/no pages/)
    expect(() => activitiesFromDrawio('<mxfile><diagram id="e" name="Empty"></diagram></mxfile>', new Set())).toThrow(
      /empty/,
    )
    expect(() => activitiesFromDrawio('   ', new Set())).toThrow(/empty/)
    expect(() => activitiesFromDrawio('<mxfile><diagram name="Bad" foo=bar></diagram></mxfile>', new Set())).toThrow(
      /unquoted/,
    )
  })



})
