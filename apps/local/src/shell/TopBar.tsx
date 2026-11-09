import { useEffect, useState, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Icon } from '@tricc/editor'
import type { LocalRuntime } from '../adapters.js'
import { usePreferencesPanel } from './preferences-panel.js'

export const APP_NAME = 'DrawTricc'

/**
 * The ribbon above every page: the app name (or where the author is), the open project's
 * tools, the editing-mode menu, notifications and preferences.
 */
export function TopBar({
  local,
  storageLabel,
  tools,
  crumbs,
  bell,
}: {
  local: LocalRuntime
  storageLabel: string
  tools?: ReactNode
  /** Where the author is, after the app name: inside a project. */
  crumbs?: ReactNode
  bell?: ReactNode
}) {
  const prefs = usePreferencesPanel()
  return (
    <AppBar
      position="static"
      className="tricc-topbar"
      sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Toolbar
        variant="dense"
        sx={{ gap: 1.5, flexWrap: 'wrap', minHeight: 52, py: 0.5, px: { xs: 2, sm: 2 } }}
      >
        <Box
          component={RouterLink}
          to="/"
          data-testid="nav-home"
          aria-label={`${APP_NAME}: all projects`}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            color: 'text.primary',
            textDecoration: 'none',
          }}
        >
          <Box
            component="img"
            src={`${import.meta.env.BASE_URL}icon.png`}
            alt=""
            sx={{ width: 28, height: 28, borderRadius: 1, display: 'block' }}
          />
          <Typography component="span" sx={{ fontWeight: 700, fontSize: 16 }}>
            {APP_NAME}
          </Typography>
        </Box>
        {crumbs}
        {/* Which store backs the open project. A user must know before they close the
            tab, not after. */}
        <Typography
          component="span"
          variant="caption"
          color="text.secondary"
          data-testid="storage-mode"
          sx={{ display: { xs: 'none', md: 'inline' } }}
        >
          {storageLabel}
        </Typography>
        <div className="tricc-topbar__project">{tools}</div>
        <ModeMenu local={local} />
        {bell}
        <Tooltip title={prefs.open ? 'Close preferences' : 'Preferences'}>
          <IconButton
            data-testid="nav-preferences"
            aria-label="Preferences"
            aria-pressed={prefs.open}
            onClick={prefs.toggle}
          >
            <Icon name="settings" />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  )
}

const MODES = {
  editing: { icon: 'edit', label: 'Editing', caption: 'Edit the project directly' },
  viewing: {
    icon: 'visibility',
    label: 'Viewing',
    caption: 'Read without changing; discussions stay open',
  },
} as const

/** Editing / Viewing, presented like the mode menu of a shared document editor. */
function ModeMenu({ local }: { local: LocalRuntime }) {
  const [readOnly, setReadOnly] = useState(local.identity.isReadOnly())
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  useEffect(() => local.identity.onChange(() => setReadOnly(local.identity.isReadOnly())), [local])
  const current = readOnly ? MODES.viewing : MODES.editing
  const choose = (viewing: boolean) => {
    local.identity.setReadOnly(viewing)
    setReadOnly(viewing)
    setAnchor(null)
  }
  return (
    <>
      <Button
        variant="text"
        color="inherit"
        data-testid="mode-menu"
        aria-label={`Mode: ${current.label}`}
        data-mode={readOnly ? 'viewing' : 'editing'}
        aria-haspopup="menu"
        aria-expanded={anchor ? 'true' : undefined}
        startIcon={<Icon name={current.icon} />}
        endIcon={<Icon name="arrow_drop_down" />}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ borderRadius: 5, px: 1.5, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } } }}
      >
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          {current.label}
        </Box>
      </Button>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {(['editing', 'viewing'] as const).map((key) => {
          const m = MODES[key]
          const selected = (key === 'viewing') === readOnly
          return (
            <MenuItem
              key={key}
              data-testid={`mode-${key}`}
              selected={selected}
              onClick={() => choose(key === 'viewing')}
            >
              <ListItemIcon>
                <Icon name={m.icon} />
              </ListItemIcon>
              <ListItemText primary={m.label} secondary={m.caption} />
              {selected && <Icon name="check" style={{ marginLeft: 12 }} />}
            </MenuItem>
          )
        })}
        <MenuItem disabled data-testid="mode-suggesting">
          <ListItemIcon>
            <Icon name="rate_review" />
          </ListItemIcon>
          <ListItemText primary="Suggesting" secondary="Available on the platform" />
        </MenuItem>
      </Menu>
    </>
  )
}
