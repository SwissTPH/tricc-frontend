import { beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createProject, createTriccRuntime, type OpenProject, type Project } from '@tricc/core'
import {
  MemoryCatalog,
  MemoryIdentity,
  MemoryPersistence,
  memoryAdapters,
} from '@tricc/adapters-memory'
import { TriccRuntimeProvider } from '../runtime/context.js'
import { TERMS } from '../blocks/terms.js'
import { ProjectWorkspace, type ProjectWorkspaceFrame } from './ProjectWorkspace.js'

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

async function openProject(): Promise<{
  runtime: ReturnType<typeof createTriccRuntime>
  open: OpenProject
}> {
  const persistence = new MemoryPersistence()
  const identity = new MemoryIdentity()
  const runtime = createTriccRuntime(
    memoryAdapters({ persistence, catalog: new MemoryCatalog(), identity }),
  )
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

  it('shows the segments and activities as a grid from their tabs, and opens a card', async () => {
    const user = userEvent.setup()
    const { runtime, open } = await openProject()
    render(
      <TriccRuntimeProvider runtime={runtime}>
        <ProjectWorkspace
          project={open}
          frame={({ crumbs, body }) => (
            <div>
              <header>{crumbs}</header>
              <main>{body}</main>
            </div>
          )}
        />
      </TriccRuntimeProvider>,
    )

    await user.click(screen.getByTestId('tab-processes'))
    expect(screen.getByTestId('library-view-process')).toBeInTheDocument()
    expect(screen.getByTestId('crumb-extra')).toHaveTextContent('Segments')

    await user.click(screen.getByTestId('tab-activities'))
    expect(screen.getByTestId('library-view-activity')).toBeInTheDocument()
    expect(screen.getByTestId('crumb-extra')).toHaveTextContent('Activities')
    expect(screen.getByTestId('library-grid-activity')).toContainElement(
      screen.getByTestId('library-card-triage'),
    )

    await user.type(screen.getByTestId('library-search-activity'), 'nothing like it')
    expect(screen.getByTestId('library-no-match-activity')).toBeInTheDocument()
    await user.clear(screen.getByTestId('library-search-activity'))

    await user.click(screen.getByTestId('library-card-triage'))
    expect(screen.queryByTestId('library-view-activity')).not.toBeInTheDocument()
    expect(screen.getByTestId('activity-editor')).toBeInTheDocument()
    expect(screen.getByTestId('crumb-triage')).toHaveTextContent('Triage')
  })

  it('opens the building blocks and names them in the breadcrumbs', async () => {
    const user = userEvent.setup()
    const { runtime, open } = await openProject()
    render(
      <TriccRuntimeProvider runtime={runtime}>
        <ProjectWorkspace
          project={open}
          frame={({ crumbs, body }) => (
            <div>
              <header>{crumbs}</header>
              <main>{body}</main>
            </div>
          )}
        />
      </TriccRuntimeProvider>,
    )

    await user.click(screen.getByTestId('tab-blocks'))
    expect(screen.getByTestId('blocks-view')).toBeInTheDocument()
    expect(screen.getByTestId('crumb-extra')).toHaveTextContent(TERMS.blocks)

    // An activity opened from the navigator leaves the blocks view.
    await user.click(screen.getByTestId('tab-activities'))
    await user.click(screen.getByTestId('nav-activity-triage'))
    expect(screen.queryByTestId('blocks-view')).not.toBeInTheDocument()
    expect(screen.getByTestId('activity-editor')).toBeInTheDocument()
  })

  it('hands the host showDiscussion, which opens the activity on its discussion', async () => {
    const { runtime, open } = await openProject()
    let show: ProjectWorkspaceFrame['showDiscussion'] | undefined
    render(
      <TriccRuntimeProvider runtime={runtime}>
        <ProjectWorkspace
          project={open}
          frame={({ crumbs, body, showDiscussion }) => {
            show = showDiscussion
            return (
              <div>
                <header>{crumbs}</header>
                <main>{body}</main>
              </div>
            )
          }}
        />
      </TriccRuntimeProvider>,
    )
    expect(screen.getByTestId('project-overview')).toBeInTheDocument()

    act(() => show!({ kind: 'node', activityId: 'triage', nodeId: 's' }, 'thread-1'))
    expect(screen.getByTestId('activity-editor')).toBeInTheDocument()
    expect(screen.getByTestId('crumb-triage')).toBeInTheDocument()
    expect(screen.getByTestId('tab-discussion')).toHaveAttribute('aria-selected', 'true')
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
