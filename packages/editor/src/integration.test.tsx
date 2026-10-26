import { describe, expect, it, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  activityKind,
  createActivity,
  createProcessActivity,
  createProject,
  createTriccRuntime,
  DEFAULT_PREFERENCES,
  processOf,
  readProject,
  type DiagramStyle,
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
import { DictionaryView } from './terminology/DictionaryView.js'
import { goToCallers } from './activity/ActivitySettings.js'
import { nextTrail } from './project/Breadcrumbs.js'

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

describe('adding nodes', () => {
  it('names a second node of the same type with a valid name', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('add-select_one'))
    await user.click(screen.getByTestId('tab-nodes'))
    await user.click(screen.getByTestId('add-select_one'))
    const nodes = h.open.document.snapshot().activities['triage']!.nodes
    expect(nodes['n-select_one']!.name).toBe('select_one')
    expect(nodes['n-select_one-2']!.name).toBe('select_one_2')
  })

  it('warns about an invalid name and does not save it', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)
    const name = () => h.open.document.snapshot().activities['triage']!.nodes['n-select_one']!.name

    await user.click(screen.getByTestId('add-select_one'))
    await user.clear(screen.getByTestId('field-name'))
    await user.type(screen.getByTestId('field-name'), 'systolic bp')
    // What was typed stays in the field, with a warning; the last valid name is what is saved.
    expect(screen.getByTestId('field-name')).toHaveValue('systolic bp')
    expect(screen.getByTestId('field-name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByTestId('field-name-error')).toBeInTheDocument()
    expect(name()).toBe('systolic')

    // Leaving the field puts the saved name back.
    await user.tab()
    expect(screen.getByTestId('field-name')).toHaveValue('systolic')
    expect(screen.queryByTestId('field-name-error')).not.toBeInTheDocument()

    await user.clear(screen.getByTestId('field-name'))
    // A `-` is allowed, so a name can be a code such as `BA00-Z`.
    await user.type(screen.getByTestId('field-name'), 'systolic-bp')
    expect(screen.queryByTestId('field-name-error')).not.toBeInTheDocument()
    expect(name()).toBe('systolic-bp')
  })
})

describe('validation surfaces in the UI', () => {
  it("lists a node's errors in its hover card", async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('add-select_one'))
    const node = document.querySelector<HTMLElement>('[data-node-type="select_one"]')!
    expect(node).toHaveAttribute('data-severity', 'error')

    await user.hover(node)
    const issues = await screen.findByTestId(`${node.dataset.testid}-issues`, {}, { timeout: 2000 })
    expect(issues.querySelector('[data-severity="error"]')).toHaveTextContent(/^Error: .*nothing to choose/)
  })

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

    // A new answer is a concept: created in the dialog, named by its code.
    await user.click(screen.getByTestId('add-select_one'))
    await user.click(screen.getByTestId('add-option-new'))
    expect(screen.getByTestId('concept-type')).toHaveValue('Value')
    await user.type(screen.getByTestId('concept-code'), 'fever')
    await user.type(screen.getByTestId('concept-display'), 'Fever')
    await user.click(screen.getByTestId('concept-dialog-save'))
    expect(screen.getByTestId('node-n-select_one-answer-option')).toHaveTextContent('Fever')
    const one = h.open.document.snapshot().activities['triage']!.nodes['n-select_one']!
    expect(one.options).toEqual([{ id: 'option', name: 'fever' }])

    // The same concept is found again for another question; several-choice answers are Observations.
    await user.click(screen.getByTestId('tab-nodes'))
    await user.click(screen.getByTestId('add-select_multiple'))
    await user.type(screen.getByTestId('add-option-search'), 'Fev')
    await user.click(screen.getByRole('option', { name: /Fever/ }))
    expect(screen.getByTestId('node-n-select_multiple-answer-option')).toHaveTextContent('Fever')
    await user.click(screen.getByTestId('add-option-new'))
    expect(screen.getByTestId('concept-type')).toHaveValue('Observation')
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
        name: 'sick-child',
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
      { id: 'a', name: 'a', activities: [{ ref: 'triage-process' }] },
      { id: 'b', name: 'b', activities: [{ ref: 'triage-process' }] },
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
        name: 'a',
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
        name: 'sick-child',
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

  it('imports after confirmation, and takes a process file from either tab as a process', async () => {
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

    // A process file imported from the Activities tab is listed, and imported, as a process.
    await user.upload(screen.getByTestId('import-activity-file', { hidden: true }), airway)
    await waitFor(() =>
      expect(screen.getByTestId('import-group-process')).toHaveTextContent('Processes (1)'),
    )
    expect(screen.queryByTestId('import-group-activity')).not.toBeInTheDocument()
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
        name: 'iv',
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
      { id: 'iv', name: 'iv', trigger: { mode: 'on-demand' }, activities: [] },
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
        name: 'iv',
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
        name: 'iv',
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

  it('opens the first process from the intervention title', async () => {
    const user = userEvent.setup()
    const project = seed()
    project.activities['a-process'] = createProcessActivity({ id: 'a-process', process: 'triage' })
    project.activities['b-process'] = createProcessActivity({ id: 'b-process', process: 'triage' })
    project.interventions = [
      { id: 'iv', name: 'iv', activities: [{ ref: 'a-process' }, { ref: 'b-process' }] },
      { id: 'empty', name: 'empty', activities: [] },
    ]
    const h = await harness(project)
    const opened: string[] = []
    renderWith(h, <ProjectOverview onSelect={(id) => opened.push(id)} />)

    await user.click(screen.getByTestId('open-intervention-iv'))
    expect(opened).toEqual(['a-process'])
    expect(screen.queryByTestId('open-intervention-empty')).not.toBeInTheDocument()
  })

  it('cannot move the first activity earlier or the last later', async () => {
    const project = seed()
    project.activities['a-process'] = createProcessActivity({ id: 'a-process', process: 'triage' })
    project.activities['b-process'] = createProcessActivity({ id: 'b-process', process: 'triage' })
    project.interventions = [
      {
        id: 'iv',
        name: 'iv',
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

describe('activity settings and delete', () => {
  it('sets the name, applicability and intent from the gear, and saves them on the activity', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)

    await user.click(screen.getByTestId('configure-activity'))
    expect(screen.getByTestId('activity-settings')).toBeInTheDocument()
    expect(screen.getByTestId('act-name')).toHaveAttribute('placeholder', 'triage')
    await user.type(screen.getByTestId('act-name'), 'triage_page')
    await user.type(screen.getByTestId('act-intent'), 'Children under five')
    fireEvent.change(screen.getByTestId('act-cql'), { target: { value: 'AgeInMonths() < 60' } })
    await user.click(screen.getByTestId('activity-settings-save'))
    expect(screen.queryByTestId('activity-settings')).not.toBeInTheDocument()

    const activity = h.open.document.snapshot().activities['triage']
    expect(activity?.name).toBe('triage_page')
    expect(activity?.applicability).toEqual({
      intent: { en: 'Children under five' },
      expression: 'AgeInMonths() < 60',
    })
    await h.runtime.save(h.open)
    const yaml = (await h.persistence.read(h.open.ref))['activities/triage.activity.yaml']
    expect(yaml).toContain('name: triage_page')
    expect(yaml).toContain('applicability: AgeInMonths() < 60')
    expect(yaml).toContain('intent: Children under five')
  })

  it('shows the activity on its root node, with a way into the settings', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)
    selectNode('s')
    expect(screen.getByTestId('activity-summary')).toHaveTextContent('Triage')
    await user.click(screen.getByTestId('root-activity-settings'))
    expect(screen.getByTestId('activity-settings')).toBeInTheDocument()
  })

  it('deletes an activity after confirmation, takes it off interventions, and undo restores it', async () => {
    const user = userEvent.setup()
    const project = seed()
    project.activities['caller'] = {
      id: 'caller',
      title: { en: 'Caller' },
      nodeOrder: ['s', 'g'],
      edgeOrder: [],
      nodes: {
        s: { id: 's', type: 'activity_start', ui: { x: 0, y: 0 } },
        g: { id: 'g', type: 'goto', link: 'triage', ui: { x: 0, y: 100 } },
      },
      edges: {},
    }
    project.interventions = [
      { id: 'iv', title: { en: 'Sick child' }, trigger: { mode: 'on-demand' }, activities: [{ ref: 'triage' }, { ref: 'caller' }] },
    ]
    const h = await harness(project)
    let deleted = false
    renderWith(h, <ActivityEditor activityId="triage" onDeleted={() => (deleted = true)} />)

    await user.click(screen.getByTestId('delete-activity'))
    expect(screen.getByTestId('delete-activity-listed-by')).toHaveTextContent('Sick child')
    expect(screen.getByTestId('delete-activity-linked-from')).toHaveTextContent('Caller')
    await user.click(screen.getByTestId('delete-activity-cancel'))
    expect(h.open.document.snapshot().activities['triage']).toBeDefined()

    await user.click(screen.getByTestId('delete-activity'))
    await user.click(screen.getByTestId('delete-activity-confirm'))
    const after = h.open.document.snapshot()
    expect(after.activities['triage']).toBeUndefined()
    expect(after.interventions[0]?.activities).toEqual([{ ref: 'caller' }])
    expect(after.activities['caller']?.nodes['g']?.link).toBe('triage')
    expect(deleted).toBe(true)

    h.open.document.undo.undo()
    const restored = h.open.document.snapshot()
    expect(restored.activities['triage']).toBeDefined()
    expect(restored.interventions[0]?.activities).toEqual([{ ref: 'triage' }, { ref: 'caller' }])
  })
})

describe('node text', () => {
  it('wraps to the viewer preference and shows the full text on hover', async () => {
    const project = seed()
    project.activities['triage']!.nodes['s']!.label = { en: 'A long clinical question that wraps' }
    const h = await harness(project)
    const listeners = new Set<() => void>()
    let lines = 3
    const preferences = {
      current: () => ({ labelLines: lines }),
      update: () => undefined,
      onChange: (cb: () => void) => {
        listeners.add(cb)
        return () => listeners.delete(cb)
      },
    }
    render(
      <TriccRuntimeProvider runtime={h.runtime} preferences={preferences}>
        <OpenProjectProvider project={h.open}>
          <ActivityEditor activityId="triage" />
        </OpenProjectProvider>
      </TriccRuntimeProvider>,
    )
    const editor = screen.getByTestId('activity-editor')
    expect(editor.style.getPropertyValue('--tricc-label-lines')).toBe('3')
    lines = 5
    act(() => listeners.forEach((l) => l()))
    expect(editor.style.getPropertyValue('--tricc-label-lines')).toBe('5')
  })
})

describe('diagram style', () => {
  it('draws a decision as a rhombus in flowchart style and a rectangle in BPMN style', async () => {
    const project = seed()
    const triage = project.activities['triage']!
    triage.nodes['r'] = { id: 'r', type: 'rhombus', ui: { x: 0, y: 100 } }
    triage.nodeOrder.push('r')
    const h = await harness(project)
    const listeners = new Set<() => void>()
    let diagramStyle: DiagramStyle = 'flowchart'
    const preferences = {
      current: () => ({ ...DEFAULT_PREFERENCES, diagramStyle }),
      update: () => undefined,
      onChange: (cb: () => void) => {
        listeners.add(cb)
        return () => listeners.delete(cb)
      },
    }
    render(
      <TriccRuntimeProvider runtime={h.runtime} preferences={preferences}>
        <OpenProjectProvider project={h.open}>
          <ActivityEditor activityId="triage" />
        </OpenProjectProvider>
      </TriccRuntimeProvider>,
    )
    expect(screen.getByTestId('node-r')).toHaveClass('tricc-node--diamond')
    diagramStyle = 'bpmn'
    act(() => listeners.forEach((l) => l()))
    expect(screen.getByTestId('node-r')).toHaveClass('tricc-node--decision')
    expect(screen.getByTestId('node-r')).not.toHaveClass('tricc-node--diamond')
  })
})

describe('the start node is the activity', () => {
  it('shows the activity title on the root, and no Name field on sequence nodes', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)
    expect(screen.getByTestId('node-s-label')).toHaveTextContent('Triage')

    selectNode('s')
    expect(screen.getByTestId('activity-summary')).toBeInTheDocument()
    expect(screen.queryByTestId('field-name')).not.toBeInTheDocument()
    expect(screen.queryByTestId('field-label')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('tab-nodes'))
    await user.click(screen.getByTestId('add-activity_end'))
    expect(screen.getByTestId('node-properties')).toHaveTextContent('activity_end')
    expect(screen.queryByTestId('field-name')).not.toBeInTheDocument()
    expect(h.open.document.snapshot().activities['triage']?.nodes['n-activity_end']?.name).toBeUndefined()
  })

  it('a renamed activity shows its new title on the root node', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)
    await user.click(screen.getByTestId('configure-activity'))
    await user.clear(screen.getByTestId('act-title'))
    await user.type(screen.getByTestId('act-title'), 'Danger signs')
    expect(screen.getByTestId('node-s-label')).toHaveTextContent('Danger signs')
  })
})

describe('data dictionary', () => {
  const URL = 'https://tricc.org/CodeSystem/test'
  function withWeight(): Project {
    const project = seed()
    project.codeSystems[URL] = {
      id: 'test',
      url: URL,
      name: 'test',
      status: 'draft',
      content: 'complete',
      concepts: {
        weight: { system: URL, code: 'weight', display: 'Weight (kg)', designations: [], dataType: 'decimal' },
      },
      conceptOrder: ['weight'],
    }
    project.defaultCodeSystem = URL
    const triage = project.activities['triage']!
    triage.nodes['w'] = { id: 'w', type: 'decimal', name: 'weight', ui: { x: 0, y: 100 } }
    triage.nodeOrder.push('w')
    return project
  }

  it('lists concepts in a table, and adds one through the dialog', async () => {
    const user = userEvent.setup()
    const h = await harness()
    let open: { system: string; code: string } | undefined
    const view = () => <DictionaryView open={open} onOpen={(k) => (open = k)} />
    const { rerender } = renderWith(h, view())
    expect(screen.getByTestId('no-concepts')).toBeInTheDocument()
    await user.click(screen.getByTestId('concept-add'))
    expect(screen.getByTestId('concept-dialog-save')).toBeDisabled()
    await user.type(screen.getByTestId('concept-code'), 'fever')
    await user.type(screen.getByTestId('concept-display'), 'Fever')
    await user.type(screen.getByTestId('concept-q-display'), 'Has the child had fever?')
    // Nothing is stored until Save.
    expect(Object.keys(h.open.document.snapshot().codeSystems)).toHaveLength(0)
    await user.click(screen.getByTestId('concept-dialog-save'))
    rerender(
      <TriccRuntimeProvider runtime={h.runtime}>
        <OpenProjectProvider project={h.open}>{view()}</OpenProjectProvider>
      </TriccRuntimeProvider>,
    )
    const snapshot = h.open.document.snapshot()
    const cs = Object.values(snapshot.codeSystems)[0]!
    expect(snapshot.defaultCodeSystem).toBe(cs.url)
    expect(cs.concepts['fever']?.display).toBe('Fever')
    expect(screen.getByTestId('concept-row-fever')).toHaveTextContent('Has the child had fever?')
    expect(screen.queryByTestId('concept-dialog')).not.toBeInTheDocument()
  })

  it('edits in a dialog: Cancel discards, Save stores, delete waits until unused', async () => {
    const user = userEvent.setup()
    const h = await harness(withWeight())
    renderWith(h, <DictionaryView open={{ system: URL, code: 'weight' }} onOpen={() => {}} />)
    await user.clear(screen.getByTestId('concept-display'))
    await user.type(screen.getByTestId('concept-display'), 'Body weight')
    await user.click(screen.getByTestId('concept-dialog-cancel'))
    expect(h.open.document.snapshot().codeSystems[URL]!.concepts['weight']!.display).toBe('Weight (kg)')
  })

  it('saves texts and type from the dialog, and offers concept types from preferences', async () => {
    const user = userEvent.setup()
    const h = await harness(withWeight())
    renderWith(h, <DictionaryView open={{ system: URL, code: 'weight' }} onOpen={() => {}} />)
    expect(screen.getByTestId('concept-delete')).toBeDisabled()
    await user.type(screen.getByTestId('concept-hint'), 'In kilograms')
    await user.selectOptions(screen.getByTestId('concept-type'), 'Vital')
    await user.click(screen.getByTestId('concept-dialog-save'))
    const concept = h.open.document.snapshot().codeSystems[URL]!.concepts['weight']!
    expect(concept.conceptType).toBe('Vital')
    expect(concept.designations).toEqual([
      { language: 'en', use: { system: 'https://tricc.org/CodeSystem/designation-use', code: 'hint' }, value: 'In kilograms' },
    ])
  })

  it('adds a translation row in a one-language project, and saves it once it has a language', async () => {
    const user = userEvent.setup()
    const h = await harness(withWeight())
    renderWith(h, <DictionaryView open={{ system: URL, code: 'weight' }} onOpen={() => {}} />)
    await user.click(screen.getByTestId('concept-text-add'))
    expect(screen.getByTestId('concept-texts')).toBeInTheDocument()
    expect(screen.getByTestId('concept-dialog-save')).toBeDisabled()
    await user.type(screen.getByTestId('concept-text-0-language'), 'fr')
    await user.type(screen.getByTestId('concept-text-0-value'), 'Pesez l’enfant')
    await user.click(screen.getByTestId('concept-dialog-save'))
    expect(h.open.document.snapshot().codeSystems[URL]!.concepts['weight']!.designations).toEqual([
      {
        language: 'fr',
        use: { system: 'https://tricc.org/CodeSystem/designation-use', code: 'q-display' },
        value: 'Pesez l’enfant',
      },
    ])
  })

  it('shows a node concept in short and edits it in the same dialog', async () => {
    const user = userEvent.setup()
    const h = await harness(withWeight())
    renderWith(h, <ActivityEditor activityId="triage" />)
    selectNode('w')
    expect(screen.getByTestId('concept-card-code')).toHaveTextContent('weight')
    await user.click(screen.getByTestId('concept-edit'))
    await user.type(screen.getByTestId('concept-q-display'), 'Weigh the child')
    await user.click(screen.getByTestId('concept-dialog-save'))
    expect(screen.getByTestId('concept-card-q-display')).toHaveTextContent('Weigh the child')
    expect(screen.getByTestId('node-w-label')).toHaveTextContent('Weigh the child')
  })
})

describe('texts live in the dictionary', () => {
  it('moves an imported question text into a concept named by the question', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityNavigator selected={undefined} onSelect={() => {}} />)
    const yaml = [
      'id: weight',
      'title: Weight measurement',
      'nodes:',
      '  - id: s',
      '    type: activity_start',
      '  - id: w',
      '    type: decimal',
      '    name: weight_kg',
      '    label: Weight (kg)',
      '    hint: Use a calibrated scale',
      '',
    ].join('\n')
    await user.upload(
      screen.getByTestId('import-activity-file', { hidden: true }),
      new File([yaml], 'weight.activity.yaml', { type: 'text/yaml' }),
    )
    await waitFor(() => expect(screen.getByTestId('import-confirm')).toBeEnabled())
    await user.click(screen.getByTestId('import-confirm'))
    const snapshot = h.open.document.snapshot()
    const cs = Object.values(snapshot.codeSystems)[0]!
    expect(cs.concepts['weight_kg']?.display).toBe('Weight (kg)')
    expect(cs.concepts['weight_kg']?.designations[0]?.value).toBe('Use a calibrated scale')
    expect(snapshot.activities['weight']?.nodes['w']).not.toHaveProperty('label')
  })

  it('creating a concept from a node moves its label into the concept, and hides the inline fields', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)
    await user.click(screen.getByTestId('add-integer'))
    await user.clear(screen.getByTestId('field-name'))
    await user.type(screen.getByTestId('field-name'), 'age_years')
    await user.type(screen.getByTestId('field-label'), 'Age in years')
    await user.click(screen.getByTestId('concept-create'))
    expect(screen.getByTestId('concept-code')).toHaveValue('age_years')
    expect(screen.getByTestId('concept-display')).toHaveValue('Age in years')
    await user.click(screen.getByTestId('concept-dialog-save'))
    const snapshot = h.open.document.snapshot()
    const cs = Object.values(snapshot.codeSystems)[0]!
    expect(cs.concepts['age_years']?.display).toBe('Age in years')
    expect(snapshot.activities['triage']?.nodes['n-integer']).not.toHaveProperty('label')
    expect(screen.queryByTestId('field-label')).not.toBeInTheDocument()
    expect(screen.queryByTestId('field-hint')).not.toBeInTheDocument()
    expect(screen.getByTestId('node-n-integer-label')).toHaveTextContent('Age in years')
  })
})

describe('questionnaire text per intervention', () => {
  it('scopes a translation or intervention text from the concept dialog', async () => {
    const user = userEvent.setup()
    const project = seed()
    const url = 'https://tricc.org/CodeSystem/test'
    project.codeSystems[url] = {
      id: 'test',
      url,
      status: 'draft',
      content: 'complete',
      concepts: { weight: { system: url, code: 'weight', display: 'Weight (kg)', designations: [] } },
      conceptOrder: ['weight'],
    }
    project.interventions = [
      { id: 'community', title: { en: 'Community' }, trigger: { mode: 'on-demand' }, activities: [] },
    ]
    const h = await harness(project)
    renderWith(h, <DictionaryView open={{ system: url, code: 'weight' }} onOpen={() => {}} />)
    await user.click(screen.getByTestId('concept-text-add'))
    await user.clear(screen.getByTestId('concept-text-0-language'))
    await user.type(screen.getByTestId('concept-text-0-language'), 'en')
    await user.type(screen.getByTestId('concept-text-0-value'), 'Weigh the child')
    await user.selectOptions(screen.getByTestId('concept-text-0-scope'), 'community')
    await user.click(screen.getByTestId('concept-dialog-save'))
    const d = h.open.document.snapshot().codeSystems[url]!.concepts['weight']!.designations[0]!
    expect(d).toMatchObject({ language: 'en', value: 'Weigh the child' })
    expect(d.extension).toEqual([
      { url: 'https://tricc.org/StructureDefinition/designation-intervention', valueCode: 'community' },
    ])
  })
})

describe('project settings and delete', () => {
  it('renames through the gear: Cancel keeps the name, Save stores it and tells the host', async () => {
    const user = userEvent.setup()
    const h = await harness()
    const renamed: string[] = []
    renderWith(h, <ProjectOverview onRename={(name) => renamed.push(name)} />)
    await user.click(screen.getByTestId('configure-project'))
    await user.clear(screen.getByTestId('project-title'))
    await user.type(screen.getByTestId('project-title'), 'Abandoned')
    await user.click(screen.getByTestId('project-settings-cancel'))
    expect(h.open.document.snapshot().title).toEqual({ en: 'Test guideline' })

    await user.click(screen.getByTestId('configure-project'))
    await user.clear(screen.getByTestId('project-title'))
    await user.type(screen.getByTestId('project-title'), 'IMCI 2026')
    await user.click(screen.getByTestId('project-settings-save'))
    expect(h.open.document.snapshot().title).toEqual({ en: 'IMCI 2026' })
    expect(renamed).toEqual(['IMCI 2026'])
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('IMCI 2026')
  })

  it('deletes only after confirmation, and says what happens to the files', async () => {
    const user = userEvent.setup()
    const h = await harness()
    let deleted = 0
    renderWith(h, <ProjectOverview onDelete={() => deleted++} deleteNote="The folder stays on disk." />)
    await user.click(screen.getByTestId('delete-project'))
    expect(screen.getByTestId('delete-project-note')).toHaveTextContent('The folder stays on disk.')
    await user.click(screen.getByTestId('delete-project-cancel'))
    expect(deleted).toBe(0)
    await user.click(screen.getByTestId('delete-project'))
    await user.click(screen.getByTestId('delete-project-confirm'))
    expect(deleted).toBe(1)
  })

  it('hides the bin without a host delete, and when read-only', async () => {
    const h = await harness()
    h.identity.setCapabilities(['project.read'])
    renderWith(h, <ProjectOverview onDelete={() => {}} />)
    expect(screen.queryByTestId('delete-project')).not.toBeInTheDocument()
    expect(screen.getByTestId('configure-project')).toBeInTheDocument()
  })
})

describe('node fields', () => {
  function withGoto(): Project {
    const project = seed()
    project.activities['cough'] = {
      id: 'cough',
      title: { en: 'Cough' },
      nodeOrder: ['s'],
      edgeOrder: [],
      nodes: { s: { id: 's', type: 'activity_start', ui: { x: 0, y: 0 } } },
      edges: {},
    }
    const triage = project.activities['triage']!
    triage.nodes['g'] = { id: 'g', type: 'goto', link: 'cough', ui: { x: 0, y: 100 } }
    triage.nodes['r'] = { id: 'r', type: 'rhombus', name: 'old_decision', ui: { x: 200, y: 100 } }
    triage.nodeOrder.push('g', 'r')
    return project
  }

  it('sets a repeat on a question and on a goto', async () => {
    const user = userEvent.setup()
    const h = await harness(withGoto())
    renderWith(h, <ActivityEditor activityId="triage" />)
    await user.click(screen.getByTestId('add-integer'))
    await user.type(screen.getByTestId('field-repeat'), '3')
    selectNode('g')
    await user.type(screen.getByTestId('field-repeat'), '2')
    const nodes = h.open.document.snapshot().activities['triage']!.nodes
    expect(nodes['n-integer']?.repeat).toBe(3)
    expect(nodes['g']?.repeat).toBe(2)
  })

  it('shows no name on a decision, and keeps the one a drawing gave it', async () => {
    const h = await harness(withGoto())
    renderWith(h, <ActivityEditor activityId="triage" />)
    selectNode('r')
    expect(screen.queryByTestId('field-name')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Internal id')).not.toBeInTheDocument()
    // The name stays in the document.
    expect(h.open.document.snapshot().activities['triage']!.nodes['r']?.name).toBe('old_decision')
  })

  it('shows no name on a goto', async () => {
    const h = await harness(withGoto())
    renderWith(h, <ActivityEditor activityId="triage" />)
    selectNode('g')
    expect(screen.queryByTestId('field-name')).not.toBeInTheDocument()
  })

  it('generates a hidden name for a new goto', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)
    await user.click(screen.getByTestId('add-goto'))
    expect(h.open.document.snapshot().activities['triage']!.nodes['n-goto']?.name).toBe('goto')
    expect(screen.queryByTestId('field-name')).not.toBeInTheDocument()
  })

  it('opens the activity a goto goes to, from its details and by Ctrl+click', async () => {
    const user = userEvent.setup()
    const h = await harness(withGoto())
    const opened: string[] = []
    renderWith(h, <ActivityEditor activityId="triage" onOpenActivity={(id) => opened.push(id)} />)
    selectNode('g')
    await user.click(screen.getByTestId('goto-open'))
    fireEvent.click(screen.getByTestId('node-g'), { ctrlKey: true })
    expect(opened).toEqual(['cough', 'cough'])
  })

  it('opens the activity a goto goes to from the follow button on the node', async () => {
    const user = userEvent.setup()
    const h = await harness(withGoto())
    const opened: string[] = []
    renderWith(h, <ActivityEditor activityId="triage" onOpenActivity={(id) => opened.push(id)} />)
    await user.click(screen.getByTestId('goto-follow-g'))
    expect(opened).toEqual(['cough'])
  })

  it('shows no follow button when the target is missing or nothing can open it', async () => {
    const project = withGoto()
    project.activities['triage']!.nodes['g']!.link = 'gone'
    const h = await harness(project)
    renderWith(h, <ActivityEditor activityId="triage" onOpenActivity={() => undefined} />)
    expect(screen.queryByTestId('goto-follow-g')).not.toBeInTheDocument()
    cleanup()
    const h2 = await harness(withGoto())
    renderWith(h2, <ActivityEditor activityId="triage" />)
    expect(screen.queryByTestId('goto-follow-g')).not.toBeInTheDocument()
  })

  it('lists the gotos that call an activity, on its start node and in its settings', async () => {
    const user = userEvent.setup()
    const project = withGoto()
    const triage = project.activities['triage']!
    triage.nodes['g2'] = { id: 'g2', type: 'goto', link: 'cough', ui: { x: 0, y: 200 } }
    triage.nodeOrder.push('g2')
    expect(goToCallers(project, 'cough')).toEqual([
      { activityId: 'triage', nodeId: 'g', label: 'Triage (1)' },
      { activityId: 'triage', nodeId: 'g2', label: 'Triage (2)' },
    ])
    expect(goToCallers(project, 'triage')).toEqual([])

    const h = await harness(project)
    const callers: string[] = []
    renderWith(
      h,
      <ActivityEditor activityId="cough" onOpenCaller={(a, n) => callers.push(`${a}/${n}`)} />,
    )
    selectNode('s')
    await user.click(screen.getByTestId('called-by-triage-g2'))
    await user.click(screen.getByTestId('root-activity-settings'))
    await user.click(
      within(screen.getByTestId('activity-settings')).getByTestId('called-by-triage-g'),
    )
    expect(callers).toEqual(['triage/g2', 'triage/g'])
    // Following a caller closes the settings.
    expect(screen.queryByTestId('activity-settings')).not.toBeInTheDocument()
  })
})

describe('comments on the diagram', () => {
  it('adds a coloured comment about a node, keeps it out of the guideline, and deletes it', async () => {
    const user = userEvent.setup()
    const project = seed()
    project.activities['triage']!.nodes['w'] = { id: 'w', type: 'decimal', name: 'weight', ui: { x: 0, y: 100 } }
    project.activities['triage']!.nodeOrder.push('w')
    const h = await harness(project)
    renderWith(h, <ActivityEditor activityId="triage" />)
    await user.click(screen.getByTestId('add-comment'))
    await user.type(screen.getByTestId('comment-text'), 'Check the 9 kg threshold')
    await user.selectOptions(screen.getByTestId('comment-color'), 'pink')
    await user.selectOptions(screen.getByTestId('comment-node'), 'w')
    expect(screen.getByTestId('comment-comment')).toHaveTextContent('Check the 9 kg threshold')
    expect(screen.getByTestId('comment-comment')).toHaveAttribute('data-color', 'pink')

    const triage = h.open.document.snapshot().activities['triage']!
    expect(triage.ui?.comments).toEqual([
      expect.objectContaining({ id: 'comment', text: 'Check the 9 kg threshold', color: 'pink', node: 'w' }),
    ])
    // Not a node, not an edge: conversion never sees it.
    expect(Object.keys(triage.nodes)).toEqual(['s', 'w'])
    expect(Object.keys(triage.edges)).toEqual([])
    await h.runtime.save(h.open)
    const yaml = (await h.persistence.read(h.open.ref))['activities/triage.activity.yaml']!
    expect(yaml).toMatch(/ui:\n(.|\n)*comments:/)

    await user.click(screen.getByTestId('comment-delete'))
    expect(h.open.document.snapshot().activities['triage']!.ui?.comments ?? []).toEqual([])
  })
})

describe('page groups', () => {
  it('adds a group, titles it through its concept, and ungroups keeping its nodes', async () => {
    const user = userEvent.setup()
    const project = seed()
    project.activities['triage']!.nodes['q'] = { id: 'q', type: 'select_yesno', name: 'convulsions', ui: { x: 0, y: 100 } }
    project.activities['triage']!.nodeOrder.push('q')
    const h = await harness(project)
    renderWith(h, <ActivityEditor activityId="triage" />)
    await user.click(screen.getByTestId('add-group'))
    expect(screen.getByTestId('group-properties')).toBeInTheDocument()
    await user.clear(screen.getByTestId('group-name'))
    await user.type(screen.getByTestId('group-name'), 'danger_signs')
    await user.type(screen.getByTestId('group-title'), 'Danger signs')
    await user.selectOptions(screen.getByTestId('group-color'), 'pink')
    expect(screen.getByTestId('group-group-title')).toHaveTextContent('Danger signs')

    const snap = h.open.document.snapshot()
    const group = snap.activities['triage']!.groups![0]!
    expect(group).toMatchObject({ id: 'group', name: 'danger_signs', color: 'pink' })
    expect(Object.values(snap.codeSystems)[0]!.concepts['danger_signs']?.display).toBe('Danger signs')

    // Membership is what tricc_oo reads; dragging into the frame sets it (e2e). Here directly.
    h.open.document.transact((tx) => tx.setNodeGroup('triage', 'q', 'group', 10, 40))
    await h.runtime.save(h.open)
    const yaml = (await h.persistence.read(h.open.ref))['activities/triage.activity.yaml']!
    expect(yaml).toMatch(/groups:\n  - id: group\n    name: danger_signs/)
    expect(yaml).toContain('group: group')

    await user.click(screen.getByTestId('group-ungroup'))
    const after = h.open.document.snapshot().activities['triage']!
    expect(after.groups).toBeUndefined()
    expect(after.nodes['q']?.group).toBeUndefined()
    expect(after.nodes['q']?.ui).toMatchObject({ x: group.x + 10, y: group.y + 40 })
  })
})

describe('hint and help marks', () => {
  it('shows a yellow (!) for a hint and a blue (?) for help, from the concept', async () => {
    const project = seed()
    const url = 'https://tricc.org/CodeSystem/test'
    const use = (code: string) => ({ system: 'https://tricc.org/CodeSystem/designation-use', code })
    project.codeSystems[url] = {
      id: 'test',
      url,
      status: 'draft',
      content: 'complete',
      concepts: {
        weight: {
          system: url,
          code: 'weight',
          display: 'Weight (kg)',
          designations: [
            { language: 'en', use: use('hint'), value: 'Use a calibrated scale' },
            { language: 'en', use: use('help'), value: 'Undress the child first' },
          ],
        },
        age: { system: url, code: 'age', display: 'Age', designations: [] },
      },
      conceptOrder: ['weight', 'age'],
    }
    project.defaultCodeSystem = url
    const triage = project.activities['triage']!
    triage.nodes['w'] = { id: 'w', type: 'decimal', name: 'weight', ui: { x: 0, y: 100 } }
    triage.nodes['a'] = { id: 'a', type: 'integer', name: 'age', ui: { x: 0, y: 200 } }
    triage.nodeOrder.push('w', 'a')
    const h = await harness(project)
    renderWith(h, <ActivityEditor activityId="triage" />)
    expect(screen.getByTestId('node-w-hint')).toHaveAttribute('title', 'Hint: Use a calibrated scale')
    expect(screen.getByTestId('node-w-help')).toHaveAttribute('title', 'Help: Undress the child first')
    expect(screen.queryByTestId('node-a-hint')).not.toBeInTheDocument()
    expect(screen.queryByTestId('node-a-help')).not.toBeInTheDocument()
  })
})


describe('breadcrumb trail', () => {
  it('resets from a list, grows through gotos and cuts back on a loop', () => {
    expect(nextTrail(['a', 'b'], 'c', 'reset')).toEqual(['c'])
    expect(nextTrail(['a'], 'b', 'follow')).toEqual(['a', 'b'])
    expect(nextTrail(['a', 'b', 'c'], 'a', 'follow')).toEqual(['a'])
    // Back to a caller: kept if it is on the trail, else a fresh trail.
    expect(nextTrail(['a', 'b'], 'a', 'return')).toEqual(['a'])
    expect(nextTrail(['b'], 'x', 'return')).toEqual(['x'])
  })
})
