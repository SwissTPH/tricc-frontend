/**
 * Labels: free tags on projects and interventions, for finding and grouping while
 * authoring. Plain strings, not texts: they are not translated and tricc_oo ignores them.
 */

/** Trimmed, empty ones dropped, the first of duplicates kept. */
export function normalizeLabels(values: readonly string[]): string[] {
  const out: string[] = []
  for (const v of values) {
    const label = v.trim()
    if (label !== '' && !out.includes(label)) out.push(label)
  }
  return out
}

/** Split what an author typed ("triage, malaria") into labels. */
export function parseLabels(text: string): string[] {
  return normalizeLabels(text.split(','))
}

/** Every distinct label across the lists, sorted case-insensitively. */
export function collectLabels(lists: Iterable<readonly string[] | undefined>): string[] {
  const all = new Set<string>()
  for (const list of lists) for (const label of list ?? []) all.add(label)
  return [...all].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}
