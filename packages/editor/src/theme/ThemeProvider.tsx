import { useMemo, type ReactNode } from 'react'
import GlobalStyles from '@mui/material/GlobalStyles'
import { ThemeProvider, useColorScheme } from '@mui/material/styles'
import { createDrawTriccTheme } from './theme.js'
import { tokenStylesheet } from './tokens.js'

/** localStorage key holding the chosen mode ('system' | 'light' | 'dark'). */
export const THEME_MODE_KEY = 'drawtricc.theme'

/**
 * Applies the DrawTricc theme: MUI components, plus the `--tricc-*` tokens every
 * hand-written stylesheet reads. The scheme follows the OS unless the user picks one in
 * Preferences (see `useThemeMode`).
 */
export function DrawTriccThemeProvider({ children }: { children: ReactNode }) {
  const theme = useMemo(() => createDrawTriccTheme(), [])
  const sheet = useMemo(() => tokenStylesheet(), [])
  return (
    <ThemeProvider theme={theme} defaultMode="system" modeStorageKey={THEME_MODE_KEY}>
      <GlobalStyles styles={sheet} />
      {children}
    </ThemeProvider>
  )
}

export type ThemeMode = 'system' | 'light' | 'dark'

/** The chosen mode and the scheme actually shown (system resolved). */
export function useThemeMode(): {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
} {
  const { mode, systemMode, setMode } = useColorScheme()
  const chosen: ThemeMode = mode ?? 'system'
  const resolved = (chosen === 'system' ? systemMode : chosen) ?? 'light'
  return { mode: chosen, resolved, setMode }
}
