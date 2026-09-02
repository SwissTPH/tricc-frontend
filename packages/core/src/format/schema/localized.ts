import { z } from 'zod'

/**
 * Localized text.
 *
 * Serialized either as a bare string (shorthand for the project's default language)
 * or as a language map. See feature/20260825-project-format.md §6.
 */
export type LocalizedText = Record<string, string>

const LANG_CODE = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/

export const localizedTextSchema = z.union([
  z.string(),
  z.record(z.string().regex(LANG_CODE, 'invalid BCP-47 language code'), z.string()),
])

export type LocalizedTextInput = z.infer<typeof localizedTextSchema>

/** Normalize the serialized form into a language map. */
export function toLocalized(value: LocalizedTextInput, defaultLang: string): LocalizedText {
  return typeof value === 'string' ? { [defaultLang]: value } : { ...value }
}

/**
 * Serialize back, collapsing to the bare-string shorthand when the only entry is the
 * default language. Keeps hand-written fixtures terse and round-trips byte-identically.
 */
export function fromLocalized(
  value: LocalizedText,
  defaultLang: string,
): LocalizedTextInput | undefined {
  const keys = Object.keys(value)
  if (keys.length === 0) return undefined
  if (keys.length === 1 && keys[0] === defaultLang) return value[defaultLang]
  return sortKeys(value)
}

/** Resolve with fallback to the default language, then to any available translation. */
export function resolve(
  value: LocalizedText | undefined,
  lang: string,
  defaultLang: string,
): string | undefined {
  if (!value) return undefined
  return value[lang] ?? value[defaultLang] ?? Object.values(value)[0]
}

/** Deterministic key order — required for byte-identical output across peers. */
export function sortKeys(value: LocalizedText): LocalizedText {
  const out: LocalizedText = {}
  for (const k of Object.keys(value).sort()) out[k] = value[k] as string
  return out
}
