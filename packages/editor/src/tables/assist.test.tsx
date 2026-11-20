import { beforeEach, describe, expect, it } from 'vitest'
import { useState } from 'react'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
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
import { CqlExpressionField } from '../cql/CqlExpressionField.js'
import { tableCallText, tableNamePrefix } from '../cql/TableAssist.js'
import { AliasSettings, parseAlias } from './AliasSettings.js'

/** Table calls in expression fields and aliases (decision-table-editor phase 3). */

function seed(): Project {
  const project = createProject({ id: 'p', title: 'P' })
  project.decisionTables = {
    diazepam: {
      id: 'diazepam',
      title: 'Diazepam',
      hitPolicy: 'first',
      inputs: [
        { name: 'weight', concept: 'weight', type: 'decimal' },
        { name: 'age', concept: 'age_in_months', type: 'integer' },
      ],
      outputs: [{ name: 'dose', type: 'string' }],
      rules: [['>= 3', '-', '0.4']],
    },
    dexamethasone: {
      id: 'dexamethasone',
      hitPolicy: 'rule_order',
      inputs: [{ name: 'weight', type: 'decimal' }],
      outputs: [{ name: 'dose', type: 'string' }],
      rules: [['-', '1']],
    },
  }
  return project
}

interface Harness {
  runtime: TriccRuntime
  open: OpenProject
}

async function harness(): Promise<Harness> {
  const adapters = memoryAdapters({
    persistence: new MemoryPersistence(),
    catalog: new MemoryCatalog(),
    identity: new MemoryIdentity(),
  })
  const runtime = createTriccRuntime(adapters)
  return { runtime, open: await runtime.create('P', seed()) }
}

function Field({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <CqlExpressionField
      id="f"
      testId="f"
      label="Calculation"
      value={value}
      readOnly={false}
      onChange={setValue}
    />
  )
}

function renderWith(h: Harness, ui: React.ReactNode) {
  return render(
    <TriccRuntimeProvider runtime={h.runtime}>
      <OpenProjectProvider project={h.open}>{ui}</OpenProjectProvider>
    </TriccRuntimeProvider>,
  )
}

beforeEach(cleanup)

describe('helpers', () => {
  it('builds the inserted call and finds a table name being typed', () => {
    expect(tableCallText(seed().decisionTables!['diazepam']!)).toBe(
      `DMN('diazepam', "weight", "age_in_months")`,
    )
    expect(tableNamePrefix(`1 + DMNList('di`, 15, {})).toEqual({ from: 13, prefix: 'di' })
    expect(tableNamePrefix(`DrugDosage('`, 12, {})).toEqual({ from: 12, prefix: '' })
    expect(tableNamePrefix(`'DMN('di`, 8, {})).toBeUndefined()
  })

  it('reads an alias call', () => {
    expect(parseAlias('DMNList(table, weight)')).toEqual({
      function: 'DMNList',
      args: ['table', 'weight'],
    })
    expect(parseAlias('DMN(age, weight)')).toBeUndefined()
    expect(parseAlias('Foo(table)')).toBeUndefined()
  })
})

describe('table calls in an expression field', () => {
  it("completes a table name after DMN('", async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <Field />)
    await user.type(screen.getByTestId('f'), "DMN('dia")
    expect(screen.getByTestId('f-tables')).toHaveTextContent('diazepam')
    expect(screen.queryByTestId('f-table-dexamethasone')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('f-table-diazepam'))
    expect(screen.getByTestId('f')).toHaveValue("DMN('diazepam'")
  })

  it('shows the signature with the current argument', async () => {
    const h = await harness()
    renderWith(h, <Field initial={`DMN('diazepam', 12, )`} />)
    const field = screen.getByTestId('f') as HTMLTextAreaElement
    field.focus()
    field.setSelectionRange(20, 20)
    fireEvent.select(field)
    const signature = screen.getByTestId('f-signature')
    expect(signature).toHaveTextContent(`DMN('diazepam', weight, age) → dose (first matching row)`)
    expect(signature.querySelector('strong')).toHaveTextContent('age')
  })

  it('inserts a table call', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <Field initial="1 +" />)
    await user.selectOptions(screen.getByTestId('f-insert-table'), 'diazepam')
    expect(screen.getByTestId('f')).toHaveValue(`1 + DMN('diazepam', "weight", "age_in_months")`)
  })

  it('shows unknown tables, argument counts and result types in place', async () => {
    const h = await harness()
    renderWith(
      h,
      <Field initial={`DMN('nope') + DMN('diazepam', 1, 2, 3) + DMN('dexamethasone')`} />,
    )
    const lint = screen.getByTestId('f-lint')
    expect(lint.querySelector('[data-rule="E_DMN_TABLE_UNKNOWN"]')).toHaveTextContent(
      'no table "nope"',
    )
    expect(lint.querySelector('[data-rule="E_DMN_ARITY"]')).toHaveTextContent('up to 2 values')
    expect(lint.querySelector('[data-rule="E_DMN_TYPE"]')).toHaveTextContent('gives a list')
  })
})

describe('aliases in the project settings', () => {
  it('adds and removes an alias; DrugDosage is built in until declared', async () => {
    const user = userEvent.setup()
    const h = await harness()
    renderWith(h, <AliasSettings />)
    expect(screen.getByTestId('alias-builtin-DrugDosage')).toHaveTextContent(
      'DrugDosage = DMN(table, age, weight) built in',
    )
    await user.type(screen.getByTestId('alias-new-name'), 'Dose')
    await user.type(screen.getByTestId('alias-new-call'), 'DMN(age){Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('"table"')
    await user.clear(screen.getByTestId('alias-new-call'))
    await user.type(screen.getByTestId('alias-new-call'), 'DMNList(table, weight){Enter}')
    expect(h.open.document.snapshot().aliases).toEqual({
      Dose: { function: 'DMNList', args: ['table', 'weight'] },
    })
    await user.click(screen.getByTestId('alias-remove-Dose'))
    expect(h.open.document.snapshot().aliases).toBeUndefined()
  })
})
