import { describe, expect, it } from 'vitest'
import { sampleProject } from '../format/__fixtures__.js'
import { readProject, writeProject } from '../format/serialize/index.js'
import * as Y from 'yjs'
import { projectFromDoc, projectToDoc } from '../document/codec.js'
import type { Project, TriccNode } from '../model/types.js'
import { calculateCodeSystem, dictionaryForType, emptyCodeSystem, projectDictionaries } from './dictionaries.js'
import { searchProject } from './project-search.js'
import { nodeConceptKey } from './usage.js'

const DEFAULT = 'http://tricc.org/CodeSystem/tricc'

function withCalculate(): Project {
  const project = sampleProject()
  const [, calc] = projectDictionaries(project)
  const cs = emptyCodeSystem(calc!)
  cs.concepts['severe_pneumonia'] = { system: cs.url, code: 'severe_pneumonia', display: 'Severe pneumonia', designations: [] }
  cs.conceptOrder.push('severe_pneumonia')
  project.codeSystems[cs.url] = cs
  project.calculateCodeSystem = cs.url
  return project
}

describe('data dictionaries', () => {
  it('lists the default and the calculate dictionary, the latter before it exists', () => {
    const project = sampleProject()
    const all = projectDictionaries(project)
    expect(all.map((d) => [d.kind, d.id, d.url, Boolean(d.codeSystem)])).toEqual([
      ['default', 'tricc', DEFAULT, true],
      ['calculate', 'tricc-calculate', `${DEFAULT}-calculate`, false],
    ])
    expect(dictionaryForType(project, 'calculate').kind).toBe('calculate')
    expect(dictionaryForType(project, 'diagnosis').kind).toBe('calculate')
    expect(dictionaryForType(project, 'rhombus').kind).toBe('default')
    expect(dictionaryForType(project, 'select_one').kind).toBe('default')
  })

  it('finds a calculation concept by the node name in the calculate dictionary', () => {
    const project = withCalculate()
    expect(calculateCodeSystem(project)?.id).toBe('tricc-calculate')
    const node = { id: 'd', type: 'diagnosis', name: 'severe_pneumonia' } as TriccNode
    expect(nodeConceptKey(project, node)).toEqual({ system: `${DEFAULT}-calculate`, code: 'severe_pneumonia' })
    // A question of the same name does not look there.
    expect(nodeConceptKey(project, { ...node, type: 'select_yesno' } as TriccNode)).toBeUndefined()
  })

  it('keeps the calculate dictionary through tricc.yaml and the document', () => {
    const project = withCalculate()
    const files = writeProject(project)
    expect(String(files['tricc.yaml'])).toContain(`calculate_code_system: ${DEFAULT}-calculate`)
    expect(readProject(files).project.calculateCodeSystem).toBe(`${DEFAULT}-calculate`)
    const doc = new Y.Doc()
    projectToDoc(project, doc)
    expect(projectFromDoc(doc).calculateCodeSystem).toBe(`${DEFAULT}-calculate`)
  })
})

describe('project search', () => {
  it('finds concepts, activities and nodes, ignoring case', () => {
    const project = withCalculate()
    const result = searchProject(project, 'PNEUMONIA')
    expect(result.concepts.map((c) => [c.dictionary, c.concept.code])).toContainEqual(['tricc-calculate', 'severe_pneumonia'])
    expect(searchProject(project, '').concepts).toEqual([])
  })
})
