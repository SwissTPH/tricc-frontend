import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fromHtml, docFromJson, fromMarkdown } from './parse.js'
import { toMarkdown, toPlain } from './render.js'
import type { PmDoc } from './schema.js'

/**
 * The fixtures shared with `tricc_oo` (`tests/text/fixtures/*.json`, copied here by its
 * `scripts/sync-text-fixtures.sh`): the same input gives the same document, plain text and
 * Markdown on both sides. Python is the source of truth; regenerate there, copy here.
 */
interface Fixture {
  name: string
  input: { html?: string; markdown?: string; json?: unknown }
  doc: PmDoc
  plain: string
  markdown: string
  xhtml?: string
}

const dir = new URL('./fixtures/', import.meta.url)
const fixtures = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as Fixture)

function read(input: Fixture['input']): PmDoc {
  if (input.html !== undefined) return fromHtml(input.html)
  if (input.markdown !== undefined) return fromMarkdown(input.markdown)
  return docFromJson(input.json)
}

describe('display text matches tricc_oo (shared fixtures)', () => {
  it('has fixtures', () => expect(fixtures.length).toBeGreaterThan(0))
  for (const fixture of fixtures) {
    describe(fixture.name, () => {
      const doc = read(fixture.input)
      it('reads the same document', () => expect(doc).toEqual(fixture.doc))
      it('renders the same plain text', () => expect(toPlain(fixture.doc)).toBe(fixture.plain))
      it('renders the same Markdown', () => expect(toMarkdown(fixture.doc)).toBe(fixture.markdown))
    })
  }
})
