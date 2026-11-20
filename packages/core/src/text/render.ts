import { MarkdownSerializer } from 'prosemirror-markdown'
import {
  imageIdOf,
  imageSrc,
  isColor,
  textSchema,
  type DisplayText,
  type PmDoc,
  type PmNode,
} from './schema.js'

/**
 * Everything read from a display text walks its document: plain text, Markdown, the names it
 * injects and the pictures it shows. Rules follow `tricc_oo/text/render.py`; the shared
 * fixtures (`fixtures/*.json`) hold both sides to the same output.
 */

const TOKEN = /\$\{([^}]+)\}/g

export function isStructured(text: DisplayText): text is PmDoc {
  return typeof text !== 'string'
}

/** Every node of the document, depth first, in reading order. */
function* walk(node: PmNode): Generator<PmNode> {
  yield node
  for (const child of node.content ?? []) yield* walk(child)
}

function isEmptyParagraph(node: PmNode): boolean {
  return node.type === 'paragraph' && (node.content ?? []).length === 0
}

/**
 * A plain string when the document is one paragraph of unmarked text and `${name}` (the string
 * form says the same, so it costs no extension); `''` when it is empty. Empty top-level
 * paragraphs are dropped: they only ever add blank lines.
 */
export function simplify(doc: PmDoc): DisplayText {
  const blocks = (doc.content ?? []).filter((b) => !isEmptyParagraph(b))
  if (blocks.length === 0) return ''
  const only = blocks.length === 1 ? blocks[0]! : undefined
  if (
    only?.type === 'paragraph' &&
    (only.content ?? []).every(
      (n) => (n.type === 'text' || n.type === 'interp') && (n.marks ?? []).length === 0,
    )
  )
    return (only.content ?? [])
      .map((n) => (n.type === 'text' ? (n.text ?? '') : `\${${String(n.attrs?.['name'])}}`))
      .join('')
  return blocks.length === (doc.content ?? []).length ? doc : { ...doc, content: blocks }
}

// ------------------------------------------------------------------ plain text

/**
 * The text without any markup: line breaks kept, paragraphs apart by a blank line, list items
 * as `• ` / `1. `, `${name}` as `interp(name)`, pictures as their `alt` (or nothing).
 */
export function toPlain(
  text: DisplayText,
  interp: (name: string) => string = (name) => `\${${name}}`,
): string {
  if (typeof text === 'string') return text.replace(TOKEN, (_, name: string) => interp(name.trim()))
  return blocksPlain(text.content ?? [], interp).trim()
}

function blocksPlain(blocks: PmNode[], interp: (name: string) => string): string {
  return blocks
    .map((b) => blockPlain(b, interp))
    .filter((s) => s !== '')
    .join('\n\n')
}

function blockPlain(block: PmNode, interp: (name: string) => string): string {
  if (block.type === 'paragraph') return inlinePlain(block.content ?? [], interp)
  if (block.type === 'bulletList' || block.type === 'orderedList') {
    const start = typeof block.attrs?.['start'] === 'number' ? block.attrs['start'] : 1
    return (block.content ?? [])
      .map((item, i) => {
        const prefix = block.type === 'orderedList' ? `${start + i}. ` : '• '
        const body = (item.content ?? []).map((b) => blockPlain(b, interp)).join('\n')
        return prefix + body.replace(/\n/g, '\n  ')
      })
      .join('\n')
  }
  return ''
}

function inlinePlain(nodes: PmNode[], interp: (name: string) => string): string {
  return nodes
    .map((n) =>
      n.type === 'text'
        ? (n.text ?? '')
        : n.type === 'hardBreak'
          ? '\n'
          : n.type === 'interp'
            ? interp(String(n.attrs?.['name'] ?? ''))
            : n.type === 'image'
              ? typeof n.attrs?.['alt'] === 'string'
                ? n.attrs['alt']
                : ''
              : '',
    )
    .join('')
}

// ------------------------------------------------------------------ Markdown

/**
 * Markdown as ODK and CHT render it: `**bold**`, `_italic_`, `- ` / `1. ` lists, a line break
 * as a newline, paragraphs apart by a blank line, `${name}` as is, pictures as
 * `![alt](Binary/<id>)`. Text is not escaped, as `tricc_oo` writes it. Underline has no
 * Markdown and is dropped; a colour is an inline `<span>` ODK and CHT understand.
 */
const serializer = new MarkdownSerializer(
  {
    doc: (state, node) => state.renderContent(node),
    paragraph: (state, node) => {
      state.renderInline(node)
      state.closeBlock(node)
    },
    bulletList: (state, node) => state.renderList(node, '  ', () => '- '),
    orderedList: (state, node) => {
      const start = (node.attrs['start'] as number | undefined) ?? 1
      state.renderList(node, '   ', (i) => `${start + i}. `)
    },
    listItem: (state, node) => state.renderContent(node),
    text: (state, node) => state.text(node.text ?? '', false),
    hardBreak: (state) => state.write('\n'),
    interp: (state, node) => state.write(`\${${String(node.attrs['name'])}}`),
    image: (state, node) =>
      state.write(
        `![${String(node.attrs['alt'] ?? '').replace(/[[\]]/g, '')}](${String(node.attrs['src'])})`,
      ),
  },
  {
    bold: { open: '**', close: '**', mixable: true, expelEnclosingWhitespace: true },
    italic: { open: '_', close: '_', mixable: true, expelEnclosingWhitespace: true },
    underline: { open: '', close: '' },
    textStyle: {
      open: (_state, mark) =>
        isColor(mark.attrs['color']) ? `<span style="color:${mark.attrs['color']}">` : '',
      close: (_state, mark) => (isColor(mark.attrs['color']) ? '</span>' : ''),
    },
  },
  { hardBreakNodeName: 'hardBreak', strict: false },
)

export function toMarkdown(text: DisplayText): string {
  if (typeof text === 'string') return text
  return serializer.serialize(textSchema.nodeFromJSON(text), { tightLists: true }).trim()
}

// ------------------------------------------------------------------ references and pictures

/** Names injected with `${name}`, in reading order. */
export function references(text: DisplayText): string[] {
  if (typeof text === 'string')
    return [...text.matchAll(TOKEN)].map((m) => (m[1] ?? '').trim()).filter(Boolean)
  const out: string[] = []
  for (const n of walk(text))
    if (n.type === 'interp' && typeof n.attrs?.['name'] === 'string') out.push(n.attrs['name'])
  return out
}

/** Image ids shown by the text, in reading order (a repeat is listed once). */
export function imageRefs(text: DisplayText): string[] {
  if (typeof text === 'string') return []
  const out: string[] = []
  for (const n of walk(text)) {
    if (n.type !== 'image') continue
    const id = imageIdOf(n.attrs?.['src'])
    if (id && !out.includes(id)) out.push(id)
  }
  return out
}

/**
 * The text with every picture of image `from` pointing at `to`, or removed when `to` is
 * undefined. Unchanged texts are returned as is (same object).
 */
export function retargetImage(
  text: DisplayText,
  from: string,
  to: string | undefined,
): DisplayText {
  if (typeof text === 'string' || !imageRefs(text).includes(from)) return text
  const map = (node: PmNode): PmNode[] => {
    if (node.type === 'image' && imageIdOf(node.attrs?.['src']) === from)
      return to ? [{ ...node, attrs: { ...node.attrs, src: imageSrc(to) } }] : []
    if (!node.content) return [node]
    return [{ ...node, content: node.content.flatMap(map) }]
  }
  return simplify(map(text)[0] as PmDoc)
}

/** The text with a picture first, on its own line. */
export function prependImage(text: DisplayText, id: string): PmDoc {
  const image: PmNode = { type: 'image', attrs: { src: imageSrc(id), alt: null } }
  const doc = typeof text === 'string' ? fromPlainDoc(text) : text
  const [first, ...rest] = doc.content ?? []
  if (first?.type === 'paragraph') {
    const inline = first.content ?? []
    const content = inline.length ? [image, { type: 'hardBreak' }, ...inline] : [image]
    return { ...doc, content: [{ ...first, content }, ...rest] }
  }
  return { ...doc, content: [{ type: 'paragraph', content: [image] }, ...(doc.content ?? [])] }
}

// ------------------------------------------------------------------ plain strings

/** One paragraph of plain text: `${name}` tokens become `interp`, newlines line breaks. */
export function fromPlainDoc(text: string): PmDoc {
  const content: PmNode[] = []
  text.split('\n').forEach((line, i) => {
    if (i > 0) content.push({ type: 'hardBreak' })
    let last = 0
    for (const match of line.matchAll(TOKEN)) {
      const start = match.index ?? 0
      if (start > last) content.push({ type: 'text', text: line.slice(last, start) })
      const name = (match[1] ?? '').trim()
      if (name) content.push({ type: 'interp', attrs: { name } })
      last = start + match[0].length
    }
    if (last < line.length) content.push({ type: 'text', text: line.slice(last) })
  })
  return {
    type: 'doc',
    content: [content.length ? { type: 'paragraph', content } : { type: 'paragraph' }],
  }
}

/** Plain text with optional `${name}` tokens, as a display text. */
export function fromPlain(text: string): DisplayText {
  return simplify(fromPlainDoc(text))
}
