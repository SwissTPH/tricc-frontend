import type { CSSProperties } from 'react'

export interface IconProps {
  /** A Google Material Symbols name, e.g. `settings`, `notifications`, `upload_file`. */
  name: string
  /** Pixel size; defaults to 20. */
  size?: number
  /** Filled variant of the glyph. */
  filled?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * A Material Symbols (Outlined) glyph. Decorative: the surrounding control carries the
 * accessible name. The font is loaded by the host app (`material-symbols/outlined.css`).
 */
export function Icon({ name, size = 20, filled, className, style }: IconProps) {
  return (
    <span
      aria-hidden="true"
      data-icon={name}
      className={`material-symbols-outlined tricc-icon${className ? ` ${className}` : ''}`}
      style={{
        fontSize: size,
        width: size,
        height: size,
        fontVariationSettings: filled ? "'FILL' 1" : undefined,
        ...style,
      }}
    >
      {name}
    </span>
  )
}
