import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  conceptText,
  fromPlain,
  imageIdOf,
  isStructured,
  lookupConcept,
  nodeConceptKey,
  resolve,
  toPlain,
  type DisplayText,
  type MessageNode,
  type Project,
} from '@tricc/core'
import { useEditorPreferences, useProjectSnapshot } from '../runtime/context.js'
import { useImageUrl } from '../media/images.js'

const RichTextEditor = lazy(() => import('./RichTextEditor.js'))

/**
 * A text that can carry formatting. A plain text is a plain input; a formatted one shows as
 * formatted. "Format…" opens the formatted editor in a large modal, loaded only then, with
 * Save and Cancel.
 */
export function RichTextField({
  id,
  testId,
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string
  testId: string
  label: string
  value: DisplayText
  onChange: (text: DisplayText) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const structured = isStructured(value)

  return (
    <>
      <label htmlFor={id}>{label}</label>
      <span className="tricc-rich__plain">
        {structured ? (
          <div id={id} className="tricc-rich__preview" data-testid={testId}>
            <MessageView text={value} />
          </div>
        ) : (
          <input
            id={id}
            data-testid={testId}
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(e) => onChange(fromPlain(e.target.value))}
          />
        )}
        {!disabled && (
          <button
            type="button"
            data-testid={`${testId}-format`}
            title="Bold, colour, lists, pictures, and data from earlier answers"
            onClick={() => setEditing(true)}
          >
            {structured ? 'Edit…' : 'Format…'}
          </button>
        )}
      </span>
      {editing && (
        <RichTextModal
          testId={testId}
          label={label}
          value={value}
          onCancel={() => setEditing(false)}
          onSave={(text) => {
            setEditing(false)
            onChange(text)
          }}
        />
      )}
    </>
  )
}

function RichTextModal({
  testId,
  label,
  value,
  onCancel,
  onSave,
}: {
  testId: string
  label: string
  value: DisplayText
  onCancel: () => void
  onSave: (text: DisplayText) => void
}) {
  const project = useProjectSnapshot()
  const { labelChars } = useEditorPreferences()
  const names = useMemo(() => injectableNames(project, labelChars), [project, labelChars])
  const [draft, setDraft] = useState<DisplayText>(value)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Escape closes this modal only, not a dialog underneath, and not while one is open on top
    // of it (the picture picker).
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const dialogs = document.querySelectorAll('[role="dialog"]')
      if (dialogs[dialogs.length - 1] !== cardRef.current) return
      event.preventDefault()
      event.stopImmediatePropagation()
      onCancel()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onCancel])

  return createPortal(
    <div
      className="tricc-library-modal tricc-rich-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        ref={cardRef}
        className="tricc-library-modal__card tricc-rich-modal__card"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-testid={`${testId}-modal`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2>{label}</h2>
        <Suspense fallback={<p aria-busy="true">Loading the editor…</p>}>
          <RichTextEditor value={draft} onChange={setDraft} testId={testId} names={names} label={label} />
        </Suspense>
        <div className="tricc-library-modal__actions">
          <button type="button" data-testid={`${testId}-modal-save`} onClick={() => onSave(draft)}>
            Save
          </button>
          <button type="button" data-testid={`${testId}-modal-cancel`} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** A formatted text, read-only: bold, colour, lists, and `${name}` chips. */
export function MessageView({ text }: { text: DisplayText }): ReactNode {
  if (typeof text === 'string') return text
  return <>{text.children.map((node, i) => renderNode(node, i))}</>
}

function renderNode(node: MessageNode, key: number): ReactNode {
  switch (node.type) {
    case 'text':
      return node.value
    case 'break':
      return <br key={key} />
    case 'interp':
      return (
        <span key={key} className="tricc-interp" data-interp={node.name}>
          {`\${${node.name}}`}
        </span>
      )
    case 'mark': {
      const inner = node.children.map((child, i) => renderNode(child, i))
      if (node.kind === 'strong') return <strong key={key}>{inner}</strong>
      if (node.kind === 'em') return <em key={key}>{inner}</em>
      if (node.kind === 'u') return <u key={key}>{inner}</u>
      return (
        <span key={key} style={{ color: node.color }}>
          {inner}
        </span>
      )
    }
    case 'list': {
      const items = node.items.map((item, i) => <li key={i}>{item.children.map((c, j) => renderNode(c, j))}</li>)
      return node.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>
    }
    case 'image':
      return <TextImage key={key} src={node.src} alt={node.alt} />
  }
}

/** A picture of a text, from the image library. A missing one says so instead of breaking. */
export function TextImage({ src, alt, className }: { src: string; alt?: string; className?: string }) {
  const id = imageIdOf(src)
  const url = useImageUrl(id)
  if (!url) {
    return (
      <span className="tricc-text-image tricc-text-image--missing" data-image={id ?? src} title="Not in the image library">
        {`[${id ?? src}]`}
      </span>
    )
  }
  return <img className={className ?? 'tricc-text-image'} src={url} alt={alt ?? ''} data-image={id} />
}

/**
 * Every name a text may inject (question and calculation names), listed as
 * `<code>: <display>` with the display cut to the viewer's `labelChars`.
 */
function injectableNames(project: Project, limit: number): { name: string; label: string }[] {
  const lang = project.languages.default
  const byName = new Map<string, string>()
  for (const a of Object.values(project.activities)) {
    for (const n of Object.values(a.nodes)) {
      if (!n.name || n.type === 'activity_start' || n.type === 'start' || byName.has(n.name)) continue
      const concept = lookupConcept(project, nodeConceptKey(project, n))
      const display = conceptText(concept, 'display', lang, lang) ?? resolve(n.label, lang, lang) ?? ''
      byName.set(n.name, display)
    }
  }
  return [...byName.keys()].sort().map((name) => {
    const display = byName.get(name) ?? ''
    const short = display.length > limit ? `${display.slice(0, limit)}…` : display
    return { name, label: short ? `${name}: ${short}` : name }
  })
}
