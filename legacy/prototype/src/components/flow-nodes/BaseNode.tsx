import { Handle, Position, NodeProps } from 'reactflow'
import { Paper, Box, Typography, Chip } from '@mui/material'
import { TriccNodeType } from '../../types'

type BaseNodeProps = NodeProps & {
  children?: React.ReactNode
  color: string
  icon: JSX.Element
  showTopHandle?: boolean
  showBottomHandle?: boolean
}

export function BaseNode({
  data,
  selected,
  children,
  color,
  icon,
  showTopHandle = true,
  showBottomHandle = true,
  ...nodeProps
}: BaseNodeProps) {
  const { label, nodeType, concept } = data

  // Determine display text: use concept display if available and not a sequence node
  const isSequenceNode = ['start', 'end', 'activity_start', 'activity_end'].includes(nodeType)
  const displayText = !isSequenceNode && concept?.display ? concept.display : label

  // Central handle styles
  const targetHandleStyle = {
    background: color,
    width: 8,
    height: 8,
    left: -4,
    top: '50%',
    transform: 'translateY(-50%)',
    borderRadius: '50%',
  }
  const sourceHandleStyle = {
    background: color,
    width: 8,
    height: 8,
    right: -4,
    top: '25%',
    transform: 'translateY(-50%)',
    borderRadius: 0,
  }

  return (
    <Paper
      elevation={selected ? 8 : 2}
      sx={{
        minWidth: 140,
        p: 1.5,
        border: `2px solid ${color}`,
        borderRadius: 2,
        bgcolor: selected ? `${color}10` : 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
      }}
    >
      {!showTopHandle ? null : (
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: color, width: 8, height: 8, borderRadius: '50%' }}
        />
      )}

      {nodeType !== 'start' && (
        <Handle type="target" position={Position.Left} id="left" style={targetHandleStyle} />
      )}

      {nodeType !== TriccNodeType.SELECT_ONE && nodeType !== TriccNodeType.SELECT_MULTIPLE && (
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          style={{ background: color, width: 8, height: 8, borderRadius: 0 }}
        />
      )}

      <Box sx={{ color, fontSize: '1.4rem' }}>{icon}</Box>

      <Typography variant="body2" fontWeight="bold" fontSize="0.8rem" textAlign="center">
        {displayText}
      </Typography>

      <Chip
        label={nodeType}
        size="small"
        sx={{ fontSize: '0.65rem', height: 18, bgcolor: color, color: 'white' }}
      />

      {children}

      {!showBottomHandle ? null : (
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{ background: color, width: 8, height: 8, borderRadius: 0 }}
        />
      )}
    </Paper>
  )
}
