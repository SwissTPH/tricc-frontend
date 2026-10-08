import { describe, expect, it } from 'vitest'
import type { TriccNode } from '@tricc/core'
import {
  answerCode,
  answerEdgeCaption,
  answerExpression,
  optionCode,
  shortenAnswer,
} from './answer.js'

describe('answer edges', () => {
  const node: TriccNode = {
    id: 'q',
    type: 'select_one',
    options: [
      { id: 'option', name: 'fever', label: { en: 'Fever' } },
      {
        id: 'option-2',
        name: 'rash',
        label: { en: 'Fever and a rash today' },
      },
      { id: 'option-3', name: "O'Brien", label: { en: 'Named person' } },
    ],
  }

  it('saves Answer with a single-quoted code and reads it back', () => {
    expect(answerExpression('fever')).toBe("Answer('fever')")
    expect(answerCode("Answer('fever')")).toBe('fever')
    expect(answerExpression("O'Brien")).toBe("Answer('O''Brien')")
    expect(answerCode("Answer('O''Brien')")).toBe("O'Brien")
    expect(answerCode('yes')).toBeUndefined()
    expect(answerCode('true')).toBeUndefined()
  })

  it('shows the first 20 characters of the label and keeps the full label for hover', () => {
    expect(optionCode(node.options![0]!)).toBe('fever')
    expect(answerEdgeCaption(node, "Answer('fever')", 'en')).toEqual({
      code: 'fever',
      short: 'Fever',
      title: 'Fever',
      optionId: 'option',
    })
    const long = answerEdgeCaption(node, "Answer('rash')", 'en')
    expect(long?.short).toBe(shortenAnswer('Fever and a rash today'))
    expect(long?.short).toHaveLength(21)
    expect(long?.title).toBe('Fever and a rash today')
    expect(long?.short.startsWith('Fever and a rash tod')).toBe(true)
  })
})
