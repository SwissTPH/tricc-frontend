import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Chip,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material'
import { Search as SearchIcon, Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material'
import { Concept } from '../../types'
import { useProject } from '../../hooks/useProject'

interface ConceptSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (concept: Concept) => void
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`concept-tabpanel-${index}`}
      aria-labelledby={`concept-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const ConceptSelector: React.FC<ConceptSelectorProps> = ({ open, onClose, onSelect }) => {
  const { getAllConcepts, getCodeSystems, addConceptToCodeSystem, createCodeSystem } = useProject()
  const [tabValue, setTabValue] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for creating concepts
  const [newConceptForm, setNewConceptForm] = useState({
    code: '',
    codeSystemId: '',
    display: '',
    dataType: '',
    conceptType: '',
  })

  // Form state for creating code systems
  const [newCodeSystemForm, setNewCodeSystemForm] = useState({
    name: '',
    description: '',
  })

  const codeSystems = getCodeSystems()
  const allConcepts = getAllConcepts()

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setNewConceptForm({
        code: '',
        codeSystemId: Object.keys(codeSystems)[0] || '',
        display: '',
        dataType: '',
        conceptType: '',
      })
      setNewCodeSystemForm({
        name: '',
        description: '',
      })
      setSelectedConcept(null)
      setSearchTerm('')
    }
  }, [open, codeSystems])

  const handleSearch = () => {
    setLoading(true)
    setError(null)

    try {
      // No API call needed - concepts are already loaded from project
      setLoading(false)
    } catch (err) {
      setError('Failed to search concepts')
      setLoading(false)
    }
  }

  const handleCreateConcept = () => {
    if (
      !newConceptForm.code ||
      !newConceptForm.codeSystemId ||
      !newConceptForm.display ||
      !newConceptForm.dataType ||
      !newConceptForm.conceptType
    ) {
      setError('Please fill in all required fields')
      return
    }

    const newConcept: Concept = {
      code: newConceptForm.code,
      system: newConceptForm.codeSystemId,
      display: newConceptForm.display,
      dataType: newConceptForm.dataType,
      conceptType: newConceptForm.conceptType,
    }

    addConceptToCodeSystem(newConceptForm.codeSystemId, newConcept)
    setSelectedConcept(newConcept)
    setTabValue(0) // Switch to search tab
    setError(null)
  }

  const handleCreateCodeSystem = () => {
    if (!newCodeSystemForm.name.trim()) {
      setError('Code system name is required')
      return
    }

    const newId = createCodeSystem({
      name: newCodeSystemForm.name,
      description: newCodeSystemForm.description,
    })

    if (newId) {
      setNewConceptForm((prev) => ({ ...prev, codeSystemId: newId }))
      setNewCodeSystemForm({ name: '', description: '' })
      setError(null)
    }
  }

  const handleSelect = () => {
    if (selectedConcept) {
      onSelect(selectedConcept)
    }
  }

  const filteredConcepts = allConcepts.filter(
    (concept) =>
      concept.display.toLowerCase().includes(searchTerm.toLowerCase()) ||
      concept.code.includes(searchTerm),
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Select Concept</Typography>
          <Box>
            <IconButton onClick={() => setSearchTerm('')}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Search Concepts" />
            <Tab label="Create New Concept" />
            <Tab label="Create Code System" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label="Search concepts"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={handleSearch}
                disabled={loading}
              >
                Search
              </Button>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress />
              </Box>
            )}

            {!loading && (
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {filteredConcepts.map((concept) => (
                  <ListItem key={`${concept.system}|${concept.code}`}>
                    <ListItemButton
                      selected={selectedConcept?.code === concept.code}
                      onClick={() => setSelectedConcept(concept)}
                    >
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
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Create a new concept for your terminology server
            </Typography>

            <TextField
              fullWidth
              label="Concept Code"
              placeholder="e.g., BP_MEASUREMENT"
              value={newConceptForm.code}
              onChange={(e) => setNewConceptForm((prev) => ({ ...prev, code: e.target.value }))}
            />

            <FormControl fullWidth>
              <InputLabel>Code System</InputLabel>
              <Select
                label="Code System"
                value={newConceptForm.codeSystemId}
                onChange={(e) =>
                  setNewConceptForm((prev) => ({ ...prev, codeSystemId: e.target.value }))
                }
              >
                {Object.values(codeSystems).map((cs) => (
                  <MenuItem key={cs.id} value={cs.id}>
                    {cs.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Display Label"
              placeholder="e.g., Blood Pressure Measurement"
              value={newConceptForm.display}
              onChange={(e) => setNewConceptForm((prev) => ({ ...prev, display: e.target.value }))}
            />

            <FormControl fullWidth>
              <InputLabel>Data Type</InputLabel>
              <Select
                label="Data Type"
                value={newConceptForm.dataType}
                onChange={(e) =>
                  setNewConceptForm((prev) => ({ ...prev, dataType: e.target.value }))
                }
              >
                <MenuItem value="String">String</MenuItem>
                <MenuItem value="Integer">Integer</MenuItem>
                <MenuItem value="Decimal">Decimal</MenuItem>
                <MenuItem value="Boolean">Boolean</MenuItem>
                <MenuItem value="Date">Date</MenuItem>
                <MenuItem value="Quantity">Quantity</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Concept Type</InputLabel>
              <Select
                label="Concept Type"
                value={newConceptForm.conceptType}
                onChange={(e) =>
                  setNewConceptForm((prev) => ({ ...prev, conceptType: e.target.value }))
                }
              >
                <MenuItem value="Observation">Observation</MenuItem>
                <MenuItem value="Patient">Patient</MenuItem>
                <MenuItem value="Procedure">Procedure</MenuItem>
                <MenuItem value="Medication">Medication</MenuItem>
                <MenuItem value="Condition">Condition</MenuItem>
              </Select>
            </FormControl>

            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleCreateConcept}>
              Create Concept
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Create a new code system for organizing your concepts
            </Typography>

            <TextField
              fullWidth
              label="Code System Name"
              placeholder="e.g., My Custom Terminology"
              value={newCodeSystemForm.name}
              onChange={(e) => setNewCodeSystemForm((prev) => ({ ...prev, name: e.target.value }))}
            />

            <TextField
              fullWidth
              label="Description (optional)"
              placeholder="Brief description of this code system"
              value={newCodeSystemForm.description}
              onChange={(e) =>
                setNewCodeSystemForm((prev) => ({ ...prev, description: e.target.value }))
              }
              multiline
              rows={2}
            />

            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleCreateCodeSystem}>
              Create Code System
            </Button>
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSelect} disabled={!selectedConcept}>
          Select Concept
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export { ConceptSelector }
