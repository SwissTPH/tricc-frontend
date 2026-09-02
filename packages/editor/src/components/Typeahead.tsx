import { useEffect, useId, useMemo, useRef, useState } from 'react'

export interface TypeaheadOption {
  id: string
  label: string
  /** Secondary text — a code, a type, an id. Searched as well as shown. */
  hint?: string
}

export interface TypeaheadProps {
  label: string
  options: TypeaheadOption[]
  onSelect: (id: string) => void
  placeholder?: string
  disabled?: boolean
  /** Shown when the query matches nothing. */
  emptyMessage?: string
  /** Shown in place of the input when there is nothing left to pick. */
  exhaustedMessage?: string
  testId: string
  /** Suggestions shown before the author types. 0 means "type to search". */
  initialSuggestions?: number
}

/**
 * A search-and-pick control.
 *
 * A `<select>` stops working the moment a project has more than a handful of activities,
 * and it cannot show secondary text. This follows the ARIA combobox pattern properly —
 * arrow keys move the highlight, Enter picks, Escape closes, and the highlighted option
 * is announced through `aria-activedescendant` — because an author who works by keyboard
 * should not be worse off than one who works by mouse.
 *
 * Deliberately generic: the concept picker needs the same control, and two divergent
 * implementations of "search and pick" is how a UI stops feeling like one tool.
 */
export function Typeahead({
  label,
  options,
  onSelect,
  placeholder,
  disabled = false,
  emptyMessage = 'Nothing matches',
  exhaustedMessage,
  testId,
  initialSuggestions = 8,
}: TypeaheadProps) {
  const reactId = useId()
  const inputId = `${reactId}-input`
  const listId = `${reactId}-list`

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q === '') return options.slice(0, initialSuggestions)
    return (
      options
        .filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q))
        // A label that starts with the query is a better match than one that merely
        // contains it — the same ranking the concept index uses.
        .sort((a, b) => rank(a, q) - rank(b, q) || a.label.localeCompare(b.label))
    )
  }, [options, query, initialSuggestions])

  useEffect(() => {
    setHighlight(0)
  }, [query])

  // Closing on outside click rather than on blur: blur fires before a click on an option
  // lands, and swallowing that is the classic reason a picker feels broken.
  useEffect(() => {
    if (!open) return
    const onDocumentPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocumentPointerDown)
    return () => document.removeEventListener('mousedown', onDocumentPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current?.children[highlight]?.scrollIntoView?.({ block: 'nearest' })
  }, [highlight, open])

  if (options.length === 0 && exhaustedMessage) {
    return <p data-testid={`${testId}-exhausted`}>{exhaustedMessage}</p>
  }

  const pick = (id: string) => {
    onSelect(id)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setOpen(true)
        setHighlight((h) => (matches.length === 0 ? 0 : (h + 1) % matches.length))
        break
      case 'ArrowUp':
        event.preventDefault()
        setOpen(true)
        setHighlight((h) => (matches.length === 0 ? 0 : (h - 1 + matches.length) % matches.length))
        break
      case 'Enter': {
        const chosen = matches[highlight]
        if (open && chosen) {
          event.preventDefault()
          pick(chosen.id)
        }
        break
      }
      case 'Escape':
        if (open) {
          event.preventDefault()
          setOpen(false)
        } else if (query !== '') {
          setQuery('')
        }
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div className="tricc-typeahead" ref={rootRef}>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        data-testid={testId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[highlight] ? `${listId}-${highlight}` : undefined}
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {open && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label={label}
          className="tricc-typeahead__list"
          data-testid={`${testId}-list`}
        >
          {matches.length === 0 && (
            <li className="tricc-typeahead__empty" data-testid={`${testId}-empty`}>
              {emptyMessage}
            </li>
          )}
          {matches.map((option, index) => (
            <li
              key={option.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === highlight}
              className={index === highlight ? 'is-highlighted' : ''}
              data-testid={`${testId}-option-${option.id}`}
              // Prevent the input losing focus before the click is handled.
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlight(index)}
              onClick={() => pick(option.id)}
            >
              <span className="tricc-typeahead__label">{option.label}</span>
              {option.hint && <span className="tricc-typeahead__hint">{option.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function rank(option: TypeaheadOption, query: string): number {
  const label = option.label.toLowerCase()
  if (label === query) return 0
  if (label.startsWith(query)) return 1
  if (option.hint?.toLowerCase().startsWith(query)) return 2
  if (label.includes(query)) return 3
  return 4
}
