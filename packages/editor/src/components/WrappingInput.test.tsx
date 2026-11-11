import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WrappingInput, oneLine } from './WrappingInput.js'

beforeEach(cleanup)

function Controlled({
  initial = '',
  onValue,
}: {
  initial?: string
  onValue?: (v: string) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <WrappingInput
      data-testid="wrap"
      value={value}
      onChange={(e) => {
        setValue(e.target.value)
        onValue?.(e.target.value)
      }}
    />
  )
}

describe('oneLine', () => {
  it('turns every kind of line break into a space', () => {
    expect(oneLine('a\nb\r\nc\rd')).toBe('a b c d')
    expect(oneLine('no breaks')).toBe('no breaks')
  })
})

describe('WrappingInput', () => {
  it('is a one-row textarea with the given value', () => {
    render(<Controlled initial="Does the child have chest indrawing when calm?" />)
    const box = screen.getByTestId('wrap')
    expect(box.tagName).toBe('TEXTAREA')
    expect(box).toHaveAttribute('rows', '1')
    expect(box).toHaveValue('Does the child have chest indrawing when calm?')
  })

  it('does not start a new line on Enter', async () => {
    const user = userEvent.setup()
    const seen = vi.fn()
    render(<Controlled onValue={seen} />)
    await user.type(screen.getByTestId('wrap'), 'Fever{Enter} today')
    expect(screen.getByTestId('wrap')).toHaveValue('Fever today')
    expect(seen.mock.calls.every(([v]) => !String(v).includes('\n'))).toBe(true)
  })

  it('turns pasted line breaks into spaces', async () => {
    const user = userEvent.setup()
    const seen = vi.fn()
    render(<Controlled onValue={seen} />)
    await user.click(screen.getByTestId('wrap'))
    await user.paste('Chest indrawing\nwhen calm')
    expect(screen.getByTestId('wrap')).toHaveValue('Chest indrawing when calm')
    expect(seen).toHaveBeenLastCalledWith('Chest indrawing when calm')
  })

  it('passes readOnly, disabled and the other attributes through', () => {
    render(
      <WrappingInput
        data-testid="wrap"
        id="node-label"
        aria-label="Label"
        placeholder="Give it a label"
        value="x"
        readOnly
        disabled
        onChange={() => {}}
      />,
    )
    const box = screen.getByTestId('wrap')
    expect(box).toHaveAttribute('id', 'node-label')
    expect(box).toHaveAttribute('aria-label', 'Label')
    expect(box).toHaveAttribute('placeholder', 'Give it a label')
    expect(box).toHaveAttribute('readonly')
    expect(box).toBeDisabled()
  })
})
