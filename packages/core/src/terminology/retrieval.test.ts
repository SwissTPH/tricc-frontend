import { describe, expect, it } from 'vitest'
import { sampleProject } from '../format/__fixtures__.js'
import { readProject, writeProject } from '../format/serialize/index.js'
import { encodeCodeSystem } from '../format/codec.js'
import { ProjectDocument } from '../document/doc.js'
import type { Project, TriccNode } from '../model/types.js'
import { validateProject } from '../validate/project.js'
import { emptyCodeSystem, projectDictionaries, retrieveCodeSystem } from './dictionaries.js'
import {
  isIsoPeriod,
  retrievalCodeFor,
  retrievalRefs,
  retrievalUsage,
  retrievalsForIntervention,
} from './retrieval.js'
import { planMoveToRetrieval } from './retrieval-migration.js'
import { defaultCodeSystem, populateSourceKey } from './usage.js'

const DEFAULT = 'http://tricc.org/CodeSystem/tricc'
const RETRIEVE = `${DEFAULT}-retrieve`

/** The sample project with a retrieval dictionary of three entries. */
function withRetrievals(): Project {
  const project = sampleProject()
  const dictionary = projectDictionaries(project).find((d) => d.kind === 'retrieve')!
  const cs = emptyCodeSystem(dictionary)
  const add = (
    code: string,
    display: string,
    retrieval: NonNullable<Project['codeSystems'][string]['concepts'][string]['retrieval']>,
  ) => {
    cs.concepts[code] = { system: cs.url, code, display, designations: [], retrieval }
    cs.conceptOrder.push(code)
  }
  add('#age_months', 'Age in months', { context: 'patient', function: 'AgeInMonths' })
  add('#prev_weight', 'Weight in the last 30 days', {
    context: 'history',
    reads: { system: DEFAULT, code: 'weight' },
    period: 'P30D',
  })
  add('#hiv_status', 'Known HIV status', {
    context: 'custom',
    reads: { system: DEFAULT, code: 'weight' },
    expressions: [
      { language: 'text/cql', expression: 'Latest({{code}}, {{period}})' },
      { language: 'text/x-xlsform', expression: "pulldata('hiv', 'status')" },
    ],
  })
  project.codeSystems[cs.url] = cs
  project.retrieveCodeSystem = cs.url
  const activity = project.activities['triage-danger-signs']!
  activity.nodes['n-score']!.calculate = { expression: '"#prev_weight" + "#age_months"' }
  return project
}

function populate(extra: Partial<TriccNode> = {}): TriccNode {
  return { id: 'n-prev', type: 'populate', name: 'prev_weight', context: 'history', ...extra }
}

describe('retrieval dictionary', () => {
  it('is found by its role tag, its tricc.yaml name, then by the default id', () => {
    const project = withRetrievals()
    expect(retrieveCodeSystem(project)?.url).toBe(RETRIEVE)
    delete project.retrieveCodeSystem
    expect(retrieveCodeSystem(project)?.url).toBe(RETRIEVE)
    delete project.codeSystems[RETRIEVE]!.meta
    expect(retrieveCodeSystem(project)?.url).toBe(RETRIEVE)
  })

  it('is never the default dictionary, even when it is the only one', () => {
    const project = withRetrievals()
    delete project.codeSystems[DEFAULT]
    delete project.defaultCodeSystem
    expect(defaultCodeSystem(project)).toBeUndefined()
    expect(projectDictionaries(project).map((d) => [d.kind, Boolean(d.codeSystem)])).toEqual([
      ['default', false],
      ['calculate', false],
      ['retrieve', true],
    ])
  })

  it('writes context, function, reads, period and expressions as FHIR and reads them back', () => {
    const project = withRetrievals()
    const json = encodeCodeSystem(project.codeSystems[RETRIEVE]!) as {
      meta: { tag: unknown[] }
      concept: Record<string, unknown>[]
    }
    expect(json.meta.tag).toContainEqual({
      system: 'http://tricc.org/fhir/CodeSystem/codesystem-role',
      code: 'retrieve',
    })
    expect(json.concept[1]).toMatchObject({
      code: '#prev_weight',
      property: [
        { code: 'context', valueCode: 'history' },
        { code: 'reads', valueCoding: { system: DEFAULT, code: 'weight' } },
        { code: 'period', valueString: 'P30D' },
      ],
    })
    expect(json.concept[2]!['extension']).toEqual([
      {
        url: 'http://tricc.org/fhir/StructureDefinition/retrieve-expression',
        valueExpression: { language: 'text/cql', expression: 'Latest({{code}}, {{period}})' },
      },
      {
        url: 'http://tricc.org/fhir/StructureDefinition/retrieve-expression',
        valueExpression: { language: 'text/x-xlsform', expression: "pulldata('hiv', 'status')" },
      },
    ])

    const files = writeProject(project)
    expect(String(files['tricc.yaml'])).toContain(`retrieve_code_system: ${RETRIEVE}`)
    const back = readProject(files).project
    expect(back.retrieveCodeSystem).toBe(RETRIEVE)
    expect(back.codeSystems[RETRIEVE]!.concepts).toEqual(project.codeSystems[RETRIEVE]!.concepts)
    expect(writeProject(back)).toEqual(files)
  })

  it('survives the shared document', () => {
    const project = withRetrievals()
    const back = ProjectDocument.fromProject(project).snapshot()
    expect(back.codeSystems[RETRIEVE]!.concepts['#hiv_status']!.retrieval).toEqual(
      project.codeSystems[RETRIEVE]!.concepts['#hiv_status']!.retrieval,
    )
    expect(back.retrieveCodeSystem).toBe(RETRIEVE)
  })
})

describe('retrieval references', () => {
  it('finds quoted #codes once each', () => {
    expect(retrievalRefs('"#a" + "#b" > "#a" and "weight" > 2')).toEqual(['#a', '#b'])
    expect(retrievalRefs(undefined)).toEqual([])
  })

  it('lists where a retrieval is used and what an intervention loads', () => {
    const project = withRetrievals()
    expect(retrievalUsage(project, '#prev_weight')).toEqual([
      expect.objectContaining({
        activityId: 'triage-danger-signs',
        nodeId: 'n-score',
        field: 'calculate',
      }),
    ])
    expect(retrievalsForIntervention(project, 'sick-child')).toEqual([
      '#age_months',
      '#prev_weight',
    ])
  })

  it('makes a code from a name', () => {
    expect(retrievalCodeFor('Prev weight')).toBe('#prev_weight')
    expect(retrievalCodeFor('30d')).toBe('#r_30d')
  })

  it('checks ISO-8601 periods', () => {
    expect(['P30D', 'P6M', 'P1Y2M', 'PT12H', 'P2W'].every(isIsoPeriod)).toBe(true)
    expect(['30D', 'P', 'PT', '30 days', 'P1.5D'].some(isIsoPeriod)).toBe(false)
  })
})

describe('retrieval validation', () => {
  const rules = (project: Project) =>
    validateProject(project).filter((i) => i.rule.startsWith('retrieval.'))

  it('accepts a well-formed dictionary and reports the unused entry', () => {
    expect(
      rules(withRetrievals()).map((i) => [i.rule, i.severity, i.location.conceptCode]),
    ).toEqual([['retrieval.unused', 'info', '#hiv_status']])
  })

  it('reports unknown references, bad codes, functions, sources and periods', () => {
    const project = withRetrievals()
    const cs = project.codeSystems[RETRIEVE]!
    project.activities['triage-danger-signs']!.nodes['n-score']!.calculate = {
      expression: '"#prev_weight" + "#age_months" + "#nope" + "#hiv_status"',
    }
    cs.concepts['#age_months']!.retrieval = { context: 'facility', function: 'AgeInMonths' }
    cs.concepts['#prev_weight']!.retrieval = { context: 'history', period: '30 days' }
    cs.concepts['#hiv_status']!.retrieval = {
      context: 'custom',
      reads: { system: DEFAULT, code: 'gone' },
    }
    const found = rules(project).map((i) => [i.rule, i.location.conceptCode ?? i.location.nodeId])
    expect(found).toEqual(
      expect.arrayContaining([
        ['retrieval.unknown', 'n-score'],
        ['retrieval.function', '#age_months'],
        ['retrieval.reads-missing', '#prev_weight'],
        ['retrieval.period', '#prev_weight'],
        ['retrieval.custom-expression', '#hiv_status'],
        ['retrieval.reads-unknown', '#hiv_status'],
      ]),
    )
  })
})

describe('prefilled value source and period (fix #34)', () => {
  it('reads the source, else the concept named like the node', () => {
    const project = sampleProject()
    expect(populateSourceKey(project, populate({ name: 'weight' }))).toEqual({
      system: DEFAULT,
      code: 'weight',
    })
    expect(populateSourceKey(project, populate({ source: 'weight' }))).toEqual({
      system: DEFAULT,
      code: 'weight',
    })
    expect(
      populateSourceKey(project, populate({ source: { system: 'tricc', code: 'weight' } })),
    ).toEqual({
      system: DEFAULT,
      code: 'weight',
    })
  })

  it('round-trips source and period through the activity YAML', () => {
    const project = sampleProject()
    const activity = project.activities['triage-danger-signs']!
    activity.nodes['n-prev'] = populate({ source: 'weight', period: 'P30D' })
    activity.nodeOrder.push('n-prev')
    const back = readProject(writeProject(project)).project
    expect(back.activities['triage-danger-signs']!.nodes['n-prev']).toMatchObject({
      source: 'weight',
      period: 'P30D',
    })
  })

  it('warns on a period that is not ISO-8601 and on a source not in the dictionary', () => {
    const project = sampleProject()
    const activity = project.activities['triage-danger-signs']!
    activity.nodes['n-prev'] = populate({ source: 'nothing', period: '30 days' })
    activity.nodeOrder.push('n-prev')
    const found = validateProject(project)
      .filter((i) => i.rule.startsWith('populate.'))
      .map((i) => [i.rule, i.severity])
    expect(found).toEqual([
      ['populate.period', 'warning'],
      ['populate.source', 'warning'],
    ])
  })
})

describe('move to the retrieval dictionary', () => {
  function withPopulate(): Project {
    const project = sampleProject()
    const activity = project.activities['triage-danger-signs']!
    activity.nodes['n-prev'] = populate({
      source: 'weight',
      period: 'P30D',
      label: { en: 'Previous weight' },
    })
    activity.nodeOrder.splice(1, 0, 'n-prev')
    // start → prev → weight, instead of start → weight
    activity.edges['e1'] = { ...activity.edges['e1']!, target: 'n-prev' }
    activity.edges['e0'] = { id: 'e0', source: 'n-prev', target: 'n-weight' }
    activity.edgeOrder.push('e0')
    activity.nodes['n-score']!.calculate = { expression: '"convulsions" + "prev_weight"' }
    project.interventions[0]!.applicability = { expression: '"prev_weight" > 3' }
    return project
  }

  it('creates the entry, rewrites references, bridges the edges and removes the node', () => {
    const doc = ProjectDocument.fromProject(withPopulate())
    let code = ''
    doc.transact((tx) => {
      code = tx.moveToRetrieval('triage-danger-signs', 'n-prev')
    })
    const project = doc.snapshot()
    expect(code).toBe('#prev_weight')
    expect(project.retrieveCodeSystem).toBe(RETRIEVE)
    expect(project.codeSystems[RETRIEVE]!.concepts['#prev_weight']).toMatchObject({
      display: 'Previous weight',
      retrieval: { context: 'history', reads: { system: DEFAULT, code: 'weight' }, period: 'P30D' },
    })
    const activity = project.activities['triage-danger-signs']!
    expect(activity.nodes['n-prev']).toBeUndefined()
    expect(activity.nodes['n-score']!.calculate?.expression).toBe('"convulsions" + "#prev_weight"')
    expect(project.interventions[0]!.applicability?.expression).toBe('"#prev_weight" > 3')
    expect(
      Object.values(activity.edges).some((e) => e.source === 'n-start' && e.target === 'n-weight'),
    ).toBe(true)
    expect(validateProject(project).filter((i) => i.rule === 'retrieval.unknown')).toEqual([])
  })

  it('reuses an identical entry and numbers a different one', () => {
    const project = withPopulate()
    const doc = ProjectDocument.fromProject(project)
    doc.transact((tx) => tx.moveToRetrieval('triage-danger-signs', 'n-prev'))
    const again = doc.snapshot()
    const activity = again.activities['triage-danger-signs']!
    activity.nodes['n-prev'] = populate({ source: 'weight', period: 'P30D' })
    expect(planMoveToRetrieval(again, 'triage-danger-signs', 'n-prev')).toMatchObject({
      code: '#prev_weight',
    })
    expect(planMoveToRetrieval(again, 'triage-danger-signs', 'n-prev').concept).toBeUndefined()
    activity.nodes['n-prev'] = populate({ source: 'weight', period: 'P7D' })
    expect(planMoveToRetrieval(again, 'triage-danger-signs', 'n-prev').code).toBe('#prev_weight_2')
  })
})
