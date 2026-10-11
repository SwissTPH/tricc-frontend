import { describe, expect, it } from 'vitest'
import { fromHtml, toMarkdown } from '@tricc/core'
import { fromDoc, toDoc } from './prosemirror.js'

describe('message tree and the editor document', () => {
  const cases = [
    'Weight (kg)',
    '<b>Give ${dose} mg</b>',
    'Age is ${age} years',
    '<i>Note:</i> give <b><i>with food</i></b>',
    '<u>Underlined</u> text',
    'Line one<br>Line two',
    '<ol><li>First</li><li><b>Second</b></li></ol>',
  ]
  for (const html of cases) {
    it(`round-trips ${JSON.stringify(html)}`, () => {
      const text = fromHtml(html)
      expect(fromDoc(toDoc(text))).toEqual(text)
    })
  }

  it('groups marks on leaves into one wrapper, so the Markdown span is not split', () => {
    const doc = {
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
    expect(toMarkdown(fromDoc(doc))).toBe('**Give ${dose} mg**')
  })

  it('separates paragraphs with a break and keeps an empty document empty', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Check the child' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Then weigh' }] },
      ],
    }
    expect(toMarkdown(fromDoc(doc))).toBe('Check the child\nThen weigh')
    expect(fromDoc({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe('')
  })
})

describe('colour in the editor document', () => {
  it('maps a colour mark to a text-style colour and back', () => {
    const text = {
      type: 'message' as const,
      children: [
        {
          type: 'mark' as const,
          kind: 'strong' as const,
          children: [
            { type: 'mark' as const, kind: 'color' as const, color: '#d32f2f', children: [{ type: 'text' as const, value: 'Danger' }] },
          ],
        },
        { type: 'text' as const, value: ' sign' },
      ],
    }
    const doc = toDoc(text)
    expect(doc.content?.[0]?.content?.[0]?.marks).toEqual([
      { type: 'bold' },
      { type: 'textStyle', attrs: { color: '#d32f2f' } },
    ])
    expect(fromDoc(doc)).toEqual(text)
    expect(toMarkdown(fromDoc(doc))).toBe('**<span style="color:#d32f2f">Danger</span>** sign')
  })
})
