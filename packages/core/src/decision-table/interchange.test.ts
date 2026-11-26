import { describe, expect, it } from 'vitest'
import { strFromU8, unzipSync, zipSync, strToU8 } from 'fflate'
import type { DecisionTable } from '../model/types.js'
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
} from './interchange.js'

const diazepam: DecisionTable = {
  id: 'diazepam',
  title: 'Diazepam, rectal (ml)',
  hitPolicy: 'first',
  inputs: [
    { name: 'weight', concept: 'CHE.B6.DE07', type: 'decimal' },
    { name: 'age', concept: 'age_in_months', type: 'integer' },
  ],
  outputs: [{ name: 'dose', type: 'string' }],
  rules: [
    ['>= 20', '-', '2.5'],
    ['[6..10)', '-', '0.75'],
    ['-', '[2..5)', '0.4'],
    ['null', '-', ''],
  ],
}

const sign: DecisionTable = {
  id: 'signs',
  hitPolicy: 'rule_order',
  inputs: [{ name: 'cough', type: 'string' }],
  outputs: [
    { name: 'code', type: 'string' },
    { name: 'points', type: 'integer' },
  ],
  rules: [
    ["'yes', 'often'", 'cough', '2'],
    ['-', 'say "a, b"', '0'],
  ],
}

/** What a file carries: everything but the id and title, which come from the file. */
const content = ({ id: _i, title: _t, ...rest }: DecisionTable) => rest

describe('CSV', () => {
  it('round-trips a table, quoting cells with commas and quotes', () => {
    const csv = toCsv(tableToRows(sign))
    expect(csv.split('\r\n')[2]).toBe(`"'yes', 'often'",cough,2`)
    expect(rowsToTable(fromCsv(csv), 'signs', 'rule_order')).toEqual(sign)
    expect(rowsToTable(fromCsv(toCsv(tableToRows(diazepam))), 'diazepam')).toEqual({
      ...content(diazepam),
      id: 'diazepam',
    })
  })

  it('reads a plain sheet with ; and guesses the columns', () => {
    const table = rowsToTable(
      fromCsv("\uFEFFweight;cough;dose\n>= 20;-;2.5\n[3..20);'yes';1.2\n"),
      'plain',
    )
    expect(table.inputs).toEqual([
      { name: 'weight', type: 'decimal' },
      { name: 'cough', type: 'string' },
    ])
    expect(table.outputs).toEqual([{ name: 'dose', type: 'string' }])
    expect(table.rules).toEqual([
      ['>= 20', '-', '2.5'],
      ['[3..20)', "'yes'", '1.2'],
    ])
  })

  it('explains a sheet it cannot read', () => {
    expect(() => rowsToTable([['only']], 't')).toThrow(/name the columns/)
    expect(() =>
      rowsToTable(
        [
          ['a', 'b'],
          ['output string', 'input decimal'],
        ],
        't',
      ),
    ).toThrow(/inputs must all come before/)
  })
})

describe('XLSX', () => {
  it('round-trips a table, every cell kept as text', () => {
    const bytes = toXlsx(tableToRows(diazepam))
    expect(toXlsx(tableToRows(diazepam))).toEqual(bytes)
    expect(rowsToTable(fromXlsx(bytes), 'diazepam')).toEqual({
      id: 'diazepam',
      hitPolicy: 'first',
      inputs: diazepam.inputs,
      outputs: diazepam.outputs,
      rules: diazepam.rules,
    })
  })

  it('reads shared strings, numbers and gaps as a spreadsheet writes them', () => {
    const xml = (s: string) => strToU8(`<?xml version="1.0"?>${s}`)
    const bytes = zipSync({
      'xl/workbook.xml': xml(
        '<workbook xmlns:r="r"><sheets><sheet name="S" sheetId="1" r:id="rId7"/></sheets></workbook>',
      ),
      'xl/_rels/workbook.xml.rels': xml(
        '<Relationships><Relationship Id="rId7" Target="worksheets/data.xml"/></Relationships>',
      ),
      'xl/sharedStrings.xml': xml(
        '<sst><si><t>weight</t></si><si><r><t>do</t></r><r><t>se</t></r></si><si><t>&gt;= 20</t></si></sst>',
      ),
      'xl/worksheets/data.xml': xml(
        '<worksheet><sheetData>' +
          '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row>' +
          '<row r="3"><c r="A3" t="s"><v>2</v></c><c r="C3"><v>0.75</v></c></row>' +
          '</sheetData></worksheet>',
      ),
    })
    expect(fromXlsx(bytes)).toEqual([['weight', '', 'dose'], [], ['>= 20', '', '0.75']])
  })

  it('is a workbook Excel opens: the parts it needs are there', () => {
    const parts = Object.keys(unzipSync(toXlsx([['a']])))
    expect(parts.sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
    ])
    expect(() => fromXlsx(new Uint8Array([1, 2, 3]))).toThrow(/not an Excel workbook/)
  })
})

describe('DMN XML', () => {
  it('writes a DMN 1.3 decision table and reads it back', () => {
    const xml = toDmnXml([diazepam, sign], 'Global')
    expect(xml).toContain('<decisionTable id="diazepam_table" hitPolicy="FIRST">')
    expect(xml).toContain('hitPolicy="RULE ORDER"')
    expect(xml).toContain('<inputExpression typeRef="number"><text>CHE.B6.DE07</text>')
    expect(xml).toContain('<inputEntry><text>&gt;= 20</text></inputEntry>')
    expect(xml).toContain('<outputEntry><text>&quot;2.5&quot;</text></outputEntry>')
    expect(xml).toContain('<inputEntry><text>&quot;yes&quot;, &quot;often&quot;</text>')
    expect(fromDmnXml(xml)).toEqual([diazepam, sign])
    expect(strFromU8(strToU8(xml))).toBe(xml)
  })

  it('reads a DMN file from another tool', () => {
    const tables = fromDmnXml(`<?xml version="1.0" encoding="UTF-8"?>
<dmn:definitions xmlns:dmn="https://www.omg.org/spec/DMN/20191111/MODEL/" id="d" name="d">
  <dmn:decision id="season" name="Season">
    <dmn:decisionTable hitPolicy="UNIQUE">
      <dmn:input label="Month"><dmn:inputExpression typeRef="integer"><dmn:text>month</dmn:text></dmn:inputExpression></dmn:input>
      <dmn:output name="season" typeRef="string"/>
      <dmn:rule><dmn:inputEntry><dmn:text>[6..9]</dmn:text></dmn:inputEntry><dmn:outputEntry><dmn:text>"rainy"</dmn:text></dmn:outputEntry></dmn:rule>
      <dmn:rule><dmn:inputEntry><dmn:text></dmn:text></dmn:inputEntry><dmn:outputEntry><dmn:text>"dry"</dmn:text></dmn:outputEntry></dmn:rule>
    </dmn:decisionTable>
  </dmn:decision>
</dmn:definitions>`)
    expect(tables).toEqual([
      {
        id: 'season',
        title: 'Season',
        hitPolicy: 'unique',
        inputs: [{ name: 'Month', type: 'integer', concept: 'month' }],
        outputs: [{ name: 'season', type: 'string' }],
        rules: [
          ['[6..9]', 'rainy'],
          ['-', 'dry'],
        ],
      },
    ])
  })

  it('refuses a hit policy TRICC tables do not have', () => {
    const xml = toDmnXml([diazepam]).replace('hitPolicy="FIRST"', 'hitPolicy="COLLECT"')
    expect(() => fromDmnXml(xml)).toThrow(/hit policy COLLECT/)
    expect(() => fromDmnXml('<definitions/>')).toThrow(/no decision table/)
  })
})

it('makes a table id from a file name', () => {
  expect(tableIdFrom('Diazépam doses.csv')).toBe('diazepam_doses')
  expect(tableIdFrom('2024.xlsx')).toBe('table_2024')
})
