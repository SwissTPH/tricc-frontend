import { describe, expect, it } from 'vitest'
import { fromHtml, docFromJson, fromMarkdown, fromMessageJson } from './parse.js'
import {
  fromPlain,
  imageRefs,
  isStructured,
  prependImage,
  references,
  retargetImage,
  simplify,
  toMarkdown,
  toPlain,
} from './render.js'
import type { PmDoc } from './schema.js'

describe('plain strings', () => {
  it('keeps plain text and data as a string', () => {
    expect(fromPlain('Weight (kg)')).toBe('Weight (kg)')
    expect(fromPlain('Give ${dose} mg')).toBe('Give ${dose} mg')
    expect(simplify(fromHtml('<b>x</b>'))).not.toBeTypeOf('string')
    expect(simplify(fromHtml(''))).toBe('')
    expect(isStructured('x')).toBe(false)
  })

  it('lists references in reading order, from a string or a document', () => {
    expect(references('Give ${dose} to ${ name }')).toEqual(['dose', 'name'])
    expect(references(fromHtml('<b>Give ${dose}</b> to ${name}'))).toEqual(['dose', 'name'])
    expect(toPlain(fromHtml('<b>Give ${dose}</b> to ${name}'))).toBe('Give ${dose} to ${name}')
    expect(toPlain('Give ${dose}', (n) => `[${n}]`)).toBe('Give [dose]')
  })
})

describe('the editor document is the stored document', () => {
  it('keeps one bold span over data in Markdown', () => {
    const doc: PmDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Give ', marks: [{ type: 'bold' }] },
            { type: 'interp', attrs: { name: 'dose' }, marks: [{ type: 'bold' }] },
            { type: 'text', text: ' mg', marks: [{ type: 'bold' }] },
          ],
        },
      ],
    }
    expect(toMarkdown(doc)).toBe('**Give ${dose} mg**')
  })

  it('drops empty paragraphs and keeps an empty document empty', () => {
    const doc: PmDoc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Check the child' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Then weigh' }] },
      ],
    }
    expect(toMarkdown(simplify(doc))).toBe('Check the child\n\nThen weigh')
    expect(simplify({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe('')
  })

  it('reads its own JSON back, and rejects anything else', () => {
    const doc = fromHtml('<b>Give ${dose}</b><ul><li>with food</li></ul>')
    expect(docFromJson(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
    expect(() => docFromJson({ type: 'doc', content: [{ type: 'script' }] })).toThrow()
    expect(() => docFromJson({ type: 'message', children: [] })).toThrow()
    expect(() =>
      docFromJson({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'image', attrs: { src: 'http://x/y.png' } }] },
        ],
      }),
    ).toThrow()
    expect(() =>
      docFromJson({
        type: 'doc',
        content: [{ type: 'bulletList', content: [{ type: 'paragraph' }] }],
      }),
    ).toThrow()
  })

  it('reads back the Markdown it writes', () => {
    for (const html of [
      '<b>Give ${dose} mg</b>',
      '<i>Note:</i> give <b><i>with food</i></b>',
      'Line one<br>Line two',
      '<ol><li>First</li><li><b>Second</b></li></ol>',
      '<div>a</div><ul><li>b</li></ul>',
      'One<br><br>Two',
    ]) {
      const markdown = toMarkdown(fromHtml(html))
      expect(toMarkdown(fromMarkdown(markdown))).toBe(markdown)
    }
  })
})

describe('pictures', () => {
  const withPicture = fromHtml(
    'Look at the chest<br><img src="Binary/chest" alt="chest">Is there indrawing?',
  )

  it('lists, retargets and removes pictures', () => {
    expect(imageRefs(withPicture)).toEqual(['chest'])
    expect(imageRefs(retargetImage(withPicture, 'chest', 'thorax'))).toEqual(['thorax'])
    expect(imageRefs(retargetImage(withPicture, 'chest', undefined))).toEqual([])
    expect(retargetImage(withPicture, 'other', 'x')).toBe(withPicture)
    expect(toPlain(withPicture)).toBe('Look at the chest\nchestIs there indrawing?')
  })

  it('puts a picture first, on its own line', () => {
    expect(toMarkdown(prependImage('Weight (kg)', 'scale'))).toBe('![](Binary/scale)\nWeight (kg)')
    expect(toMarkdown(prependImage('', 'scale'))).toBe('![](Binary/scale)')
    expect(toMarkdown(prependImage(fromHtml('<ul><li>a</li></ul>'), 'scale'))).toBe(
      '![](Binary/scale)\n- a',
    )
  })
})

describe('font colour', () => {
  const red = fromHtml('<span style="color:#d32f2f">Danger</span> sign')

  it('has no Markdown (the document keeps it), and no plain text', () => {
    expect(toMarkdown(red)).toBe('Danger sign')
    expect(toPlain(red)).toBe('Danger sign')
  })

  it('ignores a style that is not a colour', () => {
    expect(fromHtml('<span style="color:red;background:url(x)">x</span>')).toEqual(
      fromHtml('<span style="color:red">x</span>'),
    )
    expect(simplify(fromHtml('<span style="color:url(x)">x</span>'))).toBe('x')
  })

  it('keeps a coloured paragraph as typed: Markdown has no colour', () => {
    expect(toPlain(fromHtml('<span style="color:red">**x**</span>'))).toBe('**x**')
  })
})

describe('the old tree', () => {
  it('reads marks onto leaves, lists as blocks, and rejects what it does not know', () => {
    const doc = fromMessageJson({
      type: 'message',
      children: [
        { type: 'text', value: 'Signs:' },
        {
          type: 'list',
          ordered: true,
          items: [
            {
              type: 'item',
              children: [
                { type: 'mark', kind: 'em', children: [{ type: 'text', value: 'Fever' }] },
              ],
            },
          ],
        },
        { type: 'mark', kind: 'u', children: [{ type: 'image', src: 'Binary/rash' }] },
      ],
    })
    expect(toMarkdown(doc)).toBe('Signs:\n1. _Fever_\n![](Binary/rash)')
    expect(() => fromMessageJson({ type: 'message', children: [{ type: 'script' }] })).toThrow()
    // As tricc_oo reads it: a colour that is not one is dropped, the text kept.
    expect(
      fromMessageJson({
        type: 'message',
        children: [
          { type: 'mark', kind: 'color', color: 'x;y', children: [{ type: 'text', value: 'x' }] },
        ],
      }),
    ).toEqual(fromHtml('x'))
    expect(() =>
      fromMessageJson({
        type: 'message',
        children: [{ type: 'mark', kind: 'blink', children: [] }],
      }),
    ).toThrow()
  })
})
