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
      'project.json',
      'terminology/tricc.codesystem.json',
    ])
  })

  it('rejects a directory with no project.json', () => {
    expect(() => readProject({ 'activities/x.activity.yaml': 'id: x\nnodes: []\n' })).toThrow(
      /missing project\.json/,
    )
  })
})

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
    const { removed } = writeChanged(project, previous)
    expect(removed).toEqual(['activities/hp-cough.activity.yaml'])
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

  it('a bare-string activity reference round-trips as a bare string', () => {
    const project = sampleProject()
    project.interventions[0]!.processes[0]!.activities = [{ ref: 'triage-danger-signs' }]
    const files = writeProject(project)
    expect(files['project.json']).toContain('"triage-danger-signs"')
    const { project: back } = readProject(files)
    expect(back.interventions[0]?.processes[0]?.activities).toEqual([
      { ref: 'triage-danger-signs' },
    ])
  })

  it('keeps per-reference applicability in object form', () => {
    const { project } = readProject(writeProject(sampleProject()))
    const acts = project.interventions[0]?.processes[1]?.activities
    expect(acts?.[0]).toEqual({ ref: 'hp-cough' })
    expect(acts?.[1]).toEqual({ ref: 'hp-diarrhoea', applicability: { expression: '"diarrhoea"' } })
  })
})

describe('deprecated fields', () => {
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
