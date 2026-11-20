import { describe, expect, it } from 'vitest'
import { NAME_RE, toName } from './activity.js'

describe('toName', () => {
  it('leaves a valid name as it is', () => {
    expect(toName('systolic-bp.1')).toBe('systolic-bp.1')
  })

  it('makes any text a valid name', () => {
    for (const [text, name] of [
      ['systolic bp', 'systolic_bp'],
      ['-bp', '_-bp'],
      ['high risk', 'high_risk'],
      ['2nd reading', '2nd_reading'],
      ['.5', '_.5'],
      ['ménarche', 'm_narche'],
    ]) {
      expect(toName(text!)).toBe(name)
      expect(NAME_RE.test(name!)).toBe(true)
    }
  })
})

describe('NAME_RE', () => {
  it('accepts a name that starts with a digit, like a concept code', () => {
    expect(NAME_RE.test('2nd_dose')).toBe(true)
    expect(NAME_RE.test('123')).toBe(true)
  })

  it('rejects a name that starts with "." or "-"', () => {
    expect(NAME_RE.test('.5')).toBe(false)
    expect(NAME_RE.test('-bp')).toBe(false)
  })
})
