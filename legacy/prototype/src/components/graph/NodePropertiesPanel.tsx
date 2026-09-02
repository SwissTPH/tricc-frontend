import React, { useState } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material'
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Language as LanguageIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import { Node } from 'reactflow'
import { TriccNodeType } from '../../types'

interface NodePropertiesPanelProps {
  node: Node | null
  onClose: () => void
  onConceptSelect: () => void
  onNodeUpdate: (nodeId: string, nodeData: any) => void
  onNodeDelete: (nodeId: string) => void
}

const NodePropertiesPanel: React.FC<NodePropertiesPanelProps> = ({
  node,
  onClose,
  onConceptSelect,
  onNodeUpdate,
  onNodeDelete,
}) => {
  const [nodeData, setNodeData] = useState(node?.data || {})

  React.useEffect(() => {
    if (node) {
      setNodeData(node.data)
    }
  }, [node])

  if (!node) {
    return (
      <Box sx={{ width: 400, p: 2 }}>
        <Typography>No node selected</Typography>
      </Box>
    )
  }

  const handleSave = () => {
    // Update node data
    onNodeUpdate(node.id, nodeData)
    onClose()
  }

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete the node "${nodeData.label || 'Unnamed'}"? This action cannot be undone.`,
      )
    ) {
      onNodeDelete(node.id)
      onClose()
    }
  }

  const handleFieldChange = (field: string, value: any) => {
    setNodeData((prev: Record<string, any>) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <Box sx={{ width: 400, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Node Properties</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Chip label={nodeData.nodeType || 'Unknown'} color="primary" size="small" sx={{ mt: 1 }} />
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {/* Concept - Always visible when present */}
        {nodeData.concept && (
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Selected Concept
              </Typography>
              <Button size="small" onClick={onConceptSelect}>
                Change
              </Button>
            </Box>
            <Box sx={{ p: 1, backgroundColor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>{nodeData.concept.display}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {nodeData.concept.code} | {nodeData.concept.system}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Basic Properties */}
        <Accordion defaultExpanded>
          <AccordionSummary>
            <Typography variant="subtitle1">Basic Properties</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {/* Label field only for sequence/control nodes, not data capture nodes */}
            {(() => {
              const dataCaptureTypes = [
                TriccNodeType.TEXT,
                TriccNodeType.DECIMAL,
                TriccNodeType.INTEGER,
                TriccNodeType.DATE,
                TriccNodeType.SELECT_ONE,
                TriccNodeType.SELECT_MULTIPLE,
                TriccNodeType.SELECT_YESNO,
                TriccNodeType.QUANTITY,
                TriccNodeType.INPUT,
              ]
              const isDataCaptureNode = dataCaptureTypes.includes(nodeData.nodeType)
              return !isDataCaptureNode ? (
                <TextField
                  fullWidth
                  label="Label"
                  value={nodeData.label || ''}
                  onChange={(e) => handleFieldChange('label', e.target.value)}
                  sx={{ mb: 2 }}
                />
              ) : null
            })()}

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Node Type</InputLabel>
              <Select
                value={nodeData.nodeType || ''}
                label="Node Type"
                onChange={(e) => handleFieldChange('nodeType', e.target.value)}
              >
                {Object.values(TriccNodeType).map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Concept selection button - only show if no concept is selected */}
            {!nodeData.concept && (
              <Button
                fullWidth
                variant="outlined"
                startIcon={<LanguageIcon />}
                onClick={onConceptSelect}
                sx={{ mb: 2 }}
              >
                Select Concept
              </Button>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Display Type */}
        <Accordion>
          <AccordionSummary>
            <Typography variant="subtitle1">Display Type</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {nodeData.displayType ? (
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Selected Display Type
                  </Typography>
                  <Button size="small" onClick={() => handleFieldChange('displayType', null)}>
                    Clear
                  </Button>
                </Box>
                <Box sx={{ p: 1, backgroundColor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>{nodeData.displayType.display}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {nodeData.displayType.code}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No display type selected
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Expression */}
        <Accordion>
          <AccordionSummary>
            <Typography variant="subtitle1">Expression</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Expression"
              value={nodeData.expression || ''}
              onChange={(e) => handleFieldChange('expression', e.target.value)}
              placeholder="Enter calculation expression..."
            />
          </AccordionDetails>
        </Accordion>

        {/* Applicability */}
        <Accordion>
          <AccordionSummary>
            <Typography variant="subtitle1">Applicability</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Applicability Condition"
              value={nodeData.applicability || ''}
              onChange={(e) => handleFieldChange('applicability', e.target.value)}
              placeholder="When should this node be shown?"
            />
          </AccordionDetails>
        </Accordion>

        {/* Default Value */}
        <Accordion>
          <AccordionSummary>
            <Typography variant="subtitle1">Default Value</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              fullWidth
              label="Default Value"
              value={nodeData.default || ''}
              onChange={(e) => handleFieldChange('default', e.target.value)}
              placeholder="Default value for this node"
            />
          </AccordionDetails>
        </Accordion>

        {/* Save Attribute */}
        <Accordion>
          <AccordionSummary>
            <Typography variant="subtitle1">Save Attribute</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Save Type</InputLabel>
              <Select
                value={nodeData.save?.split(':')[0] || ''}
                label="Save Type"
                onChange={(e) => {
                  const value = e.target.value
                  if (value) {
                    handleFieldChange('save', value)
                  } else {
                    handleFieldChange('save', '')
                  }
                }}
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="obs">Observation</MenuItem>
                <MenuItem value="diag">Diagnosis/Classification</MenuItem>
                <MenuItem value="flag">Flag/Calculate</MenuItem>
              </Select>
            </FormControl>
            {nodeData.save && nodeData.save.startsWith('obs') && (
              <TextField
                fullWidth
                label="Custom Observation Path"
                value={nodeData.save || ''}
                onChange={(e) => handleFieldChange('save', e.target.value)}
                placeholder="obs or obs.[name].[code]"
                helperText="Can be 'obs' or 'obs.[othername].[snomedCode]'"
              />
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Save creates a calculate node with name:{' '}
              {nodeData.save === 'obs'
                ? 'obs_[name]'
                : nodeData.save === 'diag'
                  ? 'diag_[name]'
                  : nodeData.save === 'flag'
                    ? 'is_[name]'
                    : ''}
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Process (for start nodes) */}
        {nodeData.nodeType === TriccNodeType.START && (
          <Accordion>
            <AccordionSummary>
              <Typography variant="subtitle1">CPG Common Process</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControl fullWidth>
                <InputLabel>Process</InputLabel>
                <Select
                  value={nodeData.process || ''}
                  label="Process"
                  onChange={(e) => handleFieldChange('process', e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="triage">Triage</MenuItem>
                  <MenuItem value="emergency-care">Emergency Care</MenuItem>
                  <MenuItem value="registration">Registration</MenuItem>
                  <MenuItem value="history-and-physical">History and Physical</MenuItem>
                  <MenuItem value="local-urgent-care">Local Urgent Care</MenuItem>
                  <MenuItem value="acute-tertiary-care">Acute Tertiary Care</MenuItem>
                  <MenuItem value="diagnostic-testing">Diagnostic Testing</MenuItem>
                  <MenuItem value="determine-diagnosis">Determine Diagnosis</MenuItem>
                  <MenuItem value="provide-counseling">Provide Counseling</MenuItem>
                  <MenuItem value="dispense-medications">Dispense Medications</MenuItem>
                  <MenuItem value="monitor-and-follow-up-of-patient">
                    Monitor and Follow-up
                  </MenuItem>
                  <MenuItem value="alerts-reminders-education">Alerts/Reminders/Education</MenuItem>
                  <MenuItem value="discharge-referral-of-patient">Discharge/Referral</MenuItem>
                  <MenuItem value="charge-for-service">Charge for Service</MenuItem>
                  <MenuItem value="record-and-report">Record and Report</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Defines execution order in CPG workflow
              </Typography>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Link (for goto, link_in, link_out nodes) */}
        {(nodeData.nodeType === TriccNodeType.GOTO ||
          nodeData.nodeType === TriccNodeType.LINK_IN ||
          nodeData.nodeType === TriccNodeType.LINK_OUT ||
          nodeData.nodeType === TriccNodeType.ACTIVITY) && (
          <Accordion>
            <AccordionSummary>
              <Typography variant="subtitle1">Activity Link</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TextField
                fullWidth
                label="Linked Activity"
                value={nodeData.link || ''}
                onChange={(e) => handleFieldChange('link', e.target.value)}
                placeholder="Activity ID or reference"
                helperText="Reference to another activity in the project"
              />
            </AccordionDetails>
          </Accordion>
        )}

        {/* Expression Inputs */}
        <Accordion>
          <AccordionSummary>
            <Typography variant="subtitle1">Expression Inputs</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Additional Expression Inputs"
              value={nodeData.expressionInputs || ''}
              onChange={(e) => handleFieldChange('expressionInputs', e.target.value)}
              placeholder="Additional inputs for expression calculation"
              helperText="Adds calculate nodes to those deduced by inputs"
            />
          </AccordionDetails>
        </Accordion>

        {/* Options for select nodes */}
        {(nodeData.nodeType === TriccNodeType.SELECT_ONE ||
          nodeData.nodeType === TriccNodeType.SELECT_MULTIPLE) && (
          <Accordion>
            <AccordionSummary>
              <Typography variant="subtitle1">Options</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 2 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<LanguageIcon />}
                  onClick={onConceptSelect}
                >
                  {nodeData.concept ? 'Add Concept as Option' : 'Select Main Concept First'}
                </Button>
                {!nodeData.concept && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: 'block' }}
                  >
                    Select a main concept for this node first, then add options.
                  </Typography>
                )}
              </Box>

              {nodeData.options && nodeData.options.length > 0 ? (
                <List>
                  {nodeData.options.map((option: any, index: number) => (
                    <ListItem
                      key={index}
                      sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2">
                            <strong>{option.display || option.label || option.code}</strong>
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {option.code} | {option.system}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => {
                            const newOptions = nodeData.options.filter(
                              (_: any, i: number) => i !== index,
                            )
                            handleFieldChange('options', newOptions)
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {nodeData.concept
                    ? 'No options defined. Select concepts from the terminology server to define the selectable values for this node.'
                    : 'Select a main concept first, then add options for this select node.'}
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteIcon fontSize="small" />}
            onClick={handleDelete}
            sx={{ flex: '0 0 auto', minWidth: 'auto', px: 1 }}
          >
            Delete
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            sx={{ flex: 1 }}
          >
            Save Changes
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export { NodePropertiesPanel }
