import { Fragment, useMemo, type CSSProperties, type ReactNode } from 'react'
import { isColor, type DisplayText, type MessageNode } from '@tricc/core'

/**
 * A display text as the health worker sees it: bold, colour, lists, and the inline HTML that
 * ODK and CHT render in a label (`<span style="color:red">`, `<b>`, `<br>`).
 *
 * Read-only. The HTML is never handed to the browser as markup: it is parsed and rebuilt
 * from an allow-list of formatting tags and style properties, so a project file cannot run
 * code or load anything through a label. Everything else keeps its text and loses its tag.
 */
export function RichLabel({ text }: { text: DisplayText }) {
  const content = useMemo(() => render(text), [text])
  return <>{content}</>
}

/** The words of a display text, without HTML or formatting: for titles and tooltips. */
export function labelText(text: DisplayText): string {
  const html = toHtml(text)
  if (html === undefined) return typeof text === 'string' ? text : ''
  return parse(html).textContent ?? ''
}

function render(text: DisplayText): ReactNode {
  const html = toHtml(text)
  if (html === undefined) return text as string
  return fromDom(parse(html).childNodes)
}

// ------------------------------------------------------------------ to HTML

/** Matches the formatting tags a label may carry; anything else is plain text. */
const HTML_TAG =
  /<\/?(b|strong|i|em|u|s|strike|del|br|p|div|span|font|ul|ol|li|sup|sub|small)\b[^>]*>/i

/**
 * The text as one HTML string, or undefined when it is plain. One string because an imported
 * tag can open in one text run and close in another, around a `${name}`.
 */
function toHtml(text: DisplayText): string | undefined {
  const raw =
    typeof text === 'string'
      ? HTML_TAG.test(text)
      : runs(text.children).some((v) => HTML_TAG.test(v))
  if (typeof text === 'string') return raw ? text : undefined
  return htmlNodes(text.children, raw)
}

function runs(nodes: MessageNode[]): string[] {
  return nodes.flatMap((n) =>
    n.type === 'text'
      ? [n.value]
      : n.type === 'mark'
        ? runs(n.children)
        : n.type === 'list'
          ? n.items.flatMap((i) => runs(i.children))
          : [],
  )
}

function htmlNodes(nodes: MessageNode[], raw: boolean): string {
  return nodes.map((n) => htmlNode(n, raw)).join('')
}

function htmlNode(node: MessageNode, raw: boolean): string {
  switch (node.type) {
    case 'text':
      return raw ? node.value : escape(node.value)
    case 'interp':
      return escape(`\${${node.name}}`)
    case 'break':
      return '<br>'
    case 'mark': {
      const inner = htmlNodes(node.children, raw)
      if (node.kind === 'strong') return `<strong>${inner}</strong>`
      if (node.kind === 'em') return `<em>${inner}</em>`
      if (node.kind === 'u') return `<u>${inner}</u>`
      return isColor(node.color) ? `<span style="color:${node.color}">${inner}</span>` : inner
    }
    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul'
      return `<${tag}>${node.items.map((i) => `<li>${htmlNodes(i.children, raw)}</li>`).join('')}</${tag}>`
    }
    case 'image':
      // The node shows its first picture above the label.
      return ''
  }
}

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ------------------------------------------------------------------ to React

function parse(html: string): HTMLElement {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body
}

type InlineTag = 'strong' | 'em' | 'u' | 's' | 'sup' | 'sub' | 'small' | 'ul' | 'ol' | 'li'

const TAGS: Record<string, InlineTag> = {
  b: 'strong',
  strong: 'strong',
  i: 'em',
  em: 'em',
  u: 'u',
  s: 's',
  strike: 's',
  del: 's',
  sup: 'sup',
  sub: 'sub',
  small: 'small',
  ul: 'ul',
  ol: 'ol',
  li: 'li',
}
/** Dropped with what they hold: never text a health worker reads. */
const DROP = new Set([
  'script',
  'style',
  'template',
  'iframe',
  'object',
  'embed',
  'img',
  'svg',
  'math',
  'head',
  'title',
])

function fromDom(nodes: NodeListOf<ChildNode>): ReactNode[] {
  return Array.from(nodes).map((node, i) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent
    if (node.nodeType !== Node.ELEMENT_NODE) return null
    const el = node as Element
    const tag = el.tagName.toLowerCase()
    if (DROP.has(tag)) return null
    if (tag === 'br') return <br key={i} />
    const children = fromDom(el.childNodes)
    const Tag = TAGS[tag]
    if (Tag) return <Tag key={i}>{children}</Tag>
    const style = styleOf(el)
    if (tag === 'p' || tag === 'div') {
      return (
        <span key={i} className="tricc-rich__block" style={style}>
          {children}
        </span>
      )
    }
    if (style) {
      return (
        <span key={i} style={style}>
          {children}
        </span>
      )
    }
    return <Fragment key={i}>{children}</Fragment>
  })
}

const WEIGHT = /^(normal|bold|bolder|lighter|[1-9]00)$/
const FONT_STYLE = /^(normal|italic|oblique)$/
const DECORATION = /^(none|underline|line-through|overline)( (underline|line-through|overline))*$/
const RGB = /^rgba?\(\s*\d{1,3}%?\s*(,\s*\d{1,3}%?\s*){2}(,\s*(0|1|0?\.\d+)\s*)?\)$/

function colorValue(value: string): string | undefined {
  return isColor(value) || RGB.test(value) ? value : undefined
}

/** The formatting part of an element's style (and `<font color>`); nothing that loads or moves. */
function styleOf(el: Element): CSSProperties | undefined {
  const out: CSSProperties = {}
  const font = el.tagName.toLowerCase() === 'font' ? el.getAttribute('color')?.trim() : undefined
  if (font && colorValue(font)) out.color = font
  for (const decl of (el.getAttribute('style') ?? '').split(';')) {
    const at = decl.indexOf(':')
    if (at < 0) continue
    const prop = decl.slice(0, at).trim().toLowerCase()
    const value = decl
      .slice(at + 1)
      .trim()
      .replace(/\s*!important$/i, '')
    if (prop === 'color' && colorValue(value)) out.color = value
    else if (prop === 'background-color' && colorValue(value)) out.backgroundColor = value
    else if (prop === 'font-weight' && WEIGHT.test(value))
      out.fontWeight = value as CSSProperties['fontWeight']
    else if (prop === 'font-style' && FONT_STYLE.test(value)) out.fontStyle = value
    else if (prop === 'text-decoration' && DECORATION.test(value)) out.textDecoration = value
  }
  return Object.keys(out).length ? out : undefined
}
