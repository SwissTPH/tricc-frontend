import { useEffect, useState } from 'react'
import { useCanWrite, useOpenProject } from '../runtime/context.js'
import { Button } from '../components/ui/button.js'
import { Icon } from '../theme/Icon.js'

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
      <Button
        variant="outline"
        size="icon-sm"
        type="button"
        data-testid="undo"
        aria-label="Undo"
        title="Undo (Ctrl+Z)"
        disabled={!canWrite || !document.undo.canUndo}
        onClick={() => document.undo.undo()}
      >
        <HistoryArrow direction="undo" />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        type="button"
        data-testid="redo"
        aria-label="Redo"
        title="Redo (Ctrl+Shift+Z)"
        disabled={!canWrite || !document.undo.canRedo}
        onClick={() => document.undo.redo()}
      >
        <HistoryArrow direction="redo" />
      </Button>
    </span>
  )
}

function HistoryArrow({ direction }: { direction: 'undo' | 'redo' }) {
  return <Icon name={direction} size={18} />
}
