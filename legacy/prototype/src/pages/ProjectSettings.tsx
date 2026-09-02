import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Grid,
  IconButton,
} from '@mui/material'
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import {
  ProjectSettings as ProjectSettingsType,
  TerminologyServerConfig,
  TriccContext,
} from '../types'
import { useProject } from '../hooks/useProject'

const ProjectSettings: React.FC = () => {
  const { currentProject, updateProject } = useProject()

  const [settings, setSettings] = useState<ProjectSettingsType>({
    terminologyServerUrl: 'https://api.openconceptlab.org',
    defaultLanguage: 'en',
    autoSave: true,
    theme: 'light',
  })

  const [projectMetadata, setProjectMetadata] = useState({
    title: currentProject?.title || '',
    description: currentProject?.description || '',
    version: currentProject?.version || '1.0.0',
    system: currentProject?.system || '',
    code: currentProject?.code || '',
  })

  const [contexts, setContexts] = useState<TriccContext[]>(currentProject?.contexts || [])
  const [newContext, setNewContext] = useState<Partial<TriccContext>>({
    system: '',
    code: '',
    display: '',
    version: '',
  })

  const [terminologyServers, setTerminologyServers] = useState<TerminologyServerConfig[]>([
    {
      url: 'https://api.openconceptlab.org',
      name: 'OpenConceptLab',
      description: 'Open source terminology server',
      isDefault: true,
    },
    {
      url: 'https://terminology.hl7.org',
      name: 'HL7 Terminology',
      description: 'HL7 standard terminologies',
      isDefault: false,
    },
  ])

  const [newServer, setNewServer] = useState({
    url: '',
    name: '',
    description: '',
  })

  const handleSettingChange = (field: keyof ProjectSettingsType, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = () => {
    // Save settings to backend
    console.log('Saving settings:', settings)

    // Update project metadata
    if (currentProject) {
      updateProject({
        ...projectMetadata,
        contexts,
      })
    }
    // Show success message
  }

  const handleAddContext = () => {
    if (newContext.system && newContext.code && newContext.display) {
      const context: TriccContext = {
        system: newContext.system,
        code: newContext.code,
        display: newContext.display,
        version: newContext.version,
        attributes: {},
      }
      setContexts((prev) => [...prev, context])
      setNewContext({ system: '', code: '', display: '', version: '' })
    }
  }

  const handleRemoveContext = (index: number) => {
    setContexts((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddServer = () => {
    if (newServer.url && newServer.name) {
      const server: TerminologyServerConfig = {
        ...newServer,
        isDefault: terminologyServers.length === 0,
      }
      setTerminologyServers((prev) => [...prev, server])
      setNewServer({ url: '', name: '', description: '' })
    }
  }

  const handleRemoveServer = (index: number) => {
    setTerminologyServers((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSetDefaultServer = (index: number) => {
    setTerminologyServers((prev) =>
      prev.map((server, i) => ({
        ...server,
        isDefault: i === index,
      })),
    )
  }

  return (
    <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Project Settings
      </Typography>

      <Grid container spacing={3}>
        {/* General Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                General Settings
              </Typography>

              <TextField
                fullWidth
                label="Terminology Server URL"
                value={settings.terminologyServerUrl}
                onChange={(e) => handleSettingChange('terminologyServerUrl', e.target.value)}
                sx={{ mb: 2 }}
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Default Language</InputLabel>
                <Select
                  value={settings.defaultLanguage}
                  label="Default Language"
                  onChange={(e) => handleSettingChange('defaultLanguage', e.target.value)}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="fr">French</MenuItem>
                  <MenuItem value="es">Spanish</MenuItem>
                  <MenuItem value="de">German</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoSave}
                    onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                  />
                }
                label="Auto-save changes"
                sx={{ mb: 2 }}
              />

              <FormControl fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={settings.theme}
                  label="Theme"
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        {/* Project Metadata */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Project Metadata
              </Typography>

              <TextField
                fullWidth
                label="Project Title"
                value={projectMetadata.title}
                onChange={(e) => setProjectMetadata((prev) => ({ ...prev, title: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Description"
                value={projectMetadata.description}
                onChange={(e) =>
                  setProjectMetadata((prev) => ({ ...prev, description: e.target.value }))
                }
                multiline
                rows={3}
                sx={{ mb: 2 }}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Version"
                    value={projectMetadata.version}
                    onChange={(e) =>
                      setProjectMetadata((prev) => ({ ...prev, version: e.target.value }))
                    }
                    placeholder="1.0.0"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="System (optional)"
                    value={projectMetadata.system}
                    onChange={(e) =>
                      setProjectMetadata((prev) => ({ ...prev, system: e.target.value }))
                    }
                    placeholder="http://example.org"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Code (optional)"
                    value={projectMetadata.code}
                    onChange={(e) =>
                      setProjectMetadata((prev) => ({ ...prev, code: e.target.value }))
                    }
                    placeholder="cdss-001"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Context Management */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                FHIR Contexts
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Define FHIR contexts for this project (e.g., Patient, Encounter, Observation)
              </Typography>

              {contexts.map((context, index) => (
                <Box
                  key={index}
                  sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1">{context.display}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {context.system} | {context.code}
                        {context.version && ` | v${context.version}`}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveContext(index)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Add New Context
              </Typography>

              <TextField
                fullWidth
                label="Display Name"
                value={newContext.display}
                onChange={(e) => setNewContext((prev) => ({ ...prev, display: e.target.value }))}
                sx={{ mb: 1 }}
                placeholder="e.g., Patient"
              />

              <TextField
                fullWidth
                label="System"
                value={newContext.system}
                onChange={(e) => setNewContext((prev) => ({ ...prev, system: e.target.value }))}
                sx={{ mb: 1 }}
                placeholder="e.g., http://hl7.org/fhir/StructureDefinition"
              />

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Code"
                    value={newContext.code}
                    onChange={(e) => setNewContext((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g., Patient"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Version (optional)"
                    value={newContext.version}
                    onChange={(e) =>
                      setNewContext((prev) => ({ ...prev, version: e.target.value }))
                    }
                    placeholder="e.g., 4.0.1"
                  />
                </Grid>
              </Grid>

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddContext}
                disabled={!newContext.system || !newContext.code || !newContext.display}
              >
                Add Context
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Terminology Servers */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Terminology Servers
              </Typography>

              {terminologyServers.map((server, index) => (
                <Box
                  key={index}
                  sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1">
                        {server.name}
                        {server.isDefault && (
                          <Typography
                            component="span"
                            variant="caption"
                            color="primary"
                            sx={{ ml: 1 }}
                          >
                            (Default)
                          </Typography>
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {server.url}
                      </Typography>
                      {server.description && (
                        <Typography variant="body2" color="text.secondary">
                          {server.description}
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      {!server.isDefault && (
                        <Button size="small" onClick={() => handleSetDefaultServer(index)}>
                          Set Default
                        </Button>
                      )}
                      <Button size="small" color="error" onClick={() => handleRemoveServer(index)}>
                        Remove
                      </Button>
                    </Box>
                  </Box>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Add New Server
              </Typography>

              <TextField
                fullWidth
                label="Server Name"
                value={newServer.name}
                onChange={(e) => setNewServer((prev) => ({ ...prev, name: e.target.value }))}
                sx={{ mb: 1 }}
              />

              <TextField
                fullWidth
                label="Server URL"
                value={newServer.url}
                onChange={(e) => setNewServer((prev) => ({ ...prev, url: e.target.value }))}
                sx={{ mb: 1 }}
              />

              <TextField
                fullWidth
                label="Description (optional)"
                value={newServer.description}
                onChange={(e) => setNewServer((prev) => ({ ...prev, description: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <Button
                variant="outlined"
                onClick={handleAddServer}
                disabled={!newServer.url || !newServer.name}
              >
                Add Server
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
            >
              Reset
            </Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
              Save Settings
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ProjectSettings
