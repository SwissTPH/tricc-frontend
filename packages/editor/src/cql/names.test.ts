import { describe, expect, it } from 'vitest'
import { createProject } from '@tricc/core'
import { expressionNames, renderCqlLabels, truncateLabel } from './names.js'

describe('expressionNames', () => {
  it('uses a question label, and a concept display when one is bound', () => {
    const project = createProject({ id: 'p', title: 'P' })
    project.activities.visit = {
      id: 'visit',
      title: { en: 'Visit' },
      nodeOrder: ['w'],
      edgeOrder: [],
      nodes: {
        w: {
          id: 'w',
          type: 'decimal',
          name: 'CHE.B6.DE07',
          label: { en: 'Weight (kilograms)' },
          ui: { x: 0, y: 0 },
        },
      },
      edges: {},
    }
    const names = expressionNames(project, 'en', 'visit')
    expect(names.get('CHE.B6.DE07')?.label).toBe('Weight (kilograms)')

    project.codeSystems['http://who.example/dak'] = {
      id: 'dak',
      url: 'http://who.example/dak',
      title: 'DAK',
      status: 'active',
      content: 'fragment',
      concepts: {
        'CHE.B6.DE07': {
          system: 'http://who.example/dak',
          code: 'CHE.B6.DE07',
          display: 'Body weight',
          definition: 'Measured weight.',
          designations: { en: 'Body weight' },
        },
      },
      conceptOrder: ['CHE.B6.DE07'],
    }
    project.activities.visit.nodes.w!.concept = {
      system: 'http://who.example/dak',
      code: 'CHE.B6.DE07',
    }
    const bound = expressionNames(project, 'en', 'visit')
    expect(bound.get('CHE.B6.DE07')?.label).toBe('Body weight')
    expect(bound.get('CHE.B6.DE07')?.definition).toBe('Measured weight.')
    expect(bound.get('CHE.B6.DE07')?.nodeId).toBe('w')
  })

  it('resolves a select by its filter code and prefers the open activity', () => {
    const project = createProject({ id: 'p', title: 'P' })
    project.activities.other = {
      id: 'other',
      title: { en: 'Other' },
      nodeOrder: ['a'],
      edgeOrder: [],
      nodes: {
        a: {
          id: 'a',
          type: 'select_one',
          name: 'select_',
          filter: 'etat.coma.004',
          label: { en: 'Other coma' },
          ui: { x: 0, y: 0 },
        },
      },
      edges: {},
    }
    project.activities.etat = {
      id: 'etat',
      title: { en: 'ETAT' },
      nodeOrder: ['b'],
      edgeOrder: [],
      nodes: {
        b: {
          id: 'b',
          type: 'select_one',
          name: 'select_',
          filter: 'etat.coma.004',
          label: { en: 'Coma scale' },
          ui: { x: 0, y: 0 },
        },
      },
      edges: {},
    }
    const names = expressionNames(project, 'en', 'etat')
    expect(names.get('etat.coma.004')?.label).toBe('Coma scale')
    expect(names.get('etat.coma.004')?.nodeId).toBe('b')
    expect(names.get('select_')?.activityId).toBe('etat')
  })

  it('rewrites a fragment for display and leaves a long label cut at 50 characters', () => {
    const project = createProject({ id: 'p', title: 'P' })
    const long = 'Weight for age z-score used when a dose is calculated for this infant'
    project.activities.visit = {
      id: 'visit',
      title: { en: 'Visit' },
      nodeOrder: ['w'],
      edgeOrder: [],
      nodes: {
        w: {
          id: 'w',
          type: 'decimal',
          name: 'CHE.B6.DE07',
          label: { en: long },
          ui: { x: 0, y: 0 },
        },
      },
      edges: {},
    }
    const names = expressionNames(project, 'en')
    const shown = renderCqlLabels('"age_in_days" < 60 and "CHE.B6.DE07" > 9', names)
    expect(shown.startsWith('age_in_days < 60 and ')).toBe(true)
    expect(shown).toContain(truncateLabel(long))
    expect(shown).not.toContain('CHE.B6.DE07')
    expect(truncateLabel(long)).toHaveLength(50)
  })
})
