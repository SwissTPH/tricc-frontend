import { describe, expect, it } from 'vitest'
import { presentCql } from './present.js'

describe('presentCql', () => {
  it('shows a quoted name, a keyword, and a comparison with no diagnostic', () => {
    const { tokens, diagnostics } = presentCql('"age_in_days" < 60 and "CHE.B6.DE07" > 9')
    expect(diagnostics).toEqual([])
    expect(tokens.filter((t) => t.kind === 'name').map((t) => t.label)).toEqual([
      'age_in_days',
      'CHE.B6.DE07',
    ])
    expect(tokens.some((t) => t.kind === 'keyword' && t.text === 'and')).toBe(true)
  })

  it('treats a call as a function', () => {
    const { tokens, diagnostics } = presentCql('AgeInMonths() < 12')
    expect(diagnostics).toEqual([])
    expect(tokens.find((t) => t.kind === 'function')?.text).toBe('AgeInMonths')
  })

  it('reports an unclosed quote, an unclosed parenthesis, a retrieve, and a query', () => {
    expect(presentCql('"age').diagnostics.map((d) => d.message)).toEqual([
      'A quoted name is missing its closing quote.',
    ])
    expect(presentCql('AgeInMonths(').diagnostics.map((d) => d.message)).toEqual([
      'A parenthesis is not closed.',
    ])
    expect(presentCql('[Observation]').diagnostics[0]?.message).toMatch(/retrieve/)
    expect(presentCql('from "Weight"').diagnostics[0]?.message).toMatch(/portable profile/)
  })

  it('ignores an empty fragment', () => {
    expect(presentCql('   ')).toEqual({ tokens: [], diagnostics: [] })
  })
})
