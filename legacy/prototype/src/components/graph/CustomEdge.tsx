import React from 'react'
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow'
import { Box, Typography, IconButton, Tooltip } from '@mui/material'
import { Edit as EditIcon } from '@mui/icons-material'

const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  sourceHandleId,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const hasLogic = data?.logic && data.logic.trim() !== ''
  const hasWeight = data?.weight !== undefined && data.weight !== null
  const hasLabel = data?.label && data.label.trim() !== ''
  const isOptionEdge = sourceHandleId && sourceHandleId.startsWith('option_')
  const conditionType = data?.conditionType || 'CQL'

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: isOptionEdge ? '#9c27b0' : hasLogic ? '#ff9800' : '#b1b1b7',
          strokeWidth: hasWeight ? Math.max(1, data.weight / 10) : 2,
          ...style,
        }}
      />
      <EdgeLabelRenderer>
        <Box
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
        >
          {(hasLogic || hasWeight || hasLabel || isOptionEdge) && (
            <Box
              sx={{
                backgroundColor: 'white',
                border: `2px solid ${isOptionEdge ? '#9c27b0' : '#b1b1b7'}`,
                borderRadius: 1,
                p: 0.5,
                minWidth: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                boxShadow: 1,
              }}
            >
              {isOptionEdge && (
                <Tooltip title={`CQL Condition: ${data.logic || '$this = option_code'}`}>
                  <Typography
                    variant="caption"
                    sx={{
                      backgroundColor: '#9c27b0',
                      color: 'white',
                      px: 0.5,
                      borderRadius: 0.5,
                      fontSize: '0.7rem',
                    }}
                  >
                    {conditionType}
                  </Typography>
                </Tooltip>
              )}

              {hasLogic && !isOptionEdge && (
                <Tooltip title={`Logic: ${data.logic} (${conditionType})`}>
                  <Typography
                    variant="caption"
                    sx={{
                      backgroundColor: '#ff9800',
                      color: 'white',
                      px: 0.5,
                      borderRadius: 0.5,
                      fontSize: '0.7rem',
                    }}
                  >
                    L
                  </Typography>
                </Tooltip>
              )}

              {hasWeight && (
                <Tooltip title={`Weight: ${data.weight}`}>
                  <Typography
                    variant="caption"
                    sx={{
                      backgroundColor: '#2196f3',
                      color: 'white',
                      px: 0.5,
                      borderRadius: 0.5,
                      fontSize: '0.7rem',
                    }}
                  >
                    {data.weight}
                  </Typography>
                </Tooltip>
              )}

              {hasLabel && (
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.7rem',
                    color: 'text.secondary',
                  }}
                >
                  {data.label}
                </Typography>
              )}

              <Tooltip title="Edit Edge Logic">
                <IconButton size="small" sx={{ p: 0.25 }}>
                  <EditIcon sx={{ fontSize: '0.8rem' }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </EdgeLabelRenderer>
    </>
  )
}

export { CustomEdge }
