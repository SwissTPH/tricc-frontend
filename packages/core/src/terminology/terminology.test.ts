import { activitiesFromDrawio } from '../format/drawio.js'
import { withDesignationText } from '../text/designation.js'
import { fromHtml } from '../text/parse.js'
import { fromPlain } from '../text/render.js'
import { createProject, readProject, writeProject } from '../format/serialize/index.js'
import { moveTextsToConcepts } from './texts-to-concepts.js'
import { validateActivity } from '../validate/activity.js'
import { decodeCodeSystem, encodeCodeSystem } from '../format/codec.js'
import {
  conceptRichText,
  conceptText,
  designationInterventions,
  designationRepeats,
  isUnscoped,
  repeatScopeExtension,
  scopeExtension,
  withConceptText,
} from './designation.js'
import { validateProject } from '../validate/project.js'
import { conceptUsage, nodeConceptKey } from './usage.js'
import { describe, expect, it } from 'vitest'
import { ConceptIndex } from './index-search.js'
import { sampleProject } from '../format/__fixtures__.js'
import type { CodeSystem, Concept, Project } from '../model/types.js'

function cs(concepts: Concept[]): Record<string, CodeSystem> {
  return {
    'http://x': {
      id: 'x',
      url: 'http://x',
      status: 'draft',
      content: 'complete',
      concepts: Object.fromEntries(concepts.map((c) => [c.code, c])),
      conceptOrder: concepts.map((c) => c.code),
    },
  }
}

function concept(code: string, display: string, extra: Partial<Concept> = {}): Concept {
  return { system: 'http://x', code, display, designations: [], ...extra }
}

describe('concept search ranking', () => {
  const index = new ConceptIndex(
    cs([
      concept('fever', 'Fever'),
      concept('fever_duration', 'Fever duration in days', { dataType: 'integer' }),
      concept('high_fever', 'High fever'),
      concept('temp', 'Body temperature', {
        designations: [{ language: 'fr', value: 'Temperature corporelle' }],
      }),
      concept('malaria', 'Malaria', { definition: 'Diagnosed after a fever and a positive test' }),
    ]),
  )

  it('ranks exact code first', () => {
    expect(index.search('fever')[0]?.concept.code).toBe('fever')
  })

  it('ranks exact display above a prefix match', () => {
    const codes = index.search('high fever').map((m) => m.concept.code)
    expect(codes[0]).toBe('high_fever')
  })

  it('ranks a code prefix above a display substring', () => {
    const codes = index.search('fever_').map((m) => m.concept.code)
    expect(codes[0]).toBe('fever_duration')
  })

  it('finds by designation in another language', () => {
    const m = index.search('corporelle')
    expect(m[0]?.concept.code).toBe('temp')
    expect(m[0]?.matchedOn).toBe('designation')
  })

  it('finds by definition, ranked last', () => {
    const m = index.search('positive test')
    expect(m[0]?.concept.code).toBe('malaria')
    expect(m[0]?.matchedOn).toBe('definition')
  })

  it('is case-insensitive', () => {
    expect(index.search('FEVER')[0]?.concept.code).toBe('fever')
  })

  it('returns nothing for an unmatched query', () => {
    expect(index.search('zzzz')).toEqual([])
  })

  it('is deterministic — the same query never reshuffles', () => {
    expect(index.search('fever').map((m) => m.concept.code)).toEqual(
      index.search('fever').map((m) => m.concept.code),
    )
  })

  it('filters by data type', () => {
    const m = index.search('fever', { dataType: 'integer' })
    expect(m.map((x) => x.concept.code)).toEqual(['fever_duration'])
  })

  it('honours the limit', () => {
    expect(index.search('fever', { limit: 1 })).toHaveLength(1)
  })

  it('an empty query lists concepts rather than nothing', () => {
    expect(index.search('', { limit: 3 })).toHaveLength(3)
  })
})

describe('index maintenance', () => {
  it('builds from a project', () => {
    const index = ConceptIndex.fromProject(sampleProject())
    expect(index.size).toBe(4)
    expect(index.lookup('http://tricc.org/CodeSystem/tricc', 'weight')?.display).toBe('Weight')
  })

  it('upserts without duplicating', () => {
    const index = new ConceptIndex(cs([concept('a', 'Alpha')]))
    index.upsert(concept('a', 'Alpha renamed'))
    expect(index.size).toBe(1)
    expect(index.search('Alpha renamed')[0]?.concept.display).toBe('Alpha renamed')
  })

  it('adds a new concept on upsert', () => {
    const index = new ConceptIndex(cs([concept('a', 'Alpha')]))
    index.upsert(concept('b', 'Beta'))
    expect(index.size).toBe(2)
  })

  it('removes', () => {
    const index = new ConceptIndex(cs([concept('a', 'Alpha'), concept('b', 'Beta')]))
    index.remove('http://x', 'a')
    expect(index.size).toBe(1)
    expect(index.lookup('http://x', 'a')).toBeUndefined()
  })
})

describe('search performance', () => {
  it('stays well under budget at 50 000 concepts', () => {
    const many: Concept[] = []
    for (let i = 0; i < 50_000; i++) {
      many.push(concept(`c_${i}`, `Concept number ${i}`))
    }
    const index = new ConceptIndex(cs(many))
    const start = performance.now()
    for (let i = 0; i < 10; i++) index.search('number 4999')
    const perSearch = (performance.now() - start) / 10
    // Budget is 20 ms; assert with headroom so this is a regression alarm, not a flake.
    expect(perSearch).toBeLessThan(60)
  })
})

describe('designations keep their use', () => {
  // The concept tricc_oo's tests use (tests/test_yaml_concept_texts.py).
  const age = {
    resourceType: 'CodeSystem',
    id: 'demo',
    url: 'http://example.org/CodeSystem/demo',
    status: 'draft',
    content: 'complete',
    concept: [
      {
        id: '3e3a5531-1cbe-575f-9d61-4c7c1f42b50b',
        code: 'age',
        display: 'Age (years)',
        designation: [
          {
            language: 'en',
            use: { system: 'https://tricc.org/CodeSystem/designation-use', code: 'hint' },
            value: 'Completed years',
          },
          {
            language: 'fr',
            use: {
              system: 'http://terminology.hl7.org/CodeSystem/designation-usage',
              code: 'display',
            },
            value: 'Âge (années)',
          },
          { language: 'fr', value: 'Âge' },
        ],
        property: [{ code: 'dataType', valueString: 'integer' }],
      },
    ],
  }

  it('round-trips a tricc_oo CodeSystem unchanged: use, id, and valueString', () => {
    const cs = decodeCodeSystem(structuredClone(age))
    expect(cs.concepts['age']?.designations).toHaveLength(3)
    expect(JSON.stringify(encodeCodeSystem(cs))).toBe(JSON.stringify(age))
  })

  it('resolves text by use and language, as tricc_oo concept_text does', () => {
    const concept = decodeCodeSystem(structuredClone(age)).concepts['age']
    expect(conceptText(concept, 'display', 'en', 'en')).toBe('Age (years)')
    expect(conceptText(concept, 'display', 'fr', 'en')).toBe('Âge (années)')
    expect(conceptText(concept, 'hint', 'en', 'en')).toBe('Completed years')
    expect(conceptText(concept, 'help', 'en', 'en')).toBeUndefined()
    // Questionnaire text falls back to the display.
    expect(conceptText(concept, 'q-display', 'fr', 'en')).toBe('Âge (années)')
  })
})

describe('concept usage and texts', () => {
  it('finds a concept used by name in the default CodeSystem, and by an explicit concept', () => {
    const project = sampleProject()
    const cs = Object.values(project.codeSystems)[0]!
    project.defaultCodeSystem = cs.url
    const code = cs.conceptOrder[0]!
    const activity = Object.values(project.activities)[0]!
    activity.nodes['by-name'] = { id: 'by-name', type: 'decimal', name: code }
    activity.nodeOrder.push('by-name')
    const uses = conceptUsage(project, { system: cs.url, code })
    expect(uses.some((u) => u.nodeId === 'by-name')).toBe(true)
    expect(nodeConceptKey(project, activity.nodes['by-name']!)).toEqual({ system: cs.url, code })
  })

  it('sets and clears one text by use and language', () => {
    const base: Concept = { system: 'http://x', code: 'age', display: 'Age', designations: [] }
    const withHint = withConceptText(base, 'hint', 'en', 'Completed years')
    expect(conceptText(withHint, 'hint', 'en')).toBe('Completed years')
    const renamed = withConceptText(withHint, 'display', 'en', 'Age (years)')
    expect(renamed.display).toBe('Age (years)')
    const q = withConceptText(renamed, 'q-display', 'en', 'How old is the child, in years?')
    expect(conceptText(q, 'q-display', 'en')).toBe('How old is the child, in years?')
    expect(conceptText(withConceptText(q, 'q-display', 'en', undefined), 'q-display', 'en')).toBe(
      'Age (years)',
    )
    expect(base.designations).toHaveLength(0)
  })
})

describe('texts move from the activity to the concept', () => {
  function inline(): Project {
    const project = createProject({ id: 'demo', title: 'Demo' })
    project.languages = { default: 'en', available: ['en', 'fr'] }
    project.activities['a'] = {
      id: 'a',
      nodeOrder: ['s', 'cough', 'cough2', 'anon', 'calc'],
      edgeOrder: [],
      edges: {},
      nodes: {
        s: { id: 's', type: 'activity_start' },
        cough: {
          id: 'cough',
          type: 'select_one',
          name: 'cough',
          label: { en: 'Cough', fr: 'Toux' },
          hint: { en: 'Ask the caregiver' },
          options: [
            { id: 'o1', name: 'yes', label: { en: 'Yes' } },
            { id: 'o2', name: 'no', label: { en: 'No' } },
          ],
        },
        // Same concept, longer wording: becomes the questionnaire text.
        cough2: {
          id: 'cough2',
          type: 'select_yesno',
          name: 'cough',
          label: { en: 'Does the child cough?' },
        },
        anon: { id: 'anon', type: 'note', label: { en: 'No name yet' } },
        calc: { id: 'calc', type: 'calculate', name: 'score', label: { en: 'Score' } },
      },
    }
    return project
  }

  it('creates the default CodeSystem and concepts named by the nodes and answers', () => {
    const project = inline()
    const result = moveTextsToConcepts(project)
    const cs = result.createdCodeSystem!
    expect(project.defaultCodeSystem).toBe(cs.url)
    const cough = cs.concepts['cough']!
    expect(cough.display).toBe('Cough')
    expect(conceptText(cough, 'display', 'fr', 'en')).toBe('Toux')
    expect(conceptText(cough, 'hint', 'en', 'en')).toBe('Ask the caregiver')
    expect(conceptText(cough, 'q-display', 'en', 'en')).toBe('Does the child cough?')
    expect(cs.concepts['yes']?.display).toBe('Yes')
    const nodes = project.activities['a']!.nodes
    expect(nodes['cough']).not.toHaveProperty('label')
    expect(nodes['cough']).not.toHaveProperty('hint')
    expect(nodes['cough']!.options![0]).not.toHaveProperty('label')
  })

  it('gives each item named like label_ its own concept, named with its id', () => {
    const project = inline()
    const nodes = project.activities['a']!.nodes
    nodes['n1'] = { id: 'n1', type: 'note', name: 'label_', label: { en: 'Give 1 tablet' } }
    nodes['x:2'] = { id: 'x:2', type: 'note', name: 'label_', label: { en: 'Give 2 tablets' } }
    project.activities['a']!.nodeOrder.push('n1', 'x:2')
    moveTextsToConcepts(project)
    const cs = Object.values(project.codeSystems)[0]!
    expect(nodes['n1']!.name).toBe('label_n1')
    expect(nodes['x:2']!.name).toBe('label_x_2')
    expect(cs.concepts['label_n1']?.display).toBe('Give 1 tablet')
    expect(cs.concepts['label_x_2']?.display).toBe('Give 2 tablets')
    expect(cs.concepts['label_']).toBeUndefined()
    // Marked so they can be found and reviewed; the property survives a save.
    expect(cs.concepts['label_n1']?.fuzzy).toBe(true)
    expect(cs.concepts['cough']?.fuzzy).toBeUndefined()
    const saved = encodeCodeSystem(cs) as { concept: { code: string; property?: unknown[] }[] }
    expect(saved.concept.find((c) => c.code === 'label_n1')?.property).toContainEqual({
      code: 'fuzzy',
      valueBoolean: true,
    })
    expect(decodeCodeSystem(saved).concepts['label_n1']?.fuzzy).toBe(true)
    // A second pass keeps the names it gave.
    moveTextsToConcepts(project)
    expect(nodes['n1']!.name).toBe('label_n1')
  })

  it('keeps the text of an item with no code, and leaves logic nodes alone', () => {
    const project = inline()
    moveTextsToConcepts(project)
    const nodes = project.activities['a']!.nodes
    expect(nodes['anon']?.label).toEqual({ en: 'No name yet' })
    expect(nodes['calc']?.label).toEqual({ en: 'Score' })
  })

  it('keeps the concept text when the inline text disagrees, and reports it', () => {
    const project = inline()
    moveTextsToConcepts(project)
    const cs = Object.values(project.codeSystems)[0]!
    project.activities['a']!.nodes['cough']!.hint = { en: 'Something else' }
    const result = moveTextsToConcepts(project)
    expect(conceptText(cs.concepts['cough'], 'hint', 'en', 'en')).toBe('Ask the caregiver')
    expect(result.dropped).toEqual([{ activityId: 'a', nodeId: 'cough', text: 'Something else' }])
  })

  it('opens an older project as a migration, and saves activity files with codes only', () => {
    const files = writeProject(inline())
    expect(files['activities/a.activity.yaml']).toContain('label:')
    const read = readProject(files)
    expect(read.migratedFrom).toBe('concept-texts')
    const saved = writeProject(read.project)
    for (const text of ['Cough', 'Yes', 'No', 'Does the child cough?', 'Ask the caregiver']) {
      expect(saved['activities/a.activity.yaml']).not.toMatch(
        new RegExp(`: ${text.replace('?', '\\?')}$`, 'm'),
      )
    }
    expect(saved['activities/a.activity.yaml']).toContain('No name yet')
    const terminology = Object.keys(saved).find((p) => p.startsWith('terminology/'))!
    expect(saved[terminology]).toContain('Does the child cough?')
    expect(readProject(saved).migratedFrom).toBeUndefined()
  })

  it('flags a named question with no concept', () => {
    const project = inline()
    moveTextsToConcepts(project)
    const a = project.activities['a']!
    a.nodes['new'] = { id: 'new', type: 'integer', name: 'age_years' }
    a.nodeOrder.push('new')
    const rules = validateActivity(a, project).filter((i) => i.rule === 'node.missing-concept')
    expect(rules.map((i) => i.location.nodeId)).toEqual(['new'])
  })
})

describe('questionnaire text per intervention', () => {
  const q = { system: 'https://tricc.org/CodeSystem/designation-use', code: 'q-display' }
  const weight: Concept = {
    system: 'http://x',
    code: 'weight',
    display: 'Weight (kg)',
    designations: [
      { language: 'en', use: q, value: 'Weigh the child on the scale' },
      {
        language: 'en',
        use: q,
        value: 'Weigh the child',
        extension: scopeExtension(['community']),
      },
    ],
  }

  it('prefers the text scoped to the intervention, and never leaks it elsewhere', () => {
    expect(conceptText(weight, 'q-display', 'en', 'en', { interventionId: 'community' })).toBe(
      'Weigh the child',
    )
    expect(conceptText(weight, 'q-display', 'en', 'en', { interventionId: 'facility' })).toBe(
      'Weigh the child on the scale',
    )
    expect(conceptText(weight, 'q-display', 'en', 'en')).toBe('Weigh the child on the scale')
    expect(designationInterventions(weight.designations[1]!)).toEqual(['community'])
  })

  it('flags a scope naming no intervention, and two texts for the same use, language and scope', () => {
    const project = createProject({ id: 'p', title: 'P' })
    project.codeSystems['http://x'] = {
      id: 'x',
      url: 'http://x',
      status: 'draft',
      content: 'complete',
      concepts: {
        weight: {
          ...weight,
          dataType: 'decimal',
          designations: [...weight.designations, { language: 'en', use: q, value: 'Again' }],
        },
      },
      conceptOrder: ['weight'],
    }
    const rules = validateProject(project).map((i) => i.rule)
    expect(rules).toContain('concept.unknown-intervention')
    expect(rules).toContain('concept.duplicate-designation')
  })

  it('gives a new concept the data type its question captures', () => {
    const project = createProject({ id: 'p', title: 'P' })
    project.activities['a'] = {
      id: 'a',
      nodeOrder: ['s', 'w', 'f'],
      edgeOrder: [],
      edges: {},
      nodes: {
        s: { id: 's', type: 'activity_start' },
        w: { id: 'w', type: 'decimal', name: 'weight', label: { en: 'Weight' } },
        f: { id: 'f', type: 'select_yesno', name: 'fever', label: { en: 'Fever?' } },
      },
    }
    const cs = moveTextsToConcepts(project).createdCodeSystem!
    expect(cs.concepts['weight']?.dataType).toBe('decimal')
    expect(cs.concepts['fever']?.dataType).toBe('boolean')
  })
})

describe('formatted texts', () => {
  it('keeps a draw.io label formatting on the concept questionnaire text', () => {
    const xml =
      '<mxfile><diagram id="p" name="Dose"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
      '<object id="s" label="Dose" odk_type="activity_start"><mxCell vertex="1" parent="1"><mxGeometry as="geometry"/></mxCell></object>' +
      '<object id="n" label="&lt;b&gt;Give ${dose} mg&lt;/b&gt;" odk_type="note" name="give_dose"><mxCell vertex="1" parent="1"><mxGeometry as="geometry"/></mxCell></object>' +
      '<object id="d" label="Dose" odk_type="decimal" name="dose"><mxCell vertex="1" parent="1"><mxGeometry as="geometry"/></mxCell></object>' +
      '</root></mxGraphModel></diagram></mxfile>'
    const project = createProject({ id: 'p', title: 'P' })
    for (const a of activitiesFromDrawio(xml, new Set())) project.activities[a.id] = a
    moveTextsToConcepts(project)
    const concept = Object.values(project.codeSystems)[0]!.concepts['give_dose']!
    expect(concept.display).toBe('Give ${dose} mg')
    expect(conceptRichText(concept, 'q-display', 'en')).toEqual(fromHtml('<b>Give ${dose} mg</b>'))
    expect(concept.designations[0]?.value).toBe('**Give ${dose} mg**')
    expect(project.activities['dose']!.nodes['n']).not.toHaveProperty('labelDoc')
    expect(validateProject(project).filter((i) => i.rule === 'text.unknown-reference')).toEqual([])
  })

  it('flags a text injecting a name nothing defines', () => {
    const project = createProject({ id: 'p', title: 'P' })
    project.codeSystems['http://x'] = {
      id: 'x',
      url: 'http://x',
      status: 'draft',
      content: 'complete',
      concepts: {
        note: {
          system: 'http://x',
          code: 'note',
          dataType: 'string',
          designations: [
            withDesignationText({ language: 'en', value: '' }, fromPlain('Give ${ghost}')),
          ],
        },
      },
      conceptOrder: ['note'],
    }
    expect(validateProject(project).map((i) => i.rule)).toContain('text.unknown-reference')
  })

  it('reports once per concept a stored document the schema refuses, and reads its value', () => {
    const project = createProject({ id: 'p', title: 'P' })
    const broken = (language: string) => ({
      language,
      value: '**Danger**',
      extension: [
        {
          url: 'https://tricc.org/StructureDefinition/designation-doc',
          valueString: JSON.stringify({ type: 'doc', content: [{ type: 'table' }] }),
        },
      ],
    })
    project.codeSystems['http://x'] = {
      id: 'x',
      url: 'http://x',
      status: 'draft',
      content: 'complete',
      concepts: {
        note: {
          system: 'http://x',
          code: 'note',
          dataType: 'string',
          designations: [broken('en'), broken('fr')],
        },
      },
      conceptOrder: ['note'],
    }
    const issues = validateProject(project).filter((i) => i.rule === 'text.invalid-doc')
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ severity: 'warning', location: { conceptCode: 'note' } })
    expect(
      conceptRichText(project.codeSystems['http://x']!.concepts['note'], 'q-display', 'fr'),
    ).toEqual(fromHtml('<b>Danger</b>'))
  })
})

describe('default concept types', () => {
  it('makes questions Observations, answers Values (Observations when several are chosen), diagnoses Conditions', () => {
    const project = createProject({ id: 'p', title: 'P' })
    project.activities['a'] = {
      id: 'a',
      nodeOrder: ['s', 'one', 'many', 'dx'],
      edgeOrder: [],
      edges: {},
      nodes: {
        s: { id: 's', type: 'activity_start' },
        one: {
          id: 'one',
          type: 'select_one',
          name: 'cough',
          label: { en: 'Cough' },
          options: [{ id: 'o', name: 'dry', label: { en: 'Dry' } }],
        },
        many: {
          id: 'many',
          type: 'select_multiple',
          name: 'signs',
          label: { en: 'Signs' },
          options: [{ id: 'm', name: 'rash', label: { en: 'Rash' } }],
        },
        dx: { id: 'dx', type: 'proposed_diagnosis', name: 'pneumonia', label: { en: 'Pneumonia' } },
      },
    }
    const cs = moveTextsToConcepts(project).createdCodeSystem!
    expect(cs.concepts['cough']?.conceptType).toBe('Observation')
    expect(cs.concepts['dry']?.conceptType).toBe('Value')
    expect(cs.concepts['rash']?.conceptType).toBe('Observation')
    expect(cs.concepts['pneumonia']?.conceptType).toBe('Condition')
  })
})

describe('questionnaire text per repeat slot', () => {
  const q = { system: 'https://tricc.org/CodeSystem/designation-use', code: 'q-display' }
  const temp: Concept = {
    system: 'http://x',
    code: 'temp',
    display: 'Temperature',
    designations: [
      { language: 'en', use: q, value: 'Measure the temperature' },
      {
        language: 'en',
        use: q,
        value: 'Community wording',
        extension: scopeExtension(['community']),
      },
      { language: 'en', use: q, value: 'Second measurement', extension: repeatScopeExtension([2]) },
      {
        language: 'en',
        use: q,
        value: 'Second, community',
        extension: [...scopeExtension(['community']), ...repeatScopeExtension([2])],
      },
      { language: 'fr', use: q, value: 'Mesurer la température' },
    ],
  }
  const text = (scope: { interventionId?: string; repeat?: number }, lang = 'en') =>
    conceptText(temp, 'q-display', lang, 'en', scope)

  it('picks the most specific text: slot and intervention, slot, intervention, then all', () => {
    expect(text({ repeat: 2, interventionId: 'community' })).toBe('Second, community')
    expect(text({ repeat: 2, interventionId: 'facility' })).toBe('Second measurement')
    expect(text({ repeat: 2 })).toBe('Second measurement')
    expect(text({ repeat: 1, interventionId: 'community' })).toBe('Community wording')
    expect(text({ repeat: 1 })).toBe('Measure the temperature')
    expect(text({ repeat: 3 })).toBe('Measure the temperature')
    expect(text({})).toBe('Measure the temperature')
  })

  it('gives no slot text to repeat -1, and falls back per language', () => {
    expect(text({ repeat: -1 })).toBe('Measure the temperature')
    expect(text({ repeat: 2 }, 'fr')).toBe('Mesurer la température')
  })

  it('never makes the display depend on the slot', () => {
    expect(conceptText(temp, 'display', 'en', 'en', { repeat: 2 })).toBe('Temperature')
  })

  it('treats a slot-scoped text as scoped', () => {
    expect(isUnscoped(temp.designations[2]!)).toBe(false)
    expect(designationRepeats(temp.designations[3]!)).toEqual([2])
  })

  it('sets and clears a slot text without touching the others', () => {
    const base: Concept = { ...temp, designations: [temp.designations[0]!] }
    const set = withConceptText(base, 'q-display', 'en', 'Again', 'en', { repeat: 2 })
    expect(set.designations).toHaveLength(2)
    expect(conceptText(set, 'q-display', 'en', 'en', { repeat: 2 })).toBe('Again')
    expect(conceptText(set, 'q-display', 'en', 'en')).toBe('Measure the temperature')
    const changed = withConceptText(set, 'q-display', 'en', 'Second', 'en', { repeat: 2 })
    expect(changed.designations).toHaveLength(2)
    expect(conceptText(changed, 'q-display', 'en', 'en', { repeat: 2 })).toBe('Second')
    const cleared = withConceptText(changed, 'q-display', 'en', undefined, 'en', { repeat: 2 })
    expect(cleared.designations).toEqual(base.designations)
  })

  it('round-trips the repeat scope through the CodeSystem file', () => {
    const file: CodeSystem = {
      id: 'x',
      url: 'http://x',
      status: 'draft',
      content: 'complete',
      concepts: { temp },
      conceptOrder: ['temp'],
    }
    const back = decodeCodeSystem(encodeCodeSystem(file))
    expect(back.concepts['temp']?.designations).toEqual(temp.designations)
  })

  function project(designations: Concept['designations']): Project {
    const p = createProject({ id: 'p', title: 'P' })
    p.codeSystems['http://x'] = {
      id: 'x',
      url: 'http://x',
      status: 'draft',
      content: 'complete',
      concepts: { temp: { ...temp, dataType: 'decimal', designations } },
      conceptOrder: ['temp'],
    }
    const concept = { system: 'http://x', code: 'temp' }
    p.activities['a'] = {
      id: 'a',
      nodeOrder: ['t1', 't2'],
      edgeOrder: [],
      edges: {},
      nodes: {
        t1: { id: 't1', type: 'decimal', name: 'temp', concept },
        t2: { id: 't2', type: 'decimal', name: 'temp', concept, repeat: 2 },
      },
    }
    return p
  }
  const rules = (p: Project) =>
    validateProject(p).filter((i) => i.rule.startsWith('concept.repeat'))

  it('reports a repeat showing the same text as the first, until it has its own', () => {
    const same = rules(project([temp.designations[0]!]))
    expect(same.map((i) => i.rule)).toEqual(['concept.repeat-text-same'])
    expect(same[0]?.severity).toBe('info')
    expect(same[0]?.location.nodeId).toBe('t2')
    expect(rules(project([temp.designations[0]!, temp.designations[2]!]))).toEqual([])
  })

  it('reports a slot text no node uses, and two texts for the same slot', () => {
    const third = { language: 'en', use: q, value: 'Third', extension: repeatScopeExtension([3]) }
    const p = project([
      temp.designations[0]!,
      temp.designations[2]!,
      third,
      { ...temp.designations[2]!, value: 'Dup' },
    ])
    const all = validateProject(p).map((i) => i.rule)
    expect(all).toContain('concept.repeat-text-unused')
    expect(all).toContain('concept.duplicate-designation')
  })
})
