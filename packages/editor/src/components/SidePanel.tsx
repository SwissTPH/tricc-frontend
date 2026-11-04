import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MutableRefObject,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Icon } from '../theme/Icon.js'

/**
 * The right-hand panel of the flow and project pages: resizable, collapsible to a rail
 * (GitHub RFC #9, "Resizable and collapsible right panel").
 *
 * The grid container holds the width in CSS: `--tricc-panel-min` per page, the default
 * `max(20vw, min)`, and `--tricc-panel-width` once the author drags. Collapsed is
 * `data-panel="collapsed"`. Under 900px an open panel covers the main area (styles.css).
 */

/** Collapsed width: the open button. */
export const PANEL_RAIL = 32
/** What the main area keeps beside an open panel. */
export const PANEL_MAIN_FLOOR = 360
/** How far below the minimum a drag goes before the panel collapses. */
export const PANEL_COLLAPSE_SLACK = 48
export const PANEL_STEP = 16
export const PANEL_STEP_LARGE = 64
/** Under this window width a page opens with the panel collapsed. */
export const PANEL_COLLAPSED_BELOW = 1200

/** True when a page should open with its panel collapsed (the window is under 1200px). */
export function startsCollapsed(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(`(max-width: ${PANEL_COLLAPSED_BELOW - 0.02}px)`).matches
  )
}

export function clampWidth(width: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(width, Math.max(min, max))))
}

/** Where a drag that would make the panel `width` wide lands: collapsed, or an open width. */
export function dragTarget(width: number, min: number, max: number): number | 'collapsed' {
  return width < min - PANEL_COLLAPSE_SLACK ? 'collapsed' : clampWidth(width, min, max)
}

/** The width an open panel has before any drag: 20% of the window, never under `min`. */
export function defaultWidth(min: number, viewport: number): number {
  return Math.max(min, Math.round(viewport * 0.2))
}

export interface PanelLayout {
  /** The panel's element id, for `aria-controls`. */
  id: string
  min: number
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  /** Spread on the grid container that holds the main area and the panel. */
  containerProps: {
    ref: RefObject<HTMLDivElement>
    'data-panel': 'open' | 'collapsed'
    style?: CSSProperties
  }
  /** The open width the author dragged to, if any. */
  dragged: number | undefined
  /** The width a drag of the panel's edge to `clientX` would give. */
  widthAt: (clientX: number) => { width: number; max: number } | undefined
  /** The current open width and the largest allowed one. */
  measure: () => { width: number; max: number }
  /** Open at `width` (clamped), or collapse. */
  apply: (target: number | 'collapsed') => void
  /** Back to the default width, open. */
  reset: () => void
  dragging: MutableRefObject<boolean>
}

/** Shrinking the window past one of these widths collapses the panel. */
export const PANEL_SHRINK_BREAKPOINTS = [PANEL_COLLAPSED_BELOW, 900]

/**
 * Panel state, per panel id, for the session: every flow page (activity, block, segment)
 * shares one, the project page has its own. Never saved.
 */
interface PanelState {
  collapsed: boolean
  dragged?: number
}
const states = new Map<string, PanelState>()
const listeners = new Set<() => void>()
const dragActive: MutableRefObject<boolean> = { current: false }
let lastWindowWidth: number | undefined
let installed = false

function stateOf(id: string): PanelState {
  let state = states.get(id)
  if (!state) {
    state = { collapsed: startsCollapsed() }
    states.set(id, state)
  }
  return state
}

function update(id: string, patch: Partial<PanelState>): void {
  Object.assign(stateOf(id), patch)
  for (const listener of listeners) listener()
}

/**
 * A window resize drops every dragged width. Shrinking past 1200px or 900px also collapses
 * the panel; growing never opens it. Resizes during a drag are ignored.
 */
function onWindowResize(): void {
  const width = window.innerWidth
  const before = lastWindowWidth ?? width
  lastWindowWidth = width
  if (dragActive.current) return
  const shrunk = PANEL_SHRINK_BREAKPOINTS.some((b) => before >= b && width < b)
  for (const state of states.values()) {
    state.dragged = undefined
    if (shrunk) state.collapsed = true
  }
  for (const listener of listeners) listener()
}

function install(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  lastWindowWidth = window.innerWidth
  window.addEventListener('resize', onWindowResize)
}

/** Forget every panel's state (tests). */
export function resetPanelState(): void {
  states.clear()
  lastWindowWidth = typeof window === 'undefined' ? undefined : window.innerWidth
}

/** The state of one panel, shared by every page that uses the same `id`. */
export function usePanelLayout({ id, min }: { id: string; min: number }): PanelLayout {
  const ref = useRef<HTMLDivElement>(null)
  const [, rerender] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    install()
    listeners.add(rerender)
    return () => {
      listeners.delete(rerender)
    }
  }, [])

  const { collapsed, dragged } = stateOf(id)

  const setCollapsed = useCallback((next: boolean) => update(id, { collapsed: next }), [id])

  const measure = useCallback(() => {
    const box = ref.current?.getBoundingClientRect()
    const max = box ? Math.max(min, box.width - PANEL_MAIN_FLOOR) : min
    const panel = document.getElementById(id)?.getBoundingClientRect().width
    const current = stateOf(id).dragged
    const width =
      current ?? (panel && panel > PANEL_RAIL ? panel : defaultWidth(min, window.innerWidth))
    return { width: clampWidth(width, min, max), max }
  }, [id, min])

  const widthAt = useCallback(
    (clientX: number) => {
      const box = ref.current?.getBoundingClientRect()
      if (!box) return undefined
      return { width: box.right - clientX, max: Math.max(min, box.width - PANEL_MAIN_FLOOR) }
    },
    [min],
  )

  const apply = useCallback(
    (target: number | 'collapsed') =>
      update(
        id,
        target === 'collapsed' ? { collapsed: true } : { collapsed: false, dragged: target },
      ),
    [id],
  )

  const reset = useCallback(() => update(id, { collapsed: false, dragged: undefined }), [id])

  return {
    id,
    min,
    collapsed,
    setCollapsed,
    containerProps: {
      ref,
      'data-panel': collapsed ? 'collapsed' : 'open',
      style:
        !collapsed && dragged !== undefined
          ? ({ '--tricc-panel-width': `${dragged}px` } as CSSProperties)
          : undefined,
    },
    dragged,
    widthAt,
    measure,
    apply,
    reset,
    dragging: dragActive,
  }
}

/** The drag handle on the panel's left edge; also a keyboard separator. */
export function PanelResizer({ layout }: { layout: PanelLayout }) {
  const { min, collapsed } = layout
  const [shown, setShown] = useState<{ width: number; max: number }>()

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    layout.dragging.current = true
    document.body.dataset['panelResizing'] = ''
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!layout.dragging.current) return
    const at = layout.widthAt(e.clientX)
    if (at) layout.apply(dragTarget(at.width, min, at.max))
  }
  const end = (e: PointerEvent<HTMLDivElement>) => {
    if (!layout.dragging.current) return
    layout.dragging.current = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    delete document.body.dataset['panelResizing']
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? PANEL_STEP_LARGE : PANEL_STEP
    const { width, max } = layout.measure()
    let target: number | 'collapsed' | undefined
    switch (e.key) {
      case 'ArrowLeft':
        target = collapsed ? width : clampWidth(width + step, min, max)
        break
      case 'ArrowRight':
        if (collapsed) return
        target = width <= min ? 'collapsed' : clampWidth(width - step, min, max)
        break
      case 'Home':
        target = min
        break
      case 'End':
        target = max
        break
      case 'Enter':
        e.preventDefault()
        layout.reset()
        return
      default:
        return
    }
    e.preventDefault()
    layout.apply(target)
    if (target !== 'collapsed') setShown({ width: target, max })
  }

  const now = collapsed ? undefined : (layout.dragged ?? shown?.width)
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the panel"
      aria-controls={layout.id}
      aria-valuemin={min}
      aria-valuemax={shown?.max}
      aria-valuenow={now}
      aria-valuetext={collapsed ? 'Collapsed' : undefined}
      tabIndex={0}
      className="tricc-panel-resizer"
      data-testid="panel-resizer"
      title="Drag to resize. Drag past the edge to collapse. Double-click for the default width."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onDoubleClick={layout.reset}
      onKeyDown={onKeyDown}
      onFocus={() => setShown(layout.measure())}
    />
  )
}

/** Hide or show the panel. A dot on the collapsed rail says there is something new to see. */
export function PanelToggle({ layout, dot }: { layout: PanelLayout; dot?: boolean }) {
  const { collapsed } = layout
  const label = collapsed ? 'Show panel' : 'Hide panel'
  return (
    <button
      type="button"
      className="tricc-panel-toggle"
      data-testid="panel-toggle"
      aria-expanded={!collapsed}
      aria-controls={layout.id}
      aria-label={label}
      title={label}
      onClick={() => layout.setCollapsed(!collapsed)}
    >
      <Icon name={collapsed ? 'chevron_left' : 'chevron_right'} size={18} />
      {collapsed && dot && <span className="tricc-panel-toggle__dot" data-testid="panel-dot" />}
    </button>
  )
}

/**
 * The panel itself: the resize handle, a bar with the toggle and the tabs, and the content.
 * Collapsed, only the rail with the toggle is rendered. `active` is the selected tab, kept
 * in view when the row of tabs scrolls.
 */
export function SidePanel({
  layout,
  label,
  tabs,
  active,
  dot,
  className,
  children,
}: {
  layout: PanelLayout
  label: string
  tabs: ReactNode
  active?: string
  dot?: boolean
  className?: string
  children: ReactNode
}) {
  const tabsRef = useRef<HTMLDivElement>(null)
  const { collapsed } = layout
  useEffect(() => {
    if (collapsed) return
    const tab = tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    tab?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })
  }, [active, collapsed])

  return (
    <>
      <PanelResizer layout={layout} />
      <aside
        id={layout.id}
        className={`tricc-inspector${className ? ` ${className}` : ''}`}
        data-collapsed={collapsed || undefined}
      >
        {collapsed ? (
          <PanelToggle layout={layout} dot={dot} />
        ) : (
          <>
            <div className="tricc-inspector__bar">
              <PanelToggle layout={layout} />
              <div
                className="tricc-inspector__tabs"
                role="tablist"
                aria-label={label}
                ref={tabsRef}
              >
                {tabs}
              </div>
            </div>
            {children}
          </>
        )}
      </aside>
    </>
  )
}
