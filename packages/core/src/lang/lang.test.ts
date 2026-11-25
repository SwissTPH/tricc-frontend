import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  CELL_VECTORS,
  CellError,
  LANG_LOCK,
  LANG_VERSION,
  MEANING,
  cellMatches,
  cqlKind,
  cqlUses,
  isExpressionArg,
  langValidation,
  literalValue,
  parseCell,
  parseCql,
  type CellColumnType,
} from './index.js'
import errors from './errors.json' with { type: 'json' }
import { createActivity, createBlock, createProject } from '../format/serialize/index.js'
import { validateProject } from '../validate/project.js'
import type { Project, TriccNode } from '../model/types.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../../..')
// @ts-expect-error -- plain ESM script, no types
const { folderHash, LANG_DIR } = await import('../../../../scripts/sync-lang.mjs')
// @ts-expect-error -- plain ESM script, no types
const generator = await import('../../../../scripts/generate-lang-parsers.mjs')

describe('the pinned copy', () => {
  it('matches lang.lock.json', () => {
    expect(LANG_LOCK.sha256).toBe(folderHash(LANG_DIR))
    expect(LANG_LOCK.version).toBe(fs.readFileSync(path.join(here, 'VERSION'), 'utf8').trim())
    expect(LANG_LOCK.tricc_commit).toMatch(/^[0-9a-f]{40}$/)
  })

  it('pins the antlr4 runtime to 4.13.2', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(here, '../../package.json'), 'utf8'))
    expect(pkg.dependencies.antlr4).toBe('4.13.2')
  })

  it.each(generator.GENERATED as string[])('%s carries the version and the tool', (file) => {
    const head = fs
      .readFileSync(path.join(here, 'generated', file), 'utf8')
      .split('\n')
      .slice(0, 3)
    expect(head[0]).toBe('// @ts-nocheck')
    expect(head[1]).toBe(`// tricc-lang ${LANG_VERSION} (packages/core/src/lang/VERSION)`)
    expect(head[2]).toMatch(/^\/\/ Generated from .+ by ANTLR 4\.13\.2$/)
  })

  const java = (() => {
    try {
      execFileSync('java', ['-version'], { stdio: 'ignore' })
      return Boolean(generator.antlrJar())
    } catch {
      return false
    }
  })()
  it.skipIf(!java)(
    'matches a fresh ANTLR 4.13.2 generation',
    () => {
      execFileSync(process.execPath, [
        path.join(root, 'scripts/generate-lang-parsers.mjs'),
        '--check',
      ])
    },
    120_000,
  )
})

describe('CQL profile', () => {
  it.each([
    '"weight" > 38 and AgeInDays() < 60',
    '\'rash\' not in "symptoms"',
    '{{x}}',
    '{{ x | raw }} + 1',
    "DMN('diazepam', Tuple{ weight: null })",
  ])('accepts %s', (text) => {
    expect(parseCql(text).errors).toEqual([])
  })

  const message = (construct: string) =>
    errors.constructs.find((c) => c.construct === construct)!.message
  it.each([
    ['"Observation" O where O.value > 3', 'query', 16],
    ['[Observation]', 'retrieve', 0],
    ['"a" union "b"', 'union', 4],
    ['"list"[0]', 'indexer', 6],
    ['"patient".birthDate', 'member', 9],
    ["5 'mg'", 'unit', 2],
    ['Today() - 3 days', 'unit', 12],
    ['years between "dob" and Today()', 'plural_precision', 0],
  ])('rejects %s as %s', (text, construct, column) => {
    const [error, ...rest] = parseCql(text).errors
    expect(rest).toEqual([])
    expect(error).toEqual({
      code: 'E_CQL_PROFILE',
      message: message(construct),
      line: 1,
      column,
      construct,
    })
  })

  it('reports a plain syntax error at the column of the expression', () => {
    const [error] = parseCql('"a" > ').errors
    expect(error).toMatchObject({ code: 'E_CQL_SYNTAX', line: 1, column: 6 })
  })

  it('names the operators and functions an expression uses', () => {
    const use = cqlUses(
      'Max("w", 3) > 2 and "#age" < 6 and GetPatientValue(\'x\') = 1 and DMN(\'t\', 1) = 2',
    )
    expect([...use.operators].sort()).toEqual(['AND', 'EQUAL', 'LESS', 'MAX', 'MORE', 'NATIVE'])
    expect([...use.functions]).toEqual(['GetPatientValue'])
    expect([...use.retrievals]).toEqual(['#age'])
    expect(use.tableCalls).toBe(1)
  })
})

describe('meaning.json', () => {
  it.each(MEANING.parse)('$text is a $kind', (c) => {
    const { kind, value } = cqlKind(c.text)
    expect(kind).toBe(c.kind)
    if ('value' in c) expect(value).toBe(c.value)
  })
  it.each(MEANING.expression_arg)('isExpressionArg($arg) is $expression', (c) => {
    expect(isExpressionArg(c.arg)).toBe(c.expression)
  })
  it.each(MEANING.literal_value)('literalValue($arg) is $value', (c) => {
    expect(literalValue(c.arg)).toBe(c.value)
  })
  it.each(MEANING.feel_text)("$tricc is FEEL's $feel", (c) => {
    const type: CellColumnType = c.tricc.includes("'") ? 'string' : 'decimal'
    expect(parseCell(c.tricc, type)).toEqual(parseCell(c.feel, type))
  })
})

describe('feel/cells.json', () => {
  type Case = {
    cell: string
    type: CellColumnType
    error?: string
    pass?: unknown[]
    fail?: unknown[]
  }
  it.each(CELL_VECTORS.cases as Case[])('$cell ($type)', (c) => {
    if (c.error) {
      expect(() => parseCell(c.cell, c.type)).toThrowError(CellError)
      try {
        parseCell(c.cell, c.type)
      } catch (e) {
        expect((e as CellError).code).toBe(c.error)
      }
      return
    }
    const test = parseCell(c.cell, c.type)
    for (const v of c.pass ?? []) expect(cellMatches(test, v as never)).toBe(true)
    for (const v of c.fail ?? []) expect(cellMatches(test, v as never)).toBe(false)
  })
})

describe('validation with the shared parser', () => {
  function project(expression: string, arg: string | number): Project {
    const p = createProject({ id: 'p', title: 'P' })
    const block = createBlock({ id: 'temp', title: 'Temperature' })
    block.params = [{ name: 'threshold', type: 'number', default: 37.5 }]
    const page = createActivity({ id: 'danger', title: 'Danger' })
    const q: TriccNode = { id: 'q', type: 'decimal', name: 'weight', relevance: { expression } }
    const use: TriccNode = {
      id: 'use',
      type: 'block',
      link: 'temp',
      args: { threshold: arg },
      ui: { x: 0, y: 0 },
    }
    for (const n of [q, use]) {
      page.nodes[n.id] = n
      page.nodeOrder.push(n.id)
    }
    p.activities = { temp: block, danger: page }
    return p
  }

  it('flags an expression outside the profile, with its column', () => {
    const issues = validateProject(project('"a"[0] > 1', 38), { lang: langValidation })
    const cql = issues.filter((i) => i.rule === 'expression.cql')
    expect(cql).toHaveLength(1)
    expect(cql[0]).toMatchObject({
      severity: 'error',
      location: { activityId: 'danger', nodeId: 'q', field: 'relevance' },
    })
    expect(cql[0]!.message).toContain('(column 4)')
  })

  it('does not parse CQL without the option', () => {
    const issues = validateProject(project('"a"[0] > 1', 38))
    expect(issues.some((i) => i.rule === 'expression.cql')).toBe(false)
  })

  it('takes an expression argument as calculated, not as a wrong number', () => {
    const rules = (lang?: typeof langValidation) =>
      validateProject(project('"a" > 1', 'AgeInDays() / 30'), lang ? { lang } : {}).map(
        (i) => i.rule,
      )
    expect(rules()).toContain('call.value-not-allowed')
    expect(rules(langValidation)).not.toContain('call.value-not-allowed')
  })
})
