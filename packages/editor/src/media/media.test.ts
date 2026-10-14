import { describe, expect, it } from 'vitest'
import { designationText, imageRefs, toMarkdown, type Concept, type Message } from '@tricc/core'
import { fromDoc, toDoc } from '../text/prosemirror.js'
import { prepareImage, ImageFileError, imageFiles } from './images.js'
import { withPictureFirst } from './attach.js'

const withPicture: Message = {
  type: 'message',
  children: [
    { type: 'image', src: 'Binary/chest', alt: 'indrawing' },
    { type: 'break' },
    { type: 'mark', kind: 'strong', children: [{ type: 'text', value: 'Is there indrawing?' }] },
  ],
}

describe('pictures in the editor document', () => {
  it('round-trip, and a picture never takes the marks around it', () => {
    expect(fromDoc(toDoc(withPicture))).toEqual(withPicture)
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'See ', marks: [{ type: 'bold' }] },
            { type: 'image', attrs: { src: 'Binary/rash', alt: null } },
            { type: 'text', text: ' here', marks: [{ type: 'bold' }] },
          ],
        },
      ],
    }
    expect(toMarkdown(fromDoc(doc))).toBe('**See **![](Binary/rash)** here**')
  })
})

describe('preparing a picture file', () => {
  const file = (bytes: number[], type: string) => new File([new Uint8Array(bytes)], 'x', { type })

  it('keeps an SVG and a picture that cannot be measured as they are', async () => {
    const svg = await prepareImage(file([60, 115, 118, 103, 62], 'image/svg+xml'), 100)
    expect(svg.contentType).toBe('image/svg+xml')
    expect([...svg.data]).toEqual([60, 115, 118, 103, 62])
    // jsdom has no createImageBitmap: the original is kept rather than failing.
    const png = await prepareImage(file([137, 80, 78, 71], 'image/png'), 100)
    expect([...png.data]).toEqual([137, 80, 78, 71])
  })

  it('refuses a file that is not a picture', async () => {
    await expect(prepareImage(file([1], 'application/pdf'), 100)).rejects.toBeInstanceOf(ImageFileError)
    expect(imageFiles([file([1], 'application/pdf'), file([1], 'image/png')])).toHaveLength(1)
  })
})

describe('a picture first in the questionnaire text', () => {
  const concept: Concept = {
    system: 'cs',
    code: 'rash',
    display: 'Rash',
    designations: [],
  }

  it('makes a questionnaire text from the display, once', () => {
    const once = withPictureFirst(concept, 'rash', 'en')
    const text = designationText(once.designations[0]!)
    expect(toMarkdown(text)).toBe('![](Binary/rash)\nRash')
    expect(withPictureFirst(once, 'rash', 'en')).toBe(once)
    expect(imageRefs(designationText(withPictureFirst(once, 'other', 'en').designations[0]!))).toEqual([
      'other',
      'rash',
    ])
  })
})
