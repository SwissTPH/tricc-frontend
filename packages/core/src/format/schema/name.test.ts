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
      ['2nd_reading', '_2nd_reading'],
      ['.5', '_.5'],
      ['ménarche', 'm_narche'],
    ]) {
      expect(toName(text!)).toBe(name)
      expect(NAME_RE.test(name!)).toBe(true)
    }
  })
})
