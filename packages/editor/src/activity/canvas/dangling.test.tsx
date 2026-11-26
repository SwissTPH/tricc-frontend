import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { createProject, createTriccRuntime, type Project } from '@tricc/core'
import {
  MemoryCatalog,
  MemoryIdentity,
  MemoryPersistence,
  memoryAdapters,
} from '@tricc/adapters-memory'
import { OpenProjectProvider, TriccRuntimeProvider } from '../../runtime/context.js'
import { ActivityEditor } from '../ActivityEditor.js'

/** A calculation with no link into it starts a path of its own and is marked as such. */

function seed(): Project {
  const project = createProject({ id: 'p', title: 'P' })
  project.activities['danger'] = {
    id: 'danger',
    nodeOrder: ['s', 'linked', 'free', 'empty', 'after'],
    edgeOrder: ['e1', 'e2'],
    nodes: {
      s: { id: 's', type: 'activity_start', ui: { x: 0, y: 0 } },
      linked: {
        id: 'linked',
        type: 'calculate',
        name: 'linked',
        calculate: { expression: 'true' },
        ui: { x: 0, y: 100 },
      },
      free: {
        id: 'free',
        type: 'calculate',
        name: 'severe',
        calculate: { expression: '"fever" is true' },
        ui: { x: 300, y: 0 },
      },
      empty: { id: 'empty', type: 'calculate', name: 'empty', ui: { x: 600, y: 0 } },
      after: { id: 'after', type: 'activity_end', ui: { x: 300, y: 100 } },
    },
    edges: {
      e1: { id: 'e1', source: 's', target: 'linked' },
      e2: { id: 'e2', source: 'free', target: 'after' },
    },
  }
  return project
}

beforeEach(cleanup)

describe('dangling calculations on the canvas', () => {
  it('marks a calculation with no link into it and an expression', async () => {
    const runtime = createTriccRuntime(
      memoryAdapters({
        persistence: new MemoryPersistence(),
        catalog: new MemoryCatalog(),
        identity: new MemoryIdentity(),
      }),
    )
    const open = await runtime.create('P', seed())
    render(
      <TriccRuntimeProvider runtime={runtime}>
        <OpenProjectProvider project={open}>
          <ActivityEditor activityId="danger" />
        </OpenProjectProvider>
      </TriccRuntimeProvider>,
    )
    expect(await screen.findByTestId('node-free-dangling')).toHaveAttribute(
      'title',
      expect.stringContaining('reached only when it is true'),
    )
    expect(screen.queryByTestId('node-linked-dangling')).toBeNull()
    expect(screen.queryByTestId('node-empty-dangling')).toBeNull()
    // What follows it is on a path, so it carries no "unreachable" warning.
    expect(screen.getByTestId('node-after')).toHaveAttribute('data-severity', 'none')
  })
})
