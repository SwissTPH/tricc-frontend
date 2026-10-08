import { useEffect, useRef } from 'react'

export type BranchChoiceValue = 'yes' | 'no' | 'continue'

/**
 * Connect-time branch for a yes/no question or a decision diamond.
 *
 * The edge does not exist until a choice is made. Follow is the word on the button;
 * the stored value is `continue`, because `follow` is a deprecated spelling.
 */
export function BranchChoiceDialog({
  sourceType,
  onChoose,
  onCancel,
}: {
  sourceType: 'select_yesno' | 'rhombus'
  onChoose: (value: BranchChoiceValue) => void
  onCancel: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    card?.querySelector<HTMLButtonElement>('button')?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCancel()
        return
      }
      if (event.key !== 'Tab' || !card) return
      const buttons = [...card.querySelectorAll<HTMLButtonElement>('button')]
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (!first || !last) return
      const active = document.activeElement
      if (event.shiftKey && (active === first || !card.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !card.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  const leaves =
    sourceType === 'select_yesno' ? 'a yes/no question' : 'a decision'

  return (
    <div
      className="tricc-branch-modal"
      data-testid="branch-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        ref={cardRef}
        className="tricc-branch-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-modal-title"
        data-testid="branch-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="branch-modal-title">Which branch?</h2>
        <p>This connection leaves {leaves}. Choose the branch before the edge is added.</p>
        <div className="tricc-branch-modal__choices">
          <button type="button" data-testid="branch-choice-yes" onClick={() => onChoose('yes')}>
            Yes
          </button>
          <button type="button" data-testid="branch-choice-no" onClick={() => onChoose('no')}>
            No
          </button>
          <button
            type="button"
            data-testid="branch-choice-follow"
            onClick={() => onChoose('continue')}
          >
            Follow
          </button>
        </div>
        <button type="button" className="tricc-branch-modal__cancel" data-testid="branch-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
