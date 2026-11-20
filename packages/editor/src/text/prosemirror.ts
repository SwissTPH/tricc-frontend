import { fromPlainDoc, simplify, type DisplayText, type PmDoc, type PmNode } from '@tricc/core'

/** The stored text is the editor document; only a plain string needs one made for it. */
export type { PmNode }

export function toDoc(text: DisplayText): PmDoc {
  return typeof text === 'string' ? fromPlainDoc(text) : text
}

export function fromDoc(doc: PmNode): DisplayText {
  return simplify(doc as PmDoc)
}
