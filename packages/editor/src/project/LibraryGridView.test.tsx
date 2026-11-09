import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createActivity,
  createProcessActivity,
  createProject,
  createTriccRuntime,
  type OpenProject,
  type TriccRuntime,
} from '@tricc/core'
import {
  MemoryCatalog,
  MemoryIdentity,
  MemoryPersistence,
  memoryAdapters,
} from '@tricc/adapters-memory'
import { OpenProjectProvider, TriccRuntimeProvider } from '../runtime/context.js'
import { ActivityNavigator } from './ActivityNavigator.js'
import { LibraryGridView } from './LibraryGridView.js'

async function harness(): Promise<{ runtime: TriccRuntime; open: OpenProject }> {
  const project = createProject({ id: 'demo', title: 'Demo' })
  const danger = createActivity({ id: 'danger', title: 'Danger signs' })
  const cough = createActivity({ id: 'cough', title: 'Cough' })
  const triage = createProcessActivity({ id: 'triage', process: 'triage', calls: ['danger'] })
  project.activities = { danger, cough, triage }
  project.interventions = [{ id: 'iv', title: { en: 'Infant' }, activities: [{ ref: 'triage' }] }]
  const runtime = createTriccRuntime(
    memoryAdapters({
      persistence: new MemoryPersistence(),
      catalog: new MemoryCatalog(),
      identity: new MemoryIdentity(),
    }),
  )
  return { runtime, open: await runtime.create('Demo', project) }
}

function renderWith(h: { runtime: TriccRuntime; open: OpenProject }, ui: React.ReactNode) {
  return render(
    <TriccRuntimeProvider runtime={h.runtime}>
      <OpenProjectProvider project={h.open}>{ui}</OpenProjectProvider>
    </TriccRuntimeProvider>,
  )
}

beforeEach(cleanup)

describe('the segment and activity grid', () => {
  it('lists activities, filters them and opens one', async () => {
    const h = await harness()
    let opened: string | undefined
    renderWith(h, <LibraryGridView kind="activity" onOpen={(id) => (opened = id)} />)
    expect(screen.getByTestId('grid-activity-danger')).toBeTruthy()
    expect(screen.getByTestId('grid-activity-cough')).toBeTruthy()
    expect(screen.queryByTestId('grid-activity-triage')).toBeNull()
    await userEvent.type(screen.getByTestId('activity-grid-search'), 'dang')
    expect(screen.queryByTestId('grid-activity-cough')).toBeNull()
    expect(screen.getByTestId('activity-grid-count').textContent).toBe('1 of 2 activities')
    await userEvent.type(screen.getByTestId('activity-grid-search'), 'zzz')
    expect(screen.getByTestId('activity-grid-no-match')).toBeTruthy()
    await userEvent.clear(screen.getByTestId('activity-grid-search'))
    await userEvent.click(screen.getByTestId('grid-activity-danger'))
    expect(opened).toBe('danger')
  })

  it('lists segments with their process and filters by process', async () => {
    const h = await harness()
    renderWith(h, <LibraryGridView kind="process" onOpen={() => {}} />)
    const card = screen.getByTestId('grid-activity-triage')
    expect(card.textContent).toContain('triage')
    expect(card.textContent).toContain('Used by iv')
    await userEvent.type(screen.getByTestId('process-grid-search'), 'triage')
    expect(screen.getByTestId('grid-activity-triage')).toBeTruthy()
  })

  it('opens the grid from the Segments and Activities tabs', async () => {
    const h = await harness()
    const lists: string[] = []
    renderWith(
      h,
      <ActivityNavigator
        selected={undefined}
        onSelect={() => {}}
        onOpenList={(k) => lists.push(k)}
      />,
    )
    await userEvent.click(screen.getByTestId('tab-processes'))
    await userEvent.click(screen.getByTestId('tab-activities'))
    expect(lists).toEqual(['process', 'activity'])
  })
})
