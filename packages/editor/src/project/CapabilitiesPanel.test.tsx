import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createProject,
  createTriccRuntime,
  type CapabilityRegistry,
  type CapabilityRegistryFactory,
  type OpenProject,
  type Statement,
} from '@tricc/core'
import {
  MemoryCatalog,
  MemoryIdentity,
  MemoryPersistence,
  memoryAdapters,
} from '@tricc/adapters-memory'
import { OpenProjectProvider, TriccRuntimeProvider } from '../runtime/context.js'
import { ProjectOverview } from './Overview.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name: string): Statement =>
  JSON.parse(fs.readFileSync(path.join(here, '__fixtures__', `${name}.json`), 'utf8'))

/** A registry in memory: the published statements, by package and version. Never the network. */
function mockRegistry(calls: string[]): CapabilityRegistryFactory {
  const xlsform = fixture('xlsform')
  const cdss = fixture('xlsform-cdss')
  const fhir = fixture('fhir')
  const fhir11: Statement = {
    ...fhir,
    version: '1.1.0',
    operators: { ...fhir.operators, MAX: ['inline', 'library'] },
  }
  const published: Record<string, Statement[]> = {
    [xlsform.id]: [xlsform],
    [cdss.id]: [cdss],
    [fhir.id]: [fhir, fhir11],
  }
  return (source, token) => {
    calls.push(`${source}${token ? `:${token}` : ''}`)
    const registry: CapabilityRegistry = {
      source,
      url: source === 'github' ? 'https://npm.pkg.github.com' : 'https://registry.npmjs.org',
      list: async () =>
        Object.values(published).map((versions) => ({
          package: versions[0]!.id,
          version: versions[0]!.version,
        })),
      versions: async (pkg) => (published[pkg] ?? []).map((s) => s.version),
      fetchStatement: async (pkg, version) => {
        const s = published[pkg]?.find((v) => v.version === version)
        if (!s) throw new Error(`${pkg}@${version} not found`)
        return s
      },
    }
    return registry
  }
}

async function harness(
  calls: string[],
): Promise<{ runtime: ReturnType<typeof createTriccRuntime>; open: OpenProject }> {
  const runtime = createTriccRuntime({
    ...memoryAdapters({
      persistence: new MemoryPersistence(),
      catalog: new MemoryCatalog(),
      identity: new MemoryIdentity(),
    }),
    capabilityRegistry: mockRegistry(calls),
  })
  const project = createProject({ id: 'p', title: 'P' })
  const open = await runtime.create('P', project)
  return { runtime, open }
}

beforeEach(cleanup)

describe('the Outputs tab', () => {
  it('lists the published statements for a new project, adds one with its parent, activates and removes', async () => {
    const user = userEvent.setup()
    const calls: string[] = []
    const h = await harness(calls)
    render(
      <TriccRuntimeProvider runtime={h.runtime}>
        <OpenProjectProvider project={h.open}>
          <ProjectOverview />
        </OpenProjectProvider>
      </TriccRuntimeProvider>,
    )
    await user.click(screen.getByTestId('tab-outputs'))
    expect(screen.getByTestId('capabilities-empty')).toBeInTheDocument()
    const published = await screen.findByTestId('capability-published')
    expect(within(published).getByText('@tricc/capabilities-fhir')).toBeInTheDocument()

    await user.click(screen.getByTestId('capability-add-@tricc/capabilities-xlsform-cdss'))
    await screen.findByTestId('capability-@tricc/capabilities-xlsform-cdss')
    const project = () => h.open.document.snapshot()
    expect(project().capabilities!.map((c) => [c.package, c.active, c.source])).toEqual([
      ['@tricc/capabilities-xlsform-cdss', true, 'npm'],
      ['@tricc/capabilities-xlsform', false, 'npm'],
    ])
    expect(Object.keys(project().capabilityFiles!)).toEqual([
      'capabilities/@tricc/capabilities-xlsform-cdss@1.0.0.json',
      'capabilities/@tricc/capabilities-xlsform@1.0.0.json',
    ])

    await user.click(screen.getByTestId('capability-active-@tricc/capabilities-xlsform'))
    expect(
      project().capabilities!.find((c) => c.package === '@tricc/capabilities-xlsform')!.active,
    ).toBe(true)

    await user.click(screen.getByTestId('capability-remove-@tricc/capabilities-xlsform-cdss'))
    expect(project().capabilities!.map((c) => c.package)).toEqual(['@tricc/capabilities-xlsform'])
    expect(calls.every((c) => c === 'npm')).toBe(true)
  })

  it('updates a statement after showing what changes', async () => {
    const user = userEvent.setup()
    const h = await harness([])
    render(
      <TriccRuntimeProvider runtime={h.runtime}>
        <OpenProjectProvider project={h.open}>
          <ProjectOverview />
        </OpenProjectProvider>
      </TriccRuntimeProvider>,
    )
    await user.click(screen.getByTestId('tab-outputs'))
    await user.click(await screen.findByTestId('capability-add-@tricc/capabilities-fhir'))
    await user.click(await screen.findByTestId('capability-update-@tricc/capabilities-fhir'))
    const changes = await screen.findByTestId('capability-changes')
    expect(changes).toHaveTextContent('added: MAX:inline')
    await user.click(screen.getByTestId('capability-apply'))
    await waitFor(() =>
      expect(h.open.document.snapshot().capabilities![0]).toMatchObject({
        version: '1.1.0',
        active: true,
      }),
    )
  })

  it('uploads a statement file and asks for its parent', async () => {
    const user = userEvent.setup()
    const h = await harness([])
    render(
      <TriccRuntimeProvider runtime={h.runtime}>
        <OpenProjectProvider project={h.open}>
          <ProjectOverview />
        </OpenProjectProvider>
      </TriccRuntimeProvider>,
    )
    await user.click(screen.getByTestId('tab-outputs'))
    const file = new File([JSON.stringify(fixture('xlsform-cdss'))], 'statement.json', {
      type: 'application/json',
    })
    await user.upload(screen.getByTestId('capability-file'), file)
    expect(await screen.findByTestId('capability-message')).toHaveTextContent(
      'extends @tricc/capabilities-xlsform: load it too',
    )
    expect(h.open.document.snapshot().capabilities![0]).toMatchObject({
      source: 'file',
      active: true,
    })

    const bad = new File(['{"id": "x"}'], 'bad.json', { type: 'application/json' })
    await user.upload(screen.getByTestId('capability-file'), bad)
    expect(await screen.findByTestId('capability-message')).toHaveTextContent(
      'bad.json is not a capability statement',
    )
  })
})
