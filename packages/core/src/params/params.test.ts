import { describe, expect, it } from 'vitest'
import type { Activity, Project, TriccNode } from '../model/types.js'
import {
  createActivity,
  createBlock,
  createProcessActivity,
  createProject,
  readProject,
  writeProject,
} from '../format/serialize/index.js'
import { ProjectDocument } from '../document/doc.js'
import { activityKind } from '../model/activity-kind.js'
import { activitiesFromDrawio } from '../format/drawio.js'
import { validateProject } from '../validate/project.js'
import { effectiveParams, paramConflicts } from './effective.js'
import { applyParamSync, paramConceptCode, syncedParams } from './sync.js'
import { coerceArg, planParamRename } from './rename.js'
import { argProblem, paramEnvironments } from './resolve.js'
import { parseParamArg, parseParamShorthand } from './drawio.js'
import { calculateCodeSystem } from '../terminology/dictionaries.js'

function call(
  id: string,
  type: 'block' | 'goto',
  link: string,
  args?: TriccNode['args'],
): TriccNode {
  return { id, type, link, ...(args ? { args } : {}), ui: { x: 0, y: 0 } }
}

function addNode(activity: Activity, node: TriccNode): void {
  activity.nodes[node.id] = node
  activity.nodeOrder.push(node.id)
}

/** A block `temp` (site, threshold), used by activity `danger`, listed by process `triage`. */
function sample(): Project {
  const project = createProject({ id: 'demo', title: 'Demo' })
  const block = createBlock({ id: 'temp', title: 'Measure temperature' })
  block.params = [
    { name: 'site', type: 'choice', options: ['axillary', 'rectal', 'oral'], required: true },
    { name: 'threshold', type: 'number', default: 37.5 },
  ]
  addNode(block, {
    id: 'q',
    type: 'decimal',
    name: 'temp_{{site}}',
    relevance: { expression: '"x" > {{threshold}}' },
  })
  const danger = createActivity({ id: 'danger', title: 'Danger signs' })
  addNode(danger, call('use', 'block', 'temp', { threshold: 38 }))
  const triage = createProcessActivity({ id: 'triage', process: 'triage', calls: ['danger'] })
  project.activities = { temp: block, danger, triage }
  project.interventions = [
    { id: 'iv', activities: [{ ref: 'triage' }], args: { site: 'axillary' } },
  ]
  return project
}

describe('effective parameters', () => {
  it('bubbles what a call leaves unset, and a literal binds it', () => {
    const project = sample()
    const danger = effectiveParams(project, 'danger')
    expect(danger.map((e) => [e.name, e.computed, e.declaredIn])).toEqual([['site', true, 'temp']])
    expect(effectiveParams(project, 'triage').map((e) => e.name)).toEqual(['site'])
  })

  it('a {{ref}} binding adds the referenced name with the callee type', () => {
    const project = sample()
    project.activities['danger']!.nodes['use']!.args = { threshold: 38, site: '{{where}}' }
    const danger = effectiveParams(project, 'danger')
    expect(danger.map((e) => [e.name, e.param.type, e.param.options])).toEqual([
      ['where', 'choice', ['axillary', 'rectal', 'oral']],
    ])
  })

  it('flags a declared row nothing uses, never a used one', () => {
    const project = sample()
    project.activities['danger']!.params = [{ name: 'lonely', type: 'boolean' }]
    const rows = effectiveParams(project, 'danger')
    expect(rows.find((e) => e.name === 'lonely')?.unused).toBe(true)
    expect(effectiveParams(project, 'temp').every((e) => !e.unused)).toBe(true)
  })

  it('reports two callees disagreeing on one name', () => {
    const project = sample()
    const other = createBlock({ id: 'other', title: 'Other' })
    other.params = [{ name: 'site', type: 'string' }]
    addNode(other, { id: 'n', type: 'note', label: { en: '{{site}}' } })
    project.activities['other'] = other
    addNode(project.activities['danger']!, call('use2', 'block', 'other'))
    expect(paramConflicts(project).map((c) => [c.activityId, c.name])).toContainEqual([
      'danger',
      'site',
    ])
  })
})

describe('sync', () => {
  it('saves computed rows from their deepest declaration and creates parameter concepts', () => {
    const project = sample()
    expect(syncedParams(project).get('danger')).toEqual([
      { name: 'site', type: 'choice', options: ['axillary', 'rectal', 'oral'], required: true },
    ])
    expect(applyParamSync(project)).toBe(true)
    const cs = calculateCodeSystem(project)!
    expect(Object.keys(cs.concepts).sort()).toEqual(['param_temp_site', 'param_temp_threshold'])
    expect(cs.concepts['param_temp_site']).toMatchObject({
      kind: 'parameter',
      dataType: 'coded',
      paramOptions: ['axillary', 'rectal', 'oral'],
    })
    expect(cs.concepts['param_temp_threshold']?.paramDefault).toBe('37.5')
    expect(applyParamSync(project)).toBe(false)
  })

  it('round-trips params, args, blocks and intervention values through the files', () => {
    const project = sample()
    project.interventions[0]!.requires = ['other']
    applyParamSync(project)
    const files = writeProject(project)
    expect(files['blocks/temp.block.yaml']).toContain('block_start')
    expect(files['activities/temp.activity.yaml']).toBeUndefined()
    expect(files['tricc.yaml']).toContain('blocks:')
    expect(files['tricc.yaml']).toContain('site: axillary')
    const { project: back } = readProject(files)
    expect(activityKind(back.activities['temp']!)).toBe('block')
    expect(back.activities['temp']!.params).toEqual(project.activities['temp']!.params)
    expect(back.activities['danger']!.nodes['use']!.args).toEqual({ threshold: 38 })
    expect(back.interventions[0]!.args).toEqual({ site: 'axillary' })
    expect(back.interventions[0]!.requires).toEqual(['other'])
    expect(writeProject(back)).toEqual(files)
  })

  it('reads snippet_start and snippet as block_start and block, and writes the new names', () => {
    const project = sample()
    applyParamSync(project)
    const files = writeProject(project)
    const old = {
      ...files,
      'blocks/temp.block.yaml': files['blocks/temp.block.yaml']!.replace(
        'type: block_start',
        'type: snippet_start',
      ),
      'activities/danger.activity.yaml': files['activities/danger.activity.yaml']!.replace(
        'type: block',
        'type: snippet',
      ),
    }
    expect(old['blocks/temp.block.yaml']).toContain('snippet_start')
    const { project: back } = readProject(old)
    expect(activityKind(back.activities['temp']!)).toBe('block')
    expect(back.activities['danger']!.nodes['use']!.type).toBe('block')
    expect(writeProject(back)).toEqual(files)
  })
})

describe('the document', () => {
  it('keeps computed rows and concepts in step as calls change', () => {
    const project = sample()
    project.activities['danger']!.nodeOrder = project.activities['danger']!.nodeOrder.filter(
      (id) => id !== 'use',
    )
    delete project.activities['danger']!.nodes['use']
    const doc = ProjectDocument.fromProject(project)
    doc.transact((tx) => tx.addNode('danger', call('use', 'block', 'temp')))
    expect(doc.snapshot().activities['danger']!.params?.map((p) => p.name)).toEqual([
      'site',
      'threshold',
    ])
    doc.transact((tx) => tx.updateNode('danger', call('use', 'block', 'temp', { threshold: 39 })))
    // Set at the call now: the row was only computed, so it goes with the change.
    expect(doc.snapshot().activities['danger']!.params?.map((p) => p.name)).toEqual(['site'])
    // A row the author declared stays, flagged as not used.
    doc.transact((tx) =>
      tx.setActivityParams('danger', [
        ...doc.snapshot().activities['danger']!.params!,
        { name: 'mine', type: 'boolean' },
      ]),
    )
    doc.transact((tx) => tx.updateNode('danger', call('use', 'block', 'temp', { threshold: 40 })))
    expect(effectiveParams(doc.snapshot(), 'danger').find((e) => e.name === 'mine')?.unused).toBe(
      true,
    )
    expect(calculateCodeSystem(doc.snapshot())?.concepts['param_temp_site']?.kind).toBe('parameter')
  })

  it('renames through the chain: rows, uses, call values and intervention values', () => {
    const doc = ProjectDocument.fromProject(sample())
    doc.transact((tx) => tx.setActivityName('temp', 'temp'))
    doc.transact((tx) =>
      tx.updateParam('temp', 'site', {
        name: 'location',
        type: 'choice',
        options: ['axillary', 'rectal', 'oral'],
        required: true,
      }),
    )
    const p = doc.snapshot()
    expect(p.activities['temp']!.nodes['q']!.name).toBe('temp_{{location}}')
    expect(p.activities['danger']!.params?.map((r) => r.name)).toEqual(['location'])
    expect(p.activities['triage']!.params?.map((r) => r.name)).toEqual(['location'])
    expect(p.interventions[0]!.args).toEqual({ location: 'axillary' })
    const cs = calculateCodeSystem(p)!
    expect(cs.concepts['param_temp_location']).toBeDefined()
    expect(cs.concepts['param_temp_site']).toBeUndefined()
  })

  it('moves a value set at a call when the block parameter is renamed, and coerces on a type change', () => {
    const doc = ProjectDocument.fromProject(sample())
    doc.transact((tx) =>
      tx.updateParam('temp', 'threshold', { name: 'limit', type: 'string', default: '37.5' }),
    )
    expect(doc.snapshot().activities['danger']!.nodes['use']!.args).toEqual({ limit: '38' })
  })

  it('keeps the texts of a parameter concept when its page is renamed', () => {
    const project = sample()
    applyParamSync(project)
    const cs = calculateCodeSystem(project)!
    cs.concepts['param_temp_site']!.display = 'Site'
    const doc = ProjectDocument.fromProject(project)
    doc.transact((tx) => tx.setActivityName('temp', 'measure_temperature'))
    const after = calculateCodeSystem(doc.snapshot())!
    expect(
      after.concepts[paramConceptCode({ id: 'temp', name: 'measure_temperature' }, 'site')]
        ?.display,
    ).toBe('Site')
    expect(after.concepts['param_temp_site']).toBeUndefined()
  })
})

describe('values', () => {
  it('resolves call value, then inherited, then default', () => {
    const project = sample()
    applyParamSync(project)
    const env = paramEnvironments(project).get('temp')![0]!
    expect(env.chain).toEqual(['triage', 'danger', 'temp'])
    expect(env.values).toEqual({ site: 'axillary', threshold: 38 })
    expect(env.sources['site']).toEqual({ kind: 'intervention', interventionId: 'iv' })
  })

  it('checks a value against its parameter', () => {
    const site = { name: 'site', type: 'choice' as const, options: ['axillary'] }
    expect(argProblem(site, 'rectal2', 'Site')).toBe(
      '“rectal2” is not one of the options for “Site”.',
    )
    expect(argProblem(site, '{{where}}')).toBeUndefined()
    expect(coerceArg(37.5, 'string')).toBe('37.5')
    expect(coerceArg('abc', 'number')).toBeUndefined()
  })

  it('plans a rename without touching what does not change', () => {
    const plan = planParamRename(sample(), 'temp', 'threshold', 'limit')
    expect(plan.activities.map((a) => a.id).sort()).toEqual(['danger', 'temp'])
    expect(plan.interventions).toEqual([])
  })
})

describe('validation', () => {
  it('names a required setting with no value, unknown values and bad choices', () => {
    const project = sample()
    project.interventions[0]!.args = { nothing: 1 }
    project.activities['danger']!.nodes['use']!.args = { threshold: 38, gone: 1 }
    applyParamSync(project)
    const rules = validateProject(project).map((i) => i.rule)
    expect(rules).toContain('param.missing-required')
    expect(rules).toContain('intervention.unknown-param')
    expect(rules).toContain('call.unknown-param')

    project.interventions[0]!.args = { site: 'rectal2' }
    expect(validateProject(project).map((i) => i.rule)).toContain('intervention.value-not-allowed')
  })

  it('finds a block cycle and an unused block', () => {
    const project = sample()
    addNode(project.activities['temp']!, call('self', 'block', 'temp'))
    project.activities['spare'] = createBlock({ id: 'spare', title: 'Spare' })
    const issues = validateProject(project)
    expect(issues.find((i) => i.rule === 'block.cycle')?.message).toContain('uses itself')
    expect(issues.some((i) => i.rule === 'block.unused' && i.location.activityId === 'spare')).toBe(
      true,
    )
    expect(
      issues.some((i) => i.rule === 'activity.unassigned' && i.location.activityId === 'spare'),
    ).toBe(false)
  })
})

describe('draw.io', () => {
  const graph = (body: string) =>
    `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${body}</root></mxGraphModel>`
  const cell = (id: string, attrs: string, label: string) =>
    `<object id="${id}" label="${label}" ${attrs}><mxCell vertex="1" parent="1"><mxGeometry x="10" y="20" width="80" height="40" as="geometry"/></mxCell></object>`

  it('reads the shorthand and the JSON form alike', () => {
    expect(parseParamShorthand('site', 'choice(axillary|rectal|oral)!')).toEqual({
      name: 'site',
      type: 'choice',
      options: ['axillary', 'rectal', 'oral'],
      required: true,
    })
    expect(parseParamShorthand('threshold', 'number=37.5')).toEqual({
      name: 'threshold',
      type: 'number',
      default: 37.5,
    })
    expect(parseParamShorthand('note', '{"type":"string","label":"Note"}', 'fr')).toEqual({
      name: 'note',
      type: 'string',
      label: { fr: 'Note' },
    })
    expect(parseParamArg('37.5')).toBe(37.5)
    expect(parseParamArg('{{care_setting}}')).toBe('{{care_setting}}')
  })

  it('folds the parameters shape into params and param.* into args', () => {
    const xml = `<mxfile><diagram id="b" name="temp">${graph(
      cell('s', 'odk_type="snippet_start"', 'Measure temperature') +
        cell(
          'p',
          'odk_type="parameters" param.site="choice(axillary|rectal)!" param.threshold="number=37.5"',
          '',
        ) +
        cell(
          'u',
          'odk_type="block" link="other" param.site="axillary" param.threshold="38"',
          'Use',
        ),
    )}</diagram></mxfile>`
    const [page] = activitiesFromDrawio(xml, new Set())
    expect(activityKind(page!)).toBe('block')
    expect(page!.params?.map((p) => p.name)).toEqual(['site', 'threshold'])
    expect(page!.nodes['p']).toBeUndefined()
    expect(page!.nodes['u']!.args).toEqual({ site: 'axillary', threshold: 38 })
  })
})
