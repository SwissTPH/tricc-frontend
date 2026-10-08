import { inflateSync, strFromU8, unzlibSync } from 'fflate'
import type { Activity, TriccEdge, TriccNode } from '../model/types.js'
import { NODE_TYPES, type NodeType } from './schema/node-types.js'

/**
 * Open a draw.io file whose pages are either inline `mxGraphModel` XML or the
 * usual compressed payload (base64 of raw deflate, sometimes URL-encoded).
 * Each page becomes one activity. The source XML is not rewritten.
 */

const KNOWN = new Set<string>(NODE_TYPES)
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_.]*$/

interface XmlNode {
  tag: string
  attrs: Record<string, string>
  children: XmlNode[]
  text: string
}

interface Shape {
  id: string
  attrs: Record<string, string>
  parent?: string
  edge: boolean
  source?: string
  target?: string
  value?: string
  x?: number
  y?: number
  width?: number
  height?: number
}

export function activitiesFromDrawio(
  fileXml: string,
  taken: Set<string>,
  lang = 'en',
): Activity[] {
  const root = parseXml(fileXml.trim())
  const pages = diagramsOf(root)
  const pageActivity = new Map<string, string>()
  for (const page of pages) {
    const id = uniqueSlug(page.name || page.diagramId || 'page', taken)
    taken.add(id)
    page.activityId = id
    if (page.diagramId) pageActivity.set(page.diagramId, id)
    if (page.name) pageActivity.set(page.name, id)
  }

  return pages.map((page) => pageToActivity(page, pageActivity, lang))
}

interface Page {
  diagramId: string
  name: string
  activityId: string
  graph: XmlNode
}

function diagramsOf(root: XmlNode): Page[] {
  const tag = root.tag.toLowerCase()
  if (tag === 'mxgraphmodel') {
    return [{ diagramId: 'page', name: 'page', activityId: '', graph: root }]
  }
  const diagrams = root.children.filter((c) => c.tag.toLowerCase() === 'diagram')
  if (diagrams.length === 0 && tag === 'mxfile') {
    throw new Error('This draw.io file has no pages.')
  }
  if (diagrams.length === 0) {
    throw new Error('This file is not a draw.io diagram (expected mxfile or mxGraphModel).')
  }
  return diagrams.map((diagram, index) => ({
    diagramId: diagram.attrs['id'] ?? `page-${index + 1}`,
    name: diagram.attrs['name'] ?? `page-${index + 1}`,
    activityId: '',
    graph: graphOf(diagram),
  }))
}

function graphOf(diagram: XmlNode): XmlNode {
  const inline = diagram.children.find((c) => c.tag.toLowerCase() === 'mxgraphmodel')
  if (inline) return inline
  const payload = diagram.text.trim()
  if (!payload) throw new Error(`Draw.io page "${diagram.attrs['name'] ?? diagram.attrs['id']}" is empty.`)
  if (payload.startsWith('<')) return parseXml(payload)
  const xml = inflateDiagram(payload)
  return parseXml(xml)
}

/**
 * Base64 + raw deflate, with a zlib fallback.
 * Draw.io often URL-encodes the XML before deflating it (the bytes inflate to `%3CmxGraphModel…`),
 * and sometimes URL-encodes the base64 itself. Both are decoded. Plain XML after inflate is kept.
 */
export function inflateDiagram(payload: string): string {
  let data = payload.trim()
  if (data.includes('%')) {
    try {
      data = decodeURIComponent(data)
    } catch {
      // Keep the original text and try it as base64.
    }
  }
  let bytes: Uint8Array
  try {
    bytes = b64ToBytes(data.replace(/\s+/g, ''))
  } catch {
    throw new Error('This draw.io page is neither plain XML nor a compressed diagram.')
  }
  let inflated: string
  try {
    inflated = strFromU8(inflateSync(bytes))
  } catch {
    try {
      inflated = strFromU8(unzlibSync(bytes))
    } catch {
      throw new Error('This draw.io page is neither plain XML nor a compressed diagram.')
    }
  }
  return xmlText(inflated)
}

/** Inflated draw.io pages are either XML or `encodeURIComponent` of that XML. */
function xmlText(inflated: string): string {
  const trimmed = inflated.trim().replace(/^\uFEFF/, '')
  if (trimmed.startsWith('<')) return trimmed
  if (!trimmed.includes('%')) return trimmed
  try {
    const decoded = decodeURIComponent(trimmed).trim()
    if (decoded.startsWith('<')) return decoded
  } catch {
    // Not URL-encoded XML; the caller reports a parse error.
  }
  return trimmed
}

function pageToActivity(
  page: Page,
  pageActivity: Map<string, string>,
  lang: string,
): Activity {
  const shapes = collectShapes(page.graph)
  const nodes: Record<string, TriccNode> = {}
  const nodeOrder: string[] = []
  const folded = new Set<string>()

  for (const shape of shapes) {
    if (shape.edge || !shape.id || shape.id === '0' || shape.id === '1') continue
    const rawType = (shape.attrs['odk_type'] ?? shape.attrs['tricc_type'] ?? '').trim()
    const kind = classify(rawType)
    if (kind === 'skip') {
      const label = plain(shape.attrs['label'] ?? shape.value)
      if (!label) continue
      nodes[shape.id] = noteNode(shape, lang, label)
      nodeOrder.push(shape.id)
      continue
    }
    if (kind === 'hint' || kind === 'help') {
      const parent = shape.parent ? nodes[shape.parent] : undefined
      const text = plain(shape.attrs['label'] ?? shape.value)
      if (parent && text) parent[kind] = { [lang]: text }
      else if (text) {
        nodes[shape.id] = noteNode(shape, lang, text)
        nodeOrder.push(shape.id)
      }
      folded.add(shape.id)
      continue
    }
    if (kind.type === 'select_option' && shape.parent && nodes[shape.parent] && isSelectNode(nodes[shape.parent]!)) {
      const parent = nodes[shape.parent]!
      const optionLabel = plain(shape.attrs['label'] ?? shape.value)
      const optionName = validName(shape.attrs['name'])
      parent.options = [
        ...(parent.options ?? []),
        {
          id: shape.id,
          ...(optionName ? { name: optionName } : {}),
          ...(optionLabel ? { label: { [lang]: optionLabel } } : {}),
        },
      ]
      folded.add(shape.id)
      continue
    }
    const node = shapeToNode(shape, kind, lang, pageActivity)
    nodes[shape.id] = node
    nodeOrder.push(shape.id)
  }

  const edges: Record<string, TriccEdge> = {}
  const edgeOrder: string[] = []
  let n = 0
  for (const shape of shapes) {
    if (!shape.edge || !shape.source || !shape.target) continue
    if (!nodes[shape.source] || !nodes[shape.target]) continue
    if (folded.has(shape.source) || folded.has(shape.target)) continue
    n += 1
    const id = `e${n}`
    const edge: TriccEdge = { id, source: shape.source, target: shape.target }
    const value = plain(shape.value)
    if (value) edge.value = value
    edges[id] = edge
    edgeOrder.push(id)
  }

  const activity: Activity = {
    id: page.activityId,
    title: { [lang]: page.name || page.activityId },
    nodes,
    edges,
    nodeOrder,
    edgeOrder,
  }
  const start = Object.values(nodes).find((node) => node.type === 'start' || node.type === 'activity_start')
  if (start?.process) activity.process = start.process
  return activity
}

function shapeToNode(
  shape: Shape,
  kind: { type: NodeType; unmapped?: string; populateDefault?: boolean },
  lang: string,
  pageActivity: Map<string, string>,
): TriccNode {
  const labelText = kind.unmapped
    ? `Unmapped type: ${kind.unmapped}`
    : plain(shape.attrs['label'] ?? shape.value)
  const node: TriccNode = { id: shape.id, type: kind.type }
  const name = validName(shape.attrs['name'])
  if (name) node.name = name
  if (labelText) node.label = { [lang]: labelText }
  if (kind.type === 'start') {
    const formId = shape.attrs['form_id'] ?? shape.attrs['formId']
    if (formId) node.form_id = formId
  }
  if (shape.attrs['process']) node.process = shape.attrs['process']
  if (kind.populateDefault && !shape.attrs['context']) node.context = 'encounter'
  const context = shape.attrs['context']
  if (
    context === 'patient' ||
    context === 'facility' ||
    context === 'practitioner' ||
    context === 'location' ||
    context === 'encounter' ||
    context === 'history'
  ) {
    node.context = context
  }
  const severity = shape.attrs['severity']
  if (severity === 'light' || severity === 'mild' || severity === 'moderate' || severity === 'severe') {
    node.severity = severity
  }
  if (shape.attrs['save']) node.save = shape.attrs['save']
  const reference = shape.attrs['reference']
  if (kind.type === 'calculate' && (shape.attrs['calculate'] || reference)) {
    node.calculate = { expression: shape.attrs['calculate'] || reference! }
  } else if (reference && kind.type !== 'note') {
    node.reference = reference
  }
  if (shape.attrs['link']) node.link = resolveLink(shape.attrs['link'], pageActivity, labelText)
  const min = num(shape.attrs['min'])
  const max = num(shape.attrs['max'])
  if (min !== undefined) node.min = min
  if (max !== undefined) node.max = max
  if (shape.attrs['required'] === 'true' || shape.attrs['required'] === '1') node.required = true
  // A non-empty draw.io `filter` is the concept code the conversion exports.
  // Empty filters are the common case and are not a code.
  const filter = shape.attrs['filter']?.trim()
  if (filter && isSelectType(kind.type)) node.filter = filter
  const repeat = intAttr(shape.attrs['repeat'])
  const instance = intAttr(shape.attrs['instance'])
  if (repeat !== undefined) node.repeat = repeat
  if (instance !== undefined) node.instance = instance
  const ui: TriccNode['ui'] = { x: shape.x ?? 0, y: shape.y ?? 0 }
  if (shape.width) ui.width = shape.width
  if (shape.height) ui.height = shape.height
  node.ui = ui
  return node
}

function resolveLink(raw: string, pageActivity: Map<string, string>, label?: string): string {
  const match = /^data:page\/(?:id|name),(.+)$/.exec(raw.trim())
  if (!match) return raw
  const token = match[1] ?? ''
  return pageActivity.get(token) ?? (label ? slug(label) : slug(token) || token)
}

function noteNode(shape: Shape, lang: string, label: string): TriccNode {
  const node: TriccNode = {
    id: shape.id,
    type: 'note',
    label: { [lang]: label },
    ui: { x: shape.x ?? 0, y: shape.y ?? 0 },
  }
  if (shape.width) node.ui!.width = shape.width
  if (shape.height) node.ui!.height = shape.height
  const name = validName(shape.attrs['name'])
  if (name) node.name = name
  return node
}

function classify(
  rawType: string,
): 'skip' | 'hint' | 'help' | { type: NodeType; unmapped?: string; populateDefault?: boolean } {
  if (!rawType) return 'skip'
  if (rawType === 'hint-message' || rawType === 'hint') return 'hint'
  if (rawType === 'help-message' || rawType === 'help') return 'help'
  if (rawType === 'select_one yesno' || rawType === 'select_yesno') return { type: 'select_yesno' }
  if (rawType === 'input') return { type: 'populate', populateDefault: true }
  if (KNOWN.has(rawType)) return { type: rawType as NodeType }
  return { type: 'note', unmapped: rawType }
}

function isSelectType(type: NodeType): boolean {
  return type === 'select_one' || type === 'select_multiple' || type === 'select_yesno'
}

function isSelectNode(node: TriccNode): boolean {
  return isSelectType(node.type)
}

function collectShapes(graph: XmlNode): Shape[] {
  const out: Shape[] = []
  const seen = new Set<string>()
  const walk = (el: XmlNode) => {
    const tag = el.tag.toLowerCase()
    if (tag === 'object' || tag === 'userobject') {
      const cell = el.children.find((c) => c.tag.toLowerCase() === 'mxcell')
      const geom = cell?.children.find((c) => c.tag.toLowerCase() === 'mxgeometry')
      const id = el.attrs['id'] ?? cell?.attrs['id'] ?? ''
      if (id && !seen.has(id)) {
        seen.add(id)
        out.push(shapeFrom(id, el.attrs, cell, geom))
      }
    } else if (tag === 'mxcell') {
      const id = el.attrs['id']
      if (id && !seen.has(id)) {
        seen.add(id)
        const geom = el.children.find((c) => c.tag.toLowerCase() === 'mxgeometry')
        out.push(shapeFrom(id, {}, el, geom))
      }
    }
    for (const child of el.children) {
      if (tag === 'object' || tag === 'userobject') {
        const childTag = child.tag.toLowerCase()
        if (childTag === 'mxcell') {
          for (const nested of child.children) walk(nested)
          continue
        }
      }
      walk(child)
    }
  }
  walk(graph)
  return out
}

function shapeFrom(
  id: string,
  attrs: Record<string, string>,
  cell: XmlNode | undefined,
  geom: XmlNode | undefined,
): Shape {
  return {
    id,
    attrs,
    parent: cell?.attrs['parent'],
    edge: cell?.attrs['edge'] === '1',
    source: cell?.attrs['source'],
    target: cell?.attrs['target'],
    value: cell?.attrs['value'],
    x: num(geom?.attrs['x']),
    y: num(geom?.attrs['y']),
    width: num(geom?.attrs['width']),
    height: num(geom?.attrs['height']),
  }
}

function plain(value: string | undefined): string | undefined {
  if (!value) return undefined
  const text = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text || undefined
}

function validName(value: string | undefined): string | undefined {
  const name = value?.trim()
  return name && NAME_RE.test(name) ? name : undefined
}

function num(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function intAttr(value: string | undefined): number | undefined {
  const n = num(value)
  return n === undefined ? undefined : Math.trunc(n)
}

function uniqueSlug(name: string, taken: Set<string>): string {
  const base = slug(name)
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

function slug(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'page'
  )
}

function b64ToBytes(data: string): Uint8Array {
  const bin = atob(data)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}

function parseXml(source: string): XmlNode {
  const xml = source.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').trim()
  let i = 0
  const skip = () => {
    while (i < xml.length && /\s/.test(xml[i]!)) i += 1
  }
  const readName = () => {
    const start = i
    while (i < xml.length && /[A-Za-z0-9_:-]/.test(xml[i]!)) i += 1
    return xml.slice(start, i)
  }
  const parseNode = (): XmlNode | undefined => {
    skip()
    if (xml[i] !== '<' || xml.startsWith('</', i)) return undefined
    i += 1
    const tag = readName()
    const attrs: Record<string, string> = {}
    while (i < xml.length) {
      skip()
      if (xml[i] === '/' && xml[i + 1] === '>') {
        i += 2
        return { tag, attrs, children: [], text: '' }
      }
      if (xml[i] === '>') {
        i += 1
        break
      }
      const name = readName()
      skip()
      if (xml[i] !== '=') throw new Error(`draw.io XML is missing a value for ${name || tag}`)
      i += 1
      skip()
      const quote = xml[i]
      if (quote !== '"' && quote !== "'") throw new Error(`draw.io XML has an unquoted ${name}`)
      i += 1
      let val = ''
      while (i < xml.length && xml[i] !== quote) {
        val += xml[i]
        i += 1
      }
      i += 1
      attrs[name] = decodeEntities(val)
    }
    const children: XmlNode[] = []
    let text = ''
    while (i < xml.length) {
      if (xml.startsWith('</', i)) {
        i += 2
        readName()
        skip()
        if (xml[i] === '>') i += 1
        return { tag, attrs, children, text: decodeEntities(text).trim() }
      }
      if (xml[i] === '<') {
        const child = parseNode()
        if (!child) break
        children.push(child)
      } else {
        text += xml[i]
        i += 1
      }
    }
    return { tag, attrs, children, text: decodeEntities(text).trim() }
  }
  const root = parseNode()
  if (!root) throw new Error('draw.io XML is empty.')
  return root
}

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (whole, ent: string) => {
    if (ent === 'amp') return '&'
    if (ent === 'lt') return '<'
    if (ent === 'gt') return '>'
    if (ent === 'quot') return '"'
    if (ent === 'apos') return "'"
    if (ent.startsWith('#x')) return String.fromCodePoint(parseInt(ent.slice(2), 16))
    if (ent.startsWith('#')) return String.fromCodePoint(parseInt(ent.slice(1), 10))
    return whole
  })
}
