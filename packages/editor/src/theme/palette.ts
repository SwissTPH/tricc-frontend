/**
 * DrawTricc palette: the only file that holds colours.
 *
 * 1. Hue scales: solid colours, 50 (lightest) to 950 (darkest).
 * 2. Brand: which hue is the primary and which the secondary. Re-brand here.
 * 3. Roles: what each scheme (light, dark) uses where, picked from the scales.
 * 4. Author colours: the named colours an author picks (notes, labels, node groups, text).
 *
 * Everything else reads from here: the `--tricc-*` tokens (`tokens.ts`), which the
 * hand-written CSS and the Tailwind/shadcn tokens use, and the MUI theme (`theme.ts`).
 * Translucent values (backdrops, shadows, frame tints) are derived with `alpha()`, never
 * written as `rgb(...)`.
 */

export type Scheme = 'light' | 'dark'
export type Step = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950
export type Scale = Readonly<Record<Step, string>>
/** A value per scheme. */
export type ByScheme<T = string> = Record<Scheme, T>

/** `colour` (`#RRGGBB`) at `opacity` (0–1), as CSS. */
export function alpha(colour: string, opacity: number): string {
  const hex = colour.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r} ${g} ${b} / ${opacity})`
}

// ------------------------------------------------------------------ 1. hue scales

export const white = '#FFFFFF'
export const black = '#000000'

/** Greys with a slight pink tint, so neutrals and the brand feel related. */
export const neutral: Scale = {
  50: '#FBF8F9',
  100: '#F5F0F2',
  200: '#E9E1E4',
  300: '#D8CCD1',
  400: '#B3A3AA',
  500: '#8A7880',
  600: '#6B5A62',
  700: '#4F4148',
  800: '#33282D',
  900: '#241A1E',
  950: '#1A1316',
}

/** Raspberry pink. */
export const pink: Scale = {
  50: '#FDF2F7',
  100: '#FCE4EF',
  200: '#FAC8DE',
  300: '#F69CC2',
  400: '#EF5F9C',
  500: '#E11D74',
  600: '#BE1262',
  700: '#9D1253',
  800: '#821447',
  900: '#55203A',
  950: '#3A1828',
}

export const violet: Scale = {
  50: '#F4F1FF',
  100: '#EAE4FF',
  200: '#D6CBFF',
  300: '#B9A7FF',
  400: '#A594FF',
  500: '#7C5CFF',
  600: '#6A41F0',
  700: '#5830CF',
  800: '#4828A8',
  900: '#3B2387',
  950: '#251E3F',
}

export const red: Scale = {
  50: '#FEF2F2',
  100: '#FDE3E3',
  200: '#FBCACA',
  300: '#FCA5A5',
  400: '#F87171',
  500: '#EF4444',
  600: '#DC2626',
  700: '#C62828',
  800: '#991B1B',
  900: '#7F1D1D',
  950: '#3F1A1A',
}

export const orange: Scale = {
  50: '#FFF7ED',
  100: '#FFEDD5',
  200: '#FED7AA',
  300: '#FDBA74',
  400: '#FB923C',
  500: '#F97316',
  600: '#EA580C',
  700: '#C2410C',
  800: '#9A3412',
  900: '#7C2D12',
  950: '#3A2010',
}

export const yellow: Scale = {
  50: '#FEFCE8',
  100: '#FEF7B3',
  200: '#FDEE8A',
  300: '#FADF4F',
  400: '#F5CC25',
  500: '#D9AF0E',
  600: '#B38A08',
  700: '#8A650B',
  800: '#6B4E10',
  900: '#4A3B00',
  950: '#3A3212',
}

export const green: Scale = {
  50: '#F0FDF4',
  100: '#DCFCE7',
  200: '#BBF7D0',
  300: '#86EFAC',
  400: '#4ADE80',
  500: '#22C55E',
  600: '#16A34A',
  700: '#15803D',
  800: '#166534',
  900: '#14532D',
  950: '#16301F',
}

export const teal: Scale = {
  50: '#F0FDFA',
  100: '#CCFBF1',
  200: '#99F6E4',
  300: '#5EEAD4',
  400: '#2DD4BF',
  500: '#14B8A6',
  600: '#0D9488',
  700: '#0F766E',
  800: '#115E59',
  900: '#134E4A',
  950: '#0E2F2C',
}

export const blue: Scale = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  300: '#93C5FD',
  400: '#7AA7FF',
  500: '#3B82F6',
  600: '#2563EB',
  700: '#1D4ED8',
  800: '#1E40AF',
  900: '#1E3A8A',
  950: '#17233D',
}

// ------------------------------------------------------------------ 2. brand

/** The brand colour: buttons, links, active and selected states. */
export const primary: Scale = pink
/** The accent beside the primary, used sparingly. */
export const secondary: Scale = violet

// ------------------------------------------------------------------ 3. roles

export const surfaces: ByScheme<{
  background: string
  paper: string
  subtle: string
  text: string
  textMuted: string
  textFaint: string
  border: string
  borderStrong: string
}> = {
  light: {
    background: neutral[50],
    paper: white,
    subtle: neutral[100],
    text: neutral[900],
    textMuted: neutral[600],
    textFaint: neutral[400],
    border: neutral[200],
    borderStrong: neutral[300],
  },
  dark: {
    background: neutral[950],
    paper: neutral[900],
    subtle: neutral[800],
    text: neutral[50],
    textMuted: neutral[300],
    textFaint: neutral[500],
    border: neutral[800],
    borderStrong: neutral[700],
  },
}

/** A brand colour in use: `main`, its `hover`, text `on` it, tinted `soft` backgrounds, `text` on a surface. */
export interface BrandRoles {
  main: string
  hover: string
  on: string
  soft: string
  softStrong: string
  text: string
}

export const primaryRoles: ByScheme<BrandRoles> = {
  light: {
    main: primary[500],
    hover: primary[600],
    on: white,
    soft: primary[50],
    softStrong: primary[100],
    text: primary[700],
  },
  dark: {
    main: primary[400],
    hover: primary[300],
    on: neutral[950],
    soft: primary[950],
    softStrong: primary[900],
    text: primary[300],
  },
}

export const secondaryRoles: ByScheme<BrandRoles> = {
  light: {
    main: secondary[500],
    hover: secondary[600],
    on: white,
    soft: secondary[50],
    softStrong: secondary[100],
    text: secondary[700],
  },
  dark: {
    main: secondary[400],
    hover: secondary[300],
    on: neutral[950],
    soft: secondary[950],
    softStrong: secondary[900],
    text: secondary[300],
  },
}

/** Feedback colours, each its own hue so the primary never reads as an error. */
export const semanticHues = { success: green, warning: orange, error: red, info: blue } as const

/** `main` for icons and borders, `text` for words on a surface, `soft` for a tinted background. */
export const semantic = Object.fromEntries(
  Object.entries(semanticHues).map(([name, hue]) => [
    name,
    {
      light: { main: hue[700], text: hue[800], soft: hue[50] },
      dark: { main: hue[400], text: hue[300], soft: hue[950] },
    },
  ]),
) as Record<keyof typeof semanticHues, ByScheme<{ main: string; text: string; soft: string }>>

/** Modal backdrop and shadows. */
export const elevation: ByScheme<{ backdrop: string; sm: string; md: string; lg: string }> = {
  light: {
    backdrop: alpha(neutral[950], 0.35),
    sm: `0 1px 3px ${alpha(neutral[950], 0.18)}`,
    md: `0 6px 18px ${alpha(neutral[950], 0.14)}`,
    lg: `0 12px 40px ${alpha(neutral[950], 0.2)}`,
  },
  dark: {
    backdrop: alpha(black, 0.55),
    sm: `0 1px 3px ${alpha(black, 0.5)}`,
    md: `0 6px 18px ${alpha(black, 0.5)}`,
    lg: `0 12px 40px ${alpha(black, 0.6)}`,
  },
}

/** CQL highlighting. */
export const syntax: ByScheme<{
  keyword: string
  function: string
  number: string
  nameBg: string
  nameText: string
}> = {
  light: {
    keyword: blue[700],
    function: violet[600],
    number: teal[700],
    nameBg: violet[100],
    nameText: violet[900],
  },
  dark: {
    keyword: blue[400],
    function: violet[300],
    number: teal[300],
    nameBg: violet[950],
    nameText: violet[200],
  },
}

/** Small marks on canvas nodes and lists: hint (!), help (?), pending discussion. */
export const marks: ByScheme<{
  hintBg: string
  hintText: string
  helpBg: string
  helpText: string
  pendingBg: string
  pendingText: string
  pendingBorder: string
}> = {
  light: {
    hintBg: yellow[300],
    hintText: yellow[900],
    helpBg: blue[600],
    helpText: white,
    pendingBg: orange[300],
    pendingText: orange[900],
    pendingBorder: orange[800],
  },
  dark: {
    hintBg: yellow[300],
    hintText: yellow[900],
    helpBg: blue[400],
    helpText: neutral[950],
    pendingBg: orange[300],
    pendingText: orange[900],
    pendingBorder: orange[800],
  },
}

// ------------------------------------------------------------------ 4. author colours

/*
 * Colours an author picks by name. They come from the hue scales, not from the brand, so a
 * "pink" note stays pink whatever the primary is.
 */

/**
 * Canvas node groups: colour encodes the group (see editor styles.css). Each has a stroke
 * and a tinted fill per scheme.
 */
export const nodeGroups = {
  flow: { light: [neutral[600], neutral[100]], dark: [neutral[400], neutral[800]] },
  question: { light: [blue[600], blue[50]], dark: [blue[400], blue[950]] },
  logic: { light: [orange[700], orange[50]], dark: [orange[400], orange[950]] },
  data: { light: [violet[500], violet[50]], dark: [violet[400], violet[950]] },
  clinical: { light: [pink[600], pink[50]], dark: [pink[400], pink[950]] },
} as const satisfies Record<string, ByScheme<readonly [string, string]>>

export type NodeGroup = keyof typeof nodeGroups

/** One swatch: sticky-note fill, group-frame tint, group-frame edge, strong label chip. */
function swatch(hue: Scale): ByScheme<readonly [string, string, string, string]> {
  return {
    light: [hue[100], alpha(hue[100], 0.4), hue[500], hue[700]],
    dark: [hue[900], alpha(hue[700], 0.3), hue[500], hue[400]],
  }
}

/** Sticky notes, group frames and discussion labels. */
export const swatches = {
  yellow: swatch(yellow),
  blue: swatch(blue),
  green: swatch(green),
  pink: swatch(pink),
  grey: swatch(neutral),
} as const

export type Swatch = keyof typeof swatches

/** Text on a sticky note (its fill is a swatch, not a surface). */
export const stickyText: ByScheme = { light: neutral[900], dark: neutral[50] }

/**
 * Text colours an author can apply in a rich text. They are content: saved in the guideline
 * and shown to health workers, so they do not follow the theme, and keep the exact spelling
 * guidelines already store.
 */
export const textColours: readonly (readonly [name: string, colour: string])[] = [
  ['Red', '#d32f2f'],
  ['Orange', '#ef6c00'],
  ['Green', '#2e7d32'],
  ['Blue', '#1565c0'],
  ['Grey', '#616161'],
]
/** The colour a text has when none is applied. */
export const defaultTextColour = black
