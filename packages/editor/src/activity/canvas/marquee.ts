/** How far a right-button press must move before it becomes a selection, in CSS pixels. */
export const MARQUEE_PX = 6

/** A shaky click stays a click. A deliberate drag starts a selection. */
export function pointerPastMarquee(dx: number, dy: number, px = MARQUEE_PX): boolean {
  return dx * dx + dy * dy >= px * px
}

export interface ScreenRect {
  left: number
  top: number
  right: number
  bottom: number
}

export function screenRect(x0: number, y0: number, x1: number, y1: number): ScreenRect {
  return {
    left: Math.min(x0, x1),
    top: Math.min(y0, y1),
    right: Math.max(x0, x1),
    bottom: Math.max(y0, y1),
  }
}

export function rectsMeet(a: ScreenRect, b: ScreenRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

/**
 * `inner` sits entirely inside `outer`. A pixel of slack absorbs the difference between
 * the rectangle the pointer drew and the box the browser measured.
 */
export function rectContains(outer: ScreenRect, inner: ScreenRect, slack = 1): boolean {
  return (
    inner.left >= outer.left - slack &&
    inner.right <= outer.right + slack &&
    inner.top >= outer.top - slack &&
    inner.bottom <= outer.bottom + slack
  )
}

/** How close to the canvas edge a selection drag must be before the canvas starts moving. */
export const PAN_EDGE_PX = 40
/** Fastest pan per frame, at the very edge. Slower as the pointer moves back inward. */
export const PAN_SPEED = 14

/**
 * How far to move the diagram this frame so the area past the pointer comes into view.
 * `pointer` is measured from the canvas's top-left. Positive x moves the diagram right.
 */
export function edgePan(
  pointer: { x: number; y: number },
  size: { width: number; height: number },
  speed = PAN_SPEED,
  margin = PAN_EDGE_PX,
): { x: number; y: number } {
  const along = (value: number, limit: number) => {
    if (value < margin) return Math.min(margin, Math.max(1, margin - value)) / margin
    if (value > limit - margin) return -Math.min(margin, Math.max(1, value - (limit - margin))) / margin
    return 0
  }
  return { x: along(pointer.x, size.width) * speed, y: along(pointer.y, size.height) * speed }
}

/**
 * The elements a drag should move.
 *
 * `parentGroup` is the flow id of the group that contains this element, when it has one.
 * An element inside a group that was also swept is left out: the group frame carries it,
 * and selecting both would move it twice.
 */
export function dragSelection(
  hitIds: readonly string[],
  parentGroup: (flowId: string) => string | undefined,
): string[] {
  const swept = new Set(hitIds)
  const carried = (id: string): boolean => {
    let parent = parentGroup(id)
    const seen = new Set<string>()
    while (parent && !seen.has(parent)) {
      if (swept.has(parent)) return true
      seen.add(parent)
      parent = parentGroup(parent)
    }
    return false
  }
  return hitIds.filter((id) => !carried(id))
}
