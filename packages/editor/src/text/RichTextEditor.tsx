import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import { toMarkdown, type DisplayText } from '@tricc/core'
import { fromDoc, toDoc, type PmNode } from './prosemirror.js'

/**
 * The formatted-text editor. Loaded on demand (it is the only TipTap import), so the
 * editor bundle only carries ProseMirror once someone formats a text.
 *
 * Limited to what tricc_oo keeps: bold, italic, underline, line breaks, lists, and `${name}`
 * chips for injected data. Nothing else can be typed or pasted in.
 */
const Interp = Node.create({
  name: 'interp',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { name: { default: '' } }
  },
  parseHTML() {
    return [{ tag: 'span[data-interp]', getAttrs: (el) => ({ name: (el as HTMLElement).dataset['interp'] }) }]
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-interp': node.attrs['name'], class: 'tricc-interp' }),
      `\${${String(node.attrs['name'])}}`,
    ]
  },
  renderText({ node }) {
    return `\${${String(node.attrs['name'])}}`
  },
})

/** Colours that read well on a form; any other comes from the colour picker. */
const COLORS: [string, string][] = [
  ['Red', '#d32f2f'],
  ['Orange', '#ef6c00'],
  ['Green', '#2e7d32'],
  ['Blue', '#1565c0'],
  ['Grey', '#616161'],
]

export default function RichTextEditor({
  value,
  onChange,
  disabled,
  testId,
  names,
  label,
}: {
  value: DisplayText
  onChange: (text: DisplayText) => void
  disabled?: boolean
  testId: string
  /** What `Insert data` offers: a name to inject, and how the list shows it. */
  names: { name: string; label: string }[]
  label: string
}) {
  const last = useRef(toMarkdown(value))
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        strike: false,
        link: false,
        undoRedo: false,
      }),
      TextStyle,
      Color,
      Interp,
    ],
    content: toDoc(value) as never,
    editable: !disabled,
    editorProps: { attributes: { 'aria-label': label, 'data-testid': `${testId}-rich` } },
    onUpdate: ({ editor }) => {
      const text = fromDoc(editor.getJSON() as PmNode)
      last.current = toMarkdown(text)
      onChange(text)
    },
  })

  // An outside change (undo, another field) replaces the content; our own edits do not.
  useEffect(() => {
    if (!editor) return
    const markdown = toMarkdown(value)
    if (markdown === last.current) return
    last.current = markdown
    editor.commands.setContent(toDoc(value) as never, { emitUpdate: false })
  }, [editor, value])

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [editor, disabled])

  if (!editor) return null
  const button = (name: string, title: string, active: boolean, run: () => void) => (
    <button
      type="button"
      data-testid={`${testId}-${name}`}
      aria-label={title}
      aria-pressed={active}
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
    >
      {title[0]}
    </button>
  )
  return (
    <div className="tricc-rich" data-testid={testId}>
      <div className="tricc-rich__bar" role="toolbar" aria-label={`Format ${label}`}>
        {button('bold', 'Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
        {button('italic', 'Italic', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
        {button('underline', 'Underline', editor.isActive('underline'), () =>
          editor.chain().focus().toggleUnderline().run(),
        )}
        {button('bullets', '• List', editor.isActive('bulletList'), () =>
          editor.chain().focus().toggleBulletList().run(),
        )}
        {button('numbers', '1. List', editor.isActive('orderedList'), () =>
          editor.chain().focus().toggleOrderedList().run(),
        )}
        <select
          data-testid={`${testId}-color`}
          aria-label="Text colour"
          value={(editor.getAttributes('textStyle')['color'] as string | undefined) ?? ''}
          disabled={disabled}
          onChange={(e) => {
            const color = e.target.value
            if (color) editor.chain().focus().setColor(color).run()
            else editor.chain().focus().unsetColor().run()
          }}
        >
          <option value="">Default colour</option>
          {COLORS.map(([name, value]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
          {(() => {
            const current = editor.getAttributes('textStyle')['color'] as string | undefined
            return current && !COLORS.some(([, v]) => v === current) ? <option value={current}>{current}</option> : null
          })()}
        </select>
        <input
          type="color"
          data-testid={`${testId}-color-custom`}
          aria-label="Another colour"
          disabled={disabled}
          value={(editor.getAttributes('textStyle')['color'] as string | undefined) ?? '#000000'}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
        <select
          data-testid={`${testId}-insert`}
          aria-label="Insert data"
          value=""
          disabled={disabled || names.length === 0}
          onChange={(e) => {
            const name = e.target.value
            if (name) editor.chain().focus().insertContent({ type: 'interp', attrs: { name } }).run()
          }}
        >
          <option value="">Insert data…</option>
          {names.map((n) => (
            <option key={n.name} value={n.name}>
              {n.label}
            </option>
          ))}
        </select>
      </div>
      <EditorContent editor={editor} className="tricc-rich__content" />
    </div>
  )
}
