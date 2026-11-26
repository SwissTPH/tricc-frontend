import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import type { DecisionTable, HitPolicy, TableColumnType } from '../model/types.js'
import { parseCell, testCell, testsOverlap, type InputValue } from './cell.js'
import { evaluateTable, tableProblems } from './evaluate.js'
import { decodeTableFile, encodeTableFile } from './file.js'
import { boundArguments, tableCalls } from './calls.js'
import cells from './__vectors__/cells.json' with { type: 'json' }
import vectors from './__vectors__/tables.json' with { type: 'json' }

function tableFromVector(raw: (typeof vectors.tables)['diazepam']): DecisionTable {
  return {
    id: raw.id,
    title: raw.title,
    hitPolicy: raw.hit_policy as HitPolicy,
    inputs: raw.inputs.map((c) => ({ ...c, type: c.type as TableColumnType })),
    outputs: raw.outputs.map((c) => ({ ...c, type: c.type as TableColumnType })),
    rules: raw.rules,
  }
}

const diazepam = tableFromVector(vectors.tables.diazepam)

describe('cells (shared vectors)', () => {
  for (const c of cells.cases) {
    it(`${JSON.stringify(c.cell)} on ${c.type}`, () => {
      const parsed = parseCell(c.cell, c.type as TableColumnType)
      if ('error' in c) {
        expect(parsed.ok ? 'ok' : parsed.error.code).toBe(c.error)
        return
      }
      if (!parsed.ok) throw new Error(parsed.error.message)
      for (const v of c.pass as InputValue[]) expect(testCell(parsed.test, v), `${v}`).toBe(true)
      for (const v of c.fail as InputValue[]) expect(testCell(parsed.test, v), `${v}`).toBe(false)
    })
  }
})

describe('tables (shared vectors)', () => {
  for (const c of vectors.cases) {
    it(`${c.table} ${JSON.stringify(c.inputs)}`, () => {
      const table = tableFromVector(vectors.tables[c.table as 'diazepam'])
      const first = evaluateTable(table, c.inputs, 'first')
      expect(first.matches).toEqual(c.matches)
      expect((first.value as unknown[])[0] ?? null).toBe(c.first)
      const list = evaluateTable(table, c.inputs, 'rule_order')
      expect((list.value as unknown[][]).map((v) => v[0])).toEqual(c.list)
    })
  }
})

describe('hit policies', () => {
  it('first keeps the first matching row, rule order every one in order', () => {
    expect(evaluateTable(diazepam, [25, 40]).kept).toEqual([0])
    const list = evaluateTable({ ...diazepam, hitPolicy: 'rule_order' }, [25, 40])
    expect(list.kept).toEqual([0, 5])
  })

  it('unique flags rows that can both match', () => {
    const problems = tableProblems({ ...diazepam, hitPolicy: 'unique' })
    expect(problems.filter((p) => p.code === 'E_DMN_OVERLAP')).toHaveLength(20)
    const weightOnly: DecisionTable = {
      ...diazepam,
      hitPolicy: 'unique',
      rules: diazepam.rules.slice(0, 5),
    }
    expect(tableProblems(weightOnly)).toEqual([])
  })

  it('overlap follows bounds and nulls', () => {
    const t = (cell: string) => {
      const p = parseCell(cell, 'decimal')
      if (!p.ok) throw new Error(p.error.message)
      return p.test
    }
    expect(testsOverlap(t('[3..6)'), t('[6..10)'))).toBe(false)
    expect(testsOverlap(t('[3..6]'), t('[6..10)'))).toBe(true)
    expect(testsOverlap(t('null'), t('>= 0'))).toBe(false)
    expect(testsOverlap(t('-'), t('null'))).toBe(true)
    expect(testsOverlap(t('1, 2'), t('> 1'))).toBe(true)
  })

  it('a list result checks for values with spaces', () => {
    const table: DecisionTable = {
      ...diazepam,
      hitPolicy: 'rule_order',
      rules: [['-', '-', 'two words']],
    }
    expect(tableProblems(table).map((p) => p.code)).toEqual(['E_DMN_LIST_VALUE'])
    expect(tableProblems({ ...table, hitPolicy: 'first' })).toEqual([])
  })

  it('reports cell and shape problems with their place', () => {
    const table: DecisionTable = {
      ...diazepam,
      rules: [
        ['> x', '-', '1'],
        ['-', '-'],
      ],
    }
    expect(tableProblems(table)).toMatchObject([
      { code: 'E_DMN_CELL', row: 0, column: 0 },
      { code: 'E_DMN_SHAPE', row: 1 },
    ])
  })
})

describe('table file', () => {
  it('writes one aligned rule per line', () => {
    expect(encodeTableFile(diazepam)).toBe(
      [
        'id: diazepam',
        'title: Diazepam, rectal (ml)',
        'hit_policy: first',
        'inputs:',
        '  - name: weight',
        '    concept: CHE.B6.DE07',
        '    type: decimal',
        '  - name: age',
        '    concept: age_in_months',
        '    type: integer',
        'outputs:',
        '  - name: dose',
        '    type: string',
        'rules:',
        '  - [">= 20",    "-",        "2.5"]',
        '  - ["[15..20)", "-",        "1.7"]',
        '  - ["[10..15)", "-",        "1.2"]',
        '  - ["[6..10)",  "-",        "0.75"]',
        '  - ["[3..6)",   "-",        "0.4"]',
        '  - ["-",        ">= 36",    "1.7"]',
        '  - ["-",        "[12..36)", "1.2"]',
        '  - ["-",        "[5..12)",  "0.75"]',
        '  - ["-",        "[2..5)",   "0.4"]',
        '',
      ].join('\n'),
    )
  })

  it('reads what it writes, and the spec example with comments', () => {
    expect(decodeTableFile(encodeTableFile(diazepam), 'tables/diazepam.yaml')).toEqual(diazepam)
    const authored = `id: diazepam
title: Diazepam, rectal (ml)
hit_policy: first
inputs:
  - name: weight
    concept: CHE.B6.DE07      # kg
    type: decimal
  - name: age
    concept: age_in_months
    type: integer             # rounded down before the tests
outputs:
  - name: dose
    type: string
rules:                        # one cell per input, then the outputs
  - [">= 20",    "-",        "2.5"]
  - ["[15..20)", "-",        "1.7"]
  - ["[10..15)", "-",        "1.2"]
  - ["[6..10)",  "-",        "0.75"]
  - ["[3..6)",   "-",        "0.4"]
  - ["-",        ">= 36",    "1.7"]   # no usable weight: by age
  - ["-",        "[12..36)", "1.2"]
  - ["-",        "[5..12)",  "0.75"]
  - ["-",        "[2..5)",   "0.4"]
`
    expect(decodeTableFile(authored, 'tables/diazepam.yaml')).toEqual(diazepam)
  })

  it('explains what is wrong with a file', () => {
    expect(() => decodeTableFile('title: x', 't.yaml')).toThrow(/has no id/)
    expect(() => decodeTableFile('id: x\nhit_policy: last', 't.yaml')).toThrow(/hit_policy "last"/)
    expect(() => decodeTableFile('id: x\ninputs:\n  - name: a\n    type: date', 't.yaml')).toThrow(
      /type "date"/,
    )
  })
})

describe('calls', () => {
  it('finds DMN, DMNFirst, DMNList and aliases, with their arguments', () => {
    const calls = tableCalls(
      `DMN('diazepam', "CHE.B6.DE07", "age_in_months") + Count(DMNList('t.dose', f(1, 2))) and DrugDosage('diazepam', age, weight)`,
    )
    expect(calls.map((c) => [c.name, c.function, c.table, c.output, c.args.length])).toEqual([
      ['DMN', 'DMN', 'diazepam', undefined, 3],
      ['DMNList', 'DMNList', 't', 'dose', 2],
      ['DrugDosage', 'DMN', 'diazepam', undefined, 3],
    ])
    expect(boundArguments(calls[2]!, diazepam)).toEqual(['weight', 'age'])
    expect(boundArguments(calls[0]!, diazepam)).toEqual(['"CHE.B6.DE07"', '"age_in_months"'])
  })

  it('ignores names inside strings and a table that is not a literal', () => {
    expect(tableCalls(`'DMN(' + "x"`)).toEqual([])
    expect(tableCalls(`DMN(tableName, 1)`)[0]?.table).toBeUndefined()
  })
})

// ---------------------------------------------------------------- Global drugs.js

interface DrugsData {
  dosesWeightClasses: Record<string, Record<string, number | string>>[]
  dosesAgeClasses: Record<string, Record<string, number | string>>[]
  drugsWeight: string[]
  drugesAge: string[]
}

/** Load the vendored drugs.js: its CHT entry point and its two tables. */
function loadDrugs(): {
  data: DrugsData
  dose: (drug: string, age: number | null, weight: number | null) => string
} {
  const source = readFileSync(new URL('./__fixtures__/drugs.cjs', import.meta.url), 'utf8')
  const module = { exports: {} as unknown }
  runInNewContext(
    `${source}\nmodule.exports.__data = { dosesWeightClasses, dosesAgeClasses, drugsWeight, drugesAge }`,
    { module, console: { log() {} } },
  )
  const fn = module.exports as ((...a: unknown[]) => { v: string }) & { __data: DrugsData }
  const arg = (v: number | null) =>
    v === null ? { t: 'arr', v: [] } : { t: 'num', v: { textContent: String(v) } }
  return {
    data: fn.__data,
    dose: (drug, age, weight) => fn({ v: drug }, arg(age), arg(weight)).v,
  }
}

/** Steps `{3: a, 6: b}` → `[3..6)` a, `>= 6` b. Keys are lower bounds, as drugs.js reads them. */
function stepRows(steps: Record<string, number | string>): [string, string][] {
  const keys = Object.keys(steps).sort((a, b) => parseFloat(a) - parseFloat(b))
  return keys.map((k, i) => {
    const next = keys[i + 1]
    return [next === undefined ? `>= ${k}` : `[${k}..${next})`, String(steps[k])]
  })
}

/** What `tricc_oo/tools/drugs_js_to_tables.py` writes: weight rows, then age rows. */
function drugTables(data: DrugsData): DecisionTable[] {
  const drugs = [...new Set([...data.drugsWeight, ...data.drugesAge])].sort()
  return drugs.map((drug) => {
    const w = data.drugsWeight.indexOf(drug)
    const a = data.drugesAge.indexOf(drug)
    const rules: string[][] = []
    if (w >= 0)
      for (const [cell, dose] of stepRows(data.dosesWeightClasses[w]![drug]!))
        rules.push([cell, '-', dose])
    if (a >= 0)
      for (const [cell, dose] of stepRows(data.dosesAgeClasses[a]![drug]!))
        rules.push(['-', cell, dose])
    return {
      id: drug,
      hitPolicy: 'first',
      inputs: [
        { name: 'weight', concept: 'CHE.B6.DE07', type: 'decimal' },
        { name: 'age', concept: 'age_in_months', type: 'integer' },
      ],
      outputs: [{ name: 'dose', type: 'string' }],
      rules,
    }
  })
}

describe('Global drugs.js as tables', () => {
  const { data, dose } = loadDrugs()
  const tables = drugTables(data)

  it('gives one valid table per drug, read back byte-identical', () => {
    expect(tables).toHaveLength(33)
    for (const table of tables) {
      expect(tableProblems(table), table.id).toEqual([])
      const text = encodeTableFile(table)
      expect(encodeTableFile(decodeTableFile(text, `tables/${table.id}.yaml`))).toBe(text)
    }
  })

  it('gives the dose drugs.js gives', () => {
    // Weight 0 counts as not entered in drugs.js; age 0 gives no dose there at all, and no age
    // gives the last age class: both are left out (the tables give no dose without an age).
    const weights = [null, 1, 1.4, 2, 2.5, 3, 3.9, 4, 5.5, 6, 9.99, 10, 11.5, 14, 15, 19.9, 20, 35]
    const ages = [1, 2, 3, 4, 6, 11, 12, 23, 24, 35, 36, 59, 60, 120]
    for (const table of tables) {
      for (const weight of weights) {
        for (const age of ages) {
          const got = evaluateTable(table, [weight, age]).value[0]
          expect(got ?? '', `${table.id} weight ${weight} age ${age}`).toBe(
            dose(table.id, age, weight),
          )
        }
      }
    }
  })
})
