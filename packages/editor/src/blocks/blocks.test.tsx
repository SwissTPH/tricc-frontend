import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  activityKind,
  calculateCodeSystem,
  createActivity,
  createBlock,
  createProcessActivity,
  createProject,
  createTriccRuntime,
  type OpenProject,
  type Project,
  type TriccRuntime,
} from '@tricc/core'
import {
  MemoryCatalog,
  MemoryIdentity,
  MemoryPersistence,
  memoryAdapters,
} from '@tricc/adapters-memory'
import { OpenProjectProvider, TriccRuntimeProvider } from '../runtime/context.js'
import { ActivityNavigator } from '../project/ActivityNavigator.js'
import { ActivityEditor } from '../activity/ActivityEditor.js'
import { ProjectOverview } from '../project/Overview.js'
import { DictionaryView } from '../terminology/DictionaryView.js'
import { BlocksView } from './BlocksView.js'

/** Building blocks, parameters and values (feature/20261028-snippets-tab-and-params.md §13). */

interface Harness {
  runtime: TriccRuntime
  open: OpenProject
}

function seed(): Project {
  const project = createProject({ id: 'demo', title: 'Demo' })
  const block = createBlock({ id: 'temp', title: 'Measure temperature' })
  block.params = [
    { name: 'site', type: 'choice', options: ['axillary', 'rectal', 'oral'], required: true },
    { name: 'threshold', type: 'number', default: 37.5 },
  ]
  block.nodes['q'] = {
    id: 'q',
    type: 'decimal',
    name: 'temp_{{site}}',
    relevance: { expression: '"x" > {{threshold}}' },
  }
  block.nodeOrder.push('q')
  const danger = createActivity({ id: 'danger', title: 'Danger signs' })
  const triage = createProcessActivity({ id: 'triage', process: 'triage', calls: ['danger'] })
  project.activities = { temp: block, danger, triage }
  project.interventions = [
    { id: 'iv', title: { en: 'Young infant' }, activities: [{ ref: 'triage' }] },
  ]
  return project
}

async function harness(project = seed()): Promise<Harness> {
  const adapters = memoryAdapters({
    persistence: new MemoryPersistence(),
    catalog: new MemoryCatalog(),
    identity: new MemoryIdentity(),
  })
  const runtime = createTriccRuntime(adapters)
  const open = await runtime.create('Demo', project)
  return { runtime, open }
}

function renderWith(h: Harness, ui: React.ReactNode) {
  return render(
    <TriccRuntimeProvider runtime={h.runtime}>
      <OpenProjectProvider project={h.open}>{ui}</OpenProjectProvider>
    </TriccRuntimeProvider>,
  )
}

const snapshot = (h: Harness) => h.open.document.snapshot()

beforeEach(cleanup)

describe('the Building blocks tab', () => {
  it('lists blocks apart from activities and creates one', async () => {
    const h = await harness()
    let opened: string | undefined
    renderWith(
      h,
      <ActivityNavigator
        selected={undefined}
        onSelect={(id) => (opened = id)}
        onOpenBlocks={() => {}}
      />,
    )
    expect(
      within(screen.getByTestId('activity-list')).queryByTestId('nav-activity-temp'),
    ).toBeNull()
    await userEvent.click(screen.getByTestId('tab-blocks'))
    expect(
      within(screen.getByTestId('block-list')).getByTestId('nav-activity-temp').textContent,
    ).toContain('2 params')
    await userEvent.click(screen.getByTestId('add-building-block'))
    const name = screen.getByTestId('new-block-name')
    await userEvent.clear(name)
    await userEvent.type(name, 'Weigh child')
    await userEvent.click(screen.getByTestId('create-block'))
    expect(opened).toBe('weigh-child')
    expect(activityKind(snapshot(h).activities['weigh-child']!)).toBe('block')
  })

  it('shows uses and blocks deleting a block in use', async () => {
    const project = seed()
    project.activities['danger']!.nodes['use'] = {
      id: 'use',
      type: 'block',
      link: 'temp',
      args: { site: 'oral' },
    }
    project.activities['danger']!.nodeOrder.push('use')
    const h = await harness(project)
    renderWith(h, <BlocksView onOpenBlock={() => {}} />)
    expect(screen.getByTestId('block-temp-summary').textContent).toContain('used in 1 place')
    expect(screen.getByTestId('block-use-danger-use').textContent).toBe('oral')
    await userEvent.click(screen.getByTestId('block-delete-temp'))
    expect(screen.getByTestId('delete-block-blocked')).toBeTruthy()
    expect(snapshot(h).activities['temp']).toBeDefined()
  })
})

describe('parameters', () => {
  it('adds a parameter in the settings, with a concept in the calculate dictionary', async () => {
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="temp" />)
    await userEvent.click(screen.getByTestId('configure-activity'))
    await userEvent.type(screen.getByTestId('param-new-label'), 'Lab available')
    await userEvent.click(screen.getByTestId('param-add'))
    const params = snapshot(h).activities['temp']!.params!
    expect(params.map((p) => p.name)).toEqual(['site', 'threshold', 'lab_available'])
    expect(params[2]).toEqual({ name: 'lab_available', type: 'string' })
    const concept = calculateCodeSystem(snapshot(h))!.concepts['param_temp_lab_available']!
    expect(concept.kind).toBe('parameter')
    expect(concept.display).toBe('Lab available')
    await userEvent.click(screen.getByTestId('param-lab_available-type-boolean'))
    expect(snapshot(h).activities['temp']!.params![2]!.type).toBe('boolean')
  })

  it('shows a computed row read-only, from the block it comes from', async () => {
    const project = seed()
    project.activities['danger']!.nodes['use'] = {
      id: 'use',
      type: 'block',
      link: 'temp',
      args: { threshold: 38 },
    }
    project.activities['danger']!.nodeOrder.push('use')
    const h = await harness(project)
    renderWith(h, <ActivityEditor activityId="danger" />)
    await userEvent.click(screen.getByTestId('configure-activity'))
    const row = screen.getByTestId('param-site')
    expect(row.dataset['kind']).toBe('computed')
    expect(within(row).getByTestId('param-site-from-temp').textContent).toContain(
      'Measure temperature',
    )
  })

  it('marks parameter concepts in the dictionary and keeps their declaration read-only', async () => {
    const h = await harness()
    h.open.document.transact((tx) => tx.syncParams())
    const cs = calculateCodeSystem(snapshot(h))!
    renderWith(
      h,
      <DictionaryView
        system={cs.url}
        open={{ system: cs.url, code: 'param_temp_site' }}
        onOpen={() => {}}
      />,
    )
    expect(screen.getByTestId('concept-row-param_temp_site-parameter')).toBeTruthy()
    expect(screen.getByTestId('concept-parameter-badge')).toBeTruthy()
    expect((screen.getByTestId('concept-data-type') as HTMLSelectElement).disabled).toBe(true)
    expect((screen.getByTestId('concept-display') as HTMLInputElement).disabled).toBe(false)
    expect(screen.queryByTestId('concept-delete')).toBeNull()
  })
})

describe('using a block', () => {
  it('adds a Use block node, picks the block and fills its values', async () => {
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="danger" />)
    await userEvent.click(screen.getByTestId('add-block'))
    const id = Object.values(snapshot(h).activities['danger']!.nodes).find(
      (n) => n.type === 'block',
    )!.id
    await userEvent.type(screen.getByTestId('field-block'), 'Measure')
    await userEvent.click(await screen.findByRole('option', { name: /Measure temperature/ }))
    expect(snapshot(h).activities['danger']!.nodes[id]!.link).toBe('temp')

    fireEvent.change(screen.getByTestId('call-arg-site-mode'), { target: { value: 'set' } })
    fireEvent.change(screen.getByTestId('call-arg-site-value'), { target: { value: 'rectal' } })
    expect(snapshot(h).activities['danger']!.nodes[id]!.args).toEqual({ site: 'rectal' })
    await waitFor(() =>
      expect(screen.getByTestId(`node-${id}-label`).textContent).toBe('Measure temperature'),
    )
    expect(screen.getByTestId(`node-${id}-args`).textContent).toBe('rectal')
    // Threshold is left to its default here, so it becomes a setting of this activity.
    expect(snapshot(h).activities['danger']!.params?.map((p) => p.name)).toEqual(['threshold'])
  })
})

describe('intervention settings', () => {
  it('asks once for each setting the intervention needs and stores the value', async () => {
    const project = seed()
    project.activities['danger']!.nodes['use'] = { id: 'use', type: 'block', link: 'temp' }
    project.activities['danger']!.nodeOrder.push('use')
    const h = await harness(project)
    h.open.document.transact((tx) => tx.syncParams())
    renderWith(h, <ProjectOverview />)
    await userEvent.click(screen.getByTestId('configure-intervention-iv'))
    const settings = screen.getByTestId('iv-settings-iv')
    expect(within(settings).getByTestId('iv-arg-iv-site-needs-value')).toBeTruthy()
    fireEvent.change(within(settings).getByTestId('iv-arg-iv-site-mode'), {
      target: { value: 'set' },
    })
    fireEvent.change(within(settings).getByTestId('iv-arg-iv-site-value'), {
      target: { value: 'oral' },
    })
    expect(snapshot(h).interventions[0]!.args).toEqual({ site: 'oral' })
  })
})
