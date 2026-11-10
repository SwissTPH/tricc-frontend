import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Fab from '@mui/material/Fab'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import {
  ARCHIVE_EXTENSION,
  collectLabels,
  createProject,
  fromArchive,
  isBinaryPath,
  normalizeImport,
  readProject,
  type ProjectFiles,
  type ProjectRef,
  type ProjectSummary,
} from '@tricc/core'
import { ConfirmDelete, Icon, LabelsField } from '@tricc/editor'
import type { LocalRuntime } from '../adapters.js'
import { ImportFromRepoDialog } from '../git/ui.js'
import {
  deleteNote,
  deleteProject,
  refFor,
  resolveName,
  slug,
  stripExtension,
} from '../projects.js'

type SortKey = 'code' | 'name' | 'owner' | 'lastOpened'

/** The project list: a searchable table, with Import and New project as floating buttons. */
export function HomePage({ local }: { local: LocalRuntime }) {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'lastOpened',
    dir: 'desc',
  })
  const [error, setError] = useState<string | undefined>(undefined)
  const [deleting, setDeleting] = useState<ProjectRef | undefined>(undefined)
  const [creating, setCreating] = useState(false)
  const [importAnchor, setImportAnchor] = useState<HTMLElement | null>(null)
  const [repoOpen, setRepoOpen] = useState(false)
  const archiveInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)
  const readOnly = useReadOnly(local)
  const cancelDelete = useCallback(() => setDeleting(undefined), [])

  const refresh = useCallback(async () => setProjects(await local.catalog.list()), [local])
  useEffect(() => void refresh(), [refresh])

  const allLabels = useMemo(() => collectLabels(projects.map((p) => p.labels)), [projects])
  const rows = useMemo(
    () => sortRows(projects.filter(matches(query)), sort.key, sort.dir),
    [projects, query, sort],
  )

  /** Adopt an imported file set as a new browser-backed project. */
  const importFiles = async (
    files: ProjectFiles,
    fallbackName: string,
  ): Promise<ProjectRef | undefined> => {
    setError(undefined)
    const normalized = normalizeImport(files)
    try {
      // Parse before adopting: importing something unreadable and only discovering it on
      // open would leave a broken entry in the project list.
      const { project } = readProject(normalized)
      const label = resolveName(project.title, project.languages.default) ?? fallbackName
      const ref = await local.catalog.create(label)
      await local.persistence.write(ref, {
        files: normalized,
        changed: Object.keys(normalized),
        removed: [],
      })
      await refresh()
      navigate(`/project/${ref.id}`)
      return ref
    } catch (e) {
      setError(
        e instanceof Error ? `That does not look like a TRICC project: ${e.message}` : String(e),
      )
      return undefined
    }
  }

  const sortBy = (key: SortKey) =>
    setSort((s) => ({
      key,
      dir:
        s.key === key ? (s.dir === 'asc' ? 'desc' : 'asc') : key === 'lastOpened' ? 'desc' : 'asc',
    }))
  const addLabelToSearch = (label: string) => {
    const token = label.includes(' ') ? `label:"${label}"` : `label:${label}`
    if (!query.includes(token)) setQuery((q) => `${q.trim()} ${token}`.trim())
  }

  return (
    <Box data-testid="project-list" sx={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 3, pb: 16, maxWidth: 1200, mx: 'auto' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2 }}
        >
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            Projects
          </Typography>
          <TextField
            size="small"
            placeholder="Search by name, code or label"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ width: { xs: '100%', sm: 360 } }}
            slotProps={{
              htmlInput: { 'data-testid': 'project-search', 'aria-label': 'Search projects' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Icon name="search" />
                  </InputAdornment>
                ),
                endAdornment: query ? (
                  <InputAdornment position="end">
                    <IconButton size="small" aria-label="Clear search" onClick={() => setQuery('')}>
                      <Icon name="close" size={18} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
        </Stack>

        {error && (
          <Alert severity="error" data-testid="import-error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {projects.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <Icon name="account_tree" size={40} style={{ opacity: 0.5 }} />
            <Typography data-testid="no-projects" sx={{ mt: 1 }}>
              No projects yet. Start one with the + button, or import a project.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small" aria-label="Projects" data-testid="project-table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 40 }} aria-label="Storage" />
                  <SortHead label="ID / code" k="code" sort={sort} onSort={sortBy} />
                  <SortHead label="Name" k="name" sort={sort} onSort={sortBy} />
                  <TableCell>Labels</TableCell>
                  <SortHead label="Owner" k="owner" sort={sort} onSort={sortBy} />
                  <SortHead label="Last opened" k="lastOpened" sort={sort} onSort={sortBy} />
                  <TableCell align="right" sx={{ width: 96 }} aria-label="Actions" />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((p) => {
                  const folder = local.storeFor(p) === 'folder'
                  return (
                    <TableRow
                      key={p.id}
                      hover
                      data-testid={`project-row-${p.id}`}
                      onClick={() => navigate(`/project/${p.id}`)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Tooltip title={folder ? 'Saved in a folder' : 'Saved in this browser'}>
                          <span style={{ display: 'inline-flex', opacity: 0.7 }}>
                            <Icon name={folder ? 'folder' : 'web'} />
                          </span>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {p.code ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="text"
                          size="small"
                          data-testid={`open-${p.id}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/project/${p.id}`)
                          }}
                          sx={{ fontWeight: 600, justifyContent: 'flex-start', textAlign: 'left' }}
                        >
                          {p.name}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                          {(p.labels ?? []).map((label) => (
                            <Chip
                              key={label}
                              label={label}
                              size="small"
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation()
                                addLabelToSearch(label)
                              }}
                            />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{p.owner?.name ?? '—'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                        {p.lastOpened ? relativeTime(p.lastOpened) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Project settings">
                          <IconButton
                            size="small"
                            data-testid={`configure-${p.id}`}
                            aria-label={`Settings of ${p.name}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/project/${p.id}?settings=1`)
                            }}
                          >
                            <Icon name="settings" />
                          </IconButton>
                        </Tooltip>
                        {!readOnly && (
                          <Tooltip title="Delete project">
                            <IconButton
                              size="small"
                              color="error"
                              data-testid={`delete-${p.id}`}
                              aria-label={`Delete ${p.name}`}
                              onClick={async (e) => {
                                e.stopPropagation()
                                setDeleting(await refFor(local, p))
                              }}
                            >
                              <Icon name="delete" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 4, textAlign: 'center' }}>
                      <Typography color="text.secondary" data-testid="no-project-match">
                        No project matches “{query}”.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {deleting && (
          <ConfirmDelete
            testId="delete-project"
            heading="Delete this project?"
            onCancel={cancelDelete}
            onConfirm={() => {
              const ref = deleting
              setDeleting(undefined)
              void deleteProject(local, ref).then(refresh)
            }}
          >
            <p>This removes {deleting.name} from your projects.</p>
            <p data-testid="delete-project-note">{deleteNote(local, deleting)}</p>
          </ConfirmDelete>
        )}

        {/* Import above, New project below: the main action sits where the thumb is. */}
        <Stack
          spacing={2}
          sx={{
            position: 'fixed',
            right: { xs: 16, sm: 32 },
            bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            alignItems: 'center',
            zIndex: (t) => t.zIndex.speedDial,
          }}
        >
          <Tooltip title="Import a project" placement="left">
            <Fab
              size="small"
              color="secondary"
              aria-label="Import a project"
              data-testid="import-project"
              aria-haspopup="menu"
              onClick={(e) => setImportAnchor(e.currentTarget)}
            >
              <Icon name="upload_file" />
            </Fab>
          </Tooltip>
          <Tooltip title="New project" placement="left">
            <Fab
              color="primary"
              aria-label="New project"
              data-testid="new-project"
              onClick={() => setCreating(true)}
            >
              <Icon name="add" size={28} />
            </Fab>
          </Tooltip>
        </Stack>

        <Menu
          anchorEl={importAnchor}
          open={importAnchor !== null}
          onClose={() => setImportAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          {local.canUseFolders && (
            <MenuItem
              data-testid="open-folder"
              onClick={async () => {
                setImportAnchor(null)
                setError(undefined)
                const ref = await local.catalog.open()
                // Undefined means the user cancelled the picker, which is not an error.
                if (!ref) return
                await refresh()
                navigate(`/project/${ref.id}`)
              }}
            >
              <ListItemIcon>
                <Icon name="folder_open" />
              </ListItemIcon>
              <ListItemText
                primary="Open a project folder…"
                secondary="Work on the files in place"
              />
            </MenuItem>
          )}
          <MenuItem
            data-testid="import-repo"
            onClick={() => {
              setImportAnchor(null)
              setRepoOpen(true)
            }}
          >
            <ListItemIcon>
              <Icon name="cloud_download" />
            </ListItemIcon>
            <ListItemText primary="From GitHub or GitLab…" />
          </MenuItem>
          <MenuItem
            data-testid="import-archive-menu"
            onClick={() => {
              setImportAnchor(null)
              archiveInput.current?.click()
            }}
          >
            <ListItemIcon>
              <Icon name="archive" />
            </ListItemIcon>
            <ListItemText primary={`A ${ARCHIVE_EXTENSION} file…`} />
          </MenuItem>
          <MenuItem
            data-testid="import-files-menu"
            onClick={() => {
              setImportAnchor(null)
              folderInput.current?.click()
            }}
          >
            <ListItemIcon>
              <Icon name="drive_folder_upload" />
            </ListItemIcon>
            <ListItemText primary="Copy a project folder…" secondary="Into this browser" />
          </MenuItem>
        </Menu>

        <input
          ref={archiveInput}
          hidden
          type="file"
          accept={`${ARCHIVE_EXTENSION},.zip`}
          data-testid="import-archive"
          aria-label={`Import a ${ARCHIVE_EXTENSION} file`}
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const bytes = new Uint8Array(await file.arrayBuffer())
            try {
              await importFiles(fromArchive(bytes), stripExtension(file.name))
            } catch {
              setError('That file could not be read as an archive.')
            }
            e.target.value = ''
          }}
        />
        <input
          ref={folderInput}
          hidden
          type="file"
          multiple
          data-testid="import-files"
          aria-label="Import a project folder"
          // Reading a directory works in every current browser; only writing back to one is
          // Chromium-only, so this is the import path that always exists.
          {...({ webkitdirectory: '' } as Record<string, string>)}
          onChange={async (e) => {
            const list = Array.from(e.target.files ?? [])
            if (list.length === 0) return
            const files: ProjectFiles = {}
            for (const f of list) {
              const path =
                (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name
              // Pictures stay bytes; everything else in a project is text.
              files[path] = isBinaryPath(path)
                ? new Uint8Array(await f.arrayBuffer())
                : await f.text()
            }
            await importFiles(files, 'Imported project')
            e.target.value = ''
          }}
        />

        {repoOpen && (
          <ImportFromRepoDialog
            onClose={() => setRepoOpen(false)}
            onImport={async (files, fallbackName) => {
              // A repository import names its own errors in its dialog, not on the page.
              const ref = await importFiles(files, fallbackName)
              if (!ref) setError(undefined)
              return ref
            }}
          />
        )}

        {creating && (
          <NewProjectDialog
            suggestions={allLabels}
            onClose={() => setCreating(false)}
            onCreate={async ({ name, code, labels }) => {
              const project = createProject({ id: slug(code || name), title: name })
              if (code) project.code = code
              if (labels.length) project.labels = labels
              const open = await local.runtime.create(name, project)
              setCreating(false)
              await refresh()
              navigate(`/project/${open.ref.id}`)
            }}
          />
        )}
      </Box>
    </Box>
  )
}

function SortHead({
  label,
  k,
  sort,
  onSort,
}: {
  label: string
  k: SortKey
  sort: { key: SortKey; dir: 'asc' | 'desc' }
  onSort: (k: SortKey) => void
}) {
  return (
    <TableCell sortDirection={sort.key === k ? sort.dir : false}>
      <TableSortLabel
        active={sort.key === k}
        direction={sort.key === k ? sort.dir : 'asc'}
        onClick={() => onSort(k)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  )
}

function NewProjectDialog({
  suggestions,
  onClose,
  onCreate,
}: {
  suggestions: string[]
  onClose: () => void
  onCreate: (p: { name: string; code: string; labels: string[] }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [labels, setLabels] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (name.trim() === '' || busy) return
    setBusy(true)
    try {
      await onCreate({ name: name.trim(), code: code.trim(), labels })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="new-project-title">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <DialogTitle id="new-project-title">New project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              required
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              slotProps={{
                htmlInput: { id: 'new-project-name', 'data-testid': 'new-project-name' },
              }}
            />
            <TextField
              label="Code"
              helperText="A short identifier, such as IMCI-2026. Optional."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              slotProps={{ htmlInput: { 'data-testid': 'new-project-code' } }}
            />
            <LabelsField
              value={labels}
              onChange={setLabels}
              suggestions={suggestions}
              testId="new-project-labels"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            data-testid="create-project"
            disabled={name.trim() === '' || busy}
          >
            Create project
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

/** Name, title, code, owner and labels by substring; `label:x` (or `label:"x y"`) exactly. */
export function matches(query: string): (p: ProjectSummary) => boolean {
  const tokens = [...query.matchAll(/(label:)?("([^"]*)"|\S+)/gi)].map((m) => ({
    label: Boolean(m[1]),
    text: (m[3] ?? m[2] ?? '').toLowerCase(),
  }))
  return (p) =>
    tokens.every(({ label, text }) => {
      if (!text) return true
      const labels = (p.labels ?? []).map((l) => l.toLowerCase())
      if (label) return labels.includes(text)
      return [p.name, p.title, p.code, p.id, p.owner?.name, ...labels]
        .filter((v): v is string => typeof v === 'string')
        .some((v) => v.toLowerCase().includes(text))
    })
}

function sortRows(rows: ProjectSummary[], key: SortKey, dir: 'asc' | 'desc'): ProjectSummary[] {
  const value = (p: ProjectSummary): string | number =>
    key === 'lastOpened'
      ? (p.lastOpened ?? 0)
      : key === 'code'
        ? (p.code ?? '')
        : key === 'owner'
          ? (p.owner?.name ?? '')
          : p.name
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const va = value(a)
    const vb = value(b)
    const c =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' })
    return c * sign
  })
}

const RTF = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function relativeTime(at: number): string {
  const seconds = Math.round((at - Date.now()) / 1000)
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return RTF.format(Math.round(seconds / size), unit)
  }
  return RTF.format(0, 'minute')
}

function useReadOnly(local: LocalRuntime): boolean {
  const [readOnly, setReadOnly] = useState(local.identity.isReadOnly())
  useEffect(() => local.identity.onChange(() => setReadOnly(local.identity.isReadOnly())), [local])
  return readOnly
}
