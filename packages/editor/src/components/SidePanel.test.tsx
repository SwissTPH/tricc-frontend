import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  PANEL_COLLAPSE_SLACK,
  SidePanel,
  clampWidth,
  defaultWidth,
  dragTarget,
  resetPanelState,
  startsCollapsed,
  usePanelLayout,
} from './SidePanel.js'

// jsdom has no PointerEvent: without it, fired pointer events carry no button or clientX.
if (typeof window.PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    pointerId: number
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
    }
  }
  ;(window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEvent
}

afterEach(() => {
  cleanup()
  resetPanelState()
  vi.unstubAllGlobals()
})

function Page({ testId = 'container' }: { testId?: string }) {
  const layout = usePanelLayout({ id: 'test-panel', min: 320 })
  return (
    <div data-testid={testId} {...layout.containerProps}>
      <SidePanel
        layout={layout}
        label="Inspector"
        active="a"
        tabs={
          <button type="button" role="tab" aria-selected>
            A
          </button>
        }
      >
        <p data-testid="content">Content</p>
      </SidePanel>
    </div>
  )
}

/** jsdom has no layout: give the container and panel boxes. */
function boxes(container: number, panel: number) {
  const c = screen.getByTestId('container')
  c.getBoundingClientRect = () =>
    ({ left: 0, right: container, width: container, top: 0, bottom: 600 }) as DOMRect
  const p = document.getElementById('test-panel')!
  p.getBoundingClientRect = () => ({ width: panel }) as DOMRect
}

const width = () => screen.getByTestId('container').style.getPropertyValue('--tricc-panel-width')
const state = () => screen.getByTestId('container').getAttribute('data-panel')

describe('width rule', () => {
  it('clamps between the minimum and the maximum', () => {
    expect(clampWidth(200, 320, 900)).toBe(320)
    expect(clampWidth(500, 320, 900)).toBe(500)
    expect(clampWidth(1200, 320, 900)).toBe(900)
    // A container too small for the floor still allows the minimum.
    expect(clampWidth(500, 320, 100)).toBe(320)
  })

  it('defaults to 20% of the window, never under the minimum', () => {
    expect(defaultWidth(320, 1600)).toBe(320)
    expect(defaultWidth(320, 1920)).toBe(384)
    expect(defaultWidth(340, 1280)).toBe(340)
  })

  it('collapses a drag well below the minimum, and stops at the minimum just below it', () => {
    expect(dragTarget(300, 320, 900)).toBe(320)
    expect(dragTarget(320 - PANEL_COLLAPSE_SLACK, 320, 900)).toBe(320)
    expect(dragTarget(320 - PANEL_COLLAPSE_SLACK - 1, 320, 900)).toBe('collapsed')
  })

  it('starts collapsed under 1200px', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('max-width: 1199') }))
    expect(startsCollapsed()).toBe(true)
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    expect(startsCollapsed()).toBe(false)
  })
})

describe('SidePanel', () => {
  it('opens collapsed when the window is narrow', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    render(<Page />)
    expect(state()).toBe('collapsed')
    expect(screen.queryByTestId('content')).toBeNull()
    expect(screen.queryByRole('tablist')).toBeNull()
    const toggle = screen.getByTestId('panel-toggle')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(state()).toBe('open')
    expect(screen.getByTestId('content')).toBeTruthy()
  })

  it('hides and shows with the toggle', () => {
    render(<Page />)
    const toggle = screen.getByTestId('panel-toggle')
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(toggle.getAttribute('aria-controls')).toBe('test-panel')
    fireEvent.click(toggle)
    expect(state()).toBe('collapsed')
    expect(screen.getByTestId('panel-toggle').getAttribute('aria-label')).toBe('Show panel')
  })

  it('resizes with a drag, and collapses when dragged past the minimum', () => {
    render(<Page />)
    boxes(1600, 320)
    const handle = screen.getByTestId('panel-resizer')
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 1280 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 1100 })
    expect(width()).toBe('500px')
    // Past the main-area floor: 1600 - 360.
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 100 })
    expect(width()).toBe('1240px')
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 1600 - 300 })
    expect(width()).toBe('320px')
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 1600 - 200 })
    expect(state()).toBe('collapsed')
    // Dragging the rail back out opens it again.
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 1600 - 450 })
    expect(state()).toBe('open')
    expect(width()).toBe('450px')
    fireEvent.pointerUp(handle, { pointerId: 1 })
  })

  it('a window resize drops the dragged width and keeps the open or collapsed state', () => {
    render(<Page />)
    boxes(1600, 320)
    const handle = screen.getByTestId('panel-resizer')
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 1280 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 1100 })
    // A resize during the drag is ignored.
    act(() => void window.dispatchEvent(new Event('resize')))
    expect(width()).toBe('500px')
    fireEvent.pointerUp(handle, { pointerId: 1 })

    act(() => void window.dispatchEvent(new Event('resize')))
    expect(width()).toBe('')
    expect(state()).toBe('open')

    fireEvent.click(screen.getByTestId('panel-toggle'))
    act(() => void window.dispatchEvent(new Event('resize')))
    expect(state()).toBe('collapsed')
  })

  it('pages with the same panel share its width and state', () => {
    const { unmount } = render(<Page />)
    boxes(1600, 320)
    const handle = screen.getByTestId('panel-resizer')
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 1280 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 1100 })
    fireEvent.pointerUp(handle, { pointerId: 1 })
    unmount()
    // Another flow opens with the same width.
    render(<Page />)
    expect(width()).toBe('500px')
    fireEvent.click(screen.getByTestId('panel-toggle'))
    cleanup()
    render(<Page />)
    expect(state()).toBe('collapsed')
  })

  it('shrinking the window past 1200px or 900px collapses it; growing never opens it', () => {
    const resizeTo = (w: number) =>
      act(() => {
        vi.stubGlobal('innerWidth', w)
        window.dispatchEvent(new Event('resize'))
      })
    resizeTo(1600)
    render(<Page />)
    resizeTo(1300)
    expect(state()).toBe('open')
    resizeTo(1100)
    expect(state()).toBe('collapsed')
    resizeTo(1150)
    expect(state()).toBe('collapsed')

    // Opened between 900px and 1200px, it stays open until the window shrinks past 900px.
    fireEvent.click(screen.getByTestId('panel-toggle'))
    resizeTo(1000)
    expect(state()).toBe('open')
    resizeTo(850)
    expect(state()).toBe('collapsed')
    // Opened under 900px, it stays open while the window changes but does not shrink past a step.
    fireEvent.click(screen.getByTestId('panel-toggle'))
    resizeTo(700)
    expect(state()).toBe('open')
  })

  it('resizes from the keyboard; → at the minimum collapses, ← reopens, Enter resets', () => {
    render(<Page />)
    boxes(1600, 320)
    const handle = screen.getByTestId('panel-resizer')
    expect(handle.getAttribute('role')).toBe('separator')
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(width()).toBe('336px')
    fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true })
    expect(width()).toBe('400px')
    expect(handle.getAttribute('aria-valuenow')).toBe('400')
    fireEvent.keyDown(handle, { key: 'End' })
    expect(width()).toBe('1240px')
    fireEvent.keyDown(handle, { key: 'Home' })
    expect(width()).toBe('320px')
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(state()).toBe('collapsed')
    expect(handle.getAttribute('aria-valuetext')).toBe('Collapsed')
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(state()).toBe('open')
    fireEvent.keyDown(handle, { key: 'Enter' })
    expect(width()).toBe('')
  })
})
