import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync, strToU8, zlibSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { activitiesFromDrawio, inflateDiagram } from './drawio.js'
import { readProject, writeChanged, writeProject } from './serialize/index.js'

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
    expect(activity?.process).toBe('registration')
    expect(activity?.nodes['s1']).toMatchObject({ type: 'activity_start', name: 'visit_start' })
    expect(activity?.nodes['s1']?.form_id).toBeUndefined()
    expect(activity?.nodes['p1']).toMatchObject({ type: 'start', form_id: 'visitform', name: 'reg' })
    expect(activity?.nodes['w1']?.label).toEqual({ en: 'Weight' })
    expect(activity?.nodes['w1']?.filter).toBeUndefined()
    expect(activity?.nodes['u1']).toMatchObject({
      type: 'note',
      label: { en: 'Unmapped type: mystery_shape' },
    })
    expect(activity?.nodes['loose']?.label).toEqual({ en: 'Loose label' })
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

  it('keeps a select filter as the concept code and drops an empty filter', () => {
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
    expect(activity?.nodes['q1']).toMatchObject({ name: 'select_', filter: 'etat.coma.004' })
    expect(activity?.nodes['q2']?.filter).toBeUndefined()
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

  it('opens the on-disk fixtures, including the compressed page', () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), '../../../../examples/drawio-open')
    const plain = activitiesFromDrawio(readFileSync(join(dir, 'diagrams/plain.drawio'), 'utf8'), new Set())
    expect(plain[0]?.nodes['w1']?.label).toEqual({ en: 'Weight' })
    expect(plain[0]?.nodes['u1']?.label).toEqual({ en: 'Unmapped type: mystery_shape' })
    const compressed = activitiesFromDrawio(
      readFileSync(join(dir, 'diagrams/compressed.drawio'), 'utf8'),
      new Set(),
    )
    expect(compressed[0]?.id).toBe('pulse-check')
    expect(compressed[0]?.nodes['p1']?.label).toEqual({ en: 'Pulse' })
  })

  it('saves a listed draw.io file as activity YAML and leaves the drawing out of the removal list', () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), '../../../../examples/drawio-open')
    const files: Record<string, string> = {
      'tricc.yaml': readFileSync(join(dir, 'tricc.yaml'), 'utf8'),
      'diagrams/plain.drawio': readFileSync(join(dir, 'diagrams/plain.drawio'), 'utf8'),
      'diagrams/compressed.drawio': readFileSync(join(dir, 'diagrams/compressed.drawio'), 'utf8'),
      'README.md': 'keep',
    }
    const read = readProject(files)
    expect(read.migratedFrom).toBe('drawio')
    expect(read.project.activities['village-visit']?.nodes['w1']?.type).toBe('integer')
    expect(read.project.activities['pulse-check']?.nodes['p1']?.label).toEqual({ en: 'Pulse' })
    expect(read.project.interventions[0]?.activities.map((ref) => ref.ref).sort()).toEqual([
      'pulse-check',
      'village-visit',
    ])
    const written = writeProject(read.project)
    expect(written['tricc.yaml']).toContain('activities/village-visit.activity.yaml')
    expect(written['tricc.yaml']).toContain('activities/pulse-check.activity.yaml')
    expect(written['tricc.yaml']).not.toContain('.drawio')
    const { removed } = writeChanged(read.project, files)
    expect(removed).not.toContain('diagrams/plain.drawio')
    expect(removed).not.toContain('diagrams/compressed.drawio')
    expect(removed).not.toContain('README.md')
  })
})
