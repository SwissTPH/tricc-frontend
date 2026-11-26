import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync, strToU8 } from 'fflate'
import * as Y from 'yjs'
import { describe, expect, it } from 'vitest'
import { createProject, readProject, writeProject } from '../format/serialize/index.js'
import { projectFromDoc, projectToDoc } from '../document/codec.js'
import type { Project } from '../model/types.js'
import {
  GITHUB_REGISTRY,
  createNpmRegistry,
  diffStatements,
  projectStatements,
  resolveStatement,
  sha256Hex,
  statementProblem,
  statementSet,
  statementWrites,
  tarFile,
  versionSatisfies,
  withActive,
  withStatement,
  withoutStatement,
  type Fetch,
  type Statement,
} from './index.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name: string): Statement =>
  JSON.parse(fs.readFileSync(path.join(here, '__fixtures__', `${name}.json`), 'utf8'))
const STATEMENTS = ['xlsform', 'xlsform-cdss', 'xlsform-cht', 'fhir', 'fhir-strict'].map(fixture)
const byId = new Map(STATEMENTS.map((s) => [s.id, s]))

describe('sha256', () => {
  it.each(['', 'abc', 'é'.repeat(100), JSON.stringify(STATEMENTS)])(
    'matches node crypto',
    (text) => {
      expect(sha256Hex(text)).toBe(createHash('sha256').update(text).digest('hex'))
    },
  )
})

describe('statements', () => {
  it.each(STATEMENTS.map((s) => [s.id, s] as const))('%s follows the schema', (_id, s) => {
    expect(statementProblem(s)).toBeUndefined()
  })

  it.each([
    [{ id: 'x' }, 'version: required'],
    [{ ...fixture('fhir'), operators: undefined }, 'operators: required'],
    [{ ...fixture('fhir'), color: 'red' }, 'color: not allowed'],
    [
      { ...fixture('fhir'), retrieval_contexts: ['moon'] },
      'retrieval_contexts: not a list of contexts',
    ],
    [
      { ...fixture('xlsform-cdss'), functions: ['Abs'] },
      'functions: a child statement lists it under add / remove',
    ],
    [
      { ...fixture('fhir'), limits: { inline_decision_table_rows: -1 } },
      'limits/inline_decision_table_rows: not a whole number',
    ],
  ])('refuses %#', (data, problem) => {
    expect(statementProblem(data)).toBe(problem)
  })

  it('resolves extends: a child adds and removes', () => {
    const cht = resolveStatement('@tricc/capabilities-xlsform-cht', byId)
    expect(cht.chain).toEqual([
      '@tricc/capabilities-xlsform-cht@1.0.0',
      '@tricc/capabilities-xlsform-cdss@1.0.0',
      '@tricc/capabilities-xlsform@1.0.0',
    ])
    expect(statementWrites(cht, 'AGE_DAY', 'form')).toBe(true)
    expect(statementWrites(resolveStatement('@tricc/capabilities-xlsform', byId), 'AGE_DAY')).toBe(
      false,
    )
    expect(
      resolveStatement('@acme/capabilities-fhir-strict', byId).limits.inline_decision_table_rows,
    ).toBe(5)
  })

  it('fails on a missing parent or one out of range', () => {
    expect(() =>
      resolveStatement(
        '@tricc/capabilities-xlsform-cdss',
        new Map([['@tricc/capabilities-xlsform-cdss', fixture('xlsform-cdss')]]),
      ),
    ).toThrow(/not loaded/)
    const old = new Map(byId)
    old.set('@tricc/capabilities-xlsform', { ...fixture('xlsform'), version: '2.0.0' })
    expect(() => resolveStatement('@tricc/capabilities-xlsform-cdss', old)).toThrow(
      /the project has 2.0.0/,
    )
  })

  it.each([
    ['1.4.0', '^1.0.0', true],
    ['2.0.0', '^1.0.0', false],
    ['1.5.0', '~1.4.0', false],
    ['0.2.1', '^0.2.0', true],
    ['1.0.0', '>=1.0.0 <2.0.0', true],
    ['1.2.3', '1.x', true],
    ['3.0.0', '^1.0.0 || ^3.0.0', true],
  ])('%s in %s: %s', (v, r, ok) => {
    expect(versionSatisfies(v, r)).toBe(ok)
  })

  it('summarises an update', () => {
    const before = resolveStatement('@tricc/capabilities-xlsform', byId)
    const after = resolveStatement('@tricc/capabilities-xlsform-cdss', byId)
    const changes = diffStatements(before, after)
    expect(changes['operators']!.added).toEqual(['AGE_DAY:form', 'AGE_MONTH:form', 'AGE_YEAR:form'])
    expect(changes['functions']!.added).toEqual(['AgeInDays', 'AgeInMonths', 'AgeInYears'])
  })
})

function withStatements(active: string[]): Project {
  const project = createProject({ id: 'p', title: 'P' })
  let set = statementSet(project)
  for (const s of STATEMENTS)
    set = withStatement(
      set,
      s,
      { source: 'npm', registry: 'https://registry.npmjs.org' },
      active.includes(s.id),
    )
  project.capabilities = set.entries
  project.capabilityFiles = set.files
  return project
}

describe('the project', () => {
  it('writes tricc.yaml capabilities and the copies, and reads them back unchanged', () => {
    const project = withStatements(['@tricc/capabilities-fhir'])
    const files = writeProject(project)
    expect(files['capabilities/@tricc/capabilities-fhir@1.0.0.json']).toBe(
      project.capabilityFiles!['capabilities/@tricc/capabilities-fhir@1.0.0.json'],
    )
    expect(files['tricc.yaml']).toContain(
      'capabilities:\n  - package: "@tricc/capabilities-xlsform"',
    )
    const back = readProject(files).project
    expect(back.capabilities).toEqual(project.capabilities)
    expect(back.capabilityFiles).toEqual(project.capabilityFiles)
    expect(writeProject(back)).toEqual(files)
  })

  it('keeps them through the shared document', () => {
    const project = withStatements(['@tricc/capabilities-fhir'])
    const doc = new Y.Doc()
    projectToDoc(project, doc)
    const back = projectFromDoc(doc)
    expect(back.capabilities).toEqual(project.capabilities)
    expect(back.capabilityFiles).toEqual(project.capabilityFiles)
  })

  it('loads and resolves only the active statements', () => {
    const { active, issues } = projectStatements(
      withStatements(['@acme/capabilities-fhir-strict']),
      '1.0.0',
    )
    expect(issues).toEqual([])
    expect(active.map((s) => s.id)).toEqual(['@acme/capabilities-fhir-strict'])
  })

  it('reports a bad sha256, a missing parent and a lang range', () => {
    const project = withStatements([
      '@tricc/capabilities-xlsform-cdss',
      '@acme/capabilities-fhir-strict',
    ])
    project.capabilities = project.capabilities!.map((e) =>
      e.package === '@tricc/capabilities-xlsform' ? { ...e, sha256: '0'.repeat(64) } : e,
    )
    const rules = projectStatements(project, '2.0.0').issues.map((i) => i.rule)
    expect(rules).toEqual(['capability.file', 'capability.extends', 'capability.lang'])
  })

  it('activates, replaces and removes a statement with its copy', () => {
    let set = statementSet(withStatements([]))
    set = withActive(set, '@tricc/capabilities-fhir', true)
    expect(set.entries.find((e) => e.package === '@tricc/capabilities-fhir')!.active).toBe(true)
    set = withStatement(set, { ...fixture('fhir'), version: '1.1.0' }, { source: 'file' })
    const fhir = set.entries.find((e) => e.package === '@tricc/capabilities-fhir')!
    expect(fhir).toMatchObject({ version: '1.1.0', source: 'file', active: true })
    expect(Object.keys(set.files)).toContain('capabilities/@tricc/capabilities-fhir@1.1.0.json')
    expect(Object.keys(set.files)).not.toContain('capabilities/@tricc/capabilities-fhir@1.0.0.json')
    set = withoutStatement(set, '@tricc/capabilities-fhir')
    expect(set.entries.some((e) => e.package === '@tricc/capabilities-fhir')).toBe(false)
    expect(Object.keys(set.files).some((f) => f.includes('capabilities-fhir@'))).toBe(false)
  })
})

/** A ustar archive with one file. */
function tar(name: string, text: string): Uint8Array {
  const body = strToU8(text)
  const header = new Uint8Array(512)
  header.set(strToU8(name), 0)
  header.set(strToU8(body.length.toString(8).padStart(11, '0')), 124)
  const out = new Uint8Array(512 + Math.ceil(body.length / 512) * 512 + 1024)
  out.set(header, 0)
  out.set(body, 512)
  return out
}

function mockFetch(calls: { url: string; headers?: Record<string, string> }[]): Fetch {
  const fhir = fixture('fhir')
  const routes: Record<string, unknown> = {
    'https://registry.npmjs.org/-/v1/search?text=%40tricc%2Fcapabilities-&size=250': {
      objects: [
        { package: { name: '@tricc/capabilities-fhir', version: '1.0.0', description: 'FHIR' } },
        { package: { name: '@other/thing', version: '1.0.0' } },
      ],
    },
  }
  const packument = {
    'dist-tags': { latest: '1.0.0' },
    versions: { '0.9.0': {}, '1.0.0': { dist: { tarball: 'https://t/fhir.tgz' } } },
  }
  return async (url, init) => {
    calls.push({ url, ...(init?.headers ? { headers: init.headers } : {}) })
    if (url.endsWith('%2fcapabilities-fhir')) return response(packument)
    if (url === 'https://t/fhir.tgz')
      return response(gzipSync(tar('package/statement.json', JSON.stringify(fhir))))
    if (url in routes) return response(routes[url])
    return {
      ok: false,
      status: 404,
      json: async () => ({}),
      arrayBuffer: async () => new ArrayBuffer(0),
    }
  }
}

function response(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    arrayBuffer: async () => (body as Uint8Array).slice().buffer as ArrayBuffer,
  }
}

describe('npm registry (mock)', () => {
  it('lists, gives the versions and reads statement.json from the tarball', async () => {
    const calls: { url: string; headers?: Record<string, string> }[] = []
    const registry = createNpmRegistry({ fetch: mockFetch(calls) })
    expect(await registry.list()).toEqual([
      { package: '@tricc/capabilities-fhir', version: '1.0.0', description: 'FHIR' },
    ])
    expect(await registry.versions('@tricc/capabilities-fhir')).toEqual(['0.9.0', '1.0.0'])
    expect(await registry.fetchStatement('@tricc/capabilities-fhir', '1.0.0')).toEqual(
      fixture('fhir'),
    )
    expect(calls.every((c) => !c.headers?.['Authorization'])).toBe(true)
  })

  it('sends the GitHub Packages token and lists the known packages', async () => {
    const calls: { url: string; headers?: Record<string, string> }[] = []
    const registry = createNpmRegistry({
      fetch: mockFetch(calls),
      url: GITHUB_REGISTRY,
      token: 'ghp_x',
    })
    expect(registry.source).toBe('github')
    await registry.list()
    expect(calls.length).toBe(10)
    expect(calls.every((c) => c.headers?.['Authorization'] === 'Bearer ghp_x')).toBe(true)
  })

  it('finds a file in a tar', () => {
    expect(tarFile(tar('package/a.json', '{}'), 'package/a.json')).toEqual(strToU8('{}'))
    expect(tarFile(tar('package/a.json', '{}'), 'package/b.json')).toBeUndefined()
  })
})
