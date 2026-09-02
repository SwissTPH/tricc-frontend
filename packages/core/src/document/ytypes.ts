import * as Y from 'yjs'
import type { LocalizedText } from '../format/schema/localized.js'
import type { Expression } from '../format/schema/expression.js'

/**
 * Plain ⇄ Y conversion helpers.
 *
 * The structural rules from feature/20260825-document-model.md §3 live here and nowhere
 * else: identity-keyed collections are Y.Map, genuinely ordered lists are Y.Array, and
 * free text is Y.Text so concurrent edits merge character-wise instead of one silently
 * overwriting the other.
 */

export function newText(value: string): Y.Text {
  const t = new Y.Text()
  if (value) t.insert(0, value)
  return t
}

/** Replace a Y.Text's content in place, preserving the shared type identity. */
export function setText(t: Y.Text, value: string): void {
  const current = t.doc === null ? '' : t.toString()
  if (current === value) return
  t.delete(0, current.length)
  if (value) t.insert(0, value)
}

// ---------------------------------------------------------------- localized text

export function localizedToY(value: LocalizedText): Y.Map<Y.Text> {
  const m = new Y.Map<Y.Text>()
  for (const lang of Object.keys(value).sort()) m.set(lang, newText(value[lang] as string))
  return m
}

export function localizedFromY(m: Y.Map<Y.Text> | undefined): LocalizedText | undefined {
  if (!m) return undefined
  const out: LocalizedText = {}
  for (const lang of [...m.keys()].sort()) {
    const t = m.get(lang)
    if (t) out[lang] = t.toString()
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/** Update in place: reuse existing Y.Text where the language already exists. */
export function updateLocalized(m: Y.Map<Y.Text>, value: LocalizedText): void {
  const detached = m.doc === null
  if (!detached) for (const lang of [...m.keys()]) if (!(lang in value)) m.delete(lang)
  for (const lang of Object.keys(value).sort()) {
    const existing = detached ? undefined : m.get(lang)
    if (existing) setText(existing, value[lang] as string)
    else m.set(lang, newText(value[lang] as string))
  }
}

// ---------------------------------------------------------------- expressions

export function expressionToY(value: Expression): Y.Map<unknown> {
  const m = new Y.Map<unknown>()
  if (value.intent) m.set('intent', localizedToY(value.intent))
  if (value.expression !== undefined) m.set('expression', newText(value.expression))
  return m
}

export function expressionFromY(m: Y.Map<unknown> | undefined): Expression | undefined {
  if (!m) return undefined
  const out: Expression = {}
  const intent = localizedFromY(m.get('intent') as Y.Map<Y.Text> | undefined)
  if (intent) out.intent = intent
  const expr = m.get('expression') as Y.Text | undefined
  if (expr) {
    const s = expr.toString()
    if (s !== '') out.expression = s
  }
  return out.intent === undefined && out.expression === undefined ? undefined : out
}

export function updateExpression(m: Y.Map<unknown>, value: Expression): void {
  const detached = m.doc === null

  if (value.intent) {
    const existing = detached ? undefined : (m.get('intent') as Y.Map<Y.Text> | undefined)
    if (existing) updateLocalized(existing, value.intent)
    else m.set('intent', localizedToY(value.intent))
  } else if (!detached && m.has('intent')) {
    m.delete('intent')
  }

  if (value.expression !== undefined) {
    const existing = detached ? undefined : (m.get('expression') as Y.Text | undefined)
    if (existing) setText(existing, value.expression)
    else m.set('expression', newText(value.expression))
  } else if (!detached && m.has('expression')) {
    m.delete('expression')
  }
}

// ---------------------------------------------------------------- plain scalars

/**
 * A type not yet integrated into a document cannot be read — Yjs warns on premature
 * access. Builders construct detached trees and integrate them in one `set`, so every
 * helper that might run against a fresh map must skip the read path.
 */
function isDetached(t: { doc: Y.Doc | null }): boolean {
  return t.doc === null
}

/** Set a scalar, deleting the key when the value is undefined. */
export function setScalar(m: Y.Map<unknown>, key: string, value: unknown): void {
  if (value === undefined) {
    if (!isDetached(m) && m.has(key)) m.delete(key)
    return
  }
  if (isDetached(m) || m.get(key) !== value) m.set(key, value)
}

/** Set a plain (non-collaborative) nested object, e.g. `ui` or a concept reference. */
export function setPlain(m: Y.Map<unknown>, key: string, value: unknown): void {
  if (value === undefined) {
    if (!isDetached(m) && m.has(key)) m.delete(key)
    return
  }
  m.set(key, structuredClone(value))
}

export function syncOrder(arr: Y.Array<string>, next: string[]): void {
  const current = arr.doc === null ? [] : arr.toArray()
  if (current.length === next.length && current.every((v, i) => v === next[i])) return
  if (current.length > 0) arr.delete(0, current.length)
  if (next.length > 0) arr.insert(0, next)
}
