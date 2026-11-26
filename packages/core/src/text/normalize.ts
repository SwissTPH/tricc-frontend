import type { PmDoc, PmMark, PmNode } from './schema.js'

/**
 * The canonical form of a document, as `tricc_oo/text/parse.py` `normalize` gives it: every
 * reader returns it, so both sides compare documents node for node.
 */

const MARK_RANK: Record<string, number> = { bold: 0, italic: 1, underline: 2, textStyle: 3 }
const LIST_TYPES = new Set(['bulletList', 'orderedList'])

export function paragraph(content?: PmNode[]): PmNode {
  return content?.length ? { type: 'paragraph', content } : { type: 'paragraph' }
}

export function emptyDoc(): PmDoc {
  return { type: 'doc', content: [paragraph()] }
}

/** Marks in schema order, each once (nested `**` in Markdown gives bold twice). */
export function sortMarks(marks: PmMark[]): PmMark[] {
  const seen = new Set<string>()
  return [...marks]
    .sort((a, b) => (MARK_RANK[a.type] ?? 9) - (MARK_RANK[b.type] ?? 9))
    .filter((m) => (seen.has(m.type) ? false : (seen.add(m.type), true)))
}

export function textNode(text: string, marks?: PmMark[]): PmNode {
  return marks?.length ? { type: 'text', text, marks: sortMarks(marks) } : { type: 'text', text }
}

export function interpNode(name: string, marks?: PmMark[]): PmNode {
  return marks?.length
    ? { type: 'interp', attrs: { name }, marks: sortMarks(marks) }
    : { type: 'interp', attrs: { name } }
}

export function isEmptyParagraph(node: PmNode): boolean {
  return node.type === 'paragraph' && (node.content ?? []).length === 0
}

const marksKey = (node: PmNode) => JSON.stringify(node.marks ?? [])

/**
 * Line breaks and pictures carry no marks; empty text is dropped; neighbouring text with the
 * same marks is one node.
 */
export function cleanInline(content: PmNode[]): PmNode[] {
  const out: PmNode[] = []
  for (const original of content) {
    let node: PmNode = { ...original }
    if (node.type === 'hardBreak' || node.type === 'image') delete node.marks
    else if (node.type === 'text') {
      if (!node.text) continue
      if (node.marks?.length) node.marks = sortMarks(node.marks)
      else delete node.marks
    }
    const last = out[out.length - 1]
    if (last?.type === 'text' && node.type === 'text' && marksKey(last) === marksKey(node)) {
      node = { ...last, text: (last.text ?? '') + (node.text ?? '') }
      out[out.length - 1] = node
    } else out.push(node)
  }
  return out
}

/** Drop line breaks and spaces opening or closing a paragraph. */
function trimEdges(content: PmNode[]): PmNode[] {
  const out = [...content]
  while (out.length && out[0]!.type === 'hardBreak') out.shift()
  while (out.length && out[out.length - 1]!.type === 'hardBreak') out.pop()
  const first = out[0]
  if (first?.type === 'text') out[0] = { ...first, text: (first.text ?? '').trimStart() }
  const last = out[out.length - 1]
  if (last?.type === 'text') out[out.length - 1] = { ...last, text: (last.text ?? '').trimEnd() }
  return out.filter((n) => n.type !== 'text' || n.text)
}

/**
 * Line breaks as a browser shows them. A run of line breaks opening the paragraph, or a run of
 * two or more inside or closing it, is a blank line: it ends the paragraph and leaves one
 * empty paragraph. A single one closing the paragraph shows nothing.
 */
function splitParagraph(node: PmNode): PmNode[] {
  const content = cleanInline(node.content ?? [])
  const chunks: (PmNode[] | null)[] = [[]]
  let i = 0
  while (i < content.length) {
    if (content[i]!.type === 'hardBreak') {
      let run = 1
      while (i + run < content.length && content[i + run]!.type === 'hardBreak') run++
      const opening = i === 0
      const closing = i + run === content.length
      if (opening || run >= 2) chunks.push(null, [])
      else if (!closing) chunks[chunks.length - 1]!.push(content[i]!)
      i += run
      continue
    }
    chunks[chunks.length - 1]!.push(content[i]!)
    i++
  }
  return chunks.map((chunk) => (chunk === null ? paragraph() : paragraph(trimEdges(chunk))))
}

function startOf(list: PmNode): number {
  const start = list.attrs?.['start']
  return typeof start === 'number' ? start : 1
}

function listCanMerge(first: PmNode, second: PmNode): boolean {
  if (first.type !== second.type || !LIST_TYPES.has(first.type)) return false
  if (first.type === 'bulletList') return true
  return startOf(second) === startOf(first) + (first.content ?? []).length
}

function normalizeBlocks(blocks: PmNode[], top: boolean): PmNode[] {
  const out: PmNode[] = []
  for (const block of blocks) {
    if (block.type === 'paragraph') out.push(...splitParagraph(block))
    else if (LIST_TYPES.has(block.type)) {
      const items = (block.content ?? []).map((item) => {
        const inner = normalizeBlocks(item.content ?? [], false)
        if (!inner.length || inner[0]!.type !== 'paragraph') inner.unshift(paragraph())
        return { type: 'listItem', content: inner }
      })
      if (items.length) out.push({ ...block, content: items })
    }
  }
  const merged: PmNode[] = []
  for (const block of out) {
    const last = merged[merged.length - 1]
    // One blank line at most; none opening the text or inside a list item.
    if (isEmptyParagraph(block) && (!last || isEmptyParagraph(last) || !top)) continue
    if (last && listCanMerge(last, block)) {
      merged[merged.length - 1] = {
        ...last,
        content: [...(last.content ?? []), ...(block.content ?? [])],
      }
      continue
    }
    merged.push(block)
  }
  while (merged.length && isEmptyParagraph(merged[merged.length - 1]!)) merged.pop()
  return merged
}

/**
 * The canonical form: line breaks and pictures carry no marks; text with the same marks is
 * one node; two or more line breaks split the paragraph, an empty paragraph standing for the
 * blank line; line breaks and spaces at a paragraph's edges go; at most one empty paragraph
 * in a row, none opening or closing the text or in a list item; neighbouring lists of the
 * same kind (an ordered one continuing the numbers) are one list.
 */
export function normalize(doc: PmDoc): PmDoc {
  const blocks = normalizeBlocks(doc.content ?? [], true)
  return { type: 'doc', content: blocks.length ? blocks : [paragraph()] }
}

/** Apply `fn` to every paragraph, in list items too (`top` false there). */
export function mapParagraphs(
  blocks: PmNode[],
  fn: (block: PmNode, top: boolean) => PmNode[],
  top = true,
): PmNode[] {
  const out: PmNode[] = []
  for (const block of blocks) {
    if (block.type === 'paragraph') out.push(...fn(block, top))
    else if (LIST_TYPES.has(block.type))
      out.push({
        ...block,
        content: (block.content ?? []).map((item) => ({
          ...item,
          content: mapParagraphs(item.content ?? [], fn, false),
        })),
      })
    else out.push(block)
  }
  return out
}
