import * as React from 'react'
import { cn } from '../lib/utils.js'
import { Textarea } from './ui/textarea.js'

/**
 * A one-line text that wraps instead of scrolling out of sight
 * (feature/20261109-wrapping-text-fields.md).
 *
 * It looks like `Input` while the text fits, and grows a line at a time as it gets longer. The
 * value stays one line: Enter does nothing, and a typed or pasted line break becomes a space.
 */
export interface WrappingInputProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'rows' | 'value'
> {
  value: string
  /** `sm` matches `Input size="sm"`, used in the inspector. */
  size?: 'default' | 'sm'
}

/** Line breaks, of any platform, as single spaces. */
export function oneLine(value: string): string {
  return value.replace(/\r\n|\r|\n/g, ' ')
}

/** Whether the browser grows the box itself (`field-sizing: content`). Firefox does not yet. */
function sizesItself(): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    ? CSS.supports('field-sizing', 'content')
    : false
}

/** Without `field-sizing`, set the height from the content, borders included. */
function fitHeight(el: HTMLTextAreaElement): void {
  el.style.height = 'auto'
  if (el.scrollHeight === 0) {
    el.style.removeProperty('height')
    return
  }
  const style = getComputedStyle(el)
  const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
  el.style.height = `${el.scrollHeight + (Number.isNaN(borders) ? 0 : borders)}px`
}

export const WrappingInput = React.forwardRef<HTMLTextAreaElement, WrappingInputProps>(
  ({ className, size = 'default', value, onChange, onKeyDown, ...props }, ref) => {
    const inner = React.useRef<HTMLTextAreaElement | null>(null)
    const setRef = React.useCallback(
      (el: HTMLTextAreaElement | null) => {
        inner.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
      },
      [ref],
    )
    const fallback = React.useMemo(() => !sizesItself(), [])

    React.useLayoutEffect(() => {
      if (fallback && inner.current) fitHeight(inner.current)
    }, [fallback, value])

    // The panel can be resized, which changes where the text wraps.
    React.useEffect(() => {
      const el = inner.current
      if (!fallback || !el || typeof ResizeObserver === 'undefined') return
      let width = el.clientWidth
      const observer = new ResizeObserver(() => {
        if (el.clientWidth === width) return
        width = el.clientWidth
        fitHeight(el)
      })
      observer.observe(el)
      return () => observer.disconnect()
    }, [fallback])

    return (
      <Textarea
        ref={setRef}
        rows={1}
        size={size}
        value={value}
        className={cn(
          'resize-none overflow-hidden [overflow-wrap:anywhere]',
          size === 'sm' ? 'min-h-7 py-1' : 'min-h-9 py-1.5',
          className,
        )}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.preventDefault()
          onKeyDown?.(event)
        }}
        onChange={(event) => {
          const cleaned = oneLine(event.target.value)
          if (cleaned !== event.target.value) event.target.value = cleaned
          onChange?.(event)
        }}
        {...props}
      />
    )
  },
)
WrappingInput.displayName = 'WrappingInput'
