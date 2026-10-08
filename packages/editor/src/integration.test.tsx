import { describe, expect, it, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  activityKind,
  createActivity,
  createProcessActivity,
  createProject,
  createTriccRuntime,
  processOf,
  readProject,
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
import { OpenProjectProvider, TriccRuntimeProvider } from './runtime/context.js'
import { useSave } from './runtime/useSave.js'
import { ProjectOverview } from './project/Overview.js'
import { ActivityEditor } from './activity/ActivityEditor.js'
import { HistoryButtons } from './project/HistoryButtons.js'
import { ActivityNavigator } from './project/ActivityNavigator.js'

/**
 * Integration: store, editor and serializer together, driven through the real runtime
 * with in-memory adapters. No browser APIs, no timing — which is what makes these fast
 * enough to be worth running on every change.
 */

interface Harness {
  runtime: TriccRuntime
  open: OpenProject
  persistence: MemoryPersistence
  identity: MemoryIdentity
}

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

async function harness(project = seed()): Promise<Harness> {
  const persistence = new MemoryPersistence()
  const identity = new MemoryIdentity()
  const adapters = memoryAdapters({ persistence, catalog: new MemoryCatalog(), identity })
  const runtime = createTriccRuntime(adapters)
  const open = await runtime.create('Test guideline', project)
  return { runtime, open, persistence, identity }
}

function renderWith(h: Harness, ui: React.ReactNode) {
  return render(
    <TriccRuntimeProvider runtime={h.runtime}>
      <OpenProjectProvider project={h.open}>{ui}</OpenProjectProvider>
    </TriccRuntimeProvider>,
  )
}

/**
 * Select a node on the canvas.
 *
 * A plain click rather than `userEvent.click`: React Flow attaches d3-drag, whose
 * mousedown handler dereferences `event.view.document`, and user-event sets `view` to null
 * in jsdom. Pointer mechanics — dragging, connecting, marquee selection — need real
 * geometry and are covered in Playwright, so nothing is lost by not simulating them here.
 */
function selectNode(nodeId: string): void {
  fireEvent.click(screen.getByTestId(`node-${nodeId}`))
}

beforeEach(cleanup)

describe('authoring an activity end to end', () => {
  it('adds a node through the palette and it reaches the document', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('add-integer'))

    const activity = h.open.document.snapshot().activities['triage']
    expect(Object.keys(activity?.nodes ?? {})).toHaveLength(2)
    expect(screen.getByTestId('node-n-integer')).toBeInTheDocument()
  })

  it('names a node and the name reaches the saved file', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('add-integer'))
    const nameField = screen.getByTestId('field-name')
    await user.clear(nameField)
    await user.type(nameField, 'weight')

    await h.runtime.save(h.open)
    const files = await h.persistence.read(h.open.ref)
    expect(files['activities/triage.activity.yaml']).toContain('name: weight')
  })

  it('deleting a node removes it from the document', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('add-note'))
    expect(screen.getByTestId('node-n-note')).toBeInTheDocument()

    await user.click(screen.getByTestId('delete-n-note'))
    expect(screen.queryByTestId('node-n-note')).not.toBeInTheDocument()
  })

  it('does not offer a second start node', async () => {
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)
    // The seeded activity already has an activity_start.
    expect(screen.queryByTestId('add-activity_start')).not.toBeInTheDocument()
    expect(screen.queryByTestId('add-start')).not.toBeInTheDocument()
  })

  it('keeps offering activity end after one is placed', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('add-activity_end'))
    await user.click(screen.getByTestId('tab-nodes'))
    expect(screen.getByTestId('add-activity_end')).toBeInTheDocument()
    await user.click(screen.getByTestId('add-activity_end'))

    expect(screen.getByTestId('node-n-activity_end')).toBeInTheDocument()
    expect(screen.getByTestId('node-n-activity_end-2')).toBeInTheDocument()
    const nodes = h.open.document.snapshot().activities['triage']?.nodes ?? {}
    expect(Object.values(nodes).filter((node) => node.type === 'activity_end')).toHaveLength(2)
  })

  it('never offers an injection-only type', async () => {
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)
    expect(screen.queryByTestId('add-factor')).not.toBeInTheDocument()
  })

  it('offers bridge and wait, which are drawable', async () => {
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)
    expect(screen.getByTestId('add-bridge')).toBeInTheDocument()
    expect(screen.getByTestId('add-wait')).toBeInTheDocument()
  })

  it('reports a missing activity rather than crashing', async () => {
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="nope" />)
    expect(screen.getByTestId('activity-missing')).toBeInTheDocument()
  })

  it('shows nodes, details, and connections on separate inspector tabs', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    expect(screen.queryByTestId('tab-details')).not.toBeInTheDocument()
    expect(screen.getByTestId('tab-nodes')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('node-list')).toBeInTheDocument()
    expect(screen.queryByTestId('edge-list')).not.toBeInTheDocument()
    expect(screen.queryByTestId('node-properties')).not.toBeInTheDocument()
    expect(screen.queryByTestId('validation-summary')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('tab-validation'))
    expect(screen.getByTestId('validation-scope')).toHaveTextContent('Whole activity')
    expect(screen.getByTestId('issue-activity.no-end')).toBeInTheDocument()

    await user.click(screen.getByTestId('tab-nodes'))
    await user.click(screen.getByTestId('tab-connection'))
    expect(screen.getByTestId('edge-list')).toBeInTheDocument()
    expect(screen.queryByTestId('node-list')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('tab-nodes'))
    await user.click(screen.getByTestId('select-node-s'))
    expect(screen.getByTestId('tab-details')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('node-properties')).toBeInTheDocument()
    expect(screen.queryByTestId('node-list')).not.toBeInTheDocument()
    expect(screen.queryByTestId('edge-list')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('tab-nodes'))
    expect(screen.getByTestId('node-list')).toBeInTheDocument()
    expect(screen.queryByTestId('node-properties')).not.toBeInTheDocument()
    expect(screen.getByTestId('tab-details')).toBeInTheDocument()

    await user.click(screen.getByTestId('tab-validation'))
    expect(screen.getByTestId('validation-scope')).toHaveTextContent('This node')
    expect(screen.queryByTestId('issue-activity.no-end')).not.toBeInTheDocument()
  })
})

describe('validation surfaces in the UI', () => {
  it('shows an error for a select with no options, without blocking editing', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('add-select_one'))
    await user.click(screen.getByTestId('tab-validation'))

    expect(screen.getByTestId('validation-scope')).toHaveTextContent('This node')
    expect(screen.getByTestId('issue-select.no-options')).toHaveAttribute('data-severity', 'error')
    // Editing is still possible - a guideline is invalid for most of the time it is written.
    await user.click(screen.getByTestId('tab-details'))
    await user.type(screen.getByTestId('field-label'), 'Colour')
    expect(screen.getByTestId('field-label')).toHaveValue('Colour')
  })

  it('shows each answer as a line on a single or multiple choice', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('add-select_one'))
    await user.click(screen.getByTestId('add-option'))
    await user.clear(screen.getByTestId('option-label-option'))
    await user.type(screen.getByTestId('option-label-option'), 'Fever')
    expect(screen.getByTestId('node-n-select_one-answer-option')).toHaveTextContent('Fever')

    await user.click(screen.getByTestId('tab-nodes'))
    await user.click(screen.getByTestId('add-select_multiple'))
    await user.click(screen.getByTestId('add-option'))
    expect(screen.getByTestId('node-n-select_multiple-answer-option')).toHaveTextContent('New answer')
  })

  it('shows an open handoff as an error', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('add-note'))
    await user.type(screen.getByTestId('field-relevance-intent'), 'Only for infants')
    await user.click(screen.getByTestId('tab-validation'))

    expect(screen.getByTestId('issue-expression.open-handoff')).toHaveAttribute(
      'data-severity',
      'error',
    )
  })

  it('clears the handoff once the CQL is written', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('add-note'))
    await user.type(screen.getByTestId('field-relevance-intent'), 'Only for infants')
    await user.type(screen.getByTestId('field-relevance-expression'), 'AgeInMonths() < 12')

    await user.click(screen.getByTestId('tab-validation'))
    expect(screen.queryByTestId('issue-expression.open-handoff')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('tab-details'))
    expect(screen.getByTestId('field-relevance-expression-display')).toHaveTextContent('AgeInMonths')
    expect(screen.queryByText(/not rewritten into CQL/)).not.toBeInTheDocument()
  })

  it('shows a calculation as CQL and names a broken quote without rewriting it', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('add-calculate'))
    const field = screen.getByTestId('field-calculate')
    await user.type(field, '"age')
    expect(screen.getByTestId('field-calculate-lint')).toHaveTextContent(/closing quote/)

    await user.clear(field)
    const expression = '"age_in_days" < 60 and "CHE.B6.DE07" > 9'
    await user.type(field, expression)

    expect(screen.queryByTestId('field-calculate-lint')).not.toBeInTheDocument()
    const display = screen.getByTestId('field-calculate-display')
    expect(display.querySelector('.tricc-cql__name')).toHaveTextContent('age_in_days')
    expect(display).toHaveTextContent('CHE.B6.DE07')
    expect(display.querySelector('.tricc-cql__keyword')).toHaveTextContent('and')
    expect(screen.queryByText(/not rewritten into CQL/)).not.toBeInTheDocument()

    const nodes = h.open.document.snapshot().activities['triage']?.nodes ?? {}
    const calculate = Object.values(nodes).find((node) => node.type === 'calculate')
    expect(calculate?.calculate).toEqual({ expression })
  })

  it('shows a concept label in place of the code, with a tooltip and a way to open the question', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('add-decimal'))
    await user.clear(screen.getByTestId('field-name'))
    await user.type(screen.getByTestId('field-name'), 'CHE.B6.DE07')
    await user.type(screen.getByTestId('field-label'), 'Weight (kilograms)')

    await user.click(screen.getByTestId('tab-nodes'))
    await user.click(screen.getByTestId('add-calculate'))
    await user.type(screen.getByTestId('field-calculate'), '"CHE.B6.DE07" > 9')

    const term = screen.getByTestId('field-calculate-term-0')
    expect(term).toHaveTextContent('Weight (kilograms)')
    expect(term).toHaveAttribute('title', 'Weight (kilograms) — CHE.B6.DE07')
    expect(screen.getByTestId('field-calculate')).toHaveValue('"CHE.B6.DE07" > 9')

    await user.click(screen.getByTestId('field-calculate-about-0'))
    expect(screen.getByTestId('field-calculate-card-0')).toHaveTextContent('Question in Triage')
    await user.click(screen.getByTestId('field-calculate-show-0'))
    expect(screen.getByTestId('field-name')).toHaveValue('CHE.B6.DE07')
    expect(screen.getByTestId('field-label')).toHaveValue('Weight (kilograms)')

    const nodes = h.open.document.snapshot().activities['triage']?.nodes ?? {}
    const calculate = Object.values(nodes).find((node) => node.type === 'calculate')
    expect(calculate?.calculate).toEqual({ expression: '"CHE.B6.DE07" > 9' })
  })
})

describe('read-only sessions', () => {
  it('removes every mutating affordance', async () => {
    const h = await harness()
    h.identity.setCapabilities(['project.read', 'project.export', 'terminology.read'])
    renderWith(h, <ActivityEditor activityId="triage" />)

    expect(screen.queryByTestId('add-integer')).not.toBeInTheDocument()
    expect(screen.queryByTestId('delete-s')).not.toBeInTheDocument()
  })

  it('refuses mutation at the document layer regardless of the UI', async () => {
    const h = await harness()
    h.identity.setCapabilities(['project.read'])
    expect(() =>
      h.open.document.transact((tx) => tx.addNode('triage', { id: 'x', type: 'note' })),
    ).toThrow(/project\.write/)
  })

  it('restores affordances when write is granted again', async () => {
    const h = await harness()
    h.identity.setCapabilities(['project.read'])
    renderWith(h, <ActivityEditor activityId="triage" />)
    expect(screen.queryByTestId('add-integer')).not.toBeInTheDocument()

    h.identity.setCapabilities(['project.read', 'project.write'])
    await waitFor(() => expect(screen.getByTestId('add-integer')).toBeInTheDocument())
  })
})

describe('project overview', () => {
  it('lists the processes on an intervention, not its page activities', async () => {
    const project = seed()
    project.activities['triage-process'] = createProcessActivity({
      id: 'triage-process',
      process: 'triage',
      title: 'Triage',
    })
    project.interventions = [
      {
        id: 'sick-child',
        code: 'sick-child',
        title: { en: 'Sick child' },
        trigger: { mode: 'on-demand' },
        activities: [{ ref: 'triage' }, { ref: 'triage-process' }],
      },
    ]
    const h = await harness(project)
    renderWith(h, <ProjectOverview />)

    expect(screen.getByTestId('intervention-sick-child')).toBeInTheDocument()
    expect(screen.queryByTestId('intervention-sick-child-activity-triage')).not.toBeInTheDocument()
    expect(screen.getByTestId('intervention-sick-child-activity-triage-process')).toHaveTextContent(
      'Triage',
    )
    expect(screen.getByTestId('intervention-sick-child-trigger')).toHaveTextContent('on-demand')
  })

  it('shows an activity that belongs to no intervention', async () => {
    const h = await harness()
    renderWith(h, <ProjectOverview />)
    expect(screen.getByTestId('unassigned-triage')).toBeInTheDocument()
  })

  it('marks a process shared between two interventions', async () => {
    const project = seed()
    project.activities['triage-process'] = createProcessActivity({
      id: 'triage-process',
      process: 'triage',
      title: 'Triage',
    })
    project.interventions = [
      { id: 'a', code: 'a', activities: [{ ref: 'triage-process' }] },
      { id: 'b', code: 'b', activities: [{ ref: 'triage-process' }] },
    ]
    const h = await harness(project)
    renderWith(h, <ProjectOverview />)
    expect(screen.getAllByTestId('shared-triage-process').length).toBeGreaterThan(0)
  })

  it('blocks export for a reserved trigger mode, saying why', async () => {
    const project = seed()
    project.interventions = [
      {
        id: 'a',
        code: 'a',
        trigger: { mode: 'planned' },
        activities: [{ ref: 'triage' }],
      },
    ]
    const h = await harness(project)
    renderWith(h, <ProjectOverview />)
    const issue = screen.getByTestId('issue-intervention.reserved-trigger')
    expect(issue).toHaveAttribute('data-severity', 'error')
    expect(issue).toHaveTextContent(/planning layer/)
  })

  it('adds an intervention through the UI', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ProjectOverview />)

    await user.click(screen.getByTestId('add-intervention'))
    expect(h.open.document.snapshot().interventions).toHaveLength(1)
    expect(screen.getByTestId('intervention-intervention')).toBeInTheDocument()
  })
})

describe('save and reload', () => {
  it('round-trips the whole project through the persistence port', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('add-integer'))
    await user.clear(screen.getByTestId('field-name'))
    await user.type(screen.getByTestId('field-name'), 'weight')
    await h.runtime.save(h.open)

    const reopened = await h.runtime.open(h.open.ref)
    const activity = reopened.document.snapshot().activities['triage']
    expect(Object.values(activity?.nodes ?? {}).map((n) => n.name)).toContain('weight')
  })

  it('preserves node positions across save and reload', async () => {
    const h = await harness()
    h.open.document.transact((tx) => tx.moveNode('triage', 's', 123, 456))
    await h.runtime.save(h.open)

    const reopened = await h.runtime.open(h.open.ref)
    expect(reopened.document.snapshot().activities['triage']?.nodes['s']?.ui).toMatchObject({
      x: 123,
      y: 456,
    })
  })

  it('writes only the files that changed', async () => {
    const h = await harness()
    h.open.document.transact((tx) => tx.moveNode('triage', 's', 1, 1))
    const { changed } = await h.runtime.save(h.open)
    expect(changed).toEqual(['activities/triage.activity.yaml'])
  })

  it('saving an unchanged project writes nothing', async () => {
    const h = await harness()
    expect((await h.runtime.save(h.open)).changed).toEqual([])
  })

  it('reports unsaved changes', async () => {
    const h = await harness()
    expect(h.runtime.hasUnsavedChanges(h.open)).toBe(false)
    h.open.document.transact((tx) => tx.moveNode('triage', 's', 9, 9))
    expect(h.runtime.hasUnsavedChanges(h.open)).toBe(true)
    await h.runtime.save(h.open)
    expect(h.runtime.hasUnsavedChanges(h.open)).toBe(false)
  })

  it('the saved files are a valid project on their own', async () => {
    const h = await harness()
    await h.runtime.save(h.open)
    const files = await h.persistence.read(h.open.ref)
    expect(() => readProject(files)).not.toThrow()
  })
})

describe('continuous save', () => {
  function SaveProbe() {
    const status = useSave(10)
    return <span data-testid="save-state">{status.state}</span>
  }

  it('moves to unsaved on edit and back to saved', async () => {
    const h = await harness()
    renderWith(
      h,
      <>
        <SaveProbe />
        <ActivityEditor activityId="triage" />
      </>,
    )
    expect(screen.getByTestId('save-state')).toHaveTextContent('saved')

    const user = userEvent.setup()
    await user.click(screen.getByTestId('add-note'))
    await waitFor(() => expect(screen.getByTestId('save-state')).toHaveTextContent('saved'), {
      timeout: 2000,
    })
    expect(Object.keys(await h.persistence.read(h.open.ref))).toContain(
      'activities/triage.activity.yaml',
    )
  })
})

describe('undo across the UI', () => {
  it('reverses an edit made through a form field', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('add-integer'))
    const before = h.open.document.snapshot().activities['triage']?.nodeOrder.length

    h.open.document.undo.undo()
    expect(h.open.document.snapshot().activities['triage']?.nodeOrder.length).toBe(
      (before ?? 0) - 1,
    )
  })

  it('the undo and redo arrows reverse the last change', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(
      h,
      <>
        <HistoryButtons />
        <ActivityEditor activityId="triage" />
      </>,
    )

    expect(screen.getByTestId('undo')).toBeDisabled()
    expect(screen.getByTestId('redo')).toBeDisabled()

    await user.click(screen.getByTestId('add-integer'))
    expect(screen.getByTestId('undo')).toBeEnabled()

    await user.click(screen.getByTestId('undo'))
    expect(screen.queryByTestId('node-n-integer')).not.toBeInTheDocument()
    expect(screen.getByTestId('redo')).toBeEnabled()

    await user.click(screen.getByTestId('redo'))
    expect(screen.getByTestId('node-n-integer')).toBeInTheDocument()
  })

  it('Ctrl+Z undoes the last change and Ctrl+Shift+Z restores it', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('add-integer'))
    expect(h.open.document.snapshot().activities['triage']?.nodes['n-integer']).toBeTruthy()

    await user.keyboard('{Control>}z{/Control}')
    expect(h.open.document.snapshot().activities['triage']?.nodes['n-integer']).toBeUndefined()

    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    expect(h.open.document.snapshot().activities['triage']?.nodes['n-integer']).toBeTruthy()
  })
})

/** Drive the typeahead the way an author does: type, then pick. */
async function pickActivity(
  user: ReturnType<typeof userEvent.setup>,
  testId: string,
  activityId: string,
): Promise<void> {
  await user.type(screen.getByTestId(testId), activityId)
  await user.click(screen.getByTestId(`${testId}-option-${activityId}`))
}

describe('intervention editing', () => {
  async function withIntervention(): Promise<Harness> {
    const project = seed()
    // An intervention lists process activities, so the fixture needs a wrapper that
    // starts the triage process and calls the normal activity.
    project.activities['triage-process'] = {
      id: 'triage-process',
      title: { en: 'Triage' },
      process: 'triage',
      nodeOrder: ['s', 'call', 'e'],
      edgeOrder: ['e1', 'e2'],
      nodes: {
        s: { id: 's', type: 'start', name: 'triage_process', process: 'triage' },
        call: { id: 'call', type: 'goto', link: 'triage' },
        e: { id: 'e', type: 'end' },
      },
      edges: {
        e1: { id: 'e1', source: 's', target: 'call' },
        e2: { id: 'e2', source: 'call', target: 'e' },
      },
    }
    project.interventions = [
      {
        id: 'sick-child',
        code: 'sick-child',
        title: { en: 'Sick child' },
        trigger: { mode: 'on-demand' },
        activities: [],
      },
    ]
    return harness(project)
  }

  it('renames an intervention', async () => {
    const user = userEvent.setup()
    const h = await withIntervention()
    renderWith(h, <ProjectOverview />)

    await user.click(screen.getByTestId('configure-intervention-sick-child'))
    const title = screen.getByTestId('iv-title-sick-child')
    await user.clear(title)
    await user.type(title, 'Sick child under five')

    expect(h.open.document.snapshot().interventions[0]?.title?.['en']).toBe('Sick child under five')
    await user.click(screen.getByTestId('intervention-settings-sick-child-save'))
    expect(screen.queryByTestId('intervention-settings-sick-child')).not.toBeInTheDocument()
    expect(h.open.document.snapshot().interventions[0]?.title?.['en']).toBe('Sick child under five')
  })

  it('adds an activity to the flat list', async () => {
    const user = userEvent.setup()
    const h = await withIntervention()
    renderWith(h, <ProjectOverview />)

    await user.click(screen.getByTestId('add-process-to-sick-child'))
    await pickActivity(user, 'add-activity-to-sick-child', 'triage-process')
    expect(h.open.document.snapshot().interventions[0]?.activities).toEqual([
      { ref: 'triage-process' },
    ])
  })

  it('only offers activities that are not already listed', async () => {
    const user = userEvent.setup()
    const h = await withIntervention()
    renderWith(h, <ProjectOverview />)

    await user.click(screen.getByTestId('add-process-to-sick-child'))
    await pickActivity(user, 'add-activity-to-sick-child', 'triage-process')

    await user.click(screen.getByTestId('add-process-to-sick-child'))
    expect(screen.getByTestId('add-activity-to-sick-child-exhausted')).toHaveTextContent('already listed')
    expect(screen.queryByTestId('add-activity-to-sick-child-option-triage')).not.toBeInTheDocument()
  })

  it('keeps the intervention condition off the activity itself', async () => {
    const user = userEvent.setup()
    const h = await withIntervention()
    renderWith(h, <ProjectOverview />)

    await user.click(screen.getByTestId('add-process-to-sick-child'))
    await pickActivity(user, 'add-activity-to-sick-child', 'triage-process')
    await user.click(screen.getByTestId('configure-intervention-sick-child'))
    await user.type(screen.getByTestId('iv-cql-sick-child'), 'AgeInMonths() < 60')

    const snapshot = h.open.document.snapshot()
    expect(snapshot.interventions[0]?.applicability?.expression).toBe('AgeInMonths() < 60')
    expect(snapshot.activities['triage-process']?.applicability).toBeUndefined()
    expect(snapshot.interventions[0]?.activities[0]).toEqual({ ref: 'triage-process' })
  })

  it('removes an activity from the intervention', async () => {
    const user = userEvent.setup()
    const h = await withIntervention()
    renderWith(h, <ProjectOverview />)

    await user.click(screen.getByTestId('add-process-to-sick-child'))
    await pickActivity(user, 'add-activity-to-sick-child', 'triage-process')
    await user.click(screen.getByTestId('remove-activity-sick-child-triage-process'))

    expect(h.open.document.snapshot().interventions[0]?.activities).toEqual([])
  })

  it('deletes an intervention after confirmation', async () => {
    const user = userEvent.setup()
    const h = await withIntervention()
    renderWith(h, <ProjectOverview />)

    await user.click(screen.getByTestId('configure-intervention-sick-child'))
    await user.click(screen.getByTestId('delete-intervention-sick-child'))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(h.open.document.snapshot().interventions).toHaveLength(1)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('intervention-settings-sick-child')).toBeInTheDocument()

    await user.click(screen.getByTestId('delete-intervention-sick-child'))
    await user.click(screen.getByTestId('delete-intervention-sick-child-cancel'))
    expect(h.open.document.snapshot().interventions).toHaveLength(1)

    await user.click(screen.getByTestId('delete-intervention-sick-child'))
    await user.click(screen.getByTestId('delete-intervention-sick-child-confirm'))
    expect(h.open.document.snapshot().interventions).toEqual([])
  })

  it('offers reserved trigger modes but flags them', async () => {
    const user = userEvent.setup()
    const h = await withIntervention()
    renderWith(h, <ProjectOverview />)

    await user.click(screen.getByTestId('configure-intervention-sick-child'))
    const trigger = screen.getByTestId('iv-trigger-sick-child')
    expect(trigger).toHaveTextContent('planned (needs the planning layer)')

    await user.selectOptions(trigger, 'planned')
    expect(screen.getByTestId('issue-intervention.reserved-trigger')).toHaveAttribute(
      'data-severity',
      'error',
    )
  })

  it('is entirely read-only without write capability', async () => {
    const user = userEvent.setup()
    const h = await withIntervention()
    h.identity.setCapabilities(['project.read'])
    renderWith(h, <ProjectOverview />)

    await user.click(screen.getByTestId('configure-intervention-sick-child'))
    expect(screen.getByTestId('iv-title-sick-child')).toBeDisabled()
    expect(screen.queryByTestId('intervention-settings-sick-child-save')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('intervention-settings-sick-child-close'))
    expect(screen.queryByTestId('intervention-settings-sick-child')).not.toBeInTheDocument()
    expect(screen.queryByTestId('add-process-to-sick-child')).not.toBeInTheDocument()
    expect(screen.queryByTestId('add-activity-to-sick-child')).not.toBeInTheDocument()
    expect(screen.queryByTestId('delete-intervention-sick-child')).not.toBeInTheDocument()
  })
})

const COUGH_YAML = `
id: cough
title: Cough
nodes:
  - id: start
    type: activity_start
    name: cough
    ui: { x: 40, y: 40 }
  - id: n1
    type: note
    label: Ask about cough
    ui: { x: 40, y: 140 }
edges: []
`

const AIRWAY_YAML = `
id: airway-process
process: airway
title: Airway
nodes:
  - id: start
    type: start
    name: airway
    process: airway
    form_id: ETAT
    ui: { x: 40, y: 40 }
edges: []
`

describe('process activities versus activities', () => {
  it('creates the two kinds with different roots', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityNavigator selected={undefined} onSelect={() => {}} />)

    await user.click(screen.getByTestId('add-activity'))
    await user.click(screen.getByTestId('create-activity'))
    await user.click(screen.getByTestId('tab-processes'))
    await user.click(screen.getByTestId('add-process'))
    await user.type(screen.getByTestId('new-process-name'), 'registration')
    await user.click(screen.getByTestId('add-process-activity'))

    const activities = h.open.document.snapshot().activities
    expect(activityKind(activities['activity']!)).toBe('activity')
    expect(activityKind(activities['registration-process']!)).toBe('process')
    // The wrapper says which process it starts, on the root and on the activity.
    expect(processOf(activities['registration-process']!)).toBe('registration')
  })

  it('lists the two kinds separately', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityNavigator selected={undefined} onSelect={() => {}} />)

    await user.click(screen.getByTestId('tab-processes'))
    await user.click(screen.getByTestId('add-process'))
    await user.type(screen.getByTestId('new-process-name'), 'triage')
    await user.click(screen.getByTestId('add-process-activity'))

    // Each kind appears on its own tab, not in one undifferentiated pile.
    expect(screen.getByTestId('process-activity-list')).toContainElement(
      screen.getByTestId('nav-activity-triage-process'),
    )
    expect(screen.queryByTestId('activity-list')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('tab-activities'))
    expect(screen.getByTestId('activity-list')).toContainElement(
      screen.getByTestId('nav-activity-triage'),
    )
    expect(screen.queryByTestId('process-activity-list')).not.toBeInTheDocument()
    expect(screen.getByTestId('nav-activity-triage')).toHaveAttribute('data-kind', 'activity')
    await user.click(screen.getByTestId('tab-processes'))
    expect(screen.getByTestId('nav-activity-triage-process')).toHaveAttribute(
      'data-kind',
      'process',
    )
  })

  it('imports an activity after confirmation and keeps a process file on its own tab', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityNavigator selected={undefined} onSelect={() => {}} />)

    const cough = new File([COUGH_YAML], 'cough.activity.yaml', { type: 'text/yaml' })
    const airway = new File([AIRWAY_YAML], 'airway.activity.yaml', { type: 'text/yaml' })

    await user.upload(screen.getByTestId('import-activity-file', { hidden: true }), cough)
    await waitFor(() =>
      expect(screen.getByTestId('import-modal')).toHaveTextContent('Nothing is added until you import.'),
    )
    expect(screen.getByTestId('import-id-cough')).toHaveTextContent('cough')
    await user.click(screen.getByTestId('import-cancel'))
    expect(h.open.document.snapshot().activities.cough).toBeUndefined()

    await user.upload(screen.getByTestId('import-activity-file', { hidden: true }), cough)
    await waitFor(() => expect(screen.getByTestId('import-confirm')).toBeEnabled())
    await user.click(screen.getByTestId('import-confirm'))
    expect(screen.queryByTestId('import-modal')).not.toBeInTheDocument()
    expect(h.open.document.snapshot().activities.cough?.nodes.n1?.label).toEqual({
      en: 'Ask about cough',
    })
    expect(screen.getByTestId('nav-activity-cough')).toBeInTheDocument()

    await user.upload(screen.getByTestId('import-activity-file', { hidden: true }), cough)
    await waitFor(() =>
      expect(screen.getByTestId('import-id-cough-2')).toHaveTextContent('saved as cough-2'),
    )
    await user.click(screen.getByTestId('import-cancel'))

    await user.upload(screen.getByTestId('import-activity-file', { hidden: true }), airway)
    await waitFor(() =>
      expect(screen.getByTestId('import-skipped')).toHaveTextContent('Processes tab'),
    )
    expect(screen.queryByTestId('import-confirm')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('import-cancel'))
    expect(h.open.document.snapshot().activities['airway-process']).toBeUndefined()

    await user.click(screen.getByTestId('tab-processes'))
    await user.upload(screen.getByTestId('import-process-file', { hidden: true }), airway)
    await waitFor(() => expect(screen.getByTestId('import-confirm')).toBeEnabled())
    await user.click(screen.getByTestId('import-confirm'))
    expect(activityKind(h.open.document.snapshot().activities['airway-process']!)).toBe('process')
    expect(screen.getByTestId('nav-activity-airway-process')).toHaveAttribute('data-kind', 'process')
  })

  it('hides import when the project is read-only', async () => {
    const h = await harness()
    h.identity.setCapabilities(['project.read'])
    renderWith(h, <ActivityNavigator selected={undefined} onSelect={() => {}} />)
    expect(screen.queryByTestId('import-activity')).not.toBeInTheDocument()
    expect(screen.queryByTestId('add-activity')).not.toBeInTheDocument()
  })

  it('searches the activity tab and the process tab', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityNavigator selected={undefined} onSelect={() => {}} />)

    await user.click(screen.getByTestId('add-activity'))
    await user.click(screen.getByTestId('create-activity'))
    await user.click(screen.getByTestId('add-activity'))
    await user.click(screen.getByTestId('create-activity'))
    await user.click(screen.getByTestId('tab-processes'))
    await user.click(screen.getByTestId('add-process'))
    await user.type(screen.getByTestId('new-process-name'), 'registration')
    await user.click(screen.getByTestId('add-process-activity'))
    await user.click(screen.getByTestId('add-process'))
    await user.type(screen.getByTestId('new-process-name'), 'followup')
    await user.click(screen.getByTestId('add-process-activity'))

    expect(screen.getByTestId('nav-expand')).toBeDisabled()
    await user.click(screen.getByTestId('tab-activities'))
    await user.type(screen.getByTestId('activity-search'), 'activity-2')
    expect(screen.getByTestId('nav-activity-activity-2')).toBeInTheDocument()
    expect(screen.queryByTestId('nav-activity-activity')).not.toBeInTheDocument()
    expect(screen.queryByTestId('nav-activity-triage')).not.toBeInTheDocument()

    await user.clear(screen.getByTestId('activity-search'))
    await user.type(screen.getByTestId('activity-search'), 'no-such-activity')
    expect(screen.getByTestId('activity-no-match')).toBeInTheDocument()

    await user.click(screen.getByTestId('tab-processes'))
    await user.type(screen.getByTestId('process-search'), 'followup')
    expect(screen.getByTestId('nav-activity-followup-process')).toBeInTheDocument()
    expect(screen.queryByTestId('nav-activity-registration-process')).not.toBeInTheDocument()
  })

  it('lists a normal activity on an intervention', async () => {
    const project = seed()
    project.interventions = [
      {
        id: 'iv',
        code: 'iv',
        trigger: { mode: 'on-demand' },
        activities: [{ ref: 'triage' }],
      },
    ]
    const h = await harness(project)
    renderWith(h, <ProjectOverview />)

    expect(screen.queryByTestId('issue-intervention.not-a-process-activity')).not.toBeInTheDocument()
    expect(screen.queryByTestId('intervention-iv-activity-triage')).not.toBeInTheDocument()
  })

  it('creates a process activity straight from the intervention and lists it', async () => {
    const user = userEvent.setup()
    const project = seed()
    project.interventions = [
      { id: 'iv', code: 'iv', trigger: { mode: 'on-demand' }, activities: [] },
    ]
    const h = await harness(project)
    renderWith(h, <ProjectOverview />)

    await user.click(screen.getByTestId('add-process-to-iv'))
    await user.type(screen.getByTestId('process-name-iv'), 'triage')
    await user.click(screen.getByTestId('create-process-activity-iv'))

    const snapshot = h.open.document.snapshot()
    expect(activityKind(snapshot.activities['triage-process']!)).toBe('process')
    expect(snapshot.interventions[0]?.activities).toEqual([{ ref: 'triage-process' }])
  })

  it('offers every activity that is not already listed', async () => {
    const user = userEvent.setup()
    const project = seed()
    project.activities['reg-process'] = createProcessActivity({
      id: 'reg-process',
      process: 'registration',
    })
    project.activities['triage-process'] = createProcessActivity({
      id: 'triage-process',
      process: 'triage',
    })
    project.interventions = [
      {
        id: 'iv',
        code: 'iv',
        trigger: { mode: 'on-demand' },
        activities: [],
      },
    ]
    const h = await harness(project)
    renderWith(h, <ProjectOverview />)

    await user.click(screen.getByTestId('add-process-to-iv'))
    expect(screen.getByTestId('add-activity-to-iv-option-triage-process')).toBeInTheDocument()
    expect(screen.getByTestId('add-activity-to-iv-option-reg-process')).toBeInTheDocument()
    expect(screen.queryByTestId('add-activity-to-iv-option-triage')).not.toBeInTheDocument()
  })

  it('reorders activities within a process, since order is the sequence', async () => {
    const user = userEvent.setup()
    const project = seed()
    project.activities['a-process'] = createProcessActivity({ id: 'a-process', process: 'triage' })
    project.activities['b-process'] = createProcessActivity({ id: 'b-process', process: 'triage' })
    project.interventions = [
      {
        id: 'iv',
        code: 'iv',
        trigger: { mode: 'on-demand' },
        activities: [{ ref: 'a-process' }, { ref: 'b-process' }],
      },
    ]
    const h = await harness(project)
    renderWith(h, <ProjectOverview />)

    await user.click(screen.getByTestId('move-down-iv-a-process'))
    expect(h.open.document.snapshot().interventions[0]?.activities.map((a) => a.ref)).toEqual([
      'b-process',
      'a-process',
    ])
  })

  it('cannot move the first activity earlier or the last later', async () => {
    const project = seed()
    project.activities['a-process'] = createProcessActivity({ id: 'a-process', process: 'triage' })
    project.activities['b-process'] = createProcessActivity({ id: 'b-process', process: 'triage' })
    project.interventions = [
      {
        id: 'iv',
        code: 'iv',
        trigger: { mode: 'on-demand' },
        activities: [{ ref: 'a-process' }, { ref: 'b-process' }],
      },
    ]
    const h = await harness(project)
    renderWith(h, <ProjectOverview />)

    expect(screen.getByTestId('move-up-iv-a-process')).toBeDisabled()
    expect(screen.getByTestId('move-down-iv-b-process')).toBeDisabled()
  })

  it('does not offer a second root node once the activity has one', async () => {
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)
    // The kind is decided by the root, so neither root type is offered again.
    expect(screen.queryByTestId('add-start')).not.toBeInTheDocument()
    expect(screen.queryByTestId('add-activity_start')).not.toBeInTheDocument()
  })
})

describe('goto targets', () => {
  async function withGoto(): Promise<Harness> {
    const project = seed()
    project.activities['assessment'] = createActivity({ id: 'assessment', title: 'Assessment' })
    project.activities['triage-process'] = createProcessActivity({
      id: 'triage-process',
      process: 'triage',
      title: 'Triage',
    })
    const triage = project.activities['triage']!
    triage.nodes['g'] = { id: 'g', type: 'goto', ui: { x: 0, y: 100 } }
    triage.nodeOrder.push('g')
    return harness(project)
  }

  it('offers normal activities and never a process activity', async () => {
    const user = userEvent.setup()
    const h = await withGoto()
    renderWith(h, <ActivityEditor activityId="triage" />)

    selectNode('g')
    await user.click(screen.getByTestId('field-link'))

    expect(screen.getByTestId('field-link-option-assessment')).toBeInTheDocument()
    // A process activity is an entry point, not a jump target.
    expect(screen.queryByTestId('field-link-option-triage-process')).not.toBeInTheDocument()
    // And an activity cannot jump to itself.
    expect(screen.queryByTestId('field-link-option-triage')).not.toBeInTheDocument()
  })

  it('sets the link and shows what was chosen', async () => {
    const user = userEvent.setup()
    const h = await withGoto()
    renderWith(h, <ActivityEditor activityId="triage" />)

    selectNode('g')
    await user.type(screen.getByTestId('field-link'), 'assess')
    await user.click(screen.getByTestId('field-link-option-assessment'))

    expect(h.open.document.snapshot().activities['triage']?.nodes['g']?.link).toBe('assessment')
    // A single-value picker has to show the current value, not an empty search box.
    expect(screen.getByTestId('field-link-current')).toHaveTextContent('Assessment')
  })

  it('clears the link', async () => {
    const user = userEvent.setup()
    const h = await withGoto()
    renderWith(h, <ActivityEditor activityId="triage" />)

    selectNode('g')
    await user.type(screen.getByTestId('field-link'), 'assess')
    await user.click(screen.getByTestId('field-link-option-assessment'))
    await user.click(screen.getByTestId('field-link-clear'))

    expect(h.open.document.snapshot().activities['triage']?.nodes['g']?.link).toBeUndefined()
    expect(screen.getByTestId('field-link')).toBeInTheDocument()
  })

  it('reports a target that has since been deleted', async () => {
    const project = seed()
    const triage = project.activities['triage']!
    triage.nodes['g'] = { id: 'g', type: 'goto', link: 'deleted-activity', ui: { x: 0, y: 100 } }
    triage.nodeOrder.push('g')
    const h = await harness(project)
    const user = userEvent.setup()
    renderWith(h, <ActivityEditor activityId="triage" />)

    selectNode('g')
    expect(screen.getByTestId('field-link-missing')).toBeInTheDocument()
  })

  it('shows no link field on a node that is not a goto', async () => {
    const user = userEvent.setup()
    const h = await withGoto()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('add-note'))
    expect(screen.queryByTestId('field-link')).not.toBeInTheDocument()
  })

  it('is read-only without write capability', async () => {
    const h = await withGoto()
    h.open.document.transact((tx) =>
      tx.updateNode('triage', {
        id: 'g',
        type: 'goto',
        link: 'assessment',
        ui: { x: 0, y: 100 },
      }),
    )
    h.identity.setCapabilities(['project.read'])
    const user = userEvent.setup()
    renderWith(h, <ActivityEditor activityId="triage" />)

    selectNode('g')
    expect(screen.getByTestId('field-link-current')).toHaveTextContent('Assessment')
    expect(screen.queryByTestId('field-link-change')).not.toBeInTheDocument()
    expect(screen.queryByTestId('field-link-clear')).not.toBeInTheDocument()
  })
})
