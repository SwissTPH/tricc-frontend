import React, { useState, useRef } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  Snackbar,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Visibility as ViewIcon,
  FileUpload as ImportIcon,
  FileDownload as ExportIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../hooks/useProject'
import { useProjectUndo } from '../hooks/useProjectUndo'
import { exportProject, readFileAsText, importProjectFromJSON } from '../utils/triccSerializer'
import { validateProject, ValidationError, getValidationSummary } from '../utils/triccValidator'

const ProjectDashboard: React.FC = () => {
  const navigate = useNavigate()
  const {
    currentProject,
    activities,
    createActivity,
    deleteActivity,
    importProject,
    updateProject,
  } = useProject()

  // Project-level undo/redo functionality
  const { canUndo, canRedo, undo, redo } = useProjectUndo(
    currentProject,
    activities,
    (project) => {
      if (project) {
        updateProject(project)
      }
    },
    (newActivities) => {
      // Update activities in project when undone/redone
      if (currentProject) {
        updateProject({ ...currentProject, activities: newActivities })
      }
    },
  )
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newActivity, setNewActivity] = useState({
    name: '',
    type: 'normal' as 'normal' | 'segment',
    trigger: '',
  })
  const [validationDialogOpen, setValidationDialogOpen] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCreateActivity = () => {
    if (newActivity.name.trim()) {
      createActivity({
        name: newActivity.name,
        type: newActivity.type,
        trigger: newActivity.type === 'segment' ? newActivity.trigger : undefined,
        nodes: [],
        edges: [],
        dataInputs: [],
        dataOutputs: [],
        conformanceRules: [],
        starts: [],
      })
      setCreateDialogOpen(false)
      setNewActivity({ name: '', type: 'normal', trigger: '' })
    }
  }

  const handleDeleteActivity = (activityId: string) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      deleteActivity(activityId)
    }
  }

  const handleExport = () => {
    if (currentProject) {
      try {
        exportProject(currentProject, activities)
        setSnackbarMessage('Project exported successfully!')
        setSnackbarOpen(true)
      } catch (error) {
        setSnackbarMessage('Error exporting project: ' + (error as Error).message)
        setSnackbarOpen(true)
      }
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const jsonString = await readFileAsText(file)
      const { project, activities: importedActivities } = importProjectFromJSON(jsonString)

      // Validate the imported project
      const errors = validateProject(project, importedActivities)
      setValidationErrors(errors)

      // Show validation dialog
      setValidationDialogOpen(true)

      // If no critical errors, allow import
      const hasErrors = errors.some((e) => e.type === 'error')
      if (!hasErrors) {
        importProject(project, importedActivities)
        setSnackbarMessage('Project imported successfully!')
        setSnackbarOpen(true)
      }
    } catch (error) {
      setSnackbarMessage('Error importing project: ' + (error as Error).message)
      setSnackbarOpen(true)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCloseValidation = () => {
    setValidationDialogOpen(false)
  }

  const activityList = Object.values(activities)

  return (
    <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
      <Box
        sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            {currentProject?.title || 'Project Dashboard'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {currentProject?.description || 'Manage your clinical decision support activities'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={canUndo ? 'Undo last project action (Ctrl+Z)' : 'No actions to undo'}>
            <span>
              <IconButton onClick={undo} disabled={!canUndo}>
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip
            title={canRedo ? 'Redo last undone project action (Ctrl+Y)' : 'No actions to redo'}
          >
            <span>
              <IconButton onClick={redo} disabled={!canRedo}>
                <RedoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Export Project">
            <span>
              <Button
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={handleExport}
                disabled={!currentProject}
              >
                Export
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Import Project">
            <Button variant="outlined" startIcon={<ImportIcon />} onClick={handleImportClick}>
              Import
            </Button>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {activityList.map((activity) => (
          <Grid item xs={12} sm={6} md={4} key={activity.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" component="h2">
                    {activity.name}
                  </Typography>
                  <Chip
                    label={activity.type}
                    color={activity.type === 'segment' ? 'secondary' : 'primary'}
                    size="small"
                  />
                </Box>

                {activity.type === 'segment' && activity.trigger && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Trigger: {activity.trigger}
                  </Typography>
                )}

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Nodes: {activity.nodes.length} | Edges: {activity.edges.length}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => navigate(`/activity/${activity.id}`)}
                    size="small"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ViewIcon />}
                    onClick={() => navigate(`/activity/${activity.id}?mode=view`)}
                    size="small"
                  >
                    View
                  </Button>
                  <Button variant="outlined" startIcon={<PlayIcon />} size="small" disabled>
                    Test
                  </Button>
                </Box>
              </CardContent>

              <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'flex-end' }}>
                <Tooltip title="Delete Activity">
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteActivity(activity.id)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Card>
          </Grid>
        ))}

        {activityList.length === 0 && (
          <Grid item xs={12}>
            <Card sx={{ textAlign: 'center', py: 4 }}>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No activities yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create your first activity to get started
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create Activity
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Activity</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Activity Name"
            fullWidth
            variant="outlined"
            value={newActivity.name}
            onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Activity Type</InputLabel>
            <Select
              value={newActivity.type}
              label="Activity Type"
              onChange={(e) =>
                setNewActivity({
                  ...newActivity,
                  type: e.target.value as 'normal' | 'segment',
                })
              }
            >
              <MenuItem value="normal">Normal Activity</MenuItem>
              <MenuItem value="segment">Segment (with trigger)</MenuItem>
            </Select>
          </FormControl>

          {newActivity.type === 'segment' && (
            <TextField
              margin="dense"
              label="Trigger Name"
              fullWidth
              variant="outlined"
              value={newActivity.trigger}
              onChange={(e) => setNewActivity({ ...newActivity, trigger: e.target.value })}
              placeholder="e.g., diagnosis-trigger"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateActivity} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Validation Results Dialog */}
      <Dialog open={validationDialogOpen} onClose={handleCloseValidation} maxWidth="md" fullWidth>
        <DialogTitle>Import Validation Results</DialogTitle>
        <DialogContent>
          {validationErrors.length === 0 ? (
            <Alert severity="success">
              <AlertTitle>Success</AlertTitle>
              No validation issues found. Project imported successfully!
            </Alert>
          ) : (
            <>
              <Alert
                severity={validationErrors.some((e) => e.type === 'error') ? 'error' : 'warning'}
                sx={{ mb: 2 }}
              >
                <AlertTitle>Validation Issues Found</AlertTitle>
                {getValidationSummary(validationErrors)}
              </Alert>
              <List dense>
                {validationErrors.map((error, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={error.message}
                      secondary={error.location}
                      primaryTypographyProps={{
                        color: error.type === 'error' ? 'error' : 'warning.main',
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseValidation}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  )
}

export default ProjectDashboard
