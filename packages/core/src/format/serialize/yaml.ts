import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

/**
 * Deterministic YAML. Two collaborators whose documents have converged must produce
 * byte-identical files (feature/20260825-document-model.md §7.5), so nothing here may
 * depend on insertion order beyond what the codec already fixed, and no timestamps or
 * generated ids appear in output.
 */
export function toYaml(value: unknown): string {
  return stringifyYaml(value, {
    indent: 2,
    lineWidth: 100,
    singleQuote: false,
    nullStr: '',
  })
}

export function fromYaml(text: string): unknown {
  return parseYaml(text)
}

/** JSON with a trailing newline, 2-space indent — matches what editors and git expect. */
export function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n'
}

export function fromJson(text: string): unknown {
  return JSON.parse(text)
}
