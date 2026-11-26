import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createProject, createTriccRuntime, type Project } from '@tricc/core'
import {
  MemoryCatalog,
  MemoryIdentity,
  MemoryPersistence,
  memoryAdapters,
} from '@tricc/adapters-memory'
import { OpenProjectProvider, TriccRuntimeProvider } from '../runtime/context.js'
import { ActivityEditor } from './ActivityEditor.js'

/** A sequence-driven calculation lists the paths that make it true (fix/20261126-sequence-calculate.md). */

function seed(): Project {
  const project = createProject({ id: 'test-guideline', title: 'Test guideline' })
  project.activities['triage'] = {
    id: 'triage',
    title: { en: 'Triage' },
    nodeOrder: ['s', 'weight', 'fever', 'advice', 'calc'],
    edgeOrder: ['e0', 'e1', 'e2', 'e3', 'e4', 'e5'],
    nodes: {
      s: { id: 's', type: 'activity_start', name: 'triage', ui: { x: 0, y: 0 } },
      weight: { id: 'weight', type: 'integer', name: 'weight', ui: { x: 0, y: 50 } },
      advice: { id: 'advice', type: 'note', name: 'advice', ui: { x: 100, y: 150 } },
      fever: {
        id: 'fever',
        type: 'select_yesno',
        name: 'fever',
        label: { en: 'Fever' },
        ui: { x: 0, y: 100 },
      },
      calc: { id: 'calc', type: 'calculate', name: 'seen', ui: { x: 0, y: 200 } },
    },
    edges: {
      e0: { id: 'e0', source: 's', target: 'weight' },
      e1: { id: 'e1', source: 'weight', target: 'fever' },
      e2: { id: 'e2', source: 'fever', target: 'calc', value: 'yes' },
      e3: { id: 'e3', source: 'fever', target: 'calc', value: 'no' },
      // Another way through "Yes": it reads the same once the note is dropped.
      e4: { id: 'e4', source: 'fever', target: 'advice', value: 'yes' },
      e5: { id: 'e5', source: 'advice', target: 'calc' },
    },
  }
  return project
}

/** Cough "follows" to Fever; another route goes Cough → Yes → Chest → Yes → Fever. */
function followSeed(): Project {
  const project = createProject({ id: 'test-guideline', title: 'Test guideline' })
  const yesno = (id: string, label: string, y: number) => ({
    id,
    type: 'select_yesno' as const,
    name: id,
    label: { en: label },
    ui: { x: 0, y },
  })
  project.activities['triage'] = {
    id: 'triage',
    title: { en: 'Triage' },
    nodeOrder: ['s', 'cough', 'chest', 'fever', 'calc'],
    edgeOrder: ['e1', 'e2', 'e3', 'e4', 'e5'],
    nodes: {
      s: { id: 's', type: 'activity_start', name: 'triage', ui: { x: 0, y: 0 } },
      cough: yesno('cough', 'Cough', 100),
      chest: yesno('chest', 'Chest indrawing', 200),
      fever: yesno('fever', 'Fever', 300),
      calc: { id: 'calc', type: 'calculate', name: 'seen', ui: { x: 0, y: 400 } },
    },
    edges: {
      e1: { id: 'e1', source: 's', target: 'cough' },
      e2: { id: 'e2', source: 'cough', target: 'fever', value: 'follow' },
      e3: { id: 'e3', source: 'cough', target: 'chest', value: 'yes' },
      e4: { id: 'e4', source: 'chest', target: 'fever', value: 'yes' },
      e5: { id: 'e5', source: 'fever', target: 'calc', value: 'yes' },
    },
  }
  return project
}

async function open(seeded: Project = seed()) {
  const runtime = createTriccRuntime(
    memoryAdapters({
      persistence: new MemoryPersistence(),
      catalog: new MemoryCatalog(),
      identity: new MemoryIdentity(),
    }),
  )
  const project = await runtime.create('Test guideline', seeded)
  render(
    <TriccRuntimeProvider runtime={runtime}>
      <OpenProjectProvider project={project}>
        <ActivityEditor activityId="triage" />
      </OpenProjectProvider>
    </TriccRuntimeProvider>,
  )
}

beforeEach(cleanup)

describe('sequence-driven calculation', () => {
  it('lists the decision points of each path from the activity start, and hides them once it has an expression', async () => {
    const user = userEvent.setup()
    await open()
    fireEvent.click(screen.getByTestId('node-calc'))

    const paths = screen.getAllByTestId('sequence-path').map((li) => li.textContent)
    expect(paths).toEqual(['Activity started → Fever: Yes', 'Activity started → Fever: No'])

    await user.type(screen.getByTestId('field-calculate'), 'true')
    expect(screen.queryByTestId('sequence-paths')).not.toBeInTheDocument()
  })

  it('drops what lies between the two ends of a follow link, and merges the paths through it', async () => {
    await open(followSeed())
    fireEvent.click(screen.getByTestId('node-calc'))

    const paths = screen.getAllByTestId('sequence-path').map((li) => li.textContent)
    expect(paths).toEqual(['Activity started → Fever: Yes'])
  })
})
