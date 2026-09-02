import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Drawer,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material'
import {
  Add as AddIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FitScreen as FitScreenIcon,
  PlayArrow as PlayIcon,
  Clear as ClearIcon,
} from '@mui/icons-material'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  Controls,
  Background,
  MiniMap,
  EdgeTypes,
  MarkerType,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../hooks/useProject'
import { useActivityUndo } from '../hooks/useActivityUndo'
import { TriccNodeType } from '../types'
import { nodeTypes } from '../components/flow-nodes'
import { CustomEdge } from '../components/graph/CustomEdge'
import { NodePropertiesPanel } from '../components/graph/NodePropertiesPanel'
import { EdgeLogicEditor } from '../components/graph/EdgeLogicEditor'
import { ConceptSelector } from '../components/concept/ConceptSelector'

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
}

const ActivityEditor: React.FC = () => {
  const { activityId } = useParams<{ activityId: string }>()
  const navigate = useNavigate()
  const { activities, updateActivity } = useProject()

  const activity = activities[activityId || '']

  // Use ReactFlow's built-in state management with our undo system
  const [nodes, setNodes] = useNodesState([])
  const [edges, setEdges] = useEdgesState([])
  const { canUndo, canRedo, undo, redo, recordStateChange } = useActivityUndo(
    nodes,
    edges,
    (state) => {
      setNodes(state.nodes)
      setEdges(state.edges)
    },
  )

  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(false)
  const [edgeEditorOpen, setEdgeEditorOpen] = useState(false)
  const [conceptSelectorOpen, setConceptSelectorOpen] = useState(false)
  const [nodeTypeSelectorOpen, setNodeTypeSelectorOpen] = useState(false)

  // Update selectedNode when nodes change to keep it in sync
  useEffect(() => {
    if (selectedNode) {
      const updatedNode = nodes.find((node) => node.id === selectedNode.id)
      if (updatedNode && updatedNode !== selectedNode) {
        setSelectedNode(updatedNode)
      }
    }
  }, [nodes, selectedNode])

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedDataRef = useRef<string>('')

  // Auto-save interval (5 seconds)
  const AUTO_SAVE_INTERVAL = 5000

  // Convert activity data to ReactFlow format
  useMemo(() => {
    if (activity) {
      const flowNodes: Node[] = activity.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          ...node.data,
          nodeType: node.type,
          concept: node.concept,
          displayType: node.displayType,
          options: node.data.options,
        },
      }))

      const flowEdges: Edge[] = activity.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'custom',
        data: {
          logic: edge.logic,
          weight: edge.weight,
          label: edge.label,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }))

      setNodes(flowNodes)
      setEdges(flowEdges)

      // Initialize last saved data reference
      const initialData = JSON.stringify({ nodes: flowNodes, edges: flowEdges })
      lastSavedDataRef.current = initialData
      setSaveStatus('saved')
      setHasUnsavedChanges(false)
    }
  }, [activity, setNodes, setEdges])

  // Auto-save effect: monitor changes and trigger saves
  useEffect(() => {
    if (!activity) return

    const currentData = JSON.stringify({ nodes, edges })
    const hasChanges = currentData !== lastSavedDataRef.current

    if (hasChanges && !hasUnsavedChanges) {
      setHasUnsavedChanges(true)
      setSaveStatus('unsaved')
    }

    if (hasChanges) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Set new timeout for auto-save
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('saving')

        const updatedActivity = {
          ...activity,
          nodes: nodes.map((node) => ({
            id: node.id,
            type: node.data.nodeType,
            position: node.position,
            concept: node.data.concept,
            displayType: node.data.displayType,
            data: {
              label: node.data.label,
              expression: node.data.expression,
              applicability: node.data.applicability,
              default: node.data.default,
              attributes: node.data.attributes || {},
              options: node.data.options,
            },
          })),
          edges: edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            logic: edge.data?.logic,
            weight: edge.data?.weight,
            label: edge.data?.label,
          })),
        }

        updateActivity(activityId!, updatedActivity)

        // Update saved state
        lastSavedDataRef.current = currentData
        setSaveStatus('saved')
        setHasUnsavedChanges(false)
      }, AUTO_SAVE_INTERVAL)
    }

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [nodes, edges, activity, activityId, updateActivity, hasUnsavedChanges])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const onConnect = useCallback(
    (params: Connection) => {
      let logic = ''
      let conditionType = 'CQL'

      // Auto-generate CQL condition for option connections
      if (params.sourceHandle && params.sourceHandle.startsWith('option_')) {
        const optionCode = params.sourceHandle.replace('option_', '')
        logic = `$this = '${optionCode}'`
      }

      const newEdge = {
        id: `edge-${Date.now()}`,
        source: params.source!,
        target: params.target!,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        type: 'custom',
        data: {
          logic,
          conditionType,
          weight: undefined,
          label: '',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }
      setEdges((eds) => addEdge(newEdge, eds))
      recordStateChange()
    },
    [setEdges, recordStateChange],
  )

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        const newNodes = applyNodeChanges(changes, nds)
        const isDragging = changes.some((change) => change.type === 'position' && change.dragging)
        if (!isDragging) {
          recordStateChange()
        }
        return newNodes
      })
    },
    [setNodes, recordStateChange],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const newEdges = applyEdgeChanges(changes, eds)
        recordStateChange()
        return newEdges
      })
    },
    [setEdges, recordStateChange],
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setPropertiesPanelOpen(true)
  }, [])

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge)
    setEdgeEditorOpen(true)
  }, [])

  const handleAddNode = (nodeType: TriccNodeType) => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: nodeType,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        label: `New ${nodeType}`,
        nodeType,
        concept: undefined,
        displayType: undefined,
      },
    }
    setNodes((nds) => [...nds, newNode])
    recordStateChange()
    setNodeTypeSelectorOpen(false)
  }

  const handleSave = () => {
    if (activity) {
      const updatedActivity = {
        ...activity,
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.data.nodeType,
          position: node.position,
          concept: node.data.concept,
          displayType: node.data.displayType,
          data: {
            label: node.data.label,
            expression: node.data.expression,
            applicability: node.data.applicability,
            default: node.data.default,
            attributes: node.data.attributes || {},
            options: node.data.options,
          },
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          logic: edge.data?.logic,
          weight: edge.data?.weight,
          label: edge.data?.label,
        })),
      }
      updateActivity(activityId!, updatedActivity)

      // Update saved state (same as auto-save)
      const currentData = JSON.stringify({ nodes, edges })
      lastSavedDataRef.current = currentData
      setSaveStatus('saved')
      setHasUnsavedChanges(false)
    }
  }

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      // Remove the node
      setNodes((nds) => nds.filter((node) => node.id !== nodeId))
      // Remove any edges connected to the deleted node
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
      recordStateChange()
      // Clear selection if the deleted node was selected
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null)
      }
    },
    [setNodes, setEdges, recordStateChange, selectedNode],
  )

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((edge) => edge.id !== edgeId))
      recordStateChange()
      setSelectedEdge(null)
      setEdgeEditorOpen(false)
    },
    [setEdges, recordStateChange],
  )

  // Keyboard event handler for Delete key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Delete' && selectedNode) {
        event.preventDefault()
        handleDeleteNode(selectedNode.id)
      }
    },
    [selectedNode, handleDeleteNode],
  )

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  // Organize node types by category
  const nodeTypeCategories = {
    'Flow Control': [
      TriccNodeType.START,
      TriccNodeType.ACTIVITY_START,
      TriccNodeType.END,
      TriccNodeType.ACTIVITY_END,
      TriccNodeType.GOTO,
      TriccNodeType.LINK_IN,
      TriccNodeType.LINK_OUT,
      TriccNodeType.ACTIVITY,
      TriccNodeType.BRIDGE,
      TriccNodeType.WAIT,
    ],
    'Input Fields': [
      TriccNodeType.TEXT,
      TriccNodeType.INTEGER,
      TriccNodeType.DECIMAL,
      TriccNodeType.DATE,
      TriccNodeType.SELECT_ONE,
      TriccNodeType.SELECT_MULTIPLE,
      TriccNodeType.SELECT_YESNO,
      TriccNodeType.QUANTITY,
      TriccNodeType.INPUT,
    ],
    'Logic & Computation': [
      TriccNodeType.CALCULATE,
      TriccNodeType.RHOMBUS,
      TriccNodeType.EXCLUSIVE,
      TriccNodeType.OPERATION,
      TriccNodeType.COUNT,
      TriccNodeType.ADD,
    ],
    Information: [
      TriccNodeType.NOTE,
      TriccNodeType.OUTPUT,
      TriccNodeType.HELP,
      TriccNodeType.HINT,
      TriccNodeType.PAGE,
    ],
    Clinical: [TriccNodeType.DIAGNOSIS, TriccNodeType.PROPOSED_DIAGNOSIS, TriccNodeType.CONTEXT],
    Other: [TriccNodeType.EDGE, TriccNodeType.NOT_AVAILABLE],
  }

  if (!activity) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">Activity not found</Typography>
        <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
      </Box>
    )
  }

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Main Graph Area */}
      <Box sx={{ flexGrow: 1, position: 'relative', height: '100%', minHeight: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onSelectionChange={(params) => {
            setSelectedNode(params.nodes[0] || null)
          }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          selectNodesOnDrag={false}
          fitView
          style={{ height: '100%' }}
        >
          <Controls />
          <MiniMap />
          <Background />
        </ReactFlow>

        {/* Toolbar */}
        <Paper
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            p: 1,
            display: 'flex',
            gap: 1,
            flexDirection: 'column',
          }}
        >
          <Tooltip title="Add Node">
            <IconButton onClick={() => setNodeTypeSelectorOpen(true)}>
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={
              saveStatus === 'saved'
                ? 'All changes saved'
                : saveStatus === 'saving'
                  ? 'Saving...'
                  : 'Unsaved changes - click to save now'
            }
          >
            <IconButton
              onClick={handleSave}
              color={saveStatus === 'unsaved' ? 'warning' : 'default'}
              disabled={saveStatus === 'saving'}
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={canUndo ? 'Undo last action (Ctrl+Z)' : 'No actions to undo'}>
            <span>
              <IconButton onClick={undo} disabled={!canUndo}>
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={canRedo ? 'Redo last undone action (Ctrl+Y)' : 'No actions to redo'}>
            <span>
              <IconButton onClick={redo} disabled={!canRedo}>
                <RedoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Clear Selection">
            <IconButton
              onClick={() => setNodes((nds) => nds.map((n) => ({ ...n, selected: false })))}
            >
              <ClearIcon />
            </IconButton>
          </Tooltip>
          <Divider />
          <Tooltip title="Zoom In">
            <IconButton>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Fit to Screen">
            <IconButton>
              <FitScreenIcon />
            </IconButton>
          </Tooltip>
          <Divider />
          <Tooltip title="Test Activity">
            <span>
              <IconButton disabled>
                <PlayIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Paper>

        {/* Activity Info */}
        <Paper
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            p: 2,
            minWidth: 200,
          }}
        >
          <Typography variant="h6" gutterBottom>
            {activity.name}
          </Typography>
          <Chip
            label={activity.type}
            color={activity.type === 'segment' ? 'secondary' : 'primary'}
            size="small"
            sx={{ mb: 1 }}
          />
          {activity.type === 'segment' && activity.trigger && (
            <Typography variant="body2" color="text.secondary">
              Trigger: {activity.trigger}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            Nodes: {nodes.length} | Edges: {edges.length}
          </Typography>
        </Paper>
      </Box>

      {/* Node Properties Panel */}
      <Drawer
        anchor="right"
        open={propertiesPanelOpen}
        onClose={() => setPropertiesPanelOpen(false)}
        sx={{ width: 400 }}
      >
        <NodePropertiesPanel
          node={selectedNode}
          onClose={() => setPropertiesPanelOpen(false)}
          onConceptSelect={() => setConceptSelectorOpen(true)}
          onNodeUpdate={(nodeId, nodeData) => {
            setNodes((nds) =>
              nds.map((node) => (node.id === nodeId ? { ...node, data: nodeData } : node)),
            )
            recordStateChange()
          }}
          onNodeDelete={handleDeleteNode}
        />
      </Drawer>

      {/* Node Type Selector Dialog */}
      <Dialog
        open={nodeTypeSelectorOpen}
        onClose={() => setNodeTypeSelectorOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '80vh' },
        }}
      >
        <DialogTitle>Select Node Type</DialogTitle>
        <DialogContent>
          {Object.entries(nodeTypeCategories).map(([category, types]) => (
            <Box key={category} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 600 }}>
                {category}
              </Typography>
              <Grid container spacing={1}>
                {types.map((nodeType) => (
                  <Grid item xs={6} sm={4} md={3} key={nodeType}>
                    <Button
                      variant="outlined"
                      onClick={() => handleAddNode(nodeType)}
                      fullWidth
                      sx={{
                        textTransform: 'none',
                        justifyContent: 'flex-start',
                        py: 1,
                      }}
                    >
                      {nodeType}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNodeTypeSelectorOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Concept Selector Dialog */}
      <ConceptSelector
        open={conceptSelectorOpen}
        onClose={() => setConceptSelectorOpen(false)}
        onSelect={(concept) => {
          if (selectedNode) {
            // Check if this is for options or node concept
            const isSelectNode =
              selectedNode.data.nodeType === TriccNodeType.SELECT_ONE ||
              selectedNode.data.nodeType === TriccNodeType.SELECT_MULTIPLE

            if (isSelectNode && !selectedNode.data.concept) {
              // For select nodes without a main concept, first assign the concept to the node
              setNodes((nds) =>
                nds.map((node) =>
                  node.id === selectedNode.id
                    ? {
                        ...node,
                        data: {
                          ...node.data,
                          concept,
                        },
                      }
                    : node,
                ),
              )
            } else if (isSelectNode && selectedNode.data.concept) {
              // For select nodes that already have a concept, add as an option
              const currentOptions = selectedNode.data.options || []
              const newOption = {
                code: concept.code,
                display: concept.display,
                system: concept.system,
                label: concept.display,
                value: concept.code,
              }
              setNodes((nds) =>
                nds.map((node) =>
                  node.id === selectedNode.id
                    ? {
                        ...node,
                        data: {
                          ...node.data,
                          options: [...currentOptions, newOption],
                        },
                      }
                    : node,
                ),
              )
            } else {
              // For non-select nodes, set as node concept
              setNodes((nds) =>
                nds.map((node) =>
                  node.id === selectedNode.id
                    ? {
                        ...node,
                        data: {
                          ...node.data,
                          concept,
                        },
                      }
                    : node,
                ),
              )
            }
            recordStateChange()
          }
          setConceptSelectorOpen(false)
        }}
      />

      {/* Edge Logic Editor */}
      <EdgeLogicEditor
        open={edgeEditorOpen}
        edge={selectedEdge}
        onClose={() => setEdgeEditorOpen(false)}
        onSave={(logic, weight, label, conditionType) => {
          if (selectedEdge) {
            setEdges((eds) =>
              eds.map((edge) =>
                edge.id === selectedEdge.id
                  ? {
                      ...edge,
                      data: {
                        ...edge.data,
                        logic,
                        weight,
                        label,
                        conditionType: conditionType || edge.data?.conditionType || 'CQL',
                      },
                    }
                  : edge,
              ),
            )
            recordStateChange()
          }
          setEdgeEditorOpen(false)
        }}
        onDelete={() => handleDeleteEdge(selectedEdge?.id || '')}
      />
    </Box>
  )
}

export default ActivityEditor
