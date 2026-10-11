import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Expression } from '@tricc/core'

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
  useEffect(() => {
    cardRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

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
              <button
                type="button"
                className="tricc-icon-button tricc-icon-button--primary"
                aria-label="Save"
                title="Save"
                data-testid={`${testId}-save`}
                onClick={onSave}
              >
                <SaveIcon />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="tricc-icon-button tricc-icon-button--danger"
                aria-label="Delete"
                title="Delete"
                data-testid={deleteTestId}
                onClick={onDelete}
              >
                <BinIcon />
              </button>
            )}
            <button
              type="button"
              className="tricc-icon-button"
              aria-label="Close"
              title="Close"
              data-testid={`${testId}-close`}
              onClick={onClose}
            >
              <CloseIcon />
            </button>
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
          <button type="button" ref={cancelRef} data-testid={`${testId}-cancel`} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="tricc-danger-text"
            data-testid={`${testId}-confirm`}
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function SaveIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 1.5h7.1L14 5.4V14a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 2 14V2a.5.5 0 0 1 .5-.5H3zm.5 1V13h9V5.8L9.7 2.5H3.5zM5 9h6v4H5V9zm1-6h3v2H6V3z"
      />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.2 2.2 8 7l4.8-4.8 1 1L9 8l4.8 4.8-1 1L8 9l-4.8 4.8-1-1L7 8 2.2 3.2l1-1z"
      />
    </svg>
  )
}

export function GearIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11.5 2h-3l-.4 2.1a6 6 0 0 0-1.5.9L4.4 4.1 2.6 7.2l1.7 1.3a6 6 0 0 0 0 1.8l-1.7 1.3 1.8 3.1 2.2-.9a6 6 0 0 0 1.5.9l.4 2.1h3l.4-2.1a6 6 0 0 0 1.5-.9l2.2.9 1.8-3.1-1.7-1.3a6 6 0 0 0 0-1.8l1.7-1.3-1.8-3.1-2.2.9a6 6 0 0 0-1.5-.9L11.5 2zM10 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"
      />
    </svg>
  )
}

export function BinIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 2h4l1 1h3v1H2V3h3l1-1zM3.5 6h1v7h-1V6zm3 0h1v7h-1V6zm3 0h1v7h-1V6zM4 5h8l-.6 9H4.6L4 5z"
      />
    </svg>
  )
}

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
