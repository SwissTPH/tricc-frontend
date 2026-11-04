import { useState } from 'react'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import Popover from '@mui/material/Popover'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import type { TriccNotification } from '@tricc/core'
import { useNotifications } from '../runtime/useNotifications.js'
import { Icon } from '../theme/Icon.js'

/**
 * The bell in the top bar. On the home page (`projectId` absent) it gathers every
 * project; inside a project, that project only. Opening an item marks it read.
 */
export function NotificationBell({
  projectId,
  onOpen,
}: {
  projectId?: string
  onOpen: (notification: TriccNotification) => void
}) {
  const scope = projectId ? { projectId } : {}
  const { items, unread, markRead } = useNotifications(scope)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const label = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'

  const groups = projectId ? [{ key: projectId, title: undefined, items }] : byProject(items)

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          aria-label={label}
          data-testid="notification-bell"
          data-unread={unread}
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          <Badge badgeContent={unread} color="primary" max={99}>
            <Icon name="notifications" filled={unread > 0} />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { sx: { width: 380, maxWidth: 'calc(100vw - 32px)', maxHeight: 480 } },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle2" component="h2">
            {projectId ? 'Notifications in this project' : 'Notifications'}
          </Typography>
          <Button
            size="small"
            disabled={unread === 0}
            data-testid="notifications-mark-all"
            onClick={() => markRead(items.filter((n) => !n.read).map((n) => n.id))}
          >
            Mark all read
          </Button>
        </Box>
        {items.length === 0 ? (
          <Typography
            sx={{ px: 2, py: 3 }}
            color="text.secondary"
            data-testid="notifications-empty"
          >
            Nothing for you. When someone tags you in a discussion or assigns one to you, it shows
            here.
          </Typography>
        ) : (
          <List dense disablePadding data-testid="notifications-list">
            {groups.map((group) => (
              <li key={group.key}>
                <ul style={{ padding: 0 }}>
                  {group.title && (
                    <ListSubheader sx={{ lineHeight: '32px' }}>{group.title}</ListSubheader>
                  )}
                  {group.items.map((n) => (
                    <ListItemButton
                      key={n.id}
                      data-testid={`notification-${n.id}`}
                      data-read={n.read}
                      onClick={() => {
                        markRead([n.id])
                        setAnchor(null)
                        onOpen(n)
                      }}
                      sx={{
                        alignItems: 'flex-start',
                        bgcolor: n.read ? undefined : 'action.selected',
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                        <Icon name={n.kind === 'assigned' ? 'assignment_ind' : 'alternate_email'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={headline(n)}
                        secondary={n.excerpt}
                        slotProps={{
                          primary: { sx: { fontWeight: n.read ? 400 : 600 } },
                          secondary: { sx: { overflowWrap: 'anywhere' } },
                        }}
                      />
                    </ListItemButton>
                  ))}
                </ul>
              </li>
            ))}
          </List>
        )}
      </Popover>
    </>
  )
}

function headline(n: TriccNotification): string {
  const who = n.by?.name ?? 'Someone'
  if (n.kind === 'assigned') return `${who} assigned you “${n.title}”`
  if (n.kind === 'mention') return `${who} tagged you on “${n.title}”`
  return n.title
}

function byProject(items: TriccNotification[]) {
  const groups = new Map<string, { key: string; title: string; items: TriccNotification[] }>()
  for (const n of items) {
    const g = groups.get(n.projectId) ?? {
      key: n.projectId,
      title: n.projectName ?? n.projectId,
      items: [],
    }
    g.items.push(n)
    groups.set(n.projectId, g)
  }
  return [...groups.values()]
}
