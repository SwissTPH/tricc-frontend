import { Schema, type DOMOutputSpec } from 'prosemirror-model'

/**
 * Display text as a ProseMirror document (feature/20261120-prosemirror-display-text.md). The
 * node and mark names are TipTap's, so the editor's `getJSON()` is stored as is; `tricc_oo`
 * holds the same schema (`tricc_oo/text/schema.py`) and the two sides share fixtures.
 */

/** A node of a document in its JSON form (`Node.toJSON()`, TipTap `getJSON()`). */
export interface PmNode {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: PmMark[]
  content?: PmNode[]
}

export interface PmMark {
  type: string
  attrs?: Record<string, unknown>
}

/** A whole document: `{ type: 'doc', content: [...] }`. */
export type PmDoc = PmNode & { type: 'doc' }

/** A plain string when the text has no structure, as `tricc_oo` keeps it; else a document. */
export type DisplayText = string | PmDoc

/**
 * A picture points at a project image the FHIR way, a `Binary` by id (`Binary/<id>`); the bytes
 * are `<media_path>/images/<id>.<ext>` (feature/20261012-images.md §3).
 */
export const IMAGE_ID = /^[a-z0-9][a-z0-9_-]*$/
const IMAGE_SRC = /^Binary\/([a-z0-9][a-z0-9_-]*)$/

export function imageSrc(id: string): string {
  return `Binary/${id}`
}

/** The image id a picture points at, or undefined for any other source. */
export function imageIdOf(src: unknown): string | undefined {
  return typeof src === 'string' ? IMAGE_SRC.exec(src)?.[1] : undefined
}

const COLOR = /^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i

/** A CSS colour a text may carry: `#rrggbb` (3 to 8 digits) or a colour name. */
export function isColor(value: unknown): value is string {
  return typeof value === 'string' && COLOR.test(value)
}

/** The colour of an inline `style` attribute, when it holds a valid one. */
export function styleColor(style: string | null | undefined): string | undefined {
  const match = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(style ?? '')
  const value = match?.[1]?.trim()
  return isColor(value) ? value : undefined
}

const el = (dom: unknown) => dom as HTMLElement

export const textSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      content: 'inline*',
      parseDOM: [{ tag: 'p' }, { tag: 'div' }],
      toDOM: (): DOMOutputSpec => ['p', 0],
    },
    bulletList: {
      group: 'block',
      content: 'listItem+',
      parseDOM: [{ tag: 'ul' }],
      toDOM: (): DOMOutputSpec => ['ul', 0],
    },
    orderedList: {
      group: 'block',
      content: 'listItem+',
      attrs: { start: { default: 1 } },
      parseDOM: [
        {
          tag: 'ol',
          getAttrs: (dom) => {
            const start = parseInt(el(dom).getAttribute('start') ?? '', 10)
            return { start: Number.isFinite(start) ? start : 1 }
          },
        },
      ],
      toDOM: (node): DOMOutputSpec =>
        node.attrs['start'] === 1 ? ['ol', 0] : ['ol', { start: node.attrs['start'] }, 0],
    },
    listItem: {
      content: 'paragraph block*',
      defining: true,
      parseDOM: [{ tag: 'li' }],
      toDOM: (): DOMOutputSpec => ['li', 0],
    },
    text: { group: 'inline' },
    hardBreak: {
      group: 'inline',
      inline: true,
      selectable: false,
      parseDOM: [{ tag: 'br' }],
      toDOM: (): DOMOutputSpec => ['br'],
    },
    image: {
      group: 'inline',
      inline: true,
      atom: true,
      attrs: { src: {}, alt: { default: null } },
      parseDOM: [
        {
          // Only pictures of the image library; any other source is not ours to show.
          tag: 'img[src]',
          getAttrs: (dom) => {
            const src = el(dom).getAttribute('src')
            if (!imageIdOf(src)) return false
            return { src, alt: el(dom).getAttribute('alt') || null }
          },
        },
      ],
      toDOM: (node): DOMOutputSpec => [
        'img',
        node.attrs['alt']
          ? { src: node.attrs['src'], alt: node.attrs['alt'] }
          : { src: node.attrs['src'] },
      ],
    },
    interp: {
      group: 'inline',
      inline: true,
      atom: true,
      attrs: { name: {} },
      parseDOM: [
        {
          tag: 'span[data-interp]',
          getAttrs: (dom) => {
            const name = el(dom).getAttribute('data-interp')
            return name ? { name } : false
          },
        },
      ],
      toDOM: (node): DOMOutputSpec => [
        'span',
        { 'data-interp': node.attrs['name'] },
        `\${${String(node.attrs['name'])}}`,
      ],
    },
  },
  marks: {
    bold: {
      parseDOM: [{ tag: 'strong' }, { tag: 'b' }],
      toDOM: (): DOMOutputSpec => ['strong', 0],
    },
    italic: {
      parseDOM: [{ tag: 'em' }, { tag: 'i' }],
      toDOM: (): DOMOutputSpec => ['em', 0],
    },
    underline: {
      parseDOM: [{ tag: 'u' }],
      toDOM: (): DOMOutputSpec => ['u', 0],
    },
    textStyle: {
      attrs: { color: { default: null } },
      parseDOM: [
        {
          tag: 'span[style]',
          getAttrs: (dom) => {
            const color = styleColor(el(dom).getAttribute('style'))
            return color ? { color } : false
          },
        },
      ],
      toDOM: (mark): DOMOutputSpec => [
        'span',
        { style: `color: ${String(mark.attrs['color'])}` },
        0,
      ],
    },
  },
})
