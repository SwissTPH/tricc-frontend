import { useState } from 'react'
import {
  COMMENT_COLORS,
  DEFAULT_DISCUSSION_LABELS,
  type CommentColor,
  type DiscussionLabel,
} from '@tricc/core'
import {
  useCapability,
  useOpenProject,
  useProjectSnapshot,
  useRuntime,
} from '../runtime/context.js'
import { Button } from '../components/ui/button.js'

const COLOR_NAME: Record<CommentColor, string> = {
  yellow: 'Yellow',
  blue: 'Blue',
  green: 'Green',
  pink: 'Pink',
  grey: 'Grey',
}

function labelId(name: string, taken: Set<string>): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'label'
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

/** The project's discussion labels. Changes are saved immediately, apart from the project name. */
export function LabelSettings() {
  const project = useProjectSnapshot()
  const runtime = useRuntime()
  const open = useOpenProject()
  const canChange = useCapability('comment.write')
  const labels = project.discussionLabels?.length
    ? project.discussionLabels
    : DEFAULT_DISCUSSION_LABELS
  const [draft, setDraft] = useState('')
  const [color, setColor] = useState<CommentColor>('blue')
  const [error, setError] = useState<string>()

  const apply = async (next: DiscussionLabel[]) => {
    setError(undefined)
    try {
      const previous = project.discussionLabels ?? []
      for (const label of next) await runtime.discussion.defineLabel(open, label)
      for (const label of previous) {
        if (!next.some((item) => item.id === label.id)) {
          await runtime.discussion.removeLabel(open, label.id)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const add = () => {
    const name = draft.trim()
    if (!name) return
    const id = labelId(name, new Set(labels.map((label) => label.id)))
    void apply([...labels, { id, name, color }])
    setDraft('')
  }

  return (
    <fieldset className="tricc-label-settings" disabled={!canChange}>
      <legend>Discussion labels</legend>
      <p>Saved with the project. A new project starts with these five.</p>
      <ul>
        {labels.map((label) => (
          <LabelRow
            key={label.id}
            label={label}
            onCommit={(next) =>
              void apply(labels.map((item) => (item.id === next.id ? next : item)))
            }
            onRemove={() => void apply(labels.filter((item) => item.id !== label.id))}
          />
        ))}
      </ul>
      {canChange && (
        <div className="tricc-label-settings__row">
          <input
            value={draft}
            data-testid="discussion-label-new"
            placeholder="New label"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              add()
            }}
          />
          <ColorSelect value={color} testId="discussion-label-new-color" onChange={setColor} />
          <Button type="button" size="sm" data-testid="discussion-label-add" onClick={add}>
            Add
          </Button>
        </div>
      )}
      {error && <p>{error}</p>}
    </fieldset>
  )
}

function LabelRow({
  label,
  onCommit,
  onRemove,
}: {
  label: DiscussionLabel
  onCommit: (label: DiscussionLabel) => void
  onRemove: () => void
}) {
  const [name, setName] = useState(label.name)
  return (
    <li className="tricc-label-settings__row">
      <input
        value={name}
        data-testid={`discussion-label-name-${label.id}`}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => {
          const trimmed = name.trim()
          if (trimmed && trimmed !== label.name) onCommit({ ...label, name: trimmed })
          else setName(label.name)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault()
        }}
      />
      <ColorSelect
        value={label.color}
        testId={`discussion-label-color-${label.id}`}
        onChange={(next) => onCommit({ ...label, color: next })}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid={`discussion-label-remove-${label.id}`}
        onClick={onRemove}
      >
        Remove
      </Button>
    </li>
  )
}

function ColorSelect({
  value,
  testId,
  onChange,
}: {
  value: CommentColor
  testId: string
  onChange: (color: CommentColor) => void
}) {
  return (
    <select
      value={value}
      data-testid={testId}
      onChange={(event) => onChange(event.target.value as CommentColor)}
    >
      {COMMENT_COLORS.map((item) => (
        <option key={item} value={item}>
          {COLOR_NAME[item]}
        </option>
      ))}
    </select>
  )
}
