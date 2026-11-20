import type { Designation } from '../model/types.js'
import { docFromJson, fromMarkdown, fromMessageJson } from './parse.js'
import { fromPlain, isStructured, simplify, toMarkdown } from './render.js'
import type { DisplayText } from './schema.js'

/** A designation whose text has structure carries its document here (compact JSON). */
export const DESIGNATION_DOC_URL = 'https://tricc.org/StructureDefinition/designation-doc'

/** The tree of older versions: read, never written (feature/20261008 §2.7). */
export const DESIGNATION_MESSAGE_URL = 'https://tricc.org/StructureDefinition/designation-message'

function extensionString(d: Designation, url: string): string | undefined {
  const ext = (d.extension ?? []).find((e) => (e as { url?: unknown }).url === url) as
    { valueString?: unknown } | undefined
  return typeof ext?.valueString === 'string' ? ext.valueString : undefined
}

/**
 * Why the designation's document cannot be read, or undefined when it can (or has none). The
 * text then falls back to `value`; `validate/project.ts` reports it.
 */
export function designationDocError(d: Designation): string | undefined {
  const raw = extensionString(d, DESIGNATION_DOC_URL)
  if (raw === undefined) return undefined
  try {
    docFromJson(JSON.parse(raw))
    return undefined
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

/**
 * The display text of a designation: its `designation-doc` when it carries a valid one, else
 * the old `designation-message` tree, else its `value` read as Markdown.
 */
export function designationText(d: Designation): DisplayText {
  const doc = extensionString(d, DESIGNATION_DOC_URL)
  if (doc !== undefined) {
    try {
      return simplify(docFromJson(JSON.parse(doc)))
    } catch {
      // A broken document falls back to the readable value.
    }
  }
  const message = extensionString(d, DESIGNATION_MESSAGE_URL)
  if (message !== undefined) {
    try {
      return simplify(fromMessageJson(JSON.parse(message)))
    } catch {
      // As above.
    }
  }
  // Plain text is kept exactly as typed (Markdown would trim it); anything else is read.
  const text = simplify(fromMarkdown(d.value))
  return typeof text === 'string' ? fromPlain(d.value) : text
}

/**
 * The designation with a new text. `value` is always the Markdown, readable by any FHIR
 * consumer; the document is added only when the text has structure, so plain texts cost
 * nothing. The old tree is dropped.
 */
export function withDesignationText(d: Designation, text: DisplayText): Designation {
  const simple = isStructured(text) ? simplify(text) : text
  const others = (d.extension ?? []).filter((e) => {
    const url = (e as { url?: unknown }).url
    return url !== DESIGNATION_DOC_URL && url !== DESIGNATION_MESSAGE_URL
  })
  const next: Designation = { ...d, value: toMarkdown(simple) }
  const extension = isStructured(simple)
    ? [...others, { url: DESIGNATION_DOC_URL, valueString: JSON.stringify(simple) }]
    : others
  if (extension.length > 0) next.extension = extension
  else delete next.extension
  return next
}
