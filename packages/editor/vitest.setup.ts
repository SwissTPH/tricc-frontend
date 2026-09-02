import '@testing-library/jest-dom/vitest'

/**
 * React Flow renders through an absolutely-positioned layout that jsdom measures as
 * zero-sized, so the canvas mounts but never shows a node. Stubbing the two measurement
 * APIs is React Flow's own documented approach for component tests.
 *
 * Anything needing real geometry — drag to connect, marquee selection, waypoint
 * dragging — is tested in Playwright instead. Getting this wrong is the usual reason
 * graph editors end up untested.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

class DOMMatrixReadOnlyStub {
  m22 = 1
  constructor(readonly transform?: string) {}
}
;(globalThis as Record<string, unknown>)['DOMMatrixReadOnly'] ??= DOMMatrixReadOnlyStub

Object.defineProperties(globalThis.HTMLElement.prototype, {
  offsetHeight: {
    get() {
      return Number(this.style?.height?.replace('px', '')) || 400
    },
  },
  offsetWidth: {
    get() {
      return Number(this.style?.width?.replace('px', '')) || 800
    },
  },
})

;(globalThis as Record<string, unknown>)['SVGElement'] = globalThis.Element
Object.defineProperty(globalThis.Element.prototype, 'getBBox', {
  writable: true,
  value: () => ({ x: 0, y: 0, width: 0, height: 0 }),
})
