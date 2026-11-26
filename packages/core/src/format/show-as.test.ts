import { describe, expect, it } from 'vitest'
import { minimalActivity, sampleProject } from './__fixtures__.js'
import { readProject, writeProject } from './serialize/index.js'
import { fromYaml } from './serialize/yaml.js'
import { activitiesFromDrawio } from './drawio.js'
import { migrateInlineInstances } from './inline-instance.js'
import { defaultShowAs, showAsOf, showAsPatch } from '../model/show-as.js'
import { validateProject } from '../validate/project.js'
import { ProjectDocument } from '../document/doc.js'
import type { Activity, Project, TriccNode } from '../model/types.js'

/** A project with a caller activity whose nodes are given, and the called activity `cough`. */
function withCaller(nodes: TriccNode[], cough?: Partial<TriccNode>): Project {
  const p = sampleProject()
  const caller: Activity = {
    id: 'caller',
    title: { en: 'Caller' },
    nodeOrder: ['s', ...nodes.map((n) => n.id)],
    edgeOrder: [],
    nodes: {
      s: { id: 's', type: 'activity_start', ui: { x: 0, y: 0 } },
      ...Object.fromEntries(nodes.map((n) => [n.id, { ui: { x: 0, y: 0 }, ...n }])),
    },
    edges: {},
  }
  const called = minimalActivity('cough')
  if (cough) Object.assign(called.nodes['s']!, cough)
  p.activities = { ...p.activities, caller, cough: called }
  return p
}

const goto = (id: string, extra: Partial<TriccNode> = {}): TriccNode => ({
  id,
  type: 'goto',
  link: 'cough',
  ...extra,
})

const rules = (p: Project) => validateProject(p).map((i) => i.rule)

describe('Show as pair', () => {
  it('reads a pair as one choice', () => {
    expect(showAsOf({})).toBeUndefined()
    expect(showAsOf({ page: true, asGroup: true })).toBe('page')
    expect(showAsOf({ page: true, asGroup: false })).toBe('page')
    expect(showAsOf({ page: true })).toBe('page')
    expect(showAsOf({ page: false, asGroup: true })).toBe('section')
    expect(showAsOf({ asGroup: true })).toBe('section')
    expect(showAsOf({ page: false })).toBe('section')
    expect(showAsOf({ page: false, asGroup: false })).toBe('inline')
    expect(showAsOf({ asGroup: false })).toBe('inline')
  })

  it('writes a choice as a pair, Default as neither', () => {
    expect(showAsPatch('page')).toEqual({ page: true, asGroup: true })
    expect(showAsPatch('section')).toEqual({ page: false, asGroup: true })
    expect(showAsPatch('inline')).toEqual({ page: false, asGroup: false })
    expect(showAsPatch(undefined)).toEqual({ page: undefined, asGroup: undefined })
  })

  it('resolves Default from the container, or from the called activity', () => {
    const p = withCaller([goto('g')], { page: true, asGroup: true })
    const caller = p.activities['caller']!
    expect(defaultShowAs(caller.nodes['s']!, p)).toBe('section')
    expect(defaultShowAs({ id: 'b', type: 'block_start' }, p)).toBe('inline')
    expect(defaultShowAs(caller.nodes['g']!, p)).toBe('page')
    expect(defaultShowAs({ id: 'x', type: 'goto', link: 'nowhere' }, p)).toBeUndefined()
  })
})

describe('Show as in the files', () => {
  it('keeps page and asGroup on every carrier, false included', () => {
    const p = withCaller(
      [
        goto('g', { page: false, asGroup: false }),
        { id: 'b', type: 'block', link: 'cough', page: true, asGroup: true },
      ],
      { page: true, asGroup: false },
    )
    p.activities['caller']!.groups = [
      {
        id: 'grp',
        name: 'signs',
        page: false,
        asGroup: false,
        color: 'grey',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      },
    ]
    const files = writeProject(p)
    const yaml = fromYaml(files['activities/caller.activity.yaml'] as string) as {
      nodes: Record<string, unknown>[]
      groups: Record<string, unknown>[]
    }
    expect(yaml.nodes.find((n) => n['id'] === 'g')).toMatchObject({ page: false, asGroup: false })
    expect(yaml.groups[0]).toMatchObject({ page: false, asGroup: false })
    const back = readProject(files).project
    expect(back.activities['caller']!.nodes['g']).toMatchObject({ page: false, asGroup: false })
    expect(back.activities['caller']!.nodes['b']).toMatchObject({ page: true, asGroup: true })
    expect(back.activities['cough']!.nodes['s']).toMatchObject({ page: true, asGroup: false })
    expect(back.activities['caller']!.groups?.[0]).toMatchObject({ page: false, asGroup: false })
  })

  it('writes neither when Show as is Default', () => {
    const files = writeProject(withCaller([goto('g')]))
    const text = files['activities/caller.activity.yaml'] as string
    expect(text).not.toMatch(/page:|asGroup:/)
  })

  it('survives the collaborative document', () => {
    const p = withCaller([goto('g', { page: false, asGroup: true })])
    p.activities['caller']!.groups = [
      { id: 'grp', asGroup: false, color: 'grey', x: 0, y: 0, width: 10, height: 10 },
    ]
    const snap = ProjectDocument.fromProject(p).snapshot()
    expect(snap.activities['caller']!.nodes['g']).toMatchObject({ page: false, asGroup: true })
    expect(snap.activities['caller']!.groups?.[0]?.asGroup).toBe(false)
  })
})

describe('draw.io', () => {
  const xml = (body: string) =>
    `<mxfile><diagram id="p" name="Signs"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${body}</root></mxGraphModel></diagram></mxfile>`
  const shape = (id: string, attrs: string) =>
    `<object id="${id}" label="${id}" ${attrs}><mxCell vertex="1" parent="1"><mxGeometry x="10" y="20" width="80" height="40" as="geometry"/></mxCell></object>`

  it('reads page and asGroup on shapes and container_page', () => {
    const [a] = activitiesFromDrawio(
      xml(
        [
          shape('s', 'odk_type="activity_start" page="1" asGroup="true"'),
          shape('g', 'odk_type="goto" link="other" page="false" asGroup="0"'),
          shape('h', 'odk_type="goto" link="other" page="maybe"'),
          shape('box', 'odk_type="container_page" name="box" page="true" asGroup="false"'),
        ].join(''),
      ),
      new Set(),
    )
    expect(a?.nodes['s']).toMatchObject({ page: true, asGroup: true })
    expect(a?.nodes['g']).toMatchObject({ page: false, asGroup: false })
    expect(a?.nodes['h']?.page).toBeUndefined()
    expect(a?.groups?.[0]).toMatchObject({ page: true, asGroup: false })
  })

  it('keeps instance -1 for the conversion on open', () => {
    const [a] = activitiesFromDrawio(
      xml(
        [
          shape('s', 'odk_type="activity_start"'),
          shape('g', 'odk_type="goto" link="x" instance="-1"'),
        ].join(''),
      ),
      new Set(),
    )
    expect(a?.nodes['g']?.instance).toBe(-1)
  })
})

describe('instance -1 on open', () => {
  const NOW = '2026-11-26T10:00:00.000Z'

  it('turns a goto into Show as: Inline and opens a discussion on it', () => {
    const p = withCaller([goto('g', { instance: -1 }), goto('h', { instance: 2 })])
    expect(migrateInlineInstances(p, NOW)).toBe(1)
    const g = p.activities['caller']!.nodes['g']!
    expect(g.instance).toBeUndefined()
    expect(g).toMatchObject({ page: false, asGroup: false })
    expect(p.activities['caller']!.nodes['h']!.instance).toBe(2)
    const notes = Object.values(p.discussions ?? {})
    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatchObject({
      about: { kind: 'node', activityId: 'caller', nodeId: 'g' },
      status: 'open',
      comments: [{ author: { id: 'tricc', name: 'TRICC' }, at: NOW }],
    })
    expect(notes[0]!.comments[0]!.text).toMatch(/Show as: Inline/)
    expect(notes[0]!.id).toMatch(/^d-[0-9a-z]{10}$/)
  })

  it('removes only the instance when asGroup is already set', () => {
    const p = withCaller([goto('g', { instance: -1, asGroup: true })])
    migrateInlineInstances(p, NOW)
    const g = p.activities['caller']!.nodes['g']!
    expect(g.instance).toBeUndefined()
    expect(g.asGroup).toBe(true)
    expect(g.page).toBeUndefined()
    expect(Object.values(p.discussions ?? {})[0]!.comments[0]!.text).toMatch(/which wins/)
  })

  it('converts an activity start too, with the note on the start node', () => {
    const p = withCaller([goto('g')], { instance: -1 })
    migrateInlineInstances(p, NOW)
    expect(p.activities['cough']!.nodes['s']).toMatchObject({ page: false, asGroup: false })
    expect(Object.values(p.discussions ?? {})[0]!.about).toEqual({
      kind: 'node',
      activityId: 'cough',
      nodeId: 's',
    })
  })

  it('is a migration on read: same ids every time, files hold no instance -1', () => {
    const files = writeProject(withCaller([goto('g', { instance: -1 })]))
    const first = readProject(files)
    const second = readProject(files)
    expect(first.migratedFrom).toBe('inline-instance')
    expect(Object.keys(first.project.discussions ?? {})).toEqual(
      Object.keys(second.project.discussions ?? {}),
    )
    const saved = writeProject(first.project)
    expect(saved['activities/caller.activity.yaml']).not.toMatch(/instance: -1/)
    expect(Object.keys(saved).some((f) => f.startsWith('discussions/'))).toBe(true)
    // Read again after the save: nothing left to convert, no second note.
    const again = readProject(saved)
    expect(again.migratedFrom).toBeUndefined()
    expect(Object.keys(again.project.discussions ?? {})).toHaveLength(1)
  })

  it('leaves a project without instance -1 alone', () => {
    const p = withCaller([goto('g', { instance: 2 })])
    expect(migrateInlineInstances(p, NOW)).toBe(0)
    expect(p.discussions).toBeUndefined()
  })
})

describe('Show as validation', () => {
  it('errors when gotos sharing an instance set different page values', () => {
    const p = withCaller([goto('a', showAsPatch('page')), goto('b', showAsPatch('section'))])
    const found = validateProject(p).filter((i) => i.rule === 'goto.instance-page')
    expect(found.map((i) => i.location.nodeId).sort()).toEqual(['a', 'b'])
    expect(found[0]!.severity).toBe('error')
  })

  it('lets a goto that sets nothing follow the one that does', () => {
    expect(rules(withCaller([goto('a', showAsPatch('page')), goto('b')]))).not.toContain(
      'goto.instance-page',
    )
  })

  it('does not count an Inline goto, which has no instance to share', () => {
    expect(
      rules(withCaller([goto('a', showAsPatch('page')), goto('b', showAsPatch('inline'))])),
    ).not.toContain('goto.instance-page')
  })

  it('does not compare different instances', () => {
    const p = withCaller([
      goto('a', { ...showAsPatch('page'), instance: 2 }),
      goto('b', showAsPatch('section')),
    ])
    expect(rules(p)).not.toContain('goto.instance-page')
  })

  it('warns about an instance on an Inline goto, also when Inline comes from the activity', () => {
    expect(rules(withCaller([goto('a', { ...showAsPatch('inline'), instance: 3 })]))).toContain(
      'goto.inline-instance',
    )
    expect(rules(withCaller([goto('a', { instance: 3 })], { asGroup: false }))).toContain(
      'goto.inline-instance',
    )
    expect(rules(withCaller([goto('a', { ...showAsPatch('inline'), instance: 1 })]))).not.toContain(
      'goto.inline-instance',
    )
  })

  it('errors on a negative instance left after load', () => {
    expect(rules(withCaller([goto('a', { instance: -1 })]))).toContain('goto.instance-negative')
  })

  it('warns about Show as on a node that does not carry it', () => {
    expect(rules(withCaller([{ id: 'q', type: 'integer', name: 'age', page: true }]))).toContain(
      'node.page-not-supported',
    )
  })

  it('warns about a page with no section, on a node and on a group', () => {
    const p = withCaller([goto('a', { page: true, asGroup: false })])
    p.activities['caller']!.groups = [
      { id: 'grp', page: true, asGroup: false, color: 'grey', x: 0, y: 0, width: 10, height: 10 },
    ]
    const found = validateProject(p).filter((i) => i.rule === 'node.page-not-section')
    expect(found.map((i) => i.location.nodeId ?? i.location.groupId).sort()).toEqual(['a', 'grp'])
  })
})
