import { beforeEach, describe, expect, it } from 'vitest'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
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
import { TablesView } from './TablesView.js'

/** Decision tables in the editor (feature/20261120-decision-table-editor.md, phase 2). */

const DD = 'https://tricc.org/CodeSystem/test-guideline'

function seed(): Project {
  const project = createProject({ id: 'test-guideline', title: 'Test guideline' })
  project.codeSystems[DD] = {
    id: 'test-guideline',
    url: DD,
    status: 'draft',
    content: 'complete',
    conceptOrder: ['weight', 'age_in_months'],
    concepts: {
      weight: {
        system: DD,
        code: 'weight',
        display: 'Weight',
        dataType: 'decimal',
        designations: [],
      },
      age_in_months: {
        system: DD,
        code: 'age_in_months',
        display: 'Age in months',
        dataType: 'integer',
        designations: [],
      },
    },
  }
  project.defaultCodeSystem = DD
  project.decisionTables = {
    diazepam: {
      id: 'diazepam',
      title: 'Diazepam, rectal (ml)',
      hitPolicy: 'first',
      inputs: [
        { name: 'weight', concept: 'weight', type: 'decimal' },
        { name: 'age', concept: 'age_in_months', type: 'integer' },
      ],
      outputs: [{ name: 'dose', type: 'string' }],
      rules: [
        ['>= 20', '-', '2.5'],
        ['[10..20)', '-', '1.2'],
        ['-', '>= 12', '1.2'],
        ['-', '[2..12)', '0.4'],
      ],
    },
  }
  project.activities['treat'] = {
    id: 'treat',
    nodeOrder: ['s', 'dose'],
    edgeOrder: ['e'],
    nodes: {
      s: { id: 's', type: 'activity_start', name: 'treat', ui: { x: 0, y: 0 } },
      dose: {
        id: 'dose',
        type: 'calculate',
        name: 'diazepam_dose',
        calculate: { expression: `DMN('diazepam', "weight", "age_in_months")` },
        ui: { x: 0, y: 100 },
      },
    },
    edges: { e: { id: 'e', source: 's', target: 'dose' } },
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

function View({ initial }: { initial?: string }) {
  const [open, setOpen] = useState<string | undefined>(initial)
  return <TablesView open={open} onOpen={setOpen} />
}

function renderWith(h: Harness, initial?: string) {
  return render(
    <TriccRuntimeProvider runtime={h.runtime}>
      <OpenProjectProvider project={h.open}>
        <View {...(initial ? { initial } : {})} />
      </OpenProjectProvider>
    </TriccRuntimeProvider>,
  )
}

const table = (h: Harness, id = 'diazepam') => h.open.document.snapshot().decisionTables?.[id]

beforeEach(cleanup)

describe('decision tables view', () => {
  it('lists the tables and opens one', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h)
    expect(screen.getByTestId('table-row-diazepam')).toHaveTextContent('Diazepam, rectal (ml)')
    await user.click(screen.getByTestId('table-row-diazepam'))
    expect(screen.getByTestId('table-editor')).toHaveTextContent(`DMN('diazepam', weight, age)`)
    expect(screen.getByTestId('table-usage')).toHaveTextContent('diazepam_dose')
  })

  it('adds a table', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h)
    await user.click(screen.getByTestId('table-add'))
    expect(table(h, 'table')?.rules).toEqual([['-', '']])
    expect(screen.getByTestId('table-editor')).toBeInTheDocument()
  })

  it('edits a cell, underlines an invalid one, and reorders rows', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, 'diazepam')
    const cell = screen.getByTestId('table-cell-1-2')
    await user.clear(cell)
    await user.type(cell, '1.7{Enter}')
    expect(table(h)?.rules[1]).toEqual(['[10..20)', '-', '1.7'])

    const bad = screen.getByTestId('table-cell-0-0')
    await user.clear(bad)
    await user.type(bad, '>= x{Enter}')
    expect(screen.getByTestId('table-cell-0-0')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByTestId('table-problems')).toHaveTextContent('Row 1')

    await user.click(screen.getByTestId('table-rule-down-2'))
    expect(table(h)?.rules.map((r) => r[2])).toEqual(['2.5', '1.7', '0.4', '1.2'])
  })

  it('shows the matching rows and the result per hit policy', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, 'diazepam')
    await user.type(screen.getByTestId('table-test-weight'), '25')
    await user.type(screen.getByTestId('table-test-age'), '40')
    expect(screen.getByTestId('table-test-result')).toHaveTextContent(
      'Matching rows: 1, 3. Row 1 gives 2.5.',
    )
    expect(screen.getByTestId('table-rule-0')).toHaveAttribute('data-kept', 'true')
    expect(screen.getByTestId('table-rule-2')).toHaveAttribute('data-match', 'true')

    await user.selectOptions(screen.getByTestId('table-policy'), 'rule_order')
    expect(table(h)?.hitPolicy).toBe('rule_order')
    expect(screen.getByTestId('table-test-result')).toHaveTextContent('List: [2.5], [1.2].')

    await user.selectOptions(screen.getByTestId('table-policy'), 'unique')
    expect(screen.getByTestId('table-problems')).toHaveTextContent('can both match')
  })

  it('adds, moves and removes columns, keeping the rows in step', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, 'diazepam')
    await user.click(screen.getByTestId('table-add-input'))
    expect(table(h)?.inputs.map((c) => c.name)).toEqual(['weight', 'age', 'input'])
    expect(table(h)?.rules[0]).toEqual(['>= 20', '-', '-', '2.5'])

    const age = screen.getByTestId('table-input-1')
    await user.click(within(age).getByRole('button', { name: 'Move age left' }))
    expect(table(h)?.inputs.map((c) => c.name)).toEqual(['age', 'weight', 'input'])
    expect(table(h)?.rules[0]).toEqual(['-', '>= 20', '-', '2.5'])

    await user.click(screen.getByTestId('table-input-2-remove'))
    await user.click(screen.getByTestId('table-add-output'))
    expect(table(h)?.outputs.map((c) => c.name)).toEqual(['dose', 'output'])
    expect(table(h)?.rules[0]).toEqual(['-', '>= 20', '2.5', ''])
  })

  it('picks a concept for an input, taking its type', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, 'diazepam')
    await user.click(screen.getByTestId('table-add-input'))
    await user.selectOptions(screen.getByTestId('table-input-2-type'), 'string')
    await user.type(screen.getByTestId('table-input-2-concept-search'), 'Age')
    await user.click(screen.getByTestId('table-input-2-concept-search-option-age_in_months'))
    expect(table(h)?.inputs[2]).toEqual({
      name: 'input',
      concept: 'age_in_months',
      type: 'integer',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Clear the concept of input' }))
    expect(table(h)?.inputs[2]).toEqual({ name: 'input', type: 'integer' })
  })

  it('renames and deletes a table', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, 'diazepam')
    const id = screen.getByTestId('table-id')
    await user.clear(id)
    await user.type(id, 'diazepam_rectal{Enter}')
    expect(Object.keys(h.open.document.snapshot().decisionTables ?? {})).toEqual([
      'diazepam_rectal',
    ])
    await user.click(screen.getByTestId('table-delete'))
    expect(screen.getByTestId('table-delete-confirm-dialog')).toHaveTextContent(
      'No expression calls it',
    )
    await user.click(
      within(screen.getByTestId('table-delete-confirm-dialog')).getByRole('button', {
        name: /delete/i,
      }),
    )
    expect(h.open.document.snapshot().decisionTables).toBeUndefined()
    expect(screen.getByTestId('no-tables')).toBeInTheDocument()
  })
})

describe('decision table files', () => {
  it('imports a CSV as a new table and opens it', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h)
    const csv = 'weight,dose\ninput decimal weight,output string\n>= 20,2.5\n"[3..20)",1.2\n'
    await user.upload(
      screen.getByTestId('table-import-file'),
      new File([csv], 'Diazepam.csv', { type: 'text/csv' }),
    )
    expect(await screen.findByTestId('table-editor')).toHaveTextContent(`DMN('diazepam_2', weight)`)
    expect(table(h, 'diazepam_2')?.rules).toEqual([
      ['>= 20', '2.5'],
      ['[3..20)', '1.2'],
    ])
  })

  it('says why a file cannot be read', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h)
    await user.upload(
      screen.getByTestId('table-import-file'),
      new File(['only'], 'x.csv', { type: 'text/csv' }),
    )
    expect(await screen.findByTestId('table-import-note')).toHaveTextContent('name the columns')
  })

  it('exports the open table', async () => {
    const user = userEvent.setup()
    const h = await harness()
    const blobs: Blob[] = []
    const names: string[] = []
    URL.createObjectURL = (b: Blob) => {
      blobs.push(b)
      return 'blob:x'
    }
    URL.revokeObjectURL = () => {}
    const click = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      names.push(this.download)
    }
    try {
      renderWith(h, 'diazepam')
      await user.click(screen.getByTestId('table-export-csv'))
      await user.click(screen.getByTestId('table-export-dmn'))
      await user.click(screen.getByTestId('table-export-xlsx'))
    } finally {
      HTMLAnchorElement.prototype.click = click
    }
    expect(names).toEqual(['diazepam.csv', 'diazepam.dmn', 'diazepam.xlsx'])
    const text = (b: Blob) =>
      new Promise<string>((resolve) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.readAsText(b)
      })
    expect(await text(blobs[0]!)).toContain('weight,age,dose\r\ninput decimal weight')
    expect(await text(blobs[1]!)).toContain('hitPolicy="FIRST"')
  })
})
