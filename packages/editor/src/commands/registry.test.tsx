import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { useState } from 'react'
import {
  CommandStore,
  CommandsProvider,
  matchCommands,
  shortcutLabel,
  useCommands,
  useRegisterCommands,
  type Command,
} from './registry.js'

afterEach(cleanup)

const command = (id: string, extra: Partial<Command> = {}): Command => ({
  id,
  group: 'Go to',
  label: id,
  run: () => {},
  ...extra,
})

function Listing() {
  const commands = useCommands()
  return <p data-testid="listing">{commands.map((c) => c.label).join(',')}</p>
}

function Registers({ commands }: { commands: Command[] }) {
  useRegisterCommands(commands)
  return null
}

describe('command registry', () => {
  it('offers commands while the component that registers them is mounted', () => {
    function Toggle() {
      const [shown, setShown] = useState(true)
      return (
        <>
          {shown && <Registers commands={[command('a'), command('b')]} />}
          <button type="button" onClick={() => setShown(false)}>
            hide
          </button>
        </>
      )
    }
    render(
      <CommandsProvider>
        <Toggle />
        <Listing />
      </CommandsProvider>,
    )
    expect(screen.getByTestId('listing').textContent).toBe('a,b')
    act(() => screen.getByText('hide').click())
    expect(screen.getByTestId('listing').textContent).toBe('')
  })

  it('runs the latest run function without registering again', () => {
    const register = vi.spyOn(CommandStore.prototype, 'register')
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(
      <CommandsProvider>
        <Registers commands={[command('a', { run: first })]} />
        <Run />
      </CommandsProvider>,
    )
    rerender(
      <CommandsProvider>
        <Registers commands={[command('a', { run: second })]} />
        <Run />
      </CommandsProvider>,
    )
    act(() => screen.getByText('run a').click())
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
    // Same id and label: registered once, on mount.
    expect(register).toHaveBeenCalledOnce()
    register.mockRestore()
  })

  it('keeps one command per id, the later registration winning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = new CommandStore()
    store.register([command('a', { label: 'first' })])
    const remove = store.register([command('a', { label: 'second' })])
    expect(store.getSnapshot().map((c) => c.label)).toEqual(['second'])
    expect(warn).toHaveBeenCalled()
    remove()
    expect(store.getSnapshot().map((c) => c.label)).toEqual(['first'])
    warn.mockRestore()
  })

  it('does nothing without a provider', () => {
    render(
      <>
        <Registers commands={[command('a')]} />
        <Listing />
      </>,
    )
    expect(screen.getByTestId('listing').textContent).toBe('')
  })

  it('filters on label, group and keywords, ignoring case', () => {
    const all = [
      command('dict', { label: 'Go to data dictionary', keywords: ['concepts'] }),
      command('undo', { label: 'Undo', group: 'Edit' }),
    ]
    expect(matchCommands(all, '').length).toBe(2)
    expect(matchCommands(all, 'DICT').map((c) => c.id)).toEqual(['dict'])
    expect(matchCommands(all, 'concept').map((c) => c.id)).toEqual(['dict'])
    expect(matchCommands(all, 'edit').map((c) => c.id)).toEqual(['undo'])
  })

  it('writes shortcuts with Ctrl outside a Mac', () => {
    expect(shortcutLabel('Ctrl+Shift+Z')).toBe(
      /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘⇧Z' : 'Ctrl+Shift+Z',
    )
  })
})

function Run() {
  const commands = useCommands()
  return (
    <>
      {commands.map((c) => (
        <button key={c.id} type="button" onClick={c.run}>
          run {c.id}
        </button>
      ))}
    </>
  )
}
