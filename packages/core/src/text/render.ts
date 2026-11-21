import { isEmptyParagraph, normalize, paragraph } from './normalize.js'
import { imageIdOf, imageSrc, type DisplayText, type PmDoc, type PmNode } from './schema.js'

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

/**
 * A plain string when the document is one paragraph of unmarked text and `${name}` (the string
 * form says the same, so it costs no extension); `''` when it is empty.
 */
export function simplify(doc: PmDoc): DisplayText {
  const blocks = doc.content ?? []
  if (blocks.length === 0 || (blocks.length === 1 && isEmptyParagraph(blocks[0]!))) return ''
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
  return doc
}

type Interp = (name: string) => string
const asToken: Interp = (name) => `\${${name}}`
const LIST_TYPES = new Set(['bulletList', 'orderedList'])

// ------------------------------------------------------------------ blocks as lines

/**
 * Blocks are lines, as `tricc_oo/text/render.py` writes them: each paragraph or list item
 * starts a line, an empty paragraph is a blank line, a `hardBreak` a line break; the lines
 * of a list item are indented under its marker.
 */
function renderBlocks(blocks: PmNode[], inline: (c: PmNode[]) => string, bullet: string): string {
  const lines: string[] = []
  for (const block of blocks) {
    if (block.type === 'paragraph') lines.push(inline(block.content ?? []))
    else if (LIST_TYPES.has(block.type)) {
      const start = typeof block.attrs?.['start'] === 'number' ? block.attrs['start'] : 1
      ;(block.content ?? []).forEach((item, i) => {
        const prefix = block.type === 'orderedList' ? `${start + i}. ` : bullet
        const body = renderBlocks(item.content ?? [], inline, bullet)
        lines.push(prefix + body.replace(/\n/g, `\n${' '.repeat(prefix.length)}`))
      })
    }
  }
  return lines.join('\n')
}

// ------------------------------------------------------------------ plain text

function inlinePlain(content: PmNode[], interp: Interp): string {
  return content
    .map((n) =>
      n.type === 'text'
        ? (n.text ?? '')
        : n.type === 'hardBreak'
          ? '\n'
          : n.type === 'interp'
            ? interp(String(n.attrs?.['name'] ?? ''))
            : n.type === 'image'
              ? String(n.attrs?.['alt'] || '')
              : '',
    )
    .join('')
}

/**
 * The text without any markup: line breaks kept, list items `• ` / `1. `, `${name}` as
 * `interp(name)` (as written by default), a picture as its `alt` (or nothing).
 */
export function toPlain(text: DisplayText, interp: Interp = asToken): string {
  if (typeof text === 'string') return text.replace(TOKEN, (_, name: string) => interp(name.trim()))
  return renderBlocks(text.content ?? [], (c) => inlinePlain(c, interp), '• ').trim()
}

// ------------------------------------------------------------------ Markdown

/** Marks Markdown can write, outermost first. */
const MARKDOWN_MARKS = ['bold', 'italic'] as const

interface Segment {
  marks: Set<string>
  text: string
  /** Text whose edge spaces may leave its marks. */
  isText: boolean
}

function segments(content: PmNode[], interp: Interp): Segment[] {
  return content.flatMap((node): Segment[] => {
    const marks = new Set(
      (node.marks ?? [])
        .map((m) => m.type)
        .filter((t) => (MARKDOWN_MARKS as readonly string[]).includes(t)),
    )
    if (node.type === 'text') return [{ marks, text: node.text ?? '', isText: true }]
    if (node.type === 'interp')
      return [{ marks, text: interp(String(node.attrs?.['name'] ?? '')), isText: false }]
    if (node.type === 'hardBreak') return [{ marks: new Set(), text: '\n', isText: false }]
    if (node.type === 'image') {
      const alt = String(node.attrs?.['alt'] ?? '').replace(/[[\]]/g, '')
      return [
        { marks: new Set(), text: `![${alt}](${String(node.attrs?.['src'])})`, isText: false },
      ]
    }
    return []
  })
}

const both = (a: Set<string>, b: Set<string>) => new Set([...a].filter((m) => b.has(m)))
const sameSet = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((m) => b.has(m))

/**
 * Spaces at the edge of a marked run go outside the markers: the leading spaces of a node
 * keep only the marks it shares with the node before, the trailing ones those it shares with
 * the node after.
 */
function expelWhitespace(segs: Segment[]): { marks: Set<string>; text: string }[] {
  const none = new Set<string>()
  const out: { marks: Set<string>; text: string }[] = []
  segs.forEach(({ marks, text, isText }, i) => {
    if (!isText || marks.size === 0) {
      out.push({ marks, text })
      return
    }
    const before = i > 0 ? segs[i - 1]!.marks : none
    const after = i + 1 < segs.length ? segs[i + 1]!.marks : none
    const core = text.trim()
    if (!core) {
      out.push({ marks: both(both(marks, before), after), text })
      return
    }
    const lead = text.slice(0, text.length - text.trimStart().length)
    const trail = text.slice(text.trimEnd().length)
    if (lead) out.push({ marks: both(marks, before), text: lead })
    out.push({ marks, text: core })
    if (trail) out.push({ marks: both(marks, after), text: trail })
  })
  const merged: { marks: Set<string>; text: string }[] = []
  for (const seg of out) {
    const last = merged[merged.length - 1]
    if (last && sameSet(last.marks, seg.marks)) last.text += seg.text
    else merged.push({ ...seg })
  }
  return merged
}

/**
 * Markdown of a paragraph's content: marks opened and closed around runs, so
 * `**Give ${dose} mg**` stays one span; bold outside italic; underline and colour have no
 * Markdown and are dropped; text is not escaped. `italic` is `*` when the Markdown is read
 * again (an intraword `_` is not emphasis).
 */
export function inlineMarkdown(
  content: PmNode[],
  italic: '_' | '*' = '_',
  interp: Interp = asToken,
): string {
  const wrap: Record<string, string> = { bold: '**', italic }
  const out: string[] = []
  const stack: string[] = []
  for (const { marks, text } of expelWhitespace(segments(content, interp))) {
    let keep = 0
    while (keep < stack.length && marks.has(stack[keep]!)) keep++
    while (stack.length > keep) out.push(wrap[stack.pop()!]!)
    for (const mark of MARKDOWN_MARKS)
      if (marks.has(mark) && !stack.includes(mark)) {
        stack.push(mark)
        out.push(wrap[mark]!)
      }
    out.push(text)
  }
  while (stack.length) out.push(wrap[stack.pop()!]!)
  return out.join('')
}

/**
 * Markdown as ODK and CHT render it: `**bold**`, `_italic_`, `- ` / `1. ` list items, a line
 * break as a newline, an empty paragraph as a blank line, `${name}` as `interp(name)` (as
 * written by default), a picture as `![alt](Binary/<id>)`. A plain string is its own Markdown.
 */
export function toMarkdown(text: DisplayText, interp: Interp = asToken): string {
  if (typeof text === 'string') return text
  return renderBlocks(text.content ?? [], (c) => inlineMarkdown(c, '_', interp), '- ')
}

// ------------------------------------------------------------------ references and pictures

/** Names injected with `${name}`, in reading order, each once. */
export function references(text: DisplayText): string[] {
  const names =
    typeof text === 'string'
      ? [...text.matchAll(TOKEN)].map((m) => (m[1] ?? '').trim()).filter(Boolean)
      : [...walk(text)].flatMap((n) =>
          n.type === 'interp' && typeof n.attrs?.['name'] === 'string' ? [n.attrs['name']] : [],
        )
  return [...new Set(names)]
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
  return simplify(normalize(map(text)[0] as PmDoc))
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
  // Not normalised: a plain field keeps its spaces while the author types.
  return { type: 'doc', content: [paragraph(content)] }
}

/** Plain text with optional `${name}` tokens, as a display text. */
export function fromPlain(text: string): DisplayText {
  return simplify(fromPlainDoc(text))
}
