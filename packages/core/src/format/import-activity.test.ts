import { describe, expect, it } from 'vitest'
import { activityKind } from '../model/activity-kind.js'
import { readActivityFile } from './import-activity.js'

const cough = `
id: cough
title: Cough
nodes:
  - id: start
    type: activity_start
    name: cough
    ui: { x: 40, y: 40 }
  - id: n1
    type: note
    label: Ask about cough
    ui: { x: 40, y: 140 }
edges: []
`

const airway = `
id: airway-process
process: airway
title: Airway
nodes:
  - id: start
    type: start
    name: airway
    process: airway
    form_id: ETAT
    ui: { x: 40, y: 40 }
edges: []
`

function drawio(pages: { name: string; type: string; process?: string }[]): string {
  const diagrams = pages
    .map((page, index) => {
      const process = page.process ? ` process="${page.process}"` : ''
      return `<diagram id="p${index}" name="${page.name}"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><object id="s" label="${page.name}" odk_type="${page.type}"${process}><mxCell vertex="1" parent="1"><mxGeometry x="10" y="20" width="80" height="40" as="geometry"/></mxCell></object></root></mxGraphModel></diagram>`
    })
    .join('')
  return `<mxfile>${diagrams}</mxfile>`
}

describe('readActivityFile', () => {
  it('reads an activity yaml and a process yaml', () => {
    const taken = new Set<string>()
    const [activity] = readActivityFile('cough.activity.yaml', cough, taken, 'en')
    expect(activity?.activity.id).toBe('cough')
    expect(activity?.activity.nodes.n1?.label).toEqual({ en: 'Ask about cough' })
    expect(activityKind(activity!.activity)).toBe('activity')
    expect(activity?.alreadyInProject).toBe(false)

    const [process] = readActivityFile('airway.activity.yaml', airway, taken, 'en')
    expect(activityKind(process!.activity)).toBe('process')
    expect(process?.activity.nodes.start?.form_id).toBe('ETAT')
    expect([...taken].sort()).toEqual(['airway-process', 'cough'])
  })

  it('saves a second copy when the library already has that id', () => {
    const taken = new Set(['cough'])
    const [copy] = readActivityFile('cough.activity.yaml', cough, taken, 'en')
    expect(copy?.activity.id).toBe('cough-2')
    expect(copy?.renamedFrom).toBe('cough')
    expect(copy?.alreadyInProject).toBe(true)
    expect(taken.has('cough-2')).toBe(true)
  })

  it('reads each draw.io page and keeps a within-file rename', () => {
    const taken = new Set<string>()
    const pages = readActivityFile(
      'visit.drawio',
      drawio([
        { name: 'Airway', type: 'start', process: 'airway' },
        { name: 'Cough', type: 'activity_start' },
        { name: 'Cough', type: 'activity_start' },
      ]),
      taken,
      'en',
    )
    expect(pages.map((page) => page.activity.id)).toEqual(['airway', 'cough', 'cough-2'])
    expect(activityKind(pages[0]!.activity)).toBe('process')
    expect(activityKind(pages[1]!.activity)).toBe('activity')
    expect(pages[2]?.renamedFrom).toBe('cough')
    expect(pages[2]?.alreadyInProject).toBe(false)
  })

  it('says when the file is a project or empty or unreadable', () => {
    const taken = new Set<string>()
    expect(() => readActivityFile('empty.yaml', '   ', taken)).toThrow(/empty/)
    expect(() => readActivityFile('tricc.yaml', 'interventions:\n  - id: a\n', taken)).toThrow(/project file/)
    expect(() => readActivityFile('notes.txt', 'hello', taken)).toThrow(/not an activity file/)
    expect(taken.size).toBe(0)
  })
})
