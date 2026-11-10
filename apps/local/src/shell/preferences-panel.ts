import { createContext, useContext } from 'react'

/** Whether Preferences are open over the current page, and how to open and close them. */
export interface PreferencesPanel {
  open: boolean
  close: () => void
  toggle: () => void
}

export const PreferencesContext = createContext<PreferencesPanel>({
  open: false,
  close: () => {},
  toggle: () => {},
})

export function usePreferencesPanel(): PreferencesPanel {
  return useContext(PreferencesContext)
}
