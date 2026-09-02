import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { Search as SearchIcon, Refresh as RefreshIcon, Add as AddIcon } from '@mui/icons-material'
import { Concept, CodeSystem } from '../types'
import { useProject } from '../hooks/useProject'

const TerminologyServer: React.FC = () => {
  const { getAllConcepts, getCodeSystems, addConceptToCodeSystem, createCodeSystem } = useProject()

  // Concept list state
  const [conceptSearchTerm, setConceptSearchTerm] = useState('')
  const [selectedCodeSystem, setSelectedCodeSystem] = useState<string>('all')
  const [conceptResults, setConceptResults] = useState<Concept[]>([])
  const [conceptLoading, setConceptLoading] = useState(false)
  const [conceptError, setConceptError] = useState<string | null>(null)

  // Code system list state
  const [codeSystemSearchTerm, setCodeSystemSearchTerm] = useState('')
  const [codeSystemResults, setCodeSystemResults] = useState<CodeSystem[]>([])
  const [codeSystemLoading, setCodeSystemLoading] = useState(false)
  const [codeSystemError, setCodeSystemError] = useState<string | null>(null)

  // Dialog states
  const [createConceptDialogOpen, setCreateConceptDialogOpen] = useState(false)
  const [createCodeSystemDialogOpen, setCreateCodeSystemDialogOpen] = useState(false)
  const [newConcept, setNewConcept] = useState({
    code: '',
    system: '',
    display: '',
    dataType: 'string',
    conceptType: 'custom',
  })
  const [newCodeSystem, setNewCodeSystem] = useState({
    name: '',
    description: '',
  })

  const allConcepts = getAllConcepts()
  const allCodeSystems = getCodeSystems()

  // Concept search handler
  const handleConceptSearch = () => {
    if (!conceptSearchTerm.trim()) {
      setConceptResults([])
      return
    }

    setConceptLoading(true)
    setConceptError(null)

    try {
      let filteredConcepts = allConcepts.filter(
        (concept) =>
          concept.display.toLowerCase().includes(conceptSearchTerm.toLowerCase()) ||
          concept.code.toLowerCase().includes(conceptSearchTerm.toLowerCase()),
      )

      // Filter by selected code system if not "all"
      if (selectedCodeSystem !== 'all') {
        filteredConcepts = filteredConcepts.filter(
          (concept) => concept.system === selectedCodeSystem,
        )
      }

      setConceptResults(filteredConcepts)
    } catch (err) {
      setConceptError('Failed to search concepts')
    } finally {
      setConceptLoading(false)
    }
  }

  // Code system search handler
  const handleCodeSystemSearch = () => {
    if (!codeSystemSearchTerm.trim()) {
      setCodeSystemResults([])
      return
    }

    setCodeSystemLoading(true)
    setCodeSystemError(null)

    try {
      const filteredCodeSystems = Object.values(allCodeSystems).filter(
        (codeSystem) =>
          codeSystem.name.toLowerCase().includes(codeSystemSearchTerm.toLowerCase()) ||
          codeSystem.id.toLowerCase().includes(codeSystemSearchTerm.toLowerCase()) ||
          (codeSystem.description &&
            codeSystem.description.toLowerCase().includes(codeSystemSearchTerm.toLowerCase())),
      )

      setCodeSystemResults(filteredCodeSystems)
    } catch (err) {
      setCodeSystemError('Failed to search code systems')
    } finally {
      setCodeSystemLoading(false)
    }
  }

  const handleSelectConcept = (concept: Concept) => {
    console.log('Selected concept:', concept)
    // In a real app, this would add the concept to the project
  }

  const handleCreateConcept = () => {
    if (newConcept.code && newConcept.display) {
      // Add concept to the default code system (FHIRcodesystem)
      const defaultCodeSystemId = 'FHIRcodesystem'
      addConceptToCodeSystem(defaultCodeSystemId, newConcept)

      // Reset form and close dialog
      setNewConcept({
        code: '',
        system: '',
        display: '',
        dataType: 'string',
        conceptType: 'custom',
      })
      setCreateConceptDialogOpen(false)
    }
  }

  const handleCancelCreateConcept = () => {
    setNewConcept({
      code: '',
      system: '',
      display: '',
      dataType: 'string',
      conceptType: 'custom',
    })
    setCreateConceptDialogOpen(false)
  }

  const handleCreateCodeSystem = () => {
    if (newCodeSystem.name) {
      createCodeSystem(newCodeSystem)

      // Reset form and close dialog
      setNewCodeSystem({
        name: '',
        description: '',
      })
      setCreateCodeSystemDialogOpen(false)
    }
  }

  const handleCancelCreateCodeSystem = () => {
    setNewCodeSystem({
      name: '',
      description: '',
    })
    setCreateCodeSystemDialogOpen(false)
  }

  return (
    <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Terminology Server
      </Typography>

      <Grid container spacing={3}>
        {/* Concept List */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Concept List
              </Typography>

              {/* Code System Picker */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  select
                  fullWidth
                  label="Filter by Code System"
                  value={selectedCodeSystem}
                  onChange={(e) => setSelectedCodeSystem(e.target.value)}
                  SelectProps={{ native: true }}
                >
                  <option value="all">All Code Systems</option>
                  {Object.values(allCodeSystems).map((codeSystem) => (
                    <option key={codeSystem.id} value={codeSystem.id}>
                      {codeSystem.name}
                    </option>
                  ))}
                </TextField>
              </Box>

              {/* Search Controls */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  label="Search concepts"
                  value={conceptSearchTerm}
                  onChange={(e) => setConceptSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleConceptSearch()}
                />
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={handleConceptSearch}
                  disabled={conceptLoading || !conceptSearchTerm.trim()}
                >
                  Search
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateConceptDialogOpen(true)}
                >
                  +
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    setConceptSearchTerm('')
                    setConceptResults([])
                  }}
                >
                  Clear
                </Button>
              </Box>

              {conceptError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {conceptError}
                </Alert>
              )}

              {conceptLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress />
                </Box>
              )}

              {!conceptLoading && conceptResults.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Concept Results ({conceptResults.length})
                  </Typography>
                  <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {conceptResults.map((concept, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={concept.display}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                Code: {concept.code} | System: {concept.system}
                              </Typography>
                              <Box sx={{ mt: 0.5 }}>
                                <Chip label={concept.dataType} size="small" sx={{ mr: 1 }} />
                                <Chip label={concept.conceptType} size="small" />
                              </Box>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Button size="small" onClick={() => handleSelectConcept(concept)}>
                            Select
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {!conceptLoading && conceptSearchTerm && conceptResults.length === 0 && (
                <Alert severity="info">No concepts found for "{conceptSearchTerm}"</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Code System List */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Code System List
              </Typography>

              {/* Search Controls */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  label="Search code systems"
                  value={codeSystemSearchTerm}
                  onChange={(e) => setCodeSystemSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCodeSystemSearch()}
                />
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={handleCodeSystemSearch}
                  disabled={codeSystemLoading || !codeSystemSearchTerm.trim()}
                >
                  Search
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateCodeSystemDialogOpen(true)}
                >
                  +
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    setCodeSystemSearchTerm('')
                    setCodeSystemResults([])
                  }}
                >
                  Clear
                </Button>
              </Box>

              {codeSystemError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {codeSystemError}
                </Alert>
              )}

              {codeSystemLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress />
                </Box>
              )}

              {!codeSystemLoading && codeSystemResults.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Code System Results ({codeSystemResults.length})
                  </Typography>
                  <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {codeSystemResults.map((codeSystem, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={codeSystem.name}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                ID: {codeSystem.id}
                              </Typography>
                              {codeSystem.description && (
                                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                  {codeSystem.description}
                                </Typography>
                              )}
                              <Box sx={{ mt: 0.5 }}>
                                <Chip
                                  label={`${codeSystem.concepts.length} concepts`}
                                  size="small"
                                />
                              </Box>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Button size="small" disabled>
                            View
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {!codeSystemLoading && codeSystemSearchTerm && codeSystemResults.length === 0 && (
                <Alert severity="info">No code systems found for "{codeSystemSearchTerm}"</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Concept Dialog */}
      <Dialog
        open={createConceptDialogOpen}
        onClose={handleCancelCreateConcept}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Concept</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Code"
            value={newConcept.code}
            onChange={(e) => setNewConcept((prev) => ({ ...prev, code: e.target.value }))}
            sx={{ mb: 2 }}
            required
          />

          <TextField
            fullWidth
            label="Display Name"
            value={newConcept.display}
            onChange={(e) => setNewConcept((prev) => ({ ...prev, display: e.target.value }))}
            sx={{ mb: 2 }}
            required
          />

          <TextField
            fullWidth
            label="System"
            value={newConcept.system}
            onChange={(e) => setNewConcept((prev) => ({ ...prev, system: e.target.value }))}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Data Type"
            value={newConcept.dataType}
            onChange={(e) => setNewConcept((prev) => ({ ...prev, dataType: e.target.value }))}
            sx={{ mb: 2 }}
            select
            SelectProps={{ native: true }}
          >
            <option value="string">String</option>
            <option value="integer">Integer</option>
            <option value="decimal">Decimal</option>
            <option value="boolean">Boolean</option>
            <option value="date">Date</option>
          </TextField>

          <TextField
            fullWidth
            label="Concept Type"
            value={newConcept.conceptType}
            onChange={(e) => setNewConcept((prev) => ({ ...prev, conceptType: e.target.value }))}
            sx={{ mb: 2 }}
            select
            SelectProps={{ native: true }}
          >
            <option value="custom">Custom</option>
            <option value="standard">Standard</option>
            <option value="local">Local</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelCreateConcept}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateConcept}
            disabled={!newConcept.code || !newConcept.display}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Code System Dialog */}
      <Dialog
        open={createCodeSystemDialogOpen}
        onClose={handleCancelCreateCodeSystem}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Code System</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={newCodeSystem.name}
            onChange={(e) => setNewCodeSystem((prev) => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
            required
          />

          <TextField
            fullWidth
            label="Description (optional)"
            value={newCodeSystem.description}
            onChange={(e) => setNewCodeSystem((prev) => ({ ...prev, description: e.target.value }))}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelCreateCodeSystem}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateCodeSystem}
            disabled={!newCodeSystem.name}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TerminologyServer
