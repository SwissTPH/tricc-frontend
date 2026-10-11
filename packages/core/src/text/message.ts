import type { Designation } from '../model/types.js'

/**
 * Display text as a tree: the `tricc_oo` message AST (`tricc_oo/models/message.py`,
 * `feature/20260909-display-message-ast.md`), in its JSON interchange form.
 *
 * The app writes this tree and `tricc_oo` reads it as is, so bold, lists and injected data
 * (`${name}`) come out the same in every export and language. Parsing and Markdown follow
 * `tricc_oo/visitors/text_injection.py` rule for rule; the shared fixtures test that.
 */

export type MessageNode =
  | { type: 'text'; value: string }
  | { type: 'interp'; name: string }
  | { type: 'break' }
  | { type: 'mark'; kind: MarkKind; children: MessageNode[]; color?: string }
  | { type: 'list'; ordered: boolean; items: MessageItem[] }

/** `color` carries a CSS colour in `color` (`#rrggbb` or a colour name). */
export type MarkKind = 'strong' | 'em' | 'u' | 'color'

const COLOR = /^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i

export function isColor(value: unknown): value is string {
  return typeof value === 'string' && COLOR.test(value)
}
export interface MessageItem {
  type: 'item'
  children: MessageNode[]
}
export interface Message {
  type: 'message'
  children: MessageNode[]
}

/** A plain string when the text has no structure, as `tricc_oo` `_simplify_message` keeps it. */
export type DisplayText = string | Message

const TOKEN = /\$\{([^}]+)\}/g

// ------------------------------------------------------------------ plain text

/** Split `${name}` tokens out of plain text. */
export function splitTokens(text: string): MessageNode[] {
  const out: MessageNode[] = []
  let last = 0
  for (const match of text.matchAll(TOKEN)) {
    const start = match.index ?? 0
    if (start > last) out.push({ type: 'text', value: text.slice(last, start) })
    const name = (match[1] ?? '').trim()
    if (name) out.push({ type: 'interp', name })
    last = start + match[0].length
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) })
  return out
}

/** Plain text with optional `${name}` tokens, as a display text. */
export function fromPlain(text: string): DisplayText {
  return simplify({ type: 'message', children: splitTokens(text) })
}

// ------------------------------------------------------------------ HTML subset

const DROP = new Set(['img', 'table', 'thead', 'tbody', 'tr', 'td', 'th'])
const UNWRAP = new Set(['span', 'font', 'a', 'html', 'body'])
const BLOCK = new Set(['div', 'p'])
const VOID = new Set(['br', 'img', 'hr', 'meta', 'link', 'input'])

interface HtmlElement {
  tag: string
  children: HtmlNode[]
}
type HtmlNode = HtmlElement | string

/** Parse draw.io-style HTML into a display text, the subset `tricc_oo` keeps. */
export function fromHtml(raw: string): DisplayText {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  return simplify({ type: 'message', children: htmlChildren(parseHtml(trimmed)) })
}

function parseHtml(html: string): HtmlNode[] {
  const root: HtmlElement = { tag: '#root', children: [] }
  const stack: HtmlElement[] = [root]
  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>|[^<]+|</g
  for (const match of html.matchAll(re)) {
    const token = match[0]
    const top = stack[stack.length - 1]!
    if (token.startsWith('<!--')) continue
    const tag = match[1]?.toLowerCase()
    if (!tag) {
      top.children.push(decodeEntities(token))
      continue
    }
    if (token.startsWith('</')) {
      const at = stack.map((e) => e.tag).lastIndexOf(tag)
      if (at > 0) stack.length = at
      continue
    }
    const element: HtmlElement = { tag, children: [] }
    top.children.push(element)
    if (!VOID.has(tag) && !token.endsWith('/>')) stack.push(element)
  }
  return root.children
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1]?.toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole
    }
    const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
    return named[body.toLowerCase()] ?? whole
  })
}

function htmlChildren(nodes: HtmlNode[]): MessageNode[] {
  const out: MessageNode[] = []
  for (const node of nodes) out.push(...htmlNode(node, out.length > 0))
  return mergeText(out)
}

function htmlNode(node: HtmlNode, leadingBreak: boolean): MessageNode[] {
  if (typeof node === 'string') {
    const text = node.replace(/ /g, ' ')
    if (!text || !text.trim()) return []
    return splitTokens(text)
  }
  const { tag } = node
  if (DROP.has(tag)) return []
  if (UNWRAP.has(tag)) return htmlChildren(node.children)
  if (tag === 'br') return [{ type: 'break' }]
  const kind: MarkKind | undefined =
    tag === 'b' || tag === 'strong' ? 'strong' : tag === 'i' || tag === 'em' ? 'em' : tag === 'u' ? 'u' : undefined
  if (kind) {
    const inner = htmlChildren(node.children)
    return inner.length ? [{ type: 'mark', kind, children: inner }] : []
  }
  if (BLOCK.has(tag)) {
    const inner = htmlChildren(node.children)
    if (!inner.length) return []
    return leadingBreak ? [{ type: 'break' }, ...inner] : inner
  }
  if (tag === 'ul' || tag === 'ol') {
    const items = node.children
      .filter((c): c is HtmlElement => typeof c !== 'string' && c.tag === 'li')
      .map((li) => ({ type: 'item' as const, children: htmlChildren(li.children) }))
    return items.length ? [{ type: 'list', ordered: tag === 'ol', items }] : []
  }
  return htmlChildren(node.children)
}

// ------------------------------------------------------------------ shape

function mergeText(nodes: MessageNode[]): MessageNode[] {
  const out: MessageNode[] = []
  for (const node of nodes) {
    const last = out[out.length - 1]
    if (last?.type === 'text' && node.type === 'text') out[out.length - 1] = { type: 'text', value: last.value + node.value }
    else out.push(node)
  }
  return out
}

function hasStructure(nodes: MessageNode[]): boolean {
  return nodes.some((n) => n.type !== 'text')
}

/** Keep a plain string when there is no structure; `tricc_oo` stores those as `str`. */
export function simplify(message: Message): DisplayText {
  const children = mergeText(message.children)
  if (children.length === 0) return ''
  if (!hasStructure(children)) return children.map((c) => (c as { value: string }).value).join('')
  return { type: 'message', children }
}

export function isStructured(text: DisplayText): text is Message {
  return typeof text !== 'string'
}

// ------------------------------------------------------------------ Markdown

/** Markdown as `tricc_oo` renders it for ODK/CHT: `**strong**`, `_em_`, `- ` lists, `${name}`. */
export function toMarkdown(text: DisplayText): string {
  return typeof text === 'string' ? text : markdownNodes(text.children)
}

function markdownNodes(nodes: MessageNode[]): string {
  return nodes.map(markdownNode).join('')
}

function markdownNode(node: MessageNode): string {
  switch (node.type) {
    case 'text':
      return node.value
    case 'break':
      return '\n'
    case 'interp':
      return `\${${node.name}}`
    case 'mark': {
      const inner = markdownNodes(node.children)
      if (node.kind === 'strong') return `**${inner}**`
      if (node.kind === 'em') return `_${inner}_`
      // ODK and CHT labels render this inline HTML; Markdown has no colour of its own.
      if (node.kind === 'color' && isColor(node.color)) return `<span style="color:${node.color}">${inner}</span>`
      return inner
    }
    case 'list':
      return node.items
        .map((item, i) => `${node.ordered ? `${i + 1}. ` : '- '}${markdownNodes(item.children)}`)
        .join('\n')
  }
}

/** The text without any markup, for lists, labels and search. */
export function toPlain(text: DisplayText): string {
  if (typeof text === 'string') return text
  const walk = (nodes: MessageNode[]): string =>
    nodes
      .map((n) =>
        n.type === 'text'
          ? n.value
          : n.type === 'break'
            ? ' '
            : n.type === 'interp'
              ? `\${${n.name}}`
              : n.type === 'mark'
                ? walk(n.children)
                : n.items.map((i) => walk(i.children)).join('; '),
      )
      .join('')
  return walk(text.children)
}

/** Names injected with `${name}`, in reading order. */
export function references(text: DisplayText): string[] {
  if (typeof text === 'string') return splitTokens(text).flatMap((n) => (n.type === 'interp' ? [n.name] : []))
  const out: string[] = []
  const walk = (nodes: MessageNode[]) => {
    for (const n of nodes) {
      if (n.type === 'interp') out.push(n.name)
      else if (n.type === 'mark') walk(n.children)
      else if (n.type === 'list') for (const item of n.items) walk(item.children)
    }
  }
  walk(text.children)
  return out
}

// ------------------------------------------------------------------ JSON

/** Read the interchange JSON; anything malformed is rejected rather than half-read. */
export function messageFromJson(raw: unknown): Message {
  const node = (v: unknown): MessageNode => {
    const o = v as Record<string, unknown>
    switch (o?.['type']) {
      case 'text':
        if (typeof o['value'] !== 'string') break
        return { type: 'text', value: o['value'] }
      case 'interp':
        if (typeof o['name'] !== 'string') break
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
      case 'list':
        return {
          type: 'list',
          ordered: o['ordered'] === true,
          items: (Array.isArray(o['items']) ? o['items'] : []).map((item) => ({
            type: 'item' as const,
            children: list((item as Record<string, unknown>)['children']),
          })),
        }
    }
    throw new Error(`Not a display-text node: ${JSON.stringify(v)}`)
  }
  const list = (v: unknown): MessageNode[] => (Array.isArray(v) ? v.map(node) : [])
  const o = raw as Record<string, unknown>
  if (o?.['type'] !== 'message') throw new Error('Not a display-text message.')
  return { type: 'message', children: list(o['children']) }
}

// ------------------------------------------------------------------ designations

/** A designation whose text has structure carries the tree in this extension (a JSON string). */
export const DESIGNATION_MESSAGE_URL = 'https://tricc.org/StructureDefinition/designation-message'

/** The display text of a designation: the tree when it carries one, else its value. */
export function designationText(d: Designation): DisplayText {
  const ext = (d.extension ?? []).find(
    (e) => (e as { url?: unknown }).url === DESIGNATION_MESSAGE_URL,
  ) as { valueString?: unknown } | undefined
  if (typeof ext?.valueString === 'string') {
    try {
      return simplify(messageFromJson(JSON.parse(ext.valueString)))
    } catch {
      // A broken extension falls back to the readable value.
    }
  }
  return fromPlain(d.value)
}

/**
 * The designation with a new text. `value` is always the Markdown, readable by any FHIR
 * consumer; the tree is added only when the text has structure, so plain texts cost nothing.
 */
export function withDesignationText(d: Designation, text: DisplayText): Designation {
  const others = (d.extension ?? []).filter((e) => (e as { url?: unknown }).url !== DESIGNATION_MESSAGE_URL)
  const next: Designation = { ...d, value: toMarkdown(text) }
  const extension = isStructured(text)
    ? [...others, { url: DESIGNATION_MESSAGE_URL, valueString: JSON.stringify(text) }]
    : others
  if (extension.length > 0) next.extension = extension
  else delete next.extension
  return next
}
