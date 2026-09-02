import { Handle, Position } from 'reactflow'
import { Box, Typography, Divider } from '@mui/material'
import { BaseNode } from './BaseNode'
import { getNodeColor } from './utils/getNodeColor'
import { getNodeIcon } from './utils/getNodeIcon'
import type { NodeProps } from 'reactflow'
import type { CustomNodeData } from '../../types'

export default function SelectNode(nodeProps: NodeProps<CustomNodeData>) {
  const { data } = nodeProps
  const color = getNodeColor(data.nodeType)
  const icon = getNodeIcon(data.nodeType)

  return (
    <BaseNode {...nodeProps} color={color} icon={icon}>
      {data.options?.map((opt, i) => {
        const val = opt.code ?? `opt-${i}`
        const isLast = i === (data.options?.length ?? 0) - 1

        return (
          <>
            <Box
              key={val}
              sx={{
                position: 'relative',
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: '100%',
              }}
            >
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                {opt.display ?? opt.code}
              </Typography>
              <Handle
                type="source"
                position={Position.Right}
                id={`option-${val}`}
                style={{
                  background: color,
                  width: 7,
                  height: 7,
                  right: -16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  borderRadius: 0,
                }}
              />
            </Box>
            {!isLast && <Divider key={`sep-${i}`} sx={{ my: 0.25, width: '100%' }} />}
          </>
        )
      })}
    </BaseNode>
  )
}
