/**
 * Semantic colour tokens, emitted as `--tricc-*` CSS custom properties on `:root` (light)
 * and `[data-theme="dark"]`. Hand-written CSS (`styles.css`, the app's `app.css`) and the
 * Tailwind/shadcn tokens read only these. This file only names roles; every value is in
 * `palette.ts`.
 */
import {
  elevation,
  marks,
  nodeGroups,
  primaryRoles,
  secondaryRoles,
  semantic,
  stickyText,
  surfaces,
  swatches,
  syntax,
  type Scheme,
} from './palette.js'

export type { Scheme, Swatch } from './palette.js'

/** Role name (without `--tricc-`) → colour, for a scheme. Only names palette values. */
export function tokens(scheme: Scheme): Record<string, string> {
  const s = surfaces[scheme]
  const b = primaryRoles[scheme]
  const a = secondaryRoles[scheme]
  const e = elevation[scheme]
  const x = syntax[scheme]
  const m = marks[scheme]
  const t: Record<string, string> = {
    bg: s.background,
    surface: s.paper,
    subtle: s.subtle,
    text: s.text,
    'text-muted': s.textMuted,
    'text-faint': s.textFaint,
    border: s.border,
    'border-strong': s.borderStrong,

    primary: b.main,
    'primary-hover': b.hover,
    'on-primary': b.on,
    'primary-soft': b.soft,
    'primary-soft-strong': b.softStrong,
    'primary-text': b.text,
    focus: b.main,

    secondary: a.main,
    'secondary-soft': a.soft,
    'secondary-text': a.text,

    backdrop: e.backdrop,
    'shadow-sm': e.sm,
    'shadow-md': e.md,
    'shadow-lg': e.lg,

    'syntax-keyword': x.keyword,
    'syntax-function': x.function,
    'syntax-number': x.number,
    'syntax-operator': s.textMuted,
    'syntax-name-bg': x.nameBg,
    'syntax-name-text': x.nameText,

    'mark-hint-bg': m.hintBg,
    'mark-hint-text': m.hintText,
    'mark-help-bg': m.helpBg,
    'mark-help-text': m.helpText,
    'pending-bg': m.pendingBg,
    'pending-text': m.pendingText,
    'pending-border': m.pendingBorder,

    'sticky-text': stickyText[scheme],
  }
  for (const [name, v] of Object.entries(semantic)) {
    t[name] = v[scheme].main
    t[`${name}-text`] = v[scheme].text
    t[`${name}-soft`] = v[scheme].soft
  }
  for (const [group, v] of Object.entries(nodeGroups)) {
    const [main, bg] = v[scheme]
    t[group] = main
    t[`${group}-bg`] = bg
  }
  for (const [name, v] of Object.entries(swatches)) {
    const [fill, frame, edge, chip] = v[scheme]
    t[`swatch-${name}`] = fill
    t[`swatch-${name}-frame`] = frame
    t[`swatch-${name}-edge`] = edge
    t[`swatch-${name}-chip`] = chip
  }
  return t
}

/** `{ '--tricc-bg': '#…', … }` for a scheme. */
export function cssVariables(scheme: Scheme): Record<string, string> {
  return Object.fromEntries(Object.entries(tokens(scheme)).map(([k, v]) => [`--tricc-${k}`, v]))
}

/** The full stylesheet: light tokens on `:root`, dark ones under `[data-theme="dark"]`. */
export function tokenStylesheet(): string {
  const block = (sel: string, scheme: Scheme) =>
    `${sel}{color-scheme:${scheme};${Object.entries(cssVariables(scheme))
      .map(([k, v]) => `${k}:${v}`)
      .join(';')}}`
  return block(':root', 'light') + block(':root[data-theme="dark"]', 'dark')
}
