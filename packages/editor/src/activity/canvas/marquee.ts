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
