import {
  defaultCodeSystem,
  emptyCodeSystem,
  findCodeSystem,
  projectDictionaries,
  type CodeSystem,
  type Mutations,
  type Project,
} from '@tricc/core'

/** The project's default CodeSystem, created on first use. */
export function ensureDefaultCodeSystem(project: Project, tx: Mutations): CodeSystem {
  return defaultCodeSystem(project) ?? ensureDictionary(project, tx, projectDictionaries(project)[0]!.url)
}

/**
 * The dictionary with this url. The default and the calculate dictionaries are listed before
 * they exist: the first concept creates them, and the project names them in `tricc.yaml`.
 */
export function ensureDictionary(project: Project, tx: Mutations, url: string): CodeSystem {
  const existing = findCodeSystem(project, url)
  if (existing) return existing
  const dictionary = projectDictionaries(project).find((d) => d.url === url)
  if (!dictionary) throw new Error(`no such dictionary: ${url}`)
  const cs = emptyCodeSystem(dictionary)
  tx.addCodeSystem(cs)
  if (dictionary.kind === 'default') tx.setMeta('defaultCodeSystem', cs.url)
  if (dictionary.kind === 'calculate') tx.setMeta('calculateCodeSystem', cs.url)
  return cs
}
