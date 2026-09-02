import { useState, useCallback, useRef, useEffect } from 'react'
import { Node, Edge } from 'reactflow'
import { UndoManager, useUndoKeyboard } from '../utils/undoManager'

export interface ActivityState {
  nodes: Node[]
  edges: Edge[]
}

export const useActivityUndo = (
  nodes: Node[],
  edges: Edge[],
  onUndoRedo: (state: ActivityState) => void,
  enabled: boolean = true,
) => {
  const undoManagerRef = useRef<UndoManager<ActivityState>>()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Initialize undo manager
  useEffect(() => {
    undoManagerRef.current = new UndoManager<ActivityState>(50, onUndoRedo)

    // Record initial state
    undoManagerRef.current.initialize({ nodes, edges })

    // Update undo/redo availability
    const updateAvailability = () => {
      setCanUndo(undoManagerRef.current!.canUndo())
      setCanRedo(undoManagerRef.current!.canRedo())
    }

    updateAvailability()

    // Set up interval to check availability (since UndoManager doesn't expose events)
    const interval = setInterval(updateAvailability, 100)

    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update internal state when props change - only when data actually changes
  const nodesString = JSON.stringify(nodes)
  const edgesString = JSON.stringify(edges)
  useEffect(() => {
    if (undoManagerRef.current) {
      undoManagerRef.current.initialize({ nodes, edges })
    }
  }, [nodesString, edgesString]) // eslint-disable-line react-hooks/exhaustive-deps

  // Record state changes with debouncing
  const recordTimeoutRef = useRef<NodeJS.Timeout>()
  const recordStateChange = useCallback(() => {
    if (!undoManagerRef.current) return

    // Clear existing timeout
    if (recordTimeoutRef.current) {
      clearTimeout(recordTimeoutRef.current)
    }

    // Debounce recording to avoid too many history entries for rapid changes
    recordTimeoutRef.current = setTimeout(() => {
      undoManagerRef.current!.recordState({ nodes, edges })
    }, 300)
  }, [nodes, edges])

  // Undo operation
  const undo = useCallback(() => {
    if (undoManagerRef.current) {
      undoManagerRef.current.undo()
    }
  }, [])

  // Redo operation
  const redo = useCallback(() => {
    if (undoManagerRef.current) {
      undoManagerRef.current.redo()
    }
  }, [])

  // Set up keyboard shortcuts
  useUndoKeyboard(undoManagerRef.current!, enabled)

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    recordStateChange,
  }
}
