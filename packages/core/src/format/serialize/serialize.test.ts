import { describe, expect, it } from 'vitest'
import {
  readProject,
  writeProject,
  writeChanged,
  createActivity,
  createProcessActivity,
  createProject,
} from './index.js'
import { sampleProject, sampleActivity } from '../__fixtures__.js'
import { decodeActivity, encodeActivity } from '../codec.js'
import { fromYaml, toYaml } from './yaml.js'
import type { Project } from '../../model/types.js'

describe('project round-trip', () => {
  it('write → read is identity', () => {
    const original = sampleProject()
    const { project } = readProject(writeProject(original))
    expect(project).toEqual(original)
  })

  it('is deterministic — the same project always writes the same bytes', () => {
    const a = writeProject(sampleProject())
    const b = writeProject(sampleProject())
    expect(a).toEqual(b)
  })

  it('does not depend on key insertion order in the source object', () => {
    const p1 = sampleProject()
    // Rebuild the activity map in reverse order; output must be unchanged.
    const p2 = sampleProject()
    p2.activities = Object.fromEntries(
      Object.entries(p2.activities).reverse(),
    ) as Project['activities']
    expect(writeProject(p2)).toEqual(writeProject(p1))
  })

  it('lays files out as specified', () => {
    const files = writeProject(sampleProject())
    expect(Object.keys(files).sort()).toEqual([
      'activities/hp-cough.activity.yaml',
      'activities/triage-danger-signs.activity.yaml',
      'cql/Shared.cql',
      'terminology/tricc.codesystem.json',
      'tricc.yaml',
    ])
    expect(files['project.json']).toBeUndefined()
  })

  it('rejects a directory with no tricc.yaml', () => {
    expect(() =>
      readProject({
        'project.json': '{"id":"old"}\n',
        'activities/x.activity.yaml': 'id: x\nnodes: []\n',
      }),
    ).toThrow(/missing tricc\.yaml/)
  })

  it('ignores project.json when tricc.yaml is present', () => {
    const files = writeProject(sampleProject())
    files['project.json'] = '{"title":{"en":"Ignore me"},"id":"other"}\n'
    const { project } = readProject(files)
    expect(project.id).toBe('smart-imci')
    expect(project.title).toEqual(sampleProject().title)
  })

  it('lists a shared activity once as a file and on every intervention that uses it', () => {
    const project = sampleProject()
    project.interventions.push({
      id: 'young-infant',
      title: { en: 'Young infant' },
      trigger: { mode: 'on-demand' },
      applicability: { expression: 'AgeInMonths() < 2' },
      activities: [{ ref: 'triage-danger-signs' }],
    })
    const files = writeProject(project)
    const yaml = files['tricc.yaml'] ?? ''
    const mentions = yaml.split('activities/triage-danger-signs.activity.yaml').length - 1
    expect(mentions).toBe(2)
    expect(Object.keys(files).filter((p) => p.endsWith('triage-danger-signs.activity.yaml'))).toEqual([
      'activities/triage-danger-signs.activity.yaml',
    ])
    const { project: back } = readProject(files)
    expect(Object.keys(back.activities).filter((id) => id === 'triage-danger-signs')).toEqual([
      'triage-danger-signs',
    ])
  })

  it('opens a tricc.yaml folder that has no project.json', () => {
    const files = {
      'tricc.yaml': [
        'title: Shared slice',
        'input_strategy: YamlStrategy',
        'interventions:',
        '  - id: child',
        '    title: Child',
        '    activity:',
        '      - activities/weight.activity.yaml',
        '    start:',
        '      on: demand',
        '      condition: "AgeInMonths() >= 2"',
        '  - id: young-infant',
        '    title: Young infant',
        '    activity:',
        '      - activities/weight.activity.yaml',
        '    start:',
        '      on: demand',
      ].join('\n'),
      'activities/weight.activity.yaml': [
        'id: weight',
        'title: Weight',
        'nodes:',
        '  - id: start',
        '    type: activity_start',
        '    name: weight',
        '    label: Weight',
        '  - id: kg',
        '    type: decimal',
        '    name: weight_kg',
        '    label: Weight (kilograms)',
      ].join('\n'),
    }
    const { project } = readProject(files)
    // The label moved to the concept the node is named after.
    expect(project.activities['weight']?.nodes['kg']).not.toHaveProperty('label')
    const concepts = Object.values(project.codeSystems)[0]?.concepts
    expect(concepts?.['weight_kg']?.display).toBe('Weight (kilograms)')
    expect(project.interventions.map((i) => i.id)).toEqual(['child', 'young-infant'])
    expect(project.interventions[0]?.activities).toEqual([{ ref: 'weight' }])
    expect(project.interventions[1]?.activities).toEqual([{ ref: 'weight' }])
  })


})


describe('incremental write', () => {
  it('reads a CodeSystem that tricc.yaml lists elsewhere, and writes it back there', () => {
    const files = writeProject(sampleProject())
    const canonical = Object.keys(files).find((p) => p.startsWith('terminology/'))!
    files['dd/demo_codesystem.json'] = files[canonical]!
    delete files[canonical]
    files['tricc.yaml'] = files['tricc.yaml']!.replace(canonical, 'dd/*.json')
    const { project } = readProject(files)
    const cs = Object.values(project.codeSystems)[0]!
    expect(cs.path).toBe('dd/demo_codesystem.json')
    const written = writeProject(project)
    expect(written['dd/demo_codesystem.json']).toBe(files['dd/demo_codesystem.json'])
    expect(written[canonical]).toBeUndefined()
    expect(written['tricc.yaml']).toContain('dd/demo_codesystem.json')
  })

  it('moves an activity file at another path to its canonical path on the next save', () => {
    const files = writeProject(sampleProject())
    const canonical = Object.keys(files).find((p) => p.startsWith('activities/'))!
    const odd = canonical.replace(/[^/]+$/, 'Renamed.yaml')
    files[odd] = files[canonical]!
    delete files[canonical]
    files['tricc.yaml'] = files['tricc.yaml']!.split(canonical).join(odd)
    const { project, migratedFrom } = readProject(files)
    expect(migratedFrom).toBe('activity-paths')
    const { changed, removed } = writeChanged(project, files)
    expect(removed).toContain(odd)
    expect(changed).toContain(canonical)
    expect(changed).toContain('tricc.yaml')
  })

  it('reports only the files that actually changed', () => {
    const project = sampleProject()
    const previous = writeProject(project)

    const edited = sampleProject()
    const act = edited.activities['triage-danger-signs']
    const weight = act?.nodes['n-weight']
    if (!weight) throw new Error('fixture drift')
    weight.label = { en: 'Body weight (kg)', fr: 'Poids (kg)' }

    const { changed, removed } = writeChanged(edited, previous)
    expect(changed).toEqual(['activities/triage-danger-signs.activity.yaml'])
    expect(removed).toEqual([])
  })

  it('reports removals', () => {
    const project = sampleProject()
    const previous = writeProject(project)
    delete project.activities['hp-cough']
    project.interventions[0]!.activities = project.interventions[0]!.activities.filter(
      (ref) => ref.ref !== 'hp-cough',
    )
    const { removed } = writeChanged(project, previous)
    expect(removed).toEqual(['activities/hp-cough.activity.yaml'])
  })

  it('does not delete a draw.io file when the saved project points at activity YAML', () => {
    const project = sampleProject()
    const previous = {
      ...writeProject(project),
      'visit.drawio': '<mxfile></mxfile>',
      'project.json': '{}',
      'README.md': 'leave me',
    }
    const { removed, files } = writeChanged(project, previous)
    expect(removed).toContain('project.json')
    expect(removed).not.toContain('visit.drawio')
    expect(removed).not.toContain('README.md')
    expect(files['visit.drawio']).toBeUndefined()
    expect(files['project.json']).toBeUndefined()
  })

  it('an unchanged project changes nothing', () => {
    const previous = writeProject(sampleProject())
    expect(writeChanged(sampleProject(), previous).changed).toEqual([])
  })
})

describe('ui carries no semantics', () => {
  /**
   * The guarantee that lets tricc_oo ignore `ui` entirely and lets the format tolerate
   * hand-editing — feature/20260825-project-format.md §3.2.
   */
  function stripUi(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stripUi)
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) {
        if (k === 'ui') continue
        out[k] = stripUi(v)
      }
      return out
    }
    return value
  }

  it('removing every ui block leaves an activity that still parses identically', () => {
    const encoded = encodeActivity(sampleActivity(), 'en', '1.0.0')
    const withUi = decodeActivity(encoded, 'en')
    const withoutUi = decodeActivity(stripUi(encoded), 'en')

    expect(stripUi(withUi)).toEqual(stripUi(withoutUi))
  })

  it('an activity with no ui at all still loads', () => {
    const bare = { id: 'a', nodes: [{ id: 'n', type: 'note' }] }
    const decoded = decodeActivity(bare, 'en')
    expect(decoded.nodes['n']?.ui).toBeUndefined()
    expect(decoded.nodeOrder).toEqual(['n'])
  })
})

describe('positions survive', () => {
  it('reopening reproduces node positions, viewport and edge waypoints exactly', () => {
    const original = sampleProject()
    const { project } = readProject(writeProject(original))
    const a = project.activities['triage-danger-signs']
    expect(a?.ui?.viewport).toEqual({ x: 0, y: 0, zoom: 1 })
    expect(a?.nodes['n-weight']?.ui).toEqual({ x: 40, y: 160, width: 200, height: 70 })
    expect(a?.edges['e1']?.ui?.waypoints).toEqual([{ x: 140, y: 120 }])
  })
})

describe('shorthands', () => {
  it('collapses single-default-language text to a bare string', () => {
    // Inline text is only written for an item with no code yet; the shorthand still applies.
    const activity = sampleActivity()
    activity.nodes['n-weight']!.label = { en: 'Weight (kg)', fr: 'Poids (kg)' }
    activity.nodes['n-weight']!.hint = { en: 'Use a calibrated scale' }
    const yaml = toYaml(encodeActivity(activity, 'en', '1.0.0'))
    // hint has only `en`, so it collapses; label has en+fr, so it stays a map.
    expect(yaml).toContain('hint: Use a calibrated scale')
    expect(yaml).toMatch(/label:\n\s+en: Weight \(kg\)\n\s+fr: Poids \(kg\)/)
  })

  it('accepts a bare string for localized text and expressions', () => {
    const a = decodeActivity(
      {
        id: 'a',
        title: 'Plain title',
        applicability: 'AgeInMonths() < 60',
        nodes: [{ id: 'n', type: 'note', label: 'Hello' }],
      },
      'en',
    )
    expect(a.title).toEqual({ en: 'Plain title' })
    expect(a.applicability).toEqual({ expression: 'AgeInMonths() < 60' })
    expect(a.nodes['n']?.label).toEqual({ en: 'Hello' })
  })

  it('an expression with intent but no CQL round-trips', () => {
    const a = decodeActivity(
      {
        id: 'a',
        nodes: [{ id: 'n', type: 'note', relevance: { intent: 'Only for infants' } }],
      },
      'en',
    )
    expect(a.nodes['n']?.relevance).toEqual({ intent: { en: 'Only for infants' } })
    const back = encodeActivity(a, 'en', '1.0.0') as { nodes: Record<string, unknown>[] }
    expect(back.nodes[0]).toMatchObject({ relevance: { intent: 'Only for infants' } })
  })

  it('keeps the activity list flat, with the same path on two interventions', () => {
    const project = sampleProject()
    const files = writeProject(project)
    expect(files['tricc.yaml']).toContain('activities/triage-danger-signs.activity.yaml')
    expect(files['tricc.yaml']).not.toContain('project.json')
    const { project: back } = readProject(files)
    expect(back.interventions[0]?.activities).toEqual([
      { ref: 'triage-danger-signs' },
      { ref: 'hp-cough' },
    ])
  })

  it('round-trips a continue_with ISO delay and never writes form_id', () => {
    const project = sampleProject()
    const activity = project.activities['triage-danger-signs']!
    activity.nodes['n-start']!.form_id = 'ETAT'
    activity.nodes['proc'] = {
      id: 'proc',
      type: 'start',
      name: 'registration',
      process: 'registration',
      form_id: 'questionaire',
    }
    activity.nodes['follow'] = {
      id: 'follow',
      type: 'continue_with',
      intervention: 'sick-child',
      condition: 'AgeInMonths() < 2',
      delay: 'P3D',
    }
    activity.nodeOrder.push('proc', 'follow')
    const back = readProject(writeProject(project)).project.activities['triage-danger-signs']
    expect(back?.nodes['n-start']?.form_id).toBeUndefined()
    expect(back?.nodes['proc']?.form_id).toBeUndefined()
    expect(back?.nodes['follow']).toMatchObject({
      type: 'continue_with',
      intervention: 'sick-child',
      condition: 'AgeInMonths() < 2',
      delay: 'P3D',
    })
    const yaml = toYaml(encodeActivity(activity, 'en', '1.0.0'))
    expect(yaml).not.toContain('form_id')
    expect(yaml).not.toContain('formId')
  })

  it('moves a legacy form_id to the name of an unnamed intervention, then drops it', () => {
    const project = sampleProject()
    project.interventions[0]!.name = undefined
    project.interventions.push({
      id: 'named',
      name: 'keep-me',
      trigger: { mode: 'on-demand' },
      activities: [...project.interventions[0]!.activities],
    })
    const files = writeProject(project)
    const listed = project.interventions[0]!.activities[0]!.ref
    const path = `activities/${listed}.activity.yaml`
    // Make the first listed activity a legacy process page that still carries form_id.
    files[path] = (files[path] ?? '').replace(/type: activity_start/, 'type: start').replace(
      /^nodes:/m,
      'form_id: questionaire\nnodes:',
    )
    const back = readProject(files).project
    expect(back.interventions.find((i) => i.id === 'sick-child')?.name).toBe('questionaire')
    expect(back.interventions.find((i) => i.id === 'named')?.name).toBe('keep-me')
    for (const node of Object.values(back.activities[listed]!.nodes)) {
      expect(node).not.toHaveProperty('form_id')
    }
  })

  it('writes activity name, CQL applicability and intent as separate keys', () => {
    const activity = decodeActivity(
      {
        id: 'w',
        name: 'weight_measurement',
        applicability: { intent: 'Children under five', expression: 'AgeInMonths() < 60' },
        nodes: [{ id: 's', type: 'activity_start' }],
      },
      'en',
    )
    expect(activity.name).toBe('weight_measurement')
    const yaml = toYaml(encodeActivity(activity, 'en', '1.0.0'))
    expect(yaml).toContain('name: weight_measurement')
    expect(yaml).toContain('applicability: AgeInMonths() < 60')
    expect(yaml).toContain('intent: Children under five')
    expect(decodeActivity(fromYaml(yaml), 'en').applicability).toEqual(activity.applicability)
  })

  it('reads the old formId spelling for migration and never writes it', () => {
    const activity = decodeActivity(
      {
        id: 'a',
        nodes: [
          { id: 's', type: 'start', name: 's', formId: 'questionaire' },
          { id: 'a1', type: 'activity_start', name: 'page', form_id: 'ETAT' },
        ],
      },
      'en',
    )
    expect(activity.nodes['s']?.form_id).toBe('questionaire')
    expect(activity.nodes['a1']?.form_id).toBeUndefined()
    const yaml = toYaml(encodeActivity(activity, 'en', '1.0.0'))
    expect(yaml).not.toContain('form_id')
    expect(yaml).not.toContain('formId')
    expect(yaml).not.toContain('ETAT')
    expect(yaml).not.toContain('filter:')
  })

  it('reads a select filter without keeping it', () => {
    const activity = decodeActivity(
      { id: 'a', nodes: [{ id: 'q', type: 'select_one', name: 'select_', filter: 'etat.coma.004' }] },
      'en',
    )
    expect(activity.nodes['q']).not.toHaveProperty('filter')
    expect(activity.nodes['q']?.name).toBe('select_')
    expect(toYaml(encodeActivity(activity, 'en', '1.0.0'))).not.toContain('filter')
  })

  it('writes the intervention name, never code, and reads the older code key', () => {
    const files = writeProject(sampleProject())
    const yaml = files['tricc.yaml'] ?? ''
    expect(yaml).toContain('name: sick-child')
    const interventions = yaml.slice(yaml.indexOf('\ninterventions:'))
    expect(interventions).not.toMatch(/^ +code:/m)
    files['tricc.yaml'] = yaml.replace('name: sick-child', 'code: sick-child')
    const { project } = readProject(files)
    expect(project.interventions[0]?.name).toBe('sick-child')
  })
})

describe('deprecated fields', () => {
  it('round-trips a quantity and its unit', () => {
    const activity = decodeActivity(
      {
        id: 'a',
        nodes: [
          {
            id: 'q',
            type: 'quantity',
            name: 'temperature',
            min: 35,
            max: 42,
            unit: 'C',
            unit_system: 'http://unitsofmeasure.org',
            unit_code: 'Cel',
          },
        ],
      },
      'en',
    )
    expect(activity.nodes['q']).toMatchObject({
      type: 'quantity',
      name: 'temperature',
      min: 35,
      max: 42,
      unit: 'C',
      unit_system: 'http://unitsofmeasure.org',
      unit_code: 'Cel',
    })
    const yaml = toYaml(encodeActivity(activity, 'en', '1.0.0'))
    const back = decodeActivity(fromYaml(yaml), 'en')
    expect(back.nodes['q']).toMatchObject({
      unit: 'C',
      unit_system: 'http://unitsofmeasure.org',
      unit_code: 'Cel',
      min: 35,
      max: 42,
    })
  })

  it('preserves save on round-trip without offering it', () => {
    const a = decodeActivity(
      { id: 'a', nodes: [{ id: 'n', type: 'integer', name: 'w', save: 'obs' }] },
      'en',
    )
    expect(a.nodes['n']?.save).toBe('obs')
    const yaml = toYaml(encodeActivity(a, 'en', '1.0.0'))
    expect(fromYaml(yaml)).toMatchObject({ nodes: [{ save: 'obs' }] })
  })
})

describe('the start node is the activity', () => {
  it('lifts label, name, process and relevance from the root, and never writes them back there', () => {
    const activity = decodeActivity(
      {
        id: 'nav',
        nodes: [
          {
            id: 'm',
            type: 'start',
            name: 'navigation',
            label: 'Navigation',
            process: 'registration',
            relevance: 'AgeInYears() >= 18',
          },
        ],
      },
      'en',
    )
    expect(activity).toMatchObject({
      name: 'navigation',
      title: { en: 'Navigation' },
      process: 'registration',
      applicability: { expression: 'AgeInYears() >= 18' },
    })
    expect(activity.nodes['m']).toEqual({ id: 'm', type: 'start' })
    const yaml = toYaml(encodeActivity(activity, 'en', '1.0.0'))
    expect(yaml).toContain('process: registration')
    expect(yaml).toMatch(/nodes:\n  - id: m\n    type: start\n/)
  })

  it('keeps the activity value when the root disagrees', () => {
    const activity = decodeActivity(
      { id: 'a', title: 'Activity title', nodes: [{ id: 's', type: 'activity_start', label: 'Old label' }] },
      'en',
    )
    expect(activity.title).toEqual({ en: 'Activity title' })
    expect(activity.nodes['s']).not.toHaveProperty('label')
  })

  it('creates activities whose root has no name of its own', () => {
    expect(createActivity({ id: 'cough', title: 'Cough' }).nodes['start']).toEqual({
      id: 'start',
      type: 'activity_start',
      ui: { x: 80, y: 40 },
    })
    const process = createProcessActivity({ id: 'triage-process', process: 'triage' })
    expect(process.process).toBe('triage')
    expect(process.nodes['start']).not.toHaveProperty('process')
    expect(process.nodes['start']).not.toHaveProperty('name')
  })
})

describe('comments on the diagram', () => {
  it('round-trip in the ui block, with what they are about', () => {
    const activity = decodeActivity(
      {
        id: 'a',
        ui: {
          comments: [
            { id: 'c1', text: 'Ask Dr N about this cut-off', color: 'blue', x: 10, y: 20, node: 'w' },
            { id: 'c2', text: 'Draft', x: 0, y: 0 },
          ],
        },
        nodes: [{ id: 'w', type: 'decimal', name: 'weight' }],
      },
      'en',
    )
    expect(activity.ui?.comments?.[1]?.color).toBe('yellow')
    const back = decodeActivity(fromYaml(toYaml(encodeActivity(activity, 'en', '1.0.0'))), 'en')
    expect(back.ui).toEqual(activity.ui)
  })
})

describe('page groups', () => {
  it('write groups and membership for tricc_oo, with the layout under ui', () => {
    const activity = decodeActivity(
      {
        id: 'a',
        groups: [{ id: 'g', name: 'danger_signs', ui: { x: 10, y: 20, width: 300, height: 200, color: 'pink' } }],
        nodes: [{ id: 'q', type: 'select_yesno', name: 'convulsions', group: 'g', ui: { x: 5, y: 6 } }],
      },
      'en',
    )
    expect(activity.groups?.[0]).toEqual({ id: 'g', name: 'danger_signs', color: 'pink', x: 10, y: 20, width: 300, height: 200 })
    const yaml = toYaml(encodeActivity(activity, 'en', '1.0.0'))
    expect(yaml).toContain('group: g')
    expect(decodeActivity(fromYaml(yaml), 'en')).toEqual(activity)
  })

  it('moves a group title into the concept its name stands for', () => {
    const files = writeProject(sampleProject())
    const path = 'activities/triage-danger-signs.activity.yaml'
    files[path] = files[path]!.replace(/^nodes:/m, 'groups:\n  - id: g\n    name: danger_signs\n    label: Danger signs\nnodes:')
    const { project } = readProject(files)
    expect(project.activities['triage-danger-signs']!.groups?.[0]).not.toHaveProperty('label')
    expect(Object.values(project.codeSystems)[0]!.concepts['danger_signs']?.display).toBe('Danger signs')
  })
})

describe('createProject', () => {
  it('produces an empty project that round-trips', () => {
    const p = createProject({ id: 'new-guideline', title: 'New guideline' })
    const { project } = readProject(writeProject(p))
    expect(project).toEqual(p)
    expect(project.title).toEqual({ en: 'New guideline' })
  })
})
