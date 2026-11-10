import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createProject,
  createTriccRuntime,
  retrieveCodeSystem,
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
import { ActivityEditor } from '../activity/ActivityEditor.js'
import { DictionaryView } from './DictionaryView.js'

/**
 * The retrieval dictionary and prefilled values in the editor
 * (feature/20261109-project-retrievals.md, fix/20261109-populate-source-period.md).
 */

const DD = 'https://tricc.org/CodeSystem/test-guideline'

function seed(): Project {
  const project = createProject({ id: 'test-guideline', title: 'Test guideline' })
  project.codeSystems[DD] = {
    id: 'test-guideline',
    url: DD,
    status: 'draft',
    content: 'complete',
    conceptOrder: ['weight'],
    concepts: { weight: { system: DD, code: 'weight', display: 'Weight', designations: [] } },
  }
  project.defaultCodeSystem = DD
  project.activities['triage'] = {
    id: 'triage',
    title: { en: 'Triage' },
    nodeOrder: ['s', 'prev', 'calc'],
    edgeOrder: ['e1', 'e2'],
    nodes: {
      s: { id: 's', type: 'activity_start', name: 'triage', ui: { x: 0, y: 0 } },
      prev: {
        id: 'prev',
        type: 'populate',
        name: 'prev_weight',
        context: 'history',
        label: { en: 'Previous weight' },
        ui: { x: 0, y: 100 },
      },
      calc: {
        id: 'calc',
        type: 'calculate',
        name: 'gain',
        calculate: { expression: '"weight" - "prev_weight"' },
        ui: { x: 0, y: 200 },
      },
    },
    edges: {
      e1: { id: 'e1', source: 's', target: 'prev' },
      e2: { id: 'e2', source: 'prev', target: 'calc' },
    },
  }
  return project
}

interface Harness {
  runtime: TriccRuntime
  open: OpenProject
}

async function harness(project = seed()): Promise<Harness> {
  const adapters = memoryAdapters({
    persistence: new MemoryPersistence(),
    catalog: new MemoryCatalog(),
    identity: new MemoryIdentity(),
  })
  const runtime = createTriccRuntime(adapters)
  const open = await runtime.create('Test guideline', project)
  return { runtime, open }
}

function renderWith(h: Harness, ui: React.ReactNode) {
  return render(
    <TriccRuntimeProvider runtime={h.runtime}>
      <OpenProjectProvider project={h.open}>{ui}</OpenProjectProvider>
    </TriccRuntimeProvider>,
  )
}

const node = (h: Harness, id: string) => h.open.document.snapshot().activities['triage']!.nodes[id]

beforeEach(cleanup)

describe('prefilled value inspector', () => {
  it('sets the source concept and the period, and drops the period off history', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)
    fireEvent.click(screen.getByTestId('node-prev'))

    expect(screen.getByTestId('field-source-implicit')).toHaveTextContent('the dictionary has none')
    await user.type(screen.getByTestId('field-source-search'), 'Weig')
    await user.click(screen.getByTestId(`field-source-search-option-${DD}|weight`))
    expect(node(h, 'prev')?.source).toBe('weight')
    expect(screen.getByTestId('field-source-value')).toHaveTextContent('Weight')

    await user.type(screen.getByTestId('field-period'), '30 days')
    expect(screen.getByTestId('field-period-invalid')).toBeInTheDocument()
    await user.clear(screen.getByTestId('field-period'))
    await user.type(screen.getByTestId('field-period'), 'P30D')
    expect(node(h, 'prev')?.period).toBe('P30D')

    await user.selectOptions(screen.getByTestId('field-context'), 'patient')
    expect(node(h, 'prev')?.period).toBeUndefined()
    expect(screen.queryByTestId('field-period')).not.toBeInTheDocument()
  })

  it('moves the prefilled value to the retrieval dictionary', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <ActivityEditor activityId="triage" />)
    fireEvent.click(screen.getByTestId('node-prev'))
    await user.click(screen.getByTestId('populate-move-to-retrieval'))

    const project = h.open.document.snapshot()
    expect(project.activities['triage']!.nodes['prev']).toBeUndefined()
    expect(node(h, 'calc')?.calculate?.expression).toBe('"weight" - "#prev_weight"')
    expect(retrieveCodeSystem(project)?.concepts['#prev_weight']).toMatchObject({
      display: 'Previous weight',
      retrieval: { context: 'history' },
    })
    expect(screen.queryByTestId('node-prev')).not.toBeInTheDocument()
  })

  it('offers the retrievals in an expression field', async () => {
    const user = userEvent.setup()
    const h = await harness()
    h.open.document.transact((tx) => tx.moveToRetrieval('triage', 'prev'))
    renderWith(h, <ActivityEditor activityId="triage" />)
    fireEvent.click(screen.getByTestId('node-calc'))
    await user.selectOptions(screen.getByTestId('field-calculate-insert-retrieval'), '#prev_weight')
    expect(node(h, 'calc')?.calculate?.expression).toBe('"weight" - "#prev_weight" "#prev_weight"')
    expect(screen.getByTestId('field-calculate-display')).toHaveTextContent('Previous weight')
  })
})

describe('retrieval dictionary', () => {
  it('creates a retrieval with a catalogue function and lists where it is used', async () => {
    const user = userEvent.setup()
    const h = await harness()
    const url = `${DD}-retrieve`
    renderWith(h, <DictionaryView system={url} onOpen={() => {}} />)
    expect(screen.getByTestId('dictionary-retrieve-note')).toBeInTheDocument()

    await user.click(screen.getByTestId('concept-add'))
    expect(screen.getByTestId('concept-dialog')).toHaveTextContent('New retrieval')
    const code = screen.getByTestId('concept-code')
    await user.type(code, 'Age')
    expect(screen.getByTestId('concept-dialog-error')).toHaveTextContent('retrieval code')
    await user.clear(code)
    await user.type(code, '#age_months')
    await user.type(screen.getByTestId('concept-display'), 'Age in months')
    expect(screen.queryByTestId('concept-q-display')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByTestId('retrieval-function'), 'AgeInMonths')
    expect(screen.queryByTestId('retrieval-reads')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('concept-dialog-save'))

    const project = h.open.document.snapshot()
    expect(project.retrieveCodeSystem).toBe(url)
    expect(project.codeSystems[url]!.concepts['#age_months']).toMatchObject({
      display: 'Age in months',
      retrieval: { context: 'patient', function: 'AgeInMonths' },
    })
    expect(screen.getByTestId('concept-row-#age_months')).toHaveTextContent(
      'Patient · Age in months',
    )
  })

  it('edits a custom retrieval with an expression per language', async () => {
    const user = userEvent.setup()
    const h = await harness()
    h.open.document.transact((tx) => tx.moveToRetrieval('triage', 'prev'))
    const url = retrieveCodeSystem(h.open.document.snapshot())!.url
    renderWith(
      h,
      <DictionaryView
        system={url}
        open={{ system: url, code: '#prev_weight' }}
        onOpen={() => {}}
      />,
    )

    expect(screen.getByTestId('retrieval-uses')).toHaveTextContent('Triage — gain (calculate)')
    expect(screen.getByTestId('concept-delete')).toBeDisabled()
    await user.selectOptions(screen.getByTestId('retrieval-context'), 'custom')
    expect(screen.getByTestId('retrieval-placeholders')).toHaveTextContent('{{period}}')
    fireEvent.change(screen.getByTestId('retrieval-expression-cql'), {
      target: { value: 'Last({{code}}, {{period}})' },
    })
    await user.click(screen.getByTestId('concept-dialog-save'))
    expect(
      retrieveCodeSystem(h.open.document.snapshot())!.concepts['#prev_weight']!.retrieval,
    ).toEqual({
      context: 'custom',
      expressions: [{ language: 'text/cql', expression: 'Last({{code}}, {{period}})' }],
    })
  })
})
