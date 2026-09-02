import * as Y from 'yjs'

/**
 * Undo/redo.
 *
 * One stack over the whole document, tracking only local origins — so undo reverses your
 * change, never a collaborator's, and that falls out of origin tracking rather than needing
 * logic (feature/20260825-document-model.md §6).
 */
export class UndoController {
  private readonly manager: Y.UndoManager

  constructor(doc: Y.Doc, localOrigin: unknown, captureTimeout = 500) {
    const scope = [
      doc.getMap('meta'),
      doc.getMap('languages'),
      doc.getMap('title'),
      doc.getMap('description'),
      doc.getMap('interventions'),
      doc.getArray('interventionOrder'),
      doc.getMap('activities'),
      doc.getMap('codeSystems'),
      doc.getMap('libraries'),
      doc.getArray('contexts'),
    ]
    this.manager = new Y.UndoManager(scope, {
      trackedOrigins: new Set([localOrigin]),
      captureTimeout,
    })
  }

  undo(): void {
    this.manager.undo()
  }

  redo(): void {
    this.manager.redo()
  }

  get canUndo(): boolean {
    return this.manager.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.manager.redoStack.length > 0
  }

  /** Force the next change into a new stack entry, ending gesture coalescing. */
  breakGesture(): void {
    this.manager.stopCapturing()
  }

  clear(): void {
    this.manager.clear()
  }

  destroy(): void {
    this.manager.destroy()
  }
}
