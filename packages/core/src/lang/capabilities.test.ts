import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createActivity, createProject } from '../format/serialize/index.js'
import { statementSet, withStatement, type Statement } from '../capabilities/index.js'
import { validateProject } from '../validate/project.js'
import type { Project, TriccNode } from '../model/types.js'
import { checkCapabilities, langValidation } from './index.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name: string): Statement =>
  JSON.parse(
    fs.readFileSync(path.join(here, '../capabilities/__fixtures__', `${name}.json`), 'utf8'),
  )
const ALL = ['xlsform', 'xlsform-cdss', 'xlsform-cht', 'fhir', 'fhir-strict'].map(fixture)

/** tricc's fixture tests/data/projects/capabilities, drawn in the editor. */
function project(active: string[]): Project {
  const p = createProject({ id: 'p', title: 'P' })
  const check = createActivity({ id: 'check', title: 'Check' })
  const nodes: TriccNode[] = [
    { id: 'weight', type: 'decimal', name: 'weight' },
    {
      id: 'heavy',
      type: 'calculate',
      name: 'heavy',
      calculate: { expression: 'Max("weight", 20)' },
    },
    {
      id: 'young',
      type: 'note',
      name: 'young_note',
      relevance: { expression: '"#age_months" < 6' },
    },
    {
      id: 'dose',
      type: 'calculate',
      name: 'dose',
      calculate: { expression: `DMN('diazepam', "weight")` },
    },
    { id: 'prev', type: 'populate', name: 'prev_weight', context: 'history' },
  ]
  for (const n of nodes) {
    check.nodes[n.id] = n
    check.nodeOrder.push(n.id)
  }
  p.activities = { check }
  p.codeSystems['http://example.org/retrieve'] = {
    resourceType: 'CodeSystem',
    url: 'http://example.org/retrieve',
    id: 'demo-retrieve',
    status: 'draft',
    content: 'complete',
    meta: {
      tag: [{ system: 'http://tricc.org/fhir/CodeSystem/codesystem-role', code: 'retrieve' }],
    },
    concepts: {
      '#age_months': {
        code: '#age_months',
        designations: [],
        retrieval: { context: 'patient', function: 'AgeInMonths' },
      },
    },
    conceptOrder: ['#age_months'],
  } as unknown as Project['codeSystems'][string]
  let set = statementSet(p)
  for (const s of ALL) set = withStatement(set, s, { source: 'npm' }, active.includes(s.id))
  p.capabilities = set.entries
  p.capabilityFiles = set.files
  return p
}

const by = (issues: ReturnType<typeof checkCapabilities>, rule: string) =>
  issues.filter((i) => i.rule === rule).map((i) => i.message)

describe('the drawing checked against its active statements', () => {
  it('FHIR: Max inline, once per active statement; the strict one warns about the table', () => {
    const issues = checkCapabilities(
      project(['@tricc/capabilities-fhir', '@acme/capabilities-fhir-strict']),
    )
    expect(by(issues, 'output.unsupported')).toEqual([
      "'heavy' (check) uses Max, which the FHIRStrategy output cannot write inline (@tricc/capabilities-fhir@1.0.0).",
      "'heavy' (check) uses Max, which the FHIRStrategy output cannot write inline (@acme/capabilities-fhir-strict@1.0.0).",
    ])
    expect(by(issues, 'output.limit')).toHaveLength(2)
    expect(by(issues, 'output.no-statement')).toEqual([
      'XLSFormCHTStrategy has no active capability statement: it is built unchecked.',
    ])
  })

  it('plain XLSForm: the patient retrieval and the history prefill', () => {
    const messages = by(
      checkCapabilities(project(['@tricc/capabilities-xlsform'])),
      'output.unsupported',
    )
    expect(messages).toEqual([
      "'young_note' (check) reads #age_months, a retrieval from the patient context, which the XLSFormStrategy output cannot write (@tricc/capabilities-xlsform@1.0.0).",
      "'prev_weight' (check) is a prefilled value from the history context, which the XLSFormStrategy output cannot write (@tricc/capabilities-xlsform@1.0.0).",
    ])
  })

  it('CHT writes all of it; loaded but inactive statements are not checked', () => {
    expect(checkCapabilities(project(['@tricc/capabilities-xlsform-cht']))).toEqual([])
  })

  it('no active statement, no check', () => {
    expect(checkCapabilities(project([]))).toEqual([])
  })

  it('reaches the problems list through validateProject', () => {
    const issues = validateProject(project(['@tricc/capabilities-fhir']), { lang: langValidation })
    expect(
      issues.some((i) => i.rule === 'output.unsupported' && i.location.nodeId === 'heavy'),
    ).toBe(true)
  })
})
