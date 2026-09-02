import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Help as HelpIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'

interface EdgeLogicEditorProps {
  open: boolean
  edge: any
  onClose: () => void
  onSave: (logic: string, weight?: number, label?: string, conditionType?: string) => void
  onDelete?: () => void
}

const EdgeLogicEditor: React.FC<EdgeLogicEditorProps> = ({
  open,
  edge,
  onClose,
  onSave,
  onDelete,
}) => {
  const [logic, setLogic] = useState(edge?.data?.logic || '')
  const [weight, setWeight] = useState(edge?.data?.weight || '')
  const [label, setLabel] = useState(edge?.data?.label || '')

  React.useEffect(() => {
    if (edge) {
      setLogic(edge.data?.logic || '')
      setWeight(edge.data?.weight || '')
      setLabel(edge.data?.label || '')
    }
  }, [edge])

  const handleSave = () => {
    onSave(logic, weight ? Number(weight) : undefined, label || undefined)
    onClose()
  }

  const predefinedLogic = [
    'Yes',
    'No',
    'Continue',
    'Skip',
    'Required',
    'Optional',
    'AND',
    'OR',
    'NOT',
    '>',
    '<',
    '>=',
    '<=',
    '==',
    '!=',
  ]

  const handleLogicSelect = (selectedLogic: string) => {
    setLogic((prev: string) => (prev ? `${prev} ${selectedLogic}` : selectedLogic))
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Edit Edge Logic</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Define the logic that controls when this edge is traversed
          </Typography>
        </Box>

        {/* Logic Expression */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Logic Expression"
            multiline
            rows={3}
            value={logic}
            onChange={(e) => setLogic(e.target.value)}
            placeholder="Enter logic expression (e.g., age > 18 AND gender == 'male')"
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ alignSelf: 'center', mr: 1 }}
            >
              Quick insert:
            </Typography>
            {predefinedLogic.map((item) => (
              <Chip
                key={item}
                label={item}
                size="small"
                onClick={() => handleLogicSelect(item)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>

        {/* Weight */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Weight (optional)"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Enter numeric weight for this edge"
            helperText="Higher weights make the edge thicker and more prominent"
          />
        </Box>

        {/* Label */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Edge Label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Enter a label to display on the edge"
          />
        </Box>

        {/* Logic Examples */}
        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Logic Examples:
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <li>
                <code>age {'>'} 18</code> - Age greater than 18
              </li>
              <li>
                <code>gender == 'male'</code> - Gender equals male
              </li>
              <li>
                <code>temperature {'>'} 37.5 AND symptoms == 'fever'</code> - Complex condition
              </li>
              <li>
                <code>Yes</code> - Simple yes condition
              </li>
              <li>
                <code>No</code> - Simple no condition
              </li>
            </Box>
          </Typography>
        </Box>

        {/* Help */}
        <Box sx={{ mt: 2 }}>
          <Tooltip title="Logic expressions support basic operators: ==, !=, >, <, >=, <=, AND, OR, NOT">
            <IconButton size="small">
              <HelpIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            Hover for help with operators
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button color="error" startIcon={<DeleteIcon />} onClick={onDelete}>
          Delete Edge
        </Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
          Save Logic
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export { EdgeLogicEditor }
