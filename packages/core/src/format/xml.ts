/** A parsed XML element: enough for draw.io, DMN and XLSX parts. */
export interface XmlNode {
  tag: string
  attrs: Record<string, string>
  children: XmlNode[]
  text: string
}

/** A small, forgiving XML reader: no DTD, no CDATA; text is trimmed. */
export function parseXml(source: string, what = 'XML'): XmlNode {
  const xml = source
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim()
  let i = 0
  const skip = () => {
    while (i < xml.length && /\s/.test(xml[i]!)) i += 1
  }
  const readName = () => {
    const start = i
    while (i < xml.length && /[A-Za-z0-9_.:-]/.test(xml[i]!)) i += 1
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
      if (xml[i] !== '=') throw new Error(`${what} is missing a value for ${name || tag}`)
      i += 1
      skip()
      const quote = xml[i]
      if (quote !== '"' && quote !== "'") throw new Error(`${what} has an unquoted ${name}`)
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
  if (!root) throw new Error(`${what} is empty.`)
  return root
}

export function decodeEntities(value: string): string {
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

export function encodeEntities(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
