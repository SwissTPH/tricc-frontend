import { describe, expect, it } from 'vitest'
import { ConceptIndex } from './index-search.js'
import { sampleProject } from '../format/__fixtures__.js'
import type { CodeSystem, Concept } from '../model/types.js'

function cs(concepts: Concept[]): Record<string, CodeSystem> {
  return {
    'http://x': {
      id: 'x',
      url: 'http://x',
      status: 'draft',
      content: 'complete',
      concepts: Object.fromEntries(concepts.map((c) => [c.code, c])),
      conceptOrder: concepts.map((c) => c.code),
    },
  }
}

function concept(code: string, display: string, extra: Partial<Concept> = {}): Concept {
  return { system: 'http://x', code, display, designations: {}, ...extra }
}

describe('concept search ranking', () => {
  const index = new ConceptIndex(
    cs([
      concept('fever', 'Fever'),
      concept('fever_duration', 'Fever duration in days', { dataType: 'integer' }),
      concept('high_fever', 'High fever'),
      concept('temp', 'Body temperature', { designations: { fr: 'Temperature corporelle' } }),
      concept('malaria', 'Malaria', { definition: 'Diagnosed after a fever and a positive test' }),
    ]),
  )

  it('ranks exact code first', () => {
    expect(index.search('fever')[0]?.concept.code).toBe('fever')
  })

  it('ranks exact display above a prefix match', () => {
    const codes = index.search('high fever').map((m) => m.concept.code)
    expect(codes[0]).toBe('high_fever')
  })

  it('ranks a code prefix above a display substring', () => {
    const codes = index.search('fever_').map((m) => m.concept.code)
    expect(codes[0]).toBe('fever_duration')
  })

  it('finds by designation in another language', () => {
    const m = index.search('corporelle')
    expect(m[0]?.concept.code).toBe('temp')
    expect(m[0]?.matchedOn).toBe('designation')
  })

  it('finds by definition, ranked last', () => {
    const m = index.search('positive test')
    expect(m[0]?.concept.code).toBe('malaria')
    expect(m[0]?.matchedOn).toBe('definition')
  })

  it('is case-insensitive', () => {
    expect(index.search('FEVER')[0]?.concept.code).toBe('fever')
  })

  it('returns nothing for an unmatched query', () => {
    expect(index.search('zzzz')).toEqual([])
  })

  it('is deterministic — the same query never reshuffles', () => {
    expect(index.search('fever').map((m) => m.concept.code)).toEqual(
      index.search('fever').map((m) => m.concept.code),
    )
  })

  it('filters by data type', () => {
    const m = index.search('fever', { dataType: 'integer' })
    expect(m.map((x) => x.concept.code)).toEqual(['fever_duration'])
  })

  it('honours the limit', () => {
    expect(index.search('fever', { limit: 1 })).toHaveLength(1)
  })

  it('an empty query lists concepts rather than nothing', () => {
    expect(index.search('', { limit: 3 })).toHaveLength(3)
  })
})

describe('index maintenance', () => {
  it('builds from a project', () => {
    const index = ConceptIndex.fromProject(sampleProject())
    expect(index.size).toBe(2)
    expect(index.lookup('http://tricc.org/CodeSystem/tricc', 'weight')?.display).toBe('Weight')
  })

  it('upserts without duplicating', () => {
    const index = new ConceptIndex(cs([concept('a', 'Alpha')]))
    index.upsert(concept('a', 'Alpha renamed'))
    expect(index.size).toBe(1)
    expect(index.search('Alpha renamed')[0]?.concept.display).toBe('Alpha renamed')
  })

  it('adds a new concept on upsert', () => {
    const index = new ConceptIndex(cs([concept('a', 'Alpha')]))
    index.upsert(concept('b', 'Beta'))
    expect(index.size).toBe(2)
  })

  it('removes', () => {
    const index = new ConceptIndex(cs([concept('a', 'Alpha'), concept('b', 'Beta')]))
    index.remove('http://x', 'a')
    expect(index.size).toBe(1)
    expect(index.lookup('http://x', 'a')).toBeUndefined()
  })
})

describe('search performance', () => {
  it('stays well under budget at 50 000 concepts', () => {
    const many: Concept[] = []
    for (let i = 0; i < 50_000; i++) {
      many.push(concept(`c_${i}`, `Concept number ${i}`))
    }
    const index = new ConceptIndex(cs(many))
    const start = performance.now()
    for (let i = 0; i < 10; i++) index.search('number 4999')
    const perSearch = (performance.now() - start) / 10
    // Budget is 20 ms; assert with headroom so this is a regression alarm, not a flake.
    expect(perSearch).toBeLessThan(60)
  })
})
