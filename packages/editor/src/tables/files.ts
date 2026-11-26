import {
  fromCsv,
  fromDmnXml,
  fromXlsx,
  rowsToTable,
  tableIdFrom,
  tableToRows,
  toCsv,
  toDmnXml,
  toXlsx,
  type DecisionTable,
} from '@tricc/core'

export type TableFormat = 'csv' | 'xlsx' | 'dmn'

export const TABLE_FILE_ACCEPT = '.csv,.xlsx,.dmn,.xml'

/** The tables in a file: one from a CSV or a workbook, every decision table of a DMN file. */
export async function readTableFile(file: File): Promise<DecisionTable[]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx')) {
    return [
      rowsToTable(fromXlsx(new Uint8Array(await read(file, 'buffer'))), tableIdFrom(file.name)),
    ]
  }
  const text = await read(file, 'text')
  if (name.endsWith('.dmn') || name.endsWith('.xml') || text.trimStart().startsWith('<')) {
    return fromDmnXml(text)
  }
  return [rowsToTable(fromCsv(text), tableIdFrom(file.name))]
}

function read(file: Blob, as: 'text'): Promise<string>
function read(file: Blob, as: 'buffer'): Promise<ArrayBuffer>
function read(file: Blob, as: 'text' | 'buffer'): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string | ArrayBuffer)
    reader.onerror = () => reject(reader.error ?? new Error(`Could not read the file.`))
    if (as === 'text') reader.readAsText(file)
    else reader.readAsArrayBuffer(file)
  })
}

/** Save a table as a file in the browser's downloads. */
export function downloadTable(table: DecisionTable, format: TableFormat): void {
  const data =
    format === 'csv'
      ? new Blob(['\uFEFF', toCsv(tableToRows(table))], { type: 'text/csv' })
      : format === 'xlsx'
        ? new Blob([toXlsx(tableToRows(table), table.id) as Uint8Array<ArrayBuffer>], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          })
        : new Blob([toDmnXml([table], table.id)], { type: 'application/xml' })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = `${table.id}.${format}`
  link.click()
  URL.revokeObjectURL(url)
}
