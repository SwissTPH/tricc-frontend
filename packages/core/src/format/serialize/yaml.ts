import { Document, Scalar, parse as parseYaml, visit } from 'yaml'

/**
 * PyYAML 1.1 (what `tricc_oo` uses) reads unquoted yes/no/on/off as booleans.
 * An edge value `yes` would then fail YamlStrategy, which expects a string.
 * YAML 1.2, which this writer speaks, does not. Quote only those scalars.
 */
const YAML11_BOOL =
  /^(?:y|Y|yes|Yes|YES|n|N|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF)$/

/**
 * Deterministic YAML. Two collaborators whose documents have converged must produce
 * byte-identical files (feature/20260825-document-model.md §7.5), so nothing here may
 * depend on insertion order beyond what the codec already fixed, and no timestamps or
 * generated ids appear in output.
 */
export function toYaml(value: unknown): string {
  const doc = new Document(value)
  visit(doc, {
    Scalar(_key, node) {
      if (typeof node.value === 'string' && YAML11_BOOL.test(node.value)) {
        node.type = Scalar.QUOTE_DOUBLE
      }
    },
  })
  return doc.toString({ indent: 2, lineWidth: 100 })
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
