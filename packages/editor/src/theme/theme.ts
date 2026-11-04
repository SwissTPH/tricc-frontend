import { createTheme, type Theme } from '@mui/material/styles'
import {
  neutral,
  primary,
  primaryRoles,
  secondary,
  secondaryRoles,
  semantic,
  surfaces,
  type Scheme,
} from './palette.js'

/** `data-theme="light|dark"` on <html>, matching the selector the `--tricc-*` tokens use. */
export const COLOR_SCHEME_SELECTOR = '[data-theme="%s"]'

/** The MUI palette of one scheme, from the same entries as the `--tricc-*` tokens. */
function muiPalette(scheme: Scheme) {
  const s = surfaces[scheme]
  const b = primaryRoles[scheme]
  const dark = scheme === 'dark'
  return {
    primary: {
      main: b.main,
      dark: dark ? primary[400] : b.hover,
      light: dark ? primary[200] : primary[300],
      contrastText: b.on,
    },
    secondary: {
      main: secondaryRoles[scheme].main,
      dark: dark ? secondary[500] : secondary[600],
      light: dark ? secondary[200] : secondary[300],
    },
    error: { main: semantic.error[scheme].main },
    warning: { main: semantic.warning[scheme].main },
    success: { main: semantic.success[scheme].main },
    info: { main: semantic.info[scheme].main },
    background: { default: s.background, paper: s.paper },
    text: { primary: s.text, secondary: s.textMuted },
    divider: s.border,
    grey: { ...neutral },
    action: { selected: b.soft, hover: s.subtle },
  }
}

export function createDrawTriccTheme(): Theme {
  return createTheme({
    cssVariables: { colorSchemeSelector: COLOR_SCHEME_SELECTOR },
    colorSchemes: {
      light: { palette: muiPalette('light') },
      dark: { palette: muiPalette('dark') },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      fontSize: 14,
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiAppBar: { defaultProps: { elevation: 0, color: 'inherit' } },
      MuiTableCell: { styleOverrides: { head: { fontWeight: 600 } } },
      MuiButtonBase: { defaultProps: { disableRipple: false } },
    },
  })
}
