import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createProject, createTriccRuntime, type Project } from '@tricc/core'
import { MemoryCatalog, MemoryIdentity, memoryAdapters } from '@tricc/adapters-memory'
import { OpenProjectProvider, TriccRuntimeProvider } from '../runtime/context.js'
import { NotificationBell } from './NotificationBell.js'

afterEach(cleanup)

const BOB = { id: 'u-bob', name: 'Bob' }

/** A project where Bob tagged the local author in one open discussion. */
function tagged(id: string, title: string): Project {
  const project = createProject({ id, title })
  project.discussions = {
    d1: {
      id: 'd1',
      about: { kind: 'project' },
      label: title,
      status: 'open',
      labels: [],
      events: [],
      comments: [
        {
          id: 'c1',
          author: BOB,
          at: '2026-11-01T10:00:00Z',
          text: 'Can @[Local author](user:local) check this?',
        },
      ],
    },
  }
  return project
}

async function setup() {
  const identity = new MemoryIdentity()
  const runtime = createTriccRuntime(memoryAdapters({ catalog: new MemoryCatalog(), identity }))
  const a = await runtime.create('A', tagged('a', 'Malaria'))
  const b = await runtime.create('B', createProject({ id: 'b', title: 'Quiet' }))
  return { runtime, a, b }
}

describe('NotificationBell', () => {
  it('on the home page gathers every project, grouped by project', async () => {
    const { runtime } = await setup()
    render(
      <TriccRuntimeProvider runtime={runtime}>
        <NotificationBell onOpen={() => {}} />
      </TriccRuntimeProvider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId('notification-bell').getAttribute('data-unread')).toBe('1'),
    )
    fireEvent.click(screen.getByTestId('notification-bell'))
    expect(await screen.findByText('Malaria', { selector: 'li' })).toBeTruthy()
    expect(screen.getByText(/Bob tagged you/)).toBeTruthy()
  })

  it('inside a project shows only that project', async () => {
    const { runtime, b } = await setup()
    render(
      <TriccRuntimeProvider runtime={runtime}>
        <OpenProjectProvider project={b}>
          <NotificationBell projectId={b.ref.id} onOpen={() => {}} />
        </OpenProjectProvider>
      </TriccRuntimeProvider>,
    )
    fireEvent.click(screen.getByTestId('notification-bell'))
    expect(await screen.findByTestId('notifications-empty')).toBeTruthy()
    expect(screen.getByTestId('notification-bell').getAttribute('data-unread')).toBe('0')
  })

  it('opening an item hands it to the host and marks it read', async () => {
    const { runtime, a } = await setup()
    const onOpen = vi.fn()
    render(
      <TriccRuntimeProvider runtime={runtime}>
        <OpenProjectProvider project={a}>
          <NotificationBell projectId={a.ref.id} onOpen={onOpen} />
        </OpenProjectProvider>
      </TriccRuntimeProvider>,
    )
    fireEvent.click(screen.getByTestId('notification-bell'))
    const item = await screen.findByTestId(`notification-${a.ref.id}:d1:mention:c1`)
    fireEvent.click(item)
    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ discussionId: 'd1', anchor: { kind: 'project' } }),
    )
    await waitFor(() =>
      expect(screen.getByTestId('notification-bell').getAttribute('data-unread')).toBe('0'),
    )
  })
})
