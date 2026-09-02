import { useState, useCallback, useRef, useEffect } from 'react'
import { TriccProject, TriccActivity } from '../types'
import { UndoManager, useUndoKeyboard } from '../utils/undoManager'

export interface ProjectState {
  project: TriccProject | null
  activities: Record<string, TriccActivity>
}

export const useProjectUndo = (
  currentProject: TriccProject | null,
  activities: Record<string, TriccActivity>,
  onProjectUpdate?: (project: TriccProject | null) => void,
  onActivitiesUpdate?: (activities: Record<string, TriccActivity>) => void,
  enabled: boolean = true,
) => {
  const undoManagerRef = useRef<UndoManager<ProjectState>>()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const isUndoRedoOperationRef = useRef(false)

  // Initialize undo manager
  useEffect(() => {
    undoManagerRef.current = new UndoManager<ProjectState>(50, (state) => {
      isUndoRedoOperationRef.current = true
      onProjectUpdate?.(state.project)
      onActivitiesUpdate?.(state.activities)
      // Reset flag after a short delay to allow state to settle
      setTimeout(() => {
        isUndoRedoOperationRef.current = false
      }, 0)
    })

    // Record initial state
    undoManagerRef.current.initialize({
      project: currentProject,
      activities: activities,
    })

    // Update undo/redo availability
    const updateAvailability = () => {
      setCanUndo(undoManagerRef.current!.canUndo())
      setCanRedo(undoManagerRef.current!.canRedo())
    }

    updateAvailability()

    // Set up interval to check availability
    const interval = setInterval(updateAvailability, 100)

    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Record state changes when props update - but not during undo/redo operations
  const currentProjectString = JSON.stringify(currentProject)
  const activitiesString = JSON.stringify(activities)
  useEffect(() => {
    if (undoManagerRef.current && !isUndoRedoOperationRef.current) {
      undoManagerRef.current.recordState({
        project: currentProject,
        activities: activities,
      })
    }
  }, [currentProjectString, activitiesString]) // eslint-disable-line react-hooks/exhaustive-deps

  // Enhanced update functions that record state
  const updateProjectWithUndo = useCallback(
    (project: TriccProject | null) => {
      onProjectUpdate?.(project)
    },
    [onProjectUpdate],
  )

  const updateActivitiesWithUndo = useCallback(
    (activities: Record<string, TriccActivity>) => {
      onActivitiesUpdate?.(activities)
    },
    [onActivitiesUpdate],
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
    updateProjectWithUndo,
    updateActivitiesWithUndo,
  }
}
