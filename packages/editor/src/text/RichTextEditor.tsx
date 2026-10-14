import { useEffect, useRef, useState } from 'react'
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type ReactNodeViewProps,
} from '@tiptap/react'
import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Color, TextStyle } from '@tiptap/extension-text-style'
import { imageIdOf, imageSrc, toMarkdown, type DisplayText } from '@tricc/core'
import { fromDoc, toDoc, type PmNode } from './prosemirror.js'
import { imageFiles, useAddImages } from '../media/images.js'
import { ImagePicker } from '../media/ImagePicker.js'
import { TextImage } from './RichTextField.js'

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

/**
 * A picture from the image library, inline in the text. It stores `Binary/<id>`. It is drawn by
 * a React view reading the library, so a picture added a moment ago shows as soon as it is there.
 */
function PictureView({ node }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper as="span" className="tricc-text-picture">
      <TextImage src={String(node.attrs['src'] ?? '')} alt={(node.attrs['alt'] as string | null) ?? undefined} />
    </NodeViewWrapper>
  )
}

const TextPicture = Node.create({
  name: 'image',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,
  addNodeView() {
    return ReactNodeViewRenderer(PictureView, { as: 'span' })
  },
  addAttributes() {
    return { src: { default: null }, alt: { default: null } }
  },
  parseHTML() {
    // Only our own pictures: a pasted web image is not in the library.
    return [
      {
        tag: 'img[data-src]',
        getAttrs: (el) => {
          const src = (el as HTMLElement).dataset['src'] ?? ''
          return imageIdOf(src) ? { src, alt: (el as HTMLElement).getAttribute('alt') } : false
        },
      },
    ]
  },
  renderHTML({ node, HTMLAttributes }) {
    const src = String(node.attrs['src'] ?? '')
    return [
      'img',
      mergeAttributes(HTMLAttributes, {
        'data-src': src,
        'data-image': imageIdOf(src) ?? '',
        alt: node.attrs['alt'] ?? '',
        class: 'tricc-text-image',
      }),
    ]
  },
  renderText({ node }) {
    return `![${String(node.attrs['alt'] ?? '')}](${String(node.attrs['src'] ?? '')})`
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
  const addImages = useAddImages()
  const [picking, setPicking] = useState(false)
  const [imageError, setImageError] = useState<string | undefined>(undefined)
  /** Add dropped or pasted files to the library and put them in the text at `pos`. */
  const insertFiles = useRef<(files: File[], pos?: number) => void>(() => undefined)
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
      TextPicture,
    ],
    content: toDoc(value) as never,
    editable: !disabled,
    editorProps: {
      attributes: { 'aria-label': label, 'data-testid': `${testId}-rich` },
      handleDrop: (view, event, _slice, moved) => {
        if (moved || disabled) return false
        const files = imageFiles(event.dataTransfer?.files)
        if (files.length === 0) return false
        event.preventDefault()
        const at = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        insertFiles.current(files, at)
        return true
      },
      handlePaste: (_view, event) => {
        if (disabled) return false
        const files = imageFiles(event.clipboardData?.files)
        if (files.length === 0) return false
        event.preventDefault()
        insertFiles.current(files)
        return true
      },
    },
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

  insertFiles.current = (files, pos) => {
    setImageError(undefined)
    void addImages(files, { onError: setImageError }).then((ids) => {
      if (!editor || ids.length === 0) return
      const content = ids.map((id) => ({ type: 'image', attrs: { src: imageSrc(id) } }))
      if (pos === undefined) editor.chain().focus().insertContent(content).run()
      else editor.chain().focus().insertContentAt(pos, content).run()
    })
  }

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
        <button
          type="button"
          data-testid={`${testId}-image`}
          aria-label="Insert a picture"
          title="Insert a picture (or drop or paste one)"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setPicking(true)}
        >
          Picture…
        </button>
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
      {imageError && (
        <p role="alert" className="tricc-image-picker__error">
          {imageError}
        </p>
      )}
      <EditorContent editor={editor} className="tricc-rich__content" />
      {picking && (
        <ImagePicker
          onClose={() => setPicking(false)}
          onPick={(id) => {
            setPicking(false)
            editor.chain().focus().insertContent({ type: 'image', attrs: { src: imageSrc(id) } }).run()
          }}
        />
      )}
    </div>
  )
}
