import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Typeahead, type TypeaheadOption } from './Typeahead.js'

const OPTIONS: TypeaheadOption[] = [
  { id: 'triage', label: 'Triage — danger signs', hint: 'triage' },
  { id: 'reg', label: 'Register the child', hint: 'reg' },
  { id: 'cough', label: 'Cough assessment', hint: 'hp-cough' },
  { id: 'diarrhoea', label: 'Diarrhoea assessment', hint: 'hp-diarrhoea' },
]

function setup(props: Partial<Parameters<typeof Typeahead>[0]> = {}) {
  const onSelect = vi.fn()
  render(
    <Typeahead
      testId="picker"
      label="Add an activity"
      options={OPTIONS}
      onSelect={onSelect}
      {...props}
    />,
  )
  return { onSelect, user: userEvent.setup() }
}

beforeEach(cleanup)

describe('searching', () => {
  it('filters by label', async () => {
    const { user } = setup()
    await user.type(screen.getByTestId('picker'), 'cough')

    expect(screen.getByTestId('picker-option-cough')).toBeInTheDocument()
    expect(screen.queryByTestId('picker-option-triage')).not.toBeInTheDocument()
  })

  it('filters by the secondary hint as well, since ids differ from titles', async () => {
    const { user } = setup()
    await user.type(screen.getByTestId('picker'), 'hp-')

    expect(screen.getByTestId('picker-option-cough')).toBeInTheDocument()
    expect(screen.getByTestId('picker-option-diarrhoea')).toBeInTheDocument()
    expect(screen.queryByTestId('picker-option-reg')).not.toBeInTheDocument()
  })

  it('is case-insensitive', async () => {
    const { user } = setup()
    await user.type(screen.getByTestId('picker'), 'TRIAGE')
    expect(screen.getByTestId('picker-option-triage')).toBeInTheDocument()
  })

  it('ranks a prefix match above a mere substring match', async () => {
    const { user } = setup()
    await user.type(screen.getByTestId('picker'), 'c')

    const rendered = screen.getAllByRole('option').map((el) => el.textContent)
    // "Cough assessment" starts with c; "Register the child" only contains one.
    expect(rendered[0]).toContain('Cough assessment')
  })

  it('says so when nothing matches', async () => {
    const { user } = setup()
    await user.type(screen.getByTestId('picker'), 'zzzz')

    expect(screen.getByTestId('picker-empty')).toBeInTheDocument()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('suggests without a query, so the list is discoverable', async () => {
    const { user } = setup()
    await user.click(screen.getByTestId('picker'))
    expect(screen.getAllByRole('option')).toHaveLength(4)
  })

  it('caps the unqueried suggestions', async () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ id: `a${i}`, label: `Activity ${i}` }))
    const { user } = setup({ options: many, initialSuggestions: 5 })
    await user.click(screen.getByTestId('picker'))
    expect(screen.getAllByRole('option')).toHaveLength(5)
  })
})

describe('picking', () => {
  it('selects by click and clears the query', async () => {
    const { user, onSelect } = setup()
    await user.type(screen.getByTestId('picker'), 'cough')
    await user.click(screen.getByTestId('picker-option-cough'))

    expect(onSelect).toHaveBeenCalledWith('cough')
    expect(screen.getByTestId('picker')).toHaveValue('')
    expect(screen.queryByTestId('picker-list')).not.toBeInTheDocument()
  })

  it('selects the highlighted option with Enter', async () => {
    const { user, onSelect } = setup()
    await user.type(screen.getByTestId('picker'), 'assessment')
    await user.keyboard('{ArrowDown}{Enter}')

    // Two matches; ArrowDown moves from the first to the second.
    expect(onSelect).toHaveBeenCalledWith('diarrhoea')
  })

  it('does nothing on Enter when nothing matches', async () => {
    const { user, onSelect } = setup()
    await user.type(screen.getByTestId('picker'), 'zzzz')
    await user.keyboard('{Enter}')
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('keyboard navigation', () => {
  it('wraps around at both ends', async () => {
    const { user, onSelect } = setup()
    await user.click(screen.getByTestId('picker'))

    // Up from the first option wraps to the last.
    await user.keyboard('{ArrowUp}{Enter}')
    expect(onSelect).toHaveBeenCalledWith('diarrhoea')
  })

  it('announces the highlighted option through aria-activedescendant', async () => {
    const { user } = setup()
    await user.click(screen.getByTestId('picker'))

    const input = screen.getByTestId('picker')
    const first = input.getAttribute('aria-activedescendant')
    expect(first).toBeTruthy()

    await user.keyboard('{ArrowDown}')
    expect(input.getAttribute('aria-activedescendant')).not.toBe(first)
  })

  it('closes on Escape, then clears the query on a second Escape', async () => {
    const { user } = setup()
    await user.type(screen.getByTestId('picker'), 'cough')
    expect(screen.getByTestId('picker-list')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('picker-list')).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.getByTestId('picker')).toHaveValue('')
  })

  it('marks the combobox expanded only while the list is open', async () => {
    const { user } = setup()
    const input = screen.getByTestId('picker')
    expect(input).toHaveAttribute('aria-expanded', 'false')

    await user.click(input)
    expect(input).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('edge cases', () => {
  it('shows the exhausted message instead of an unusable empty box', async () => {
    setup({ options: [], exhaustedMessage: 'Everything is already added.' })
    expect(screen.getByTestId('picker-exhausted')).toHaveTextContent('Everything is already added.')
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument()
  })

  it('still renders an input when empty with no exhausted message', () => {
    setup({ options: [] })
    expect(screen.getByTestId('picker')).toBeInTheDocument()
  })

  it('cannot be used when disabled', async () => {
    const { user, onSelect } = setup({ disabled: true })
    const input = screen.getByTestId('picker')
    expect(input).toBeDisabled()

    await user.click(input)
    expect(screen.queryByTestId('picker-list')).not.toBeInTheDocument()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('closes when the pointer goes down outside it', async () => {
    const { user } = setup()
    await user.click(screen.getByTestId('picker'))
    expect(screen.getByTestId('picker-list')).toBeInTheDocument()

    await user.click(document.body)
    expect(screen.queryByTestId('picker-list')).not.toBeInTheDocument()
  })
})
