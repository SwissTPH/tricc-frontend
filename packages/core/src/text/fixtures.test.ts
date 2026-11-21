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

/** `fixtures/` is tricc_oo's (wiped by its sync script); `fixtures-frontend/` holds ours. */
function load(folder: string): Fixture[] {
  const dir = new URL(`./${folder}/`, import.meta.url)
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as Fixture)
}
const shared = load('fixtures')
const own = load('fixtures-frontend')

function read(input: Fixture['input']): PmDoc {
  if (input.html !== undefined) return fromHtml(input.html)
  if (input.markdown !== undefined) return fromMarkdown(input.markdown)
  return docFromJson(input.json)
}

/** As tricc_oo's test does: plain text shows data as `…`, Markdown as `${name}`. */
function cases(title: string, fixtures: Fixture[]) {
  describe(title, () => {
    it('has fixtures', () => expect(fixtures.length).toBeGreaterThan(0))
    for (const fixture of fixtures) {
      describe(fixture.name, () => {
        it('reads the same document', () => expect(read(fixture.input)).toEqual(fixture.doc))
        it('is in canonical form', () => expect(docFromJson(fixture.doc)).toEqual(fixture.doc))
        it('renders the same plain text', () =>
          expect(toPlain(fixture.doc, () => '…')).toBe(fixture.plain))
        it('renders the same Markdown', () =>
          expect(toMarkdown(fixture.doc)).toBe(fixture.markdown))
      })
    }
  })
}

cases('display text matches tricc_oo (shared fixtures)', shared)
cases('display text matches tricc_oo (frontend fixtures)', own)
