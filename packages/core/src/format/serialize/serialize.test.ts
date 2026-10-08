import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readProject, writeProject, writeChanged, createProject } from './index.js'
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
    expect(project.activities['weight']?.nodes['kg']?.label).toEqual({ en: 'Weight (kilograms)' })
    expect(project.interventions.map((i) => i.id)).toEqual(['child', 'young-infant'])
    expect(project.interventions[0]?.activities).toEqual([{ ref: 'weight' }])
    expect(project.interventions[1]?.activities).toEqual([{ ref: 'weight' }])
  })

  it('opens the migrated slice with each shared activity stored once', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '../../../../../examples/migrated')
    const files = readTree(root)
    expect(files['project.json']).toBeUndefined()
    const { project } = readProject(files)
    const usersOf = (id: string) =>
      project.interventions
        .filter((iv) => iv.activities.some((ref) => ref.ref === id))
        .map((iv) => iv.id)

    expect(usersOf('weight-measurement')).toEqual(['over-2-months', 'young-infant'])
    expect(usersOf('symptom-screening')).toEqual(['combacal-hypertension', 'combacal-diabetes'])
    expect(Object.keys(files).filter((p) => p.endsWith('weight-measurement.activity.yaml'))).toEqual([
      'activities/weight-measurement.activity.yaml',
    ])
    expect(Object.keys(files).filter((p) => p.endsWith('symptom-screening.activity.yaml'))).toEqual([
      'activities/symptom-screening.activity.yaml',
    ])
    expect(project.activities['etat-airway']).toBeDefined()
    expect(project.activities['combacal-simplify']).toBeDefined()
    expect(project.activities['yi-tests']).toBeDefined()
    const weight = Object.values(project.activities['weight-measurement']?.nodes ?? {}).find(
      (n) => n.name === 'CHE.B6.DE07',
    )
    expect(weight?.label).toEqual({ en: 'Weight (kilograms)' })
    const gate = Object.values(project.activities['weight-measurement']?.nodes ?? {}).find(
      (n) => n.label?.en === 'Exceed weight for YI',
    )
    expect(gate?.reference).toBe('"age_in_days" < 60 and "CHE.B6.DE07" > 9')
    expect(
      Object.values(project.activities['etat-airway']?.nodes ?? {}).some((n) => n.form_id),
    ).toBe(false)
    expect(
      Object.values(project.activities['combacal-simplify']?.nodes ?? {}).find((n) => n.form_id),
    ).toMatchObject({ type: 'start', form_id: 'questionaire' })
    expect(project.activities['urine-test']?.nodes['34']?.type).toBe('proposed_diagnosis')
    expect(project.interventions.every((iv) => iv.activities.length > 0)).toBe(true)

    const round = readProject(writeProject(readProject(files).project)).project
    expect(round).toEqual(project)
  })
})

function readTree(root: string): Record<string, string> {
  const files: Record<string, string> = {}
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else files[relative(root, full).split('\\').join('/')] = readFileSync(full, 'utf8')
    }
  }
  walk(root)
  return files
}

describe('incremental write', () => {
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
    const yaml = toYaml(encodeActivity(sampleActivity(), 'en', '1.0.0'))
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

  it('round-trips form_id on a process start and a continue_with ISO delay', () => {
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
    expect(back?.nodes['proc']?.form_id).toBe('questionaire')
    expect(back?.nodes['follow']).toMatchObject({
      type: 'continue_with',
      intervention: 'sick-child',
      condition: 'AgeInMonths() < 2',
      delay: 'P3D',
    })
    const yaml = toYaml(encodeActivity(activity, 'en', '1.0.0'))
    expect(yaml).toContain('form_id: questionaire')
    expect(yaml).not.toContain('form_id: ETAT')
    expect(yaml).not.toContain('formId')
  })

  it('reads the old formId spelling on a process start and drops form_id on an activity start', () => {
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
    expect(yaml).toContain('form_id: questionaire')
    expect(yaml).not.toContain('formId')
    expect(yaml).not.toContain('ETAT')
    expect(yaml).not.toContain('filter:')
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

describe('createProject', () => {
  it('produces an empty project that round-trips', () => {
    const p = createProject({ id: 'new-guideline', title: 'New guideline' })
    const { project } = readProject(writeProject(p))
    expect(project).toEqual(p)
    expect(project.title).toEqual({ en: 'New guideline' })
  })
})
