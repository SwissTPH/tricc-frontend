import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createProject, createTriccRuntime, type OpenProject, type Project } from '@tricc/core'
import { MemoryCatalog, MemoryIdentity, MemoryPersistence, memoryAdapters } from '@tricc/adapters-memory'
import { TriccRuntimeProvider } from '../runtime/context.js'
import { ProjectWorkspace } from './ProjectWorkspace.js'

function seed(): Project {
  const project = createProject({ id: 'test-guideline', title: 'Test guideline' })
  project.activities['triage'] = {
    id: 'triage',
    title: { en: 'Triage' },
    nodeOrder: ['s'],
    edgeOrder: [],
    nodes: { s: { id: 's', type: 'activity_start', name: 'triage', ui: { x: 0, y: 0 } } },
    edges: {},
  }
  return project
}

async function openProject(): Promise<{ runtime: ReturnType<typeof createTriccRuntime>; open: OpenProject }> {
  const persistence = new MemoryPersistence()
  const identity = new MemoryIdentity()
  const runtime = createTriccRuntime(memoryAdapters({ persistence, catalog: new MemoryCatalog(), identity }))
  const open = await runtime.create('Test guideline', seed())
  return { runtime, open }
}

beforeEach(cleanup)

describe('ProjectWorkspace', () => {
  it('opens the overview, then an activity, the dictionary and media', async () => {
    const user = userEvent.setup()
    const { runtime, open } = await openProject()
    render(
      <TriccRuntimeProvider runtime={runtime}>
        <ProjectWorkspace
          project={open}
          onHome={() => {}}
          frame={({ crumbs, body }) => (
            <div>
              <header>{crumbs}</header>
              <main>{body}</main>
            </div>
          )}
        />
      </TriccRuntimeProvider>,
    )

    expect(screen.getByTestId('project-overview')).toBeInTheDocument()
    expect(screen.getByTestId('nav-overview')).toHaveTextContent('Test guideline')

    await user.click(screen.getByTestId('nav-activity-triage'))
    expect(screen.getByTestId('activity-editor')).toBeInTheDocument()
    expect(screen.getByTestId('crumb-triage')).toHaveTextContent('Triage')

    await user.click(screen.getByTestId('tab-dictionary'))
    expect(screen.getByTestId('dictionary-view')).toBeInTheDocument()
    expect(screen.getByTestId('crumb-extra')).toHaveTextContent('Data dictionary')

    await user.click(screen.getByTestId('tab-media'))
    expect(screen.getByTestId('media-view')).toBeInTheDocument()
    expect(screen.getByTestId('crumb-extra')).toHaveTextContent('Media')

    await user.click(screen.getByTestId('nav-overview'))
    expect(screen.getByTestId('project-overview')).toBeInTheDocument()
  })

  it('keeps the open activity while the host has no project, then shows it again', async () => {
    const user = userEvent.setup()
    const { runtime, open } = await openProject()
    const { rerender } = render(
      <TriccRuntimeProvider runtime={runtime}>
        <ProjectWorkspace
          project={open}
          onHome={() => {}}
          frame={({ crumbs, body }) => (
            <div>
              <header>{crumbs}</header>
              <main>{body}</main>
            </div>
          )}
        />
      </TriccRuntimeProvider>,
    )
    await user.click(screen.getByTestId('nav-activity-triage'))

    rerender(
      <TriccRuntimeProvider runtime={runtime}>
        <ProjectWorkspace
          onHome={() => {}}
          frame={({ crumbs, body }) => (
            <div>
              <header>{crumbs}</header>
              <main>{body}</main>
            </div>
          )}
        />
      </TriccRuntimeProvider>,
    )
    expect(screen.queryByTestId('activity-editor')).not.toBeInTheDocument()

    rerender(
      <TriccRuntimeProvider runtime={runtime}>
        <ProjectWorkspace
          project={open}
          onHome={() => {}}
          frame={({ crumbs, body }) => (
            <div>
              <header>{crumbs}</header>
              <main>{body}</main>
            </div>
          )}
        />
      </TriccRuntimeProvider>,
    )
    expect(screen.getByTestId('activity-editor')).toBeInTheDocument()
    expect(screen.getByTestId('crumb-triage')).toBeInTheDocument()
  })
})
