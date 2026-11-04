import { Fragment, useMemo, useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { collectLabels, processOf, resolve, type Intervention, type Project } from '@tricc/core'
import { ActivityDiscussMarks } from '../discussion/DiscussionMark.js'
import { Icon } from '../theme/Icon.js'
import { InterventionDialog, segmentsOf } from './InterventionEditor.js'

const UNASSIGNED = '__unassigned__'

/**
 * The interventions of a project as a table: one row per intervention, its segments as
 * sub-rows (expanded by default; "Collapse all" folds them). Filtered by name, code or
 * title, and by labels. The gear opens the intervention editor, where segments are added
 * and ordered.
 */
export function InterventionTable({
  project,
  readOnly,
  usage,
  selected,
  onSelectIntervention,
  onOpenActivity,
  onReveal,
  onAdd,
}: {
  project: Project
  readOnly: boolean
  /** activity id → the interventions listing it. */
  usage: Map<string, string[]>
  selected?: string
  onSelectIntervention: (id: string | undefined) => void
  onOpenActivity?: (activityId: string) => void
  onReveal?: (activityId: string, nodeId: string) => void
  onAdd?: () => void
}) {
  const lang = project.languages.default
  const [query, setQuery] = useState('')
  const [labels, setLabels] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [editing, setEditing] = useState<string | undefined>(undefined)

  const allLabels = useMemo(
    () => collectLabels(project.interventions.map((iv) => iv.labels)),
    [project.interventions],
  )
  const unassigned = useMemo(
    () =>
      Object.keys(project.activities)
        .filter((id) => !usage.has(id))
        .sort(),
    [project.activities, usage],
  )
  const rows = project.interventions.filter(matches(query, labels, lang))
  const filtering = query.trim() !== '' || labels.length > 0
  const groupIds = [...project.interventions.map((iv) => iv.id), UNASSIGNED]
  const allCollapsed = groupIds.every((id) => collapsed.has(id))
  const toggle = (id: string) =>
    setCollapsed((c) => {
      const next = new Set(c)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const editingIv = project.interventions.find((iv) => iv.id === editing)

  return (
    <section aria-labelledby="interventions-heading" className="tricc-overview__interventions">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { md: 'center' }, mb: 1.5 }}
      >
        <Typography
          id="interventions-heading"
          variant="h6"
          component="h2"
          sx={{ fontWeight: 700, flex: '0 0 auto' }}
        >
          Interventions
        </Typography>
        <TextField
          size="small"
          placeholder="Filter by name, code or title"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flex: '1 1 14em', maxWidth: { md: 320 } }}
          slotProps={{
            htmlInput: {
              'data-testid': 'intervention-filter',
              'aria-label': 'Filter interventions',
            },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Icon name="filter_list" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Autocomplete
          multiple
          size="small"
          options={allLabels}
          value={labels}
          onChange={(_, next) => setLabels(next)}
          sx={{ flex: '1 1 12em', maxWidth: { md: 300 } }}
          noOptionsText="No intervention has a label yet"
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={labels.length ? undefined : 'Labels'}
              inputProps={{
                ...params.inputProps,
                'data-testid': 'intervention-label-filter',
                'aria-label': 'Filter by label',
              }}
            />
          )}
        />
        <Stack direction="row" spacing={1} sx={{ ml: { md: 'auto' }, flex: '0 0 auto' }}>
          <Button
            size="small"
            data-testid="expand-all-interventions"
            aria-pressed={!allCollapsed}
            startIcon={<Icon name={allCollapsed ? 'unfold_more' : 'unfold_less'} />}
            onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(groupIds))}
          >
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </Button>
          {!readOnly && onAdd && (
            <Button
              size="small"
              variant="contained"
              data-testid="add-intervention"
              startIcon={<Icon name="add" />}
              onClick={onAdd}
            >
              Add intervention
            </Button>
          )}
        </Stack>
      </Stack>

      {project.interventions.length === 0 && (
        <Typography data-testid="no-interventions" color="text.secondary" sx={{ mb: 1.5 }}>
          This project has no interventions yet, so nothing would be offered to a health worker.
        </Typography>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table
          size="small"
          aria-labelledby="interventions-heading"
          data-testid="intervention-table"
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40 }} aria-label="Expand" />
              <TableCell>Name (code)</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Labels</TableCell>
              <TableCell>Starts</TableCell>
              <TableCell align="right">Segments</TableCell>
              <TableCell sx={{ width: 48 }} aria-label="Discussions" />
              <TableCell sx={{ width: 48 }} aria-label="Edit" />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((iv) => {
              const segments = segmentsOf(iv, project)
              const open = !collapsed.has(iv.id)
              const title = resolve(iv.title, lang, lang) ?? iv.id
              return (
                <Fragment key={iv.id}>
                  <TableRow
                    hover
                    selected={selected === iv.id}
                    data-testid={`intervention-${iv.id}`}
                    onClick={() => onSelectIntervention(iv.id)}
                    sx={{ cursor: 'pointer', '& > td': { borderBottom: open ? 0 : undefined } }}
                  >
                    <TableCell>
                      <IconButton
                        size="small"
                        aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
                        aria-expanded={open}
                        data-testid={`toggle-intervention-${iv.id}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggle(iv.id)
                        }}
                      >
                        <Icon name={open ? 'expand_more' : 'chevron_right'} />
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {iv.name ?? iv.id}
                    </TableCell>
                    <TableCell>
                      <Typography component="span" sx={{ fontWeight: 600 }}>
                        {title}
                      </Typography>
                      {iv.applicability && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          data-testid={`intervention-${iv.id}-applicability`}
                        >
                          Applies when:{' '}
                          {resolve(iv.applicability.intent, lang, lang) ??
                            iv.applicability.expression ??
                            'not yet specified'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {(iv.labels ?? []).map((label) => (
                          <Chip
                            key={label}
                            label={label}
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation()
                              setLabels((l) => (l.includes(label) ? l : [...l, label]))
                            }}
                          />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell
                      sx={{ whiteSpace: 'nowrap' }}
                      data-testid={`intervention-${iv.id}-trigger`}
                    >
                      {iv.trigger?.mode ?? 'on-demand'}
                    </TableCell>
                    <TableCell align="right">{segments.length}</TableCell>
                    <TableCell>
                      <DiscussCount project={project} interventionId={iv.id} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit: title, start, who it is for, segments">
                        <IconButton
                          size="small"
                          data-testid={`configure-intervention-${iv.id}`}
                          aria-label={`Configure ${title}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectIntervention(iv.id)
                            setEditing(iv.id)
                          }}
                        >
                          <Icon name="settings" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  {open && (
                    <SegmentRows
                      iv={iv}
                      project={project}
                      usage={usage}
                      segments={segments}
                      onOpenActivity={onOpenActivity}
                    />
                  )}
                </Fragment>
              )
            })}
            {filtering && rows.length === 0 && project.interventions.length > 0 && (
              <TableRow>
                <TableCell colSpan={8} sx={{ py: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary" data-testid="no-intervention-match">
                    No intervention matches the filter.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {!filtering && (
              <>
                <TableRow
                  data-testid="unassigned-group"
                  sx={{ '& > td': { borderBottom: collapsed.has(UNASSIGNED) ? undefined : 0 } }}
                >
                  <TableCell>
                    <IconButton
                      size="small"
                      aria-label={
                        collapsed.has(UNASSIGNED)
                          ? 'Expand unassigned activities'
                          : 'Collapse unassigned activities'
                      }
                      aria-expanded={!collapsed.has(UNASSIGNED)}
                      onClick={() => toggle(UNASSIGNED)}
                    >
                      <Icon name={collapsed.has(UNASSIGNED) ? 'chevron_right' : 'expand_more'} />
                    </IconButton>
                  </TableCell>
                  <TableCell colSpan={4}>
                    {/* Orphaned work is a normal mid-authoring state; hiding it is how it gets lost. */}
                    <Typography
                      component="h2"
                      id="unassigned-heading"
                      sx={{ fontWeight: 600, fontStyle: 'italic' }}
                    >
                      Unassigned activities
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{unassigned.length}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
                {!collapsed.has(UNASSIGNED) && (
                  <TableRow>
                    <TableCell />
                    <TableCell colSpan={7} sx={{ pt: 0 }}>
                      <ul className="tricc-segment-rows" data-testid="unassigned-activities">
                        {unassigned.map((id) => (
                          <li key={id} data-testid={`unassigned-${id}`}>
                            <button
                              type="button"
                              className="tricc-segment-rows__title"
                              onClick={() => onOpenActivity?.(id)}
                            >
                              {resolve(project.activities[id]?.title, lang, lang) ?? id}
                            </button>
                            <code>{id}</code>
                            <ActivityDiscussMarks activityId={id} />
                          </li>
                        ))}
                        {unassigned.length === 0 && (
                          <li className="tricc-segment-rows__empty">
                            Every activity is listed by an intervention.
                          </li>
                        )}
                      </ul>
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {editingIv && (
        <InterventionDialog
          intervention={editingIv}
          project={project}
          readOnly={readOnly}
          onReveal={onReveal}
          onSelect={onOpenActivity}
          sharedWith={usage}
          labelSuggestions={allLabels}
          onClose={() => setEditing(undefined)}
        />
      )}
    </section>
  )
}

function SegmentRows({
  iv,
  project,
  usage,
  segments,
  onOpenActivity,
}: {
  iv: Intervention
  project: Project
  usage: Map<string, string[]>
  segments: Intervention['activities']
  onOpenActivity?: (activityId: string) => void
}) {
  const lang = project.languages.default
  return (
    <TableRow data-testid={`intervention-${iv.id}-segments`}>
      <TableCell />
      <TableCell colSpan={7} sx={{ pt: 0 }}>
        {segments.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            data-testid={`iv-no-segments-${iv.id}`}
            sx={{ py: 0.5 }}
          >
            No segments yet. Add one with the gear.
          </Typography>
        ) : (
          <ol className="tricc-segment-rows" data-testid={`iv-segment-rows-${iv.id}`}>
            {segments.map((ref) => {
              const activity = project.activities[ref.ref]
              const label = resolve(activity?.title, lang, lang) ?? ref.ref
              const process = activity ? processOf(activity) : undefined
              const others = (usage.get(ref.ref) ?? []).filter((other) => other !== iv.id)
              return (
                <li key={ref.ref} data-testid={`segment-${iv.id}-${ref.ref}`}>
                  <button
                    type="button"
                    className="tricc-segment-rows__title"
                    title={process ? `Starts the ${process} segment` : label}
                    data-testid={`open-segment-${iv.id}-${ref.ref}`}
                    onClick={() => onOpenActivity?.(ref.ref)}
                  >
                    {label}
                  </button>
                  <span className="tricc-nav__process">{process ?? 'no CPG process'}</span>
                  {others.length > 0 && (
                    <span
                      className="tricc-nav__shared"
                      data-testid={`shared-${ref.ref}`}
                      title={`The same segment as on ${others.join(', ')}`}
                    >
                      shared
                    </span>
                  )}
                  <ActivityDiscussMarks activityId={ref.ref} />
                </li>
              )
            })}
          </ol>
        )}
      </TableCell>
    </TableRow>
  )
}

/** Open discussions about the intervention itself. */
function DiscussCount({ project, interventionId }: { project: Project; interventionId: string }) {
  const open = Object.values(project.discussions ?? {}).filter(
    (d) =>
      d.status === 'open' &&
      d.about.kind === 'intervention' &&
      d.about.interventionId === interventionId,
  ).length
  if (open === 0) return null
  return (
    <span className="tricc-process-row__marks" title="Open discussions">
      <span className="tricc-discuss-marks__open">{open}</span>
    </span>
  )
}

/** Name (code) and title by substring; every chosen label must be on the intervention. */
function matches(query: string, labels: string[], lang: string) {
  const needle = query.trim().toLowerCase()
  return (iv: Intervention) => {
    if (labels.some((l) => !(iv.labels ?? []).includes(l))) return false
    if (!needle) return true
    return [iv.id, iv.name, resolve(iv.title, lang, lang)]
      .filter((v): v is string => typeof v === 'string')
      .some((v) => v.toLowerCase().includes(needle))
  }
}
