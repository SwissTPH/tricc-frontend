import MarkdownIt from 'markdown-it'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import { parseHTML } from 'linkedom'
import { MarkdownParser } from 'prosemirror-markdown'
import { DOMParser as PmDOMParser, type Node as PmModelNode } from 'prosemirror-model'
import { toMarkdown } from './render.js'
import { imageIdOf, isColor, textSchema, type PmDoc, type PmMark, type PmNode } from './schema.js'

/**
 * Reading display text into a document: draw.io label HTML, Markdown (YAML labels, typed
 * Markdown, a designation's `value`), stored JSON, and the old `designation-message` tree.
 * The rules follow `tricc_oo/text/parse.py` (feature/20261120-prosemirror-display-text.md §1.2).
 */

const TOKEN = /\$\{([^}]+)\}/g
const EMPTY: PmDoc = { type: 'doc', content: [{ type: 'paragraph' }] }

// ------------------------------------------------------------------ JSON

/**
 * A stored document, checked against the schema: unknown nodes, marks or attributes, invalid
 * content, a colour that is not one and a picture outside the image library are rejected,
 * not half-read.
 */
export function docFromJson(raw: unknown): PmDoc {
  if (typeof raw !== 'object' || raw === null || (raw as PmNode).type !== 'doc')
    throw new Error('Not a display-text document.')
  const node = textSchema.nodeFromJSON(raw)
  node.check()
  node.descendants((n) => {
    for (const mark of n.marks)
      if (
        mark.type.name === 'textStyle' &&
        mark.attrs['color'] !== null &&
        !isColor(mark.attrs['color'])
      )
        throw new Error(`Not a colour: ${JSON.stringify(mark.attrs['color'])}`)
    if (n.type.name === 'image' && !imageIdOf(n.attrs['src']))
      throw new Error(`Not a project image: ${JSON.stringify(n.attrs['src'])}`)
    if (n.type.name === 'interp' && (typeof n.attrs['name'] !== 'string' || !n.attrs['name']))
      throw new Error('A data reference without a name.')
  })
  return node.toJSON() as PmDoc
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
    token.content = name
  }
  state.pos = end + 1
  return true
}

const tokenizer = new MarkdownIt('zero', { breaks: true }).enable([
  'list',
  'emphasis',
  'newline',
  'image',
])
tokenizer.inline.ruler.before('text', 'interp', interpRule)

const markdownParser = new MarkdownParser(textSchema, tokenizer, {
  paragraph: { block: 'paragraph' },
  list_item: { block: 'listItem' },
  bullet_list: { block: 'bulletList' },
  ordered_list: {
    block: 'orderedList',
    getAttrs: (tok) => ({ start: Number(tok.attrGet('start')) || 1 }),
  },
  hardbreak: { node: 'hardBreak' },
  softbreak: { node: 'hardBreak' },
  em: { mark: 'italic' },
  strong: { mark: 'bold' },
  image: {
    node: 'image',
    getAttrs: (tok) => ({
      src: tok.attrGet('src'),
      alt: (tok.children?.[0]?.content ?? '') || null,
    }),
  },
  interp: { node: 'interp', noCloseToken: true, getAttrs: (tok) => ({ name: tok.content }) },
})

/**
 * Markdown as `tricc_oo` reads it (markdown-it, preset `zero` plus lists, emphasis, newlines
 * and images, a newline being a line break), with `${name}` as data. No HTML, no escapes.
 */
export function fromMarkdown(markdown: string): PmDoc {
  const doc = markdownParser.parse(markdown.replace(/ /g, ' ')) as PmModelNode
  return dropForeignImages(doc.toJSON() as PmDoc)
}

/** A picture typed in Markdown that is not in the image library is not ours to show. */
function dropForeignImages(doc: PmDoc): PmDoc {
  const map = (node: PmNode): PmNode[] => {
    if (node.type === 'image' && !imageIdOf(node.attrs?.['src'])) return []
    if (!node.content) return [node]
    return [{ ...node, content: node.content.flatMap(map) }]
  }
  return map(doc)[0] as PmDoc
}

// ------------------------------------------------------------------ HTML

const domParser = PmDOMParser.fromSchema(textSchema)

/**
 * A draw.io label (HTML) as a document: the schema's parse rules keep what it can hold and
 * drop the rest (as the browser editor does); `&nbsp;` is a space; `${name}` becomes data even
 * when split over elements; a trailing `<br>` goes; a paragraph with Markdown typed in it is
 * read again as Markdown (§1.2).
 */
export function fromHtml(raw: string): PmDoc {
  const trimmed = raw.trim()
  if (!trimmed) return EMPTY
  const { document } = parseHTML(`<!doctype html><html><body>${trimmed}</body></html>`)
  const parsed = domParser.parse(document.body as unknown as globalThis.Node).toJSON() as PmDoc
  const tidy = mapTextblocks(parsed, tidyInline) as PmDoc
  return docFromJson(readTypedMarkdown(tidy))
}

function mapTextblocks(node: PmNode, f: (inline: PmNode[]) => PmNode[]): PmNode {
  if (node.type === 'paragraph') {
    const content = f(node.content ?? [])
    const { content: _, ...rest } = node
    return content.length ? { ...rest, content } : rest
  }
  if (!node.content) return node
  return { ...node, content: node.content.map((c) => mapTextblocks(c, f)) }
}

const sameMarks = (a: PmMark[] | undefined, b: PmMark[] | undefined) =>
  JSON.stringify(a ?? []) === JSON.stringify(b ?? [])

function textNode(text: string, marks: PmMark[] | undefined): PmNode {
  return marks?.length ? { type: 'text', text, marks } : { type: 'text', text }
}

/** Neighbouring text with the same marks is one text node, as ProseMirror keeps it. */
function joinText(nodes: PmNode[]): PmNode[] {
  const out: PmNode[] = []
  for (const node of nodes) {
    if (node.type === 'text' && !node.text) continue
    const last = out[out.length - 1]
    if (last?.type === 'text' && node.type === 'text' && sameMarks(last.marks, node.marks))
      out[out.length - 1] = textNode((last.text ?? '') + (node.text ?? ''), last.marks)
    else out.push(node)
  }
  return out
}

function tidyInline(inline: PmNode[]): PmNode[] {
  let nodes = joinText(
    inline.map((n) =>
      n.type === 'text' ? textNode((n.text ?? '').replace(/ /g, ' '), n.marks) : n,
    ),
  )
  nodes = splitTokens(nodes)
  // Line breaks and spaces at the edges of a paragraph show nothing.
  while (nodes.length && nodes[nodes.length - 1]!.type === 'hardBreak') nodes.pop()
  while (nodes.length && nodes[0]!.type === 'hardBreak') nodes.shift()
  const first = nodes[0]
  if (first?.type === 'text') nodes[0] = textNode((first.text ?? '').trimStart(), first.marks)
  const last = nodes[nodes.length - 1]
  if (last?.type === 'text')
    nodes[nodes.length - 1] = textNode((last.text ?? '').trimEnd(), last.marks)
  return joinText(nodes)
}

/**
 * `${name}` tokens in a run of text nodes become `interp` nodes, even when the token spans
 * several nodes (`<span>$</span>{dose}`); the data takes the marks of its `$`.
 */
function splitTokens(nodes: PmNode[]): PmNode[] {
  const out: PmNode[] = []
  let run: PmNode[] = []
  const flush = () => {
    if (run.length) out.push(...splitRun(run))
    run = []
  }
  for (const node of nodes) {
    if (node.type === 'text') run.push(node)
    else {
      flush()
      out.push(node)
    }
  }
  flush()
  return out
}

function splitRun(run: PmNode[]): PmNode[] {
  const text = run.map((n) => n.text ?? '').join('')
  if (!text.includes('${')) return run
  // The marks of each character, to cut the run back into text nodes.
  const marksAt: (PmMark[] | undefined)[] = []
  for (const n of run) for (let i = 0; i < (n.text ?? '').length; i++) marksAt.push(n.marks)
  const out: PmNode[] = []
  const pushText = (from: number, to: number) => {
    for (let i = from; i < to; i++) out.push(textNode(text[i]!, marksAt[i]))
  }
  let last = 0
  for (const match of text.matchAll(TOKEN)) {
    const start = match.index ?? 0
    const name = (match[1] ?? '').trim()
    if (!name) continue
    pushText(last, start)
    const marks = marksAt[start]
    out.push(
      marks?.length
        ? { type: 'interp', attrs: { name }, marks }
        : { type: 'interp', attrs: { name } },
    )
    last = start + match[0].length
  }
  pushText(last, text.length)
  return joinText(out)
}

/** Markdown markers: `*` or `_` (emphasis) or a line starting a list item. */
const TYPED_MARKDOWN = /[*_]|(?:^|\n)[ \t]*(?:[-+]|\d{1,9}[.)])[ \t]/

function paragraphText(p: PmNode): string {
  return (p.content ?? [])
    .map((n) => (n.type === 'text' ? (n.text ?? '') : n.type === 'hardBreak' ? '\n' : ''))
    .join('')
}

/**
 * A top-level paragraph whose text holds Markdown markers is written as Markdown with its own
 * marks (so markers spread over several HTML elements meet) and read again. A paragraph with
 * a colour or an underline is kept as is: Markdown would lose them.
 */
function readTypedMarkdown(doc: PmDoc): PmDoc {
  const blocks: PmNode[] = []
  let lastRead = false
  for (const block of doc.content ?? []) {
    const marks = (block.content ?? []).flatMap((n) => n.marks ?? [])
    const typed =
      block.type === 'paragraph' &&
      TYPED_MARKDOWN.test(paragraphText(block)) &&
      !marks.some((m) => m.type === 'textStyle' || m.type === 'underline')
    if (!typed) {
      blocks.push(block)
      lastRead = false
      continue
    }
    const reread = fromMarkdown(toMarkdown({ type: 'doc', content: [block] })).content ?? []
    for (const b of reread) {
      const prev = blocks[blocks.length - 1]
      // `* a` and `* b` in two lines of the label are one list.
      if (lastRead && prev && prev.type === b.type && b.type === 'bulletList')
        blocks[blocks.length - 1] = {
          ...prev,
          content: [...(prev.content ?? []), ...(b.content ?? [])],
        }
      else if (lastRead && prev && prev.type === b.type && b.type === 'orderedList')
        blocks[blocks.length - 1] = {
          ...prev,
          content: [...(prev.content ?? []), ...(b.content ?? [])],
        }
      else blocks.push(b)
      lastRead = true
    }
  }
  return { ...doc, content: blocks }
}

// ------------------------------------------------------------------ the old tree

type OldNode =
  | { type: 'text'; value: string }
  | { type: 'interp'; name: string }
  | { type: 'break' }
  | { type: 'mark'; kind: 'strong' | 'em' | 'u' | 'color'; color?: string; children: OldNode[] }
  | { type: 'list'; ordered: boolean; items: OldNode[][] }
  | { type: 'image'; src: string; alt?: string }

function oldTree(raw: unknown): OldNode[] {
  const node = (v: unknown): OldNode => {
    const o = v as Record<string, unknown>
    switch (o?.['type']) {
      case 'text':
        if (typeof o['value'] !== 'string') break
        return { type: 'text', value: o['value'] }
      case 'interp':
        if (typeof o['name'] !== 'string' || !o['name']) break
        return { type: 'interp', name: o['name'] }
      case 'break':
        return { type: 'break' }
      case 'mark':
        if (o['kind'] === 'color') {
          if (!isColor(o['color'])) break
          return { type: 'mark', kind: 'color', color: o['color'], children: list(o['children']) }
        }
        if (o['kind'] !== 'strong' && o['kind'] !== 'em' && o['kind'] !== 'u') break
        return { type: 'mark', kind: o['kind'], children: list(o['children']) }
      case 'image':
        if (!imageIdOf(o['src'])) break
        return typeof o['alt'] === 'string' && o['alt']
          ? { type: 'image', src: o['src'] as string, alt: o['alt'] }
          : { type: 'image', src: o['src'] as string }
      case 'list':
        return {
          type: 'list',
          ordered: o['ordered'] === true,
          items: (Array.isArray(o['items']) ? o['items'] : []).map((item) =>
            list((item as Record<string, unknown>)['children']),
          ),
        }
    }
    throw new Error(`Not a display-text node: ${JSON.stringify(v)}`)
  }
  const list = (v: unknown): OldNode[] => (Array.isArray(v) ? v.map(node) : [])
  const o = raw as Record<string, unknown>
  if (o?.['type'] !== 'message') throw new Error('Not a display-text message.')
  return list(o['children'])
}

function oldMark(node: { kind: string; color?: string }): PmMark {
  if (node.kind === 'color') return { type: 'textStyle', attrs: { color: node.color } }
  return { type: node.kind === 'strong' ? 'bold' : node.kind === 'em' ? 'italic' : 'underline' }
}

/** Marks in schema order, as ProseMirror sorts them. */
const MARK_RANK = ['bold', 'italic', 'underline', 'textStyle']
const sortMarks = (marks: PmMark[]) =>
  [...marks].sort((a, b) => MARK_RANK.indexOf(a.type) - MARK_RANK.indexOf(b.type))

function oldInline(nodes: OldNode[], marks: PmMark[]): PmNode[] {
  const withMarks = marks.length ? { marks: sortMarks(marks) } : {}
  const out: PmNode[] = []
  for (const node of nodes) {
    if (node.type === 'text' && node.value)
      out.push({ type: 'text', text: node.value, ...withMarks })
    else if (node.type === 'interp')
      out.push({ type: 'interp', attrs: { name: node.name }, ...withMarks })
    else if (node.type === 'break') out.push({ type: 'hardBreak' })
    else if (node.type === 'image')
      out.push({ type: 'image', attrs: { src: node.src, alt: node.alt ?? null } })
    else if (node.type === 'mark') out.push(...oldInline(node.children, [...marks, oldMark(node)]))
    else if (node.type === 'list') {
      // A list inside a phrase cannot be one in a document: keep its items as lines.
      node.items.forEach((item, i) => {
        out.push({ type: 'hardBreak' }, { type: 'text', text: node.ordered ? `${i + 1}. ` : '- ' })
        out.push(...oldInline(item, marks))
      })
    }
  }
  return joinText(out)
}

/**
 * The old `designation-message` tree (read only, never written): top-level runs become one
 * paragraph each side of a list, a mark goes onto every leaf under it.
 */
export function fromMessageJson(raw: unknown): PmDoc {
  const blocks: PmNode[] = []
  let inline: OldNode[] = []
  const flush = () => {
    const content = oldInline(inline, [])
    if (content.length) blocks.push({ type: 'paragraph', content })
    inline = []
  }
  for (const node of oldTree(raw)) {
    if (node.type !== 'list') {
      inline.push(node)
      continue
    }
    flush()
    blocks.push({
      type: node.ordered ? 'orderedList' : 'bulletList',
      ...(node.ordered ? { attrs: { start: 1 } } : {}),
      content: node.items.map((item) => {
        const content = oldInline(item, [])
        return {
          type: 'listItem',
          content: [content.length ? { type: 'paragraph', content } : { type: 'paragraph' }],
        }
      }),
    })
  }
  flush()
  // A break that only separated a paragraph from a list shows nothing.
  for (const b of blocks) if (b.type === 'paragraph') b.content = tidyEdges(b.content ?? [])
  return docFromJson({ type: 'doc', content: blocks.length ? blocks : [{ type: 'paragraph' }] })
}

function tidyEdges(nodes: PmNode[]): PmNode[] {
  const out = [...nodes]
  while (out.length && out[out.length - 1]!.type === 'hardBreak') out.pop()
  while (out.length && out[0]!.type === 'hardBreak') out.shift()
  return out
}
