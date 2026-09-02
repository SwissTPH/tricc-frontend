import { useState, useCallback, useRef, useEffect } from 'react'
import { UndoManager, useUndoKeyboard } from '../utils/undoManager'

export type SegmentState = Record<string, string[]> // segment name -> activity IDs

export const useSegmentUndo = (
  segments: SegmentState,
  onSegmentsUpdate?: (segments: SegmentState) => void,
  enabled: boolean = true,
) => {
  const undoManagerRef = useRef<UndoManager<SegmentState>>()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Initialize undo manager
  useEffect(() => {
    undoManagerRef.current = new UndoManager<SegmentState>(50, (state) => {
      onSegmentsUpdate?.(state)
    })

    // Record initial state
    undoManagerRef.current.initialize(segments)

    // Update undo/redo availability
    const updateAvailability = () => {
      setCanUndo(undoManagerRef.current!.canUndo())
      setCanRedo(undoManagerRef.current!.canRedo())
    }

    updateAvailability()

    // Set up interval to check availability
    const interval = setInterval(updateAvailability, 100)

    return () => clearInterval(interval)
  }, [])

  // Record state changes when segments update
  useEffect(() => {
    if (undoManagerRef.current) {
      undoManagerRef.current.recordState(segments)
    }
  }, [segments])

  // Enhanced update function that records state
  const updateSegmentsWithUndo = useCallback(
    (segments: SegmentState) => {
      onSegmentsUpdate?.(segments)
    },
    [onSegmentsUpdate],
  )

  // Add activity to segment
  const addActivityToSegment = useCallback(
    (segmentName: string, activityId: string) => {
      const updatedSegments = {
        ...segments,
        [segmentName]: [...(segments[segmentName] || []), activityId],
      }
      updateSegmentsWithUndo(updatedSegments)
    },
    [segments, updateSegmentsWithUndo],
  )

  // Remove activity from segment
  const removeActivityFromSegment = useCallback(
    (segmentName: string, activityId: string) => {
      const updatedSegments = {
        ...segments,
        [segmentName]: (segments[segmentName] || []).filter((id) => id !== activityId),
      }
      updateSegmentsWithUndo(updatedSegments)
    },
    [segments, updateSegmentsWithUndo],
  )

  // Create new segment
  const createSegment = useCallback(
    (segmentName: string, activityIds: string[] = []) => {
      const updatedSegments = {
        ...segments,
        [segmentName]: activityIds,
      }
      updateSegmentsWithUndo(updatedSegments)
    },
    [segments, updateSegmentsWithUndo],
  )

  // Delete segment
  const deleteSegment = useCallback(
    (segmentName: string) => {
      const updatedSegments = { ...segments }
      delete updatedSegments[segmentName]
      updateSegmentsWithUndo(updatedSegments)
    },
    [segments, updateSegmentsWithUndo],
  )

  // Rename segment
  const renameSegment = useCallback(
    (oldName: string, newName: string) => {
      const updatedSegments = { ...segments }
      updatedSegments[newName] = updatedSegments[oldName]
      delete updatedSegments[oldName]
      updateSegmentsWithUndo(updatedSegments)
    },
    [segments, updateSegmentsWithUndo],
  )

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
    updateSegmentsWithUndo,
    addActivityToSegment,
    removeActivityFromSegment,
    createSegment,
    deleteSegment,
    renameSegment,
  }
}
