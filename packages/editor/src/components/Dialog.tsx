import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Expression } from '@tricc/core'
import { Button } from './ui/button.js'
import { Icon } from '../theme/Icon.js'

/** Settings dialog and delete confirmation shared by the intervention and activity editors. */

export function Dialog({
  testId,
  titleId,
  title,
  onClose,
  onSave,
  onDelete,
  deleteTestId,
  children,
}: {
  testId: string
  titleId: string
  title: string
  onClose: () => void
  /** Present on the intervention settings dialog. Closes it; edits are already stored. */
  onSave?: () => void
  /** Opens the delete confirmation. Hidden while the project is read-only. */
  onDelete?: () => void
  deleteTestId?: string
  children: ReactNode
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  // The latest onClose, so a parent passing a new function each render neither re-runs the
  // focus below (which would pull focus out of the field being typed in) nor goes stale.
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    cardRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus()
  }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return createPortal(
    <div
      className="tricc-library-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={cardRef}
        className="tricc-library-modal__card tricc-library-modal__card--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="tricc-library-modal__header">
          <h2 id={titleId}>{title}</h2>
          <span className="tricc-library-modal__header-actions">
            {onSave && (
              <Button
                size="icon-sm"
                type="button"
                aria-label="Save"
                title="Save"
                data-testid={`${testId}-save`}
                onClick={onSave}
              >
                <SaveIcon />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                type="button"
                aria-label="Delete"
                title="Delete"
                data-testid={deleteTestId}
                onClick={onDelete}
              >
                <BinIcon />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon-sm"
              type="button"
              aria-label="Close"
              title="Close"
              data-testid={`${testId}-close`}
              onClick={onClose}
            >
              <CloseIcon />
            </Button>
          </span>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDelete({
  testId,
  heading,
  children,
  onCancel,
  onConfirm,
}: {
  testId: string
  heading: string
  children: ReactNode
  onCancel: () => void
  onConfirm: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      onCancel()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onCancel])

  return createPortal(
    <div
      className="tricc-library-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        className="tricc-library-modal__card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${testId}-title`}
        data-testid={`${testId}-dialog`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id={`${testId}-title`}>{heading}</h2>
        {children}
        <div className="tricc-library-modal__actions">
          <Button
            variant="outline"
            size="sm"
            type="button"
            ref={cancelRef}
            data-testid={`${testId}-cancel`}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            type="button"
            data-testid={`${testId}-confirm`}
            onClick={onConfirm}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export const SaveIcon = () => <Icon name="save" size={18} />
export const CloseIcon = () => <Icon name="close" size={18} />
export const GearIcon = () => <Icon name="settings" size={18} />
export const BinIcon = () => <Icon name="delete" size={18} />
export const HomeIcon = () => <Icon name="home" size={18} />
/** Follow a link: a square with an arrow leaving it. */
export const FollowIcon = () => <Icon name="open_in_new" size={16} />

export function mergeExpression(
  current: Expression | undefined,
  patch: { intent?: Record<string, string> | undefined; expression?: string | undefined },
): Expression | undefined {
  const next = { ...current, ...patch }
  if (patch.intent === undefined && 'intent' in patch) delete next.intent
  if (patch.expression === undefined && 'expression' in patch) delete next.expression
  const hasIntent = next.intent && Object.keys(next.intent).length > 0
  const hasExpr = next.expression && next.expression !== ''
  return hasIntent || hasExpr ? next : undefined
}
