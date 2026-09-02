/**
 * Generic UndoManager class for tracking state changes and providing undo/redo functionality
 */
import React from 'react'
export class UndoManager<T = any> {
  private history: T[] = []
  private currentIndex: number = -1
  private maxHistorySize: number
  private onStateChange?: (state: T) => void

  constructor(maxHistorySize: number = 50, onStateChange?: (state: T) => void) {
    this.maxHistorySize = maxHistorySize
    this.onStateChange = onStateChange
  }

  /**
   * Record a new state in the history
   */
  recordState(state: T): void {
    // Remove any history after current index (when user made changes after undo)
    this.history = this.history.slice(0, this.currentIndex + 1)

    // Add new state
    this.history.push(this.deepClone(state))
    this.currentIndex++

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
      this.currentIndex--
    }
  }

  /**
   * Undo the last operation
   */
  undo(): T | null {
    if (!this.canUndo()) return null

    this.currentIndex--
    const state = this.history[this.currentIndex]
    this.onStateChange?.(this.deepClone(state))
    return this.deepClone(state)
  }

  /**
   * Redo the last undone operation
   */
  redo(): T | null {
    if (!this.canRedo()) return null

    this.currentIndex++
    const state = this.history[this.currentIndex]
    this.onStateChange?.(this.deepClone(state))
    return this.deepClone(state)
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex > 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  /**
   * Get the current state
   */
  getCurrentState(): T | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.deepClone(this.history[this.currentIndex])
    }
    return null
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = []
    this.currentIndex = -1
  }

  /**
   * Initialize with an initial state
   */
  initialize(initialState: T): void {
    this.clear()
    this.recordState(initialState)
  }

  /**
   * Deep clone an object to avoid reference issues
   */
  private deepClone(obj: T): T {
    try {
      return JSON.parse(JSON.stringify(obj))
    } catch (error) {
      // Fallback for objects that can't be JSON serialized
      console.warn('UndoManager: Could not deep clone object, using shallow copy')
      return { ...obj }
    }
  }
}

/**
 * React hook for using UndoManager with keyboard shortcuts
 */
export const useUndoKeyboard = (undoManager: UndoManager, enabled: boolean = true) => {
  const handleKeyDown = React.useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault()
          undoManager.undo()
        } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault()
          undoManager.redo()
        }
      }
    },
    [enabled, undoManager],
  )

  React.useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}
