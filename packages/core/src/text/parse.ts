import MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import { parseHTML } from 'linkedom'
import { DOMParser as PmDOMParser } from 'prosemirror-model'
import {
  cleanInline,
  emptyDoc,
  interpNode,
  mapParagraphs,
  normalize,
  paragraph,
  textNode,
} from './normalize.js'
import { inlineMarkdown } from './render.js'
import { imageIdOf, isColor, textSchema, type PmDoc, type PmMark, type PmNode } from './schema.js'

/**
 * Reading display text into a document: draw.io label HTML, Markdown (YAML labels, typed
 * Markdown, a designation's `value`), stored JSON, and the old `designation-message` tree.
 * Every reader returns the canonical form (`normalize`). The rules are those of
 * `tricc_oo/text/parse.py` (feature/20261120-prosemirror-display-text.md §1.2); the shared
 * fixtures hold both sides to them.
 */

const TOKEN = /\$\{([^}]+)\}/g

// ------------------------------------------------------------------ JSON

function checkNode(raw: unknown): void {
  if (typeof raw !== 'object' || raw === null || (raw as PmNode).type !== 'doc')
    throw new Error('Not a display-text document.')
  const node = textSchema.nodeFromJSON(raw)
  node.check()
  node.descendants((n) => {
    for (const mark of n.marks)
      if (mark.type.name === 'textStyle' && !isColor(mark.attrs['color']))
        throw new Error(`Not a colour: ${JSON.stringify(mark.attrs['color'])}`)
    if (n.type.name === 'image' && !imageIdOf(n.attrs['src']))
      throw new Error(`Not a project image: ${JSON.stringify(n.attrs['src'])}`)
    if (n.type.name === 'interp' && !String(n.attrs['name'] ?? '').trim())
      throw new Error('A data reference without a name.')
  })
}

/**
 * A stored document (the editor's JSON) in canonical form, checked against the schema:
 * unknown nodes or marks, invalid content, a colour that is not one and a picture outside the
 * image library are rejected, not half-read. Attributes the schema does not know (TipTap's
 * `orderedList.type`) are dropped. (Core already exports `fromJson` for project files.)
 */
export function docFromJson(raw: unknown): PmDoc {
  checkNode(raw)
  return normalize(textSchema.nodeFromJSON(raw).toJSON() as PmDoc)
}

// ------------------------------------------------------------------ Markdown

/** `${name}` as an inline token, tried before plain text (`$` ends a text run). */
function interpRule(state: StateInline, silent: boolean): boolean {
  const src = state.src
  const pos = state.pos
  if (src.charCodeAt(pos) !== 0x24 /* $ */ || src.charCodeAt(pos + 1) !== 0x7b /* { */) return false
  const end = src.indexOf('}', pos + 2)
  if (end < 0) return false
  const name = src.slice(pos + 2, end).trim()
  if (!name) return false
  if (!silent) {
    const token = state.push('interp', '', 0)
    token.meta = { name }
  }
  state.pos = end + 1
  return true
}

/**
 * markdown-it, preset `zero` with lists, emphasis, line breaks and pictures, plus `${name}`.
 * Headings, links, code, escapes and entities stay text.
 */
const tokenizer = new MarkdownIt('zero').enable(['list', 'emphasis', 'newline', 'image'])
tokenizer.inline.ruler.before('text', 'interp', interpRule)

const MARK_OF: Record<string, string> = {
  strong_open: 'bold',
  strong_close: 'bold',
  em_open: 'italic',
  em_close: 'italic',
}

function inlineFromTokens(tokens: Token[]): PmNode[] {
  const content: PmNode[] = []
  const marks: string[] = []
  const current = (): PmMark[] => marks.map((type) => ({ type }))
  for (const token of tokens) {
    const kind = token.type
    if (kind === 'strong_open' || kind === 'em_open') marks.push(MARK_OF[kind]!)
    else if (kind === 'strong_close' || kind === 'em_close') {
      const at = marks.lastIndexOf(MARK_OF[kind]!)
      if (at >= 0) marks.splice(at, 1)
    } else if (kind === 'softbreak' || kind === 'hardbreak') content.push({ type: 'hardBreak' })
    else if (kind === 'interp') content.push(interpNode(String(token.meta?.name), current()))
    else if (kind === 'image') {
      const src = token.attrGet('src')
      if (imageIdOf(src))
        content.push({ type: 'image', attrs: { src, alt: token.content || null } })
      // A picture that is not in the image library stays as typed.
      else content.push(textNode(`![${token.content}](${src ?? ''})`, current()))
    } else if (token.content) content.push(textNode(token.content, current()))
  }
  return cleanInline(content)
}

interface Frame {
  blocks: PmNode[]
  lines: [number, number][]
  type?: string
  attrs?: Record<string, unknown>
  items?: PmNode[]
  start?: number
  end?: number
}

/**
 * Blocks from markdown-it block tokens. Top-level blocks the source keeps apart by a blank
 * line get an empty paragraph between them (the canonical blank line).
 */
function blocksFromTokens(tokens: Token[]): PmNode[] {
  const frames: Frame[] = [{ blocks: [], lines: [] }]
  for (const token of tokens) {
    const frame = frames[frames.length - 1]!
    const map = token.map ?? [0, 0]
    if (token.type === 'paragraph_open') {
      frame.blocks.push(paragraph())
      frame.lines.push([map[0], map[1]])
    } else if (token.type === 'inline') {
      frame.blocks[frame.blocks.length - 1] = paragraph(inlineFromTokens(token.children ?? []))
      // Where the text ends (a list's map counts the blank line after it).
      for (const outer of frames) outer.end = map[1]
    } else if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
      const ordered = token.type === 'ordered_list_open'
      frames.push({
        blocks: [],
        lines: [],
        type: ordered ? 'orderedList' : 'bulletList',
        ...(ordered ? { attrs: { start: Number(token.attrGet('start') ?? 1) || 1 } } : {}),
        items: [],
        start: map[0],
      })
    } else if (token.type === 'list_item_open') frames.push({ blocks: [], lines: [] })
    else if (token.type === 'list_item_close') {
      const item = frames.pop()!
      frames[frames.length - 1]!.items!.push({ type: 'listItem', content: item.blocks })
    } else if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') {
      const list = frames.pop()!
      const node: PmNode = { type: list.type!, content: list.items! }
      if (list.attrs) node.attrs = list.attrs
      const parent = frames[frames.length - 1]!
      parent.blocks.push(node)
      parent.lines.push([list.start!, list.end ?? list.start!])
    }
  }
  const top = frames[0]!
  const out: PmNode[] = []
  let previousEnd: number | undefined
  top.blocks.forEach((block, i) => {
    const [start, end] = top.lines[i]!
    if (previousEnd !== undefined && start > previousEnd) out.push(paragraph())
    out.push(block)
    previousEnd = end
  })
  return out
}

/**
 * Markdown (a YAML label, a designation's `value`, Markdown typed in a label) as a document:
 * a newline is a line break, a blank line an empty paragraph, `${name}` is data.
 */
export function fromMarkdown(markdown: string): PmDoc {
  if (!markdown.trim()) return emptyDoc()
  return normalize({ type: 'doc', content: blocksFromTokens(tokenizer.parse(markdown, {})) })
}

// ------------------------------------------------------------------ HTML

const domParser = PmDOMParser.fromSchema(textSchema)

/** A non-breaking space is a space, before the parser collapses white space. */
function plainSpaces(node: globalThis.Node): void {
  if (node.nodeType === 3 && node.nodeValue?.includes('\u00a0'))
    node.nodeValue = node.nodeValue.replace(/\u00a0/g, ' ')
  node.childNodes.forEach(plainSpaces)
}

/**
 * `${name}` in text becomes an `interp` node, also when the token spans several text nodes
 * (`<span>$</span>{dose}`); it takes the marks of the text holding its `$`.
 */
function splitInterpsInline(content: PmNode[]): PmNode[] {
  const out: PmNode[] = []
  let run: PmNode[] = []
  const flush = () => {
    if (!run.length) return
    const source = run.map((n) => n.text ?? '').join('')
    if (!source.includes('${')) {
      out.push(...run)
      run = []
      return
    }
    const owner: PmMark[][] = []
    for (const n of run) for (let i = 0; i < (n.text ?? '').length; i++) owner.push(n.marks ?? [])
    const same = (a: PmMark[], b: PmMark[]) => JSON.stringify(a) === JSON.stringify(b)
    const addText = (start: number, end: number) => {
      let i = start
      while (i < end) {
        let j = i
        while (j < end && same(owner[j]!, owner[i]!)) j++
        out.push(textNode(source.slice(i, j), owner[i]))
        i = j
      }
    }
    let last = 0
    for (const match of source.matchAll(TOKEN)) {
      const name = (match[1] ?? '').trim()
      if (!name) continue
      const start = match.index ?? 0
      addText(last, start)
      out.push(interpNode(name, owner[start]))
      last = start + match[0].length
    }
    addText(last, source.length)
    run = []
  }
  for (const node of content) {
    if (node.type === 'text') run.push(node)
    else {
      flush()
      out.push(node)
    }
  }
  flush()
  return cleanInline(out)
}

/** Every `${name}` in the text of `doc` as an `interp` node. */
export function splitInterps(doc: PmDoc): PmDoc {
  return {
    ...doc,
    content: mapParagraphs(doc.content ?? [], (block) => [
      paragraph(splitInterpsInline(block.content ?? [])),
    ]),
  }
}

/**
 * A draw.io label (HTML) as a document: the schema's parse rules keep what it can hold and
 * drop the rest (as the browser editor does); `&nbsp;` is a space; `${name}` becomes data;
 * Markdown typed in a paragraph is read as Markdown (§1.2).
 */
export function fromHtml(raw: string): PmDoc {
  if (!raw.trim()) return emptyDoc()
  const { document } = parseHTML(`<!doctype html><html><body>${raw}</body></html>`)
  const body = document.body as unknown as globalThis.Node
  plainSpaces(body)
  const parsed = domParser.parse(body).toJSON() as PmDoc
  return normalize(readTypedMarkdown(normalize(splitInterps(parsed))))
}

// ------------------------------------------------------------------ typed Markdown (§1.2)

/** A paragraph is read again as typed Markdown when its text holds one of these. */
const TYPED_MARKDOWN = /[*_]|(^|\n)[ \t]*([-+]|\d{1,9}[.)])[ \t]/
const NON_MARKDOWN_MARKS = new Set(['underline', 'textStyle'])

function plainOf(content: PmNode[]): string {
  return content
    .map((n) => (n.type === 'text' ? (n.text ?? '') : n.type === 'hardBreak' ? '\n' : 'x'))
    .join('')
}

/**
 * Markdown typed into the paragraphs of an imported label (`**bold**`, `* item`, `1. item`)
 * read as marks and lists. The paragraph is written as Markdown with its own marks first, so
 * markers spread over several elements meet. A paragraph with underline or a colour is kept
 * as typed (Markdown has neither); one in a list item only when it stays one paragraph.
 */
export function readTypedMarkdown(doc: PmDoc): PmDoc {
  const fn = (block: PmNode, top: boolean): PmNode[] => {
    const content = block.content ?? []
    if (!TYPED_MARKDOWN.test(plainOf(content))) return [block]
    if (content.some((n) => (n.marks ?? []).some((m) => NON_MARKDOWN_MARKS.has(m.type))))
      return [block]
    const tokens = tokenizer.parse(inlineMarkdown(content, '*'), {})
    const typed = tokens.some(
      (t) =>
        t.type === 'bullet_list_open' ||
        t.type === 'ordered_list_open' ||
        (t.children ?? []).some((c) => c.type === 'strong_open' || c.type === 'em_open'),
    )
    if (!typed) return [block]
    const blocks = blocksFromTokens(tokens)
    if (!top && (blocks.length !== 1 || blocks[0]!.type !== 'paragraph')) return [block]
    return blocks.length ? blocks : [block]
  }
  return { ...doc, content: mapParagraphs(doc.content ?? [], fn) }
}

// ------------------------------------------------------------------ the old tree (§1.3)

type Json = Record<string, unknown>
const OLD_MARKS: Record<string, string> = { strong: 'bold', em: 'italic', u: 'underline' }

function oldMark(node: Json): PmMark | undefined {
  const kind = node['kind']
  if (kind === 'color')
    return isColor(node['color'])
      ? { type: 'textStyle', attrs: { color: node['color'] } }
      : undefined
  if (typeof kind === 'string' && OLD_MARKS[kind]) return { type: OLD_MARKS[kind]! }
  throw new Error(`Unknown mark kind ${JSON.stringify(kind)}.`)
}

function asNodes(value: unknown): Json[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new Error('Message children are not a list.')
  return value as Json[]
}

function oldInline(nodes: unknown, marks: PmMark[], out: PmNode[]): void {
  for (const node of asNodes(nodes)) {
    if (typeof node !== 'object' || node === null) throw new Error('Message node is not an object.')
    const kind = node['type']
    if (kind === 'text') {
      if (node['value']) out.push(textNode(String(node['value']), marks))
    } else if (kind === 'interp') out.push(interpNode(String(node['name']), marks))
    else if (kind === 'break') out.push({ type: 'hardBreak' })
    else if (kind === 'image') {
      if (imageIdOf(node['src']))
        out.push({ type: 'image', attrs: { src: node['src'], alt: node['alt'] || null } })
    } else if (kind === 'mark') {
      const mark = oldMark(node)
      oldInline(node['children'], mark ? [...marks, mark] : marks, out)
    } else if (kind === 'list') {
      // A list inside a phrase cannot be one in a document: its items stay as lines.
      asNodes(node['items']).forEach((item, i) => {
        out.push({ type: 'hardBreak' }, textNode(node['ordered'] ? `${i + 1}. ` : '- ', marks))
        oldInline(item['children'], marks, out)
      })
    } else throw new Error(`Unknown message node type ${JSON.stringify(kind)}.`)
  }
}

/**
 * The old `designation-message` tree (read only, never written). A list at the top is a
 * block; one inside a phrase keeps its items as lines; a mark goes onto every leaf under it.
 * An unknown node or mark is rejected; a colour that is not one, or a picture outside the
 * image library, is dropped.
 */
export function fromMessageJson(raw: unknown): PmDoc {
  const data = raw as Json
  if (typeof data !== 'object' || data === null || data['type'] !== 'message')
    throw new Error('Not a display-text message.')
  const blocks: PmNode[] = []
  let inline: PmNode[] = []
  const flush = () => {
    blocks.push(paragraph(inline))
    inline = []
  }
  for (const node of asNodes(data['children'])) {
    if (node?.['type'] === 'list') {
      if (inline.length) flush()
      const items = asNodes(node['items']).map((item) => {
        const content: PmNode[] = []
        oldInline(item['children'], [], content)
        return { type: 'listItem', content: [paragraph(content)] }
      })
      if (items.length)
        blocks.push(
          node['ordered']
            ? { type: 'orderedList', attrs: { start: 1 }, content: items }
            : { type: 'bulletList', content: items },
        )
    } else oldInline([node], [], inline)
  }
  if (inline.length || !blocks.length) flush()
  return normalize({ type: 'doc', content: blocks })
}
