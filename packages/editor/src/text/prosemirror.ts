import {
  fromPlain,
  isColor,
  simplify,
  type DisplayText,
  type MarkKind,
  type Message,
  type MessageNode,
} from '@tricc/core'

/**
 * Message tree ⇄ TipTap/ProseMirror JSON (feature/20260909-display-message-ast.md §2.9 in
 * tricc_oo). The tree wraps phrases in marks; ProseMirror puts marks on each leaf. Going one
 * way pushes a mark onto every leaf under it; coming back groups neighbouring leaves that
 * share a mark, so `**Give ${dose} mg**` stays one span.
 */

export interface PmNode {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  content?: PmNode[]
}

/** A mark as one string: `strong`, `em`, `u`, or `color:<css colour>`. */
type Tag = string

const PM_MARK: Record<Exclude<MarkKind, 'color'>, string> = { strong: 'bold', em: 'italic', u: 'underline' }
const KIND_OF: Record<string, Tag> = { bold: 'strong', italic: 'em', underline: 'u' }
/** Outermost first. A colour wraps inside the styles, so `**red text**` keeps one span. */
const RANK = (tag: Tag) => (tag === 'strong' ? 0 : tag === 'em' ? 1 : tag === 'u' ? 2 : 3)

function tagOf(node: { kind: MarkKind; color?: string }): Tag {
  return node.kind === 'color' ? `color:${node.color ?? ''}` : node.kind
}

function pmMark(tag: Tag): { type: string; attrs?: Record<string, unknown> } {
  if (tag.startsWith('color:')) return { type: 'textStyle', attrs: { color: tag.slice(6) } }
  return { type: PM_MARK[tag as Exclude<MarkKind, 'color'>] }
}

function tagFromPm(mark: { type: string; attrs?: Record<string, unknown> }): Tag | undefined {
  if (mark.type === 'textStyle') {
    const color = mark.attrs?.['color']
    return isColor(color) ? `color:${color}` : undefined
  }
  return KIND_OF[mark.type]
}

function markNode(tag: Tag, children: MessageNode[]): MessageNode {
  return tag.startsWith('color:')
    ? { type: 'mark', kind: 'color', color: tag.slice(6), children }
    : { type: 'mark', kind: tag as Exclude<MarkKind, 'color'>, children }
}

// ------------------------------------------------------------------ tree → doc

export function toDoc(text: DisplayText): PmNode {
  const message: Message = typeof text === 'string' ? asMessage(fromPlain(text)) : text
  const blocks: PmNode[] = []
  let inline: PmNode[] = []
  const flush = () => {
    blocks.push(inline.length ? { type: 'paragraph', content: inline } : { type: 'paragraph' })
    inline = []
  }
  const walk = (nodes: MessageNode[], marks: Tag[], top: boolean) => {
    for (const node of nodes) {
      if (node.type === 'list' && top) {
        if (inline.length) flush()
        blocks.push({
          type: node.ordered ? 'orderedList' : 'bulletList',
          content: node.items.map((item) => ({
            type: 'listItem',
            content: [{ type: 'paragraph', content: inlineOf(item.children, []) }],
          })),
        })
        continue
      }
      if (node.type === 'mark') walk(node.children, [...marks, tagOf(node)], top)
      else inline.push(...inlineOf([node], marks))
    }
  }
  walk(message.children, [], true)
  if (inline.length || blocks.length === 0) flush()
  return { type: 'doc', content: blocks }
}

function inlineOf(nodes: MessageNode[], marks: Tag[]): PmNode[] {
  const pmMarks = marks.length ? { marks: marks.map(pmMark) } : {}
  const out: PmNode[] = []
  for (const node of nodes) {
    if (node.type === 'text' && node.value) out.push({ type: 'text', text: node.value, ...pmMarks })
    else if (node.type === 'interp') out.push({ type: 'interp', attrs: { name: node.name }, ...pmMarks })
    else if (node.type === 'break') out.push({ type: 'hardBreak' })
    // A picture carries no marks: the tree never puts one inside bold or a colour.
    else if (node.type === 'image') out.push({ type: 'image', attrs: { src: node.src, alt: node.alt ?? null } })
    else if (node.type === 'mark') out.push(...inlineOf(node.children, [...marks, tagOf(node)]))
    else if (node.type === 'list') {
      // A list nested inside a phrase cannot be one in ProseMirror: keep its text in lines.
      for (const item of node.items) {
        out.push({ type: 'hardBreak' }, { type: 'text', text: node.ordered ? '1. ' : '- ' })
        out.push(...inlineOf(item.children, marks))
      }
    }
  }
  return out
}

function asMessage(text: DisplayText): Message {
  return typeof text === 'string'
    ? { type: 'message', children: text ? [{ type: 'text', value: text }] : [] }
    : text
}

// ------------------------------------------------------------------ doc → tree

/** Paragraphs are separated by a break, as tricc_oo does for a block after content. */
export function fromDoc(doc: PmNode): DisplayText {
  const children: MessageNode[] = []
  for (const block of doc.content ?? []) {
    let nodes: MessageNode[] = []
    if (block.type === 'paragraph') nodes = group(block.content ?? [])
    else if (block.type === 'bulletList' || block.type === 'orderedList') {
      const items = (block.content ?? []).map((li) => ({
        type: 'item' as const,
        children: joinParagraphs(li.content ?? []),
      }))
      if (items.length) nodes = [{ type: 'list', ordered: block.type === 'orderedList', items }]
    }
    if (!nodes.length) continue
    if (children.length) children.push({ type: 'break' })
    children.push(...nodes)
  }
  return simplify({ type: 'message', children })
}

function joinParagraphs(blocks: PmNode[]): MessageNode[] {
  const out: MessageNode[] = []
  for (const block of blocks) {
    const nodes = group(block.content ?? [])
    if (!nodes.length) continue
    if (out.length) out.push({ type: 'break' })
    out.push(...nodes)
  }
  return out
}

interface Leaf {
  node: MessageNode
  marks: Tag[]
}

function group(content: PmNode[]): MessageNode[] {
  const leaves: Leaf[] = []
  for (const pm of content) {
    const marks = (pm.marks ?? [])
      .map(tagFromPm)
      .filter((k): k is Tag => k !== undefined)
    if (pm.type === 'text' && pm.text) leaves.push({ node: { type: 'text', value: pm.text }, marks })
    else if (pm.type === 'interp' && typeof pm.attrs?.['name'] === 'string')
      leaves.push({ node: { type: 'interp', name: pm.attrs['name'] }, marks })
    else if (pm.type === 'hardBreak') leaves.push({ node: { type: 'break' }, marks: [] })
    else if (pm.type === 'image' && typeof pm.attrs?.['src'] === 'string' && pm.attrs['src']) {
      const alt = pm.attrs['alt']
      leaves.push({
        node: typeof alt === 'string' && alt ? { type: 'image', src: pm.attrs['src'], alt } : { type: 'image', src: pm.attrs['src'] },
        marks: [],
      })
    }
  }
  return wrap(leaves)
}

/** Group runs of leaves sharing a mark, outermost mark first (strong, then em, then u). */
function wrap(leaves: Leaf[]): MessageNode[] {
  const out: MessageNode[] = []
  let i = 0
  while (i < leaves.length) {
    const leaf = leaves[i]!
    const kind = [...leaf.marks].sort((a, b) => RANK(a) - RANK(b))[0]
    if (!kind) {
      out.push(leaf.node)
      i++
      continue
    }
    let j = i
    while (j < leaves.length && leaves[j]!.marks.includes(kind)) j++
    const inner = leaves.slice(i, j).map((l) => ({ node: l.node, marks: l.marks.filter((m) => m !== kind) }))
    out.push(markNode(kind, wrap(inner)))
    i = j
  }
  return mergeText(out)
}

function mergeText(nodes: MessageNode[]): MessageNode[] {
  const out: MessageNode[] = []
  for (const node of nodes) {
    const last = out[out.length - 1]
    if (last?.type === 'text' && node.type === 'text') out[out.length - 1] = { type: 'text', value: last.value + node.value }
    else out.push(node)
  }
  return out
}
