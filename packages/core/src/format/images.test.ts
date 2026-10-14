import { describe, expect, it } from 'vitest'
import { sampleProject } from './__fixtures__.js'
import { readProject, writeChanged, writeProject } from './serialize/index.js'
import { fromArchive, toArchive } from './archive.js'
import { activitiesFromDrawio } from './drawio.js'
import { readActivityFile } from './import-activity.js'
import { ProjectDocument } from '../document/doc.js'
import { moveTextsToConcepts } from '../terminology/texts-to-concepts.js'
import { validateProject } from '../validate/project.js'
import {
  designationText,
  imageRefs,
  messageFromJson,
  prependImage,
  retargetImage,
  toMarkdown,
  toPlain,
  withDesignationText,
  type Message,
} from '../text/message.js'
import type { Project } from '../model/types.js'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
const CS = 'http://tricc.org/CodeSystem/tricc'

const withPicture: Message = {
  type: 'message',
  children: [
    { type: 'text', value: 'Look at the chest ' },
    { type: 'image', src: 'Binary/chest', alt: 'indrawing' },
    { type: 'break' },
    { type: 'text', value: 'Is there indrawing?' },
  ],
}

/** The sample project, with an image shown by the weight q-display. */
function projectWithImage(): Project {
  const project = sampleProject()
  project.images = { chest: { id: 'chest', contentType: 'image/png', data: PNG } }
  const weight = project.codeSystems[CS]!.concepts['weight']!
  weight.designations = weight.designations.map((d) =>
    d.language === 'en' && d.use?.code === 'q-display' ? withDesignationText(d, withPicture) : d,
  )
  return project
}

function qDisplay(project: Project, code = 'weight') {
  return project.codeSystems[CS]!.concepts[code]!.designations.find(
    (d) => d.language === 'en' && d.use?.code === 'q-display',
  )!
}

describe('the image node', () => {
  it('renders as Markdown, drops out of plain text and round-trips as JSON', () => {
    expect(toMarkdown(withPicture)).toBe('Look at the chest ![indrawing](Binary/chest)\nIs there indrawing?')
    expect(toPlain(withPicture)).toBe('Look at the chest  Is there indrawing?')
    expect(messageFromJson(JSON.parse(JSON.stringify(withPicture)))).toEqual(withPicture)
    expect(imageRefs(withPicture)).toEqual(['chest'])
  })

  it('is renamed, removed and put first', () => {
    expect(imageRefs(retargetImage(withPicture, 'chest', 'thorax'))).toEqual(['thorax'])
    expect(imageRefs(retargetImage(withPicture, 'chest', undefined))).toEqual([])
    expect(retargetImage(withPicture, 'other', 'x')).toBe(withPicture)
    const first = prependImage('Weight (kg)', 'scale')
    expect(toMarkdown(first)).toBe('![](Binary/scale)\nWeight (kg)')
  })
})

describe('image files', () => {
  it('writes and reads the bytes under media/images', () => {
    const files = writeProject(projectWithImage())
    expect(files['media/images/chest.png']).toEqual(PNG)
    const { project } = readProject(files)
    expect(project.images?.['chest']).toEqual({ id: 'chest', contentType: 'image/png', data: PNG })
    expect(imageRefs(designationText(qDisplay(project)))).toEqual(['chest'])
  })

  it('follows media_path', () => {
    const p = projectWithImage()
    p.mediaPath = 'assets'
    const files = writeProject(p)
    expect(Object.keys(files)).toContain('assets/images/chest.png')
    expect(readProject(files).project.images?.['chest']?.data).toEqual(PNG)
  })

  it('compares bytes, and removes the file of a deleted image', () => {
    const p = projectWithImage()
    const before = writeProject(p)
    p.images = { chest: { id: 'chest', contentType: 'image/png', data: PNG.slice() } }
    expect(writeChanged(p, before).changed).toEqual([])
    delete p.images
    expect(writeChanged(p, before).removed).toEqual(['media/images/chest.png'])
  })

  it('keeps the bytes in the archive', () => {
    const files = fromArchive(toArchive(writeProject(projectWithImage())))
    expect(files['media/images/chest.png']).toEqual(PNG)
    expect(typeof files['tricc.yaml']).toBe('string')
  })

  it('turns a file name that is not an id into one', () => {
    const files = writeProject(sampleProject())
    files['media/images/Chest Indrawing.PNG'] = PNG
    const read = readProject(files)
    expect(Object.keys(read.project.images ?? {})).toEqual(['chest-indrawing'])
  })
})

describe('images in the document', () => {
  it('keeps the bytes, and rename and delete follow every text', () => {
    const doc = ProjectDocument.fromProject(projectWithImage())
    expect(doc.snapshot().images?.['chest']?.data).toEqual(PNG)

    doc.transact((tx) => tx.renameImage('chest', 'thorax'))
    let p = doc.snapshot()
    expect(Object.keys(p.images ?? {})).toEqual(['thorax'])
    expect(imageRefs(designationText(qDisplay(p)))).toEqual(['thorax'])

    doc.transact((tx) => tx.removeImage('thorax'))
    p = doc.snapshot()
    expect(p.images).toBeUndefined()
    expect(imageRefs(designationText(qDisplay(p)))).toEqual([])
    expect(toPlain(designationText(qDisplay(p)))).toContain('Is there indrawing?')
  })
})

describe('legacy media.image', () => {
  it('becomes the first picture of the questionnaire text', () => {
    const p = sampleProject()
    p.activities['triage-danger-signs']!.nodes['n-weight']!.media = { image: 'Scale.png' }
    moveTextsToConcepts(p)
    expect(p.activities['triage-danger-signs']!.nodes['n-weight']!.media).toBeUndefined()
    const text = designationText(qDisplay(p))
    expect(imageRefs(text)).toEqual(['scale'])
    expect(toPlain(text)).toContain('Weight (kg)')
  })
})

const graph = (body: string) =>
  `<mxfile><diagram id="p" name="Signs"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${body}</root></mxGraphModel></diagram></mxfile>`
const vertex = (id: string, attrs: string, label: string, parent = '1') =>
  `<object id="${id}" label="${label}" ${attrs}><mxCell vertex="1" parent="${parent}"><mxGeometry x="0" y="0" width="80" height="40" as="geometry"/></mxCell></object>`
const picture = (id: string) =>
  `<mxCell id="${id}" value="" style="shape=image;image=data:image/png,${Buffer.from(PNG).toString('base64')};" vertex="1" parent="1"><mxGeometry x="0" y="0" width="40" height="40" as="geometry"/></mxCell>`
const edge = (id: string, source: string, target: string) =>
  `<mxCell id="${id}" edge="1" source="${source}" target="${target}" parent="1"><mxGeometry as="geometry"/></mxCell>`

describe('draw.io pictures', () => {
  const xml = graph(
    [
      vertex('s', 'odk_type="activity_start"', 'Signs'),
      vertex('q', 'odk_type="select_one" name="rash"', 'Rash?'),
      vertex('o1', 'odk_type="select_option" name="measles"', 'Measles-like', 'q'),
      picture('img1'),
      picture('img2'),
      edge('x1', 'img1', 'q'),
      edge('x2', 'img2', 'o1'),
    ].join(''),
  )

  it('go to the library and to the question and answer they are linked to', () => {
    const images = {}
    const [activity] = activitiesFromDrawio(xml, new Set(), 'en', images)
    expect(Object.keys(images).sort()).toEqual(['rash', 'rash-measles'])
    expect(activity!.nodes['q']!.media).toEqual({ image: 'rash' })
    expect(activity!.nodes['q']!.options?.[0]?.media).toEqual({ image: 'rash-measles' })
    expect(Object.keys(activity!.nodes)).not.toContain('img1')
    expect(Object.keys(activity!.edges)).toHaveLength(0)
  })

  it('come with the page on import', () => {
    const [parsed] = readActivityFile('signs.drawio', xml, new Set())
    expect(Object.keys(parsed!.images ?? {}).sort()).toEqual(['rash', 'rash-measles'])
  })
})

describe('image validation', () => {
  it('reports a missing image and an unused one', () => {
    const p = projectWithImage()
    p.images = { other: { id: 'other', contentType: 'image/png', data: PNG } }
    const rules = validateProject(p).map((i) => i.rule)
    expect(rules).toContain('image.missing')
    expect(rules).toContain('image.unused')
    const missing = validateProject(p).find((i) => i.rule === 'image.missing')!
    expect(missing.location).toMatchObject({ conceptCode: 'weight', codeSystem: 'tricc' })
  })

  it('is quiet when every picture is in the library and shown', () => {
    const rules = validateProject(projectWithImage()).map((i) => i.rule)
    expect(rules).not.toContain('image.missing')
    expect(rules).not.toContain('image.unused')
  })
})
