import { describe, expect, it } from 'vitest'
import type { CodeSystem, DecisionTable, Project } from '../model/types.js'
import {
  createActivity,
  createProject,
  readProject,
  writeProject,
} from '../format/serialize/index.js'
import { ProjectDocument } from '../document/doc.js'
import { validateTables } from '../validate/tables.js'
import { validateProject } from '../validate/project.js'

const diazepam: DecisionTable = {
  id: 'diazepam',
  title: 'Diazepam, rectal (ml)',
  hitPolicy: 'first',
  inputs: [
    { name: 'weight', concept: 'weight', type: 'decimal' },
    { name: 'age', concept: 'age_in_months', type: 'integer' },
  ],
  outputs: [{ name: 'dose', type: 'string' }],
  rules: [
    ['>= 20', '-', '2.5'],
    ['[3..20)', '-', '1.2'],
    ['-', '>= 2', '0.4'],
  ],
}

const dictionary: CodeSystem = {
  id: 'dd',
  url: 'http://example.org/dd',
  status: 'draft',
  content: 'complete',
  concepts: {
    weight: { system: 'http://example.org/dd', code: 'weight', designations: [] },
    age_in_months: { system: 'http://example.org/dd', code: 'age_in_months', designations: [] },
  },
  conceptOrder: ['weight', 'age_in_months'],
}

function project(expression?: string): Project {
  const p = createProject({ id: 'p', title: 'P' })
  p.codeSystems[dictionary.url] = structuredClone(dictionary)
  p.decisionTables = { diazepam: structuredClone(diazepam) }
  const a = createActivity({ id: 'treat' })
  if (expression) {
    a.nodes['dose'] = {
      id: 'dose',
      type: 'calculate',
      name: 'dose',
      calculate: { expression },
      ui: { x: 0, y: 100 },
    }
    a.nodeOrder.push('dose')
  }
  p.activities['treat'] = a
  return p
}

describe('decision tables in the project files', () => {
  it('writes tables/<id>.yaml and lists it, with aliases, in tricc.yaml', () => {
    const p = project()
    p.aliases = { Dose: { function: 'DMNList', args: ['table', 'weight'] } }
    const files = writeProject(p)
    expect(files['tables/diazepam.yaml']).toContain('  - [">= 20",   "-",    "2.5"]')
    expect(files['tricc.yaml']).toContain('decision_tables:\n  - tables/diazepam.yaml\n')
    expect(files['tricc.yaml']).toContain('aliases:\n  Dose:\n    function: DMNList\n')
    const back = readProject(files).project
    expect(back.decisionTables).toEqual({ diazepam })
    expect(back.aliases).toEqual(p.aliases)
    expect(writeProject(back)).toEqual(files)
  })

  it('reads tables listed by a glob, elsewhere, and keeps their path', () => {
    const files = writeProject(project())
    const text = files['tables/diazepam.yaml'] as string
    delete files['tables/diazepam.yaml']
    files['dosing/diazepam.yaml'] = text
    files['tricc.yaml'] = (files['tricc.yaml'] as string).replace(
      '  - tables/diazepam.yaml',
      '  - dosing/*.yaml',
    )
    const back = readProject(files).project
    expect(back.decisionTables?.['diazepam']?.path).toBe('dosing/diazepam.yaml')
    expect(writeProject(back)['dosing/diazepam.yaml']).toBe(text)
  })

  it('stops on a table file it cannot read', () => {
    const files = writeProject(project())
    files['tables/diazepam.yaml'] = 'id: diazepam\nhit_policy: any\n'
    expect(() => readProject(files)).toThrow(/hit_policy "any"/)
  })
})

describe('decision tables in the document', () => {
  it('survive the document and its undo', () => {
    const doc = ProjectDocument.fromProject(project())
    expect(doc.snapshot().decisionTables).toEqual({ diazepam })
    doc.transact((tx) => tx.setTableCell('diazepam', 1, 2, '1.7'))
    expect(doc.snapshot().decisionTables?.['diazepam']?.rules[1]).toEqual(['[3..20)', '-', '1.7'])
    doc.undo.undo()
    expect(doc.snapshot().decisionTables?.['diazepam']?.rules[1]).toEqual(['[3..20)', '-', '1.2'])
  })

  it('moves, inserts and removes rows, and sets a table by difference', () => {
    const doc = ProjectDocument.fromProject(project())
    doc.transact((tx) => {
      tx.moveTableRow('diazepam', 2, 0)
      tx.insertTableRow('diazepam', 3, ['null', '-', '0'])
      tx.removeTableRow('diazepam', 1)
    })
    expect(doc.snapshot().decisionTables?.['diazepam']?.rules).toEqual([
      ['-', '>= 2', '0.4'],
      ['[3..20)', '-', '1.2'],
      ['null', '-', '0'],
    ])
    doc.transact((tx) => tx.setDecisionTable({ ...diazepam, hitPolicy: 'rule_order' }))
    expect(doc.snapshot().decisionTables?.['diazepam']).toEqual({
      ...diazepam,
      hitPolicy: 'rule_order',
    })
    doc.transact((tx) => tx.renameDecisionTable('diazepam', 'diazepam_rectal'))
    expect(Object.keys(doc.snapshot().decisionTables ?? {})).toEqual(['diazepam_rectal'])
    doc.transact((tx) => tx.removeDecisionTable('diazepam_rectal'))
    expect(doc.snapshot().decisionTables).toBeUndefined()
  })

  it('merges two authors editing different rows', () => {
    const a = ProjectDocument.fromProject(project())
    const b = ProjectDocument.fromDoc(new (a.doc.constructor as typeof import('yjs').Doc)())
    b.applyUpdate(a.encodeState())
    a.transact((tx) => tx.setTableCell('diazepam', 0, 2, '2.6'))
    b.transact((tx) => tx.setTableCell('diazepam', 2, 2, '0.5'))
    a.applyUpdate(b.encodeState())
    b.applyUpdate(a.encodeState())
    expect(a.snapshot().decisionTables?.['diazepam']?.rules.map((r) => r[2])).toEqual([
      '2.6',
      '1.2',
      '0.5',
    ])
    expect(b.snapshot().decisionTables).toEqual(a.snapshot().decisionTables)
  })
})

describe('decision table validation', () => {
  const rules = (p: Project) => validateTables(p).map((i) => i.rule)

  it('accepts a good call, and an alias that maps by name', () => {
    expect(rules(project(`DMN('diazepam', "weight", "age_in_months")`))).toEqual([])
    expect(rules(project(`DMN('diazepam')`))).toEqual([])
    expect(rules(project(`DrugDosage('diazepam', "age_in_months", "weight")`))).toEqual([])
    expect(rules(project(`DMNList('diazepam.dose', 3)`))).toEqual([])
  })

  it('warns about a table no expression calls', () => {
    expect(rules(project())).toEqual(['dmn.unused'])
  })

  it('names unknown and non-literal tables, unknown outputs and argument counts', () => {
    expect(rules(project(`DMN('nope', 1)`))).toEqual(['E_DMN_TABLE_UNKNOWN', 'dmn.unused'])
    expect(rules(project(`DMN(t, 1)`))).toEqual(['E_DMN_TABLE_NOT_STATIC', 'dmn.unused'])
    expect(rules(project(`DMN('diazepam.volume')`))).toEqual(['E_DMN_TABLE_UNKNOWN'])
    expect(rules(project(`DMN('diazepam', 1, 2, 3)`))).toEqual(['E_DMN_ARITY'])
  })

  it('needs a value or a concept for every input', () => {
    const p = project(`DMN('diazepam', 12)`)
    delete p.decisionTables!['diazepam']!.inputs[1]!.concept
    expect(rules(p)).toEqual(['E_DMN_ARITY'])
  })

  it('checks alias inputs against the table', () => {
    const p = project(`Dose('diazepam', 12)`)
    p.aliases = { Dose: { function: 'DMN', args: ['table', 'kg'] } }
    expect(rules(p)).toEqual(['E_ALIAS_UNKNOWN_INPUT'])
  })

  it('checks cells, concepts and list values', () => {
    const p = project(`DMNList('diazepam')`)
    const t = p.decisionTables!['diazepam']!
    t.rules[0]![0] = '>= x'
    t.rules[1]![2] = 'one ml'
    t.inputs[0]!.concept = 'gone'
    const found = validateTables(p)
    expect(found.map((i) => [i.rule, i.location.row, i.location.column])).toEqual([
      ['E_DMN_CELL', 0, 0],
      ['E_DMN_LIST_VALUE', 1, 2],
      ['E_DMN_CONCEPT', undefined, 0],
    ])
  })

  it('takes a calculation name as a column concept', () => {
    const p = project(`DMN('diazepam', 12)`)
    delete p.codeSystems[dictionary.url]!.concepts['age_in_months']
    expect(validateTables(p).map((i) => i.message)).toEqual([
      expect.stringContaining('"age_in_months" is not in any dictionary, and no question'),
    ])
    p.decisionTables!['diazepam']!.inputs[1]!.concept = 'dose'
    expect(validateTables(p)).toEqual([])
  })

  it('runs with the project validation', () => {
    expect(validateProject(project(`DMN('nope')`)).map((i) => i.rule)).toContain(
      'E_DMN_TABLE_UNKNOWN',
    )
  })
})

describe('result type at the call', () => {
  const rules = (expression: string, policy: 'first' | 'rule_order' = 'first') => {
    const p = project(expression)
    p.decisionTables!['diazepam']!.hitPolicy = policy
    return validateTables(p).map((i) => i.rule)
  }

  it('flags a list compared or added as one value', () => {
    expect(rules(`DMNList('diazepam') > 1`)).toEqual(['E_DMN_TYPE'])
    expect(rules(`1 + DMN('diazepam')`, 'rule_order')).toEqual(['E_DMN_TYPE'])
    expect(rules(`Count(DMNList('diazepam')) > 1`)).toEqual([])
    expect(rules(`exists(DMN('diazepam'))`, 'rule_order')).toEqual([])
  })

  it('flags one value handed to a list function', () => {
    expect(rules(`Count(DMN('diazepam'))`)).toEqual(['E_DMN_TYPE'])
    expect(rules(`Count(DMNFirst('diazepam'))`, 'rule_order')).toEqual(['E_DMN_TYPE'])
    expect(rules(`DMN('diazepam') > 1`)).toEqual([])
  })
})
