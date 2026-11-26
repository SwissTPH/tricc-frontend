import { useEffect, useState } from 'react'

/**
 * `@tricc/core/lang` (tricc's shared parsers, ANTLR) loaded on first use, so the editor's
 * first paint does not wait for it (feature/20261125-expression-languages.md §1.4).
 */
export type LangModule = typeof import('@tricc/core/lang')

let loading: Promise<LangModule> | undefined
let loaded: LangModule | undefined

/** Load the module once; later calls share the same promise. */
export function loadLang(): Promise<LangModule> {
  loading ??= import('@tricc/core/lang').then((m) => (loaded = m))
  return loading
}

/** The module once it is loaded; undefined until then (the component re-renders). */
export function useLang(): LangModule | undefined {
  const [lang, setLang] = useState<LangModule | undefined>(loaded)
  useEffect(() => {
    if (lang) return
    let live = true
    void loadLang().then((m) => live && setLang(m))
    return () => {
      live = false
    }
  }, [lang])
  return lang
}
