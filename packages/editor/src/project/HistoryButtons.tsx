import { useEffect, useState } from 'react'
import { useCanWrite, useOpenProject } from '../runtime/context.js'

/**
 * Undo and redo for the open project.
 *
 * The same stack as Ctrl+Z / Ctrl+Shift+Z. The buttons follow the stack, and they
 * wait while the project is read-only.
 */
export function HistoryButtons() {
  const { document } = useOpenProject()
  const canWrite = useCanWrite()
  const [, bump] = useState(0)
  useEffect(() => document.subscribe(() => bump((n) => n + 1)), [document])

  return (
    <span className="tricc-history">
      <button
        type="button"
        data-testid="undo"
        aria-label="Undo"
        title="Undo (Ctrl+Z)"
        disabled={!canWrite || !document.undo.canUndo}
        onClick={() => document.undo.undo()}
      >
        <HistoryArrow direction="undo" />
      </button>
      <button
        type="button"
        data-testid="redo"
        aria-label="Redo"
        title="Redo (Ctrl+Shift+Z)"
        disabled={!canWrite || !document.undo.canRedo}
        onClick={() => document.undo.redo()}
      >
        <HistoryArrow direction="redo" />
      </button>
    </span>
  )
}

function HistoryArrow({ direction }: { direction: 'undo' | 'redo' }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      {direction === 'undo' ? (
        <path
          d="M6.2 3.2 2.8 6.6l3.4 3.4M3.2 6.6h5.2a3.2 3.2 0 0 1 0 6.4H7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M9.8 3.2 13.2 6.6 9.8 10M12.8 6.6H7.6a3.2 3.2 0 0 0 0 6.4H9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}
