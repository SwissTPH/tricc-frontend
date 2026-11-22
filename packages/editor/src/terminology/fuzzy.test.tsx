import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createProject, createTriccRuntime, type Project } from '@tricc/core'
import {
  MemoryCatalog,
  MemoryIdentity,
  MemoryPersistence,
  memoryAdapters,
} from '@tricc/adapters-memory'
import { OpenProjectProvider, TriccRuntimeProvider } from '../runtime/context.js'
import { DictionaryView } from './DictionaryView.js'

/** Concepts made from generic `label_` names are marked fuzzy and can be listed alone. */

const DD = 'https://tricc.org/CodeSystem/p'

function seed(): Project {
  const project = createProject({ id: 'p', title: 'P' })
  project.codeSystems[DD] = {
    id: 'p',
    url: DD,
    status: 'draft',
    content: 'complete',
    conceptOrder: ['cough', 'label_42'],
    concepts: {
      cough: { system: DD, code: 'cough', display: 'Cough', designations: [] },
      label_42: {
        system: DD,
        code: 'label_42',
        display: 'Give 1 tablet',
        designations: [],
        fuzzy: true,
      },
    },
  }
  project.defaultCodeSystem = DD
  return project
}

beforeEach(cleanup)

describe('fuzzy concepts in the data dictionary', () => {
  it('badges them and lists them alone on demand', async () => {
    const user = userEvent.setup()
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
          <DictionaryView system={DD} onOpen={() => {}} />
        </OpenProjectProvider>
      </TriccRuntimeProvider>,
    )
    expect(screen.getByTestId('concept-row-label_42-fuzzy')).toHaveTextContent('Fuzzy')
    expect(screen.queryByTestId('concept-row-cough-fuzzy')).toBeNull()
    expect(screen.getByTestId('concept-row-cough')).toBeInTheDocument()
    await user.click(screen.getByTestId('concept-fuzzy-only'))
    expect(screen.queryByTestId('concept-row-cough')).toBeNull()
    expect(screen.getByTestId('concept-row-label_42')).toBeInTheDocument()
  })

  it('clears the flag once reviewed', async () => {
    const user = userEvent.setup()
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
          <DictionaryView system={DD} open={{ system: DD, code: 'label_42' }} onOpen={() => {}} />
        </OpenProjectProvider>
      </TriccRuntimeProvider>,
    )
    expect(screen.getByTestId('concept-fuzzy')).toBeChecked()
    await user.click(screen.getByTestId('concept-fuzzy'))
    await user.click(screen.getByTestId('concept-dialog-save'))
    expect(open.document.snapshot().codeSystems[DD]!.concepts['label_42']!.fuzzy).toBeUndefined()
  })
})
