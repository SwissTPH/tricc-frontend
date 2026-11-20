import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import {
  HIT_POLICIES,
  TABLE_COLUMN_TYPES,
  type DecisionTable,
  type HitPolicy,
  type TableColumn,
  type TableColumnType,
} from '../model/types.js'
import { encodeEntities, parseXml, type XmlNode } from '../format/xml.js'
import { parseLiteral } from './cell.js'

/**
 * Decision tables to and from the files authors exchange (feature/20261120-decision-table-
 * editor.md phase 4): CSV and XLSX with one row per rule, and DMN XML (decision tables only).
 *
 * CSV / XLSX: row 1 names the columns; row 2 says what each is — `input decimal CHE.B6.DE07`,
 * `output string` — so a file read back gives the same table. A sheet without that row is read
 * too: the last column is the output, the others inputs, the types guessed from the cells.
 */

// ---------------------------------------------------------------- rows

const KIND = new RegExp(`^(input|output)\\s+(${TABLE_COLUMN_TYPES.join('|')})(?:\\s+(\\S+))?$`)

/** The table as rows: names, kinds, then one row per rule. */
export function tableToRows(table: DecisionTable): string[][] {
  const kinds = [
    ...table.inputs.map((c) => ['input', c.type, c.concept].filter(Boolean).join(' ')),
    ...table.outputs.map((c) => ['output', c.type, c.concept].filter(Boolean).join(' ')),
  ]
  return [[...table.inputs, ...table.outputs].map((c) => c.name), kinds, ...table.rules]
}

/** A table from rows. Throws with a reason an author can act on. */
export function rowsToTable(
  rows: string[][],
  id: string,
  policy: HitPolicy = 'first',
): DecisionTable {
  const filled = rows.filter((r) => r.some((c) => c.trim() !== ''))
  const header = filled[0]?.map((c) => c.trim())
  if (!header || header.length < 2) {
    throw new Error('The first row must name the columns: the inputs, then at least one output.')
  }
  if (header.some((h) => h === '')) throw new Error('A column in the first row has no name.')
  const width = header.length
  const kindRow = filled[1]?.map((c) => c.trim())
  const declared = kindRow && kindRow.slice(0, width).every((k) => KIND.test(k))
  const body = filled.slice(declared ? 2 : 1).map((r) => {
    const row = r.slice(0, width).map((c) => c.trim())
    while (row.length < width) row.push('')
    return row
  })
  const columns: (TableColumn & { kind: 'input' | 'output' })[] = header.map((name, i) => {
    if (declared) {
      const m = KIND.exec(kindRow[i]!)!
      const col: TableColumn & { kind: 'input' | 'output' } = {
        kind: m[1] as 'input' | 'output',
        name,
        type: m[2] as TableColumnType,
      }
      if (m[3]) col.concept = m[3]
      return col
    }
    const output = i === width - 1
    return {
      kind: output ? 'output' : 'input',
      name,
      type: guessType(
        body.map((r) => r[i]!),
        output,
      ),
    }
  })
  const inputs = columns.filter((c) => c.kind === 'input')
  const outputs = columns.filter((c) => c.kind === 'output')
  if (outputs.length === 0) throw new Error('The second row marks no column as an output.')
  const firstOutput = columns.findIndex((c) => c.kind === 'output')
  if (columns.slice(firstOutput).some((c) => c.kind === 'input')) {
    throw new Error('The inputs must all come before the outputs.')
  }
  const strip = ({ kind: _k, ...c }: TableColumn & { kind: string }): TableColumn => c
  return {
    id,
    hitPolicy: policy,
    inputs: inputs.map(strip),
    outputs: outputs.map(strip),
    rules: body,
  }
}

/** A number column when every cell reads as a number test; text otherwise. */
function guessType(cells: string[], output: boolean): TableColumnType {
  const filled = cells.filter((c) => c !== '' && c !== '-' && c !== 'null')
  if (filled.length === 0) return output ? 'string' : 'decimal'
  if (output) return 'string'
  const numeric =
    /^(?:[<>]=?|=)?\s*-?\d+(?:\.\d+)?$|^[[(]\s*-?\d+(?:\.\d+)?\s*\.\.\s*-?\d+(?:\.\d+)?\s*[\])]$/
  return filled.every((c) => c.split(',').every((p) => numeric.test(p.trim())))
    ? 'decimal'
    : 'string'
}

// ---------------------------------------------------------------- CSV

/** RFC 4180 CSV, comma separated, CRLF line ends. */
export function toCsv(rows: string[][]): string {
  return (
    rows
      .map((r) =>
        r
          .map((c) => (/[",\r\n]/.test(c) || c !== c.trim() ? `"${c.replace(/"/g, '""')}"` : c))
          .join(','),
      )
      .join('\r\n') + '\r\n'
  )
}

/** CSV with `,` or `;` (as spreadsheets in many locales write it), quotes doubled. */
export function fromCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '')
  const firstLine = src.split(/\r?\n/, 1)[0] ?? ''
  const sep = count(firstLine, ';') > count(firstLine, ',') ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
      continue
    }
    if (ch === '"' && cell === '') quoted = true
    else if (ch === sep) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

function count(text: string, ch: string): number {
  return text.split(ch).length - 1
}

// ---------------------------------------------------------------- XLSX

/** A one-sheet workbook, every cell as text so `[3..6)` and `0.75` stay as written. */
export function toXlsx(rows: string[][], sheetName = 'Rules'): Uint8Array {
  const sheetRows = rows
    .map((r, i) => {
      const cells = r
        .map(
          (c, j) =>
            `<c r="${columnName(j)}${i + 1}" t="inlineStr"><is><t xml:space="preserve">${encodeEntities(c)}</t></is></c>`,
        )
        .join('')
      return `<row r="${i + 1}">${cells}</row>`
    })
    .join('')
  const xml = (body: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${body}`
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      xml(
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          '</Types>',
      ),
    ),
    '_rels/.rels': strToU8(
      xml(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          '</Relationships>',
      ),
    ),
    'xl/workbook.xml': strToU8(
      xml(
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          `<sheets><sheet name="${encodeEntities(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets>` +
          '</workbook>',
      ),
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      xml(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
          '</Relationships>',
      ),
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      xml(
        `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
      ),
    ),
  }
  // A fixed date keeps the bytes the same for the same table.
  return zipSync(files, { mtime: new Date('2026-01-01T00:00:00Z') })
}

/** The first sheet of a workbook as rows of text. */
export function fromXlsx(bytes: Uint8Array): string[][] {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    throw new Error('This file is not an Excel workbook (.xlsx).')
  }
  const text = (path: string) => (files[path] ? strFromU8(files[path]!) : undefined)
  const shared = (() => {
    const s = text('xl/sharedStrings.xml')
    if (!s) return []
    return parseXml(s, 'The workbook')
      .children.filter((n) => n.tag.endsWith('si'))
      .map(textOf)
  })()
  const sheetPath = firstSheetPath(text) ?? 'xl/worksheets/sheet1.xml'
  const sheet = text(sheetPath)
  if (!sheet) throw new Error('The workbook has no sheet.')
  const rows: string[][] = []
  for (const row of descendants(parseXml(sheet, 'The workbook'), 'row')) {
    const r = Number(row.attrs['r'] ?? rows.length + 1) - 1
    const out: string[] = []
    row.children
      .filter((c) => localName(c.tag) === 'c')
      .forEach((c, k) => {
        const col = c.attrs['r'] ? columnIndex(c.attrs['r']) : k
        const type = c.attrs['t']
        const v = c.children.find((n) => localName(n.tag) === 'v')?.text ?? ''
        let value: string
        if (type === 's') value = shared[Number(v)] ?? ''
        else if (type === 'inlineStr') value = textOf(c)
        else if (type === 'b') value = v === '1' ? 'true' : 'false'
        else value = v
        while (out.length < col) out.push('')
        out[col] = value
      })
    while (rows.length < r) rows.push([])
    rows[r] = out
  }
  return rows
}

function firstSheetPath(text: (p: string) => string | undefined): string | undefined {
  const wb = text('xl/workbook.xml')
  const rels = text('xl/_rels/workbook.xml.rels')
  if (!wb || !rels) return undefined
  const sheet = descendants(parseXml(wb, 'The workbook'), 'sheet')[0]
  const rid =
    sheet &&
    (sheet.attrs['r:id'] ?? Object.entries(sheet.attrs).find(([k]) => k.endsWith(':id'))?.[1])
  const rel = descendants(parseXml(rels, 'The workbook'), 'Relationship').find(
    (r) => r.attrs['Id'] === rid,
  )
  const target = rel?.attrs['Target']
  if (!target) return undefined
  return target.startsWith('/') ? target.slice(1) : `xl/${target}`
}

function columnName(index: number): string {
  let n = index + 1
  let name = ''
  while (n > 0) {
    const m = (n - 1) % 26
    name = String.fromCharCode(65 + m) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? 'A'
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function localName(tag: string): string {
  return tag.includes(':') ? tag.slice(tag.indexOf(':') + 1) : tag
}

function descendants(node: XmlNode, name: string): XmlNode[] {
  const out: XmlNode[] = []
  const walk = (n: XmlNode) => {
    if (localName(n.tag) === name) out.push(n)
    n.children.forEach(walk)
  }
  walk(node)
  return out
}

/** All `t` text under a node (a rich-text cell has several runs). */
function textOf(node: XmlNode): string {
  if (localName(node.tag) === 't') return node.text
  return node.children.map(textOf).join('')
}

// ---------------------------------------------------------------- DMN XML

const DMN_NS = 'https://www.omg.org/spec/DMN/20191111/MODEL/'
const DMN_POLICY: Record<HitPolicy, string> = {
  first: 'FIRST',
  unique: 'UNIQUE',
  rule_order: 'RULE ORDER',
}
const TYPE_REF: Record<TableColumnType, string> = {
  string: 'string',
  integer: 'integer',
  decimal: 'number',
  boolean: 'boolean',
}

/** One decision per table, its inputs read by name (or by concept, when it has one). */
export function toDmnXml(tables: DecisionTable[], name = 'tables'): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<definitions xmlns="${DMN_NS}" id="${xmlId(name)}" name="${encodeEntities(name)}" namespace="https://tricc.org/dmn/${encodeEntities(xmlId(name))}">`,
  ]
  for (const table of tables) {
    lines.push(
      `  <decision id="${xmlId(table.id)}" name="${encodeEntities(table.title ?? table.id)}">`,
      `    <decisionTable id="${xmlId(table.id)}_table" hitPolicy="${DMN_POLICY[table.hitPolicy]}">`,
    )
    table.inputs.forEach((c, i) => {
      lines.push(
        `      <input id="${xmlId(table.id)}_in${i + 1}" label="${encodeEntities(c.name)}">`,
        `        <inputExpression typeRef="${TYPE_REF[c.type]}"><text>${encodeEntities(c.concept ?? c.name)}</text></inputExpression>`,
        '      </input>',
      )
    })
    table.outputs.forEach((c, j) => {
      lines.push(
        `      <output id="${xmlId(table.id)}_out${j + 1}" name="${encodeEntities(c.name)}" typeRef="${TYPE_REF[c.type]}"/>`,
      )
    })
    table.rules.forEach((rule, r) => {
      lines.push(`      <rule id="${xmlId(table.id)}_r${r + 1}">`)
      table.inputs.forEach((_, i) =>
        lines.push(
          `        <inputEntry><text>${encodeEntities(toFeelTest(rule[i] ?? '-'))}</text></inputEntry>`,
        ),
      )
      table.outputs.forEach((c, j) =>
        lines.push(
          `        <outputEntry><text>${encodeEntities(toFeelLiteral(rule[table.inputs.length + j] ?? '', c.type))}</text></outputEntry>`,
        ),
      )
      lines.push('      </rule>')
    })
    lines.push('    </decisionTable>', '  </decision>')
  }
  lines.push('</definitions>', '')
  return lines.join('\n')
}

/** Every decision table of a DMN file. Other DMN elements are ignored. */
export function fromDmnXml(text: string): DecisionTable[] {
  const root = parseXml(text, 'The DMN file')
  const decisions = descendants(root, 'decision')
  const tables: DecisionTable[] = []
  for (const decision of decisions) {
    const dt = decision.children.find((c) => localName(c.tag) === 'decisionTable')
    if (!dt) continue
    const policy = fromDmnPolicy(dt.attrs['hitPolicy'], decision.attrs['id'] ?? '')
    const child = (n: XmlNode, name: string) => n.children.filter((c) => localName(c.tag) === name)
    const inputs: TableColumn[] = child(dt, 'input').map((input, i) => {
      const expr = child(input, 'inputExpression')[0]
      const exprText = expr ? (child(expr, 'text')[0]?.text ?? '') : ''
      const name = input.attrs['label'] || exprText || `input_${i + 1}`
      const col: TableColumn = { name, type: fromTypeRef(expr?.attrs['typeRef']) }
      if (exprText && exprText !== name && /^[\w.]+$/.test(exprText)) col.concept = exprText
      return col
    })
    const outputs: TableColumn[] = child(dt, 'output').map((output, j) => ({
      name: output.attrs['name'] || output.attrs['label'] || `output_${j + 1}`,
      type: fromTypeRef(output.attrs['typeRef']),
    }))
    const rules = child(dt, 'rule').map((rule) => [
      ...child(rule, 'inputEntry').map((e) => fromFeelTest(child(e, 'text')[0]?.text ?? '-')),
      ...child(rule, 'outputEntry').map((e, j) =>
        fromFeelLiteral(child(e, 'text')[0]?.text ?? '', outputs[j]?.type ?? 'string'),
      ),
    ])
    const id = decision.attrs['id'] || `table_${tables.length + 1}`
    const table: DecisionTable = { id, hitPolicy: policy, inputs, outputs, rules }
    const title = decision.attrs['name']
    if (title && title !== id) table.title = title
    tables.push(table)
  }
  if (tables.length === 0) throw new Error('The DMN file has no decision table.')
  return tables
}

function fromDmnPolicy(value: string | undefined, id: string): HitPolicy {
  const v = (value ?? 'UNIQUE').toUpperCase().replace(/_/g, ' ')
  const found = (Object.keys(DMN_POLICY) as HitPolicy[]).find((p) => DMN_POLICY[p] === v)
  if (!found) {
    throw new Error(
      `The decision "${id}" uses the hit policy ${value}; TRICC tables are ${HIT_POLICIES.map((p) => DMN_POLICY[p]).join(', ')}.`,
    )
  }
  return found
}

function fromTypeRef(value: string | undefined): TableColumnType {
  const v = (value ?? 'string').toLowerCase().replace(/^feel:/, '')
  if (v === 'integer' || v === 'long' || v === 'int') return 'integer'
  if (v === 'number' || v === 'double' || v === 'decimal') return 'decimal'
  if (v === 'boolean') return 'boolean'
  return 'string'
}

/** Our `'text'` is FEEL `"text"`; everything else is already FEEL. */
function toFeelTest(cell: string): string {
  return cell.replace(/'((?:[^'\\]|\\.)*)'/g, (_m, s: string) =>
    JSON.stringify(s.replace(/\\(.)/g, '$1')),
  )
}

function fromFeelTest(text: string): string {
  const t = text.trim()
  if (t === '') return '-'
  return t.replace(
    /"((?:[^"\\]|\\.)*)"/g,
    (_m, s: string) => `'${s.replace(/\\(.)/g, '$1').replace(/'/g, "\\'")}'`,
  )
}

function toFeelLiteral(cell: string, type: TableColumnType): string {
  return type === 'string' ? JSON.stringify(cell) : cell
}

function fromFeelLiteral(text: string, type: TableColumnType): string {
  const t = text.trim()
  if (type !== 'string') return t
  const value = parseLiteral(t)
  return typeof value === 'string' ? value : t
}

function xmlId(value: string): string {
  const id = value.replace(/[^A-Za-z0-9_.-]/g, '_')
  return /^[A-Za-z_]/.test(id) ? id : `_${id}`
}

/** A table id from a file name: `Diazepam doses.csv` → `diazepam_doses`. */
export function tableIdFrom(fileName: string): string {
  const id = fileName
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return /^[a-z]/.test(id) ? id : `table_${id || '1'}`
}
