import { describe, expect, it } from 'vitest'
import {
  DESIGNATION_DOC_URL,
  DESIGNATION_MESSAGE_URL,
  designationDocError,
  designationText,
  withDesignationText,
} from './designation.js'
import { fromHtml } from './parse.js'
import { simplify, toMarkdown } from './render.js'

const base = { language: 'en', value: '' }
const scope = {
  url: 'https://tricc.org/StructureDefinition/designation-intervention',
  valueCode: 'iv',
}

describe('designation-doc', () => {
  it('costs nothing for plain text, data included', () => {
    expect(withDesignationText(base, 'Weigh the child')).toEqual({
      language: 'en',
      value: 'Weigh the child',
    })
    expect(withDesignationText(base, 'Give ${dose} mg')).toEqual({
      language: 'en',
      value: 'Give ${dose} mg',
    })
    expect(designationText({ language: 'en', value: 'Give ${dose} mg' })).toBe('Give ${dose} mg')
  })

  it('stores Markdown in the value and the document in the extension, and reads it back', () => {
    const doc = fromHtml('<b>Give ${dose} mg</b><ul><li>with food</li></ul>')
    const rich = withDesignationText(base, doc)
    expect(rich.value).toBe('**Give ${dose} mg**\n- with food')
    expect(rich.extension).toEqual([{ url: DESIGNATION_DOC_URL, valueString: JSON.stringify(doc) }])
    expect(designationText(rich)).toEqual(doc)
  })

  it('drops the document when the text is plain again, and keeps other extensions', () => {
    const rich = withDesignationText(base, fromHtml('<b>Bold</b>'))
    const scoped = { ...rich, extension: [...rich.extension!, scope] }
    expect(withDesignationText(scoped, 'Plain again')).toEqual({
      language: 'en',
      value: 'Plain again',
      extension: [scope],
    })
  })

  it('stores a document that is only plain text as a string', () => {
    const doc = fromHtml('<div>Weigh the child</div>')
    expect(withDesignationText(base, doc)).toEqual({ language: 'en', value: 'Weigh the child' })
  })

  it('falls back to the value when the document does not fit the schema, and says why', () => {
    const broken = {
      language: 'en',
      value: '**Danger**',
      extension: [
        {
          url: DESIGNATION_DOC_URL,
          valueString: JSON.stringify({ type: 'doc', content: [{ type: 'script' }] }),
        },
      ],
    }
    expect(toMarkdown(designationText(broken))).toBe('**Danger**')
    expect(designationDocError(broken)).toMatch(/script/)
    expect(designationDocError(withDesignationText(base, fromHtml('<b>ok</b>')))).toBeUndefined()
    const badColour = {
      language: 'en',
      value: 'x',
      extension: [
        {
          url: DESIGNATION_DOC_URL,
          valueString: JSON.stringify({
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'x',
                    marks: [{ type: 'textStyle', attrs: { color: 'red;background:url(x)' } }],
                  },
                ],
              },
            ],
          }),
        },
      ],
    }
    expect(designationDocError(badColour)).toMatch(/colour/)
    expect(designationText(badColour)).toBe('x')
  })

  it('reads the old designation-message tree, and never writes it', () => {
    const tree = {
      type: 'message',
      children: [
        {
          type: 'mark',
          kind: 'strong',
          children: [
            { type: 'text', value: 'Give ' },
            { type: 'interp', name: 'dose' },
          ],
        },
        { type: 'break' },
        {
          type: 'list',
          ordered: false,
          items: [{ type: 'item', children: [{ type: 'text', value: 'with food' }] }],
        },
        {
          type: 'mark',
          kind: 'color',
          color: '#d32f2f',
          children: [{ type: 'text', value: 'Danger' }],
        },
      ],
    }
    const old = {
      language: 'en',
      value: '**Give ${dose}**',
      extension: [{ url: DESIGNATION_MESSAGE_URL, valueString: JSON.stringify(tree) }, scope],
    }
    const text = designationText(old)
    expect(toMarkdown(text)).toBe('**Give ${dose}**\n- with food\nDanger')
    const saved = withDesignationText(old, text)
    expect(saved.extension?.map((e) => (e as { url: string }).url)).toEqual([
      scope.url,
      DESIGNATION_DOC_URL,
    ])
    expect(designationText(saved)).toEqual(text)
  })

  it('reads a value without extension as Markdown', () => {
    const text = designationText({ language: 'en', value: '**Danger** sign' })
    expect(text).toEqual(simplify(fromHtml('<b>Danger</b> sign')))
  })
})
